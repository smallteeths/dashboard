<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import CONFIG_ENV from '../util/config';
import { useStore } from 'vuex';
import { fetchAvailableResourcesRaw } from '../util/request';
import PoolSize from './PoolSize.vue';
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
    type:    Array,
    default: () => ([]),
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
  autoScalingEnabled: {
    type:    Boolean,
    default: false,
  },
  minInstances: {
    type:    Number,
    default: 1,
  },
  maxInstances: {
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
  allImagesForVersion: {
    type:    Object,
    default: () => ({}),
  },
  zones: {
    type:    Object,
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
  mode: {
    type:    String,
    default: 'edit'
  },
});

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
  'update:autoScalingEnabled',
  'update:minInstances',
  'update:maxInstances',
  'errors',
]);

const store = useStore();
const options = ref({ categoryOptions: CONFIG_ENV.DISKS });
const state = ref({
  categoryOptionsloading: false,
  forceInitCategoryOnce:  false,
});
const isDefaultNodePool = ref(false);

onMounted(() => {
  isDefaultNodePool.value = props.name === 'default-nodepool';
});

const t = computed(() => store.getters['i18n/t']);

const zonesSet = computed(() => {
  if (props.zones instanceof Set) {
    return props.zones;
  }

  return new Set(Array.isArray(props.zones) ? props.zones : []);
});

const ARM_INSTANCE_FAMILIES = new Set([
  'g8y',
  'c8y',
  'r8y',
  'g6r',
  'c6r',
]);

const PREFERRED_PLATFORM_IMAGE_TYPE = 'AliyunLinux4ContainerOptimized';

function getDefaultPlatformValue(list) {
  if (!list?.length) {
    return '';
  }

  const preferred = list.find((item) => item.value === PREFERRED_PLATFORM_IMAGE_TYPE);

  return preferred?.value || list[0]?.value || '';
}

function getInstanceTypeValues(instanceTypes) {
  if (Array.isArray(instanceTypes)) {
    return instanceTypes.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return item?.value || item?.InstanceTypeId || item?.instanceTypeId || item?.id || '';
    }).filter(Boolean);
  }
  if (instanceTypes && typeof instanceTypes === 'object') {
    return Object.values(instanceTypes).map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return item?.value || item?.InstanceTypeId || item?.instanceTypeId || item?.id || '';
    }).filter(Boolean);
  }

  return [];
}

function getInstanceFamily(instanceType) {
  const family = String(instanceType || '').replace(/^ecs\./, '').split('.')[0];

  if (family.startsWith('u1-')) {
    return 'u1';
  }

  return family;
}

function getArchByInstanceType(instanceType) {
  const family = getInstanceFamily(instanceType);

  return ARM_INSTANCE_FAMILIES.has(family) ? 'arm64' : 'amd64';
}

function getImageArch(image) {
  const imageType = image?.imageType || '';
  const imageId = image?.imageId || '';
  const label = image?.label || '';
  const text = `${ imageType } ${ imageId } ${ label }`.toLowerCase();

  if (text.includes('arm64') || text.includes('arm edition')) {
    return 'arm64';
  }

  return 'amd64';
}

const instanceArches = computed(() => {
  const arches = getInstanceTypeValues(props.instanceTypes).map((instanceType) => {
    return getArchByInstanceType(instanceType);
  }).filter(Boolean);

  return new Set(arches);
});

const imageOptions = computed(() => {
  const arches = instanceArches.value;

  return Object.values(props.allImagesForVersion || {}).filter((image) => {
    const imageArch = getImageArch(image);

    if (!arches.size) {
      return true;
    }

    return arches.has(imageArch);
  }).map((image) => {
    return {
      value: image.imageType,
      label: image.label || '',
    };
  });
});

