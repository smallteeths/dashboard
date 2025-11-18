// Don't forget to create a VueJS page called index.vue in the /pages folder!!!
import ViewResource from '@shell/pages/c/_cluster/_product/_resource/_id.vue';
import ViewNamespacedResource from '@shell/pages/c/_cluster/_product/_resource/_namespace/_id.vue';
import CreateResource from '@shell/pages/c/_cluster/_product/_resource/create.vue';
import ListResource from '@shell/pages/c/_cluster/_product/_resource/index.vue';

import ClusterDashboard from '../pages/clusterDashboard.vue';
import GlobalDashboard from '../pages/globalDashboard.vue';
import ListClusterSets from '../pages/index.vue';

const BLANK_CLUSTER = '_';
const PRODUCT_NAME = 'globalMultiClusterService';
const CLUSTER_PRODUCT_NAME = 'multiClusterService';

const routes = [
  {
    name:      `${ PRODUCT_NAME }-c-cluster-globalDashboard`,
    path:      `/${ PRODUCT_NAME }/c/:cluster/globalDashboard`,
    component: GlobalDashboard,
    meta:      {
      product: PRODUCT_NAME,
      cluster: BLANK_CLUSTER,
    },
  },
  {
    name:      `${ PRODUCT_NAME }-c-cluster-resource`,
    path:      `/${ PRODUCT_NAME }/c/:cluster/:resource`,
    // component: ClusterSets,
    component: ListClusterSets,
    // params: {
    //   product: PRODUCT_NAME,
    //   cluster: BLANK_CLUSTER
    // },
    meta:      {
      product: PRODUCT_NAME,
      cluster: BLANK_CLUSTER,
    },
  },

  {
    name:      `${ PRODUCT_NAME }-c-cluster-resource-create`,
    path:      `/${ PRODUCT_NAME }/c/:cluster/:resource/create`,
    component: CreateResource,
    meta:      {
      product: PRODUCT_NAME,
      cluster: BLANK_CLUSTER
    },
  },
  {
    name:      `${ PRODUCT_NAME }-c-cluster-resource-id`,
    path:      `/${ PRODUCT_NAME }/c/:cluster/:resource/:id`,
    component: ViewResource,
    meta:      {
      product: PRODUCT_NAME,
      cluster: BLANK_CLUSTER
    },
  },

  {
    name:      `c-cluster-${ CLUSTER_PRODUCT_NAME }-clusterDashboard`,
    path:      `/c/:cluster/${ CLUSTER_PRODUCT_NAME }/clusterDashboard`,
    component: ClusterDashboard,
    meta:      { product: CLUSTER_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource`,
    path:      `/c/:cluster/${ CLUSTER_PRODUCT_NAME }/:resource`,
    component: ListResource,
    meta:      { product: CLUSTER_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource-create`,
    path:      `/c/:cluster/${ CLUSTER_PRODUCT_NAME }/:resource/create`,
    component: CreateResource,
    meta:      { product: CLUSTER_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource-id`,
    path:      `/c/:cluster/${ CLUSTER_PRODUCT_NAME }/:resource/:id`,
    component: ViewResource,
    meta:      { product: CLUSTER_PRODUCT_NAME },
  },
  {
    name:      `c-cluster-${ CLUSTER_PRODUCT_NAME }-resource-namespace-id`,
    path:      `/c/:cluster/${ CLUSTER_PRODUCT_NAME }/:resource/:namespace/:id`,
    component: ViewNamespacedResource,
    meta:      { product: CLUSTER_PRODUCT_NAME },
  },
];

export default routes;
