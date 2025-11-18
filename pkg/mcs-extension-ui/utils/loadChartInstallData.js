import { MANAGEMENT, CAPI, SECRET } from '@shell/config/types';
import { base64Decode, base64Encode } from '@shell/utils/crypto';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isNil from 'lodash/isNil';
import set from 'lodash/set';

const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';

// get cidr
const setCIDRIfPresent = (out, propPath, mgc, keyPath, warnings, t) => {
  const v = get(mgc, keyPath);
  if (!isNil(v) && String(v).trim() !== '') {
    set(out, propPath, v);                   
  } else {
    warnings.push(t('mcs.errors.cidrMissing', { path: propPath }));
  }
};

const setIfPresent = (obj, path, val) => {
  if (!isNil(val) && val !== '') set(obj, path, val);
};

const toClusterPath = (input) => {
  const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  return `${url.host}/k8s/clusters/local`;
};

const safeB64Decode = (b64) => {
  try {
    return b64 ? base64Decode(b64) : '';
  } catch { return ''; }
};

const safeB64Encode = (b64) => {
  try {
    return b64 ? base64Encode(b64) : '';
  } catch { return ''; }
};

// Pass in the store and clusterId, and return all fields required for the installation page
// When clusterSetName is provided
export async function loadClusterInstallData(store, clusterId, t) {
  const warnings = [];
  if (!clusterId) {
    warnings.push(t('mcs.errors.missingClusterId'));
    return { clusterCIDR: '', serviceCIDR: '', submarinerBrokerUrl: '', submarinerPsk: '', submarinerToken: '', submarinerClusterID: '', cacerts: '', warnings };
  }

  // Fetch the cluster and basic settings
  const [provClusters, cacertsSetting, serverUrlSetting] = await Promise.all([
    store.dispatch('management/findAll', { type: CAPI.RANCHER_CLUSTER }),
    store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'cacerts' }).catch(err => { warnings.push(`${ t('mcs.errors.fetchCacertsFail') }:${ err?.message }`); return { value: '' }; }),
    store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'server-url' }).catch(err => { warnings.push(`${ t('mcs.errors.fetchServerUrlFail') }:${ err?.message }`); return { value: '' }; }),
  ]);

  const provCluster = provClusters?.find(p => p?.mgmt?.id === clusterId);
  const provName    = provCluster?.metadata?.name || '';
  const mgc         = provCluster?.spec?.rkeConfig?.machineGlobalConfig ?? {};

  // Parameters required by the chart
  const out = {
    clusterCIDR:         '',
    serviceCIDR:         '',
    submarinerBrokerUrl: serverUrlSetting?.value ? toClusterPath(serverUrlSetting.value) : '',
    submarinerPsk:       '',
    submarinerToken:     '',
    submarinerClusterID: '',
    cacerts:             safeB64Encode(cacertsSetting?.value),
    namespace:           '',
    warnings,
  };

  if (!provCluster) {
    warnings.push(t('mcs.errors.provNotFound'));
    return out;
  }

  setCIDRIfPresent(out, 'clusterCIDR',  mgc, 'cluster-cidr',  warnings, t);
  setCIDRIfPresent(out, 'serviceCIDR',  mgc, 'service-cidr',  warnings, t);

  // broker registration clustersets
  const canListClusterSet = store.getters['management/canList'](CLUSTER_SET);
  const [brokerData, clusterSets] = await Promise.all([
    provName
      ? store.dispatch('management/request', { url: `/mcs-api/registration?clusterName=${provName}` })
          .catch(err => { warnings.push(`${ t('mcs.errors.brokerRegisterFail') }:${ err.message }`); return null; })
      : Promise.resolve(null),
    canListClusterSet
      ? store.dispatch('management/findAll', { type: CLUSTER_SET }).catch(() => [])
      : Promise.resolve([]),
  ]);

  out.submarinerToken      = brokerData?.dataplane?.token || '';
  out.submarinerClusterID  = brokerData?.clusterID || '';
  const secretNS           = brokerData?.dataplane?.namespace || '';
  out.namespace            = secretNS;

  if (secretNS && provName && Array.isArray(clusterSets) && clusterSets.length) {
    const hit = clusterSets.find(cs => cs?.spec?.clusters && cs.spec.clusters[provName] !== undefined);
    const clusterSetName = hit?.metadata?.name;
    if (clusterSetName) {
      try {
        const sec = await store.dispatch('management/find', { type: SECRET, id: `${secretNS}/${clusterSetName}-psk` });
        out.submarinerPsk = safeB64Decode(sec?.data?.psk);
      } catch (e) {
        warnings.push(t('mcs.errors.pskFetchFail'));
      }
    } else {
      warnings.push(t('mcs.errors.clustersetNoMatch', { name: provName }));
    }
  }

  return out;
}

