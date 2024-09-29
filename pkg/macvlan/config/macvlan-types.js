export const MACVLAN_PRODUCT_NAME = 'macvlan.cluster.cattle.io.macvlansubnet';
export const MACVLAN_IP_PRODUCT_NAME = 'macvlan.cluster.cattle.io.macvlanip';

export const MACVLAN_CHARTS = {
  APP_NAME:       'rancher-macvlan',
  DEFAULTS:       'macvlan-defaults',
  MACVLAN_SUBNET: 'macvlan.cluster.cattle.io.macvlansubnet',
  NAMESPACE:      'kube-system',
};

export const MACVLAN_CHARTS_V2 = {
  APP_NAME:       'rancher-flat-network',
  DEFAULTS:       'macvlan-defaults',
  MACVLAN_SUBNET: 'flatnetwork.pandaria.io.flatnetworksubnet',
  NAMESPACE:      'cattle-flat-network',
};

export const MACVLAN_PRODUCT_NAME_V2 = 'flatnetwork.pandaria.io.flatnetworksubnet';
export const MACVLAN_IP_PRODUCT_NAME_V2 = 'flatnetwork.pandaria.io.flatnetworkip';
