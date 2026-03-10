export async function fetchResources({
  resource = '',
  plural,
  cloudCredentialId,
  store,
  externalParams = {},
  page = 1,
  pageSize = 50,
  maxResults = 500,
} = {}) {
  const resourceName = normalizeResourceName(resource || plural);
  const acceptLanguage = getAcceptLanguage(store);
  const url = `${ window.location.origin }/meta/aliyuncn/${ resourceName }`;
  const results = [];

  try {
    // token pagination
    if (isTokenPagination(resourceName)) {
      let token = '';

      while (true) {
        const data = await fetchPage(url, {
          cloudCredentialId,
          acceptLanguage,
          maxResults: resourceName === 'instanceType' ? maxResults : pageSize,
          ...(token ? { nextToken: token } : {}),
          ...externalParams,
        }, store);
        const items = extractItems(data, resource, plural);

        if (!Array.isArray(items) || items.length === 0) {
          break;
        }

        results.push(...items);

        token = data?.NextToken || data?.nextToken;
        if (!token) {
          break;
        }
      }

      return results;
    }

    // pageNumber pagination
    let curPage = page;

    while (true) {
      const data = await fetchPage(
        url,
        {
          cloudCredentialId,
          acceptLanguage,
          pageSize,
          pageNumber: curPage,
          ...externalParams,
        },
        store
      );
      const items = extractItems(data, resource, plural);

      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      results.push(...items);

      const totalCount = data?.TotalCount;
      const fetchedCount = pageSize * curPage;

      if (typeof totalCount === 'number') {
        if (fetchedCount >= totalCount) break;
      } else {
        if (items.length < pageSize) break;
      }

      curPage += 1;
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

function isTokenPagination(resourceName) {
  return resourceName === 'securityGroup' || resourceName === 'instanceType';
}

function getAcceptLanguage(store) {
  let acceptLanguage = 'zh-CN';

  if (store.getters['i18n/current']() === 'en-us') {
    acceptLanguage = 'en-US';
  }

  return acceptLanguage;
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
  const acceptLanguage = getAcceptLanguage(store);
  const url = `${ window.location.origin }/meta/aliyuncn/${ resourceName }`;

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

export async function fetchAvailableResourcesRaw({
  resource = '',
  plural,
  cloudCredentialId,
  store,
  externalParams = {},
} = {}) {
  const resourceName = normalizeResourceName(resource || plural);
  const acceptLanguage = getAcceptLanguage(store);
  const url = `${ window.location.origin }/meta/aliyuncn/${ resourceName }`;

  try {
    const res = await fetchPage(url, {
      cloudCredentialId,
      acceptLanguage,
      ...externalParams,
    }, store);

    return res;
  } catch (err) {
    throw err?.detail || err;
  }
}

export async function fetchResourcesNoPagination({
  resource = '',
  plural,
  cloudCredentialId,
  store,
  externalParams = {},
} = {}) {
  const resourceName = normalizeResourceName(resource || plural);
  const acceptLanguage = getAcceptLanguage(store);
  const url = `${ window.location.origin }/meta/aliyuncn/${ resourceName }`;

  try {
    const results = await fetchPage(url, {
      cloudCredentialId,
      acceptLanguage,
      ...externalParams,
    }, store);

    return results;
  } catch (err) {
    throw err?.detail || err;
  }
}
