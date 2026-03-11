<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import VnpSecurityGroups from './VnpSecurityGroups.vue';

const props = defineProps({
  value:                { type: Object, default: () => ({}) },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: true },
  securityGroupOptions: { type: Array, default: () => ([]) },
  loadingSubnets:       { type: Boolean, default: false },
  rules:                { type: Object, default: () => ({}) },
});
const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

function patch(p) {
  emit('update:value', { ...(props.value || {}), ...p });
}
</script>

<template>
  <div class="mt-20 mb-10 card-container">
    <h3 class="title">
      {{ intl('tkeCn.superNodePool.networkConfig.title') }}
    </h3>
    <VnpSecurityGroups
      :value="value.securityGroupIds"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :options="securityGroupOptions"
      :rules="rules.securityGroupIds"
      @update:value="patch({ securityGroupIds: $event })"
    />
  </div>
</template>

<style scoped lang="scss">
.card-container {
    border-radius: var(--border-radius);
    padding: 10px;
    box-shadow: 0 0 20px var(--shadow);
    background: var(--body-bg);
}
.title {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
}
</style>
