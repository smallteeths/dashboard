<script setup>
import { computed } from 'vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import { _CREATE } from '@shell/config/query-params';

defineOptions({ name: 'ACKDiskType' });
defineProps({
  mode:          { type: String, default: _CREATE },
  disabled:      { type: Boolean, default: false },
  showEncrypted: { type: Boolean, default: true },
  options:       { type: Array, default: () => [] },
  loading:       { type: Boolean, default: false },
});

const category = defineModel('category', { type: String, default: 'cloud_essd' });
const size = defineModel('size', { type: Number, default: 40 });
const encrypted = defineModel('encrypted', { type: String, default: 'false' });
const isEncrypted = computed({
  get() {
    return encrypted.value === 'true';
  },
  set(neu) {
    encrypted.value = String(!!neu);
  },
});

</script>
<template>
  <div class="row mb-10 align-center">
    <div class="col span-4">
      <LabeledSelect
        v-model:value="category"
        :mode="mode"
        :options="options"
        :disabled="disabled"
        :loading="loading"
        label-key="ackCn.nodePool.diskCategory.label"
        option-key="value"
        option-label="label"
        required
      />
    </div>
    <div class="col span-4">
      <UnitInput
        v-model:value="size"
        :mode="mode"
        label-key="ackCn.nodePool.diskSize.label"
        suffix="GiB"
        :disabled="disabled"
        :loading="loading"
        required
      />
    </div>
    <div class="col span-1 mr-10">
      <Checkbox
        v-if="showEncrypted"
        v-model:value="isEncrypted"
        :mode="mode"
        label-key="ackCn.nodePool.diskEncrypted.label"
        :disabled="disabled"
      />
    </div>
    <div class="col span-2 mb-5 ml-30">
      <slot name="remove" />
    </div>
  </div>
</template>
