<script setup>
import {
  ref, onMounted, computed, watch, watchEffect, getCurrentInstance
} from 'vue';
import { useStore } from 'vuex';
import CruResource from '@shell/components/CruResource.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { useFormValidation } from '../composables/useFormValidation.js';
import CCEValidators from '../util/validators';
import { NORMAN } from '@shell/config/types';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import { _CREATE, _VIEW, _IMPORT } from '@shell/config/query-params';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import KeyValue from '@shell/components/form/KeyValue';
import UnitInput from '@shell/components/form/UnitInput';
import FileSelector from '@shell/components/form/FileSelector.vue';
import { RadioGroup } from '@components/Form/Radio';
import CONFIG_ENV from '../util/config';
import { find, cloneDeep } from 'lodash';

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
const cceConfig = ref({});
const normanCluster = ref({});
const nodePools = ref([]);
const cruresource = ref(null);
const options = ref({
  vpcOptions:           [],
  subnetOptions:        [],
  securityGroupOptions: [],
  externalIPOptions:    [],
  eipOptions:           [
    intl.value('cceCn.eipSelection.none'),
    intl.value('cceCn.eipSelection.exist'),
    intl.value('cceCn.eipSelection.new'),
  ],
  authentiactionOptions: [
    intl.value('cceCn.authentiactionMode.rbac'),
    intl.value('cceCn.authentiactionMode.authenticating_proxy'),
  ],
});

const state = ref({
  loading:         false,
  regionName:      '',
  managementScale: 'small',
  eipSelection:    'none',
});
const emit = defineEmits(['done']);
const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, cceConfig, nodePools, state
});

const isImport = computed(() => {
  const instance = getCurrentInstance();
  const route = instance?.appContext?.config?.globalProperties?.$route;

  if (!route) {
    return false;
  }
  const mode = route.query?.mode;

  return mode === _IMPORT;
});

const hasCredential = computed(() => {
  return !!cceConfig.value?.huaweiCredentialSecret;
});

const fvExtraRules = computed(() => {
  let out = {};

  if (hasCredential.value) {
    const commonRules = {
      nameRequired:     CCEValidators.nameRequired(normanCluster, intl),
      regionIdRequired: CCEValidators.regionIdRequired(cceConfig, intl),
    };

    const isImportMode = isImport.value || cceConfig.value.imported;

    const nonImportRules = !isImportMode ? {} : {};

    const importRules = isImportMode ? { clusterIdRequired: CCEValidators.clusterIdRequired(cceConfig, intl) } : {};

    out = {
      ...commonRules,
      ...nonImportRules,
      ...importRules,
    };
  }

  return out;
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.cceStatus?.upstreamSpec;
});

// watch
watch(() => cceConfig.value.huaweiCredentialSecret, async(credential) => {
  if (credential) {
    fetchRegion(credential);
  }
});

const {
  fvFormRuleSets,
  fvUnreportedValidationErrors,
  fvFormIsValid,
  fvGetAndReportPathRules,
} = useFormValidation({ value: props.value }, store, fvExtraRules);

fvFormRuleSets.value = [
  {
    path:  'name',
    rules: ['nameRequired'],
  },
];

// method
function cancelCredential() {
  if (cruresource.value) {
    cruresource.value.emitOrRoute();
  }
}

function setClusterName(name) {
  normanCluster.value['name'] = name;
  cceConfig.value['name'] = name;
}

async function fetchRegion(credentialID) {
  const allCredentials = await store.dispatch('rancher/findAll', { type: NORMAN.CLOUD_CREDENTIAL });
  const filteredCredentials = allCredentials.filter((x) => x.provider === 'huawei');
  const matched = find(filteredCredentials, { id: credentialID });
  const regionId = matched?.huaweicredentialConfig?.regionID ?? '';

  cceConfig.value.regionID = regionId;
  console.log(regionId);
  state.value.regionName = intl.value(`cceCn.region.${ regionId.replace(/\-/g, '_') }`);
  console.log(state.value.regionName);
}

