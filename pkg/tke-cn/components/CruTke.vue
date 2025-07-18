<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { NORMAN } from '@shell/config/types';
import CruResource from '@shell/components/CruResource.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Banner from '@components/Banner/Banner.vue';
import TKEValidators from '../util/validators';
import { stringify } from '@shell/utils/error';
import GroupPanel from '@shell/components/GroupPanel';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import { _CREATE, _IMPORT, _VIEW } from '@shell/config/query-params';
import { RadioGroup } from '@components/Form/Radio';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Accordion from '@components/Accordion/Accordion.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import { queryFromTencent } from '../util/request';
import Labels from '@shell/components/form/Labels.vue';
import NodePool from './NodePool';
import ImportTke from './ImportTke';
import MasterNode from './MasterNode';
import { find, pullAt, uniqBy } from 'lodash';
import CONFIG_ENV from '../util/config';

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
const intl = computed(() => store.getters['i18n/t']);
const tkeConfig = ref({});
const normanCluster = ref({});
const cruresource = ref(null);
const nodePools = ref([]);
const router = useRouter();
const query = router.currentRoute.value.query;
const isImport = query?.mode === _IMPORT;
const DATA_DISK = 'DATA_DISK';
const SYSTEM_DISK = 'SYSTEM_DISK';
const options = ref({
  regionOptions:        [],
  clusterLevelOptions:  [],
  versionOptions:       [],
  zoneOptions:          [],
  vpcOptions:           [],
  keyPairOptions:       [],
  securityGroupOptions: [],
  clusterOptions:       [],
  ipvsOptions:          [
    intl.value('generic.enabled'),
    intl.value('generic.disabled'),
  ],
  clusterEndpointOptions: [
    intl.value('tkeCn.proxy.outer'),
    intl.value('tkeCn.proxy.inner'),
  ],
});
const state = ref({
  loading:                      false,
  regionLoading:                false,
  clusterLevelAttributeLoading: false,
  instanceTypeLoading:          false,
  clusterVersionLoading:        false,
  zoneIdLoading:                false,
  vpcIdLoading:                 false,
  subnetLoading:                false,
  securityGroupLoading:         false,
  instanceTypeSet:              {},
  allSubnets:                   [],
  errors:                       [],
});
const emit = defineEmits(['done']);

