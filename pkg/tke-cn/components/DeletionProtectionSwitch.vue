<template>
  <div class="deletion-protection-row">
    <label
      class="switch-for-nodepool"
      :class="{
        'switch-for-nodepool--checked': checked,
        'switch-for-nodepool--unchecked': !checked,
        'switch-for-nodepool--disabled': disabled
      }"
      role="switch"
      @click="toggleChange"
    >
      <input
        :checked="checked"
        :disabled="disabled"
        type="checkbox"
        @click.stop.prevent
      >
      <div class="switch-for-nodepool__thumb" />
      <span class="switch-for-nodepool__text switch-for-nodepool__text--enabled">
        {{ t('generic.enabled') }}
      </span>
      <span class="switch-for-nodepool__text switch-for-nodepool__text--disabled">
        {{ t('generic.disabled') }}
      </span>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  checked: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  t: {
    type:     Function,
    required: true,
  },
});

const emit = defineEmits(['toggle-change']);

function toggleChange() {
  if (props.disabled) {
    return;
  }
  emit('toggle-change', !props.checked);
}
</script>

<style scoped>
.switch-for-nodepool {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 6.4em;
  height: 2em;
  border-radius: 2.5em;
  background: var(--disabled-bg, #c9cdd4);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  transition: background 0.25s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}
.switch-for-nodepool--checked {
  background: var(--primary);
}
.switch-for-nodepool--unchecked {
  background: var(--disabled-bg, #c9cdd4);
}
.switch-for-nodepool--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.switch-for-nodepool input {
  display: none;
}
.switch-for-nodepool__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 0.1em 0.3em rgb(0 0 0 / 30%);
  transition: transform 300ms ease;
}
.switch-for-nodepool--checked .switch-for-nodepool__thumb {
  transform: translate3d(calc(6.4em - 26px), 0, 0);
}
.switch-for-nodepool__text {
  position: absolute;
  top: 0;
  font-size: 12px;
  line-height: 2.2em;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.2s ease, color 0.2s ease;
}
.switch-for-nodepool__text--enabled {
  left: 14px;
  color: #fff;
  opacity: 0;
}
.switch-for-nodepool__text--disabled {
  right: 12px;
  color: var(--body-text);
  opacity: 1;
}
.switch-for-nodepool--checked .switch-for-nodepool__text--enabled {
  opacity: 1;
}
.switch-for-nodepool--checked .switch-for-nodepool__text--disabled {
  opacity: 0;
}
.switch-for-nodepool--disabled.switch-for-nodepool--checked .switch-for-nodepool__text--enabled {
  color: rgb(255 255 255 / 90%);
}
.switch-for-nodepool--disabled.switch-for-nodepool--unchecked .switch-for-nodepool__text--disabled {
  color: var(--input-label);
}
.switch-for-nodepool--disabled .switch-for-nodepool__thumb {
  box-shadow: none;
}
</style>
