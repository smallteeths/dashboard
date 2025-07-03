<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { queryFromTencent } from '../util/request';
import { RadioGroup } from '@components/Form/Radio';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

const props = defineProps({
  name: {
    type:    String,
    default: ''
  },
  description: {
    type:    String,
    default: ''
  },
  clusterID: {
    type:    String,
    default: ''
  },
  regionId: {
    type:    String,
    default: ''
  },
  cloudCredentialId: {
    type:    String,
    default: ''
  },
  clusterEndpoint: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  clusterEndpointOptions: {
    type:    Array,
    default: () => [],
  },
  regionOptions: {
    type:    Array,
    default: () => [],
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  mode: {
    type:     String,
    required: true
  },
});

const emit = defineEmits([
  'update:name',
  'update:clusterID',
  'update:description',
  'update:setClusterName',
  'update:regionId',
  'update:clusterEndpoint',
  'errors',
]);
const state = ref({ clustersLoading: false });
const options = ref({ clusterOptions: [] });
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

watch(() => props.regionId, async(regionId) => {
  emit('update:clusterID', '');
  fetchClusters(props.cloudCredentialId, regionId);
}, { immediate: true });

async function fetchClusters(cloudCredentialId, regionId) {
  if (!cloudCredentialId || !regionId) {
    return;
  }
  state.value.clustersLoading = true;
  try {
    const res = await queryFromTencent({
      resource:       'clusters',
      cloudCredentialId,
      store,
      externalParams: { regionId },
    });
    const clusterOptions = res?.Response?.Clusters?.map((c) => {
      return {
        label: c.ClusterName,
        value: c.ClusterId,
      };
    });

    options.value.clusterOptions = clusterOptions || [];
  } catch (err) {
    emit('errors', [err]);
    options.value.clusterOptions = [];
  }
  state.value.clustersLoading = false;
}

function updateName(name) {
  emit('update:name', name);
  emit('update:setClusterName', name);
}

</script>
<template>
  <div>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          :value="name"
          :mode="mode"
          label-key="generic.name"
          required
          :rules="rules.name"
          @update:value="updateName($event)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          :value="description"
          :mode="mode"
          label-key="nameNsDescription.description.label"
          :placeholder="intl('nameNsDescription.description.placeholder')"
          @update:value="$emit('update:description', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div
        class="col span-6"
      >
        <LabeledSelect
          :value="regionId"
          data-testid="crutke-regionId"
          :mode="mode"
          :options="regionOptions"
          option-label="label"
          option-key="value"
          label-key="tkeCn.region.label"
          :disabled="disabled"
          :rules="rules.regionId"
          @update:value="$emit('update:regionId', $event)"
        />
      </div>
      <div
        class="col span-6"
      >
        <LabeledSelect
          :value="clusterID"
          data-testid="crutke-clusterID"
          :mode="mode"
          :options="options.clusterOptions"
          option-label="label"
          option-key="value"
          label-key="tkeCn.clusterSelect.importCluster"
          :disabled="disabled"
          :rules="rules.clusterID"
          :loading="state.clustersLoading"
          :placeholder="intl('tkeCn.clusterSelect.placeholder')"
          @update:value="$emit('update:clusterID', $event)"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <h3 class="clearfix">
          {{ intl('tkeCn.proxy.label') }}
        </h3>
        <RadioGroup
          :value="clusterEndpoint"
          :disabled="disabled"
          name="clusterEndpoint"
          :options="[true, false]"
          :labels="clusterEndpointOptions"
          :mode="mode"
          @update:value="$emit('update:clusterEndpoint', $event)"
        />
      </div>
    </div>
  </div>
</template>
