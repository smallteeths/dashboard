<script setup>
import { computed, ref, watch } from 'vue';
import { find } from 'lodash';
import { useStore } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

const props = defineProps({
  modelValue: {
    type:    Array,
    default: () => ([]),
  },
  dataDiskTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  mode: {
    type:     String,
    required: true,
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  loading: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

const state = ref({
  minDataDiskSize: 0,
  maxDataDiskSize: 32000,
});

function normalizeDisk(disk = {}) {
  return {
    type: disk.type || props.dataDiskTypeOptions?.[0]?.value || '',
    size: typeof disk.size === 'number' ? disk.size : state.value.minDataDiskSize,
  };
}

function createDefaultDisk() {
  return {
    type: props.dataDiskTypeOptions?.[0]?.value || '',
    size: 0,
  };
}

function updateDisks(disks = []) {
  emit('update:modelValue', disks);
}

function addDisk() {
  updateDisks([...props.modelValue, createDefaultDisk()]);
}

function removeDisk(index) {
  const next = props.modelValue.filter((_, i) => i !== index);

  updateDisks(next);
}

function updateDisk(index, key, value) {
  const next = [...props.modelValue];

  next[index] = {
    ...normalizeDisk(next[index]),
    [key]: value,
  };

  updateDisks(next);
}

function blurDataDiskSize(index, size) {
  let nextSize = size;

  if (size === '' || Number(size) === 0) {
    nextSize = 0;
  } else if (Number(size) < state.value.minDataDiskSize) {
    nextSize = state.value.minDataDiskSize;
  } else if (Number(size) > state.value.maxDataDiskSize) {
    nextSize = state.value.maxDataDiskSize;
  } else {
    nextSize = Number(size);
  }

  updateDisk(index, 'size', nextSize);
}

watch(() => props.dataDiskTypeOptions, () => {
  if (!props.dataDiskTypeOptions?.length) {
    return;
  }

  const firstType = props.dataDiskTypeOptions[0]?.value;

  const next = props.modelValue.map((disk) => ({
    ...normalizeDisk(disk),
    type: disk.type || firstType,
  }));

  if (JSON.stringify(next) !== JSON.stringify(props.modelValue)) {
    updateDisks(next);
  }
}, { immediate: true });

watch(() => props.modelValue, () => {
  const firstSelectedType = props.modelValue?.[0]?.type;

  if (!firstSelectedType) {
    return;
  }

  const matched = find(props.dataDiskTypeOptions, { value: firstSelectedType });

  if (matched?.minDiskSize && matched?.maxDiskSize) {
    state.value.minDataDiskSize = matched.minDiskSize;
    state.value.maxDataDiskSize = matched.maxDiskSize;
  }
}, { immediate: true, deep: true });
</script>

<template>
  <div class="tke-data-disk">
    <div
      v-for="(disk, index) in modelValue"
      :key="index"
      class="row mb-10"
    >
      <div class="col span-5">
        <LabeledSelect
          :value="disk.type"
          :mode="mode"
          :loading="loading"
          :options="dataDiskTypeOptions"
          :disabled="disabled"
          option-label="label"
          option-key="value"
          :label="intl('tkeCn.dataDiskType.label')"
          :localizedLabel="true"
          :rules="rules.type"
          @update:value="updateDisk(index, 'type', $event)"
        />
      </div>
      <div class="col span-5">
        <LabeledInput
          :value="disk.size"
          :label="intl('tkeCn.dataDiskSize.label')"
          :mode="mode"
          :disabled="disabled"
          :rules="rules.size"
          @blur="blurDataDiskSize(index, disk.size)"
          @update:value="updateDisk(index, 'size', $event)"
        >
          <template #suffix>
            <div class="addon">
              GB
            </div>
          </template>
        </LabeledInput>
      </div>
      <div class="col span-2 disk-actions">
        <button
          type="button"
          class="btn role-tertiary"
          :disabled="disabled"
          @click="removeDisk(index)"
        >
          {{ intl('tkeCn.dataDisk.remove') }}
        </button>
      </div>
    </div>
    <div class="row">
      <div class="col span-12">
        <button
          type="button"
          class="btn role-tertiary"
          :disabled="disabled"
          @click="addDisk"
        >
          {{ intl('tkeCn.dataDisk.add') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tke-data-disk {
  width: 100%;
}
.disk-actions {
  display: flex;
  align-items: flex-end;
}
.disk-actions .btn {
  margin-top: 24px;
}
</style>
