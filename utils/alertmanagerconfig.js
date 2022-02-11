import jsyaml from 'js-yaml';
import { base64Decode, base64Encode } from '@/utils/crypto';
import { MONITORING, SECRET } from '@/config/types';
import { get, set } from '@/utils/object';
import isEmpty from 'lodash/isEmpty';
import { ROOT_NAME } from '@/models/monitoring.coreos.com.route';
import { ALERTINGDRIVERNEEDUPDATE, PANDARIAWEBHOOKKEY, PANDARIAWEBHOOKURL } from '@/models/monitoring.coreos.com.receiver';
const DEFAULT_SECRET_ID = 'cattle-monitoring-system/alertmanager-rancher-monitoring-alertmanager';
const ALERTMANAGER_ID = 'cattle-monitoring-system/rancher-monitoring-alertmanager';

// Pandaria alerting drivers
const ALERTING_DRIVERS_SECRET_ID = 'cattle-monitoring-system/alerting-drivers';
const ALERTING_DRIVERS_DEFAULT_URL = 'http://alerting-drivers.cattle-monitoring-system.svc:9094/';

export const FILENAME = 'alertmanager.yaml';
export const ALERTINGSECRETFILENAME = 'config.yaml';

export async function getSecretId(dispatch) {
  const alertManager = await dispatch('cluster/find', { type: MONITORING.ALERTMANAGER, id: ALERTMANAGER_ID }, { root: true });

  if (alertManager?.spec?.configSecret) {
    return `${ alertManager.namespace }/${ alertManager?.spec?.configSecret }`;
  }

  return DEFAULT_SECRET_ID;
}

export async function getSecret(dispatch) {
  const secretId = await getSecretId(dispatch, false);

  try {
    return await dispatch('cluster/find', { type: SECRET, id: secretId }, { root: true });
  } catch (ex) {
    const [namespace, name] = secretId.split('/');
    const secret = await dispatch('cluster/create', { type: SECRET }, { root: true });

    secret.metadata = {
      namespace,
      name
    };

    return secret;
  }
}

function extractConfig(secret) {
  secret.data = secret.data || {};
  const file = secret.data[FILENAME];
  const decodedFile = file ? base64Decode(file) : '{}';
  const config = jsyaml.load(decodedFile);

  config.receivers = config.receivers || [];
  config.route = config.route || {};
  config.route.routes = config.route.routes || [];

  return config;
}

export async function loadConfig(dispatch) {
  const secret = await getSecret(dispatch);

  return {
    config: extractConfig(secret),
    secret
  };
}

export async function updateConfig(dispatch, path, type, updateFn) {
  const { config, secret } = await loadConfig(dispatch);

  set(config, path, get(config, path) || []);
  setDefaultRouteNames(config.route.routes);

  const newValue = updateFn(get(config, path));

  // Pandaria aget alerting drivers config
  const { secret: alertingSecret, config: alertingSecretConfig } = await loadAlertingConfig(dispatch);
  const { encodedFile: alertingDriversFile, enableUpdate } = getAlertingDrivers(newValue, alertingSecretConfig);

  if (alertingSecret) {
    if (enableUpdate) {
      alertingSecret.data[ALERTINGSECRETFILENAME] = alertingDriversFile;

      await alertingSecret.save();

      newValue.forEach((ele) => {
        if (ele?.webhook_configs?.length > 0) {
          ele.webhook_configs.forEach((item, index) => {
            if (ALERTINGDRIVERNEEDUPDATE.includes(item.type)) {
              item.url = `${ ALERTING_DRIVERS_DEFAULT_URL }${ ele.name }-${ index }`;
            }
          });
        }
      });
    } else {
      const emptyFile = jsyaml.dump({
        receivers: {},
        providers: {}
      });
      const encodedEmptyFileFile = base64Encode(emptyFile);

      alertingSecret.data[ALERTINGSECRETFILENAME] = encodedEmptyFileFile;

      await alertingSecret.save();
    }
  }

  // Pandaria delete  pandaria-webhook field
  newValue.forEach((item) => {
    if (item.webhook_configs?.length > 0) {
      item.webhook_configs.forEach((ele) => {
        if (ALERTINGDRIVERNEEDUPDATE.includes(ele.type)) {
          delete ele.http_config;
          delete ele.type;
          delete ele.webhook_url;
        }
      });
    }
    delete item[PANDARIAWEBHOOKKEY];
  });

  set(config, path, newValue);

  const routes = config.route.routes;
  const rootIndex = routes.findIndex(route => route.name === ROOT_NAME);

  routes.forEach((route) => {
    if (route.name) {
      delete route.name;
    }
  });

  if (rootIndex >= 0) {
    const rootRoute = routes.splice(rootIndex, 1)[0];

    rootRoute.routes = routes;
    config.route = rootRoute;
  }

  const newFile = jsyaml.dump(config);
  const encodedFile = base64Encode(newFile);

  secret.data[FILENAME] = encodedFile;
  await secret.save();
}

