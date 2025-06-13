import { ref, computed } from 'vue';
import { getAllValues } from '@shell/utils/object';
import formRulesGenerator from '@shell/utils/validators/formRules/index';

export function useFormValidation(value, store, fvExtraRules = { value: {} }) {
  const fvFormRuleSets = ref([]);
  const fvReportedValidationPaths = ref([]);

  // fvGetPathRules 会返回对应 path 全部的验证规则
  function fvGetPathRules(path) {
    // fvRulestes 是一个计算属性，主要功能是动态的返回
    // fvRulestes 返回的是一个数组结构如下
    /**
    * [{
    *   path: "nameRequired"
    *   rules: [
    *   xxx: () => {},
    *   xxx: () => {}
    *  ]
    * }]
    */
    return fvRulesets.value.find((ruleset) => ruleset.path === path)?.rules || [];
  }

  // fvReportedValidationPaths 已经触发的 validation
  // 在这个方法里记录了 fvReportedValidationPaths 已经触发的 validation
  // 为什么要这个方法是因为比如在 input 组件里 rules 默认是一个 () => {} 方法
  // 这个 rules 方法会在 input 组件双向绑定的数据 update 时候调用
  // 这时候调用就会需要把已经触发的 validationPath 放到 fvReportedValidationPaths 里
  // 这个 fvReportedValidationPaths 在统一保存时会用到
  function fvGetAndReportPathRules(path) {
    const rules = fvGetPathRules(path);

    if (rules.length > 0 && !fvReportedValidationPaths.value.includes(path)) {
      fvReportedValidationPaths.value = [...fvReportedValidationPaths.value, path];
    }

    return rules;
  }

  function fvGetPathValues(path) {
    const relevantRuleset = fvRulesets.value.find((ruleset) => ruleset.path === path);

    if (!relevantRuleset) {
      return [];
    }

    return getAllValues(relevantRuleset?.rootObject || value.value, relevantRuleset?.path);
  }

  function fvGetValues(val, idx, arr) {
    return (arr.length > 1 &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      val !== null ? { ...val, idx } : val
    );
  }


  function fvGetPathErrors(paths = []) {
    const messages = paths.reduce((acc, path) => {
      const pathErrors = [];
      const relevantRules = fvGetPathRules(path);
      const relevantValues = fvGetPathValues(path).map(fvGetValues);

      relevantRules.forEach((rule) => {
        relevantValues.forEach((value) => {
          pathErrors.push(rule(value));
        });
      });

      return [...acc, ...pathErrors].filter(Boolean);
    }, []);

    return messages;
  }

  const fvRulesets = computed(() => {
    const nullValidator = () => undefined;

    return [
      ...fvFormRuleSets.value.map((ruleset) => {
        const formRules = {
          ...formRulesGenerator(
            store.getters['i18n/t'],
            { displayKey: ruleset?.translationKey ? store.getters['i18n/t'](ruleset.translationKey) : 'Value' }
          ),
          ...fvExtraRules.value,
        };

        return {
          ...ruleset,
          rules:              ruleset.rules.map((rule) => formRules[rule] || nullValidator),
          formValidationRule: true,
        };
      }),
      ...(value.value?.modelValidationRules || []).map((rule) => ({
        ...rule,
        formValidationRule: false,
      })),
    ];
  });

  const fvUnreportedValidationErrors = computed(() => {
    const paths = fvRulesets.value
      .filter((ruleset) => !!ruleset.formValidationRule && !fvReportedValidationPaths.value.includes(ruleset.path))
      .map((ruleset) => ruleset.path);

    const formErrors = fvGetPathErrors(paths);
    const modelErrors = value.value.customValidationErrors ? value.value.customValidationErrors(value.value, fvReportedValidationPaths.value) : [];

    return [...formErrors, ...modelErrors];
  });

  // fvValidationErrors 为什么会在 rules 监听的属性变化而触发的原因是
  // fvRulesets 也是一个 computed
  // 我们在给 fvFormRuleSets 传入值时比如 nameRequired: CCEValidators.nameRequired(normanCluster, intl)
  // 这里 CCEValidators.nameRequired 是一个闭包函数
  // 这里用闭包函数的作用是，这个函数它把外部的依赖（normanCluster、intl）等信息先打包进去。
  // 这样我们 rule 在运行的时候就不光可以拿到变化的值，也可以拿到所有数据这样更好验证
  // 为什么每次 normanCluster.name 属性的变动的都会触发这个 computed 下面描述下它复杂的依赖关系
  // fvValidationErrors computed -> fvRulesets computed-> fvExtraRules computed-> normanCluster/tkeconfig/nodepool 所以每次变更都会触发
  const fvValidationErrors = computed(() => {
    // formValidationRule 为 false 时表示 schema 自带的验证逻辑
    const paths = fvRulesets.value.filter((ruleset) => !!ruleset.formValidationRule).map((ruleset) => ruleset.path);
    const formErrors = fvGetPathErrors(paths);
    // 自定义验证逻辑逻辑需要赋值给 customValidationErrors
    const modelErrors = value.value.customValidationErrors ? value.value.customValidationErrors(value.value) : [];

    return [...formErrors, ...modelErrors];
  });

  // 在 cruresource 里面有一个 canSave 属性，监听的是 fvFormIsValid
  // 这是一个多重的 computed
  // fvValidationErrors 也是一个 computed
  const fvFormIsValid = computed(() => {
    return fvValidationErrors.value.length === 0;
  });

  return {
    fvFormRuleSets,
    fvReportedValidationPaths,
    fvGetPathRules,
    fvGetAndReportPathRules,
    fvGetPathValues,
    fvGetPathErrors,
    fvRulesets,
    fvUnreportedValidationErrors,
    fvValidationErrors,
    fvFormIsValid,
  };
}
