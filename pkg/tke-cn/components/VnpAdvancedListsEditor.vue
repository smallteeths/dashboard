<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { cloneDeep } from 'lodash';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';

const props = defineProps({
  mode:         { type: String, required: true },
  disabled:     { type: Boolean, default: false },
  labels:       { type: Array, default: () => ([]) },
  taints:       { type: Array, default: () => ([]) },
  virtualNodes: { type: Array, default: () => ([]) },
  isImported:   { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:labels',
  'update:taints',
  'update:virtualNodes',
]);

const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const labelRows = computed(() => Array.isArray(props.labels) ? props.labels : []);
const taintRows = computed(() => Array.isArray(props.taints) ? props.taints : []);
const nodes = computed(() => Array.isArray(props.virtualNodes) ? props.virtualNodes : []);

const effectOptions = computed(() => [
  { label: 'NoSchedule', value: 'NoSchedule' },
  { label: 'PreferNoSchedule', value: 'PreferNoSchedule' },
  { label: 'NoExecute', value: 'NoExecute' },
]);

function addLabel() {
  emit('update:labels', [...labelRows.value, { name: '', value: '' }]);
}

function removeLabel(i) {
  const next = cloneDeep(labelRows.value);

  next.splice(i, 1);
  emit('update:labels', next);
}

function setLabel(i, key, val) {
  const next = cloneDeep(labelRows.value);

  next[i] = { ...(next[i] || {}), [key]: val };
  emit('update:labels', next);
}

function addTaint() {
  emit('update:taints', [...taintRows.value, {
    key: '', value: '', effect: 'NoSchedule'
  }]);
}

function removeTaint(i) {
  const next = cloneDeep(taintRows.value);

  next.splice(i, 1);
  emit('update:taints', next);
}

function setTaint(i, key, val) {
  const next = cloneDeep(taintRows.value);

  next[i] = { ...(next[i] || {}), [key]: val };
  emit('update:taints', next);
}

function patchVirtualNodes(next) {
  emit('update:virtualNodes', next);
}

function addTag(ni) {
  const next = cloneDeep(nodes.value);
  const n = next[ni] || {};
  const tags = Array.isArray(n.tags) ? n.tags : [];

  tags.push({ key: '', value: '' });
  next[ni] = { ...n, tags };
  patchVirtualNodes(next);
}

function removeTag(ni, ti) {
  const next = cloneDeep(nodes.value);
  const n = next[ni] || {};
  const tags = Array.isArray(n.tags) ? [...n.tags] : [];

  tags.splice(ti, 1);
  next[ni] = { ...n, tags };
  patchVirtualNodes(next);
}

function setTag(ni, ti, key, val) {
  const next = cloneDeep(nodes.value);
  const n = next[ni] || {};
  const tags = Array.isArray(n.tags) ? cloneDeep(n.tags) : [];

  tags[ti] = { ...(tags[ti] || {}), [key]: val };
  next[ni] = { ...n, tags };
  patchVirtualNodes(next);
}
</script>

<template>
  <div>
    <div class="section">
      <div class="section-title">
        {{ intl('tkeCn.superNodePool.advanced.labels.title') }}
        <button
          class="btn-link"
          type="button"
          :disabled="isImported"
          @click="addLabel"
        >
          {{ intl('tkeCn.superNodePool.advanced.actions.add') }}
        </button>
      </div>
      <div
        v-if="labelRows.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.advanced.labels.hint') }}
      </div>
      <div
        v-for="(r, i) in labelRows"
        :key="`lb-${i}`"
        class="row mt-10"
      >
        <div class="col span-5">
          <LabeledInput
            :value="r.name"
            :mode="mode"
            :label="intl('tkeCn.superNodePool.advanced.fields.key')"
            :disabled="isImported"
            @update:value="setLabel(i, 'name', $event)"
          />
        </div>
        <div class="col span-5">
          <LabeledInput
            :value="r.value"
            :mode="mode"
            :label="intl('tkeCn.superNodePool.advanced.fields.value')"
            :disabled="isImported"
            @update:value="setLabel(i, 'value', $event)"
          />
        </div>
        <div class="col span-2 actions">
          <button
            class="btn-danger"
            type="button"
            :disabled="isImported"
            @click="removeLabel(i)"
          >
            {{ intl('tkeCn.superNodePool.advanced.actions.delete') }}
          </button>
        </div>
      </div>
    </div>
    <div class="section mt-20">
      <div class="section-title">
        {{ intl('tkeCn.superNodePool.advanced.taints.title') }}
        <button
          class="btn-link"
          type="button"
          :disabled="isImported"
          @click="addTaint"
        >
          {{ intl('tkeCn.superNodePool.advanced.actions.add') }}
        </button>
      </div>
      <div
        v-if="taintRows.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.advanced.taints.hint') }}
      </div>
      <div
        v-for="(t, i) in taintRows"
        :key="`t-${i}`"
        class="row mt-10"
      >
        <div class="col span-4">
          <LabeledInput
            :value="t.key"
            :mode="mode"
            :disabled="isImported"
            :label="intl('tkeCn.superNodePool.advanced.fields.key')"
            @update:value="setTaint(i, 'key', $event)"
          />
        </div>
        <div class="col span-4">
          <LabeledInput
            :value="t.value"
            :mode="mode"
            :disabled="isImported"
            :label="intl('tkeCn.superNodePool.advanced.fields.value')"
            @update:value="setTaint(i, 'value', $event)"
          />
        </div>
        <div class="col span-3">
          <LabeledSelect
            :value="t.effect"
            :mode="mode"
            :disabled="isImported"
            :options="effectOptions"
            option-label="label"
            option-key="value"
            :label="intl('tkeCn.superNodePool.advanced.fields.effect')"
            @update:value="setTaint(i, 'effect', $event)"
          />
        </div>
        <div class="col span-1 actions">
          <button
            class="btn-danger"
            type="button"
            :disabled="isImported"
            @click="removeTaint(i)"
          >
            {{ intl('tkeCn.superNodePool.advanced.actions.delete') }}
          </button>
        </div>
      </div>
    </div>
    <div class="section mt-20">
      <div class="section-title">
        {{ intl('tkeCn.superNodePool.advanced.virtualNodeTags.title') }}
      </div>
      <div
        v-if="nodes.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.advanced.virtualNodeTags.empty') }}
      </div>
      <div
        v-for="(vn, ni) in nodes"
        :key="`vntag-${ni}`"
        class="vn-card mt-10"
      >
        <div class="vn-head">
          <div class="vn-title">
            {{ vn.displayName || intl('tkeCn.superNodePool.advanced.virtualNodeTags.defaultNodeName', { index: ni + 1 }) }}
          </div>
          <button
            v-show="!disabled"
            class="btn-link"
            type="button"
            :disabled="disabled"
            @click="addTag(ni)"
          >
            {{ intl('tkeCn.superNodePool.advanced.virtualNodeTags.addTag') }}
          </button>
        </div>
        <div
          v-if="!(vn.tags && vn.tags.length)"
          class="hint"
        >
          {{ intl('tkeCn.superNodePool.advanced.virtualNodeTags.unconfigured') }}
        </div>
        <div
          v-for="(tag, ti) in (vn.tags || [])"
          :key="`tag-${ni}-${ti}`"
          class="row mt-10"
        >
          <div class="col span-5">
            <LabeledInput
              :value="tag.key"
              :mode="mode"
              :label="intl('tkeCn.superNodePool.advanced.fields.key')"
              :disabled="disabled"
              @update:value="setTag(ni, ti, 'key', $event)"
            />
          </div>
          <div class="col span-5">
            <LabeledInput
              :value="tag.value"
              :mode="mode"
              :label="intl('tkeCn.superNodePool.advanced.fields.value')"
              :disabled="disabled"
              @update:value="setTag(ni, ti, 'value', $event)"
            />
          </div>
          <div class="col span-2 actions">
            <button
              v-show="!disabled"
              class="btn-danger"
              type="button"
              :disabled="disabled"
              @click="removeTag(ni, ti)"
            >
              {{ intl('tkeCn.superNodePool.advanced.actions.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.section-title {
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:700;
}
.hint {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
}
.vn-card {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 10px;
}
.vn-head {
  height: 40px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.vn-title {
  font-weight:700;
}
.btn-link {
  background:transparent;
  border:none;
  color:var(--link);
  cursor:pointer;
  padding:0;
}
.btn-link:disabled,
.btn-link.disabled {
  color: var(--disabled-text, #9ca3af);
  cursor: not-allowed;
  opacity: 1;
}
.btn-danger {
  background:transparent;
  border:none;
  color:var(--error);
  cursor:pointer;
  padding:0;
}
.btn-danger:disabled,
.btn-danger.disabled {
  color: var(--disabled-text, #9ca3af);
  cursor: not-allowed;
  opacity: 1;
}
.actions {
  display:flex;
  justify-content:flex-end;
  align-items:center;
}
</style>
