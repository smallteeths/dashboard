<template>
  <div class="labeled-code-mirror">
    <div
      class="field-header"
      :class="{ 'is-expanded': isExpanded }"
      @click="toggleExpand"
    >
      <div class="field-header-left">
        <label
          v-if="label"
          class="field-label"
          @click.stop
        >
          <span>{{ label }}</span>
          <span
            v-if="required"
            class="required"
          >*</span>
        </label>
        <div
          v-if="!isExpanded"
          class="field-preview"
        >
          <template v-if="modelValue?.trim()">
            {{ previewText }}
          </template>
          <template v-else>
            {{ intl('tkeCn.userData.preview') }}
          </template>
        </div>
        <div
          v-else-if="description"
          class="field-description"
        >
          {{ intl('tkeCn.userData.description') }}
        </div>
      </div>
      <button
        type="button"
        class="btn link toggle-btn"
        :aria-label="isExpanded ? 'Collapse User Data' : 'Expand User Data'"
        @click.stop="toggleExpand"
      >
        <i
          class="icon toggle-icon"
          :class="isExpanded ? 'icon-chevron-up' : 'icon-chevron-down'"
        />
      </button>
    </div>
    <transition name="expand">
      <div
        v-if="isExpanded"
        class="editor-container"
      >
        <div
          class="editor-wrapper"
          :class="{
            'is-disabled': disabled,
            'has-error': error
          }"
        >
          <CodeMirror
            :value="modelValue"
            :options="mergedOptions"
            :data-testid="dataTestid"
            :mode="disabled ? 'view' : 'edit'"
            @onInput="onInput"
          />
        </div>
        <div
          v-if="error"
          class="field-error"
        >
          {{ error }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { useStore } from 'vuex';
import { computed, ref } from 'vue';
import CodeMirror from '@shell/components/CodeMirror.vue';

const props = defineProps({
  modelValue: {
    type:    String,
    default: ''
  },
  label: {
    type:    String,
    default: ''
  },
  description: {
    type:    String,
    default: ''
  },
  error: {
    type:    String,
    default: ''
  },
  disabled: {
    type:    Boolean,
    default: false
  },
  required: {
    type:    Boolean,
    default: false
  },
  dataTestid: {
    type:    String,
    default: ''
  },
  minHeight: {
    type:    String,
    default: '220px'
  },
  defaultExpanded: {
    type:    Boolean,
    default: false
  },
  options: {
    type:    Object,
    default: () => ({})
  }
});

const store = useStore();
const emit = defineEmits(['update:modelValue']);
const isExpanded = ref(props.defaultExpanded);
const editorRef = ref(null);
const intl = computed(() => store.getters['i18n/t']);
const previewText = computed(() => {
  const text = (props.modelValue || '').trim();

  if (!text) {
    return '';
  }

  const firstLine = text.split('\n').find((line) => line.trim()) || text;

  return firstLine.length > 80 ? `${ firstLine.slice(0, 80) }...` : firstLine;
});

const mergedOptions = computed(() => {
  return {
    mode:              { name: 'shell' },
    lineNumbers:       true,
    lineWrapping:      true,
    foldGutter:        true,
    styleActiveLine:   true,
    matchBrackets:     true,
    autoCloseBrackets: true,
    indentUnit:        2,
    tabSize:           2,
    indentWithTabs:    false,
    cursorBlinkRate:   530,
    gutters:           ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    ...props.options,
  };
});

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function onInput(value) {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.labeled-code-mirror {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--body-bg);
}
.field-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 14px;
  cursor: pointer;
}
.field-header.is-expanded {
  border-bottom: 1px solid var(--border);
}
.field-header-left {
  min-width: 0;
  flex: 1;
}
.field-label {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: var(--input-label);
  cursor: pointer;
}
.required {
  margin-left: 4px;
  color: var(--error);
}
.field-description {
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--input-label);
  opacity: 0.85;
}
.field-preview {
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  word-break: break-word;
}
.toggle-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  boder: 0px;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--input-label);
}
.editor-container {
  padding: 12px 14px 14px;
}
.editor-wrapper {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--body-bg);
}
.editor-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.editor-wrapper.has-error {
  border-color: var(--error);
}
.editor-wrapper.is-disabled {
  opacity: 0.7;
}
:deep(.CodeMirror) {
  min-height: v-bind(minHeight);
  height: auto;
  font-size: 13px;
  line-height: 1.6;
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
}
:deep(.CodeMirror-scroll) {
  min-height: v-bind(minHeight);
}
:deep(.CodeMirror-gutters) {
  border-right: 1px solid var(--border);
  background: var(--body-bg);
}
.field-error {
  margin-top: 6px;
  font-size: 12px;
  color: var(--error);
}
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
