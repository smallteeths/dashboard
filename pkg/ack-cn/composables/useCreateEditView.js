// useCreateEditView.js
import { ref, computed } from 'vue';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { useRouter, useRoute } from 'vue-router';
import { LAST_NAMESPACE } from '@shell/store/prefs';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { useStore } from 'vuex';
import { clear } from '@shell/utils/array';
import { DEFAULT_WORKSPACE } from '@shell/config/types';
import { handleConflict } from '@shell/plugins/dashboard-store/normalize';
import { useChildHook, BEFORE_SAVE_HOOKS, AFTER_SAVE_HOOKS } from './useChildHook';

export function useCreateEditView(props, context) {
  const {
    emit, normanCluster, ackConfig, nodePools, state
  } = context;

  const errors = ref([]);

  const $router = useRouter();
  const $route = useRoute();
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
    if (props.value?.doneRoute) {
      return props.value.doneRoute;
    }
    let name = $route.name;

    if (name?.endsWith('-id')) {
      name = name.replace(/(-namespace)?-id$/, '');
    } else if (name?.endsWith('-create')) {
      name = name.replace(/-create$/, '');
    }

    return name;
  });

  const doneParams = computed(() => {
    if (props.value?.doneParams) {
      return props.value.doneParams;
    }
    const out = { ...$route.params };

    delete out.namespace;
    delete out.id;

    return out;
  });

  function done() {
    if (props.doneEvent) {
      emit('done');

      return;
    }
    if (props.doneLocationOverride) {
      return $router.replace(props.doneLocationOverride);
    }
    if (!doneRoute.value) {
      return;
    }
    $router.replace({
      name:   doneRoute.value,
      params: doneParams.value || { resource: props.value.type },
    });
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
    if (ackConfig.value.imported && ackConfig.value.cluster_id) {
      normanCluster.value.ackConfig = ackConfig.value;
      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    ackConfig.value.node_pool_list = nodePools.value;
    normanCluster.value.ackConfig = formatNodePoolList(ackConfig);
    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function formatNodePoolList(ackConfig) {
    const nodePools = ackConfig.value.node_pool_list;

    ackConfig.value.node_pool_list = nodePools.map((item) => {
      const node = {
        ...item,
        nodepool_id:          item.nodepool_id,
        name:                 item.name,
        instance_types:       [item.instance_types],
        instances_num:        item.instances_num,
        key_pair:             item.key_pair || this.config.keyPair,
        platform:             item.platform,
        system_disk_category: item.system_disk_category,
        system_disk_size:     item.system_disk_size,
        runtime:              item.runtime,
        runtime_version:      item.runtime_version,
        data_disk:            (!item.size || !item.category) ? [] : [{
          size:     item.size,
          category: item.category,
        }],
        // All nodepools use the same v_switch_ids
        v_switch_ids: state.value.vswitchIds
      };

      delete node.isNew;
      delete node.size;
      delete node.category;

      return node;
    });

    return ackConfig.value;
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
    doneParams,
    done,
    save,
    actuallySave,
    setErrors,
  };
}
