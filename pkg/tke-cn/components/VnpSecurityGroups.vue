<script setup>
import { computed, watchEffect } from 'vue';
import { useStore } from 'vuex';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

const props = defineProps({
  value:                { type: Array, default: () => ([]) }, // securityGroupIds
  options:              { type: Array, default: () => ([]) },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: true },
  disabled:             { type: Boolean, default: false },
  rules:                { type: Array, default: () => ([]) },
});

const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const rows = computed(() => Array.isArray(props.value) ? props.value : []);

function getOptionsForRow(index) {
  const selectedByOthers = rows.value.filter((_, i) => i !== index);

  return (props.options || []).filter((option) => {
    return !selectedByOthers.includes(option.value);
  });
}

function add() {
  const availableOptions = (props.options || []).filter((option) => {
    return !rows.value.includes(option.value);
  });

  const defaultValue = availableOptions.length > 0 ? availableOptions[0].value : '';

  emit('update:value', [...rows.value, defaultValue]);
}

function remove(i) {
  const next = [...rows.value];

  next.splice(i, 1);
  emit('update:value', next);
}

function set(i, v) {
  const next = [...rows.value];

  next[i] = v;
  emit('update:value', next);
}

watchEffect(() => {
  if (!props.isNewOrUnprovisioned) {
    return;
  }
  if (rows.value.length === 0 && (props.options || []).length > 0) {
    emit('update:value', [props.options[0].value]);
  }
});
</script>

<template>
  <div>
    <div class="section-title">
      {{ intl('tkeCn.superNodePool.securityGroup.title') }}
      <button
        class="btn-link"
        type="button"
        :disabled="disabled"
        @click="add"
      >
        {{ intl('tkeCn.superNodePool.securityGroup.actions.add') }}
      </button>
    </div>

    <div
      v-if="rows.length === 0"
      class="hint"
    >
      {{ intl('tkeCn.superNodePool.securityGroup.empty') }}
    </div>

    <div
      v-for="(sg, i) in rows"
      :key="`sg-${i}`"
      class="row mt-10"
    >
      <div class="col span-10">
        <LabeledSelect
          :value="sg"
          :mode="mode"
          :options="getOptionsForRow(i)"
          option-label="label"
          option-key="value"
          :label="intl('tkeCn.superNodePool.securityGroup.label')"
          :disabled="disabled"
          @update:value="set(i, $event)"
        />
      </div>

      <div class="col span-2 actions">
        <button
          class="btn-danger"
          type="button"
          :disabled="disabled"
          @click="remove(i)"
        >
          {{ intl('tkeCn.superNodePool.securityGroup.actions.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}
.hint {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
}
.btn-link {
  background: transparent;
  border: none;
  color: var(--link);
  cursor: pointer;
  padding: 0;
}
.btn-danger {
  background: transparent;
  border: none;
  color: var(--error);
  cursor: pointer;
  padding: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