const isManagedCluster = computed(() => {
  return tkeConfig.value.clusterType === 'MANAGED_CLUSTER';
});
// input
const ruleSets = computed(() => {
  const importCluster = isImport || tkeConfig.value.imported;
  const name = normanCluster.value.name;
  const region = tkeConfig.value.region;
  const container = tkeConfig.value.container;
  const clusterType = tkeConfig.value.clusterType;
  const clusterLevel = tkeConfig.value.clusterLevel;
  const clusterVersion = tkeConfig.value.clusterVersion;
  const clusterID = tkeConfig.value.clusterId;
  const zoneId = tkeConfig.value.zoneId;
  const vpcId = tkeConfig.value.vpcId;
  const subnetId = tkeConfig.value.subnetId;
  const osName = tkeConfig.value.osName;
  const clusterCidr = tkeConfig.value.clusterCidr;
  const securityGroup = tkeConfig.value.securityGroup;
  const instanceType = tkeConfig.value.instanceType;
  const keyPair = tkeConfig.value.keyPair;
  const copyNodePools = nodePools.value.map((pool) => {
    return {
      nodePoolName:   pool.nodePoolName,
      instanceType:   pool.instanceType,
      osName:         pool.osName,
      systemDiskType: pool.systemDiskType,
      subnetId:       pool.subnetId,
      keyPair:        pool.keyPair,
      securityGroup:  pool.securityGroup,
    };
  });

  return {
    name: [
      TKEValidators.nameRequired({ name }, intl),
    ],
    region: [
      TKEValidators.regionIdRequired({ region }, intl),
    ],
    container: !importCluster ? [
      TKEValidators.containerRequired({ container }, intl),
    ] : [],
    clusterType: !importCluster ? [
      TKEValidators.clusterTypeRequired({ clusterType }, intl),
    ] : [],
    clusterLevel: !importCluster && isManagedCluster.value ? [
      TKEValidators.clusterLevelRequired({ clusterLevel }, intl),
    ] : [],
    clusterVersion: !importCluster ? [
      TKEValidators.clusterVersionRequired({ clusterVersion }, intl),
    ] : [],
    zoneId: !importCluster && !isManagedCluster.value ? [
      TKEValidators.zoneIdRequired({ zoneId }, intl),
    ] : [],
    vpc: !importCluster ? [
      TKEValidators.vpcIdRequired({ vpcId }, intl),
    ] : [],
    subnet: !importCluster ? [
      TKEValidators.subnetIdRequired({ subnetId }, intl),
    ] : [],
    clusterCidr: !importCluster ? [
      TKEValidators.clusterCidrRequired({ clusterCidr }, intl),
      TKEValidators.clusterValidate({ clusterCidr }, intl),
    ] : [],
    securityGroup: !importCluster ? [
      TKEValidators.securityGroupRequired({ securityGroup }, intl),
    ] : [],
    nodePoolName: !importCluster ? [
      TKEValidators.nodePoolNameRequired(copyNodePools, intl),
      TKEValidators.nodePoolNamesUnique(copyNodePools, intl),
    ] : [],
    instanceType: !importCluster ? [
      TKEValidators.instanceTypeRequired(copyNodePools, intl),
    ] : [],
    nodePoolOsNameRequired: !importCluster ? [
      TKEValidators.nodePoolOsNameRequired(copyNodePools, intl),
    ] : [],
    systemDiskTypeRequired: !importCluster ? [
      TKEValidators.systemDiskTypeRequired(copyNodePools, intl),
    ] : [],
    nodePoolSubnetIdRequired: !importCluster ? [
      TKEValidators.nodePoolSubnetIdRequired(copyNodePools, intl),
    ] : [],
    keyPairRequired: !importCluster ? [
      TKEValidators.keyPairRequired(copyNodePools, intl),
    ] : [],
    nodePoolSecurityGroupRequired: !importCluster ? [
      TKEValidators.nodePoolSecurityGroupRequired(copyNodePools, intl),
    ] : [],
    masterInstanceType: !importCluster && !isManagedCluster.value ? [
      TKEValidators.masterInstanceTypeRequired({ instanceType }, intl),
    ] : [],
    masterOsNameRequired: !importCluster && !isManagedCluster.value ? [
      TKEValidators.osNameRequired({ osName }, intl),
    ] : [],
    masterKeyPairRequired: !importCluster && !isManagedCluster.value ? [
      TKEValidators.masterKeyPairRequired({ keyPair }, intl),
    ] : [],
    clusterID: importCluster ? [
      TKEValidators.clusterIDRequired({ clusterID }, intl),
    ] : [],
  };
});
// save
const fvFormIsValid = computed(() => {
  const rules = ruleSets.value;
  let isValid = true;

  for (const key in rules) {
    const validators = rules[key];

    if (!validators.length) {
      continue;
    }
    for (const validate of validators) {
      const result = validate();

      if (result) {
        isValid = false;
        break;
      }
    }
    if (!isValid) break;
  }

  return isValid;
});
const kubernetesSupport = computed(() => {
  const version = tkeConfig.value.clusterVersion;

  if (options.value.versionOptions.length === 0 || !version) {
    return { rancherDisabled: false };
  }
  const matched = find(options.value.versionOptions, { value: version }) || {};

  return { rancherDisabled: !matched.rancherEnabled };
});
const subnetOptions = computed(() => {
  if (!state.value.allSubnets) {
    return [];
  }
  const zoneId = tkeConfig.value.zoneId;
  const vpcId = tkeConfig.value.vpcId;
  const subnetsOptions = state.value.allSubnets?.filter((subnet) => {
    if (zoneId) {
      return subnet.vpcId === vpcId && subnet.zone === zoneId;
    }

    return subnet.vpcId === vpcId;
  });

  return subnetsOptions || [];
});
const imageOptions = computed(() => {
  const out = [];

  CONFIG_ENV.OS_IMAGE.forEach((image) => {
    out.push({
      label: image.Alias,
      value: image.OsName,
    });
  });

  return out.sort((a, b) => a.label > b.label ? -1 : 1);
});
const instanceTypeOptions = computed(() => {
  const allInstances = state.value.instanceTypeSet || {};
  const zoneId = tkeConfig.value.zoneId;
  const instances = allInstances[zoneId];

  if (!allInstances) {
    return [];
  } else if (!zoneId) {
    const all = Object.values(allInstances).reduce((acc, arr) => acc.concat(arr), []);

    return all;
  }

  return instances;
});
const getDiskOptions = computed(() => {
  const systemDiskTypes = {};
  const dataDiskTypes = {};

  CONFIG_ENV.CURRENTDISK.forEach((d) => {
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
const clusterActive = computed(() => {
  if (!isNewOrUnprovisioned.value) {
    return normanCluster.value.state === 'active';
  }

  return true;
});
const CREATE = computed(() => {
  return _CREATE;
});
const VIEW = computed(() => {
  return _VIEW;
});
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, tkeConfig, nodePools, state
});
const hasCredential = computed(() => {
  return !!tkeConfig.value?.tkeCredentialSecret;
});
const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.tkeStatus?.upstreamSpec;
});