const fetchCategoryOptions = async() => {
  state.value.categoryOptionsloading = true;
  options.value.categoryOptions = [];

  try {
    const types = {};
    let maxCount = 0;
    const instanceTypesLength = props?.instanceTypes?.length || 0;

    for (let i = 0; i < instanceTypesLength; i++) {
      const instanceType = props.instanceTypes[i];

      if (!instanceType) {
        continue;
      }

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
        const zoneAllowed = zonesSet.value.size === 0 || (zone.ZoneId && zonesSet.value.has(zone.ZoneId)) || !props.isNew;

        if (zoneAllowed && zone.Status === CONFIG_ENV.STATUS_AVAILABLE) {
          const availableResources = zone.AvailableResources?.AvailableResource || [];

          availableResources.forEach((resource) => {
            if (resource.Type === CONFIG_ENV.DATA_DISK) {
              const dataDisks = resource.SupportedResources?.SupportedResource || [];

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
                    min:      Math.min(cur.min, disk.Min),
                    max:      Math.max(cur.max, disk.Max),
                    counter:  shouldIncrement ? cur.counter + 1 : cur.counter,
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
      if (types[type].counter === maxCount) {
        out.push({
          value: type,
          label: t.value(`ackCn.nodePool.diskCategory.options.${ type }`),
          raw:   types[type]
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
    const parsedError = err?.error || err || '';

    emit('errors', [parsedError]);
  }
  state.value.categoryOptionsloading = false;
};

watch(
  imageOptions,
  (list) => {
    if (!(props.isNew || props.isNewOrUnprovisioned)) {
      return;
    }

    const exists = list.some((item) => item.value === props.platform);

    if (!list.length) {
      emit('update:platform', '');

      return;
    }

    if (!exists) {
      emit('update:platform', getDefaultPlatformValue(list));
    }
  },
  { immediate: true }
);

watch(
  () => props.instanceTypes,
  async() => {
    await fetchCategoryOptions();

    if (!(props.isNew || props.isNewOrUnprovisioned)) {
      state.value.forceInitCategoryOnce = false;

      return;
    }

    if (state.value.forceInitCategoryOnce) {
      state.value.forceInitCategoryOnce = false;
      initCategory(true);

      return;
    }

    initCategory(false);
  },
  { immediate: true, deep: true }
);

function initCategory(force = false) {
  if (!options.value.categoryOptions?.length || !props.instanceTypes?.length) {
    return;
  }

  const first = options.value.categoryOptions[0];

  if (!first) {
    return;
  }
  const category = first.value;
  const min = Number(first?.raw?.min ?? 0);
  const size = Math.max(40, min);

  if (force || !props.systemDiskCategory) {
    emit('update:systemDiskCategory', category);
    emit('update:systemDiskSize', size);
  }
  const currentDataDisks = Array.isArray(props.dataDisks) ? props.dataDisks : [];
  const nextDataDisks = currentDataDisks.map((disk) => {
    if (!force && disk?.category) {
      return disk;
    }

    return {
      ...disk,
      category,
    };
  });

  const changed = force || nextDataDisks.some((disk, index) => {
    return disk.category !== currentDataDisks[index]?.category;
  });

  if (changed) {
    emit('update:dataDisks', nextDataDisks);
  }
}

function handleInstanceTypesChange(value) {
  emit('update:instanceTypes', value);

  if (!(props.isNew || props.isNewOrUnprovisioned)) {
    return;
  }
  state.value.forceInitCategoryOnce = true;
  emit('update:systemDiskCategory', '');

  const nextDataDisks = (props.dataDisks || []).map((disk) => ({
    ...disk,
    category: '',
  }));

  emit('update:dataDisks', nextDataDisks);
}
</script>
<template>
  <div>
    <div class="card-container mb-10">
      <div class="title">
        {{ t('ackCn.nodePool.name') }}
      </div>
      <div class="row mb-10">
        <div class="col span-6">
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
        <div class="col span-6">
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
      </div>
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            :value="platform"
            data-testid="cruack-platform"
            :mode="mode"
            :options="imageOptions"
            option-label="label"
            option-key="value"
            label-key="ackCn.platform.label"
            :disabled="disabled"
            :rules="rules.platform"
            required
            @update:value="emit('update:platform', $event)"
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
            :placeholder="t('ackCn.keyPair.placeholder')"
            @update:value="emit('update:keyPair', $event)"
          />
        </div>
      </div>
    </div>
    <div class="card-container mb-10">
      <div class="title">
        {{ t('ackCn.nodePool.scalingMode.label') }}
      </div>
      <PoolSize
        :auto-scaling-enabled="autoScalingEnabled"
        :instances-num="instancesNum"
        :min-instances="minInstances"
        :max-instances="maxInstances"
        :is-inactive="disabledInstancesNum || ackConfig.imported"
        :validation-rules="rules"
        @update:autoScalingEnabled="emit('update:autoScalingEnabled', $event)"
        @update:instancesNum="emit('update:instancesNum', $event)"
        @update:minInstances="emit('update:minInstances', $event)"
        @update:maxInstances="emit('update:maxInstances', $event)"
      />
    </div>
    <div class="card-container mb-10">
      <div class="title">
        {{ t('ackCn.nodePool.instanceTypes.table.title') }}
      </div>
      <InstanceType
        :config="ackConfig"
        :value="instanceTypes"
        :allInstanceTypes="allInstanceTypeOptions"
        :loadingInstanceTypes="instanceTypeLoading"
        :disabled="disabled"
        :zones="zones"
        @update:value="handleInstanceTypesChange"
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
        class="mb-10"
        @update:category="emit('update:systemDiskCategory', $event)"
        @update:size="emit('update:systemDiskSize', $event)"
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
        @update:value="emit('update:dataDisks', $event)"
      />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.card-container {
  &.highlight-border {
    border-left: 5px solid var(--primary);
  }
  border-radius: var(--border-radius);
  flex-basis: 40%;
  min-height: 100px;
  padding: 10px;
  box-shadow: 0 0 20px var(--shadow);
}
.type-description {
  color: var(--input-label);
}
.title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
.desc-info {
  justify-content: center;
  align-items: center;
  display: flex;
  background: linear-gradient(51deg, rgb(111 210 74 / 0.12), rgba(34, 239, 171, 0));
  border-radius: var(--border-radius);
  Icon {
    color: var(--on-tertiary, var(--link));
    margin: 0 10px;
  }
}
</style>
