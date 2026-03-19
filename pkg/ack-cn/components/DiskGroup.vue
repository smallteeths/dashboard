<script setup>
import { ref, watch, computed } from 'vue';
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW, _CREATE } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import { useStore } from 'vuex';
import DiskType from './DiskType.vue';
import { DEFAULT_DISK_VALUE } from '../util/config';

const props = defineProps({
  value:         { type: Array, default: null }, // any[] | null
  mode:          { type: String, default: _EDIT },
  removeAllowed: { type: Boolean, default: true },
  addDisabled:   { type: Boolean, default: false },
  loading:       { type: Boolean, default: false },
  disabled:      { type: Boolean, default: false },
  options:       { type: Array, default: () => [] },
});
const emit = defineEmits(['add', 'remove', 'update:value']);
const store = useStore();
const t = store.getters['i18n/t'];
const input = (Array.isArray(props.value) ? props.value : []).slice();
const rows = ref([]);

for (const val of input) {
  rows.value.push({ value: val });
}

if (!rows.value.length) {
  rows.value.push({ value: clone(DEFAULT_DISK_VALUE) });
}
const isView = computed(() => props.mode === _VIEW);
const isCreate = computed(() => props.mode === _CREATE);
const update = () => {
  if (isView.value) {
    return;
  }

  const out = [];

  for (const row of rows.value) {
    const val = row.value;

    if (typeof val !== 'undefined') {
      out.push(val);
    }
  }

  emit('update:value', out);
};
const lastUpdateWasFromValue = ref(false);
const queueUpdate = debounce(update, 50);

watch(rows, () => {
  // lastUpdateWasFromValue is used to break a cycle where when rows are updated
  // this was called which then forced rows to updated again
  if (!lastUpdateWasFromValue.value) {
    queueUpdate();
  }
  lastUpdateWasFromValue.value = false;
},
{ deep: true }
);

watch(() => props.value, () => {
  lastUpdateWasFromValue.value = true;
  rows.value = (props.value || []).map((v) => ({ value: v }));
},
{ deep: true }
);

function add() {
  const firstCategory = props.options?.[0]?.value || DEFAULT_DISK_VALUE?.category || 'cloud_essd';
  const firstSize = 0;

  rows.value.push({
    value: clone({
      ...DEFAULT_DISK_VALUE,
      category: firstCategory,
      size:     firstSize,
    }),
  });

  if (DEFAULT_DISK_VALUE) {
    queueUpdate();
  }

  emit('add');
}

function remove(row, index) {
  emit('remove', { row, index });
  removeAt(rows.value, index);
  queueUpdate();
}
</script>
<template>
  <div>
    <template v-if="rows.length">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        :data-testid="`ack-disk-group-box${ idx }`"
        role="group"
      >
        <DiskType
          :key="idx"
          v-model:category="row.value.category"
          v-model:size="row.value.size"
          v-model:encrypted="row.value.encrypted"
          :mode="mode"
          :disabled="disabled"
          :options="options"
          :loading="loading"
        >
          <template #remove>
            <div
              v-if="removeAllowed && isCreate"
            >
              <button
                type="button"
                :disabled="disabled"
                class="btn role-link"
                :data-testid="`ack-disk-group-remove-item-${idx}`"
                :aria-label="t('generic.ariaLabel.remove', {index: idx+1})"
                role="button"
                @click="remove(row, idx)"
              >
                {{ t('ackCn.nodePool.diskGroup.remove') }}
              </button>
            </div>
          </template>
        </DiskType>
      </div>
    </template>
    <div v-else>
      <div
        v-if="isView"
        class="text-muted"
      >
        &mdash;
      </div>
    </div>
    <div
      v-if="isCreate"
      class="footer mmt-6"
    >
      <button
        type="button"
        class="btn role-tertiary add"
        :disabled="loading || addDisabled || disabled"
        :data-testid="`ack-disk-group-add-button`"
        :aria-label="'ackCn.nodePool.diskGroup.add'"
        role="button"
        @click="add()"
      >
        <i
          class="mr-5 icon"
          :class="loading ? ['icon-lg', 'icon-spinner','icon-spin']: ['icon-plus']"
        />
        {{ t('ackCn.nodePool.diskGroup.add') }}
      </button>
    </div>
  </div>
</template>