function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
}

function resetConfig() {
  tkeConfig.value.subnetId = '';
  tkeConfig.value.securityGroup = '';
  tkeConfig.value.vpcId = '';
  tkeConfig.value.zoneId = '';
  nodePools.value = nodePools.value.map((pool) => {
    return {
      ...pool,
      subnetId:      '',
      securityGroup: '',
      keyPair:       '',
    };
  });
}

async function initImportConfig() {
  state.value.loading = true;
  state.value.errors = [];
  normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

  const principalId = store.getters['auth/principalId'];

  if (principalId.includes('local://')) {
    normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
  }

  if (!normanCluster?.value?.tkeConfig) {
    tkeConfig.value = {
      imported:            true,
      name:                '',
      tkeCredentialSecret: '',
      clusterId:           '',
      clusterEndpoint:     true,
      region:              '',
    };
  } else {
    fixConfig(normanCluster.value.tkeConfig);
  }

  state.value.loading = false;
}

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
    if (normanCluster.value.tkeConfig) {
      fixConfig(normanCluster.value.tkeConfig);
    }
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }

    nodePools.value = [{ ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG }];
    tkeConfig.value = { ...CONFIG_ENV.DEFAULTTKECONFIG };
  }
  state.value.loading = false;
}

function fixConfig(config) {
  const nodePool = [];
  const {
    clusterEndpoint = {},
    clusterBasicSettings = {},
    clusterCIDRSettings = {},
    nodePoolList = [],
    runInstancesForNode = {},
    clusterAdvancedSettings = {},
    extensionAddon = []
  } = config;

  nodePoolList.forEach((item) => {
    const { autoScalingGroupPara, launchConfigurePara } = item;

    const obj = {
      clusterId:      item.clusterId,
      nodePoolId:     item.nodePoolId,
      nodePoolName:   item.name,
      osName:         item.nodePoolOs,
      instanceNum:    autoScalingGroupPara.desiredCapacity,
      subnetId:       autoScalingGroupPara.subnetIds[0],
      instanceType:   launchConfigurePara.instanceType,
      systemDiskSize: launchConfigurePara.systemDisk.diskSize,
      systemDiskType: launchConfigurePara.systemDisk.diskType,
      dataDiskType:   launchConfigurePara.dataDisks?.[0].diskType,
      dataDiskSize:   launchConfigurePara.dataDisks?.[0].diskSize,
      bandwidthType:  launchConfigurePara.internetChargeType,
      bandwidth:      launchConfigurePara.internetMaxBandwidthOut,
      keyPair:        launchConfigurePara.keyIds[0],
      securityGroup:  launchConfigurePara.securityGroupIds[0],
    };

    nodePool.push(obj);
  });

  const out = {
    clusterEndpoint:     clusterEndpoint.enable === undefined ? true : !!clusterEndpoint.enable,
    imported:            config.imported,
    region:              config.region,
    clusterId:           config.clusterId,
    subnetId:            clusterEndpoint.subnetId,
    tkeCredentialSecret: config.tkeCredentialSecret,
    securityGroup:       clusterEndpoint.securityGroup,
    osName:              clusterBasicSettings.clusterOs,
    clusterType:         clusterBasicSettings.clusterType,
    name:                clusterBasicSettings.clusterName,
    clusterVersion:      clusterBasicSettings.clusterVersion,
    vpcId:               clusterBasicSettings.vpcId,
    clusterLevel:        clusterBasicSettings.clusterLevel,
    clusterCidr:         clusterCIDRSettings.clusterCIDR,
    ecsCount:            runInstancesForNode.instanceCount,
    instanceType:        runInstancesForNode.instanceType,
    bandwidthType:       runInstancesForNode.internetChargeType,
    bandwidth:           runInstancesForNode.internetMaxBandwidthOut,
    keyPair:             (runInstancesForNode.keyIds || [])[0],
    zoneId:              runInstancesForNode.zone,
    systemDiskType:      runInstancesForNode.systemDisk?.diskType,
    systemDiskSize:      runInstancesForNode.systemDisk?.diskSize,
    dataDiskType:        runInstancesForNode.dataDisk?.diskType,
    dataDiskSize:        runInstancesForNode.dataDisk?.diskSize,
    container:           clusterAdvancedSettings.containerRuntime,
    ipvs:                clusterAdvancedSettings.ipvs,
    component:           JSON.stringify(extensionAddon)
  };

  nodePools.value = nodePool;
  tkeConfig.value = out;
}

