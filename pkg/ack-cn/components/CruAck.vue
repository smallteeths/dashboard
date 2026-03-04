<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
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
import LabeledInputSelect from './LabeledInputSelect';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import ACKValidators from '../util/validators';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import Labels from '@shell/components/form/Labels.vue';
import Banner from '@components/Banner/Banner.vue';
import CONFIG_ENV from '../util/config';
import { fetchResources, fetchAvailableResources } from '../util/request';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { _CREATE, _VIEW, _IMPORT } from '@shell/config/query-params';
import { stringify } from '@shell/utils/error';
import { syncUpstreamConfig } from '@shell/utils/kontainer';
import Accordion from '@components/Accordion/Accordion.vue';
import ClusterPlanSelector from './ClusterPlanSelector.vue';
import {
  filter, find, cloneDeep, pullAt, uniqBy, includes, sortBy
} from 'lodash';
import { RadioGroup } from '@components/Form/Radio';

const props = defineProps({
  mode: {
    type:     String,
    required: true
  },
  value: {
    type:    Object,
    default: () => {
      return {};
    }
  }
});

const store = useStore();
const route = useRoute();
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
  regionOptions:          [],
  vpcOptions:             [],
  vswitchOptions:         [],
  keyPairOptions:         [],
  zoneOptions:            [],
  allInstanceTypeOptions: {},
});
const RUNTIME_VERSION_LE_132 = '1.6.39';
const RUNTIME_VERSION_LT_132 = '2.1.5';

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
  ackCNI:                        'terway-eniip',
  vswitchIds:                    [],
  historyK8sVersion:             '',
  autoCreateVpc:                 'auto',
  zones:                         new Set(),
});
const emit = defineEmits(['done']);
const cruresource = ref(null);

const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, ackConfig, nodePools, state
});

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    if (!isNewOrUnprovisioned.value) {
      syncUpstreamConfig('ack', normanCluster);
    }

    formatAckConfig(normanCluster);
    state.value.historyK8sVersion = normanCluster.value?.ackConfig?.kubernetesVersion;
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }
  }

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
  state.value.errors = [];
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.ackConfig) {
    normanCluster.value['ackConfig'] = { ...CONFIG_ENV.DEFAULTIMPORTACKCONFIG };
  }
  if (normanCluster?.value?.ackConfig['node_pool_list'] && normanCluster?.value?.ackConfig['node_pool_list'].length > 0) {
    nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
  }

  ackConfig.value = cloneDeep({ ...normanCluster.value.ackConfig });

  state.value.loading = false;
}

