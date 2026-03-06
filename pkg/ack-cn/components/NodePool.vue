<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import CONFIG_ENV from '../util/config';
import { useStore } from 'vuex';
import { fetchAvailableResourcesRaw } from '../util/request';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import InstanceType from './InstanceType.vue';
import DiskGroup from './DiskGroup.vue';
import DiskType from './DiskType.vue';

const props = defineProps({
  name: {
    type:    String,
    default: ''
  },
  runtimeVersion: {
    type:    String,
    default: ''
  },
  instanceTypes: {
    type:    String,
    default: ''
  },
  systemDiskCategory: {
    type:    String,
    default: ''
  },
  platform: {
    type:    String,
    default: ''
  },
  keyPair: {
    type:    String,
    default: ''
  },
  dataDisks: {
    type:    Array,
    default: () => ([]),
  },
  instancesNum: {
    type:    Number,
    default: 3,
  },
  systemDiskSize: {
    type:    Number,
    default: 120,
  },
  instanceTypeLoading: {
    type:    Boolean,
    default: false,
  },
  keyPairLoading: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  disabledInstancesNum: {
    type:    Boolean,
    default: false,
  },
  ackConfig: {
    type:    Object,
    default: () => ({}),
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  allInstanceTypeOptions: {
    type:    Object,
    default: () => ({}),
  },
  keyPairOptions: {
    type:    Array,
    default: () => ([]),
  },
  zones: {
    type:    Array,
    default: () => (new Set()),
  },
  isNew: {
    type:    Boolean,
    default: false,
  },
  isNewOrUnprovisioned: {
    type:    Boolean,
    default: false,
  },
  mode: { type: String, default: 'edit' },
});
const store = useStore();
const options = ref({ categoryOptions: CONFIG_ENV.DISKS });
const state = ref({ categoryOptionsloading: false });
const isDefaultNodePool = ref(false);

const emit = defineEmits([
  'update:name',
  'update:runtimeVersion',
  'update:instanceTypes',
  'update:instancesNum',
  'update:systemDiskCategory',
  'update:systemDiskSize',
  'update:dataDisks',
  'update:platform',
  'update:keyPair',
  'errors',
]);

onMounted(() => {
  isDefaultNodePool.value = props.name === 'default-nodepool';
});

const intl = computed(() => store.getters['i18n/t']);
const fetchCategoryOptions = async() => {
  state.value.categoryOptionsloading = true;
  options.value.categoryOptions = [];

  try {
    const types = {};
    let maxCount = 0;
    const instanceTypesLength = props?.instanceTypes?.length || 0;

    for (let i = 0; i < instanceTypesLength; i++) {
      const instanceType = props.instanceTypes[i];
      const externalParamsForAvailable = {
        regionId:            props.ackConfig.regionId,
        destinationResource: 'DataDisk',
        resourceType:        'disk',
        instanceType,
      };
      const res = await fetchAvailableResourcesRaw({
        resource:          '',
        plural:            'AvailableResource',
        cloudCredentialId: props.ackConfig.aliyun_credential_secret,
        externalParams:    externalParamsForAvailable,
        store,
      });
      const availableZones = res?.AvailableZones?.AvailableZone || [];

      availableZones.forEach((zone) => {
        const zoneAllowed = props.zones.size === 0 || (zone.ZoneId && props.zones.has(zone.ZoneId)) || !props.isNew;

        if (zoneAllowed && zone.Status === CONFIG_ENV.STATUS_AVAILABLE) {
          const availableResources = zone.AvailableResources?.AvailableResource || [];

          availableResources.forEach((resource) => {
            if (resource.Type === CONFIG_ENV.DATA_DISK) {
              const dataDisks = resource.SupportedResources?.SupportedResource;

              dataDisks.forEach((disk) => {
                if (!types[disk.Value]) {
                  types[disk.Value] = {
                    min:      disk.Min,
                    max:      disk.Max,
                    counter:  1,
                    lastType: instanceType
                  };
                } else {
                  const cur = types[disk.Value];
                  const shouldIncrement = cur.lastType !== instanceType;

                  types[disk.Value] = {
                    min:      Math.min(types[disk.Value].min, disk.Min),
                    max:      Math.max(cur.max, disk.Max),
                    counter:  !shouldIncrement ? cur.counter : cur.counter + 1,
                    lastType: instanceType
                  };
                }
                maxCount = Math.max(maxCount, types[disk.Value].counter);
              });
            }
          });
        }
      });
    }
    const out = [];

    for (const type in types) {
      // 返回的是所有 instance type 中都支持的磁盘类型 也就是 .counter === maxCount
      if (types[type].counter === maxCount) {
        out.push({
          value: type, label: intl.value( `ackCn.nodePool.diskCategory.options.${ type }`), raw: types[type]
        });
      }
    }
    const PREFERRED = 'cloud_essd';

    out.sort((a, b) => {
      if (a.value === PREFERRED && b.value !== PREFERRED) return -1;
      if (b.value === PREFERRED && a.value !== PREFERRED) return 1;

      return 0;
    });
    options.value.categoryOptions = out;
  } catch (err) {
    const parsedError = err.error || '';

    emit('errors', [parsedError]);
  }
  state.value.categoryOptionsloading = false;
};

function blurInstancesNum(num) {
  if (num === '') {
    emit('update:instancesNum', 0);
  }
}

watch(
  () => props.instanceTypes,
  async(instanceTypes) => {
    await fetchCategoryOptions(instanceTypes);
    // 只有新创建的或者未 provisioned 的 nodepool 才需要初始化 category
    if (props.isNew || props.isNewOrUnprovisioned) {
      initCategory();
    }
  },
  { immediate: true }
);

function initCategory() {
  if (options.value.categoryOptions?.length > 0 && props.instanceTypes?.length > 0) {
    const first = options.value.categoryOptions?.[0];

    if (!first) {
      return;
    }
    const category = first.value;
    const min = Number(first?.raw?.min ?? 0);
    const size = Math.max(40, min);

    emit('update:systemDiskCategory', category);
    emit('update:systemDiskSize', size);
    const dataDisks = (props.dataDisks || []).map((disk) => ({
      ...disk,
      category,
      size,
    }));

    emit('update:dataDisks', dataDisks);
  }
}

</script>
<template>
  <div>
    <div class="row mb-10">
      <div class="col span-4">
        <LabeledInput
          :value="name"
          label-key="ackCn.nodePoolName.label"
          :mode="mode"
          :rules="rules.name"
          data-testid="ack-node-pool-name"
          :disabled="isDefaultNodePool || disabled"
          required
          @update:value="emit('update:name', $event)"
        />
      </div>
      <div class="col span-4">
        <LabeledInput
          :value="runtimeVersion"
          label-key="ackCn.runtime.label"
          :mode="mode"
          :rules="rules.runtimeVersion"
          data-testid="ack-node-runtime-version"
          :disabled="disabled"
          required
          @update:value="emit('update:runtimeVersion', $event)"
        />
      </div>
      <div class="col span-4">
        <LabeledInput
          :value="instancesNum"
          :disabled="disabledInstancesNum || ackConfig.imported"
          label-key="ackCn.numOfNodes.label"
          :mode="mode"
          type="number"
          data-testid="ack-node-instances-num"
          :rules="rules.instancesNum"
          min="0"
          required
          @blur="blurInstancesNum(instancesNum)"
          @update:value="$emit('update:instancesNum', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div
        class="col span-6"
      >
        <LabeledSelect
          :value="platform"
          data-testid="cruack-platform"
          :mode="mode"
          :options="CONFIG_ENV.PLATFORMTYPES"
          option-label="label"
          option-key="value"
          label-key="ackCn.platform.label"
          :disabled="disabled"
          :rules="rules.platform"
          required
          @update:value="$emit('update:platform', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          :value="keyPair"
          data-testid="cruack-key-pair"
          :mode="mode"
          :options="keyPairOptions"
          option-label="label"
          option-key="value"
          label-key="ackCn.keyPair.label"
          :loading="keyPairLoading"
          :disabled="disabled"
          :placeholder="intl('ackCn.keyPair.placeholder')"
          @update:value="$emit('update:keyPair', $event)"
        />
      </div>
    </div>
    <InstanceType
      :config="ackConfig"
      :value="instanceTypes"
      :allInstanceTypes="allInstanceTypeOptions"
      :loadingInstanceTypes="instanceTypeLoading"
      :disabled="disabled"
      :zones="zones"
      @update:value="$emit('update:instanceTypes', $event)"
    />
    <p class="mb-10">
      {{ t('ackCn.nodePool.systemDisk.title') }}
    </p>
    <DiskType
      :category="systemDiskCategory"
      :size="systemDiskSize"
      :mode="mode"
      :disabled="disabled"
      :show-encrypted="false"
      :options="options.categoryOptions"
      :loading="state.categoryOptionsloading"
      class="mb-30"
      @update:category="$emit('update:systemDiskCategory', $event)"
      @update:size="$emit('update:systemDiskSize', $event)"
    />
    <p class="mb-10">
      {{ t('ackCn.nodePool.dataDisks.title') }}
    </p>
    <DiskGroup
      :value="dataDisks"
      :mode="mode"
      :disabled="disabled"
      :options="options.categoryOptions"
      :loading="state.categoryOptionsloading"
      @update:value="$emit('update:dataDisks', $event)"
    />
  </div>
</template>