onMounted(async() => {
  if (isImport) {
    await initImportConfig();
  } else {
    await initCustomConfig();
  }
  registerWatch();
});

function registerWatch() {
  // watch
  // Because SelectCredential inside the component will trigger a change by default, this watch gets triggered when the component loads.
  watch(() => tkeConfig.value.tkeCredentialSecret, async(credential) => {
    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    promises.push(fetchRegion(credential));
    if (!isImport) {
      promises.push(
        fetchClusterLevelAttribute(credential),
        fetchClusterVersion(credential),
        fetchZone(credential),
        fetchVpc(credential),
        fetchSubnets(credential),
        fetchSecurityGroup(credential),
        fetchInstanceTypes(credential),
        fetchKeyPair(credential),
      );
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      if (state.value.errors.length === 0) {
        state.value.errors.push(err);
      }
    }
  }, { immediate: true });

  watch(() => tkeConfig.value.region, async() => {
    const credential = tkeConfig.value.tkeCredentialSecret;

    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    if (!isImport) {
      resetConfig();
      promises.push(
        fetchClusterLevelAttribute(credential),
        fetchClusterVersion(credential),
        fetchZone(credential),
        fetchVpc(credential),
        fetchSubnets(credential),
        fetchSecurityGroup(credential),
        fetchInstanceTypes(credential),
        fetchKeyPair(credential),
      );
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      if (state.value.errors.length === 0) {
        state.value.errors.push(err);
      }
    }
  });

  watch(() => tkeConfig.value.vpcId, () => {
    tkeConfig.value.subnetId = '';
  });

  watch(() => tkeConfig.value.zoneId, () => {
    tkeConfig.value.subnetId = '';
    nodePools.value = nodePools.value.map((pool) => ({
      ...pool,
      instanceType: '',
    }));
  });
}

async function fetchRegion(cloudCredentialId) {
  state.value.regionLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'regions',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    const regionOptions = res?.Response?.RegionInstanceSet?.map((region) => {
      return {
        label: intl.value(`tkeCn.regions.${ region.RegionName }`),
        value: region.RegionName
      };
    });

    options.value.regionOptions = regionOptions || [];
  } catch (err) {
    options.value.regionOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionLoading = false;
}

