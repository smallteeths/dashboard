import { MACVLAN_PRODUCT_NAME, MACVLAN_PRODUCT_NAME_V2 } from './config/macvlan-types';

export function init($plugin, store) {
  const { virtualType, basicType, configureType } = $plugin.DSL(store, 'explorer');

  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return !rootGetters['cluster/schemaFor'](MACVLAN_PRODUCT_NAME) && !rootGetters['cluster/schemaFor'](MACVLAN_PRODUCT_NAME_V2);
    },
    labelKey:   'macvlan.nav.label',
    name:       'macvlan-install',
    group:      'cluster',
    namespaced: false,
    icon:       'folder',
    route:      {
      name:   `${ MACVLAN_PRODUCT_NAME }-c-cluster-resource-install`,
      params: { product: 'explorer', version: 'v1' }
    },
    exact: true
  });
  configureType(MACVLAN_PRODUCT_NAME, {
    isCreatable: true,
    isEditable:  true,
    showState:   false,
  });

  basicType([MACVLAN_PRODUCT_NAME, 'macvlan-install'], 'cluster');

  // v2 macvlan
  virtualType({
    showMenuFun(state, getters, rootState, rootGetters) {
      return !rootGetters['cluster/schemaFor'](MACVLAN_PRODUCT_NAME_V2);
    },
    labelKey:   'macvlan.nav.labelV2',
    name:       'macvlan-install-v2',
    group:      'cluster',
    namespaced: false,
    icon:       'folder',
    route:      {
      name:   `${ MACVLAN_PRODUCT_NAME }-c-cluster-resource-install`,
      params: { product: 'explorer', version: 'v2' }
    },
    exact: true
  });
  configureType(MACVLAN_PRODUCT_NAME_V2, {
    isCreatable: true,
    isEditable:  true,
  });

  basicType([MACVLAN_PRODUCT_NAME_V2, 'macvlan-install-v2'], 'cluster');
}
