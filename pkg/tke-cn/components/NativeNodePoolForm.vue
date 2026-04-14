<script setup>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import TkeUserData from './TkeUserData.vue';
import TkeDataDisk from './TkeDataDisk.vue';
import OsNameSelect from './OsNameSelect.vue';
import InstanceTypeComponent from './InstanceType.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import { queryFromTencent } from '../util/request';
import { computed, watch, ref } from 'vue';
import { stringify } from '@shell/utils/error';
import Banner from '@components/Banner/Banner.vue';
import { useStore } from 'vuex';

const props = defineProps({
  name: {
    type:    String,
    default: ''
  },
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
  dataDisks: {
    type:    Array,
    default: () => ([]),
  },
  bandwidthType: {
    type:    String,
    default: ''
  },
  subnetId: {
    type:    String,
    default: ''
  },
  keyPair: {
    type:    String,
    default: ''
  },
  securityGroup: {
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
  bandwidth: {
    type:    Number,
    default: 0
  },
  userScript: {
    type:    String,
    default: ''
  },
  deletionProtection: {
    type:    Boolean,
    default: false,
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
  subnetOptions: {
    type:    Array,
    default: () => ([]),
  },
  keyPairOptions: {
    type:    Array,
    default: () => ([]),
  },
  securityGroupOptions: {
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
  mode: {
    type:     String,
    required: true
  },
});
const DATA_DISK = 'DATA_DISK';
const SYSTEM_DISK = 'SYSTEM_DISK';
const store = useStore();
const state = ref({
  minSystemDiskSize:      20,
  maxSystemDiskSize:      32000,
  DiskConfigQuotaLoading: false,
  errors:                 [],
});
const options = ref({ DiskConfigQuota: [] });
const currentInstance = ref({});
const intl = computed(() => store.getters['i18n/t']);
const emit = defineEmits([
  'update:name',
  'update:instanceType',
  'update:osName',
  'update:instanceNum',
  'update:systemDiskType',
  'update:systemDiskSize',
  'update:dataDisks',
  'update:bandwidthType',
  'update:bandwidth',
  'update:securityGroup',
  'update:subnetId',
  'update:keyPair',
  'update:userScript',
  'update:deletionProtection',
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

function parseCpuAndMemory(label = '') {
  const matched = label.match(/CPU\s+(\d+)\s+Memory\s+(\d+)\s+GiB/i);

  if (!matched) {
    return null;
  }

  return {
    cpu:    Number(matched[1]),
    memory: Number(matched[2]),
  };
}

function getDefaultInstanceType(options = []) {
  const candidates = options
    .map((item) => {
      const parsed = parseCpuAndMemory(item.label);

      if (!parsed) {
        return null;
      }

      return {
        ...item,
        cpu:    parsed.cpu,
        memory: parsed.memory,
      };
    })
    .filter((item) => item && item.cpu <= 2 && item.memory <= 8)
    .sort((a, b) => {
      if (b.memory !== a.memory) {
        return b.memory - a.memory;
      }

      return b.cpu - a.cpu;
    });

  return candidates[0] || null;
}

async function fetchDiskConfigQuota(cloudCredentialId, zoneId, instanceType) {
  state.value.DiskConfigQuotaLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'diskConfigQuota',
      cloudCredentialId,
      store,
      externalParams: {
        regionId: props?.tkeConfig?.region || '', zoneId: zoneId || '', instanceType: instanceType || ''
      },
    });

    options.value.DiskConfigQuota = res?.Response?.DiskConfigSet || [];
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
    options.value.DiskConfigQuota = [];
  }
  state.value.DiskConfigQuotaLoading = false;
}

const getDiskOptions = computed(() => {
  const systemDiskTypes = {};
  const dataDiskTypes = {};

  options.value.DiskConfigQuota.forEach((d) => {
    if (d.DiskUsage === DATA_DISK) {
      dataDiskTypes[d.DiskType] = {
        label:       `tkeCn.disk.${ d.DiskType }`,
        value:       d.DiskType,
        maxDiskSize: d.MaxDiskSize,
        minDiskSize: d.MinDiskSize,
      };
    }
    if (d.DiskUsage === SYSTEM_DISK) {
      systemDiskTypes[d.DiskType] = {
        label:       `tkeCn.disk.${ d.DiskType }`,
        value:       d.DiskType,
        maxDiskSize: d.MaxDiskSize,
        minDiskSize: d.MinDiskSize,
      };
    }
  });

  return {
    systemDiskTypes: Object.values(systemDiskTypes),
    dataDiskTypes:   Object.values(dataDiskTypes),
  };
});

const arch = computed(() => {
  if (currentInstance.value?.instanceFamily === 'SR1' || currentInstance.value?.instanceFamily === 'SK1' ) {
    return 'arm';
  }

  return 'amd64';
});

function getDefaultSystemDiskSize(diskTypeOption) {
  if (!diskTypeOption) {
    return 20;
  }

  return Math.max(diskTypeOption.minDiskSize || 20, 20);
}

watch(() => props.instanceTypeOptions, () => {
  if (props.instanceType || !props.instanceTypeOptions?.length) {
    return;
  }

  const defaultInstanceType = getDefaultInstanceType(props.instanceTypeOptions);

  if (defaultInstanceType && defaultInstanceType.value && props.isNewOrUnprovisioned && !props.instanceType) {
    emit('update:instanceType', defaultInstanceType.value);
  }
}, { immediate: true });

watch(() => props.subnetOptions, () => {
  if (!props.subnetId && props.subnetOptions?.length > 0 && props.isNewOrUnprovisioned) {
    emit('update:subnetId', props.subnetOptions[0].value);
  }
}, { immediate: true });

watch(() => props.securityGroupOptions, () => {
  if (!props.securityGroup && props.securityGroupOptions?.length > 0 && props.isNewOrUnprovisioned) {
    emit('update:securityGroup', props.securityGroupOptions[0].value);
  }
}, { immediate: true });

watch(
  () => [props?.tkeConfig?.zoneId, props?.instanceType],
  async([zoneId, instanceType]) => {
    const credential = props?.tkeConfig?.tkeCredentialSecret;

    if (!credential || !zoneId || !instanceType) {
      return;
    }

    try {
      await Promise.all([
        fetchDiskConfigQuota(credential, zoneId, instanceType),
      ]);
    } catch (err) {
      state.value.errors = [];
      state.value.errors.push(err);
    }
  },
  { immediate: true }
);

watch(() => getDiskOptions.value.systemDiskTypes, (systemDiskTypes = []) => {
  if (!systemDiskTypes.length) {
    return;
  }

  const selectedSystemDisk = systemDiskTypes.find((item) => item.value === props.systemDiskType);
  const defaultSystemDisk = selectedSystemDisk || systemDiskTypes[0];

  if (!defaultSystemDisk) {
    return;
  }

  state.value.minSystemDiskSize = defaultSystemDisk.minDiskSize || 20;
  state.value.maxSystemDiskSize = defaultSystemDisk.maxDiskSize || 32000;

  if (!props.systemDiskType && props.isNewOrUnprovisioned) {
    emit('update:systemDiskType', defaultSystemDisk.value);
  }

  const defaultSystemDiskSize = getDefaultSystemDiskSize(defaultSystemDisk);

  if (
    !props.systemDiskSize ||
    props.systemDiskSize < state.value.minSystemDiskSize ||
    props.systemDiskSize > state.value.maxSystemDiskSize
  ) {
    emit('update:systemDiskSize', defaultSystemDiskSize);
  }
}, { immediate: true });

// 切换系统盘类型时，更新系统盘大小
watch(() => props.systemDiskType, (systemDiskType) => {
  const matched = getDiskOptions.value.systemDiskTypes.find((item) => item.value === systemDiskType);

  if (!matched) {
    return;
  }

  state.value.minSystemDiskSize = matched.minDiskSize || 20;
  state.value.maxSystemDiskSize = matched.maxDiskSize || 32000;

  const defaultSystemDiskSize = getDefaultSystemDiskSize(matched);

  if (
    (!props.systemDiskSize ||
    props.systemDiskSize < state.value.minSystemDiskSize ||
    props.systemDiskSize > state.value.maxSystemDiskSize) &&
    props.isNewOrUnprovisioned
  ) {
    emit('update:systemDiskSize', defaultSystemDiskSize);
  }
}, { immediate: true });

</script>
<template>
  <div>
    <div class="card-container mb-10">
      <div class="title">
        {{ intl('tkeCn.nodePool.basic.title') }}
      </div>
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            :value="name"
            label-key="tkeCn.nodePoolName.label"
            :mode="mode"
            :rules="rules.name"
            :disabled="tkeConfig.imported"
            data-testid="tke-node-pool-name"
            required
            :placeholder="intl('tkeCn.nodePoolName.placeholder')"
            @update:value="emit('update:name', $event)"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            :value="instanceNum"
            :label="intl('tkeCn.numOfNodes.label')"
            :mode="mode"
            :disabled="tkeConfig.imported"
            :placeholder="intl('tkeCn.numOfNodes.placeholder')"
            @blur="blurInitialNodeCount(instanceNum)"
            @update:value="$emit('update:instanceNum', $event)"
          />
        </div>
      </div>
      <InstanceTypeComponent
        :value="instanceType"
        :current-instance="currentInstance"
        :mode="mode"
        :options="instanceTypeOptions"
        :loading="instanceTypeLoading"
        :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
        :rules="rules.instanceType"
        @update:value="$emit('update:instanceType', $event)"
        @update:current-instance="currentInstance = $event"
      />
      <OsNameSelect
        :value="osName"
        :mode="mode"
        :rules="rules.osName"
        :cloud-credential-id="tkeConfig.tkeCredentialSecret"
        :zone-id="tkeConfig.zoneId"
        :arch="arch"
        :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
        @update:value="$emit('update:osName', $event)"
      />
    </div>
    <div class="card-container mb-10">
      <div class="title">
        {{ intl('tkeCn.disk.title') }}
      </div>
      <div class="row mb-10">
        <div class="col span-5">
          <LabeledSelect
            :value="systemDiskType"
            data-testid="cru-tke-system-disk-type"
            :loading="state.DiskConfigQuotaLoading"
            :mode="mode"
            :options="getDiskOptions.systemDiskTypes"
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
        <div class="col span-5">
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
      <TkeDataDisk
        :model-value="dataDisks"
        :data-disk-type-options="getDiskOptions.dataDiskTypes"
        :disabled="!isNewOrUnprovisioned"
        :loading="state.DiskConfigQuotaLoading"
        :mode="mode"
        @update:modelValue="emit('update:dataDisks', $event)"
      />
    </div>
    <Banner
      v-for="(err, i) in state.errors"
      :key="i"
      class="mt-10 mb-10"
      color="error"
      :label="stringify(err)"
    />
    <div class="card-container mb-10">
      <div class="title">
        {{ intl('tkeCn.nodePool.network.title') }}
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
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            :value="subnetId"
            data-testid="cru-tke-subnet-id"
            :mode="mode"
            :options="subnetOptions"
            :disabled="!isNewOrUnprovisioned"
            option-label="label"
            option-key="value"
            label-key="tkeCn.subnet.label"
            :rules="rules.subnetId"
            required
            :localizedLabel="true"
            @update:value="emit('update:subnetId', $event)"
          />
        </div>
      </div>
    </div>
    <div class="card-container mb-10">
      <div class="title">
        {{ intl('tkeCn.nodePool.other.title') }}
      </div>
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            :value="securityGroup"
            data-testid="cru-tke-security-group"
            :mode="mode"
            :options="securityGroupOptions"
            :disabled="!isNewOrUnprovisioned"
            option-label="label"
            option-key="value"
            label-key="tkeCn.securityGroup.label"
            :rules="rules.securityGroup"
            required
            :localizedLabel="true"
            @update:value="emit('update:securityGroup', $event)"
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
            :localizedLabel="true"
            @update:value="emit('update:keyPair', $event)"
          />
        </div>
      </div>
      <TkeUserData
        :modelValue="userScript"
        :label="intl('tkeCn.userData.label')"
        :disabled="!isNewOrUnprovisioned"
        data-testid="tke-cn-user-data"
        @update:modelValue="emit('update:userScript', $event)"
      />
      <div class="row mt-10">
        <div class="col span-6">
          <Checkbox
            :value="deletionProtection"
            :mode="mode"
            :disabled="tkeConfig.imported"
            :label="intl('tkeCn.superNodePool.advanced.deletionProtection')"
            @update:value="emit('update:deletionProtection', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.card-container {
  border-radius: var(--border-radius);
  padding: 10px;
  box-shadow: 0 0 20px var(--shadow);
  background: var(--body-bg);
}
.title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
.section-title {
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:700;
  margin-top: 6px;
}
.hint {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
}
</style>
