<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { fetchPage } from '../util/request';

const props = defineProps({
  name: {
    type:    String,
    default: ''
  },
  description: {
    type:    String,
    default: ''
  },
  regionId: {
    type:    String,
    default: ''
  },
  clusterId: {
    type:    String,
    default: ''
  },
  regionOptions: {
    type:    Array,
    default: () => ([]),
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  ackConfig: {
    type:    Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'update:name',
  'update:description',
  'update:regionId',
  'update:clusterId',
  'errors',
]);

const store = useStore();
const clusterOptions = ref([]);
const state = ref({ clustersLoading: false });
const intl = computed(() => store.getters['i18n/t']);

watch(() => props.regionId, async(regionId) => {
  emit('update:clusterId', '');
  state.value.clustersLoading = true;
  const url = `${ window.location.origin }/meta/aliyuncn/cluster`;
  const pageSize = 200;

  try {
    const all = [];
    let pageNumber = 1;

    while (true) {
      const res = await fetchPage(
        url,
        {
          cloudCredentialId: props.ackConfig.aliyun_credential_secret,
          regionId,
          pageSize,
          pageNumber,
        },
        store
      );

      const pageItems = res?.clusters || [];

      all.push(...pageItems);

      const total = res?.TotalCount;
      const fetched = (pageNumber - 1) * pageSize + pageItems.length;

      if (typeof total === 'number') {
        if (fetched >= total) break;
      } else {
        if (pageItems.length < pageSize) break;
      }

      if (!pageItems.length) break;

      pageNumber += 1;
    }
    clusterOptions.value = all.map((item) => ({
      value:  item.cluster_id,
      label:  item.name,
      region: item.region_id,
    }));
  } catch (err) {
    clusterOptions.value = [];
    emit('errors', [err?.detail || err]);
  } finally {
    state.value.clustersLoading = false;
  }
}, { immediate: true });

</script>
<template>
  <div class="row mb-10">
    <div class="col span-6">
      <LabeledInput
        :value="name"
        :mode="mode"
        label-key="generic.name"
        required
        :rules="rules.name"
        @update:value="$emit('update:name', $event)"
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
        data-testid="cruack-regionId"
        :mode="mode"
        :options="regionOptions"
        option-label="label"
        option-key="value"
        label-key="ackCn.region.label"
        :disabled="disabled"
        :rules="rules.regionId"
        @update:value="$emit('update:regionId', $event)"
      />
    </div>
    <div
      class="col span-6"
    >
      <LabeledSelect
        :value="clusterId"
        data-testid="cruack-clusterId"
        :mode="mode"
        :options="clusterOptions"
        option-label="label"
        option-key="value"
        label-key="ackCn.clusterSelect.importCluster"
        :disabled="disabled"
        :rules="rules.clusterId"
        :loading="state.clustersLoading"
        :placeholder="intl('ackCn.clusterSelect.placeholder')"
        @update:value="$emit('update:clusterId', $event)"
      />
    </div>
  </div>
</template>
