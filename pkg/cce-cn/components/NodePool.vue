<script setup>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import { RadioGroup } from '@components/Form/Radio';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import UnitInput from '@shell/components/form/UnitInput';
import { computed } from 'vue';
import CONFIG_ENV from '../util/config';
import { getDefaultFlavorValue } from '../util/flavors';
import {
  filterOperatingSystemOptions,
  getCceClusterType,
  getDefaultOperatingSystemValue,
  getFlavorArchitecture,
  getOperatingSystemWarningKey,
} from '../util/operatingSystems';
import { useStore } from 'vuex';
import NodeFlavor from './NodeFlavor.vue';
import Banner from '@components/Banner/Banner.vue';

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
  mode: {
    type:     String,
    required: true,
  },
  bmsIsAutoRenew: {
    type:    String,
    default: ''
  },
  clusterVersion: {
    type:    String,
    default: '',
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

const selectedFlavorOption = computed(() => {
  return flavorOptions.value.find((item) => item.value === props.flavor);
});

const operatingSystemOptions = computed(() => {
  return filterOperatingSystemOptions({
    clusterVersion: props.clusterVersion,
    architecture:   getFlavorArchitecture(selectedFlavorOption.value),
    clusterType:    getCceClusterType(props.cceConfig),
    currentOs:      props.operatingSystem || null,
  });
});

const operatingSystemWarningKey = computed(() => {
  return getOperatingSystemWarningKey(props.clusterVersion, props.operatingSystem);
});

function getFirstOptionValue(list) {
  if (!Array.isArray(list) || !list.length) {
    return '';
  }

  return list[0]?.value || '';
}

function getFlavorOptionsForZone(zone) {
  if (!zone) {
    return [];
  }

  return props.flavorOptionsByZones?.[zone] || [];
}

function getVolumeTypeOptionsForZone(zone) {
  if (!zone) {
    return [];
  }

  return props.volumeTypeChoicesByZones?.[zone] || [];
}

function syncOperatingSystem(flavorOption) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  const nextOs = getDefaultOperatingSystemValue({
    clusterVersion: props.clusterVersion,
    flavorOption:   flavorOption || selectedFlavorOption.value,
    cceConfig:      props.cceConfig,
  });

  emit('update:operatingSystem', nextOs);
}

function syncPoolDefaultsForZone(zone) {
  if (!props.isNewOrUnprovisioned || !zone) {
    return;
  }

  const flavorOpts = getFlavorOptionsForZone(zone);
  const volumeOpts = getVolumeTypeOptionsForZone(zone);
  const nextFlavor = getDefaultFlavorValue(flavorOpts);

  emit('update:flavor', nextFlavor);
  emit('update:rootVolumeType', getFirstOptionValue(volumeOpts));
  emit('update:dataVolumeType', getFirstOptionValue(volumeOpts));
  syncOperatingSystem(flavorOpts.find((item) => item.value === nextFlavor));
}

function updateAvailableZone(value) {
  emit('update:availableZone', value);
  syncPoolDefaultsForZone(value);
}

function updateFlavor(value) {
  emit('update:flavor', value);
  syncOperatingSystem(flavorOptions.value.find((item) => item.value === value));
}

function updateBillingMode(value) {
  emit('update:billingMode', value);

  if (!props.isNewOrUnprovisioned || value !== 1) {
    return;
  }

  emit('update:validityPeriod', '1 month');
  emit('update:bmsIsAutoRenew', 'false');
}

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
          @update:value="updateAvailableZone"
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
          @update:value="updateBillingMode"
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
          <label class="clearfix input-label m-0 mb-5">
            {{ intl('cceCn.bmsIsAutoRenew.label') }}
          </label>
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
    <div class="mb-10">
      <NodeFlavor
        :loading="flavorLoading"
        :value="flavor"
        data-testid="crucce-flavor"
        :disabled="!isNewOrUnprovisioned"
        :mode="mode"
        :options="flavorOptions"
        :rules="rules.flavor"
        @update:value="updateFlavor"
      />
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
    <Banner
      v-if="operatingSystemWarningKey"
      class="mb-10"
      color="warning"
      :label="intl(operatingSystemWarningKey)"
    />
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
  </div>
</template>
