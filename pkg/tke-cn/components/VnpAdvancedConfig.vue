<script setup>
import { computed, watchEffect } from 'vue';
import { useStore } from 'vuex';
import Accordion from '@components/Accordion/Accordion.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import VnpAdvancedListsEditor from './VnpAdvancedListsEditor.vue';

const props = defineProps({
  value:                { type: Object, default: () => ({}) },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: false },
  rules:                { type: Object, default: () => ({}) },
});

const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

function patch(p) {
  emit('update:value', { ...(props.value || {}), ...p });
}

const osOptions = computed(() => [
  {
    label: intl.value('tkeCn.superNodePool.advanced.osOptions.linux'),
    value: 'linux'
  },
  {
    label: intl.value('tkeCn.superNodePool.advanced.osOptions.windows'),
    value: 'windows'
  },
]);

watchEffect(() => {
  if (!props.isNewOrUnprovisioned) {
    return;
  }
  if (!props.value?.os) {
    patch({ os: 'linux' });
  }
  if (!props.value?.deletionProtection) {
    patch({ deletionProtection: true });
  }
});
</script>
<template>
  <Accordion
    class="mb-20 advanced-card-accordion"
    :title="intl('tkeCn.superNodePool.advanced.title')"
  >
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledSelect
          :value="value.os"
          :mode="mode"
          :label="intl('tkeCn.superNodePool.advanced.os')"
          :options="osOptions"
          option-label="label"
          option-key="value"
          :disabled="!isNewOrUnprovisioned"
          @update:value="patch({ os: $event })"
        />
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-6">
        <Checkbox
          :value="value.deletionProtection"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          :label="intl('tkeCn.superNodePool.advanced.deletionProtection')"
          @update:value="patch({ deletionProtection: $event })"
        />
      </div>
    </div>
    <VnpAdvancedListsEditor
      :labels="value.labels"
      :taints="value.taints"
      :virtualNodes="value.virtualNodes"
      :mode="mode"
      :disabled="!isNewOrUnprovisioned"
      @update:labels="patch({ labels: $event })"
      @update:taints="patch({ taints: $event })"
      @update:virtualNodes="patch({ virtualNodes: $event })"
    />
  </Accordion>
</template>

<style scoped lang="scss">
.advanced-card-accordion {
  border-radius: var(--border-radius);
  box-shadow: 0 0 20px var(--shadow);
  background: var(--body-bg);
  border: 0px;
}
.advanced-card-accordion .accordion-header {
  padding: 16px 0 16px 0 !important;
}
</style>
