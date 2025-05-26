const DEFAULTCCECONFIG = {
  category:               'CCE',
  huaweiCredentialSecret: '',
  description:            '',
  type:                   'huaweiEngineConfig',
  regionID:               '',
  dataVolumeSize:         100,
  vpcId:                  null,
  version:                'v1.31',
  billingMode:            0,
  containerNetworkMode:   'vpc-router',
  clusterFlavor:          'cce.s2.small',
  dataVolumeType:         null,
  rootVolumeType:         null,
  rootVolumeSize:         40,
  externalServerEnabled:  false,
  containerNetworkCidr:   '10.0.0.0/16',
  kubernetesSvcIPRange:   '10.247.0.0/16',
  bmsIsAutoRenew:         'false',
  userName:               'root',
  authentiactionMode:     'rbac',
  eipChargeMode:          'bandwidth',
  eipType:                '5_sbgp',
  securityGroup:          '',
  kubeProxyMode:          'iptables',
  eniNetwork:             { subnets: [] },
  tags:                   {},
};

const CLUSTER_TYPES = [
  {
    label: 'CCE',
    value: 'CCE',
  },
  {
    label: 'Turbo',
    value: 'Turbo',
  },
];

const KUBERNETESVERSIONS = [
  {
    label:          'v1.28',
    value:          'v1.28',
    rancherEnabled: false,
    cceEnabled:     true,
  },
  {
    label:          'v1.30',
    value:          'v1.30',
    rancherEnabled: true,
    cceEnabled:     true,
  },
  {
    label:          'v1.31',
    value:          'v1.31',
    rancherEnabled: true,
    cceEnabled:     true,
  }
];

const MANAGEMENT_SCALE_VIRTUAL = [{
  label: '50',
  value: 'small',
}, {
  label: '200',
  value: 'medium',
}, {
  label: '1000',
  value: 'large',
}, {
  label: '2000',
  value: 'xlarge',
}];

const CONTAINER_NETWORK_MODES = [{
  label: 'cceCn.containerNetworkMode.overlay.label',
  value: 'overlay_l2',
  bare:  false,
}, {
  label: 'cceCn.containerNetworkMode.vpcRouter.label',
  value: 'vpc-router',
  bare:  false
}, {
  label:    'cceCn.containerNetworkMode.eni.label',
  value:    'eni',
  disabled: true,
  bare:     false
}];

const EIPCHARGEMODEOPTIONS = [
  {
    label: 'cceCn.eipChargeMode.bandwidth',
    value: 'bandwidth',
  }, {
    label: 'cceCn.eipChargeMode.traffic',
    value: 'traffic',
  }];

const EIPTYPEOTPTIONS = [
  {
    label: 'cceCn.eipType.bgp',
    value: '5_bgp',
  }, {
    label: 'cceCn.eipType.sbgp',
    value: '5_sbgp',
  },
];

const DEFAULT_NODE_GROUP_CONFIG = {
  name:             'default-nodepool',
  flavor:           '',
  availableZone:    null,
  sshKey:           null,
  rootVolume:       {},
  dataVolumes:      [],
  billingMode:      0,
  OperatingSystem:  null,
  tags:             null,
  count:            null,
  dataVolumeSize:   100,
  rootVolumeSize:   50,
  runtime:          'containerd',
  bmsIsAutoRenew:   false,
  rootVolumeType:   '',
  dataVolumeType:   '',
  initialNodeCount: 1,
};

const BILLING_MODES = [{
  label: 'cceCn.billingMode.payPerUse',
  value: 0,
}, {
  label: 'cceCn.billingMode.yearly',
  value: 1,
}];

export default {
  DEFAULTCCECONFIG,
  CLUSTER_TYPES,
  KUBERNETESVERSIONS,
  MANAGEMENT_SCALE_VIRTUAL,
  CONTAINER_NETWORK_MODES,
  EIPCHARGEMODEOPTIONS,
  EIPTYPEOTPTIONS,
  DEFAULT_NODE_GROUP_CONFIG,
  BILLING_MODES
};
