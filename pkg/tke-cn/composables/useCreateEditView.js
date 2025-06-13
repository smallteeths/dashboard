// useCreateEditView.js
import { ref, computed, getCurrentInstance } from 'vue';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { LAST_NAMESPACE } from '@shell/store/prefs';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { clear } from '@shell/utils/array';
import { DEFAULT_WORKSPACE } from '@shell/config/types';
import { handleConflict } from '@shell/plugins/dashboard-store/normalize';
import { useChildHook, BEFORE_SAVE_HOOKS, AFTER_SAVE_HOOKS } from './useChildHook';

export function useCreateEditView(props, context) {
  const {
    emit, normanCluster, tkeConfig, nodePools, state
  } = context;

  const errors = ref([]);

  // 获得当前 vue 实例的
  const instance = getCurrentInstance();
  // 获取 Router 实例主要作用是执行陆游的跳转
  const $router = instance.appContext.config.globalProperties.$router;
  // 获取 route 目的是获取 url 参数 `route.path`
  const $route = instance.appContext.config.globalProperties.$route;
  // 获取 vuex 
  const $store = instance.appContext.config.globalProperties.$store;

  // apply hooks 主要是实现了一些钩子函数，让保存的前后都可以去执行这个钩子函数处理单独的逻辑
  const { applyHooks } = useChildHook();

  const isCreate = computed(() => props.mode === _CREATE);
  const isEdit = computed(() => props.mode === _EDIT);
  const isView = computed(() => props.mode === _VIEW);

  // 当前资源的 schema
  const schema = computed(() => {
    const inStore = props.storeOverride || $store.getters['currentStore'](props.value.type);

    return $store.getters[`${ inStore }/schemaFor`](props.value.type);
  });

  // 判断当前资源类型是否是“命名空间级”资源，`这个 computed 是一个通用的逻辑，我们的组件如果需要可以直接调用`
  const isNamespaced = computed(() => schema.value?.attributes?.namespaced || false);

  // 通用的 get labels 和 set labels 的逻辑 `这个 computed 是一个通用的逻辑，我们的组件如果需要可以直接调用` 这个写法类似双向数据绑定，
  // 在我们使用 labels.value == xxx 时，会调用 props.value.setLabels(neu) 
  const labels = computed({
    get: () => props.value?.labels,
    set: (neu) => props.value.setLabels(neu),
  });

  // anno 同理 label
  const annotations = computed({
    get: () => props.value?.annotations,
    set: (neu) => props.value.setAnnotations(neu),
  });

  // 这个 doneRoute 用来保存，当我们执行完 save 之后，返回的路径，如果我们时 cluster 的类型一般就返回 /clusters。
  // 这样我们保存完之后直接会跳转到 clusters 的列表
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

  // 这个 doneParams 如果需要会配合 doneRoute 结束时传入陆游对应的参数
  const doneParams = computed(() => {
    if (props.value?.doneParams) {
      return props.value.doneParams;
    }
    const out = { ...$route.params };

    delete out.namespace;
    delete out.id;

    return out;
  });

  // 如果需要可以通过调用这个函数快速的执行 done 操作
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

  // 这个方法是为了我们通用的编辑 yaml 的逻辑。当我们保存 yaml 时
  // 如果错误返回是 409 冲突那么，我们会把冲突的字段给放到 errors 里面
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
      // 执行 baforsave 的操作，这里的 hook 可以在我们的函数里调用来注册这些 hook。
      await applyHooks(BEFORE_SAVE_HOOKS, props.value);

      if (props.value?.metadata?.labels && Object.keys(props.value.metadata.labels || {}).length === 0) {
        delete props.value.metadata.labels;
      }
      if (props.value?.metadata?.annotations && Object.keys(props.value.metadata.annotations || {}).length === 0) {
        delete props.value.metadata.annotations;
      }

      // 这个逻辑是修改全局默认的 ns 对我们的逻辑不受影响
      if (isCreate.value) {
        const ns = props.value?.metadata?.namespace;

        if (ns && ns !== DEFAULT_WORKSPACE) {
          $store.dispatch('prefs/set', { key: LAST_NAMESPACE, value: ns }, { root: true });
        }
      }

      // 其实我们的逻辑就需要这个
      await actuallySave(url);

      // 判断当前是不是 nav 之类的伪造的数据类型，如果是的话强制刷新下
      if ($store.getters['type-map/isSpoofed'](props.value.type)) {
        await $store.dispatch('cluster/findAll', { type: props.value.type, opt: { force: true } }, { root: true });
      }

      // 保存之后执行
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
    if (tkeConfig.value.imported && tkeConfig.value.clusterID) {
      normanCluster.value.tkeConfig = tkeConfig.value;
      console.log(tkeConfig)
      // await normanCluster.value.save();

      // return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    normanCluster.value.cceConfig = formatCceConfig();

    // await normanCluster.value.save();

    // return await normanCluster.value.waitForCondition('InitialRolesPopulated');
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
