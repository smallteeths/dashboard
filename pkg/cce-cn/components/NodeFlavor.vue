<script setup>
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import SortableTable from '@shell/components/SortableTable/index.vue';

const props = defineProps({
  mode: {
    type:     String,
    required: true,
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
  rules: {
    type:    Array,
    default: () => []
  }
});

const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const cpu = ref(undefined);
const memory = ref(undefined);
const currentFlavor = ref({});
const tableRows = ref([]);

const headers = computed(() => {
  return [
    {
      name:  'selected',
      label: ' ',
      width: 40,
      align: 'center',
    },
    {
      name:  'name',
      label: intl.value('cceCn.flavor.table.columns.name'),
      value: 'name',
      sort:  'name'
    },
    {
      name:  'family',
      label: intl.value('cceCn.flavor.table.columns.family'),
      value: 'family',
      sort:  'family'
    },
    {
      name:  'vcpus',
      label: intl.value('cceCn.flavor.table.columns.vcpus'),
      value: 'vcpus',
      sort:  'vcpus'
    },
    {
      name:  'memory',
      label: intl.value('cceCn.flavor.table.columns.memory'),
      value: 'memory',
      sort:  'memory'
    }
  ];
});

function normalizeNumber(value) {
  const num = Number(value);

  return Number.isNaN(num) ? undefined : num;
}

function getFlavorName(item) {
  return item?.value || item?.name || item?.raw?.name || item?.raw?.id || '';
}

function getFlavorFamily(item) {
  return item?.group || item?.raw?.os_extra_specs?.resource_type || '-';
}

function normalizeOptionToRow(item) {
  const raw = item?.raw || {};
  const vcpus = normalizeNumber(item?.vcpus ?? raw.vcpus);
  const memory = normalizeNumber(item?.memory ?? raw.ram / 1024);

  return {
    rowKey: getFlavorName(item),
    name:   getFlavorName(item),
    family: getFlavorFamily(item),
    vcpus:  vcpus ?? '-',
    memory: memory ?? '-',
    label:  item?.label,
    raw,
  };
}

function formatTableRows() {
  let list = props.options || [];

  if (cpu.value) {
    list = list.filter((item) => normalizeNumber(item?.vcpus ?? item?.raw?.vcpus) === cpu.value);
  }

  if (memory.value) {
    list = list.filter((item) => normalizeNumber(item?.memory ?? item?.raw?.ram / 1024) === memory.value);
  }

  tableRows.value = list.map((item) => normalizeOptionToRow(item));
}

function toggleFlavor(row, checked) {
  if (!checked) {
    if (selectedRowKey.value === row.rowKey) {
      emit('update:value', '');
      currentFlavor.value = {};
    }

    return;
  }

  emit('update:value', row.name);
  currentFlavor.value = row;
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

const selectedFlavor = computed(() => {
  if (!props.value) {
    return null;
  }

  if (currentFlavor.value?.name === props.value) {
    return currentFlavor.value;
  }

  const match = (props.options || []).find((item) => getFlavorName(item) === props.value);

  return match ? normalizeOptionToRow(match) : null;
});

const selectedRowKey = computed(() => selectedFlavor.value?.rowKey || '');

watch(cpu, formatTableRows);
watch(memory, formatTableRows);
watch(() => props.options, formatTableRows, { deep: true, immediate: true });
watch(
  () => props.value,
  () => {
    runRules(props.rules, props.value);
  },
  { immediate: true }
);
</script>

<template>
  <h3
    v-if="!disabled"
    class="title"
  >
    {{ intl('cceCn.flavor.table.title') }}
  </h3>
  <p
    v-if="!disabled"
    class="mb-10"
  >
    {{ intl('cceCn.flavor.table.subtitle') }}
  </p>
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
          <UnitInput
            v-model:value="cpu"
            :mode="mode"
            placeholder-key="cceCn.flavor.table.filters.cpu"
            suffix="vCPU"
            type="number"
          />
        </div>
        <div class="col span-3">
          <UnitInput
            v-model:value="memory"
            :mode="mode"
            placeholder-key="cceCn.flavor.table.filters.memory"
            suffix="GiB"
            type="number"
          />
        </div>
      </div>
    </template>
    <template #cell:selected="{ row }">
      <Checkbox
        :disabled="disabled"
        :value="selectedRowKey === row.rowKey"
        @update:value="toggleFlavor(row, $event)"
      />
    </template>
    <template #cell:vcpus="{ row }">
      {{ row.vcpus }} vCPU
    </template>
    <template #cell:memory="{ row }">
      {{ row.memory }} GiB
    </template>
  </SortableTable>
  <div
    v-if="selectedFlavor"
    class="selected-flavor-card mb-20"
  >
    <div class="selected-flavor-card__title">
      <i class="icon icon-checkmark" />
      <span>{{ intl('cceCn.flavor.selected.title') }}</span>
    </div>
    <div class="selected-flavor-card__grid">
      <div class="info-item">
        <div class="info-item__label">
          {{ intl('cceCn.flavor.table.columns.name') }}
        </div>
        <div class="info-item__value">
          {{ selectedFlavor.name }}
        </div>
      </div>
      <div class="info-item">
        <div class="info-item__label">
          {{ intl('cceCn.flavor.table.columns.family') }}
        </div>
        <div class="info-item__value">
          {{ selectedFlavor.family }}
        </div>
      </div>
      <div class="info-item">
        <div class="info-item__label">
          {{ intl('cceCn.flavor.table.columns.vcpus') }}
        </div>
        <div class="info-item__value">
          {{ selectedFlavor.vcpus }} vCPU
        </div>
      </div>
      <div class="info-item">
        <div class="info-item__label">
          {{ intl('cceCn.flavor.table.columns.memory') }}
        </div>
        <div class="info-item__value">
          {{ selectedFlavor.memory }} GiB
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.title {
  margin: 0 0 10px;
  color: var(--body-text);
  font-size: 16px;
  font-weight: 700;
}

.selected-flavor-card {
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: var(--body-text);
    font-weight: 600;

    .icon {
      color: var(--success);
      font-size: 16px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
}

.info-item {
  min-width: 0;

  &__label {
    margin-bottom: 6px;
    color: var(--input-label);
    font-size: 12px;
    line-height: 1.4;
  }

  &__value {
    color: var(--body-text);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    word-break: break-word;
  }
}
</style>
