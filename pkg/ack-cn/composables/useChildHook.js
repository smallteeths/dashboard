import { ref } from 'vue';
import { findBy } from '@shell/utils/array';
import { sortBy } from '@shell/utils/sort';

export const BEFORE_SAVE_HOOKS = '_beforeSaveHooks';
export const AFTER_SAVE_HOOKS = '_afterSaveHooks';

let NEXT_ID = 1;

export function useChildHook() {
  // 数据状态：hooks 存储
  const hooks = ref({
    [BEFORE_SAVE_HOOKS]: [],
    [AFTER_SAVE_HOOKS]:  [],
  });

  // 方法
  function registerBeforeHook(boundFn, name, priority = 99, boundFnContext) {
    _registerHook(BEFORE_SAVE_HOOKS, boundFn, name, priority, boundFnContext);
  }

  function unregisterBeforeSaveHook(name) {
    hooks.value[BEFORE_SAVE_HOOKS] = hooks.value[BEFORE_SAVE_HOOKS].filter((hook) => hook.name !== name);
  }

  function registerAfterHook(boundFn, name, priority = 99, boundFnContext) {
    _registerHook(AFTER_SAVE_HOOKS, boundFn, name, priority, boundFnContext);
  }

  async function applyHooks(key, ...args) {
    if (!key) {
      throw new Error('Must specify key');
    }

    const sortedHooks = sortBy(hooks.value[key] || [], ['priority', 'name']);
    const out = {};

    for (const x of sortedHooks) {
      out[x.name] = await x.fn.apply(x.fnContext || null, args);
    }

    return out;
  }

  function _registerHook(key, fn, name, priority, fnContext) {
    if (!key) {
      throw new Error('Must specify key');
    }

    if (!name) {
      name = `hook_${ NEXT_ID }`;
      NEXT_ID++;
    }

    if (!priority) {
      priority = 99;
    }

    const hookList = hooks.value[key];

    let entry = findBy(hookList, 'name', name);

    if (entry) {
      entry.priority = priority;
      entry.fn = fn;
      entry.fnContext = fnContext;
    } else {
      entry = {
        name,
        priority,
        fn,
        fnContext,
      };
      hookList.push(entry);
    }
  }

  return {
    registerBeforeHook,
    unregisterBeforeSaveHook,
    registerAfterHook,
    applyHooks,
  };
}
