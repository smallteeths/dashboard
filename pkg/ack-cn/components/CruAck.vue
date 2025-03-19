<script setup>
import {
  ref, onMounted, computed, watch, watchEffect
} from 'vue';
import { useStore } from 'vuex';
import { NORMAN } from '@shell/config/types';
import Loading from '@shell/components/Loading.vue';
import { useCreateEditView } from '../mixins/useCreateEditView.js';
import { useFormValidation } from '../mixins/useFormValidation.js';
import LabeledMultiSelect from './LabeledMultiSelect';
import CruResource from '@shell/components/CruResource.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import Banner from '@components/Banner/Banner.vue';
import CONFIG_ENV from '../util/config';
import { fetchResources } from '../util/request';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { stringify } from '@shell/utils/error';
import { filter, find } from 'lodash';

const props = defineProps({
  mode: {
    type:     String,
    required: true
  },
  isImport: Boolean,
  value:    {
    type:    Object,
    default: () => {
      return {};
    }
  }
});
// data
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const ackConfig = ref({});
const normanCluster = ref({});
const nodePools = ref([]);
const options = ref({
  resourceGroupOptions: [
    {
      label: intl.value('ackCn.resourceGroup.all'),
      value: ''
    }
  ],
  regionOptions:  [],
  vpcOptions:     [],
  vswitchOptions: [],
});
// 非 ackconfig 数据的状态比如 loading/error，以及间接变更的 ackCNI
const state = ref({
  loading:                       false,
  regionAndResourceGroupLoading: false,
  vpcLoading:                    false,
  vswitchLoading:                false,
  errors:                        [],
  ackCNI:                        'flannel',
  vswitchId:                     [],
});
const emit = defineEmits(['done']);
const cruresource = ref(null);

// 使用 useCreateEditView
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, ackConfig
});

// 使用 useFormValidation
const {
  fvUnreportedValidationErrors,
  fvFormIsValid,
  fvGetAndReportPathRules,
} = useFormValidation({ value: props.value }, store);

// 初始化 cluster 以及 ackConfig 相关配置
async function initConfig() {
  state.value.loading = true;
  if (props.value.id) {
    // to do edit
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

    // 当非代理登录时，设置创建者 id 到 Anno
    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }
  }

  // 设置默认的 ackConfig
  if (!normanCluster?.value?.ackConfig) {
    normanCluster.value['ackConfig'] = { ...CONFIG_ENV.DEFAULTACKCONFIG };
  }
  if (!normanCluster?.value?.ackConfig?.nodePools) {
    normanCluster.value.ackConfig['node_pool_list'] = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
  }
  ackConfig.value = { ...normanCluster.value.ackConfig };
  nodePools.value = normanCluster.value.ackConfig.nodePools;
  state.value.loading = false;
}

function resetConfig() {
  // to do
  ackConfig.value.resourceGroupId = '';
  ackConfig.value.regionId = 'cn-beijing';
}

