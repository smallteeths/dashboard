<script setup>
import {
  ref, onMounted, computed, watch, getCurrentInstance
} from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import { _IMPORT } from '@shell/config/query-params';
import CruResource from '@shell/components/CruResource.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import TKEValidators from '../util/validators';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { useFormValidation } from '../composables/useFormValidation.js';

const props = defineProps({
  mode: {
    type:     String,
    required: true
  },
  value: {
    type:    Object,
    default: () => {
      return {};
    }
  }
});
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const tkeConfig = ref({});
const normanCluster = ref({});
const nodePools = ref([]);
const instance = getCurrentInstance();
const router = useRouter()
const query = router.currentRoute.value.query
const isImport = query?.mode === _IMPORT;

// 需要提供给验证逻辑的所有规则
const fvExtraRules = computed(() => {
  let out = {};

  if (hasCredential.value) {
    // 通用验证规则
    const commonRules = {
      nameRequired:     TKEValidators.nameRequired(normanCluster, intl),
    };
    // 判断是否是 import 集群
    const isImportMode = isImport.value || tkeConfig.value.imported;
    const nonImportRules = !isImportMode ? {} : {};
    // 引入集群的验证规则
    const importRules = isImportMode ? { clusterIDRequired: TKEValidators.clusterIDRequired(tkeConfig, intl) } : {};

    out = {
      ...commonRules,
      ...nonImportRules,
      ...importRules,
    };
  }

  return out;
});

const {
  // fvFormRuleSets
  // fvGetAndReportPathRules 会通过传入的参数通过 fvFormRuleSets 找到对应的 rules
  fvFormRuleSets,
  // 在 useFormValidation 方法里有说明，在这个函数里会记录已经验证的错误信息
  // 这个计算属性会暴露出来用户没有触发的错误验证信息
  fvUnreportedValidationErrors,
  // 这个计算属性控制了 cruresource 的 save 按钮的 disabeld
  // 方法里有详细的注解
  fvFormIsValid,
  // 下面这个 fvGetAndReportPathRules 单纯的为了返回 rules 而暴露出来的
  // 它的目的就是提供给 inputlabel 需要的 rules，染灰 inputlabel 通过这个 rules 反应校验是否通过
  fvGetAndReportPathRules,
} = useFormValidation({ value: props.value }, store, fvExtraRules);

fvFormRuleSets.value = [
  {
    path:  'name',
    rules: ['nameRequired'],
  },
  {
    path:  'clusterID',
    rules: ['clusterIDRequired'],
  },
]

const hasCredential = computed(() => {
  return !!tkeConfig.value?.tkeCredentialSecret;
});

function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
  tkeConfig.value['name'] = name;
}

</script>

<template>
  <Loading v-if="state.loading" />
    <CruResource
      v-else
      ref="cruresource"
      :resource="value"
      :mode="mode"
      :can-yaml="false"
      :done-route="doneRoute"
      :errors="fvUnreportedValidationErrors"
      :validation-passed="fvFormIsValid"
      @error="e=>errors=e"
      @finish="save"
    >
    <SelectCredential
      v-model:value="tkeConfig.tkeCredentialSecret"
      data-testid="crutke-select-credential"
      provider="tke"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="crucce-form"
    >
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            :value="normanCluster.name"
            :mode="mode"
            label-key="generic.name"
            required
            :rules="fvGetAndReportPathRules('name')"
            @update:value="setClusterName"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model:value="normanCluster.description"
            :mode="mode"
            label-key="nameNsDescription.description.label"
            :placeholder="intl('nameNsDescription.description.placeholder')"
          />
        </div>
      </div>
    </div>
    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>
<style>
</style>
