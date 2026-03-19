<script setup>
import {
  DEFAULT_MIN_NODES_SCALING,
  DEFAULT_MAX_NODES_SCALING
} from '../util/config';
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import RadioGroup from '@components/Form/Radio/RadioGroup.vue';

const props = defineProps({
  autoScalingEnabled: {
    type:    Boolean,
    default: false
  },
  instancesNum: {
    type:    Number,
    default: null
  },
  minInstances: {
    type:    Number,
    default: null
  },
  maxInstances: {
    type:    Number,
    default: null
  },
  isInactive: {
    type:    Boolean,
    default: false
  },
  validationRules: {
    type:    Object,
    default: () => ({})
  }
});

const emit = defineEmits([
  'update:autoScalingEnabled',
  'update:instancesNum',
  'update:minInstances',
  'update:maxInstances'
]);
const store = useStore();
const t = store.getters['i18n/t'];
const scalingModeOptions = ref([
  { label: t('ackCn.nodePool.scalingMode.manual'), value: false },
  { label: t('ackCn.nodePool.scalingMode.auto'), value: true }
]);

const autoScalingValue = computed({
  get() {
    return props.autoScalingEnabled;
  },
  set(val) {
    handleEnablingAutoscaling(val);
  }
});

const instancesNumValue = computed({
  get() {
    return props.instancesNum;
  },
  set(val) {
    emit('update:instancesNum', val);
  }
});

const minInstancesValue = computed({
  get() {
    return props.minInstances;
  },
  set(val) {
    emit('update:minInstances', val);
  }
});

const maxInstancesValue = computed({
  get() {
    return props.maxInstances;
  },
  set(val) {
    emit('update:maxInstances', val);
  }
});

function instancesNumValidator() {
  return (val) => props.validationRules?.count?.[0]?.(val);
}

function minInstancesValidator() {
  const maxInstances = props.maxInstances;

  return (val) => props.validationRules?.minInstances?.[0]?.(val, maxInstances);
}

function maxInstancesValidator() {
  const minInstances = props.minInstances;

  return (val) => props.validationRules?.maxInstances?.[0]?.(val, minInstances);
}

function handleEnablingAutoscaling(val) {
  emit('update:autoScalingEnabled', val);

  if (!val) {
    emit('update:minInstances', null);
    emit('update:maxInstances', null);
    emit('update:instancesNum', 1);
  } else {
    emit('update:minInstances', DEFAULT_MIN_NODES_SCALING);
    emit('update:maxInstances', DEFAULT_MAX_NODES_SCALING);
    emit('update:instancesNum', null);
  }
}
</script>

<template>
  <div class="mb-10">
    <div class="col span-6 mb-10">
      <RadioGroup
        v-model:value="autoScalingValue"
        name="node-autoscaling"
        :mode="mode"
        :options="scalingModeOptions"
        :row="true"
        :disabled="isInactive"
      />
    </div>
    <div
      v-if="!autoScalingEnabled"
      class="col span-6"
    >
      <LabeledInput
        v-model:value.number="instancesNumValue"
        :disabled="isInactive"
        :mode="mode"
        type="number"
        label-key="ackCn.nodePool.desiredSize.label"
        data-testid="ack-value-count-input"
        required
        :require-dirty="false"
        :rules="[instancesNumValidator()]"
      />
    </div>
    <div
      v-else
      class="row span-12"
    >
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="minInstancesValue"
          type="number"
          :mode="mode"
          label-key="ackCn.nodePool.minInstances.label"
          data-testid="ack-value-min-instances-input"
          :disabled="isInactive"
          :rules="[minInstancesValidator()]"
          :require-dirty="false"
          required
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="maxInstancesValue"
          type="number"
          :mode="mode"
          label-key="ackCn.nodePool.maxInstances.label"
          data-testid="ack-value-max-instances-input"
          :disabled="isInactive"
          :rules="[maxInstancesValidator()]"
          :require-dirty="false"
          required
        />
      </div>
    </div>
  </div>
</template>
