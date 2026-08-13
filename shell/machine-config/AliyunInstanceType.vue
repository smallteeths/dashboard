<script>
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import SortableTable from '@shell/components/SortableTable/index.vue';
import { _CREATE } from '@shell/config/query-params';

const ARCH_ALL = '';
const ARCH_X86 = 'X86';
const ARCH_ARM = 'ARM';

export default {
  name: 'AliyunInstanceType',

  components: {
    Checkbox,
    UnitInput,
    LabeledSelect,
    SortableTable,
  },

  props: {
    mode: {
      type:    String,
      default: _CREATE,
    },
    value: {
      type:    String,
      default: '',
    },
    disabled: {
      type:    Boolean,
      default: false,
    },
    loading: {
      type:    Boolean,
      default: false,
    },
    options: {
      type:    Array,
      default: () => [],
    },
  },

  emits: ['update:value'],

  data() {
    return {
      cpu:          undefined,
      memory:       undefined,
      architecture: ARCH_ALL,
      tableRows:    [],
    };
  },

  computed: {
    architectureOptions() {
      return [
        {
          value: ARCH_ALL,
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.architecture.all'),
        },
        {
          value: ARCH_X86,
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.architecture.x86'),
        },
        {
          value: ARCH_ARM,
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.architecture.arm'),
        },
      ];
    },

    headers() {
      return [
        {
          name:  'selected',
          label: ' ',
          width: 40,
          align: 'center',
        },
        {
          name:  'instanceType',
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.table.columns.instanceType'),
          value: 'instanceType',
          sort:  'instanceType',
        },
        {
          name:  'instanceFamily',
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.table.columns.instanceFamily'),
          value: 'instanceFamily',
          sort:  'instanceFamily',
        },
        {
          name:  'architecture',
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.table.columns.architecture'),
          value: 'architectureLabel',
          sort:  'architecture',
        },
        {
          name:  'vcpus',
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.table.columns.vcpus'),
          value: 'vcpus',
          sort:  'vcpus',
        },
        {
          name:  'memory',
          label: this.t('cluster.machineConfig.aliyunecs.instanceType.table.columns.memory'),
          value: 'memory',
          sort:  'memory',
        },
      ];
    },

    selectedRowKey() {
      return this.resolvedCurrentInstance?.rowKey || '';
    },

    resolvedCurrentInstance() {
      if (!this.value) {
        return null;
      }

      const matches = (this.options || [])
        .filter((item) => item.value === this.value)
        .map((item) => this.normalizeOptionToRow(item));

      if (matches.length) {
        return matches[0];
      }

      return this.normalizePersistedInstance(this.value);
    },

    selectedInstanceInfo() {
      const selected = this.resolvedCurrentInstance;

      if (!selected) {
        return null;
      }

      return {
        instanceType:      selected.instanceType || this.value || '-',
        instanceFamily:    selected.instanceFamily || '-',
        architectureLabel: selected.architectureLabel || '-',
        vcpus:             selected.vcpus ?? '-',
        memory:            selected.memory ?? '-',
      };
    },
  },

  watch: {
    cpu:          'formatTableRows',
    memory:       'formatTableRows',
    architecture: 'formatTableRows',
    options:      {
      handler:   'formatTableRows',
      deep:      true,
      immediate: true,
    },
  },

  methods: {
    resolveArchitecture(item) {
      const raw = (item?.architecture || item?.raw?.CpuArchitecture || '').toString().toUpperCase();

      if (raw.includes('ARM')) {
        return ARCH_ARM;
      }

      if (raw.includes('X86')) {
        return ARCH_X86;
      }

      return '';
    },

    architectureLabel(architecture) {
      if (architecture === ARCH_ARM) {
        return this.t('cluster.machineConfig.aliyunecs.instanceType.architecture.arm');
      }

      if (architecture === ARCH_X86) {
        return this.t('cluster.machineConfig.aliyunecs.instanceType.architecture.x86');
      }

      return '-';
    },

    normalizeOptionToRow(item) {
      const architecture = this.resolveArchitecture(item);
      const row = {
        instanceType:      item.value,
        instanceFamily:    item.group || item.raw?.InstanceTypeFamily || '-',
        architecture,
        architectureLabel: this.architectureLabel(architecture),
        vcpus:             item.vcpus ?? item.raw?.CpuCoreCount ?? '-',
        memory:            item.memory ?? item.raw?.MemorySize ?? '-',
        label:             item.label,
        raw:               item.raw,
      };

      return {
        ...row,
        rowKey: row.instanceType,
      };
    },

    normalizePersistedInstance(instanceType) {
      return {
        instanceType,
        instanceFamily:    '-',
        architecture:      '',
        architectureLabel: '-',
        vcpus:             '-',
        memory:            '-',
        rowKey:            instanceType,
      };
    },

    formatTableRows() {
      let list = this.options || [];

      if (this.architecture) {
        list = list.filter((item) => this.resolveArchitecture(item) === this.architecture);
      }

      if (this.cpu) {
        list = list.filter((item) => Number(item.vcpus ?? item.raw?.CpuCoreCount) === Number(this.cpu));
      }

      if (this.memory) {
        list = list.filter((item) => Number(item.memory ?? item.raw?.MemorySize) === Number(this.memory));
      }

      this.tableRows = list.map((item) => this.normalizeOptionToRow(item));
    },

    toggleInstanceType(row, checked) {
      if (!checked) {
        if (this.selectedRowKey === row.rowKey) {
          this.$emit('update:value', '');
        }

        return;
      }

      this.$emit('update:value', row.instanceType);
    },
  },
};
</script>

