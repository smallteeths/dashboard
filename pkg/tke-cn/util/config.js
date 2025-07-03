const CONTAINER = [{
  label: 'containerd',
  value: 'containerd',
}];

const CLUSTER_TYPES = [
  {
    label: 'tkeCn.clusterType.independent',
    value: 'INDEPENDENT_CLUSTER'
  },
  {
    label: 'tkeCn.clusterType.managed',
    value: 'MANAGED_CLUSTER'
  },
];

const DEFAULTTKECONFIG = {
  clusterCidr:    '172.16.0.0/16',
  clusterVersion: null,
  region:         'ap-guangzhou',
  vpcId:          null,
  zoneId:         null,
  subnetId:       null,
  securityGroup:  null,
  instanceType:   null,
  osName:         'tlinux3.1x86_64',
  bandwidthType:  'TRAFFIC_POSTPAID_BY_HOUR',
  bandwidth:      10,
  keyId:          null,
  keyPair:        '',
  clusterType:    'MANAGED_CLUSTER',
  clusterLevel:   'L5',
  systemDiskSize: 20,
  dataDiskSize:   0,
  ecsCount:       3,
  container:      'containerd',
  ipvs:           false,
  component:      JSON.stringify([{
    addonName:  'CBS',
    addonParam: '{"kind":"App","spec":{"chart":{"chartName":"cbs","chartVersion":"1.0.9"},"values":{"values":[],"rawValues":"e30=","rawValuesType":"json"}}}'
  }]),
  clusterEndpoint: true,
};

const DEFAULT_NODE_GROUP_CONFIG = {
  nodePoolName:   'default-nodepool',
  systemDiskSize: 20,
  dataDiskSize:   0,
  instanceNum:    1,
  bandwidth:      10,
  bandwidthType:  'TRAFFIC_POSTPAID_BY_HOUR',
  systemDiskType: '',
  dataDiskType:   '',
  osName:         'tlinux3.1x86_64',
  subnetId:       '',
  keyPair:        '',
  instanceType:   '',
  securityGroup:  '',
  type:           'nodePool',
};

const OS_IMAGE = [
  {
    Alias:           'CentOS 7.2 64bit',
    Arch:            'amd64',
    ImageId:         'img-rkiynh11',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.2x86_64',
    SeriesName:      'centos7.2x86_64',
  },
  {
    Alias:           'CentOS 7.6 64bit',
    Arch:            'amd64',
    ImageId:         'img-9qabwvbn',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.6.0_x64',
    SeriesName:      'centos7.6.0_x64',
  },
  {
    Alias:           'TencentOS Server 2.4',
    Arch:            'amd64',
    ImageId:         'img-hdt9xxkt',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4x86_64',
    SeriesName:      'TencentOS Server 2.4',
  },
  {
    Alias:           'Ubuntu Server 16.04.1 LTS 64bit',
    Arch:            'amd64',
    ImageId:         'img-4wpaazux',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu16.04.1 LTSx86_64',
    SeriesName:      'ubuntu16.04.1 LTSx86_64',
  },
  {
    Alias:           'Ubuntu Server 18.04.1 LTS 64bit',
    Arch:            'amd64',
    ImageId:         'img-pi0ii46r',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu18.04.1x86_64',
    SeriesName:      'ubuntu18.04.1x86_64',
  },
  {
    Alias:           'Ubuntu Server 20.04.1 LTS 64bit',
    Arch:            'amd64',
    ImageId:         'img-22trbn9x',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu20.04x86_64',
    SeriesName:      'ubuntu20.04x86_64',
  },
  {
    Alias:           'CentOS 7.8 64bit',
    Arch:            'amd64',
    ImageId:         'img-3la7wgnt',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.8.0_x64',
    SeriesName:      'centos7.8.0_x64',
  },
  {
    Alias:           'CentOS 8.0 64bit',
    Arch:            'amd64',
    ImageId:         'img-25szkc8t',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos8.0x86_64',
    SeriesName:      'centos8.0x86_64',
  },
  {
    Alias:           'TencentOS Server 2.4 (TK4)',
    Arch:            'amd64',
    ImageId:         'img-9axl1k53',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4(tkernel4)x86_64',
    SeriesName:      'TencentOS Server 2.4 (TK4)',
    Status:          'online'
  },
  {
    Alias:           'TencentOS Server 3.1 (TK4)',
    Arch:            'amd64',
    ImageId:         'img-eb30mz89',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux3.1x86_64',
    SeriesName:      'TencentOS Server 3.1 (TK4)',
  }
];

const CURRENTDISK = [
  {
    DiskType:    'CLOUD_BASIC',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_PREMIUM',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_SSD',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_HSSD',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_BASIC',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_PREMIUM',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_SSD',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_HSSD',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
];

const BAND_WIDTH = [
  {
    label: 'tkeCn.bandwidthType.bandwidth',
    value: 'BANDWIDTH_POSTPAID_BY_HOUR'
  },
  {
    label: 'tkeCn.bandwidthType.traffic',
    value: 'TRAFFIC_POSTPAID_BY_HOUR'
  }
];

export default {
  CONTAINER,
  DEFAULTTKECONFIG,
  CLUSTER_TYPES,
  OS_IMAGE,
  DEFAULT_NODE_GROUP_CONFIG,
  CURRENTDISK,
  BAND_WIDTH,
};
