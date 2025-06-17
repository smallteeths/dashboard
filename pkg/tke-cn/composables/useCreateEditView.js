// useCreateEditView.js
import { computed } from 'vue';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { useRouter, useRoute } from 'vue-router';


export function useCreateEditView(props, context) {
  const {
    normanCluster, tkeConfig, nodePools, state
  } = context;

  const $router = useRouter();
  const $route = useRoute();

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

  // 如果需要可以通过调用这个函数快速的执行 done 操作
  function done() {
    if (!doneRoute.value) {
      return;
    }
    $router.replace({
      name:   doneRoute.value,
    });
  }

  async function save(buttonDone, url, depth = 0) {
    try {
      await actuallySave(url);
      buttonDone && buttonDone(true);
      done();
    } catch (err) {
      state.value.errors = exceptionToErrorsArray(err);
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

  return {
    done,
    save,
  };
}