<template>
  <div class="aliyun-instance-type">
    <h3
      v-if="!disabled"
      class="title"
    >
      {{ t('cluster.machineConfig.aliyunecs.instanceType.table.title') }}
    </h3>
    <SortableTable
      :loading="loading"
      :rows="tableRows"
      :headers="headers"
      :table-actions="false"
      :row-actions="false"
      :rows-per-page="10"
      :paging="true"
      key-field="rowKey"
      class="mb-20"
    >
      <template #header-left>
        <div class="row">
          <div class="col span-3">
            <LabeledSelect
              v-model:value="architecture"
              :mode="mode"
              :options="architectureOptions"
              :disabled="disabled"
              :clearable="false"
              :placeholder="t('cluster.machineConfig.aliyunecs.instanceType.architecture.label')"
            />
          </div>
          <div class="col span-3">
            <UnitInput
              v-model:value="cpu"
              :mode="mode"
              placeholder-key="cluster.machineConfig.aliyunecs.instanceType.cpu.label"
              suffix="vCPU"
              type="number"
              :disabled="disabled"
            />
          </div>
          <div class="col span-3">
            <UnitInput
              v-model:value="memory"
              type="number"
              :mode="mode"
              placeholder-key="cluster.machineConfig.aliyunecs.instanceType.memory.label"
              suffix="GiB"
              :disabled="disabled"
            />
          </div>
        </div>
      </template>
      <template #cell:selected="{ row }">
        <Checkbox
          :disabled="disabled"
          :value="selectedRowKey === row.rowKey"
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
          <span>{{ t('cluster.machineConfig.aliyunecs.instanceType.selected.title') }}</span>
        </div>
      </div>
      <div class="selected-instance-card__grid">
        <div class="info-item">
          <div class="info-item__label">
            {{ t('cluster.machineConfig.aliyunecs.instanceType.table.columns.instanceType') }}
          </div>
          <div class="info-item__value">
            {{ selectedInstanceInfo.instanceType }}
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__label">
            {{ t('cluster.machineConfig.aliyunecs.instanceType.table.columns.instanceFamily') }}
          </div>
          <div class="info-item__value">
            {{ selectedInstanceInfo.instanceFamily }}
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__label">
            {{ t('cluster.machineConfig.aliyunecs.instanceType.table.columns.architecture') }}
          </div>
          <div class="info-item__value">
            {{ selectedInstanceInfo.architectureLabel }}
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__label">
            {{ t('cluster.machineConfig.aliyunecs.instanceType.table.columns.vcpus') }}
          </div>
          <div class="info-item__value">
            {{ selectedInstanceInfo.vcpus }} vCPU
          </div>
        </div>
        <div class="info-item">
          <div class="info-item__label">
            {{ t('cluster.machineConfig.aliyunecs.instanceType.table.columns.memory') }}
          </div>
          <div class="info-item__value">
            {{ selectedInstanceInfo.memory }} GiB
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--body-text);
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
