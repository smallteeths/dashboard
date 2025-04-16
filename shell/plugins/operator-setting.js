import { allHashSettled } from '@shell/utils/promise';
const OPERATOR_SETTINGS_BASE_URL = 'v1/management.cattle.io.operatorsettings';

export default async function(context) {
  let operatorSettings = {};
  let needLoad = true;
  const hash = {};

  try {
    operatorSettings = await context.store.dispatch('management/request', {
      url:                  `${ OPERATOR_SETTINGS_BASE_URL }`,
      method:               'GET',
      headers:              { accept: 'application/json' },
      redirectUnauthorized: false,
    });
  } catch (err) {
    return;
  }

  const plugins = [];

  if (operatorSettings?.data?.length > 0) {
    operatorSettings?.data.forEach((operatorSetting) => {
      if (operatorSetting.id === 'ackoperatorsetting') {
        const jsUrl = operatorSetting.spec.url;

        if (!jsUrl) {
          return;
        }
        const processedUrl = processUrl(jsUrl);
        const version = getVersion(jsUrl);

        if (!isVueCode(processedUrl) || !version) {
          needLoad = false;
        }

        if (needLoad) {
          plugins.push({
            name:     'ack-operator-ui-v2',
            version,
            metadata: { direct: 'true' },
            endpoint: processedUrl,
          });
        }
      }
    });

    if (plugins.length === 0) {
      return;
    }

    plugins.forEach((plugin) => {
      hash[plugin.name] = context.$plugin.loadPluginAsync(plugin);
    });

    const pluginLoads = await allHashSettled(hash);

    // Some pluigns may have failed to load - store this
    Object.keys(pluginLoads).forEach((name) => {
      const res = pluginLoads[name];

      if (res?.status === 'rejected') {
        console.error(`Failed to load plugin: ${ name }. `, res.reason || 'Unknown reason'); // eslint-disable-line no-console

        // Record error in the uiplugins store, so that we can show this to the user
        context.store.dispatch('uiplugins/setError', { name, error: 'plugins.error.load' }); // i18n-uses plugins.error.load
      }
    });
  }
}

function processUrl(url) {
  const basePath = window.location.origin + window.location.pathname;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  } else {
    if (url.endsWith('.js')) {
      return basePath + url;
    }

    return `${ basePath + url }.js`;
  }
}

function isVueCode(url) {
  return url.endsWith('umd.min.js');
}

function getVersion(url) {
  const regex = /(ack|tke|cce)-operator-ui-v2-([\d.]+)\.umd\.min\.js/;
  const match = url.match(regex);

  return match ? match[2] : null;
}
