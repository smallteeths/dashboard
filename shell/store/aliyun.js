import { addObjects } from '@shell/utils/array';

const PAGE_SIZE = 50;
const MAX_RESULTS = 500;
const DEFAULT_GROUP = 'docker-machine';

function toLowerCaseInitial(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function getQueryParamsString(params, deep = false) {
  const keys = Object.keys(params).sort((a, b) => {
    return a < b ? -1 : 1;
  });

  return keys.map((key) => {
    if (params[key] === undefined) {
      return '';
    }

    return `${ key }${ deep ? encodeURIComponent('=') : '=' }${ encodeURIComponent(params[key]) }`;
  }).join(deep ? encodeURIComponent('&') : '&');
}

function getAvailableResources(res) {
  let results = [];
  const zones = res['AvailableZones'];

  if (!zones) {
    return results;
  }

  results = [
    ...new Set(
      (zones?.AvailableZone ?? [])
        .flatMap((z) => z?.AvailableResources?.AvailableResource ?? [])
        .flatMap((r) => r?.SupportedResources?.SupportedResource ?? [])
        .filter((s) => s?.Status === 'Available')
        .map((s) => s?.Value)
        .filter(Boolean)
    )
  ];

  return results;
}

function normalizeResourceName(resource, plural) {
  let name = resource ? toLowerCaseInitial(resource) : toLowerCaseInitial(plural);

  if (name === 'vSwitch') name = 'vswitch';

  return name;
}

function getAcceptLanguage(rootGetters) {
  return rootGetters['i18n/current']() === 'en-us' ? 'en-US' : 'zh-CN';
}

function isTokenPagination(resourceName) {
  return resourceName === 'securityGroup' || resourceName === 'instanceType';
}

export const state = function() {
  return { instanceTypes: [] };
};

export const getters = {
  // You could override these to do something based on the user, maybe.
  defaultValue() {
    return {
      resourceGroupId:    '',
      zone:               undefined,
      vpcId:              null,
      vswitchId:          null,
      instanceType:       null,
      imageId:            null,
      systemDiskCategory: null,
      diskCategory:       null,
      internetChargeType: 'PayByTraffic',
      securityGroup:      DEFAULT_GROUP,
      instanceChargeType: 'PostPaid',
      spotStrategy:       'NoSpot',
      spotDuration:       true,
      systemDiskSize:     {
        Max: 500,
        Min: 20,
      },
      dataDiskSize: {
        Max: 32768,
        Min: 20,
      },
      openPort: [
        '6443/tcp',
        '2379/tcp',
        '2380/tcp',
        '8472/udp',
        '4789/udp',
        '9796/tcp',
        '10256/tcp',
        '10250/tcp',
        '10251/tcp',
        '10252/tcp',
      ],
    };
  },

  defaultRegion() {
    return 'cn-hangzhou';
  }
};

export const mutations = {
  gotInstanceTypes(state, instanceTypes) {
    state.instanceTypes = instanceTypes;
  },
};

export const actions = {
  async fetchALY({ dispatch, commit, rootGetters }, {
    resource,
    plural,
    params = {},
  }) {
    if (!params?.cloudCredentialId) {
      return [];
    }

    const resourceName = normalizeResourceName(resource, plural);
    const acceptLanguage = getAcceptLanguage(rootGetters);
    const baseUrl = `/meta/aliyuncn/${ resourceName }`;

    if (resource === '') {
      const query = {
        ...params,
        acceptLanguage,
      };
      const res = await dispatch('rancher/request', {
        url:    `${ baseUrl }?${ getQueryParamsString(query) }`,
        method: 'GET',
      }, { root: true });

      return res;
    }
    const results = [];

    if (isTokenPagination(resourceName)) {
      let nextToken;

      while (true) {
        const query = {
          ...params,
          acceptLanguage,
          maxResults: resourceName === 'instanceType' ? MAX_RESULTS : PAGE_SIZE,
          ...(nextToken ? { nextToken } : {}),
        };

        const res = await dispatch('rancher/request', {
          url:    `${ baseUrl }?${ getQueryParamsString(query) }`,
          method: 'GET',
        }, { root: true });

        const pageData = res?.[plural]?.[resource] ?? [];

        addObjects(results, pageData);
        nextToken = res?.NextToken || res?.nextToken;
        if (!nextToken) break;
        if (!pageData?.length) break;
      }

      return results;
    } else {
      let page = 1;

      while (true) {
        const query = {
          ...params,
          acceptLanguage,
          pageSize:   PAGE_SIZE,
          pageNumber: page,
        };

        const res = await dispatch('rancher/request', {
          url:    `${ baseUrl }?${ getQueryParamsString(query) }`,
          method: 'GET',
        }, { root: true });

        const pageData = res?.[plural]?.[resource] ?? [];

        addObjects(results, pageData);

        const total = res?.TotalCount;

        if (typeof total === 'number') {
          const fetched = (PAGE_SIZE * (page - 1)) + pageData.length;

          if (fetched >= total) break;
        } else {
          if (pageData.length < PAGE_SIZE) break;
        }
        if (!pageData.length) break;
        page += 1;
      }

      return results;
    }
  },

  async fetchAvailableResource({ dispatch, rootGetters, state }, params) {
    const data = await dispatch('fetchALY', params);

    return getAvailableResources(data);
  },
  async regions({ dispatch }, params) {
    return await dispatch('fetchALY', {
      resource: 'Region',
      plural:   'Regions',
      params,
    });
  },
  async resourceGroups({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'ResourceGroup',
      plural:   'ResourceGroups',
      params,
    });

    return data;
  },
  async zones({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'Zone',
      plural:   'Zones',
      params,
    });

    return data;
  },
  async vpcs({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'Vpc',
      plural:   'Vpcs',
      params,
    });

    return data;
  },
  async vSwitches({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'VSwitch',
      plural:   'VSwitches',
      params,
    });

    return data;
  },
  async securityGroups({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'SecurityGroup',
      plural:   'SecurityGroups',
      params,
    });

    return data;
  },

  async instanceTypes({ dispatch, state, commit }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'InstanceType',
      plural:   'InstanceTypes',
      params,
    });

    commit('gotInstanceTypes', data);

    return data;
  },
  async availableInstanceTypes({ dispatch, state }, params) {
    const data = await dispatch('fetchAvailableResource', {
      resource: '',
      plural:   'AvailableResource',
      params,
    });

    return data;
  },
  async images({ dispatch }, params) {
    const data = await dispatch('fetchALY', {
      resource: 'Image',
      plural:   'Images',
      params,
    });

    return data.filter((obj) => obj.OSType === 'linux');
  },
  async systemDiskCategories({ dispatch }, params) {
    const data = await dispatch('fetchAvailableResource', {
      resource: '',
      plural:   'AvailableResource',
      params,
    });

    return data;
  },
  async dataDiskCategories({ dispatch }, params) {
    const data = await dispatch('fetchAvailableResource', {
      resource: '',
      plural:   'AvailableResource',
      params,
    });

    return data;
  },
};