export async function getAllReceivers(dispatch) {
  try {
    const { config, secret } = await loadConfig(dispatch);
    const receivers = config.receivers || [];
    const receiversWithName = receivers.filter(receiver => receiver.name);
    const mapped = receiversWithName.map(receiver => dispatch('cluster/create', {
      id:    receiver.name,
      spec:  receiver,
      type:  MONITORING.SPOOFED.RECEIVER,
      secret
    }, { root: true }));

    return Promise.all(mapped);
  } catch (ex) {
    return [];
  }
}

export async function getAllRoutes(dispatch) {
  try {
    const { config, secret } = await loadConfig(dispatch);

    config.route = config.route || {};
    config.route.name = ROOT_NAME;
    const routes = config.route?.routes || [];

    setDefaultRouteNames(routes);

    routes.push(config.route);

    const mapped = routes.map(route => dispatch('cluster/create', {
      id:    route.name,
      spec:  route,
      type:  MONITORING.SPOOFED.ROUTE,
      secret
    }, { root: true }));

    return Promise.all(mapped);
  } catch (ex) {
    return [];
  }
}

function setDefaultRouteNames(routes) {
  routes.forEach((route, i) => {
    route.name = route.name || createDefaultRouteName(i);
  });
}

export function createDefaultRouteName(index) {
  return `route-${ index }`;
}

export function areRoutesSupportedFormat(secret) {
  try {
    const config = extractConfig(secret);
    const routes = config.route?.routes || [];

    return !routes.some(isEmpty);
  } catch (ex) {
    return false;
  }
}

export function canCreate(rootGetters) {
  return rootGetters['type-map/optionsFor'](SECRET).isCreatable;
}

// Pandaria get all alerting drivers
export async function loadAlertingConfig(dispatch) {
  const secret = await getAlertingSecret(dispatch);

  return {
    secret,
    config: extractAlertingConfig(secret)
  };
}

export async function getAlertingSecret(dispatch) {
  try {
    return await dispatch('cluster/find', { type: SECRET, id: ALERTING_DRIVERS_SECRET_ID }, { root: true });
  } catch (ex) {
    const [namespace, name] = ALERTING_DRIVERS_SECRET_ID.split('/');
    const secret = await dispatch('cluster/create', { type: SECRET }, { root: true });

    secret.metadata = {
      namespace,
      name
    };

    return secret;
  }
}

function extractAlertingConfig(secret) {
  secret.data = secret.data || {};
  const file = secret.data[ALERTINGSECRETFILENAME];
  const decodedFile = file ? base64Decode(file) : '{}';
  const config = jsyaml.load(decodedFile);

  config.receivers = config.receivers || {};
  config.providers = config.providers || {};

  return config;
}

function getAlertingDrivers(data, alertingSecretConfig) {
  const receivers = {};
  const providers = {};
  let enableUpdate = false;

  if (data?.length > 0) {
    data.forEach((ele) => {
      if (ele?.webhook_configs?.length > 0) {
        ele.webhook_configs.forEach((item, index) => {
          // Overwriting with the original data when this data is not updated
          if (item.url?.startsWith(PANDARIAWEBHOOKURL)) {
            enableUpdate = true;
            const key = item.url.replace(PANDARIAWEBHOOKURL, '');

            receivers[key] = alertingSecretConfig.receivers[key];
            providers[key] = alertingSecretConfig.providers[key];
          }
          if (ALERTINGDRIVERNEEDUPDATE.includes(item.type)) {
            enableUpdate = true;
            const key = `${ ele.name }-${ index }`;
            const to = [];

            if (item.http_config.phone?.length > 0 ) {
              item.http_config.phone.forEach((p) => {
                to.push(p);
              });
              delete item.http_config.phone;
            }
            const newData = Object.assign({
              type:        item.type,
              webhook_url: item.webhook_url
            }, item.http_config);

            if (newData.tls_config) {
              delete newData.tls_config;
            }
            if (to.length > 0) {
              receivers[key] = {
                provider: key,
                to,
              };
            } else {
              receivers[key] = { provider: key };
            }
            providers[key] = newData;
          }
        });
      }
    });
  }

  const newFile = jsyaml.dump({
    receivers,
    providers
  });
  const encodedFile = base64Encode(newFile);

  return {
    encodedFile,
    enableUpdate
  };
}