async function fetchClusterLevelAttribute(cloudCredentialId) {
  state.value.clusterLevelAttributeLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'clusterLevelAttribute',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const clusterLevelOptions = res?.Response?.Items?.map((item) => {
      const help = {
        level:     item.Alias,
        node:      item.NodeCount,
        pod:       item.PodCount,
        configMap: item.ConfigMapCount,
        crd:       item.CRDCount,
      };

      return {
        label: intl.value('tkeCn.clusterLevel.help', help),
        value: item.Alias,
      };
    });

    options.value.clusterLevelOptions = clusterLevelOptions || [];
  } catch (err) {
    options.value.clusterLevelOptions = [];
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.clusterLevelAttributeLoading = false;
}

async function fetchClusterVersion(cloudCredentialId) {
  state.value.clusterVersionLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'versions',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const versionRange = ['1.30', '1.31', '1.32'];
    const versions = res?.Response?.VersionInstanceSet?.map((item) => {
      const enabled = versionRange.find((v) => {
        return item.Version.startsWith(`${ v }`);
      });

      return {
        label:          item.Version,
        value:          item.Version,
        rancherEnabled: !!enabled
      };
    });

    if (!tkeConfig.value.clusterVersion) {
      const version = versions.reverse().find((item) => item.rancherEnabled);

      if (version) {
        tkeConfig.value.clusterVersion = version.value;
      }
    }

    options.value.versionOptions = versions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.versionOptions = [];
    state.value.errors.push(err);
  }
  state.value.clusterVersionLoading = false;
}

async function fetchZone(cloudCredentialId) {
  state.value.zoneIdLoading = true;
  let acceptLanguage = '';

  if (!store.getters['i18n/current']() === 'en-us') {
    acceptLanguage = 'zh-CN';
  }
  try {
    const res = await queryFromTencent({
      resource:       'zones',
      cloudCredentialId,
      store,
      externalParams: {
        regionId: tkeConfig.value.region,
        language: acceptLanguage,
      },
    });

    const zoneOptions = res?.Response.ZoneSet.map((zone) => {
      return {
        label: zone.ZoneName,
        value: zone.Zone,
      };
    });

    options.value.zoneOptions = zoneOptions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.zoneOptions = [];
    state.value.errors.push(err);
  }
  state.value.zoneIdLoading = false;
}

async function fetchVpc(cloudCredentialId) {
  state.value.vpcIdLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'vpcs',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const vpcOptions = res?.Response?.VpcSet?.map((vpc) => {
      return {
        label: vpc.VpcName,
        value: vpc.VpcId,
      };
    });

    options.value.vpcOptions = vpcOptions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.vpcOptions = [];
    state.value.errors.push(err);
  }
  state.value.vpcIdLoading = false;
}

async function fetchSubnets(cloudCredentialId) {
  state.value.subnetLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'subnets',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const allSubnets = res?.Response?.SubnetSet?.map((subnet) => {
      return {
        label: subnet.SubnetName,
        value: subnet.SubnetId,
        vpcId: subnet.VpcId,
        zone:  subnet.Zone,
      };
    });

    state.value.allSubnets = allSubnets || [];
  } catch (err) {
    state.value.errors = [];
    state.value.allSubnets = [];
    state.value.errors.push(err);
  }
  state.value.subnetLoading = false;
}

async function fetchSecurityGroup(cloudCredentialId) {
  state.value.securityGroupLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'securityGroups',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const securityGroupOptions = res?.Response?.SecurityGroupSet?.map((securityGroup) => {
      return {
        label: securityGroup.SecurityGroupName,
        value: securityGroup.SecurityGroupId,
      };
    });

    options.value.securityGroupOptions = securityGroupOptions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.securityGroupOptions = [];
    state.value.errors.push(err);
  }
  state.value.securityGroupLoading = false;
}

