<script setup>
import { ref, watch, computed } from 'vue';
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import Tag from '@shell/components/Tag.vue';

const props = defineProps({
  value:           { type: Array, default: null }, // any[] | null
  mode:            { type: String, default: _EDIT },
  initialEmptyRow: { type: Boolean, default: false },
  title:           { type: String, default: '' },
  valueMultiline:  { type: Boolean, default: false },
  defaultAddValue: { type: [String, Number, Object, Array], default: '' },
  disabled:        { type: Boolean, default: false },
  componentTestid: { type: String, default: 'array-list-ordered' }
});
const emit = defineEmits(['add', 'remove', 'update:value']);
const input = (Array.isArray(props.value) ? props.value : []).slice();
const rows = ref([]);

for (const val of input) {
  rows.value.push({ value: val });
}
if (!rows.value.length && props.initialEmptyRow) {
  const val = props.defaultAddValue ? clone(props.defaultAddValue) : '';

  rows.value.push({ value: val });
}

const isView = computed(() => {
  return props.mode === _VIEW;
});
const update = () => {
  if (isView.value) {
    return;
  }

  const out = [];

  for (const row of rows.value) {
    const trim = !props.valueMultiline && typeof row.value === 'string';
    const val = trim ? row.value.trim() : row.value;

    if (typeof val !== 'undefined') {
      out.push(val);
    }
  }

  emit('update:value', out);
};
const lastUpdateWasFromValue = ref(false);
const queueUpdate = debounce(update, 50);

watch(
  rows,
  () => {
    if (!lastUpdateWasFromValue.value) {
      queueUpdate();
    }
    lastUpdateWasFromValue.value = false;
  },
  { deep: true }
);
watch(
  () => props.value,
  () => {
    lastUpdateWasFromValue.value = true;
    rows.value = (props.value || []).map((v) => ({ value: v }));
  },
  { deep: true }
);
function remove(row, index) {
  emit('remove', { row, index });
  removeAt(rows.value, index);
  queueUpdate();
}

function moveUp(index) {
  if (index > 0) {
    const element = rows.value[index];

    rows.value.splice(index, 1);
    rows.value.splice(index - 1, 0, element);

    queueUpdate();
  }
}

function moveDown(index) {
  if (index < rows.value.length - 1) {
    const element = rows.value[index];

    rows.value.splice(index, 1);
    rows.value.splice(index + 1, 0, element);

    queueUpdate();
  }
}
</script>
<template>
  <div
    class="array-list-ordered-main-container"
    role="group"
    :aria-label="title || t('ackCn.generic.arrayList')"
  >
    <div>
      <template v-if="rows.length">
        <div
          v-for="(row, idx) in rows"
          :key="idx"
          :data-testid="`${componentTestid}-box${ idx }`"
          class="box"
          :class="{'hide-remove-is-view': isView}"
          role="group"
        >
          <div class="value">
            <Tag
              :key="idx"
              class="tag"
              :class="{disabled: disabled}"
            >
              <span class="ml-10">{{ row.value.label }}

              </span>
              <div class="tag-actions">
                <i
                  v-if="!!row.value.warning"
                  v-clean-tooltip="t('ackCn.nodePool.instanceTypes.list.warning')"
                  class="icon icon-warning error"
                />
                <button
                  v-if="!isView"
                  type="button"
                  :disabled="disabled"
                  class="btn role-tertiary"
                  :data-testid="`${componentTestid}-remove-item-${idx}`"
                  :aria-label="t('generic.remove', {index: idx+1})"
                  role="button"
                  @click="remove(row, idx)"
                >
                  <t k="generic.remove" />
                </button>
              </div>
            </Tag>
          </div>
          <div class="row bttns ml-10">
            <button
              type="button"
              :disabled="disabled"
              class="btn role-tertiary bttn mr-10"
              :style="{ visibility: idx !== 0 ? 'visible' : 'hidden' }"
              :data-testid="`${componentTestid}-move-up-item-${idx}`"
              :aria-label="t('ackCn.generic.moveUp', {index: idx+1})"
              role="button"
              @click="moveUp(idx)"
            >
              <i class="icon icon-chevron-up mr-5 ml-5" />{{ t('ackCn.generic.moveUp') }}
            </button>
            <button
              type="button"
              :disabled="disabled"
              class="btn role-tertiary bttn"
              :style="{ visibility: idx !== rows.length - 1 ? 'visible' : 'hidden' }"
              :data-testid="`${componentTestid}-move-down-item-${idx}`"
              :aria-label="t('ackCn.generic.moveDown', {index: idx+1})"
              role="button"
              @click="moveDown(idx)"
            >
              <i class="icon icon-chevron-down mr-5 ml-5" />{{ t('ackCn.generic.moveDown') }}
            </button>
          </div>
        </div>
      </template>
      <div v-else>
        <div
          v-if="mode==='view'"
          class="text-muted"
        >
          &mdash;
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag{
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-right: 4px;
    height: 100%;
}
.tag-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}
.error {
    color: var(--error);
  }
.box {
    display: grid;
    grid-template-columns: auto $array-list-remove-margin;
    align-items: center;
    margin-bottom: 10px;
    .value {
      flex: 1;
      height: 100%;
      overflow: hidden;
    }
  }
  .bttns {
    text-align: right;
  }
  .bttn {
    background-color: var(--tag-bg);
    margin-right: 4px;
  }
</style>
