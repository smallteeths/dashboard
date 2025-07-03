<script setup>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { computed, watch, ref } from 'vue';
import { find } from 'lodash';
import { useStore } from 'vuex';

const props = defineProps({
  instanceType: {
    type:    String,
    default: ''
  },
  osName: {
    type:    String,
    default: ''
  },
  systemDiskType: {
    type:    String,
    default: ''
  },
  dataDiskType: {
    type:    String,
    default: ''
  },
  bandwidthType: {
    type:    String,
    default: ''
  },
  keyPair: {
    type:    String,
    default: ''
  },
  instanceNum: {
    type:    Number,
    default: 0
  },
  systemDiskSize: {
    type:    Number,
    default: 0
  },
  dataDiskSize: {
    type:    Number,
    default: 0
  },
  bandwidth: {
    type:    Number,
    default: 0
  },
  mode: {
    type:     String,
    required: true
  },
  instanceTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  systemDiskTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  bandwidthTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  dataDiskTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  imageOptions: {
    type:    Array,
    default: () => ([]),
  },
  subnetOptions: {
    type:    Array,
    default: () => ([]),
  },
  keyPairOptions: {
    type:    Array,
    default: () => ([]),
  },
  instanceTypeLoading: {
    type:    Boolean,
    default: false,
  },
  keyPairLoading: {
    type:    Boolean,
    default: false,
  },
  isNewOrUnprovisioned: {
    type:    Boolean,
    default: false,
  },
  tkeConfig: {
    type:    Object,
    default: () => ({}),
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
});
const store = useStore();
const state = ref({
  minSystemDiskSize: 20,
  maxSystemDiskSize: 32000,
  minDataDiskSize:   20,
  maxDataDiskSize:   32000,
});
const intl = computed(() => store.getters['i18n/t']);
const emit = defineEmits([
  'update:instanceType',
  'update:osName',
  'update:instanceNum',
  'update:systemDiskType',
  'update:systemDiskSize',
  'update:dataDiskType',
  'update:dataDiskSize',
  'update:bandwidthType',
  'update:bandwidth',
]);

function blurInitialNodeCount(num) {
  if (num === '') {
    emit('update:instanceNum', 0);
  }
}

function blurBandwidth(bandwidth) {
  if (bandwidth === '') {
    emit('update:bandwidth', 0);
  }
}

function blurSystemDiskSize(systemDiskSize) {
  if (systemDiskSize < state.value.minSystemDiskSize) {
    emit('update:systemDiskSize', state.value.minSystemDiskSize);
  }
  if (systemDiskSize > state.value.maxSystemDiskSize) {
    emit('update:systemDiskSize', state.value.maxSystemDiskSize);
  }
}

function blurDataDiskSize(dataDiskSize) {
  if (dataDiskSize === '') {
    emit('update:dataDiskSize', 0);

    return;
  }
  if (dataDiskSize < state.value.minDataDiskSize) {
    emit('update:dataDiskSize', state.value.minDataDiskSize);
  }
  if (dataDiskSize > state.value.maxDataDiskSize) {
    emit('update:dataDiskSize', state.value.maxDataDiskSize);
  }
}

watch(() => props.systemDiskTypeOptions, () => {
  if (!props.systemDiskType && props.systemDiskTypeOptions?.length > 0) {
    emit('update:systemDiskType', props.systemDiskTypeOptions[0].value);
  }
}, { immediate: true });

watch(() => props.dataDiskTypeOptions, () => {
  if (!props.dataDiskType && props.dataDiskTypeOptions?.length > 0) {
    emit('update:dataDiskType', props.dataDiskTypeOptions[0].value);
  }
}, { immediate: true });

watch(() => props.systemDiskType, () => {
  const matched = find(props.systemDiskTypeOptions, { value: props.systemDiskType });

  if (matched && matched.minDiskSize && matched.maxDiskSize) {
    state.value.minSystemDiskSize = matched.minDiskSize;
    state.value.maxSystemDiskSize = matched.maxDiskSize;
  }
}, { immediate: true });

watch(() => props.dataDiskType, () => {
  const matched = find(props.dataDiskTypeOptions, { value: props.dataDiskType });

  if (matched && matched.minDiskSize && matched.maxDiskSize) {
    state.value.minDataDiskSize = matched.minDiskSize;
    state.value.maxDataDiskSize = matched.maxDiskSize;
  }
}, { immediate: true });

</script>
<template>
  <div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="instanceType"
          data-testid="crutke-resource-instance-type"
          :loading="instanceTypeLoading"
          required
          :mode="mode"
          :options="instanceTypeOptions"
          option-label="label"
          option-key="value"
          label-key="tkeCn.instanceType.label"
          :disabled="!isNewOrUnprovisioned"
          :rules="rules.instanceType"
          @update:value="emit('update:instanceType', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="instanceNum"
          :label="intl('tkeCn.numOfNodes.label')"
          :disabled="!isNewOrUnprovisioned"
          :mode="mode"
          :placeholder="intl('tkeCn.numOfNodes.placeholder')"
          @blur="blurInitialNodeCount(instanceNum)"
          @update:value="$emit('update:instanceNum', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="osName"
          data-testid="crutke-resource-node-pool-os-name"
          required
          :mode="mode"
          :options="imageOptions"
          option-label="label"
          option-key="value"
          label-key="tkeCn.os.label"
          :disabled="!isNewOrUnprovisioned"
          :rules="rules.osName"
          @update:value="$emit('update:osName', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          :value="keyPair"
          data-testid="cru-tke-key-pair"
          :loading="keyPairLoading"
          :mode="mode"
          :options="keyPairOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="tkeCn.keyPair.label"
          :rules="rules.keyPair"
          required
          :localizedLabel="true"
          @update:value="emit('update:keyPair', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="systemDiskType"
          data-testid="cru-tke-system-disk-type"
          :mode="mode"
          :options="systemDiskTypeOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="tkeCn.systemDiskType.label"
          :localizedLabel="true"
          :rules="rules.systemDiskType"
          required
          @update:value="emit('update:systemDiskType', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="systemDiskSize"
          :label="intl('tkeCn.systemDiskSize.label')"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          :placeholder="intl('tkeCn.systemDiskSize.placeholder')"
          required
          @blur="blurSystemDiskSize(systemDiskSize)"
          @update:value="$emit('update:systemDiskSize', $event)"
        >
          <template #suffix>
            <div class="addon">
              GB
            </div>
          </template>
        </LabeledInput>
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="dataDiskType"
          data-testid="cru-tke-data-disk-type"
          :mode="mode"
          :options="dataDiskTypeOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="tkeCn.dataDiskType.label"
          :localizedLabel="true"
          @update:value="emit('update:dataDiskType', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="dataDiskSize"
          :label="intl('tkeCn.dataDiskSize.label')"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          @blur="blurDataDiskSize(dataDiskSize)"
          @update:value="$emit('update:dataDiskSize', $event)"
        >
          <template #suffix>
            <div class="addon">
              GB
            </div>
          </template>
        </LabeledInput>
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="bandwidthType"
          data-testid="cru-tke-band-width-type"
          :mode="mode"
          :options="bandwidthTypeOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="tkeCn.bandwidthType.label"
          required
          :localizedLabel="true"
          @update:value="emit('update:bandwidthType', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="bandwidth"
          :label="intl('tkeCn.bandwidth.label')"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          @blur="blurBandwidth(bandwidth)"
          @update:value="$emit('update:bandwidth', $event)"
        >
          <template #suffix>
            <div class="addon">
              Mbps
            </div>
          </template>
        </LabeledInput>
      </div>
    </div>
  </div>
</template>
