import { ref, computed } from 'vue';
import { getAllValues } from '@shell/utils/object';
import formRulesGenerator from '@shell/utils/validators/formRules/index';

export function useFormValidation(value, store, fvExtraRules = { value: {} }) {
  const fvFormRuleSets = ref([]);
  const fvReportedValidationPaths = ref([]);

  function fvGetPathRules(path) {
    return fvRulesets.value.find((ruleset) => ruleset.path === path)?.rules || [];
  }

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

  const fvValidationErrors = computed(() => {
    const paths = fvRulesets.value.filter((ruleset) => !!ruleset.formValidationRule).map((ruleset) => ruleset.path);
    const formErrors = fvGetPathErrors(paths);
    const modelErrors = value.value.customValidationErrors ? value.value.customValidationErrors(value.value) : [];

    return [...formErrors, ...modelErrors];
  });

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
