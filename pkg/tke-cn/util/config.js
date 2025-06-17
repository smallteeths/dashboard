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
  clusterType:    'MANAGED_CLUSTER',
  clusterLevel:   'L5',
  systemDiskSize: 20,
  dataDiskSize:   0,
  ecsCount:       3,
  container:      'containerd',
  ipvs:           false,
  component:      JSON.stringify([{
    "addonName": "CBS",
    "addonParam": "{\"kind\":\"App\",\"spec\":{\"chart\":{\"chartName\":\"cbs\",\"chartVersion\":\"1.0.9\"},\"values\":{\"values\":[],\"rawValues\":\"e30=\",\"rawValuesType\":\"json\"}}}"
  }]),
  clusterEndpoint: true,
}

export default {
  CONTAINER,
  DEFAULTTKECONFIG,
  CLUSTER_TYPES,
};
