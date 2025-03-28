<script setup>
import {
  ref, onMounted, computed, watch, watchEffect
} from 'vue';
import { useStore } from 'vuex';
import { NORMAN } from '@shell/config/types';
import Loading from '@shell/components/Loading.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { useFormValidation } from '../composables/useFormValidation.js';
import LabeledMultiSelect from './LabeledMultiSelect';
import NodePool from './NodePool';
import ImportAck from './ImportAck';
import CruResource from '@shell/components/CruResource.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import ACKValidators from '../util/validators';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import Banner from '@components/Banner/Banner.vue';
import CONFIG_ENV from '../util/config';
import { fetchResources, fetchAvailableResources } from '../util/request';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { stringify } from '@shell/utils/error';
import { syncUpstreamConfig } from '@shell/utils/kontainer';
import {
  filter, find, cloneDeep, pullAt, uniqBy, includes
} from 'lodash';

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
  regionOptions:       [],
  vpcOptions:          [],
  vswitchOptions:      [],
  instanceTypeOptions: [],
  keyPairOptions:      [],
});
// 非 ackconfig 数据的状态比如 loading/error，以及间接变更的 ackCNI
const state = ref({
  loading:                       false,
  regionAndResourceGroupLoading: false,
  vpcLoading:                    false,
  vswitchLoading:                false,
  instanceTypeLoading:           false,
  keyPairLoading:                false,
  isFlannel:                     true,
  versionCustom:                 false,
  importClusterRegion:           false,
  errors:                        [],
  ackCNI:                        'flannel',
  vswitchIds:                    [],
  historyK8sVerison:             '',
});
const emit = defineEmits(['done']);
const cruresource = ref(null);

// 使用 useCreateEditView
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, ackConfig, nodePools, state
});

// 初始化 cluster 以及 ackConfig 相关配置
async function initCustomConfig() {
  state.value.loading = true;
  if (props.value.id) {
    // 好到 mgmt cluster
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    if (!isNewOrUnprovisioned.value) {
      syncUpstreamConfig('ack', normanCluster);
    }
    formatAckConfig(normanCluster);
    // 设置历史的 k8s 版本
    state.value.historyK8sVerison = normanCluster.value?.ackConfig?.kubernetesVersion;
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
  if (!normanCluster?.value?.ackConfig['node_pool_list']) {
    normanCluster.value.ackConfig['node_pool_list'] = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
  }
  ackConfig.value = cloneDeep({ ...normanCluster.value.ackConfig });
  nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  state.value.loading = false;
}

async function initImportConfig() {
  state.value.loading = true;
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

  // 当非代理登录时，设置创建者 id 到 Anno
  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.ackConfig) {
    normanCluster.value['ackConfig'] = { ...CONFIG_ENV.DEFAULTIMPORTACKCONFIG };
  }
  // 编辑的时候会有 node pool list
  if (normanCluster?.value?.ackConfig['node_pool_list'] && normanCluster?.value?.ackConfig['node_pool_list'].length > 0) {
    nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  }

  ackConfig.value = cloneDeep({ ...normanCluster.value.ackConfig });

  state.value.loading = false;
}

function formatAckConfig(normanCluster) {
  const ackConfig = normanCluster.value.ackConfig;

  // 初始化 cni 插件
  console.log(normanCluster.value.ackConfig);
  if (ackConfig?.addons?.length > 0) {
    state.value.ackCNI = ackConfig.addons[0].name;
  }
  // import 集群 cni 插件需要判断 pod cidr 是否存在
  if (ackConfig.imported) {
    state.value.ackCNI = ackConfig.containerCidr ? 'flannel' : 'terway-eniip';
  }
  // 初始化 vswitchIds 它与 podVswithcIds 相同
  if (ackConfig?.vswitchIds?.length > 0) {
    state.value.vswitchIds = ackConfig.vswitchIds;
  }

  if (ackConfig['node_pool_list'] && ackConfig['node_pool_list'].length > 0) {
    const nodePool = ackConfig['node_pool_list'].map((node) => {
      if (node.data_disk && node.data_disk.length > 0) {
        return {
          ...node,
          category: node.data_disk[0].category,
          size:     node.data_disk[0].size
        };
      }

      return node;
    });

    ackConfig['node_pool_list'] = nodePool;
  }
}

