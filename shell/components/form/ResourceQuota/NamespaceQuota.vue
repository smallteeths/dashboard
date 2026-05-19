<script>
import Row from './NamespaceQuotaRow';
import { QUOTA_COMPUTED } from './shared';
const TYPES_WITH_STORAGE_CLASS = ['requestsStorageClassStorage', 'requestsStorageClassPVC'];

export default {
  components: { Row },

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
    project: {
      type:     Object,
      required: true
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
    },
  },
  data() {
    return { rows: {} };
  },
  computed: {
    ...QUOTA_COMPUTED,
    projectResourceQuotaLimits() {
      return this.flatListFromLimits(this.project?.spec?.resourceQuota?.limit || {});
    },
    namespaceResourceQuotaLimits() {
      return this.project.namespaces.map((namespace) => ({
        ...this.flatListFromLimits(namespace.resourceQuota.limit),
        id: namespace.id
      }));
    },
    editableLimits() {
      return Object.entries(this.projectResourceQuotaLimits).reduce((limits, [key, value]) => {
        if (TYPES_WITH_STORAGE_CLASS.includes(key)) {
          Object.entries(value || {}).forEach(([sc, limit]) => {
            limits.push({
              type: key,
              sc,
              limit,
            });
          });

          return limits;
        }
        limits.push({
          type:  key,
          limit: value,
        });

        return limits;
      }, []);
    },
    defaultResourceQuotaLimits() {
      return this.flatListFromLimits(this.project.spec.namespaceDefaultResourceQuota.limit || {});
    }
  },
  methods: {
    remainingTypes(currentType) {
      return this.mappedTypes
        .filter((type) => !this.types.includes(type.value) || type.value === currentType);
    },
    update(key, value, sc) {
      this.value.resourceQuota = this.value.resourceQuota || { limit: {} };
      if (sc) {
        this.value.resourceQuota = {
          limit: {
            ...this.value.resourceQuota.limit,
            [key]: {
              ...this.value.resourceQuota.limit[key],
              [sc]: value
            }
          }
        };

        return;
      }
      this.value.resourceQuota = { limit: this.limitsFromFlatList(key, value) };
    },
    flatListFromLimits(limit) {
      const result = {};

      Object.keys(limit || {}).forEach((key) => {
        if (key === 'extended') {
          Object.keys(limit.extended || {}).forEach((extKey) => {
            result[`extended.${ extKey }`] = limit.extended[extKey];
          });

          return;
        }
        result[key] = limit[key];
      });

      return result;
    },
    limitsFromFlatList(key, value) {
      const limit = { ...(this.value?.resourceQuota?.limit || {}) };

      if (key.startsWith('extended.')) {
        const resourceIdentifier = key.slice('extended.'.length);

        limit.extended = {
          ...(limit.extended || {}),
          [resourceIdentifier]: value
        };

        return limit;
      }
      limit[key] = value;

      return limit;
    }
  },
};
</script>
<template>
  <div>
    <div class="headers mb-10">
      <label>{{ t('resourceQuota.headers.resourceType') }}</label>
      <label>{{ t('resourceQuota.headers.projectResourceAvailability') }}</label>
      <label>{{ t('resourceQuota.headers.limit') }}</label>
    </div>
    <Row
      v-for="q in editableLimits"
      :key="project.id + q.type + (q.sc || '')"
      :value="value.resourceQuota"
      :namespace="value"
      :mode="mode"
      :types="mappedTypes"
      :type="q.type"
      :storage-class="q.sc"
      :storage-classes="storageClasses"
      :project-resource-quota-limits="projectResourceQuotaLimits"
      :default-resource-quota-limits="defaultResourceQuotaLimits"
      :namespace-resource-quota-limits="namespaceResourceQuotaLimits"
      @update:value="update"
    />
  </div>
</template>
<style lang="scss" scoped>
.headers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--border);
  height: 30px;
}
</style>
