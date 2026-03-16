<script setup>
import { ref, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import SortableTable from '@shell/components/SortableTable/index.vue';
import { _CREATE } from '@shell/config/query-params';

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

function formatTableRows() {
  let list = props.options || [];

  if (cpu.value) {
    list = list.filter((item) => item.raw?.Cpu === cpu.value);
  }

  if (memory.value) {
    list = list.filter((item) => item.raw?.Memory === memory.value);
  }

  tableRows.value = list.map((item) => ({
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

watch(cpu, formatTableRows);
watch(memory, formatTableRows);
watch(() => props.options, formatTableRows, { deep: true, immediate: true });
// 验证实例类型是否符合规则
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
    class="mb-30"
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
        <div class="col span-6 instance-type">
          <div
            v-if="value"
            class="instance-type"
          >
            {{ t('tkeCn.instanceType.label') }} : {{ value }}
          </div>
          <div
            v-else
            class="instance-type"
          >
            {{ t('tkeCn.instanceType.label') }} :
            <i
              v-clean-tooltip="t('tkeCn.instanceType.errorTooltip')"
              class="ml-5 icon icon-warning error"
            />
          </div>
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
</style>
