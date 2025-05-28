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

export async function queryHuawei({
  resource = '',
  cloudCredentialId,
  store,
  externalParams = {},
} = {}) {
  const url = `/meta/cce/${ resource }`;
  const query = Object.assign({}, externalParams, { cloudCredentialId });

  const req = {
    url:    `${ url }?${ getQueryParamsString(query) }`,
    method: 'GET',
  };

  try {
    const res = store.dispatch('cluster/request', req);

    return res.body || res;
  } catch (err) {
    let message = err?.body?.message;

    if (message) {
      try {
        const obj = JSON.parse(message);

        if (obj.error_message) {
          message = obj.error_message;
        }
      } catch {
        message = '';
      }
    }

    const error = message || err?.body?.error || JSON.stringify(err);

    throw error;
  }
}
