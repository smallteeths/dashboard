<script setup>
import { ref, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import SortableTable from '@shell/components/SortableTable/index.vue';
import { _CREATE } from '@shell/config/query-params';
import { INSTANCE_FAMILY_CATEGORY_MAP } from '../util/config';

defineOptions({ name: 'InstanceType' });

const props = defineProps({
  mode: {
    type:    String,
    default: _CREATE
  },
  value: {
    type:    String,
    default: ''
  },
  disabled: {
    type:    Boolean,
    default: false
  },
  loading: {
    type:    Boolean,
    default: false
  },
  options: {
    type:    Array,
    default: () => []
  },
  currentInstance: {
    type:    Object,
    default: () => ({})
  },
  rules: {
    type:    Array,
    default: () => []
  }
});

const emit = defineEmits(['update:value', 'update:currentInstance']);
const store = useStore();
const { t } = useI18n(store);
const cpu = ref(undefined);
const memory = ref(undefined);
const tableRows = ref([]);

const INSTANCE_TYPE_COLUMNS = computed(() => {
  return [
    {
      name:  'selected',
      label: ' ',
      width: 40,
      align: 'center',
    },
    {
      name:  'instanceSpec',
      label: t('tkeCn.instanceType.table.columns.instanceSpec'),
      value: 'instanceSpec',
      sort:  'instanceSpec'
    },
    {
      name:  'instanceType',
      label: t('tkeCn.instanceType.table.columns.instanceType'),
      value: 'instanceType',
      sort:  'instanceType'
    },
    {
      name:  'instanceFamily',
      label: t('tkeCn.instanceType.table.columns.instanceFamily'),
      value: 'instanceFamily',
      sort:  'instanceFamily'
    },
    {
      name:  'vcpus',
      label: t('tkeCn.instanceType.table.columns.vcpus'),
      value: 'vcpus',
      sort:  'vcpus'
    },
    {
      name:  'memory',
      label: t('tkeCn.instanceType.table.columns.memory'),
      value: 'memory',
      sort:  'memory'
    },
    {
      name:  'zone',
      label: t('tkeCn.instanceType.table.columns.zone'),
      value: 'zone',
      sort:  'zone'
    }
  ];
});

function getInstanceFamilyCategory(instanceFamily) {
  return INSTANCE_FAMILY_CATEGORY_MAP[instanceFamily] || 'other';
}

function formatInstanceSpec(row) {
  const family = row?.raw?.InstanceFamily || '';

  if (!family) {
    return row?.TypeName || '-';
  }

  const category = getInstanceFamilyCategory(family);
  const categoryLabel = t(`tkeCn.instanceType.familyCategory.${ category }`);

  return `${ categoryLabel } ${ family }`;
}

function formatTableRows() {
  let list = props.options || [];

  if (cpu.value) {
    list = list.filter((item) => item.raw?.Cpu === cpu.value);
  }

  if (memory.value) {
    list = list.filter((item) => item.raw?.Memory === memory.value);
  }

  tableRows.value = list.map((item) => ({
    instanceSpec:   formatInstanceSpec(item),
    instanceType:   item.value,
    instanceFamily: item.group || item.raw?.InstanceFamily || '-',
    vcpus:          item.raw?.Cpu ?? '-',
    memory:         item.raw?.Memory ?? '-',
    zone:           item.zone || item.raw?.Zone || '-',
    label:          item.label,
    raw:            item.raw
  }));
}

function toggleInstanceType(row, checked) {
  if (!checked) {
    if (props.value === row.instanceType) {
      emit('update:value', '');
      emit('update:currentInstance', {});
    }

    return;
  }

  emit('update:value', row.instanceType);
  emit('update:currentInstance', row);
}

function runRules(rules, value) {
  if (!Array.isArray(rules)) {
    return;
  }

  rules.forEach((rule) => {
    if (typeof rule === 'function') {
      rule(value);
    }
  });
}

const selectedInstanceInfo = computed(() => {
  let selected = null;

  if (props.currentInstance && Object.keys(props.currentInstance).length) {
    selected = props.currentInstance;
  } else if (props.value) {
    selected = tableRows.value.find((row) => row.instanceType === props.value);

    if (!selected) {
      const matched = (props.options || []).find((item) => item.value === props.value);

      if (matched) {
        selected = {
          instanceSpec:   formatInstanceSpec(matched),
          instanceType:   matched.value,
          instanceFamily: matched.group || matched.raw?.InstanceFamily || '-',
          vcpus:          matched.raw?.Cpu ?? '-',
          memory:         matched.raw?.Memory ?? '-',
          zone:           matched.zone || matched.raw?.Zone || '-',
          raw:            matched.raw
        };
      }
    }
  }
  if (!selected) {
    return null;
  }

  return {
    instanceSpec:   selected.instanceSpec || '-',
    instanceType:   selected.instanceType || props.value || '-',
    instanceFamily: selected.instanceFamily || '-',
    vcpus:          selected.vcpus ?? '-',
    memory:         selected.memory ?? '-',
    zone:           selected.zone || '-',
  };
});

watch(cpu, formatTableRows);
watch(memory, formatTableRows);
watch(() => props.options, formatTableRows, { deep: true, immediate: true });

watch(
  () => [props.value],
  () => {
    runRules(props.rules, props.value);
  },
  {
    immediate: true,
    deep:      true
  }
);
</script>

<template>
  <h4
    v-if="!disabled"
    class="mb-10"
  >
    {{ t('tkeCn.instanceType.table.title') }}
  </h4>
  <p
    v-if="!disabled"
    class="mb-10"
  >
    {{ t('tkeCn.instanceType.table.subtitle') }}
    <a
      href="https://cloud.tencent.com/document/product/457/84660"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ t('tkeCn.instanceType.table.linkText') }}
    </a>
  </p>
  <SortableTable
    :loading="loading"
    :rows="tableRows"
    :headers="INSTANCE_TYPE_COLUMNS"
    :table-actions="false"
    :row-actions="false"
    :rows-per-page="10"
    :paging="true"
    key-field="instanceType"
    class="mb-20"
  >
    <template #header-left>
      <div class="row">
        <div class="col span-3">
          <UnitInput
            v-model:value="cpu"
            :mode="mode"
            placeholder-key="tkeCn.instanceType.cpu.label"
            suffix="vCPU"
            type="number"
          />
        </div>
        <div class="col span-3">
          <UnitInput
            v-model:value="memory"
            type="number"
            :mode="mode"
            placeholder-key="tkeCn.instanceType.memory.label"
            suffix="GiB"
          />
        </div>
      </div>
    </template>
    <template #cell:selected="{ row }">
      <Checkbox
        :disabled="disabled"
        :value="value === row.instanceType"
        @update:value="toggleInstanceType(row, $event)"
      />
    </template>
  </SortableTable>
  <div
    v-if="selectedInstanceInfo"
    class="selected-instance-card mb-20"
  >
    <div class="selected-instance-card__header">
      <div class="selected-instance-card__title">
        <i class="icon icon-checkmark" />
        <span>{{ t('tkeCn.instanceType.selected.title') }}</span>
      </div>
    </div>

    <div class="selected-instance-card__grid">
      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.instanceSpec') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.instanceSpec }}
        </div>
      </div>

      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.instanceType') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.instanceType }}
        </div>
      </div>

      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.instanceFamily') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.instanceFamily }}
        </div>
      </div>

      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.vcpus') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.vcpus }} vCPU
        </div>
      </div>

      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.memory') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.memory }} GiB
        </div>
      </div>

      <div class="info-item">
        <div class="info-item__label">
          {{ t('tkeCn.instanceType.table.columns.zone') }}
        </div>
        <div class="info-item__value">
          {{ selectedInstanceInfo.zone }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.error {
  color: var(--error);
}
.instance-type {
  font-size: 14px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  color: var(--input-label);
}
.checkbox-outer-container {
  margin-top: 7px;
}
.selected-instance-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--body-text);
    .icon {
      color: var(--success);
      font-size: 16px;
    }
  }
  &__tip {
    font-size: 12px;
    color: var(--input-label);
    line-height: 1.5;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}
.info-item {
  min-width: 0;
  &__label {
    font-size: 12px;
    color: var(--input-label);
    margin-bottom: 6px;
    line-height: 1.4;
  }
  &__value {
    font-size: 14px;
    font-weight: 500;
    color: var(--body-text);
    word-break: break-word;
    line-height: 1.5;
  }
}
</style>
