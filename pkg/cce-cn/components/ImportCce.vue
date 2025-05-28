<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

defineProps({
  name: {
    type:    String,
    default: ''
  },
  description: {
    type:    String,
    default: ''
  },
  clusterId: {
    type:    String,
    default: ''
  },
  clusterOptions: {
    type:    Array,
    default: () => [],
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
});

defineEmits([
  'update:name',
  'update:clusterId',
  'update:description',
]);

const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

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
        :value="clusterId"
        data-testid="crucce-clusterId"
        :mode="mode"
        :options="clusterOptions"
        option-label="label"
        option-key="value"
        label-key="cceCn.clusterSelect.importCluster"
        :disabled="disabled"
        :rules="rules.clusterId"
        :loading="state.clustersLoading"
        :placeholder="intl('cceCn.clusterSelect.placeholder')"
        @update:value="$emit('update:clusterId', $event)"
      />
    </div>
  </div>
</template>
