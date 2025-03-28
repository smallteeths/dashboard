export async function fetchResources({
  resource = '',
  plural,
  cloudCredentialId,
  store,
  externalParams = {},
  page = 1,
  pageSize = 50,
} = {}) {
  const resourceName = normalizeResourceName(resource || plural);
  const acceptLanguage = getAcceptLanguage();
  const url = `${ window.location.origin }/meta/ack/${ resourceName }`;
  const results = [];

  try {
    const data = await fetchPage(url, {
      cloudCredentialId,
      acceptLanguage,
      pageSize,
      pageNumber: page,
      ...externalParams,
    }, store);

    const items = extractItems(data, resource, plural);

    results.push(...items);

    const totalCount = data.TotalCount;
    const fetchedCount = pageSize * (page - 1) + items.length;

    if (totalCount > fetchedCount) {
      const nextPageResults = await fetchResources({
        resource,
        plural,
        cloudCredentialId,
        store,
        externalParams,
        page: page + 1,
        pageSize,
      });

      results.push(...nextPageResults);
    }

    return results;
  } catch (err) {
    throw err?.detail || err;
  }
}

function normalizeResourceName(name) {
  const normalized = toLowerCaseInitial(name);

  return normalized === 'vSwitch' ? 'vswitch' : normalized;
}

function getAcceptLanguage() {
  return 'zh-CN';
}

export async function fetchPage(url, query, store) {
  const req = {
    url:    `${ url }?${ getQueryParamsString(query) }`,
    method: 'GET',
  };

  return store.dispatch('cluster/request', req);
}

function extractItems(data, resource, plural) {
  if (!resource) return data;
  const current = data && data[plural][resource];

  return current?.map((item) => ({
    label: item[`${ resource }Id`],
    value: item[`${ resource }Id`],
    raw:   item,
  }));
}

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

export async function fetchAvailableResources({
  resource = '',
  plural,
  cloudCredentialId,
  store,
  externalParams = {},
} = {}) {
  const resourceName = normalizeResourceName(resource || plural);
  const acceptLanguage = getAcceptLanguage();
  const url = `${ window.location.origin }/meta/ack/${ resourceName }`;

  try {
    const res = await fetchPage(url, {
      cloudCredentialId,
      acceptLanguage,
      ...externalParams,
    }, store);

    return getAvailableResources(res);
  } catch (err) {
    throw err?.detail || err;
  }
}

function getAvailableResources(res) {
  const results = [];
  const zones = res['AvailableZones'];

  if (!zones) {
    return results;
  }

  zones.AvailableZone.forEach((zone) => {
    zone['AvailableResources']['AvailableResource'].forEach((resource) => {
      resource['SupportedResources']['SupportedResource'].forEach((support) => {
        if ( support.Status === 'Available' && results.indexOf(support.Value) === -1 ) {
          results.push(support.Value);
        }
      });
    });
  });

  return results;
}
