<script setup>
import {
  ref, onMounted, computed, watch, getCurrentInstance
} from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import { NORMAN } from '@shell/config/types';
import CruResource from '@shell/components/CruResource.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import TKEValidators from '../util/validators';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import { useCreateEditView } from '../composables/useCreateEditView.js';
import { CREATOR_PRINCIPAL_ID } from '@shell/config/labels-annotations';
import { _CREATE, _IMPORT, _VIEW } from '@shell/config/query-params';
import { queryFromTencent } from '../util/request';
import CONFIG_ENV from '../util/config';

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
const options = ref({
  regionOptions: [],
  clusterLevelOptions: [],
});
const state = ref({
  loading:                  false,
  regionLoading:            false,
  clusterLevelAttributeLoading: false,
  errors:                   [],
});
const emit = defineEmits(['done']);

const isManagedCluster = computed(() => {
  return tkeConfig.value.clusterType === 'MANAGED_CLUSTER';
})
// input
const ruleSets = computed(() => {
  const importCluster = isImport || tkeConfig.value.imported;
  const name = normanCluster.value.name;
  const region = tkeConfig.value.region;
  const container = tkeConfig.value.container;
  const clusterType = tkeConfig.value.clusterType;
  const clusterLevel = tkeConfig.value.clusterLevel;

  return {
    name: [
      TKEValidators.nameRequired({ name }, intl),
    ],
    region: [
      TKEValidators.regionIdRequired({ region }, intl),
    ],
    container: !importCluster ? [
      TKEValidators.containerRequired({ container }, intl),
    ] : [],
    clusterType: !importCluster ? [
      TKEValidators.clusterTypeRequired({ clusterType }, intl),
    ] : [],
    clusterLevel: !importCluster && isManagedCluster.value ? [
      TKEValidators.clusterLevelRequired({ clusterLevel }, intl),
    ] : [],
    clusterID: importCluster ? [
      TKEValidators.nameRequired(normanCluster, intl),
    ]: [],
  };
});
// save
const fvFormIsValid = computed(() => {
  const rules = ruleSets.value;
  let isValid = true;

  for (const key in rules) {
    const validators = rules[key];
    if (!validators.length) {
      continue
    }
    for (const validate of validators) {
      const result = validate();
      if (result) {
        isValid = false;
        break;
      }
    }
    if (!isValid) break;
  }

  return isValid;
});

const {
  save,
  doneRoute,
} = useCreateEditView(props, {
  emit, normanCluster, tkeConfig, nodePools, state
});

const hasCredential = computed(() => {
  return !!tkeConfig.value?.tkeCredentialSecret;
});

const isNewOrUnprovisioned = computed(() => {
  return props.mode === _CREATE || !normanCluster.value?.tkeStatus?.upstreamSpec;
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

    tkeConfig.value = { ...CONFIG_ENV.DEFAULTTKECONFIG };
  }
  state.value.loading = false;
}

onMounted(async() => {
  if (isImport.value) {

  } else {
    await initCustomConfig();
  }
  registerWatch();
});

function registerWatch() {
  // watch
  // Because SelectCredential inside the component will trigger a change by default, this watch gets triggered when the component loads.
  watch(() => tkeConfig.value.tkeCredentialSecret, async(credential) => {
    state.value.errors = [];
    if (!credential) {
      return;
    }
    const promises = [];

    promises.push(fetchRegion(credential));
    if (!isImport.value) {
      promises.push(
        fetchRegion(credential),
        fetchClusterLevelAttribute(credential)
      );
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      if (state.value.errors.length === 0) {
        state.value.errors.push(err);
      }
    }
  });
};

async function fetchRegion(cloudCredentialId) {
  state.value.regionLoading = true
  state.value.errors = [];
  try {
    const res = await queryFromTencent({
      resource:       'regions',
      cloudCredentialId,
      store,
      externalParams: {},
    });

    const regionOptions = res?.Response?.RegionInstanceSet?.map((region) => {
      return {
        label: intl.value(`tkeCn.regions.${ region.RegionName }`),
        value: region.RegionName 
      };
    });

    options.value.regionOptions = regionOptions? regionOptions : [];
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.regionLoading = false;
};

async function fetchClusterLevelAttribute(cloudCredentialId) {
  state.value.clusterLevelAttributeLoading = true
  state.value.errors = [];
  try {
    const res = await queryFromTencent({
      resource:       'clusterLevelAttribute',
      cloudCredentialId,
      store,
      externalParams: {
        regionId: tkeConfig.value.region,
      },
    });
    
    options.value.clusterLevelOptions = [];
    const clusterLevelOptions = res?.Response?.Items.map((item) => {
      const help = {
        level: item.Alias,
        node: item.NodeCount,
        pod: item.PodCount,
        configMap: item.ConfigMapCount,
        crd: item.CRDCount,
      }

      return {
        label: intl.value('tkeCn.clusterLevel.help', help),
        value: item.Alias,
      };
    })

    options.value.clusterLevelOptions = clusterLevelOptions ? clusterLevelOptions : [];
  } catch (err) {
    state.value.errors = [];
    state.value.errors.push(err);
  }
  state.value.clusterLevelAttributeLoading = false;
};

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
      data-testid="crutke-form"
    >
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            :value="normanCluster.name"
            :mode="mode"
            label-key="generic.name"
            required
            :rules="ruleSets.name"
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
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="tkeConfig.region"
            data-testid="crutke-resource-region"
            required
            :mode="mode"
            :options="options.regionOptions"
            option-label="label"
            option-key="value"
            :loading="state.regionLoading"
            label-key="tkeCn.region.label"
            :disabled="!isNewOrUnprovisioned"
            :rules="ruleSets.region"
          />
        </div>
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="tkeConfig.container"
            data-testid="crutke-resource-container"
            required
            :mode="mode"
            :options="CONFIG_ENV.CONTAINER"
            option-label="label"
            option-key="value"
            label-key="tkeCn.container.label"
            :disabled="!isNewOrUnprovisioned"
            :rules="ruleSets.container"
          />
        </div>
      </div>
      <div class="row mb-10">
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-model:value="tkeConfig.clusterType"
            data-testid="crutke-resource-cluster-type"
            required
            :mode="mode"
            :options="CONFIG_ENV.CLUSTER_TYPES"
            option-label="label"
            option-key="value"
            label-key="tkeCn.clusterType.label"
            :localizedLabel="true"
            :disabled="!isNewOrUnprovisioned"
            :rules="ruleSets.clusterType"
          />
        </div>
        <div
          class="col span-6"
        >
          <LabeledSelect
            v-if="isManagedCluster"
            v-model:value="tkeConfig.clusterLevel"
            :loading="state.clusterLevelAttributeLoading"
            data-testid="crutke-resource-cluster-level"
            required
            :mode="mode"
            :options="options.clusterLevelOptions"
            option-label="label"
            option-key="value"
            label-key="tkeCn.clusterLevel.label"
            :disabled="!isNewOrUnprovisioned"
            :rules="ruleSets.clusterLevel"
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