async function initCustomConfig() {
  state.value.loading = true;
  state.value.errors = [];
  if (props.value.id) {
    const liveNormanCluster = await props.value.findNormanCluster();

    normanCluster.value = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });
  } else {
    normanCluster.value = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER }, { root: true });

    const principalId = store.getters['auth/principalId'];

    if (principalId.includes('local://')) {
      normanCluster.value.annotations = { ...normanCluster.value.annotations, [CREATOR_PRINCIPAL_ID]: principalId };
    }
  }
  if (!normanCluster?.value?.cceConfig) {
    normanCluster.value['cceConfig'] = { ...CONFIG_ENV.DEFAULTCCECONFIG };
  }
  cceConfig.value = cloneDeep({ ...normanCluster.value.cceConfig });
  state.value.loading = false;
}

function updateCceConfigTags(tags) {
  console.log(cceConfig.value);
  console.log(tags);
}

onMounted(() => {
  initCustomConfig();
});

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
    <div :class="{'row': hasCredential, 'mb-10': hasCredential}">
      <div :class="{'col': true, 'span-6': hasCredential}">
        <SelectCredential
          v-model:value="cceConfig.huaweiCredentialSecret"
          data-testid="crucce-select-credential"
          :mode="mode === VIEW ? VIEW : CREATE"
          provider="huawei"
          :default-on-cancel="true"
          :showing-form="hasCredential"
          class="mt-20"
          :cancel="cancelCredential"
        />
      </div>
      <div
        v-if="hasCredential"
        class="col span-6"
      >
        <LabeledInput
          class="mt-20"
          :value="state.regionName"
          :mode="mode"
          label-key="cceCn.region.label"
          disabled="true"
        />
      </div>
    </div>
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="crucce-form"
    >
      <div
        v-if="isImport"
      >
        <div>
          import cce
        </div>
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
        />
      </div>
      <div
        v-else
      >
        <Banner
          v-if="!clusterActive"
          color="warning"
          :label="t('cceCn.updateWarn')"
        />
        <Banner
          v-for="(err, i) in state.errors"
          :key="i"
          color="error"
          :label="stringify(err)"
        />
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
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.category"
              data-testid="crucce-clusterType"
              :mode="mode"
              :options="CONFIG_ENV.CLUSTER_TYPES"
              option-label="label"
              option-key="value"
              label-key="cceCn.clusterType.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.version"
              data-testid="crucce-version"
              :mode="mode"
              :options="CONFIG_ENV.KUBERNETESVERSIONS"
              option-label="label"
              option-key="value"
              label-key="cceCn.version.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="state.managementScale"
              data-testid="crucce-management-scale"
              :mode="mode"
              :options="CONFIG_ENV.MANAGEMENT_SCALE_VIRTUAL"
              option-label="label"
              option-key="value"
              label-key="cceCn.managementScale.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.containerNetworkMode"
              data-testid="crucce-container-network-mode"
              :mode="mode"
              :options="CONFIG_ENV.CONTAINER_NETWORK_MODES"
              option-label="label"
              option-key="value"
              label-key="cceCn.containerNetworkMode.label"
              required
              :localizedLabel="true"
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.vpcId"
              data-testid="crucce-vpc-id"
              :mode="mode"
              :options="options.vpcOptions"
              option-label="label"
              option-key="value"
              label-key="cceCn.vpcId.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.subnetId"
              data-testid="crucce-subnet-id"
              :mode="mode"
              :options="options.subnetOptions"
              option-label="label"
              option-key="value"
              label-key="cceCn.subnetId.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              :value="cceConfig.containerNetworkCidr"
              data-testid="crucce-container-network-cidr"
              :mode="mode"
              label-key="cceCn.containerNetworkCidr.label"
              :placeholder="intl('cceCn.containerNetworkCidr.placeholder')"
              required
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              v-model:value="cceConfig.kubernetesSvcIPRange"
              data-testid="crucce-kubernetes-svc-ip-range"
              :mode="mode"
              label-key="cceCn.kubernetesSvcIPRange.label"
              :placeholder="intl('cceCn.kubernetesSvcIPRange.placeholder')"
              required
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="cceConfig.securityGroup"
              data-testid="crucce-security-group"
              :mode="mode"
              :options="options.securityGroupOptions"
              option-label="label"
              option-key="value"
              label-key="cceCn.securityGroup.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('cceCn.kubeProxyMode.label') }}
            </h3>
            <RadioGroup
              v-model:value="cceConfig.kubeProxyMode"
              :disabled="!isNewOrUnprovisioned"
              name="selectKubeProxyMode"
              :options="['iptables', 'IPVS']"
              :labels="[
                'iptables',
                'IPVS',
              ]"
              :mode="mode"
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <h3 class="clearfix">
              {{ intl('cceCn.publicAccess.label') }}
            </h3>
            <RadioGroup
              v-model:value="state.eipSelection"
              name="eipSelection"
              :options="['none', 'exist', 'new']"
              :labels="options.eipOptions"
              :mode="mode"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-if="state.eipSelection === 'exist'"
              v-model:value="cceConfig.clusterExternalIP"
              data-testid="crucce-external-ip"
              :mode="mode"
              :options="options.externalIPOptions"
              option-label="label"
              option-key="value"
              label-key="cceCn.eipIds.label"
              required
              :disabled="!isNewOrUnprovisioned"
            />
            <div
              v-if="state.eipSelection === 'new'"
            >
              <LabeledSelect
                v-model:value="cceConfig.eipType"
                data-testid="crucce-eip-type"
                :mode="mode"
                :options="CONFIG_ENV.EIPTYPEOTPTIONS"
                option-label="label"
                option-key="value"
                label-key="cceCn.eipType.label"
                :localizedLabel="true"
                :disabled="!isNewOrUnprovisioned"
              />
              <LabeledSelect
                v-model:value="cceConfig.clusterExternalIP"
                class="mt-10"
                data-testid="crucce-external-ip"
                :mode="mode"
                :options="CONFIG_ENV.EIPCHARGEMODEOPTIONS"
                option-label="label"
                option-key="value"
                :localizedLabel="true"
                label-key="cceCn.eipChargeMode.label"
                :disabled="!isNewOrUnprovisioned"
              />
              <UnitInput
                class="mt-10"
                :disabled="!isNewOrUnprovisioned"
                :value="cceConfig.eipBandwidthSize"
                :label="intl('cceCn.eipBandwidthSize.label')"
                :mode="mode"
                suffix="Mbit/s"
              />
            </div>
          </div>
        </div>
        <div class="mb-10">
          <div>
            <h3 class="clearfix">
              {{ intl('cceCn.authentiactionMode.label') }}
            </h3>
            <RadioGroup
              v-model:value="cceConfig.authentiactionMode"
              name="authentiactionOptions"
              :options="['rbac', 'authenticating_proxy']"
              :labels="options.authentiactionOptions"
              :mode="mode"
            />
          </div>
          <div v-if="cceConfig.authentiactionMode === 'authenticating_proxy'">
            <div class="row mt-10">
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyCa"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  label-key="cceCn.authenticatingProxyCa.label"
                  type="multiline"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyCa.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyCa = e"
                />
              </div>
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyCert"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  label-key="cceCn.authenticatingProxyCert.label"
                  type="multiline"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyCert.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyCert = e"
                />
              </div>
            </div>
            <div class="row mt-10">
              <div class="col span-6">
                <LabeledInput
                  v-model:value="cceConfig.authenticatingProxyPrivateKey"
                  class="cce-authenticating-textarea-multiline"
                  :disabled="!isNewOrUnprovisioned"
                  :mode="mode"
                  label-key="cceCn.authenticatingProxyPrivateKey.label"
                  type="multiline"
                />
                <FileSelector
                  :mode="mode"
                  :disabled="!isNewOrUnprovisioned"
                  :label="intl('cceCn.authenticatingProxyPrivateKey.label')"
                  class="role-tertiary mt-10"
                  @selected="e => cceConfig.authenticatingProxyPrivateKey = e"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="mb-10">
          <KeyValue
            key="labels"
            :disabled="!isNewOrUnprovisioned"
            :value="cceConfig.tags"
            :protected-keys="cceConfig.tags || []"
            :add-label="t('labels.addLabel')"
            :add-icon="addIcon"
            :mode="mode"
            :read-allowed="false"
            :value-can-be-empty="false"
            @update:value="updateCceConfigTags($event)"
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
<style lang="scss" scoped>
  .cce-authenticating-textarea-multiline {
    height: 80px !important;
  }
</style>
