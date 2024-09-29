import { MACVLAN_PRODUCT_NAME, MACVLAN_IP_PRODUCT_NAME, MACVLAN_IP_PRODUCT_NAME_V2 } from '../config/macvlan-types';
import MacvlanResourceIps from '../pages/macvlanIp.vue';
import FlatnetworkResourceIps from '../pages/flatnetworkIp.vue';
import InstallView from '../components/InstallView.vue';

const routes = [
  {
    name:      `${ MACVLAN_PRODUCT_NAME }-c-cluster-resource-install`,
    path:      `/c/:cluster/:product/installView/:version`,
    component: InstallView
  },
  {
    name:      `${ MACVLAN_IP_PRODUCT_NAME }-c-cluster-resource-ip`,
    path:      `/c/:cluster/:product/:resource/ip/:id/v1`,
    component: MacvlanResourceIps,
  },
  {
    name:      `${ MACVLAN_IP_PRODUCT_NAME_V2 }-c-cluster-resource-ip`,
    path:      `/c/:cluster/:product/:resource/ip/:id/v2`,
    component: FlatnetworkResourceIps,
  },
];

export default routes;
