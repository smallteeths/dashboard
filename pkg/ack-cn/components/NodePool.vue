<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import CONFIG_ENV from '../util/config';
import { useStore } from 'vuex';
import { fetchAvailableResources } from '../util/request';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import UnitInput from '@shell/components/form/UnitInput';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

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
  category: {
    type:    String,
    default: ''
  },
  instancesNum: {
    type:    Number,
    default: 3,
  },
  systemDiskSize: {
    type:    Number,
    default: 40,
  },
  size: {
    type:    Number,
    default: 40,
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
  instanceTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  keyPairOptions: {
    type:    Array,
    default: () => ([]),
  },
  mode: { type: String, default: 'edit' },
});
const store = useStore();
const options = ref({ categoryOptions: [] });
const state = ref({ categoryOptionsloading: false });
const isDefaultNodePool = ref(false);

const emit = defineEmits([
  'update:name',
  'update:runtimeVersion',
  'update:instanceTypes',
  'update:instancesNum',
  'update:systemDiskCategory',
  'update:systemDiskSize',
  'update:category',
  'update:size',
  'update:platform',
  'update:keyPair',
]);

onMounted(() => {
  isDefaultNodePool.value = props.name === 'default-nodepool';
});

const intl = computed(() => store.getters['i18n/t']);

async function fetchCategoryOptions(instanceType) {
  state.value.categoryOptionsloading = true;
  if (!instanceType) {
    state.value.categoryOptionsloading = false;

    return;
  }
  try {
    const regionId = props.ackConfig.regionId;
    const externalParams = {
      regionId,
      instanceType,
      networkCategory:     'vpc',
      ioOptimized:         'optimized',
      destinationResource: 'SystemDisk'
    };
    const results = await fetchAvailableResources({
      resource:          '',
      plural:            'AvailableResource',
      cloudCredentialId: props.ackConfig.aliyun_credential_secret,
      externalParams,
      store,
    });

    const dataDiskChoices = [];

    if (results && results?.length > 0) {
      results.forEach((item) => {
        const disk = CONFIG_ENV.DISKS.find((disk) => disk.value === item);

        if (disk) {
          dataDiskChoices.push({
            value: item,
            label: disk.label
          });
        }
      });
    }

    // 为了保证可用性如果 api 获得不了可用的实例类型，默认赋值
    if (dataDiskChoices?.length > 0) {
      options.value.categoryOptions = dataDiskChoices;
    } else {
      options.value.categoryOptions = CONFIG_ENV.DISKS;
    }
  } catch (err) {
    options.value.categoryOptions = [];
  }
  state.value.categoryOptionsloading = false;
}

watch(() => props.instanceTypes, async(instanceTypes) => {
  await fetchCategoryOptions(instanceTypes);
  // 切换 instanceType 修改 systemDiskCategory 的值
  if (options.value.categoryOptions?.length > 0 && instanceTypes) {
    emit('update:category', options.value.categoryOptions[0].value);
    emit('update:systemDiskCategory', options.value.categoryOptions[0].value);
  } else {
    emit('update:systemDiskCategory', '');
    emit('update:category', '');
  }
});

</script>
<template>
  <div>
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
      <div
        class="col span-6"
      >
        <LabeledSelect
          :value="instanceTypes"
          required
          data-testid="cruack-instance-types"
          :mode="mode"
          :options="instanceTypeOptions"
          option-label="label"
          option-key="value"
          label-key="ackCn.instanceType.label"
          :rules="rules.instanceTypes"
          :searchable="true"
          :loading="instanceTypeLoading"
          :disabled="disabled"
          :placeholder="intl('ackCn.instanceType.placeholder')"
          @update:value="$emit('update:instanceTypes', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="instancesNum"
          :disabled="disabledInstancesNum || ackConfig.imported"
          label-key="ackCn.numOfNodes.label"
          :mode="mode"
          type="number"
          data-testid="ack-node-instances-num"
          :rules="rules.instancesNum"
          required
          @update:value="emit('update:instancesNum', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div
        class="col span-6"
      >
        <LabeledSelect
          :value="systemDiskCategory"
          required
          data-testid="cruack-system-disk-category"
          :mode="mode"
          :options="options.categoryOptions"
          option-label="label"
          option-key="value"
          label-key="ackCn.rootType.label"
          :rules="rules.category"
          :loading="state.categoryOptionsloading"
          :disabled="disabled"
          :localizedLabel="true"
          :placeholder="intl('ackCn.rootType.placeholder')"
          @update:value="$emit('update:systemDiskCategory', $event)"
        />
      </div>
      <div class="col span-6">
        <UnitInput
          :disabled="disabled"
          :value="systemDiskSize"
          :label="intl('ackCn.rootSize.label')"
          :mode="mode"
          :placeholder="intl('ackCn.rootSize.placeholder')"
          :rules="rules.diskSize"
          :required="true"
          suffix="GB"
          @update:value="$emit('update:systemDiskSize', $event)"
        />
      </div>
    </div>
    <div
      v-if="!disabled || category"
      class="row mb-10"
    >
      <div class="col span-6">
        <LabeledSelect
          :value="category"
          data-testid="cruack-category"
          :mode="mode"
          :options="options.categoryOptions"
          option-label="label"
          option-key="value"
          label-key="ackCn.storageType.label"
          :loading="state.categoryOptionsloading"
          :disabled="disabled"
          :localizedLabel="true"
          :placeholder="intl('ackCn.storageType.placeholder')"
          @update:value="$emit('update:category', $event)"
        />
      </div>
      <div class="col span-6">
        <UnitInput
          :disabled="disabled"
          :value="size"
          :label="intl('ackCn.storageSize.label')"
          :mode="mode"
          :placeholder="intl('ackCn.storageSize.placeholder')"
          :rules="rules.dataDiskSize"
          suffix="GB"
          @update:value="$emit('update:size', $event)"
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
          :rules="rules.keyPair"
          required
          :placeholder="intl('ackCn.keyPair.placeholder')"
          @update:value="$emit('update:keyPair', $event)"
        />
      </div>
    </div>
  </div>
</template>