export function applyInstallDataToValue(
  value,
  data = {},
  installationType
) {
  const v = cloneDeep(value || {});

  // Override the value of global.installationType
  if (installationType) {
    setIfPresent(v, 'global.installationType', installationType);
  }

  // Configuration items required for the Submariner cluster
  if (installationType === 'submariner') {
    // Map to the data field
    const mapping = [
      ['submariner-operator.submariner.clusterId',   'submarinerClusterID'],
      ['submariner-operator.submariner.token',       'submarinerToken'],
      ['submariner-operator.submariner.clusterCidr', 'clusterCIDR'],
      ['submariner-operator.submariner.serviceCidr', 'serviceCIDR'],
      ['submariner-operator.broker.server',          'submarinerBrokerUrl'],
      ['submariner-operator.ipsec.psk',              'submarinerPsk'],
      ['submariner-operator.broker.token',           'submarinerToken'],
      ['submariner-operator.broker.ca',              'cacerts'],
      ['submariner-operator.broker.namespace',       'namespace']
    ];

    mapping.forEach(([dst, src]) => setIfPresent(v, dst, data?.[src]));
  }

  return v;
}

export async function deleteSubmarinerAndWait(store, currentCluster, {
  namespace = 'mcs-addon-system',
  name = 'submariner',
  group = 'submariner.io',
  version = 'v1alpha1',
  intervalMs = 1500,
  timeoutMs = 300000,
  onProgress = null,
  t,
  isClosed = () => false,
} = {}) {
  const progress = (msg) => {
    if (typeof onProgress === 'function') onProgress(msg);
  };
  const errors = [];
  const currentClusterName = currentCluster?.status?.clusterName;

  if (!currentClusterName) {
    const msg = t('mcs.errors.deleteNoClusterName');
    errors.push(msg);
    return { ok: false, errors: errors };
  }
  const base = `/k8s/clusters/${currentClusterName}`;
  const resPath = `${base}/apis/${group}/${version}/namespaces/${namespace}/submariners/${name}`;
  const req = (url, opt = {}) => store.dispatch('management/request', { url, ...opt });

  try {
    await req(resPath, { method: 'DELETE' });
    progress(t('mcs.errors.deletingCrs'));
  } catch (err) {
    // If it doesn’t exist in the first place. 
    // consider it successfully deleted.
    if (err.code === 404 || err.reason === 'NotFound') {
      return { ok: true, errors: errors };
    }
    errors.push(t('mcs.errors.deleteFailed'));

    return { ok: false, errors: errors };
  }

  // Poll req until a 404 is returned
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (isClosed()) return { ok: false, errors: [] };
    if (Date.now() - start > timeoutMs) {
      const msg = t('mcs.errors.deleteTimeout', { timeoutMs });
      errors.push(msg);
      progress(msg);
      return { ok: false, errors: errors };
    }

    try {
      await req(resPath, { method: 'GET' });
      // Wait for intervalMs before continuing
      progress(t('mcs.progress.waitingCleanup'));
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (err) {
      if (err.code === 404 || err.reason === 'NotFound') {
        progress(t('mcs.progress.cleared'));
        return { ok: true, errors: errors };
      }
      // Retry on other errors
      progress(t('mcs.progress.retrying'));
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

function actionInput(installedChart, applyData) {
  const ic = installedChart;
  const meta = ic?.chart?.metadata;
  const cfg  = cloneDeep(ic?.config);

  set(cfg, 'submariner-operator.broker.token', applyData.submarinerToken);
  set(cfg, 'submariner-operator.broker.namespace', applyData.ns);
  set(cfg, 'submariner-operator.submariner.clusterId', applyData.submarinerClusterID);
  set(cfg, 'submariner-operator.ipsec.psk', applyData.submarinerPsk);

  const CATALOG_ANNOTATIONS = {
    SOURCE_REPO_TYPE: 'catalog.cattle.io/ui-source-repo-type',
    SOURCE_REPO_NAME: 'catalog.cattle.io/ui-source-repo',
  };
  const reg = meta?.annotations[CATALOG_ANNOTATIONS.SOURCE_REPO_NAME] ?? 'pandaria-catalog'

  return {
    chartName:   meta?.name,
    version:     meta?.version,
    releaseName: ic?.name,
    description: meta?.description,
    annotations: {
      [CATALOG_ANNOTATIONS.SOURCE_REPO_TYPE]: 'cluster',
      [CATALOG_ANNOTATIONS.SOURCE_REPO_NAME]: reg,
    },
    values: cfg,
  };
}

export async function upgradeMcsExtChart({
  store,
  clusters,
  targetClusterset,
  t
}) {
  const CATALOG_APPS = 'catalog.cattle.io.apps';
  const SECRETANNO   = 'objectset.rio.cattle.io/owner-name';
  const SECRETNSANNO = 'objectset.rio.cattle.io/owner-namespace';
  const DEFAULTCMDOPTS = {
    cleanupOnFail: false,
    crds:          true,
    hooks:         true,
    force:         false,
    resetValues:   false,
    openApi:       true,
    wait:          true,
    timeout:       '600s',
    historyMax:    5,
  };

  const req = (url, opt = {}) => store.dispatch('management/request', { url, ...opt });

  try {
    const currentCluster = clusters?.[0];
    const currentClusterName = currentCluster?.status?.clusterName;
    if (!currentClusterName) {
      throw new Error(t('mcs.errors.deleteNoClusterName'));
    }

    let appsResp;
    try {
      appsResp = await req(`/k8s/clusters/${currentClusterName}/v1/${CATALOG_APPS}`);
    } catch (err) {
      throw new Error(t('mcs.errors.appListFetchFailed'));
    }

    const apps = appsResp?.data || [];
    const app  = apps.find(a => a?.spec?.chart?.metadata?.name === 'mcs-ext-chart');
    if (!app) {
      throw new Error(t('mcs.errors.appNotFound'));
    }

    // Get the Secret annotations that store chart values
    const secret   = app?.metadata?.annotations?.[SECRETANNO];
    const secretNS = app?.metadata?.annotations?.[SECRETNSANNO];
    if (!secret || !secretNS) {
      throw new Error(t('mcs.errors.secretAnnoMissing'));
    }

    // Read the chart values from the Secret
    let secretResp;
    try {
      secretResp = await req(
        `/k8s/clusters/${currentClusterName}/v1/secrets/${secretNS}/${secret}` +
        `?exclude=metadata.managedFields&includeHelmData=true`
      );
    } catch (e) {
      throw new Error(t('mcs.errors.valuesReadFailed'));
    }

    const installedChart = secretResp?.data?.release;
    if (!installedChart?.namespace) {
      throw new Error(t('mcs.errors.valuesReadFailed'));
    }

    // Generate upgrade parameters: fetch brokerData
    const applyData = {};
    try {
      const brokerData = await req(`/mcs-api/registration?clusterName=${currentCluster.nameDisplay}`);
      applyData.submarinerToken      = brokerData?.dataplane?.token || '';
      applyData.submarinerClusterID  = brokerData?.clusterID || '';
      applyData.ns                   = brokerData?.dataplane?.namespace || '';
    } catch (err) {
      throw new Error(t('mcs.errors.brokerFetchFailed'));
    }

    // PSK
    try {
      const sec = await store.dispatch('management/find', { type: 'secret', id: `${applyData.ns}/${targetClusterset}-psk` });
      applyData.submarinerPsk = safeB64Decode(sec?.data?.psk);
    } catch (e) {
      throw new Error(t('mcs.errors.badPsk'));
    }

    // update payload
    const chart = actionInput(installedChart, applyData);
    if (!chart?.releaseName) {
      throw new Error(t('mcs.errors.badReleaseName'));
    }
    const reg = chart?.annotations['catalog.cattle.io/ui-source-repo'] ?? 'pandaria-catalog';

    // update
    try {
      await req(
        `/k8s/clusters/${currentClusterName}/v1/catalog.cattle.io.clusterrepos/${reg}?action=upgrade`,
        {
          method: 'POST',
          data: {
            charts: [chart],
            ...DEFAULTCMDOPTS,
            namespace: installedChart.namespace,
          },
        }
      );
    } catch (err) {
      throw new Error(t('mcs.errors.chartUpgradeFailed'));
    }
  } catch (e) {
    throw new Error(t('mcs.errors.upgradeFailed'));
  }
}
