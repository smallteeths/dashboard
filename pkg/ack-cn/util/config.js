const K8S_1_28_15 = '1.28.15-aliyun.1';
const K8S_1_30_7 = '1.30.7-aliyun.1';
const K8S_1_31_1 = '1.31.1-aliyun.1';
const DEFAULT_KUBERNETES_VERSION = K8S_1_31_1;
const KUBERNETES = 'Kubernetes';
const MANAGED = 'ManagedKubernetes';
const ACK_CLUSTER_SPEC_STANDARD = 'ack.standard';
const ACK_CLUSTER_SPEC_PRO = 'ack.pro.small';

const DEFAULTACKCONFIG = {
  clusterType:          MANAGED,
  clusterSpec:          ACK_CLUSTER_SPEC_STANDARD,
  containerCidr:        '172.20.0.0/16',
  kubernetesVersion:    DEFAULT_KUBERNETES_VERSION,
  proxyMode:            'ipvs',
  name:                 null,
  displayName:          null,
  regionId:             'cn-beijing',
  serviceCidr:          '172.21.0.0/20',
  nodeCidrMask:         '26',
  snatEntry:            true,
  endpointPublicAccess: false,
  osType:               'Linux',
  resourceGroupId:      '',
  podVswitchIds:        [],
  addons:               [
    {
      name:   'flannel',
      config: '',
    }
  ]
};

const DEFAULT_NODE_GROUP_CONFIG = {
  name:                 'default-nodepool',
  platform:             'AliyunLinux3',
  system_disk_category: 'cloud_efficiency',
  system_disk_size:     120,
  size:                 120,
  category:             'cloud_efficiency',
  instances_num:        3,
  key_pair:             null,
  instance_types:       '',
  type:                 'nodePool',
  runtime:              'containerd',
  runtime_version:      '1.6.36'
};

const CLUSTER_TYPES = [
  {
    label: 'ackCn.clusters.managed',
    value: MANAGED
  }
];

const KUBERNETESVERSIONS = [
  {
    value:          K8S_1_31_1,
    label:          K8S_1_31_1,
    rancherEnabled: true,
    aliyunEnabled:  true,
  },
  {
    value:          K8S_1_30_7,
    label:          K8S_1_30_7,
    rancherEnabled: true,
    aliyunEnabled:  true,
  },
  {
    value:          K8S_1_28_15,
    label:          K8S_1_28_15,
    rancherEnabled: true,
    aliyunEnabled:  false,
  },
];

const ACK_CLUSTER_SPEC_OPTIONS = [
  {
    label: 'ackCn.clusterSpec.standard',
    value: ACK_CLUSTER_SPEC_STANDARD
  },
  {
    label: 'ackCn.clusterSpec.pro',
    value: ACK_CLUSTER_SPEC_PRO,
  },
];

const ACK_CNI_OPTIONS = [
  {
    value: 'flannel',
    label: 'Flannel',
  },
  {
    value: 'terway-eniip',
    label: 'Terway',
  }
];

export default {
  DEFAULTACKCONFIG,
  DEFAULT_NODE_GROUP_CONFIG,
  CLUSTER_TYPES,
  KUBERNETESVERSIONS,
  ACK_CLUSTER_SPEC_OPTIONS,
  ACK_CNI_OPTIONS
};
