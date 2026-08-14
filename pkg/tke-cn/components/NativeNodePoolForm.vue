<script setup>
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import TkeUserData from './TkeUserData.vue';
import TkeDataDisk from './TkeDataDisk.vue';
import OsNameSelect from './OsNameSelect.vue';
import InstanceTypeComponent from './InstanceType.vue';
import { queryFromTencent } from '../util/request';
import { computed, watch, ref } from 'vue';
import { stringify } from '@shell/utils/error';
import Banner from '@components/Banner/Banner.vue';
import DeletionProtectionSwitch from './DeletionProtectionSwitch.vue';
import LabeledMultiSelect from './LabeledMultiSelect.vue';
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
    type:    Array,
    default: () => ([]),
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
  publicIpAssigned: {
    type:    Boolean,
    default: true,
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
    type:    [Array, Object],
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
  zoneOptions: {
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
const shouldSyncSubnetAfterInstanceChange = ref(false);
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
  'update:publicIpAssigned',
  'update:securityGroup',
  'update:subnetId',
  'update:keyPair',
  'update:userScript',
  'update:deletionProtection',
]);
// 全部的实例类型
const flatInstanceTypeOptions = computed(() => {
  const allInstances = props.instanceTypeOptions;

  if (!allInstances) {
    return [];
  }

  if (Array.isArray(allInstances)) {
    return allInstances;
  }

  return Object.values(allInstances).reduce((res, list) => {
    return res.concat(Array.isArray(list) ? list : []);
  }, []);
});

// 选中的 row 非常重要
const selectedInstanceRow = computed(() => {
  return flatInstanceTypeOptions.value.find((item) => {
    return item.value === props.instanceType;
  }) || null;
});

const currentInstanceZoneId = computed(() => {
  return selectedInstanceRow.value?.raw?.Zone || selectedInstanceRow.value?.zone || '';
});

const showBandwidthFields = computed(() => {
  return props.publicIpAssigned !== false && props.publicIpAssigned !== 'false';
});

const publicIpAssignedOptions = computed(() => {
  return [
    {
      label: intl.value('generic.enabled'),
      value: true,
    },
    {
      label: intl.value('generic.disabled'),
      value: false,
    },
  ];
});

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

function handleInstanceTypeChange(instanceType) {
  emit('update:instanceType', instanceType);
  shouldSyncSubnetAfterInstanceChange.value = true;
}

async function fetchDiskConfigQuota(cloudCredentialId, zoneId, instanceType) {
  state.value.DiskConfigQuotaLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'diskConfigQuota',
      cloudCredentialId,
      store,
      externalParams: {
        regionId:     props?.tkeConfig?.region || '',
        zoneId:       zoneId || '',
        instanceType: instanceType || ''
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
  const family = selectedInstanceRow.value?.instanceFamily ||
    selectedInstanceRow.value?.group ||
    selectedInstanceRow.value?.raw?.InstanceFamily || '';

  if (family === 'SR1' || family === 'SK1') {
    return 'arm';
  }

  return 'amd64';
});

function getItemZone(item) {
  return item?.raw?.Zone || item?.zone || '';
}

// filteredSubnetOptions 逻辑比较复杂
// filteredSubnetOptions 根据的是当前选择的实例类型在哪个区域里有
// availableZones 就是获得当前选择的实例类型在哪个区域里可用
// subnetOptions 根据所有当前可用的区域来过滤子网
const filteredSubnetOptions = computed(() => {
  const options = Array.isArray(props.subnetOptions) ? props.subnetOptions : [];
  const eniSubnetIds = Array.isArray(props.tkeConfig?.eniSubnetIds) ? props.tkeConfig.eniSubnetIds : [];
  const isVpcCni = props.tkeConfig?.networkType === 'VPC-CNI';
  const formatOption = (item) => {
    const subnetZone = item.Zone || item.zone || '';
    const matchedZone = (props.zoneOptions || []).find((z) => z.value === subnetZone);
    const zoneLabel = matchedZone?.label || subnetZone;

    return {
      ...item,
      label: `${ item.label || item.value } (${ zoneLabel })`,
    };
  };

  let filtered = options;

  if (isVpcCni && eniSubnetIds.length > 0) {
    const eniSubnetIdSet = new Set(eniSubnetIds);
    // 根据 ENI 子网推断可用区，展示这些可用区下的全部子网（不限于 ENI 子网 ID 本身）
    const eniZones = new Set(
      options
        .filter((item) => {
          const subnetId = item.SubnetId || item.subnetId || item.value || '';

          return eniSubnetIdSet.has(subnetId);
        })
        .map((item) => item.Zone || item.zone || '')
        .filter(Boolean)
    );

    if (eniZones.size > 0) {
      filtered = filtered.filter((item) => eniZones.has(item.Zone || item.zone || ''));
    } else {
      filtered = filtered.filter((item) => {
        const subnetId = item.SubnetId || item.subnetId || item.value || '';

        return eniSubnetIdSet.has(subnetId);
      });
    }
  }

  if (!props.instanceType) {
    return filtered.map(formatOption);
  }

  const matches = flatInstanceTypeOptions.value.filter((item) => {
    return item.value === props.instanceType;
  });

  if (!matches.length) {
    return filtered.map(formatOption);
  }

  const availableZones = new Set(
    matches
      .map((item) => getItemZone(item))
      .filter(Boolean)
  );

  if (!availableZones.size) {
    return filtered.map(formatOption);
  }

  return filtered
    .filter((item) => {
      const subnetZone = item.Zone || item.zone || '';

      return availableZones.has(subnetZone);
    })
    .map(formatOption);
});