async function fetchInstanceTypes(cloudCredentialId) {
  state.value.instanceTypeLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'zoneInstanceConfigInfos',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const allInstances = res?.Response?.InstanceTypeQuotaSet;
    const out = {};

    allInstances.forEach((instance) => {
      if (instance.Status !== 'SELL' || instance.InstanceChargeType !== 'POSTPAID_BY_HOUR') {
        return;
      }

      const item = {
        value: instance.InstanceType,
        label: `${ instance.TypeName } (CPU ${ instance.Cpu } Memory ${ instance.Memory } GiB)`,
        group: instance.InstanceFamily,
        zone:  instance.Zone,
      };

      if (!out[instance.Zone]) {
        out[instance.Zone] = [item];
      } else {
        out[instance.Zone].push(item);
      }
    });
    state.value.instanceTypeSet = out;
  } catch (err) {
    state.value.errors = [];
    options.value.instanceTypeSet = {};
    state.value.errors.push(err);
  }
  state.value.instanceTypeLoading = false;
}

async function fetchKeyPair(cloudCredentialId) {
  state.value.keyPairLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'keyPairs',
      cloudCredentialId,
      store,
      externalParams: { regionId: tkeConfig.value.region },
    });
    const keyPairOptions = res?.Response?.KeyPairSet?.map((keyPair) => {
      return {
        label: keyPair.KeyName,
        value: keyPair.KeyId,
      };
    });

    options.value.keyPairOptions = keyPairOptions || [];
  } catch (err) {
    state.value.errors = [];
    options.value.keyPairOptions = [];
    state.value.errors.push(err);
  }
  state.value.keyPairLoading = false;
}

function addPool() {
  if (tkeConfig.value.imported) {
    return;
  }
  let nextDefaultSuffix = nodePools.value?.length + 1;

  while (nodePools.value.find((group) => group.nodePoolName === `nodepool-${ nextDefaultSuffix }`)) {
    nextDefaultSuffix++;
  }

  const name = `nodepool-${ nextDefaultSuffix }`;
  const ngConfig = {
    ...CONFIG_ENV.DEFAULT_NODE_GROUP_CONFIG,
    nodePoolName: name,
    isNew:        true,
  };

  nodePools.value.push(ngConfig);
}

function removePool(index) {
  if (tkeConfig.value.imported) {
    return;
  }
  if (!nodePools.value ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= nodePools.value.length ||
    nodePools.value.length === 1
  ) {
    return;
  }

  pullAt(nodePools.value, index);
}

