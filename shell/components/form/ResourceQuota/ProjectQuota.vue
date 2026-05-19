<script>
import { QUOTA_COMPUTED, TYPES } from './shared';
import Banner from '@components/Banner/Banner.vue';
import Select from '@shell/components/form/Select';
import UnitInput from '@shell/components/form/UnitInput';
import { RcButton } from '@components/RcButton';
const TYPES_WITH_STORAGE_CLASS = ['requestsStorageClassStorage', 'requestsStorageClassPVC'];

export default {
  emits: [
    'input',
    'validationChanged',
  ],
  components: {
    Banner,
    RcButton,
    Select,
    UnitInput,
  },
  props: {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    types: {
      type:    Array,
      default: () => {
        return [];
      }
    },
    storageClasses: {
      type:    Array,
      default: () => {
        return [];
      }
    }
  },
  data() {
    this.value.spec = this.value.spec || {};
    this.value.spec.namespaceDefaultResourceQuota = this.value.spec.namespaceDefaultResourceQuota || { limit: {} };
    this.value.spec.resourceQuota = this.value.spec.resourceQuota || { limit: {} };
    const quotaLimit = this.value.spec.resourceQuota.limit ?? {};
    const nsQuotaLimit = this.value.spec.namespaceDefaultResourceQuota.limit ?? {};
    const allTypes = [...new Set([...Object.keys(quotaLimit), ...Object.keys(nsQuotaLimit)])];
    const typeQuotas = allTypes.reduce((t, c) => {
      const limit = quotaLimit[c];
      const nsLimit = nsQuotaLimit[c];

      if (TYPES_WITH_STORAGE_CLASS.includes(c)) {
        const scList = [...new Set([...Object.keys(limit ?? {}), ...Object.keys(nsLimit ?? {})])];

        scList.forEach((sc) => {
          t.push({
            type:    c,
            limit:   { sc, limit: limit?.[sc] ?? '' },
            nsLimit: { sc, limit: nsLimit?.[sc] ?? '' }
          });
        });

        return t;
      }
      if (c === TYPES.EXTENDED) {
        const resourceIdentifiers = [...new Set([...Object.keys(limit ?? {}), ...Object.keys(nsLimit ?? {})])];

        resourceIdentifiers.forEach((resourceIdentifier) => {
          t.push({
            type:    TYPES.EXTENDED,
            resourceIdentifier,
            limit:   limit?.[resourceIdentifier] ?? '',
            nsLimit: nsLimit?.[resourceIdentifier] ?? '',
          });
        });

        return t;
      }
      t.push({
        type:               c,
        resourceIdentifier: c,
        limit:              limit ?? '',
        nsLimit:            nsLimit ?? '',
      });

      return t;
    }, []);

    return {
      TYPES,
      typeQuotas,
      typesWithStorageClass: TYPES_WITH_STORAGE_CLASS,
    };
  },
  computed: {
    ...QUOTA_COMPUTED,
    typeValues() {
      return [...new Set(this.typeQuotas.map((tq) => tq.type))];
    },
    typeSCValuesMap() {
      const typeQuotas = this.typeQuotas;

      return TYPES_WITH_STORAGE_CLASS.reduce((t, c) => {
        const quotas = typeQuotas.filter((tq) => tq.type === c);

        t[c] = quotas?.map((item) => item.limit.sc ?? item.nsLimit.sc) ?? [];

        return t;
      }, {});
    },
    typeOption() {
      return this.mappedTypes.reduce((t, c) => {
        t[c.value] = c;

        return t;
      }, {});
    }
  },
  watch: {
    typeQuotas: {
      handler(v) {
        const nsQuotaLimit = { limit: {} };
        const quotaLimit = { limit: {} };

        v.filter((t) => TYPES_WITH_STORAGE_CLASS.includes(t.type) && (t.limit || t.nsLimit))
          .forEach((q) => {
            if (q.nsLimit.limit) {
              const limit = nsQuotaLimit.limit[q.type] ?? {};

              limit[q.nsLimit.sc] = q.nsLimit.limit;
              nsQuotaLimit.limit[q.type] = limit;
            }
            if (q.limit.limit) {
              const limit = quotaLimit.limit[q.type] ?? {};

              limit[q.limit.sc] = q.limit.limit;
              quotaLimit.limit[q.type] = limit;
            }
          });
        v.filter((t) => t.type === TYPES.EXTENDED && (t.limit || t.nsLimit))
          .forEach((q) => {
            if (q.resourceIdentifier && q.nsLimit) {
              const limit = nsQuotaLimit.limit.extended ?? {};

              limit[q.resourceIdentifier] = q.nsLimit;
              nsQuotaLimit.limit.extended = limit;
            }
            if (q.resourceIdentifier && q.limit) {
              const limit = quotaLimit.limit.extended ?? {};

              limit[q.resourceIdentifier] = q.limit;
              quotaLimit.limit.extended = limit;
            }
          });
        v.filter((t) => !TYPES_WITH_STORAGE_CLASS.includes(t.type) && t.type !== TYPES.EXTENDED && (t.limit || t.nsLimit))
          .forEach((q) => {
            if (q.nsLimit) {
              nsQuotaLimit.limit[q.type] = q.nsLimit;
            }
            if (q.limit) {
              quotaLimit.limit[q.type] = q.limit;
            }
          });
        this.value.spec.namespaceDefaultResourceQuota = nsQuotaLimit;
        this.value.spec.resourceQuota = quotaLimit;
        this.$emit('input', {
          projectLimit: quotaLimit.limit,
          nsLimit:      nsQuotaLimit.limit,
        });
        const hasMissingExtendedIdentifier = v.some((quota) => quota.type === TYPES.EXTENDED && !quota.resourceIdentifier);

        this.$emit('validationChanged', !hasMissingExtendedIdentifier);
      },
      deep: true
    }
  },
  methods: {
    getTypeOption(type) {
      return this.typeOption[type] || {};
    },
    remainingTypes(currentType) {
      const typeValues = this.typeValues;

      return this.mappedTypes
        .filter((mappedType) => {
          if (mappedType.value === TYPES.EXTENDED) {
            return true;
          }
          if (TYPES_WITH_STORAGE_CLASS.includes(mappedType.value)) {
            const scIds = this.remainingSc(mappedType.value);

            if (typeValues.includes(mappedType.value)) {
              return scIds.length > 0 || mappedType.value === currentType;
            }

            return scIds.length > 0;
          }

          return !typeValues.includes(mappedType.value) || mappedType.value === currentType;
        });
    },
    remainingSc(type, currentSc) {
      const values = this.typeSCValuesMap[type];

      return this.storageClasses
        .filter((sc) => !values.includes(sc.id) || sc.id === currentSc)
        .map((sc) => ({ label: sc.id, value: sc.id }));
    },
    updateType(type, quota) {
      const { type: oldType } = quota;

      if (type === oldType) {
        return;
      }
      if (TYPES_WITH_STORAGE_CLASS.includes(type)) {
        const sc = this.remainingSc(type)[0]?.value;

        quota.type = type;
        quota.resourceIdentifier = '';
        quota.limit = { sc, limit: '' };
        quota.nsLimit = { sc, limit: '' };
      } else if (type === TYPES.EXTENDED) {
        quota.type = type;
        quota.resourceIdentifier = '';
        quota.limit = '';
        quota.nsLimit = '';
      } else {
        quota.type = type;
        quota.resourceIdentifier = type;
        quota.limit = '';
        quota.nsLimit = '';
      }
    },
    updateStorageClass(sc, quota) {
      quota.limit.sc = sc;
      quota.nsLimit.sc = sc;
    },
    remove(index, quota) {
      this.typeQuotas.splice(index, 1);
      if (TYPES_WITH_STORAGE_CLASS.includes(quota.type)) {
        const limit = this.value.spec.resourceQuota.limit[quota.type] ?? {};
        const nslimit = this.value.spec.namespaceDefaultResourceQuota.limit[quota.type] ?? {};

        delete limit[quota.limit.sc];
        delete nslimit[quota.nsLimit.sc];
        if (Object.keys(limit).length === 0) {
          delete this.value.spec.resourceQuota.limit[quota.type];
        } else {
          this.value.spec.resourceQuota.limit[quota.type] = limit;
        }
        if (Object.keys(nslimit).length === 0) {
          delete this.value.spec.namespaceDefaultResourceQuota.limit[quota.type];
        } else {
          this.value.spec.namespaceDefaultResourceQuota.limit[quota.type] = nslimit;
        }
      } else if (quota.type === TYPES.EXTENDED) {
        const limit = this.value.spec.resourceQuota.limit.extended ?? {};
        const nslimit = this.value.spec.namespaceDefaultResourceQuota.limit.extended ?? {};

        delete limit[quota.resourceIdentifier];
        delete nslimit[quota.resourceIdentifier];
        if (Object.keys(limit).length === 0) {
          delete this.value.spec.resourceQuota.limit.extended;
        } else {
          this.value.spec.resourceQuota.limit.extended = limit;
        }
        if (Object.keys(nslimit).length === 0) {
          delete this.value.spec.namespaceDefaultResourceQuota.limit.extended;
        } else {
          this.value.spec.namespaceDefaultResourceQuota.limit.extended = nslimit;
        }
      } else {
        delete this.value.spec.resourceQuota.limit[quota.type];
        delete this.value.spec.namespaceDefaultResourceQuota.limit[quota.type];
      }
    },
    add() {
      const type = this.remainingTypes()[0];

      if (type) {
        if (TYPES_WITH_STORAGE_CLASS.includes(type.value)) {
          const sc = this.remainingSc(type.value)[0]?.value;

          this.typeQuotas.push({
            type:  type.value,
            limit: {
              sc,
              limit: '',
            },
            nsLimit: {
              sc,
              limit: '',
            }
          });
        } else if (type.value === TYPES.EXTENDED) {
          this.typeQuotas.push({
            type:               type.value,
            resourceIdentifier: '',
            limit:              '',
            nsLimit:            '',
          });
        } else {
          this.typeQuotas.push({
            type:               type.value,
            resourceIdentifier: type.value,
            limit:              '',
            nsLimit:            '',
          });
        }
      }
    }
  },
};
</script>
<template>
  <div
    role="grid"
    :aria-label="t('resourceQuota.ariaLabel.grid')"
  >
    <Banner
      color="info"
      label-key="resourceQuota.banner"
      class="mb-20"
    />
    <div class="project-quota mb-10">
      <div class="headers mb-10">
        <label>
          {{ t('resourceQuota.headers.resourceType') }}
          <span
            class="required mr-5"
            aria-hidden="true"
          >*</span>
        </label>
        <label>
          {{ t('resourceQuota.headers.resourceIdentifier') }}
          <span
            class="required mr-5"
            aria-hidden="true"
          >*</span>
          <i
            v-clean-tooltip="t('resourceQuota.resourceIdentifier.tooltip')"
            class="icon icon-info"
          />
        </label>
        <label>{{ t('resourceQuota.headers.projectLimit') }}</label>
        <label>{{ t('resourceQuota.headers.namespaceDefaultLimit') }}</label>
        <div />
      </div>
      <div
        v-for="(tq, index) in typeQuotas"
        :key="`${tq.type}${tq.resourceIdentifier || ''}${tq.limit && tq.limit.sc ? `_${tq.limit.sc}` : ''}`"
        class="type-row mb-10"
      >
        <template v-if="typesWithStorageClass.includes(tq.type)">
          <Select
            :mode="mode"
            :value="tq.type"
            :options="remainingTypes(tq.type)"
            @update:value="updateType($event, tq)"
          />
          <Select
            :mode="mode"
            :value="tq.limit.sc"
            :options="remainingSc(tq.type, tq.limit.sc)"
            @update:value="updateStorageClass($event, tq)"
          />
          <UnitInput
            v-model:value="tq.limit.limit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :output-modifier="true"
          />
          <UnitInput
            v-model:value="tq.nsLimit.limit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :output-modifier="true"
          />
        </template>
        <template v-else-if="tq.type === TYPES.EXTENDED">
          <Select
            :mode="mode"
            :value="tq.type"
            :options="remainingTypes(tq.type)"
            @update:value="updateType($event, tq)"
          />
          <input
            v-model="tq.resourceIdentifier"
            type="text"
            class="input-sm"
            :disabled="mode === 'view'"
            :placeholder="t('resourceQuota.headers.resourceIdentifier')"
          >
          <UnitInput
            v-model:value="tq.limit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :suffix="getTypeOption(tq.type).suffix"
            :output-modifier="true"
          />
          <UnitInput
            v-model:value="tq.nsLimit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :suffix="getTypeOption(tq.type).suffix"
            :output-modifier="true"
          />
        </template>
        <template v-else>
          <Select
            :mode="mode"
            :value="tq.type"
            :options="remainingTypes(tq.type)"
            @update:value="updateType($event, tq)"
          />
          <div class="resource-identifier">
            {{ tq.resourceIdentifier || tq.type }}
          </div>
          <UnitInput
            v-model:value="tq.limit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :suffix="getTypeOption(tq.type).suffix"
            :output-modifier="true"
          />
          <UnitInput
            v-model:value="tq.nsLimit"
            :mode="mode"
            :placeholder="getTypeOption(tq.type).placeholder"
            :increment="getTypeOption(tq.type).increment"
            :input-exponent="getTypeOption(tq.type).inputExponent"
            :base-unit="getTypeOption(tq.type).baseUnit"
            :suffix="getTypeOption(tq.type).suffix"
            :output-modifier="true"
          />
        </template>
        <div>
          <button
            type="button"
            :disabled="mode === 'view'"
            class="btn role-link"
            @click="remove(index, tq)"
          >
            {{ t('generic.remove') }}
          </button>
        </div>
      </div>
    </div>
    <div class="project-quotas-footer">
      <rc-button
        v-if="mode !== 'view'"
        variant="tertiary"
        data-testid="btn-add-resource"
        :disabled="remainingTypes().length === 0"
        @click="add"
      >
        {{ t('resourceQuota.add.label') }}
      </rc-button>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.type-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 75px;
  row-gap: 10px;
  column-gap: 10px;
  align-items: center;
}
.headers {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 75px;
  column-gap: 10px;
  row-gap: 10px;
  border-bottom: 1px solid var(--border);
  height: 30px;
}
.resource-identifier {
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  color: var(--input-text);
  background: var(--input-disabled-bg);
  word-break: break-all;
}
.required {
  color: var(--error);
}
.project-quotas-footer {
  margin-top: 24px;
}
</style>
