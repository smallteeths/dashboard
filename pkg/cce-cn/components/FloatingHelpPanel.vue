<template>
  <div
    v-if="items.length"
    class="floating-help-panel"
  >
    <VDropdown
      theme="floating-help"
      popoverBaseClass="v-popper--theme-floating-help"
      placement="top-start"
      :distance="12"
      :skidding="-120"
      :triggers="['click']"
      :auto-hide="false"
      :dispose-timeout="0"
    >
      <button
        type="button"
        class="floating-help-panel__trigger"
        :title="title"
        :aria-label="title"
      >
        <i class="icon icon-warning group-icon" />
      </button>

      <template #popper="{ hide }">
        <div class="floating-help-panel__content error-card">
          <div class="floating-help-panel__header">
            <div class="error-card__title">
              {{ title }}
            </div>
            <button
              type="button"
              class="floating-help-panel__close"
              :aria-label="closeLabel"
              @click="hide()"
            >
              x
            </button>
          </div>

          <ul class="floating-help-panel__list card__list">
            <li
              v-for="item in items"
              :key="item"
              class="floating-help-panel__item"
            >
              {{ item }}
            </li>
          </ul>
        </div>
      </template>
    </VDropdown>
  </div>
</template>

<script setup>
import { Dropdown as VDropdown } from 'floating-vue';

defineProps({
  title: {
    type:    String,
    default: 'Help'
  },
  items: {
    type:    Array,
    default: () => []
  },
  closeLabel: {
    type:    String,
    default: 'Close'
  }
});
</script>

<style scoped>
.floating-help-panel {
  position: fixed;
  right: 230px;
  bottom: 5px;
  z-index: 1000;
}

.floating-help-panel__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  font-size: 24px;
  color: var(--error);
  cursor: pointer;
  background-color: transparent;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.floating-help-panel__trigger:hover {
  box-shadow: 0 4px 14px rgb(0 0 0 / 16%);
  transform: translateY(-1px);
}

.floating-help-panel__content {
  width: 320px;
  max-height: min(420px, calc(100vh - 32px));
  overflow: hidden;
}

.floating-help-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.floating-help-panel__close {
  flex: 0 0 auto;
  padding: 0 0 10px;
  border: none;
  background: transparent;
  color: var(--muted, #6b7280);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.floating-help-panel__close:hover {
  color: var(--body-text, #1f2329);
}

.floating-help-panel__list {
  max-height: 360px;
  margin: 0;
  padding: 12px 16px 12px 32px;
  overflow-y: auto;
}

.floating-help-panel__item {
  color: var(--body-text, #344054);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.floating-help-panel__item + .floating-help-panel__item {
  margin-top: 6px;
}

.error-card {
  margin: 0;
  padding: 12px 16px;
  border-left: 4px solid #d94848;
  border-radius: 8px;
  background: #fff6f6;
}

.error-card__title {
  margin-bottom: 8px;
  color: var(--error);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}
</style>

<style>
.v-popper--theme-floating-help .v-popper__inner {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

.v-popper--theme-floating-help .v-popper__arrow-container {
  display: none !important;
}
</style>
