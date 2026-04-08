<script setup>
import { watch, ref } from 'vue';
import { cloneDeep } from 'lodash';
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
  isImported:           { type: Boolean, default: false },
});

const emit = defineEmits(['update:value', 'update:nodePoolName']);
const localValue = ref(cloneDeep(props.value || {}));

watch(
  () => props.value,
  (val) => {
    localValue.value = cloneDeep(val || {});
  },
  {
    immediate: true,
    deep:      true
  }
);

// 必须要先 merge 下 localValue 因为同时触发时有可能互相覆盖
function mergeValue(p) {
  const next = {
    ...(localValue.value || {}),
    ...p,
  };

  localValue.value = next;
  emit('update:value', next);
}

function updateVirtualNodes({ virtualNodes }) {
  mergeValue({ virtualNodes });
}

function updateSecurityGroupIds({ securityGroupIds }) {
  mergeValue({ securityGroupIds });
}

function updateAdvancedConfig(p) {
  mergeValue(p);
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
  () => [localValue.value, props.nodePoolName],
  () => {
    runRules(props.rules?.name, props.nodePoolName);
    runRules(props.rules?.virtualNodePoolRequired, localValue.value);
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
      :virtualNodes="localValue?.virtualNodes"
      :nodePoolName="nodePoolName"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :subnetOptions="subnetOptions"
      :isImported="isImported"
      :vpcId="vpcId"
      :zoneOptions="zoneOptions"
      :rules="rules"
      @update:value="updateVirtualNodes"
      @update:nodePoolName="emit('update:nodePoolName', $event)"
    />
    <VnpNetworkConfig
      :securityGroupIds="localValue?.securityGroupIds"
      :isImported="isImported"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      :securityGroupOptions="securityGroupOptions"
      :loadingSubnets="loadingSubnets"
      :rules="rules"
      @update:value="updateSecurityGroupIds"
    />
    <VnpAdvancedConfig
      :value="localValue"
      :isImported="isImported"
      :mode="mode"
      :isNewOrUnprovisioned="isNewOrUnprovisioned"
      @update:value="updateAdvancedConfig"
    />
  </div>
</template>
