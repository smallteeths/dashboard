<template>
  <div class="deletion-protection-row">
    <label
      class="switch-for-nodepool"
      :class="{
        'switch-for-nodepool--disabled': !checked
      }"
      @click="toggleChange"
    >
      <input
        :checked="checked"
        :value="checked"
        type="checkbox"
        @click.stop.prevent
      >
      <div :class="checked ? 'is-enabled' : 'is-disabled'" />
      <span class="enabled">{{ t('generic.enabled') }}</span>
      <span class="disabled">{{ t('generic.disabled') }}</span>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  checked: {
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
  emit('toggle-change', !props.checked);
}
</script>

<style scoped>
.switch-for-nodepool {
  display: inline-block;
  position: relative;
  width: 6.4em;
  height: 2em;
  border-radius: 2.5em;
  background: var(--primary);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  transition: background 0.25s ease;
  flex-shrink: 0;
}
.switch-for-nodepool.switch-for-nodepool--disabled {
  background: var(--disabled-bg, #c9cdd4);
  opacity: 0.85;
}
.switch-for-nodepool input {
  display: none;
}
.switch-for-nodepool div {
  position: relative;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 0.1em 0.3em rgb(0 0 0 / 30%);
  transition: all 300ms;
}
.switch-for-nodepool div.is-enabled {
  left: 14px;
  background: #fff;
}
.switch-for-nodepool div.is-disabled {
  left: 3px;
  background: #fff;
}
.switch-for-nodepool .enabled,
.switch-for-nodepool .disabled {
  position: absolute;
  top: 0;
  font-size: 12px;
  line-height: 2.2em;
  color: #fff;
  white-space: nowrap;
}
.switch-for-nodepool .enabled {
  left: 14px;
  display: none;
}
.switch-for-nodepool .disabled {
  right: 12px;
  color: #000;
  display: inline-block;
}
.switch-for-nodepool input:checked + div + .enabled {
  display: inline-block;
}
.switch-for-nodepool input:checked + div + .enabled + .disabled {
  display: none;
}
.switch-for-nodepool input:checked + div {
  transform: translate3d(230%,0,0);
}
</style>
