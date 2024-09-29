function objectToURIQueryString(query, prefix, connector) {
  return Object.keys(query).reduce((prev, key, index) => {
    if (index === 0 ) {
      prev += prefix === undefined ? '?' : prefix;
    } else {
      prev += connector || '&';
    }

    if (typeof query[key] === 'object') {
      const subQuery = objectToURIQueryString(query[key], '', ',');

      prev += `${ key }=${ encodeURIComponent(subQuery) }`;
    } else {
      prev += `${ key }=${ query[key] }`;
    }

    return prev;
  }, '');
}

export default {
  apiList({ dispatch }, { commitVal, url = null, headers = null } = {}) {
    return dispatch('rancher/request', { url, headers: headers || undefined }, { root: true });
  },
  loadExistedFlatnetworkSubnet({ dispatch, commit }, { cluster, query }) {
    const queryStr = objectToURIQueryString(query);

    return dispatch('apiList', { url: `/k8s/clusters/${ cluster }/apis/flatnetwork.pandaria.io/v1/namespaces/cattle-flat-network/flatnetworksubnets${ queryStr }` } ).then((res) => {
      commit('setExistedFlatnetworkSubnet', res.items || []);
    });
  },
  createFlatnetwork(store, { cluster, params }) {
    const { dispatch } = this;

    return dispatch('management/request', {
      url:    `/k8s/clusters/${ cluster }/apis/flatnetwork.pandaria.io/v1/namespaces/cattle-flat-network/flatnetworksubnets`,
      method: 'POST',
      data:   params,
    });
  },
  updateFlatnetwork(store, { cluster, params }) {
    const { dispatch } = this;

    return dispatch('management/request', {
      url:    `/k8s/clusters/${ cluster }/apis/flatnetwork.pandaria.io/v1/namespaces/cattle-flat-network/flatnetworksubnets/${ params.metadata.name }`,
      method: 'PUT',
      data:   params,
    });
  },
  loadFlatnetwork({ dispatch, commit }, { cluster, query }) {
    return dispatch('apiList', { url: `/k8s/clusters/${ cluster }/v1/flatnetwork.pandaria.io.flatnetworksubnets/cattle-flat-network/${ query }` } ).then((res) => {
      // commit('setMacvlanPods', res.items || []);

      return res;
    });
  },
  loadFlatnetworkIps({ dispatch, commit }, { cluster, query }) {
    const queryStr = objectToURIQueryString(query);
    const url = `/k8s/clusters/${ cluster }/apis/flatnetwork.pandaria.io/v1/flatnetworkips${ queryStr }`;

    return dispatch('apiList', { url } ).then((res) => {
      if (!query.continue) {
        commit('setFlatnetworkIpList', res.items || []);
      } else {
        commit('addFlatnetworkIpList', res.items || []);
      }

      const next = res.metadata?.continue;

      if (next) {
        dispatch('loadFlatnetworkIps', {
          cluster,
          query: {
            ...query,
            continue: next,
          }
        });
      }
    });
  },
  removeFlatnetwork({ commit }, { cluster, resource }) {
    const { dispatch } = this;

    dispatch('management/request', {
      url:    `/k8s/clusters/${ cluster }/v1/flatnetwork.pandaria.io.flatnetworksubnets/cattle-flat-network/${ resource.metadata.name }`,
      method: 'DELETE',
    });
  },
  loadFlatnetworkPods({ dispatch, commit }, { cluster, query }) {
    const queryStr = objectToURIQueryString(query);

    return dispatch('apiList', { url: `/k8s/clusters/${ cluster }/api/v1/pods${ queryStr }` } ).then((res) => {
      // commit('setMacvlanPods', res.items || []);

      return res.items || [];
    });
  },
};