function resetConfig() {
  // to do
  ackConfig.value.resourceGroupId = '';
  ackConfig.value.regionId = 'cn-beijing';
  nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
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

// import 集群只需要获取 region 相关的信息，cluster 相关的信息在 importACK 的组件中获取
async function fetchImportALiyunResource() {
  state.value.importClusterRegion = true;
  state.value.error = null; // 重置错误状态
  try {
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
  state.value.importClusterRegion = false;
}

async function fetchVpc(regionId) {
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

async function fetchInstanceType(regionId) {
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const instanceTypeOptions = await fetchResources({
      resource:          'InstanceType',
      plural:            'InstanceTypes',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });
    const allInstanceTypeOptions = instanceTypeOptions.map((instanceType) => {
      return { ...instanceType };
    });
    // 需要获取可用的 instance type
    const externalParamsForAvailable = {
      regionId,
      networkCategory:     'vpc',
      destinationResource: 'InstanceType'
    };
    const availableInstanceTypeKeys = await fetchAvailableResources({
      resource:          '',
      plural:            'AvailableResource',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams:    externalParamsForAvailable,
      store,
    });

    options.value.instanceTypeOptions = filter(allInstanceTypeOptions, (option) => includes(availableInstanceTypeKeys, option.value));
  } catch (err) {
    options.value.instanceTypeOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.instanceTypeLoading = false;
}

async function fetchKeyPairs(regionId) {
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const keyPairOptions = await fetchResources({
      resource:          'KeyPair',
      plural:            'KeyPairs',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    if (keyPairOptions?.length > 0) {
      options.value.keyPairOptions = keyPairOptions.map((keyPair) => {
        return {
          label: keyPair.raw.KeyPairName,
          value: keyPair.raw.KeyPairName
        };
      });
    } else {
      options.value.keyPairOptions = [];
    }
  } catch (err) {
    options.value.keyPairOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.keyPairLoading = false;
}

function addPool() {
  if (changedHistoryK8sVerison.value || ackConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.name === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    name,
    isNew: true,
  };

  nodePools.value.push(ngConfig);
}

function removePool(index) {
  if (changedHistoryK8sVerison.value || ackConfig.value.imported) {
    return;
  }
  if (!nodePools.value ||
    !Number.isInteger(index) ||
    index < 0 || index >= nodePools.value.length ||
    nodePools.value[index]?.name === 'default-nodepool') {
    return;
  }

  pullAt(nodePools.value, index);
}

function poolIsValid(pool) {
  if (
    !pool.runtime_version ||
    !pool.name ||
    !pool.instance_types ||
    isNaN(pool.instances_num) ||
    pool.instances_num < 0 ||
    !pool.platform ||
    !pool.key_pair
  ) {
    return false;
  }

  const names = nodePools.value?.map((pool) => pool.name) || [];

  // 根据 name 去重复比较是否有相同的 name
  return uniqBy(names, (name) => name).length === names.length;
}

function resetNodePool() {
  nodePools.value = nodePools.value?.map((pool) => {
    return {
      ...pool,
      system_disk_category: '',
      category:             '',
      instance_types:       '',
      key_pair:             '',
    };
  }) || [];
}

onMounted(() => {
  // 只有再创建 import 集群时 props.isImport 才为 true，编辑 import 集群也走 initCustomConfig 的逻辑
  if (props.isImport) {
    initImportConfig();
  } else {
    initCustomConfig();
  }
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

function versionCustom() {
  state.value.versionCustom = !state.value.versionCustom;
  if (isNewOrUnprovisioned.value) {
    ackConfig.value.kubernetesVersion = CONFIG_ENV.DEFAULT_KUBERNETES_VERSION;
  }
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

// 验证的所有逻辑
// 由外部传入额外的验证规则
const fvExtraRules = computed(() => {
  let out = {};

  if (hasCredential.value) {
  // 公共的验证规则
    const commonRules = {
      nameRequired:     ACKValidators.nameRequired(normanCluster, intl),
      regionIdRequired: ACKValidators.regionIdRequired(ackConfig, intl),
    };

    // 是否为导入模式（导入属性或已有导入配置）
    const isImportMode = props.isImport || ackConfig.value.imported;

    // 非导入模式下的额外验证规则
    const nonImportRules = !isImportMode ? {
      vpcIdRequired:              ACKValidators.vpcIdRequired(ackConfig, intl),
      vswitchIdsRequired:         ACKValidators.vswitchIdsRequired(state, intl),
      serviceCidrRequired:        ACKValidators.serviceCidrRequired(ackConfig, intl),
      podCidrRequired:            ACKValidators.podCidrRequired(ackConfig, intl, state),
      validatePodCidr:            ACKValidators.validatePodCidr(ackConfig, intl, state),
      validateServiceCidr:        ACKValidators.validateServiceCidr(ackConfig, intl),
      nodePoolNameRequired:       ACKValidators.nodePoolNameRequired(nodePools, intl),
      nodePoolNamesUnique:        ACKValidators.nodePoolNamesUnique(nodePools, intl),
      runtimeVersionRequired:     ACKValidators.runtimeVersionRequired(nodePools, intl),
      instanceTypesRequired:      ACKValidators.instanceTypesRequired(nodePools, intl),
      instancesNumRequired:       ACKValidators.instancesNumRequired(nodePools, intl),
      systemDiskCategoryRequired: ACKValidators.systemDiskCategoryRequired(nodePools, intl),
      diskSizeRequired:           ACKValidators.diskSizeRequired(nodePools, intl),
      dataDiskSizeRequired:       ACKValidators.dataDiskSizeRequired(nodePools, intl),
      platformRequired:           ACKValidators.platformRequired(nodePools, intl),
      keyPairRequired:            ACKValidators.keyPairRequired(nodePools, intl),
    } : {};

    // 导入模式下的额外验证规则
    const importRules = isImportMode ? { clusterIdRequired: ACKValidators.clusterIdRequired(ackConfig, intl) } : {};

    out = {
      ...commonRules,
      ...nonImportRules,
      ...importRules,
    };
  }

  return out;
});

const clusterActive = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return normanCluster.value.state === 'active';
  }

  return true;
});

// 判断是否要升级 k8s 版本，如果要升级 k8s 版本禁用修改 nodepool
const changedHistoryK8sVerison = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return state.value.historyK8sVerison && state.value.historyK8sVerison !== ackConfig.value.kubernetesVersion;
  }

  return false;
});

// 使用 useFormValidation
const {
  fvFormRuleSets,
  fvUnreportedValidationErrors,
  fvFormIsValid,
  fvGetAndReportPathRules,
} = useFormValidation({ value: props.value }, store, fvExtraRules);

fvFormRuleSets.value = [
  {
    path:  'name',
    rules: ['nameRequired'],
  },
  {
    path:  'regionId',
    rules: ['regionIdRequired'],
  },
  {
    path:  'clusterId',
    rules: ['clusterIdRequired'],
  },
  {
    path:  'vpcId',
    rules: ['vpcIdRequired'],
  },
  {
    path:  'vswitchIds',
    rules: ['vswitchIdsRequired'],
  },
  {
    path:  'containerCidr',
    rules: ['podCidrRequired', 'validatePodCidr'],
  },
  {
    path:  'serviceCidr',
    rules: ['serviceCidrRequired', 'validateServiceCidr'],
  },
  {
    path:  'nodePoolName',
    rules: ['nodePoolNameRequired', 'nodePoolNamesUnique']
  },
  {
    path:  'runtimeVersion',
    rules: ['runtimeVersionRequired']
  },
  {
    path:  'instanceTypes',
    rules: ['instanceTypesRequired']
  },
  {
    path:  'instancesNum',
    rules: ['instancesNumRequired']
  },
  {
    path:  'systemDiskCategory',
    rules: ['systemDiskCategoryRequired']
  },
  {
    path:  'diskSize',
    rules: ['diskSizeRequired']
  },
  {
    path:  'dataDiskSize',
    rules: ['dataDiskSizeRequired']
  },
  {
    path:  'platform',
    rules: ['platformRequired']
  },
  {
    path:  'keyPair',
    rules: ['keyPairRequired']
  },
];

// watch
watch(() => ackConfig.value.aliyun_credential_secret, async(credential) => {
  if (credential) {
    if (isNewOrUnprovisioned.value) {
      resetConfig();
    }
    if (!props.isImport) {
      await fetchALiyunResource();
    } else {
      await fetchImportALiyunResource();
    }
  }
});

watch(() => ackConfig.value.kubernetesVersion, async(kubernetesVersion) => {
  // 编辑时改变了 k8s 版本需要重置 nodePools ，升级集群不可以编辑 nodepool
  if (changedHistoryK8sVerison.value) {
    // nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  }
});

watch(() => state.value.vswitchIds, async(vswitchIds) => {
  // 如果是 terway 就需要设置 podVswitchIds
  if (!state.value.isFlannel) {
    ackConfig.value.podVswitchIds = vswitchIds;
  }
});

watchEffect(async() => {
  // 同时监听了 resourcegroupId
  const aliyunCredentialSecret = ackConfig.value.aliyun_credential_secret;
  const regionId = ackConfig.value.regionId;

  if (regionId && aliyunCredentialSecret && !props.isImport) {
    // 切换 regionId 需要重新选择 vpcId
    // 刚进入 edit 的时候不要重置，并且 edit 不可以编辑 regionId 和 aliyunCredentialSecret
    if (isNewOrUnprovisioned.value) {
      ackConfig.value.vpcId = '';
      resetNodePool();
    }
    state.value.vpcLoading = true;
    state.value.instanceTypeLoading = true;
    state.value.keyPairLoading = true;
    await fetchVpc(ackConfig.value.regionId);
    await fetchInstanceType(ackConfig.value.regionId);
    await fetchKeyPairs(ackConfig.value.regionId);
  }
});

watch(() => ackConfig.value.vpcId, async(vpcId) => {
  // 每次切换 vpc 都需要重新填入 vswitchIds
  // 编辑状态是不可以修改的，所以就没有设置编辑状态下的初始值
  if (isNewOrUnprovisioned.value) {
    state.value.vswitchIds = [];
  }
  if (vpcId) {
    await fetchVSwitch(vpcId);
  }
});

watch(() => state.value.ackCNI, (newAckCNI) => {
  // 编辑状态是不可以修改的，所以就没有设置编辑状态下的初始值
  state.value.isFlannel = newAckCNI === 'flannel';
  if (isNewOrUnprovisioned.value) {
    // flannel 不需要传入 podVswitchIds
    if (state.value.isFlannel) {
      // 因为 terway 删除了 containerCidr 切换回来之后恢复默认值
      ackConfig.value.containerCidr = '172.20.0.0/16';
      delete ackConfig.value.podVswitchIds;
    } else {
      // terway 不需要 containerCidr
      delete ackConfig.value.containerCidr;
    }
    // 每次切换 cni 都需要重新填入 vswitchIds
    state.value.vswitchIds = [];
    if (newAckCNI && ackConfig.value?.addons?.length > 0) {
      ackConfig.value.addons = [{ name: newAckCNI, config: '' }];
    }
  }
}, { immediate: true });

watch(() => normanCluster.value.name, (name) => {
  if (isNewOrUnprovisioned.value) {
    if (ackConfig.value.imported) {
      ackConfig.value.cluster_name = name;
    } else {
      ackConfig.value.displayName = name;
      ackConfig.value.name = name;
    }
  }
});

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
      <div
        v-if="isImport"
      >
        <ImportAck
          v-model:name="normanCluster.name"
          v-model:description="normanCluster.description"
          v-model:clusterId="ackConfig.cluster_id"
          v-model:regionId="ackConfig.regionId"
          :regionOptions="options.regionOptions"
          :ackConfig="ackConfig"
          :rules="{
            name: fvGetAndReportPathRules('name'),
            regionId: fvGetAndReportPathRules('regionId'),
            clusterId: fvGetAndReportPathRules('clusterId'),
          }"
        />
      </div>
      <div
        v-else
      >
        <Banner
          v-if="!clusterActive"
          color="warning"
          :label="t('ackCn.updateWarn')"
        />
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
              required
              :mode="mode"
              :options="options.regionOptions"
              option-label="label"
              option-key="value"
              :loading="state.regionAndResourceGroupLoading"
              label-key="ackCn.region.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="fvGetAndReportPathRules('regionId')"
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
            <div
              :style="{'display': 'flex', 'align-items':'center'}"
            >
              <LabeledInput
                v-if="state.versionCustom"
                v-model:value="ackConfig.kubernetesVersion"
                data-testid="cruack-kubernetesVersion"
                :mode="mode"
                label-key="ackCn.version.label"
                :placeholder="intl('ackCn.version.label')"
                :disabled="ackConfig.imported"
              />
              <LabeledSelect
                v-else
                v-model:value="ackConfig.kubernetesVersion"
                data-testid="cruack-kubernetesVersion"
                :mode="mode"
                :options="CONFIG_ENV.KUBERNETESVERSIONS"
                option-label="label"
                option-key="value"
                label-key="ackCn.version.label"
                :disabled="ackConfig.imported"
              />
              <button
                :style="{'line-height': '60px', 'margin-left':'10px'}"
                type="button"
                class="btn role-secondary"
                data-testid="cruack-custom-button"
                @click="versionCustom"
              >
                {{ intl('ackCn.version.toggle') }}
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="!kubernetesSupport.rancherEnabled || !kubernetesSupport.aliyunEnabled || changedHistoryK8sVerison"
        >
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
          <Banner
            v-if="changedHistoryK8sVerison"
            color="warning"
            :label="t('ackCn.changedHistoryK8sVerison')"
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
              label-key="ackCn.cni.label"
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
              :rules="fvGetAndReportPathRules('vpcId')"
            />
          </div>
          <div class="col span-6">
            <LabeledMultiSelect
              v-model:value="state.vswitchIds"
              required
              data-testid="cruack-vpc"
              :mode="mode"
              :options="options.vswitchOptions"
              option-label="label"
              option-key="value"
              label-key="ackCn.vswitchId.label"
              :loading="state.vswitchLoading"
              :disabled="!isNewOrUnprovisioned"
              :placeholder="intl('ackCn.vswitchId.prompt')"
              :rules="fvGetAndReportPathRules('vswitchIds')"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="ackConfig.proxyMode"
              data-testid="cruack-proxy-mode"
              :mode="mode"
              :options="CONFIG_ENV.MODES"
              option-label="label"
              option-key="value"
              label-key="ackCn.proxyMode.label"
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="ackConfig.nodeCidrMask"
              data-testid="cruack-node-cidr-mask"
              :mode="mode"
              :options="CONFIG_ENV.NODECIDRMASKS"
              option-label="label"
              option-key="value"
              label-key="ackCn.nodeCidrMask.label"
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div
            v-if="state.isFlannel"
            class="col span-6"
          >
            <LabeledInput
              v-model:value="ackConfig.containerCidr"
              :mode="mode"
              tooltipKey="ackCn.containerCidr.placeholder"
              label-key="ackCn.containerCidr.label"
              :disabled="!isNewOrUnprovisioned"
              required
              :rules="fvGetAndReportPathRules('containerCidr')"
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              v-model:value="ackConfig.serviceCidr"
              :mode="mode"
              tooltipKey="ackCn.serviceCidr.placeholder"
              label-key="ackCn.serviceCidr.label"
              :disabled="!isNewOrUnprovisioned"
              required
              :rules="fvGetAndReportPathRules('serviceCidr')"
            />
          </div>
        </div>
        <div class="row mt-10 mb-20">
          <div class="col span-6">
            <Checkbox
              v-model:value="ackConfig.snatEntry"
              :mode="mode"
              label-key="ackCn.snatEntry.label"
              :disabled="!isNewOrUnprovisioned"
              required
            />
          </div>
          <div class="col span-6">
            <Checkbox
              v-model:value="ackConfig.endpointPublicAccess"
              :mode="mode"
              :disabled="!isNewOrUnprovisioned"
              label-key="ackCn.endpointPublicAccess.label"
              required
            />
          </div>
        </div>
        <Tabbed
          ref="pools"
          :side-tabs="true"
          :show-tabs-add-remove="mode !== 'view'"
          class="mb-20"
          @addTab="addPool()"
          @removeTab="removePool($event)"
        >
          <Tab
            v-for="(pool, i) in nodePools"
            :key="i"
            :weight="-i"
            :name="`${pool.name} ${i}`"
            :label="pool.name"
            :error="!poolIsValid(pool)"
          >
            <NodePool
              v-model:name="pool.name"
              v-model:runtimeVersion="pool.runtime_version"
              v-model:instanceTypes="pool.instance_types"
              v-model:instancesNum="pool.instances_num"
              v-model:systemDiskCategory="pool.system_disk_category"
              v-model:systemDiskSize="pool.system_disk_size"
              v-model:category="pool.category"
              v-model:size="pool.size"
              v-model:platform="pool.platform"
              v-model:keyPair="pool.key_pair"
              :ackConfig="ackConfig"
              :disabled="(!isNewOrUnprovisioned && !pool.isNew) || changedHistoryK8sVerison"
              :disabledInstancesNum="changedHistoryK8sVerison"
              :instanceTypeOptions="options.instanceTypeOptions"
              :keyPairOptions="options.keyPairOptions"
              :instanceTypeLoading="state.instanceTypeLoading"
              :keyPairLoading="state.keyPairLoading"
              :rules="{
                name: fvGetAndReportPathRules('nodePoolName'),
                runtimeVersion: fvGetAndReportPathRules('runtimeVersion'),
                instanceTypes: fvGetAndReportPathRules('instanceTypes'),
                instancesNum: fvGetAndReportPathRules('instancesNum'),
                systemDiskCategory: fvGetAndReportPathRules('systemDiskCategory'),
                diskSize: fvGetAndReportPathRules('diskSize'),
                dataDiskSize: fvGetAndReportPathRules('dataDiskSize'),
                platform: fvGetAndReportPathRules('platform'),
                keyPair: fvGetAndReportPathRules('keyPair'),
              }"
              :mode="mode"
            />
          </Tab>
        </Tabbed>
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
