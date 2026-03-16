<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const REQUIRED_CSI = 'CBS';

const props = defineProps({
  value: {
    type:    Array,
    default: () => ([])
  },
  mode: {
    type:     String,
    required: true
  },
  disabled: {
    type:    Boolean,
    default: false
  }
});

const emit = defineEmits(['update:value']);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);

const selectedValues = computed(() => {
  const values = Array.isArray(props.value) ? [...props.value] : [];

  if (!values.includes(REQUIRED_CSI)) {
    values.unshift(REQUIRED_CSI);
  }

  return values;
});

const csiOptions = computed(() => [
  {
    value: 'CBS',
    title: intl.value('tkeCn.csi.cards.CBS.title'),
    desc:  intl.value('tkeCn.csi.cards.CBS.desc')
  },
  {
    value: 'COS',
    title: intl.value('tkeCn.csi.cards.COS.title'),
    desc:  intl.value('tkeCn.csi.cards.COS.desc')
  },
  // {
  //   value: 'CFSTurbo',
  //   title: intl.value('tkeCn.csi.cards.CFSTurbo.title'),
  //   desc:  intl.value('tkeCn.csi.cards.CFSTurbo.desc')
  // },
  {
    value: 'CFS',
    title: intl.value('tkeCn.csi.cards.CFS.title'),
    desc:  intl.value('tkeCn.csi.cards.CFS.desc')
  }
]);

function isSelected(value) {
  return selectedValues.value.includes(value);
}

function isLocked(value) {
  return value === REQUIRED_CSI;
}

function toggleSelect(value) {
  if (props.disabled || isLocked(value)) {
    return;
  }

  const next = [...selectedValues.value];
  const index = next.indexOf(value);

  if (index >= 0) {
    next.splice(index, 1);
  } else {
    next.push(value);
  }

  if (!next.includes(REQUIRED_CSI)) {
    next.unshift(REQUIRED_CSI);
  }

  emit('update:value', next);
}
</script>

<template>
  <div class="csi-card-select">
    <div class="section-title">
      {{ intl('tkeCn.csi.label') }}
      <span class="required-mark">*</span>
    </div>
    <div class="section-desc">
      {{ intl('tkeCn.csi.description') }}
    </div>

    <div class="csi-grid">
      <button
        v-for="item in csiOptions"
        :key="item.value"
        type="button"
        class="csi-card"
        :class="{
          active: isSelected(item.value),
          disabled: disabled || isLocked(item.value),
          locked: isLocked(item.value)
        }"
        :disabled="disabled"
        @click="toggleSelect(item.value)"
      >
        <div class="csi-card__head">
          <span
            class="csi-card__checkbox"
            :class="{
              active: isSelected(item.value),
              locked: isLocked(item.value)
            }"
          />
          <span class="csi-card__title">
            {{ item.title }}
            <span
              v-if="isLocked(item.value)"
              class="builtin-mark"
            >
              Built-in
            </span>
          </span>
        </div>

        <div class="csi-card__desc">
          {{ item.desc }}
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.csi-card-select {
  width: 100%;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--body-text);
}
.required-mark {
  color: var(--error);
}
.section-desc {
  margin-bottom: 14px;
  color: var(--input-label);
  font-size: 13px;
  line-height: 1.6;
}
.csi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.csi-card {
  display: block;
  width: 100%;
  min-height: 120px;
  padding: 14px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--body-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  &:hover:not(.disabled) {
    border-color: #12b12aff;
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.08);
  }
  &.active {
    border-color: var(--primary);
    background: #eef4ff;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);

    .csi-card__title,
    .csi-card__desc {
      color: var(--primary);
    }
  }
  &.disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  &.locked {
    cursor: not-allowed;
    opacity: 0.9;
  }
}
.csi-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.csi-card__checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--body-bg);
  flex-shrink: 0;
  position: relative;
  &.active,
  &.locked {
    border-color: var(--primary);
    background: var(--primary);
    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 2px;
      width: 5px;
      height: 9px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }
}
.csi-card__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--body-text);
  line-height: 1.4;
}
.builtin-mark {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  background: rgba(55, 115, 245, 0.12);
  vertical-align: middle;
}
.csi-card__desc {
  color: var(--input-label);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}
@media (max-width: 1400px) {
  .csi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .csi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