function formatAckConfig(normanCluster) {
  const ackConfig = normanCluster.value.ackConfig;

  if (ackConfig?.addons?.length > 0) {
    state.value.ackCNI = ackConfig.addons[0].name;
  }

  if (ackConfig.imported) {
    state.value.ackCNI = ackConfig.containerCidr ? 'flannel' : 'terway-eniip';
  }
  // The vswitchIds field in ackconfig is a legacy field for proprietary clusters.
  // In the new version, it needs to echo the v_switch_ids field from nodepool
  if (ackConfig?.node_pool_list && ackConfig?.node_pool_list[0] && ackConfig?.node_pool_list[0].v_switch_ids?.length > 0) {
    state.value.vswitchIds = ackConfig?.node_pool_list[0].v_switch_ids;
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
  ackConfig.value.resourceGroupId = '';
  ackConfig.value.regionId = 'cn-beijing';
  nodePools.value = cloneDeep(normanCluster.value.ackConfig['node_pool_list']);
}

async function fetchALiyunResource() {
  state.value.regionAndResourceGroupLoading = true;
  state.value.errors = [];

  try {
    const resourceGroups = await fetchResources({
      resource:          'ResourceGroup',
      plural:            'ResourceGroups',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
      pageSize:          10,
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

    const regions = await fetchResources({
      resource:          'Region',
      plural:            'Regions',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
    });
    const regionOptions = regions.map((region) => ({
      ...region,
      label: region.raw?.LocalName ?? region.label,
    }));

    options.value.regionOptions = regionOptions;
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionAndResourceGroupLoading = false;
}

async function fetchImportALiyunResource() {
  state.value.importClusterRegion = true;
  state.value.errors = [];
  try {
    const regions = await fetchResources({
      resource:          'Region',
      plural:            'Regions',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      store,
    });
    const regionOptions = regions.map((region) => ({
      ...region,
      label: region.raw?.LocalName ?? region.label,
    }));

    options.value.regionOptions = regionOptions;
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.importClusterRegion = false;
}

async function fetchZones(regionId) {
  try {
    const resourceGroupId = ackConfig.value.resourceGroupId;
    const externalParams = { regionId };

    if (!!resourceGroupId && resourceGroupId !== '') {
      externalParams.resourceGroupId = resourceGroupId;
    }
    const zoneOptions = await fetchResources({
      resource:          'Zone',
      plural:            'Zones',
      cloudCredentialId: ackConfig.value.aliyun_credential_secret,
      externalParams,
      store,
    });

    options.value.zoneOptions = zoneOptions.map((zone) => {
      return {
        ...zone,
        label: zone.raw?.LocalName ?? zone.label,
        value: zone.raw?.ZoneId ?? zone.value,
      };
    });

    if (isNewOrUnprovisioned.value) {
      ackConfig.value.zoneIds = (options.value.zoneOptions || [])
        .slice(0, 5)
        .map((zone) => zone.value);

      updateZones(ackConfig.value.zoneIds);
    }
  } catch (err) {
    options.value.zoneOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
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
    state.value.instanceTypeLoading = true;
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
    const allInstanceTypes = {};

    (instanceTypeOptions || []).forEach((it) => {
      const raw = it?.raw || {};
      const id = raw.InstanceTypeId;

      if (!id) {
        return;
      }
      allInstanceTypes[id] = {
        instanceTypeFamily: raw.InstanceTypeFamily,
        cpu:                raw.CpuCoreCount,
        memory:             raw.MemorySize,
      };
    });

    options.value.allInstanceTypeOptions = allInstanceTypes;
  } catch (err) {
    options.value.allInstanceTypeOptions = {};
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
  if (changedHistoryK8sVersion.value || ackConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.name === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const v = ackConfig.value?.kubernetesVersion;
  const m = String(v ?? '').match(/^(\d+)\.(\d+)\./);
  const minor = m ? Number(m[2]) : NaN;
  let runtimeVersion = RUNTIME_VERSION_LT_132;

  if (!Number.isNaN(minor) && minor <= 32) {
    runtimeVersion = RUNTIME_VERSION_LE_132;
  }
  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    runtime_version: runtimeVersion,
    name,
    isNew:           true,
  };

  nodePools.value.push(ngConfig);
}

function removePool(index) {
  if (changedHistoryK8sVersion.value || ackConfig.value.imported) {
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

  return uniqBy(names, (name) => name).length === names.length;
}

function resetNodePool() {
  nodePools.value = nodePools.value?.map((pool) => {
    return {
      ...pool,
      key_pair: '',
    };
  }) || [];
}

onMounted(() => {
  if (isImport.value) {
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

function changeContainerdVersion(version) {
  if (props.mode !== _CREATE) {
    return;
  }

  // '1.32.7-aliyun.1' -> minor = 32
  const m = String(version).match(/^(\d+)\.(\d+)\./);
  const minor = m ? Number(m[2]) : NaN;

  if (!Number.isNaN(minor) && minor <= 32) {
    nodePools.value = nodePools.value.map((np) => ({
      ...np,
      runtime_version: RUNTIME_VERSION_LE_132,
    }));
  } else {
    nodePools.value = nodePools.value.map((np) => ({
      ...np,
      runtime_version: RUNTIME_VERSION_LT_132,
    }));
  }
}

function updateAutoCreateVpc(value) {
  state.value.autoCreateVpc = value;
  if (value === 'auto') {
    updateZones(ackConfig.value.zoneIds);
  } else {
    updateVswitchIds(state.value.vswitchIds);
  }
}

function updateZones(value = []) {
  if (!isAutoCreateVpc.value) {
    return;
  }

  state.value.zones = new Set(value);
}

function updateVswitchIds(value) {
  if (isAutoCreateVpc.value) {
    return;
  }
  const zones = [];

  if (value && value.length > 0) {
    value.forEach((vswitchId) => {
      const vswitch = find(options.value.vswitchOptions, (o) => {
        return o.value === vswitchId;
      });

      if (vswitch && vswitch.raw && vswitch.raw.ZoneId) {
        zones.push(vswitch.raw.ZoneId);
      }
    });
  }
  state.value.zones = new Set(zones);
}

const isImport = ref(route.query.mode === _IMPORT);
const hasCredential = computed(() => {
  return !!ackConfig.value?.aliyun_credential_secret;
});

const CREATE = computed(() => {
  return _CREATE;
});

const VIEW = computed(() => {
  return _VIEW;
});

const isAutoCreateVpc = computed(() => {
  return state.value.autoCreateVpc === 'auto';
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.ackStatus?.upstreamSpec;
});

const kubernetesSupport = computed(() => {
  const version = ackConfig.value.kubernetesVersion;
  const matched = find(CONFIG_ENV.KUBERNETESVERSIONS, { value: version }) || {};

  return {
    rancherEnabled: matched.rancherEnabled,
    aliyunEnabled:  matched.aliyunEnabled,
  };
});

const fvExtraRules = computed(() => {
  let out = {};

  if (hasCredential.value) {
    const commonRules = {
      nameRequired:     ACKValidators.nameRequired(normanCluster, intl),
      regionIdRequired: ACKValidators.regionIdRequired(ackConfig, intl),
    };

    const isImportMode = isImport.value || ackConfig.value.imported;

    const nonImportRules = !isImportMode ? {
      // vpcIdRequired:              ACKValidators.vpcIdRequired(ackConfig, intl),
      // vswitchIdsRequired:         ACKValidators.vswitchIdsRequired(state, intl),
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
      // keyPairRequired:            ACKValidators.keyPairRequired(nodePools, intl),
    } : {};

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

const changedHistoryK8sVersion = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return state.value.historyK8sVersion && state.value.historyK8sVersion !== ackConfig.value.kubernetesVersion;
  }

  return false;
});

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
  // {
  //   path:  'vpcId',
  //   rules: ['vpcIdRequired'],
  // },
  // {
  //   path:  'vswitchIds',
  //   rules: ['vswitchIdsRequired'],
  // },
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
  // {
  //   path:  'keyPair',
  //   rules: ['keyPairRequired']
  // },
];

// watch
watch(() => ackConfig.value.aliyun_credential_secret, async(credential) => {
  if (credential) {
    if (isNewOrUnprovisioned.value) {
      resetConfig();
    }
    if (!isImport.value) {
      await fetchALiyunResource();
    } else {
      await fetchImportALiyunResource();
    }
  }
});

watch(() => state.value.vswitchIds, async(vswitchIds) => {
  if (!state.value.isFlannel) {
    ackConfig.value.podVswitchIds = vswitchIds;
  }
});

watch(() => [ackConfig.value.regionId, ackConfig.value.aliyun_credential_secret],
  async([regionId, aliyunCredentialSecret], [prevRegionId, prevSecret]) => {
    if (regionId === prevRegionId && aliyunCredentialSecret === prevSecret) {
      return;
    }
    state.value.errors = [];
    if (regionId && aliyunCredentialSecret && !isImport.value) {
      if (isNewOrUnprovisioned.value) {
        ackConfig.value.vpcId = '';
        resetNodePool();
      }
      state.value.vpcLoading = true;
      state.value.keyPairLoading = true;
      await fetchZones(regionId);
      await fetchVpc(regionId);
      await fetchInstanceType(regionId);
      await fetchKeyPairs(regionId);
    }
  }
);

watch(() => ackConfig.value.vpcId, async(vpcId) => {
  if (isNewOrUnprovisioned.value) {
    state.value.vswitchIds = [];
  }
  if (vpcId) {
    await fetchVSwitch(vpcId);
  }
});

watch(() => state.value.ackCNI, (newAckCNI) => {
  state.value.isFlannel = newAckCNI === 'flannel';
  if (isNewOrUnprovisioned.value) {
    if (state.value.isFlannel) {
      ackConfig.value.containerCidr = '172.20.0.0/16';
      delete ackConfig.value.podVswitchIds;
    } else {
      delete ackConfig.value.containerCidr;
    }
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
          @errors="e =>state.errors=e"
        />
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
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
        <div
          class="m-0 mb-10 card-container"
        >
          <div>
            <H3 class="title">
              集群基础信息
            </h3>
          </div>
          <div class="row mb-10">
            <div
              class="col span-4"
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
              class="col span-4"
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
            <div
              class="col span-4"
            >
              <LabeledInputSelect
                v-model:value="ackConfig.kubernetesVersion"
                :mode="mode"
                :options="CONFIG_ENV.KUBERNETESVERSIONS"
                label-key="ackCn.version.label"
                :disabled="ackConfig.imported"
                @update:value="changeContainerdVersion($event)"
              />
            </div>
          </div>
          <ClusterPlanSelector
            v-model="ackConfig.clusterSpec"
            :disabled="!isNewOrUnprovisioned"
            :options="CONFIG_ENV.ACK_CLUSTER_SPEC_OPTIONS"
            :intl="intl"
          />
        </div>
        <div
          v-if="!kubernetesSupport.rancherEnabled || !kubernetesSupport.aliyunEnabled || changedHistoryK8sVersion"
        >
          <Banner
            v-if="!kubernetesSupport.rancherEnabled"
            color="warning"
            label-key="ackCn.version.warningRacher"
          />
          <Banner
            v-if="!kubernetesSupport.aliyunEnabled"
            color="warning"
            :label="intl('ackCn.version.warningAliyun', { version: ackConfig.kubernetesVersion })"
          />
          <Banner
            v-if="changedHistoryK8sVersion"
            color="warning"
            :label="intl('ackCn.changedHistoryK8sVerison')"
          />
        </div>
        <div
          class="m-0 mb-10 card-container"
        >
          <div>
            <H3 class="title">
              网络配置
            </H3>
          </div>
          <div class="row">
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
            <div
              class="col span-6 desc-info"
            >
              <Icon class="icon-info" />
              <span
                v-if="!state.isFlannel"
                class="type-description"
              >
                Terway 是阿里云自研的网络插件，基于 ENI 实现 Pod 网络通信，支持 eBPF 加速、NetworkPolicy，以及 Pod 级交换机/安全组能力。
              </span>
            </div>
          </div>
          <div class="row mt-10">
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
          <div class="row mt-10">
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
            <div
              class="col span-6"
            >
              <LabeledInput
                v-if="state.isFlannel"
                v-model:value="ackConfig.containerCidr"
                :mode="mode"
                tooltipKey="ackCn.containerCidr.placeholder"
                label-key="ackCn.containerCidr.label"
                :disabled="!isNewOrUnprovisioned"
                required
                :rules="fvGetAndReportPathRules('containerCidr')"
              />
            </div>
          </div>
          <div class="row mt-10">
            <div class="col span-12">
              <Checkbox
                v-model:value="ackConfig.endpointPublicAccess"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned"
                label-key="ackCn.endpointPublicAccess.label"
                required
              />
            </div>
          </div>
          <div class="pd-10">
            <div class="mt-10">
              <h3 class="title">
                专有网络
              </h3>
              <p class="type-description">
                自动创建专有网络会自动创建 VPC/vSwitch
              </p>
            </div>
            <div class="row mt-10">
              <div class="col span-2">
                <RadioGroup
                  v-model:value="state.autoCreateVpc"
                  name="autoCreateVpc"
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :labels="['自动创建','使用已有']"
                  :options="['auto','custom']"
                  @update:value="updateAutoCreateVpc"
                />
              </div>
              <div
                v-if="isAutoCreateVpc"
                class="col span-8"
              >
                <LabeledMultiSelect
                  v-model:value="ackConfig.zoneIds"
                  :mode="mode"
                  :options="options.zoneOptions"
                  :disabled="!isNewOrUnprovisioned"
                  label-key="ackCn.vswitchId.label"
                  :loading="state.vswitchLoading"
                  @update:value="updateZones"
                />
              </div>
              <div
                v-if="!isAutoCreateVpc"
                class="col span-10"
              >
                <div class="row">
                  <div
                    class="col span-8"
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
                </div>
                <div class="row mt-10">
                  <div class="col span-8">
                    <LabeledMultiSelect
                      v-model:value="state.vswitchIds"
                      required
                      :mode="mode"
                      :options="options.vswitchOptions"
                      :disabled="!isNewOrUnprovisioned"
                      label-key="ackCn.vswitchId.label"
                      :loading="state.vswitchLoading"
                      @update:value="updateVswitchIds"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-10">
              <div class="col span-6">
                <Checkbox
                  v-model:value="ackConfig.snatEntry"
                  :mode="mode"
                  label-key="ackCn.snatEntry.label"
                  :disabled="!isNewOrUnprovisioned"
                  required
                />
              </div>
            </div>
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
              :isNew="pool.isNew"
              :isNewOrUnprovisioned="isNewOrUnprovisioned"
              :ackConfig="ackConfig"
              :disabled="(!isNewOrUnprovisioned && !pool.isNew) || changedHistoryK8sVersion"
              :disabledInstancesNum="changedHistoryK8sVersion"
              :allInstanceTypeOptions="options.allInstanceTypeOptions"
              :keyPairOptions="options.keyPairOptions"
              :instanceTypeLoading="state.instanceTypeLoading"
              :keyPairLoading="state.keyPairLoading"
              :zones="state.zones"
              :rules="{
                name: fvGetAndReportPathRules('nodePoolName'),
                runtimeVersion: fvGetAndReportPathRules('runtimeVersion'),
                instanceTypes: fvGetAndReportPathRules('instanceTypes'),
                instancesNum: fvGetAndReportPathRules('instancesNum'),
                systemDiskCategory: fvGetAndReportPathRules('systemDiskCategory'),
                diskSize: fvGetAndReportPathRules('diskSize'),
                dataDiskSize: fvGetAndReportPathRules('dataDiskSize'),
                platform: fvGetAndReportPathRules('platform'),
              }"
              :mode="mode"
              @errors="e=>state.errors=e"
            />
          </Tab>
        </Tabbed>
      </div>
      <div>
        <Accordion
          class="mb-20"
          :title="intl('generic.labelsAndAnnotations')"
        >
          <Labels
            v-model:value="normanCluster"
            :mode="mode"
          />
        </Accordion>
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

<style lang='scss' scoped>
 .card-container {
    &.highlight-border {
      border-left: 5px solid var(--primary);
    }
    border-radius: var(--border-radius);
    flex-basis: 40%;
    margin: 10px;
    min-height: 100px;
    padding: 10px;
    box-shadow: 0 0 20px var(--shadow);
 }
 .type-description {
  color: var(--input-label);
 }
 .title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 10px;
  }
  .desc-info {
    Icon{
      color: var(--on-tertiary, var(--link));
      margin: 0px 10px;
    }
    justify-content: center;
    align-items: center;
    display: flex;
    background: linear-gradient(51deg, rgb(111 210 74 / 0.12), rgba(34, 239, 171, 0));
    border-radius: var(--border-radius);
  }
</style>