async function fetchALiyunResource() {
  state.value.regionAndResourceGroupLoading = true;
  state.value.error = null; // 重置错误状态

  try {
    // 获取 ResourceGroups
    const resourceGroups = await fetchResources({
      resource:          'ResourceGroup',
      plural:            'ResourceGroups',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
      pageSize:          10, // 后端默认 10
    });

    options.value.resourceGroupOptions = [
      {
        label: intl.value('ackCn.resourceGroup.all'),
        value: ''
      },
      ...filter(resourceGroups, (group) => group?.raw?.Status === 'OK').map((group) => ({
        label: group.raw.DisplayName,
        value: group.raw.Id,
      })),
    ];

    // 获取 Regions
    const regionOptions = await fetchResources({
      resource:          'Region',
      plural:            'Regions',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
    });

    options.value.regionOptions = regionOptions;
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionAndResourceGroupLoading = false;
}

async function fetchVpc(regionId) {
  state.value.vpcLoading = true;
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const vpcOptions = await fetchResources({
      resource:          'Vpc',
      plural:            'Vpcs',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.vpcOptions = vpcOptions.map((vpc) => {
      let label = `${ vpc.raw.VpcName } (${ vpc.value })`;

      if (vpc.raw.IsDefault) {
        label = `${ intl.value('ackCn.vpcId.default') } (${ vpc.value })`;
      }

      return {
        ...vpc,
        label
      };
    });
  } catch (err) {
    options.value.vpcOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.vpcLoading = false;
}

async function fetchVSwitch(vpcId) {
  state.value.vswitchLoading = true;
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const regionId = ackConfig.value.regionId;
    const externalParams = {
      regionId,
      vpcId
    };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const vswitchOptions = await fetchResources({
      resource:          'VSwitch',
      plural:            'VSwitches',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.vswitchOptions = vswitchOptions.map((vswitch) => {
      let label = `${ vswitch.raw.VSwitchName } (${ vswitch.value })`;

      if (vswitch.raw.IsDefault) {
        label = `${ intl.value('ackCn.vswitchId.default') } (${ vswitch.value })`;
      }

      return {
        ...vswitch,
        label
      };
    });
  } catch (err) {
    options.value.vswitchOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.vswitchLoading = false;
}

onMounted(() => {
  initConfig();
});

// method
function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
  ackConfig.value['clusterName'] = name;
}

// computed
const hasCredential = computed(() => {
  return !!ackConfig.value?.aliyun_credential_secret;
});

const CREATE = computed(() => {
  return _CREATE;
});

const VIEW = computed(() => {
  return _VIEW;
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.ackStatus?.upstreamSpec;
});

// 版本 warning 警告
const kubernetesSupport = computed(() => {
  const version = ackConfig.value.kubernetesVersion;
  const matched = find(CONFIG_ENV.KUBERNETESVERSIONS, { value: version }) || {};

  return {
    rancherEnabled: matched.rancherEnabled,
    aliyunEnabled:  matched.aliyunEnabled,
  };
});

// watch
watch(() => ackConfig.value.aliyun_credential_secret, async(credential) => {
  if (credential) {
    resetConfig();
    await fetchALiyunResource();
  }
});

watchEffect(async() => {
  if (ackConfig.value.regionId && ackConfig.value.aliyun_credential_secret) {
    // 切换 regionId 需要重新选择 vpcId
    ackConfig.value.vpcId = '';
    await fetchVpc(ackConfig.value.regionId);
  }
});

watch(() => ackConfig.value.vpcId, async(vpcId) => {
  if (vpcId) {
    await fetchVSwitch(vpcId);
  }
});

watch(() => ackConfig.value.resourceGroupId, async(resourceGroupId) => {
  // to do
  console.log(resourceGroupId);
});

watch(() => state.value.ackCNI, (newAckCNI) => {
  if (newAckCNI && ackConfig.value?.addons?.length > 0) {
    ackConfig.value.addons = [{ name: newAckCNI, config: '' }];
  }
}, { immediate: true });

</script>

<template>
  <Loading v-if="state.loading" />
  <CruResource
    v-else
    ref="cruresource"
    :resource="value"
    :mode="mode"
    :can-yaml="false"
    :done-route="doneRoute"
    :errors="fvUnreportedValidationErrors"
    :validation-passed="fvFormIsValid"
    @error="e=>errors=e"
    @finish="save"
  >
    <SelectCredential
      v-model:value="ackConfig.aliyun_credential_secret"
      data-testid="cruaks-select-credential"
      :mode="mode === VIEW ? VIEW : CREATE"
      provider="aliyun"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="cruaks-form"
    >
      <Banner
        v-for="(err, i) in state.errors"
        :key="i"
        color="error"
        :label="stringify(err)"
      />
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            :value="normanCluster.name"
            :mode="mode"
            label-key="generic.name"
            required
            :rules="fvGetAndReportPathRules('name')"
            @update:value="setClusterName"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model:value="normanCluster.description"
            :mode="mode"
            label-key="nameNsDescription.description.label"
            :placeholder="intl('nameNsDescription.description.placeholder')"
          />
        </div>
      </div>
      <div class="row mb-10">
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.resourceGroupId"
            data-testid="cruack-resourceGroup"
            :mode="mode"
            :options="options.resourceGroupOptions"
            option-label="label"
            option-key="value"
            :loading="state.regionAndResourceGroupLoading"
            label-key="ackCn.resourceGroup.label"
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.regionId"
            data-testid="cruack-resourceGroup"
            :mode="mode"
            :options="options.regionOptions"
            option-label="label"
            option-key="value"
            :loading="state.regionAndResourceGroupLoading"
            label-key="ackCn.region.label"
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
      </div>
      <div class="row mb-10">
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.clusterType"
            data-testid="cruack-clusterType"
            :mode="mode"
            :options="CONFIG_ENV.CLUSTER_TYPES"
            option-label="label"
            option-key="value"
            label-key="ackCn.clusters.label"
            :localizedLabel="true"
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.kubernetesVersion"
            data-testid="cruack-kubernetesVersion"
            :mode="mode"
            :options="CONFIG_ENV.KUBERNETESVERSIONS"
            option-label="label"
            option-key="value"
            label-key="ackCn.version.label"
          />
        </div>
      </div>
      <div class="row mb-10">
        <Banner
          v-if="!kubernetesSupport.rancherEnabled"
          color="warning"
          :label="t('ackCn.version.warningRacher', { version: ackConfig.kubernetesVersion })"
        />
        <Banner
          v-if="!kubernetesSupport.aliyunEnabled"
          color="warning"
          :label="t('ackCn.version.warningAliyun', { version: ackConfig.kubernetesVersion })"
        />
      </div>
      <div class="row mb-10">
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.clusterSpec"
            data-testid="cruack-clusterSpec"
            :mode="mode"
            :options="CONFIG_ENV.ACK_CLUSTER_SPEC_OPTIONS"
            option-label="label"
            option-key="value"
            label-key="ackCn.clusterSpec.label"
            :localizedLabel="true"
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="state.ackCNI"
            data-testid="cruack-ackcni"
            :mode="mode"
            :options="CONFIG_ENV.ACK_CNI_OPTIONS"
            option-label="label"
            option-key="value"
            label-key="ackCn.version.label"
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
      </div>
      <div class="row mb-10">
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="ackConfig.vpcId"
            required
            data-testid="cruack-vpc"
            :mode="mode"
            :options="options.vpcOptions"
            option-label="label"
            option-key="value"
            label-key="ackCn.vpcId.label"
            :loading="state.vpcLoading"
            :disabled="!isNewOrUnprovisioned"
            :placeholder="intl('ackCn.vpcId.prompt')"
          />
        </div>
        <div class="col span-6">
          <LabeledMultiSelect
            v-model:value="state.vswitchId"
            required
            data-testid="cruack-vpc"
            :mode="mode"
            :options="options.vswitchOptions"
            option-label="label"
            option-key="value"
            label-key="ackCn.vpcId.label"
            :loading="state.vswitchLoading"
            :disabled="!isNewOrUnprovisioned"
            :placeholder="intl('ackCn.vswitchId.prompt')"
          />
        </div>
      </div>
    </div>
    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>
