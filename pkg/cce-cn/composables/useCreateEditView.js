// useCreateEditView.js
import { ref, computed, getCurrentInstance } from 'vue';
import { useStore } from 'vuex';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { LAST_NAMESPACE } from '@shell/store/prefs';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { clear } from '@shell/utils/array';
import { DEFAULT_WORKSPACE } from '@shell/config/types';
import { handleConflict } from '@shell/plugins/dashboard-store/normalize';
import { useChildHook, BEFORE_SAVE_HOOKS, AFTER_SAVE_HOOKS } from './useChildHook';
import { base64Encode } from '@shell/utils/crypto';

export function useCreateEditView(props, context) {
  const {
    normanCluster, cceConfig, nodePools, state
  } = context;

  const errors = ref([]);
  const vm = getCurrentInstance();
  const $router = vm?.proxy?.$router;
  const $store = useStore();

  const { applyHooks } = useChildHook();

  const isCreate = computed(() => props.mode === _CREATE);
  const isEdit = computed(() => props.mode === _EDIT);
  const isView = computed(() => props.mode === _VIEW);

  const schema = computed(() => {
    const inStore = props.storeOverride || $store.getters['currentStore'](props.value.type);

    return $store.getters[`${ inStore }/schemaFor`](props.value.type);
  });

  const isNamespaced = computed(() => schema.value?.attributes?.namespaced || false);

  const labels = computed({
    get: () => props.value?.labels,
    set: (neu) => props.value.setLabels(neu),
  });

  const annotations = computed({
    get: () => props.value?.annotations,
    set: (neu) => props.value.setAnnotations(neu),
  });

  const doneRoute = computed(() => {
    return props.value?.listLocation?.name;
  });

  function done() {
    if (!doneRoute.value) {
      return;
    }
    $router.replace({ name: doneRoute.value });
  }

  async function conflict() {
    return await handleConflict(
      props.initialValue?.toJSON(),
      props.value,
      props.liveValue,
      $store.getters,
      $store,
      props.storeOverride || $store.getters['currentStore'](props.value.type)
    );
  }

  async function save(buttonDone, url, depth = 0) {
    if (errors.value) {
      clear(errors.value);
    }

    try {
      await applyHooks(BEFORE_SAVE_HOOKS, props.value);

      if (props.value?.metadata?.labels && Object.keys(props.value.metadata.labels || {}).length === 0) {
        delete props.value.metadata.labels;
      }
      if (props.value?.metadata?.annotations && Object.keys(props.value.metadata.annotations || {}).length === 0) {
        delete props.value.metadata.annotations;
      }

      if (isCreate.value) {
        const ns = props.value?.metadata?.namespace;

        if (ns && ns !== DEFAULT_WORKSPACE) {
          $store.dispatch('prefs/set', { key: LAST_NAMESPACE, value: ns }, { root: true });
        }
      }

      await actuallySave(url);

      if ($store.getters['type-map/isSpoofed'](props.value.type)) {
        await $store.dispatch('cluster/findAll', { type: props.value.type, opt: { force: true } }, { root: true });
      }

      await applyHooks(AFTER_SAVE_HOOKS, props.value);
      buttonDone && buttonDone(true);
      done();
    } catch (err) {
      if (err.status === 409 && depth === 0 && isEdit.value) {
        const conflictErrors = await conflict();

        if (conflictErrors === false) {
          return save(buttonDone, url, depth + 1);
        } else {
          errors.value = conflictErrors;
        }
      } else {
        errors.value = exceptionToErrorsArray(err);
      }
      buttonDone && buttonDone(false);
    }
  }

  async function actuallySave() {
    if (cceConfig.value.imported && cceConfig.value.clusterID) {
      normanCluster.value.cceConfig = cceConfig.value;
      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    normanCluster.value.cceConfig = formatCceConfig();

    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function formatCceConfig() {
    const nodePoolList = [];
    const {
      regionID,
      huaweiCredentialSecret,
      category,
      containerNetworkCidr,
      kubernetesSvcIPRange,
      containerNetworkMode,
      version,
      clusterFlavor,
      vpcId,
      subnetId,
      description,
      tags,
      authentiactionMode,
      eipType,
      eipChargeMode,
      eipBandwidthSize,
      securityGroup,
      clusterExternalIP,
      kubeProxyMode
    } = cceConfig.value;
    const eniNetwork = { subnets: state.value.eniNetworks };
    const eipSelection = state.value.eipSelection;

    nodePools.value.forEach((nodePool) => {
      const out = {
        name:             nodePool.name,
        type:             'vm',
        initialNodeCount: nodePool.initialNodeCount,
        nodeTemplate:     {
          flavor:          nodePool.flavor,
          availableZone:   nodePool.availableZone,
          operatingSystem: nodePool.operatingSystem,
          sshKey:          nodePool.sshKey,
          rootVolume:      {
            size: nodePool.rootVolumeSize,
            type: nodePool.rootVolumeType,
          },
          dataVolumes: [{
            size: nodePool.dataVolumeSize,
            type: nodePool.dataVolumeType,
          }],
          count:       1,
          billingMode: nodePool.billingMode,
          runtime:     nodePool.runtime,
        },
        customSecurityGroups: [],
      };

      if (nodePool.nodePoolID) {
        out.nodePoolID = nodePool.nodePoolID;
      }

      if (nodePool.billingMode === 1) {
        const validityPeriod = nodePool?.validityPeriod.split(' ');

        out.nodeTemplate.extendParam = {
          periodType:  validityPeriod[1],
          periodNum:   validityPeriod[0],
          isAutoRenew: nodePool.bmsIsAutoRenew
        };
      }

      nodePoolList.push(out);
    });

    const config = {
      name:             normanCluster.value.name,
      type:             'VirtualMachine',
      category,
      huaweiCredentialSecret,
      regionID,
      imported:         false,
      containerNetwork: {
        cidr: containerNetworkCidr,
        mode: containerNetworkMode
      },
      version,
      flavor:      clusterFlavor,
      hostNetwork: {
        vpcID:    vpcId === 'default' ? '' : vpcId,
        subnetID: subnetId === 'default' ? '' : subnetId,
        securityGroup,
      },
      kubernetesSvcIPRange,
      description,
      authentication: { mode: authentiactionMode },
      tags,
      publicAccess:   eipSelection !== 'none',
      nodePools:      nodePoolList,
      extendParam:    {},
      kubeProxyMode,
      eniNetwork,
    };

    // eip config
    if (config.publicAccess) {
      if (eipSelection === 'new') {
        config.publicIP = {
          createEIP: true,
          eip:       {
            ipType:    eipType,
            bandwidth: {
              chargeMode: eipChargeMode,
              size:       eipBandwidthSize,
              shareType:  'PER'
            }
          }
        };
      } else if (eipSelection === 'exist') {
        config.extendParam.clusterExternalIP = clusterExternalIP;
      }
    }

    // ca config
    if (authentiactionMode === 'authenticating_proxy') {
      const { authenticatingProxyCa, authenticatingProxyCert, authenticatingProxyPrivateKey } = cceConfig.value;

      config.authentication.authenticatingProxy = {
        ca:         base64Encode(authenticatingProxyCa),
        cert:       base64Encode(authenticatingProxyCert),
        privateKey: base64Encode(authenticatingProxyPrivateKey),
      };
    }

    return config;
  }

  function setErrors(newErrors) {
    errors.value = newErrors;
  }

  return {
    errors,
    isCreate,
    isEdit,
    isView,
    schema,
    isNamespaced,
    labels,
    annotations,
    doneRoute,
    done,
    save,
    actuallySave,
    setErrors,
  };
}
