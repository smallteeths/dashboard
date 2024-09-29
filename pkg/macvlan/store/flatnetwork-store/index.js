import { FLATNETWORK_STORE } from '../../types';
import getters from './getters';
import actions from './actions';
import mutations from './mutations';

const emptyForm = {
  apiVersion: 'flatnetwork.pandaria.io/v1',
  kind:       'FlatNetworkSubnet',
  metadata:   {
    name:      '',
    namespace: 'cattle-flat-network',
    labels:    { project: '' },
  },
  spec: {
    vlan:          0,
    cidr:          '',
    flatMode:      'macvlan',
    gateway:       '',
    master:        '',
    mode:          'bridge',
    ranges:        [],
    routes:        [],
    routeSettings: {
      addNodeCIDR:               false,
      addPodIPToHost:            false,
      flatNetworkDefaultGateway: false,
      addServiceCIDR:            false,
      addClusterCIDR:            false,
    },
  }
};

const elementalFactory = () => {
  return {
    state() {
      return {
        flatnetworkIpList: [], existedFlatnetworkSubnet: [], emptyForm
      };
    },
    mutations: { ...mutations },
    getters:   { ...getters },
    actions:   { ...actions },
  };
};
const config = { namespace: FLATNETWORK_STORE };

export default {
  specifics: elementalFactory(),
  config
};
