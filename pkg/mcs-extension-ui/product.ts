import { IPlugin } from '@shell/core/types';
import { filterBy } from '@shell/utils/array';

export function init($plugin: IPlugin, store: any) {
  const PRODUCT_NAME = 'globalMultiClusterService';
  const CLUSTER_PRODUCT_NAME = 'multiClusterService';

  const BLANK_CLUSTER = '_';
  const SERVICE_EXPORTS = 'multicluster.x-k8s.io.serviceexport';
  const SERVICE__IMPORTS = 'multicluster.x-k8s.io.serviceimport';
  const CLUSTER_DASHBOARD = 'clusterDashboard';
  const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';
  const DASHBOARD = 'globalDashboard';

  const {
    product, configureType, virtualType, basicType
  } = $plugin.DSL(store, PRODUCT_NAME);
  const {
    product: clusterProduct, virtualType: clusterVirtualType, configureType: clusterConfigureType, basicType: clusterBasicType
  } = $plugin.DSL(store, CLUSTER_PRODUCT_NAME);

  product({
    ifHaveGroup:         'multicluster.pandaria.io',
    icon:                'mcs-cloud',
    // svg:                 require('./mcs.svg'),
    inStore:             'management',
    weight:              100,
    showClusterSwitcher: false,
    to:                  {
      name:   `${ PRODUCT_NAME }-c-cluster-${ DASHBOARD }`,
      params: {
        product: PRODUCT_NAME,
        cluster: BLANK_CLUSTER,
      },
    },
  });

  virtualType({
    labelKey:   'mcs.nav.dashboard.label',
    namespaced: false,
    name:       DASHBOARD,
    route:      {
      name:   `${ PRODUCT_NAME }-c-cluster-globalDashboard`,
      params: { resource: DASHBOARD, cluster: BLANK_CLUSTER }
    },
  });

  configureType(CLUSTER_SET, {
    displayName: 'Clustersets/Clusters',
    isCreatable: true,
    isEditable:  true,
    isRemovable: true,
    showAge:     true,
    showState:   true,
    canYaml:     true,
    customRoute: {
      name:   `${ PRODUCT_NAME }-c-cluster-resource`,
      params: {
        product:  PRODUCT_NAME,
        cluster:  BLANK_CLUSTER,
        resource: CLUSTER_SET
      },
      meta: {
        product: PRODUCT_NAME,
        cluster: BLANK_CLUSTER
      }
    },
  });
  basicType([DASHBOARD, CLUSTER_SET]);

  clusterProduct({
    ifHave(rootGetters: any) {
      const targetedSchemas = rootGetters['management/all']('schema');
      const haveIds = filterBy(targetedSchemas, 'id', 'multicluster.pandaria.io.clusterset');

      return !!haveIds.length;
    },
    icon:                'gear',
    inStore:             'cluster',
    weight:              95,
    showNamespaceFilter: true,
    to:                  {
      name:   `c-cluster-${ CLUSTER_PRODUCT_NAME }-${ CLUSTER_DASHBOARD }`,
      params: { product: CLUSTER_PRODUCT_NAME },
      meta:   { product: CLUSTER_PRODUCT_NAME }
    },
  });

  clusterConfigureType(SERVICE_EXPORTS, {
    displayName: 'Service Exports',
    isCreatable: true,
    isEditable:  true,
    isRemovable: true,
    showAge:     true,
    namespaced:  true,
    showState:   true,
    canYaml:     true,
    customRoute: {
      name:   `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource`,
      params: {
        product:  CLUSTER_PRODUCT_NAME,
        resource: SERVICE_EXPORTS
      },
      meta: { product: CLUSTER_PRODUCT_NAME }
    }
  });
  clusterConfigureType(SERVICE__IMPORTS, {
    displayName: 'Service Imports',
    isCreatable: true,
    isEditable:  true,
    isRemovable: true,
    showAge:     true,
    showState:   true,
    namespaced:  true,
    canYaml:     true,
    customRoute: {
      name:   `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource`,
      params: {
        product:  CLUSTER_PRODUCT_NAME,
        resource: SERVICE__IMPORTS
      },
      meta: { product: CLUSTER_PRODUCT_NAME }
    }
  });
  clusterVirtualType({
    labelKey: 'mcs.nav.dashboard.label',
    name:     CLUSTER_DASHBOARD,
    route:    {
      name:   `c-cluster-${ CLUSTER_PRODUCT_NAME }-${ CLUSTER_DASHBOARD }`,
      params: { product: CLUSTER_PRODUCT_NAME },
      meta:   { product: CLUSTER_PRODUCT_NAME }
    }
  });

  clusterBasicType([CLUSTER_DASHBOARD, SERVICE__IMPORTS, SERVICE_EXPORTS]);
}
