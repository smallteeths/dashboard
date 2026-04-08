<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import VnpSecurityGroups from './VnpSecurityGroups.vue';

defineProps({
  securityGroupIds:     { type: Array, default: () => ([]) },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: false },
  securityGroupOptions: { type: Array, default: () => ([]) },
  loadingSubnets:       { type: Boolean, default: false },
  rules:                { type: Object, default: () => ({}) },
  isImported:           { type: Boolean, default: false },
});

const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

function updateSecurityGroupIds(val) {
  emit('update:value', { securityGroupIds: val });
}
</script>

<template>
  <div class="mt-20 mb-10 card-container">
    <h3 class="title">
      {{ intl('tkeCn.superNodePool.networkConfig.title') }}
      <span class="required-mark">*</span>
    </h3>

    <VnpSecurityGroups
      :value="securityGroupIds"
      :mode="mode"
      :options="securityGroupOptions"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :disabled="isImported"
      :rules="rules.securityGroupIds"
      @update:value="updateSecurityGroupIds"
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
.required-mark {
  color: var(--error);
}
</style>
