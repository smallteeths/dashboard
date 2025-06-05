<script setup>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import { RadioGroup } from '@components/Form/Radio';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import UnitInput from '@shell/components/form/UnitInput';
import { computed, watch } from 'vue';
import CONFIG_ENV from '../util/config';
import { useStore } from 'vuex';

const props = defineProps({
  name: {
    type:    String,
    default: ''
  },
  runtime: {
    type:    String,
    default: ''
  },
  availableZone: {
    type:    String,
    default: ''
  },
  billingMode: {
    type:    Number,
    default: 0,
  },
  rootVolumeType: {
    type:    String,
    default: ''
  },
  rootVolumeSize: {
    type:    Number,
    default: 0,
  },
  initialNodeCount: {
    type:    Number,
    default: 0,
  },
  dataVolumeType: {
    type:    String,
    default: ''
  },
  sshKey: {
    type:    String,
    default: ''
  },
  flavor: {
    type:    String,
    default: ''
  },
  validityPeriod: {
    type:    String,
    default: ''
  },
  dataVolumeSize: {
    type:    Number,
    default: 0,
  },
  operatingSystem: {
    type:    String,
    default: ''
  },
  isNewOrUnprovisioned: {
    type:    Boolean,
    default: false,
  },
  bmsIsAutoRenew: {
    type:    String,
    default: ''
  },
  operatingSystemOptions: {
    type:    Array,
    default: () => ([]),
  },
  validityPeriodOptions: {
    type:    Array,
    default: () => ([]),
  },
  cceConfig: {
    type:    Object,
    default: () => ({}),
  },
  volumeTypeChoicesByZones: {
    type:    Object,
    default: () => ({}),
  },
  flavorOptionsByZones: {
    type:    Object,
    default: () => ({}),
  },
  availableZoneOptions: {
    type:    Array,
    default: () => ([]),
  },
  sshKeyOptions: {
    type:    Array,
    default: () => ([]),
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  volumeTypesLoading: {
    type:    Boolean,
    default: false,
  },
  osAvailabilityZoneLoading: {
    type:    Boolean,
    default: false,
  },
  osKeypairsLoading: {
    type:    Boolean,
    default: false,
  },
  flavorLoading: {
    type:    Boolean,
    default: false,
  },
});
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const emit = defineEmits([
  'update:name',
  'update:runtime',
  'update:availableZone',
  'update:billingMode',
  'update:rootVolumeType',
  'update:rootVolumeSize',
  'update:dataVolumeType',
  'update:dataVolumeSize',
  'update:flavor',
  'update:initialNodeCount',
  'update:operatingSystem',
  'update:sshKey',
  'update:validityPeriod',
  'update:bmsIsAutoRenew',
]);

const volumeTypeOptions = computed(() => {
  const availableZone = props.availableZone;

  if (availableZone) {
    return props.volumeTypeChoicesByZones[availableZone] ? props.volumeTypeChoicesByZones[availableZone] : [];
  }

  return [];
});

const flavorOptions = computed(() => {
  const availableZone = props.availableZone;

  if (availableZone) {
    return props.flavorOptionsByZones[availableZone] ? props.flavorOptionsByZones[availableZone] : [];
  }

  return [];
});

const isMonthlyYearly = computed(() => {
  const billingMode = props.billingMode;

  if (billingMode === 1) {
    return true;
  }

  return false;
});

watch(() => props.billingMode, async(billingMode) => {
  if (billingMode === 1 && !props.validityPeriod) {
    emit('update:validityPeriod', '1 month');
  }
  if (billingMode === 1 && !props.bmsIsAutoRenew) {
    emit('update:bmsIsAutoRenew', 'false');
  }
});

function blurInitialNodeCount(num) {
  if (num === '') {
    emit('update:initialNodeCount', 0);
  }
}

</script>
<template>
  <div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          :value="name"
          label-key="cceCn.nodePoolName.label"
          :mode="mode"
          :rules="rules.name"
          :disabled="cceConfig.imported"
          data-testid="cce-node-pool-name"
          required
          :placeholder="intl('cceCn.nodePoolName.placeholder')"
          @update:value="emit('update:name', $event)"
        />
      </div>
      <div class="col span-6">
        <div>
          <h3 class="clearfix">
            Containerd
          </h3>
          <RadioGroup
            :value="runtime"
            name="runtime"
            :options="['containerd']"
            :disabled="true"
            :labels="['Containerd']"
            :mode="mode"
            @update:value="emit('update:runtime', $event)"
          />
        </div>
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :loading="osAvailabilityZoneLoading"
          :value="availableZone"
          data-testid="crucce-available-zone"
          :mode="mode"
          :options="availableZoneOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.availableZone.label"
          :rules="rules.availableZone"
          required
          @update:value="emit('update:availableZone', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          :value="billingMode"
          data-testid="crucce-billing-mode-zone"
          :mode="mode"
          :options="CONFIG_ENV.BILLING_MODES"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.billingMode.label"
          :rules="rules.billingMode"
          required
          :localizedLabel="true"
          @update:value="emit('update:billingMode', $event)"
        />
      </div>
    </div>
    <div
      v-if="isMonthlyYearly"
      class="row mb-10"
    >
      <div class="col span-6">
        <LabeledSelect
          :value="validityPeriod"
          data-testid="crucce-validity-period"
          :mode="mode"
          :options="validityPeriodOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.validityPeriod.label"
          required
          :localizedLabel="true"
          @update:value="emit('update:validityPeriod', $event)"
        />
      </div>
      <div class="col span-6">
        <div>
          <h3 class="clearfix">
            {{ intl('cceCn.bmsIsAutoRenew.label') }}
          </h3>
          <RadioGroup
            :value="bmsIsAutoRenew"
            name="bmsIsAutoRenew"
            :options="['false', 'true']"
            :disabled="!isNewOrUnprovisioned"
            :labels="[intl('generic.disabled'), intl('generic.enabled'),]"
            :mode="mode"
            @update:value="emit('update:bmsIsAutoRenew', $event)"
          />
        </div>
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :loading="volumeTypesLoading"
          :value="rootVolumeType"
          data-testid="crucce-root-volume-type"
          :mode="mode"
          :options="volumeTypeOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.rootVolumeType.label"
          :localizedLabel="true"
          :rules="rules.rootVolumeType"
          required
          @update:value="emit('update:rootVolumeType', $event)"
        />
      </div>
      <div class="col span-6">
        <UnitInput
          :value="rootVolumeSize"
          :label="intl('cceCn.rootVolumeSize.label')"
          :mode="mode"
          :rules="rules.rootVolumeSize"
          :disabled="!isNewOrUnprovisioned"
          :placeholder="intl('cceCn.rootVolumeSize.placeholder')"
          required
          suffix="GB"
          @update:value="$emit('update:rootVolumeSize', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :loading="volumeTypesLoading"
          :value="dataVolumeType"
          data-testid="crucce-data-volume-type"
          :mode="mode"
          :options="volumeTypeOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.dataVolumeType.label"
          :localizedLabel="true"
          :rules="rules.dataVolumeType"
          required
          @update:value="emit('update:dataVolumeType', $event)"
        />
      </div>
      <div class="col span-6">
        <UnitInput
          :value="dataVolumeSize"
          :label="intl('cceCn.dataVolumeSize.label')"
          :disabled="!isNewOrUnprovisioned"
          :mode="mode"
          :placeholder="intl('cceCn.dataVolumeSize.placeholder')"
          :rules="rules.dataVolumeSize"
          required
          suffix="GB"
          @update:value="$emit('update:dataVolumeSize', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :loading="flavorLoading"
          :value="flavor"
          data-testid="crucce-flavor"
          :disabled="!isNewOrUnprovisioned"
          :mode="mode"
          :options="flavorOptions"
          option-label="label"
          option-key="value"
          label-key="cceCn.flavor.label"
          :rules="rules.flavor"
          required
          @update:value="emit('update:flavor', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="initialNodeCount"
          label-key="cceCn.initialNodeCount.label"
          :mode="mode"
          data-testid="cce-node-initial-node-count"
          required
          :disabled="cceConfig.imported"
          type="number"
          @blur="blurInitialNodeCount(initialNodeCount)"
          @update:value="emit('update:initialNodeCount', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="operatingSystem"
          data-testid="crucce-operating-system-zone"
          :mode="mode"
          :options="operatingSystemOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.operatingSystem.label"
          :rules="rules.operatingSystem"
          required
          @update:value="emit('update:operatingSystem', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          :loading="osKeypairsLoading"
          :value="sshKey"
          data-testid="crucce-sshKey"
          :mode="mode"
          :options="sshKeyOptions"
          :disabled="!isNewOrUnprovisioned"
          option-label="label"
          option-key="value"
          label-key="cceCn.sshKey.label"
          :rules="rules.sshKey"
          required
          @update:value="emit('update:sshKey', $event)"
        />
      </div>
    </div>
  </div>
</template>
