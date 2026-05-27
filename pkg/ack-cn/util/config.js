const MANAGED = 'ManagedKubernetes';
const ACK_CLUSTER_SPEC_STANDARD = 'ack.standard';
const ACK_CLUSTER_SPEC_PRO = 'ack.pro.small';

const DEFAULTACKCONFIG = {
  clusterType:          MANAGED,
  clusterSpec:          ACK_CLUSTER_SPEC_STANDARD,
  containerCidr:        '',
  kubernetesVersion:    '',
  proxyMode:            'iptables',
  name:                 null,
  displayName:          null,
  regionId:             'cn-beijing',
  serviceCidr:          '',
  nodeCidrMask:         26,
  snatEntry:            true,
  endpointPublicAccess: true,
  osType:               'Linux',
  resourceGroupId:      '',
  podVswitchIds:        [],
  deletionProtection:   true,
  addons:               [
    {
      name:   'terway-eniip',
      config: '',
    }
  ]
};

const DEFAULTIMPORTACKCONFIG = {
  imported:                 true,
  aliyun_credential_secret: '',
  cluster_id:               null,
  cluster_name:             null,
  regionId:                 'cn-beijing',
};

const DISKS = [
  {
    label: 'ackCn.disk.ssd',
    value: 'cloud_ssd'
  },
  {
    label: 'ackCn.disk.efficiency',
    value: 'cloud_efficiency'
  },
  {
    label: 'ackCn.disk.essd',
    value: 'cloud_essd'
  },
  {
    label: 'ackCn.disk.cloudessdentry',
    value: 'cloud_essd_entry'
  },
  {
    label: 'ackCn.disk.cloudAuto',
    value: 'cloud_auto'
  },
  {
    label: 'ackCn.disk.cloud',
    value: 'cloud'
  },
];

const DEFAULT_NODE_GROUP_CONFIG = {
  name:                 'default-nodepool',
  platform:             '',
  system_disk_category: '',
  system_disk_size:     120,
  data_disk:            [
    {
      encrypted: false,
      size:      0,
      category:  '',
    }
  ],
  instances_num:        3,
  auto_scaling_enabled: false,
  min_instances:        1,
  max_instances:        3,
  key_pair:             null,
  instance_types:       [
    'ecs.g6.xlarge',
    'ecs.g7.xlarge',
    'ecs.u1-c1m4.xlarge',
    'ecs.g8i.xlarge'
  ],
  type:            'nodePool',
  runtime:         'containerd',
  runtime_version: '2.1.5'
};

const CLUSTER_TYPES = [
  {
    label: 'ackCn.clusters.managed',
    value: MANAGED
  }
];

// Follows ACK supported Kubernetes versions:
// https://help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/support-for-kubernetes-versions

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

const MODES = [
  {
    value: 'iptables',
    label: 'iptables',
  },
  {
    value: 'ipvs',
    label: 'IPVS',
  },
  {
    value: 'nftables',
    label: 'nftables',
  }
];

const NODECIDRMASKS = [
  {
    label: 16,
    value: 28
  },
  {
    label: 32,
    value: 27
  },
  {
    label: 64,
    value: 26
  },
  {
    label: 128,
    value: 25
  },
  {
    label: 256,
    value: 24
  }
];

const PLATFORMTYPES = [
  {
    label:  'Alibaba Cloud Linux',
    value:  'AliyunLinux',
    osType: 'Linux'
  },
  {
    label:  'Alibaba Cloud Linux 3',
    value:  'AliyunLinux3',
    osType: 'Linux'
  },
  {
    label:  'Alibaba Cloud Linux 3 ARM',
    value:  'AliyunLinux3Arm64',
    osType: 'Linux'
  },
  {
    label:  'Alibaba Cloud Linux UEFI 2 Security',
    value:  'AliyunLinuxUEFI',
    osType: 'Linux'
  },
  {
    label:  'ContainerOS',
    value:  'ContainerOS',
    osType: 'ContainerOS'
  },
  {
    label:  'CentOS',
    value:  'CentOS',
    osType: 'Linux'
  },
  {
    label:   'Windows Server 2019',
    value:   'Windows',
    osType:  'Windows',
    managed: true
  },
  {
    label:   'Windows Server Core, version 1909',
    value:   'WindowsCore',
    osType:  'Windows',
    managed: true
  }
];

export const STATUS_AVAILABLE = 'Available';
export const INSTANCE_TYPE = 'InstanceType';
export const WITH_STOCK = 'WithStock';
export const WITHOUT_STOCK = 'WithoutStock';
export const DATA_DISK = 'DataDisk';
export const INSTANCE_TYPE_COLUMNS = [
  {
    name:  'selected',
    label: ' ',
    width: 40,
    align: 'center',
  },
  {
    name:     'instanceFamily',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.instanceFamily',
    value:    `instanceFamily`,
    sort:     `instanceFamily`,
    search:   `instanceFamily`,
  }, {
    name:     'instanceType',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.instanceType',
    value:    `instanceType`,
  }, {
    name:     'vcpus',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.vcpus',
    value:    `vcpus`,
    sort:     `vcpus`,
    search:   `vcpus`,
  }, {
    name:     'memory',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.memory',
    value:    `memory`,
    sort:     `memory`,
    search:   `memory`,
  }, {
    name:     'stock',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.stock',
    value:    `stock`,
    sort:     `stock`,
    search:   `stock`,
  }, {
    name:     'zones',
    labelKey: 'ackCn.nodePool.instanceTypes.table.columns.zones',
    value:    `zones`,
    sort:     `zones`,
    search:   `zones`,
  }
];
export const DEFAULT_DISK_VALUE = {
  category:  'cloud_essd',
  size:      0,
  encrypted: 'false'
};

export const DEFAULT_NODES = 1;
export const DEFAULT_MIN_NODES_SCALING = 1;
export const DEFAULT_MAX_NODES_SCALING = 10;

export default {
  DEFAULTACKCONFIG,
  DEFAULT_NODE_GROUP_CONFIG,
  CLUSTER_TYPES,
  ACK_CLUSTER_SPEC_OPTIONS,
  ACK_CNI_OPTIONS,
  MODES,
  NODECIDRMASKS,
  DISKS,
  PLATFORMTYPES,
  DEFAULTIMPORTACKCONFIG,
  STATUS_AVAILABLE,
  INSTANCE_TYPE,
  WITH_STOCK,
  WITHOUT_STOCK,
  DATA_DISK,
  DEFAULT_DISK_VALUE,
};