function poolIsValid(pool) {
  if (
    !pool.nodePoolName ||
    !pool.instanceType ||
    !pool.osName ||
    !pool.systemDiskType ||
    !pool.subnetId ||
    !pool.keyPair ||
    isNaN(pool.instanceNum) ||
    pool.instanceNum < 0 ||
    !pool.securityGroup
  ) {
    return false;
  }

  const names = nodePools.value?.map((pool) => pool.nodePoolName) || [];

  return uniqBy(names, (name) => name).length === names.length;
}

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
    :validation-passed="fvFormIsValid"
    @error="e=>errors=e"
    @finish="save"
  >
    <SelectCredential
      v-model:value="tkeConfig.tkeCredentialSecret"
      :mode="mode === VIEW ? VIEW : CREATE"
      data-testid="crutke-select-credential"
      provider="tke"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="crutke-form"
    >
      <div
        v-if="isImport"
      >
        <div>
          <ImportTke
            v-model:name="normanCluster.name"
            v-model:description="normanCluster.description"
            v-model:regionId="tkeConfig.region"
            v-model:clusterID="tkeConfig.clusterId"
            v-model:clusterEndpoint="tkeConfig.clusterEndpoint"
            :mode="mode"
            :cloudCredentialId="tkeConfig.tkeCredentialSecret"
            :regionOptions="options.regionOptions"
            :clusterEndpointOptions="options.clusterEndpointOptions"
            :disabled="!isNewOrUnprovisioned"
            :rules="{
              name: ruleSets.name,
              clusterID: ruleSets.clusterID,
            }"
            @errors="e =>state.errors=e"
          />
        </div>
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
          :label="t('tkeCn.updateWarn')"
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
              :rules="ruleSets.name"
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
              v-model:value="tkeConfig.region"
              data-testid="crutke-resource-region"
              required
              :mode="mode"
              :options="options.regionOptions"
              option-label="label"
              option-key="value"
              :loading="state.regionLoading"
              label-key="tkeCn.region.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.region"
            />
          </div>
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.container"
              data-testid="crutke-resource-container"
              required
              :mode="mode"
              :options="CONFIG_ENV.CONTAINER"
              option-label="label"
              option-key="value"
              label-key="tkeCn.container.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.container"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.clusterType"
              data-testid="crutke-resource-cluster-type"
              required
              :mode="mode"
              :options="CONFIG_ENV.CLUSTER_TYPES"
              option-label="label"
              option-key="value"
              label-key="tkeCn.clusterType.label"
              :localizedLabel="true"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.clusterType"
            />
          </div>
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-if="isManagedCluster"
              v-model:value="tkeConfig.clusterLevel"
              :loading="state.clusterLevelAttributeLoading"
              data-testid="crutke-resource-cluster-level"
              required
              :mode="mode"
              :options="options.clusterLevelOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.clusterLevel.label"
              :disabled="tkeConfig.imported"
              :rules="ruleSets.clusterLevel"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.clusterVersion"
              data-testid="crutke-resource-cluster-version"
              :loading="state.clusterVersionLoading"
              required
              :mode="mode"
              :options="options.versionOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.version.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.clusterVersion"
            />
          </div>
          <div
            v-if="isNewOrUnprovisioned || tkeConfig.zoneId"
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.zoneId"
              data-testid="crutke-resource-zone"
              :loading="state.zoneIdLoading"
              required
              :mode="mode"
              :options="options.zoneOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.zone.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.zoneId"
            />
          </div>
        </div>
        <div class="row mb-10">
          <Banner
            v-if="kubernetesSupport.rancherDisabled"
            color="warning"
            label-key="tkeCn.version.warning"
          />
        </div>
        <div class="row mb-10">
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.vpcId"
              data-testid="crutke-resource-vpc"
              :loading="state.vpcIdLoading"
              required
              :mode="mode"
              :options="options.vpcOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.vpc.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.vpc"
            />
          </div>
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.subnetId"
              data-testid="crutke-resource-subnet"
              :loading="state.subnetLoading"
              required
              :mode="mode"
              :options="subnetOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.subnet.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.subnet"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="tkeConfig.securityGroup"
              data-testid="crutke-resource-security-group"
              :loading="state.securityGroupLoading"
              required
              :mode="mode"
              :options="options.securityGroupOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.securityGroup.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.securityGroup"
            />
          </div>
          <div
            class="col span-6"
          >
            <LabeledInput
              v-model:value="tkeConfig.clusterCidr"
              data-testid="crutke-resource-cluster-cidr"
              required
              :mode="mode"
              label-key="tkeCn.clusterCidr.label"
              :disabled="!isNewOrUnprovisioned"
              :rules="ruleSets.clusterCidr"
              :placeholder="intl('tkeCn.clusterCidr.placeholder')"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-12">
            <h3 class="clearfix">
              {{ intl('tkeCn.ipvs.label') }}
            </h3>
            <RadioGroup
              v-model:value="tkeConfig.ipvs"
              :disabled="!isNewOrUnprovisioned"
              name="ipvs"
              :options="[true, false]"
              :labels="options.ipvsOptions"
              :mode="mode"
            />
            <div
              class="mt-5"
              style="font-size:12px"
            >
              ({{ intl('tkeCn.ipvs.help') }})
            </div>
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('tkeCn.proxy.label') }}
            </h3>
            <RadioGroup
              v-model:value="tkeConfig.clusterEndpoint"
              :disabled="!isNewOrUnprovisioned"
              name="clusterEndpoint"
              :options="[true, false]"
              :labels="options.clusterEndpointOptions"
              :mode="mode"
            />
          </div>
        </div>
        <GroupPanel
          v-if="!isManagedCluster"
          label-key="tkeCn.master.title"
          class="mt-20 mb-20"
        >
          <MasterNode
            v-model:instanceNum="tkeConfig.ecsCount"
            v-model:systemDiskType="tkeConfig.systemDiskType"
            v-model:systemDiskSize="tkeConfig.systemDiskSize"
            v-model:dataDiskType="tkeConfig.dataDiskType"
            v-model:dataDiskSize="tkeConfig.dataDiskSize"
            v-model:bandwidthType="tkeConfig.bandwidthType"
            v-model:bandwidth="tkeConfig.bandwidth"
            v-model:instanceType="tkeConfig.instanceType"
            v-model:osName="tkeConfig.osName"
            v-model:keyPair="tkeConfig.keyPair"
            class="mt-10"
            :mode="mode"
            :keyPairLoading="keyPairLoading"
            :systemDiskTypeOptions="getDiskOptions.systemDiskTypes"
            :subnetOptions="subnetOptions"
            :keyPairOptions="options.keyPairOptions"
            :dataDiskTypeOptions="getDiskOptions.dataDiskTypes"
            :imageOptions="imageOptions"
            :instanceTypeOptions="instanceTypeOptions"
            :instanceTypeLoading="state.instanceTypeLoading"
            :bandwidthTypeOptions="CONFIG_ENV.BAND_WIDTH"
            :isNewOrUnprovisioned="isNewOrUnprovisioned"
            :rules="{
              instanceType: ruleSets.masterInstanceType,
              osName: ruleSets.masterOsNameRequired,
              keyPair: ruleSets.masterKeyPairRequired,
            }"
          />
        </GroupPanel>
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
            :name="`${pool.nodePoolName} ${i}`"
            :label="pool.nodePoolName"
            :error="!poolIsValid(pool)"
          >
            <NodePool
              v-model:name="pool.nodePoolName"
              v-model:instanceType="pool.instanceType"
              v-model:osName="pool.osName"
              v-model:instanceNum="pool.instanceNum"
              v-model:systemDiskType="pool.systemDiskType"
              v-model:systemDiskSize="pool.systemDiskSize"
              v-model:dataDiskType="pool.dataDiskType"
              v-model:dataDiskSize="pool.dataDiskSize"
              v-model:bandwidthType="pool.bandwidthType"
              v-model:bandwidth="pool.bandwidth"
              v-model:subnetId="pool.subnetId"
              v-model:keyPair="pool.keyPair"
              v-model:securityGroup="pool.securityGroup"
              :keyPairLoading="keyPairLoading"
              :systemDiskTypeOptions="getDiskOptions.systemDiskTypes"
              :subnetOptions="subnetOptions"
              :securityGroupOptions="options.securityGroupOptions"
              :keyPairOptions="options.keyPairOptions"
              :dataDiskTypeOptions="getDiskOptions.dataDiskTypes"
              :imageOptions="imageOptions"
              :instanceTypeOptions="instanceTypeOptions"
              :instanceTypeLoading="state.instanceTypeLoading"
              :bandwidthTypeOptions="CONFIG_ENV.BAND_WIDTH"
              :tkeConfig="tkeConfig"
              :mode="mode"
              :rules="{
                name: ruleSets.nodePoolName,
                instanceType: ruleSets.instanceType,
                osName: ruleSets.nodePoolOsNameRequired,
                systemDiskType: ruleSets.systemDiskTypeRequired,
                subnetId: ruleSets.nodePoolSubnetIdRequired,
                keyPair: ruleSets.keyPairRequired,
                securityGroup: ruleSets.nodePoolSecurityGroupRequired,
              }"
              :isNewOrUnprovisioned="isNewOrUnprovisioned || pool.isNew"
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
<style>
</style>
