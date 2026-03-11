<script setup>
import { watch } from 'vue';
import VnpBaseConfig from './VnpBaseConfig.vue';
import VnpNetworkConfig from './VnpNetworkConfig.vue';
import VnpAdvancedConfig from './VnpAdvancedConfig.vue';

const props = defineProps({
  value:                { type: Object, default: () => ({}) },
  nodePoolName:         { type: String, default: '' },
  vpcId:                { type: String, default: '' },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: false },
  subnetOptions:        { type: Array, default: () => ([]) },
  zoneOptions:          { type: Array, default: () => ([]) },
  securityGroupOptions: { type: Array, default: () => ([]) },
  loadingSubnets:       { type: Boolean, default: false },
  rules:                { type: Object, default: () => ({}) },
});
const emit = defineEmits(['update:value', 'update:nodePoolName']);

function patch(p) {
  emit('update:value', { ...(props.value || {}), ...p });
}

function runRules(rules, value) {
  if (!Array.isArray(rules)) {
    return;
  }

  rules.forEach((rule) => {
    if (typeof rule === 'function') {
      rule(value);
    }
  });
}

watch(
  () => [props.value, props.nodePoolName],
  () => {
    runRules(props.rules?.name, props.nodePoolName);
    runRules(props.rules?.virtualNodePoolRequired, props.value);
  },
  {
    immediate: true,
    deep:      true
  }
);
</script>

<template>
  <div>
    <VnpBaseConfig
      :value="value"
      :nodePoolName="nodePoolName"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :subnetOptions="subnetOptions"
      :vpcId="vpcId"
      :zoneOptions="zoneOptions"
      @update:value="patch"
      @update:nodePoolName="emit('update:nodePoolName', $event)"
    />
    <VnpNetworkConfig
      :value="value"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :securityGroupOptions="securityGroupOptions"
      :loadingSubnets="loadingSubnets"
      @update:value="patch"
    />
    <VnpAdvancedConfig
      :value="value"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      @update:value="patch"
    />
  </div>
</template>