function getDefaultSystemDiskSize(diskTypeOption) {
  if (!diskTypeOption) {
    return 20;
  }

  return Math.max(diskTypeOption.minDiskSize || 20, 20);
}

watch(() => flatInstanceTypeOptions.value, (instanceOptions = []) => {
  if (!instanceOptions.length) {
    return;
  }

  if (props.instanceType) {
    return;
  }

  const defaultInstanceType = getDefaultInstanceType(instanceOptions);

  if (defaultInstanceType && defaultInstanceType.value && props.isNewOrUnprovisioned) {
    emit('update:instanceType', defaultInstanceType.value);
  }
}, { immediate: true, deep: true });

watch(() => filteredSubnetOptions.value, (options = []) => {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  const currentSubnetIds = Array.isArray(props.subnetId) ? props.subnetId : [];

  // 已有 subnetId，而且不是用户刚刚手动切换 instanceType，就不自动覆盖
  // 这个非常重要因为 isNewOrUnprovisioned 有时候后端返回慢并不能完全杜绝编辑覆盖
  if (currentSubnetIds.length > 0 && !shouldSyncSubnetAfterInstanceChange.value) {
    return;
  }

  if (!options.length) {
    emit('update:subnetId', []);
    shouldSyncSubnetAfterInstanceChange.value = false;

    return;
  }

  const allOptionValues = options.map((item) => item.value);
  const hasAnyNotExists = currentSubnetIds.some((id) => !allOptionValues.includes(id));

  if (!currentSubnetIds.length || hasAnyNotExists) {
    emit('update:subnetId', options[0]?.value ? [options[0].value] : []);
  }

  shouldSyncSubnetAfterInstanceChange.value = false;
}, { immediate: true, deep: true });

watch(() => props.securityGroupOptions, () => {
  if (!props.securityGroup && props.securityGroupOptions?.length > 0 && props.isNewOrUnprovisioned) {
    emit('update:securityGroup', props.securityGroupOptions[0].value);
  }
}, { immediate: true });

watch(
  () => [currentInstanceZoneId.value, props.instanceType],
  async([zoneId, instanceType]) => {
    state.value.errors = [];
    const credential = props?.tkeConfig?.tkeCredentialSecret;

    if (!credential || !zoneId || !instanceType) {
      return;
    }

    try {
      await fetchDiskConfigQuota(credential, zoneId, instanceType);
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
    <div class="basic-layout-row">
      <div class="card-container mb-10">
        <div class="title">
          {{ intl('tkeCn.nodePool.basic.title') }}
        </div>
        <div class="hint">
          {{ intl('tkeCn.nodePool.basic.hint') }}
        </div>
        <div class="row mt-10">
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
              @update:value="emit('update:instanceNum', $event)"
            />
          </div>
        </div>
      </div>
      <div class="card-container mb-10">
        <h3 class="title">
          {{ intl('tkeCn.nodePool.deletionProtection.label') }}
        </h3>
        <div class="hint">
          {{ intl('tkeCn.nodePool.deletionProtection.description') }}
        </div>
        <DeletionProtectionSwitch
          class="mt-10"
          :checked="deletionProtection"
          :disabled="tkeConfig.imported"
          :t="intl"
          @toggle-change="emit('update:deletionProtection', $event)"
        />
      </div>
    </div>
    <div class="card-container mb-10">
      <InstanceTypeComponent
        :value="instanceType"
        :mode="mode"
        :options="flatInstanceTypeOptions"
        :zone-options="zoneOptions"
        :loading="instanceTypeLoading"
        :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
        :rules="rules.instanceType"
        @update:value="handleInstanceTypeChange"
      />
      <OsNameSelect
        :value="osName"
        :mode="mode"
        :rules="rules.osName"
        :cloud-credential-id="tkeConfig.tkeCredentialSecret"
        :zone-id="currentInstanceZoneId"
        :arch="arch"
        :disabled="!isNewOrUnprovisioned || tkeConfig.imported"
        @update:value="emit('update:osName', $event)"
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
            @update:value="emit('update:systemDiskSize', $event)"
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
            :value="publicIpAssigned"
            data-testid="cru-tke-public-ip-assigned"
            :mode="mode"
            :options="publicIpAssignedOptions"
            :disabled="!isNewOrUnprovisioned"
            option-label="label"
            option-key="value"
            :clearable="false"
            label-key="tkeCn.publicIpAssigned.label"
            required
            @update:value="emit('update:publicIpAssigned', $event)"
          />
        </div>
        <div class="col span-6">
          <LabeledMultiSelect
            :value="subnetId"
            data-testid="cru-tke-subnet-id"
            :mode="mode"
            :options="filteredSubnetOptions"
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
      <div
        v-if="showBandwidthFields"
        class="row mb-10"
      >
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
            @update:value="emit('update:bandwidth', $event)"
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
    </div>
  </div>
</template>
<style scoped lang="scss">
.basic-layout-row {
  display: grid;
  grid-template-columns: minmax(0,1.3fr) minmax(220px,0.7fr);
  gap: 10px;
  align-items: stretch;
}
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
