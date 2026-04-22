<script setup>
import { cloneDeep, find } from 'lodash';
import { computed, watch, ref } from 'vue';
import { useStore } from 'vuex';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { stringify } from '@shell/utils/error';
import Banner from '@components/Banner/Banner.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import SortableTable from '@shell/components/SortableTable';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import DeletionProtectionSwitch from './DeletionProtectionSwitch.vue';

const props = defineProps({
  virtualNodes:         { type: Array, default: () => ([]) },
  nodePoolName:         { type: String, default: '' },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: false },
  isImported:           { type: Boolean, default: false },
  subnetOptions:        { type: Array, default: () => ([]) },
  zoneOptions:          { type: Array, default: () => ([]) },
  rules:                { type: Object, default: () => ({}) },
  vpcId:                { type: String, default: '' },
  deletionProtection:   { type: Boolean, default: false },
});

const emit = defineEmits(['update:value', 'update:nodePoolName', 'update:deletionProtection']);
const errors = ref([]);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const zone = ref('');
const editingIndex = ref(null);
const currentIndex = ref(0);
const showEditModal = ref(false);
const editingZone = ref('');
const draft = ref(createEmptyVirtualNode());

function t(key, args) {
  return intl.value(key, args);
}

function createEmptyVirtualNode() {
  return {
    displayName: '',
    subnetId:    '',
    tags:        [],
  };
}

function getVirtualNodes() {
  return Array.isArray(props.virtualNodes) ? props.virtualNodes : [];
}

function setVirtualNodes(next) {
  emit('update:value', { virtualNodes: next });
}

function isValidIndex(index, list = getVirtualNodes()) {
  return index >= 0 && index < list.length;
}

function loadDraftByIndex(index) {
  const list = getVirtualNodes();
  const cur = list[index] || createEmptyVirtualNode();

  draft.value = {
    displayName: cur.displayName || '',
    subnetId:    cur.subnetId || '',
    tags:        Array.isArray(cur.tags) ? cur.tags : [],
  };
}

function syncDraftToCurrentNode() {
  if (!props.isNewOrUnprovisioned || editingIndex.value !== null) {
    return;
  }

  errors.value = [];

  const next = cloneDeep(getVirtualNodes());

  if (!next[currentIndex.value]) {
    next[currentIndex.value] = createEmptyVirtualNode();
  }

  next[currentIndex.value] = {
    ...(next[currentIndex.value] || {}),
    displayName: draft.value.displayName || '',
    subnetId:    draft.value.subnetId || '',
    tags:        Array.isArray(draft.value.tags) ? draft.value.tags : [],
  };

  setVirtualNodes(next);
}

function validateNode(node) {
  errors.value = [];

  if (!node.subnetId) {
    errors.value.push(t('tkeCn.superNodePool.errors.subnetRequired'));

    return false;
  }

  return true;
}

function selectSubnet(subnetId, checked) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  draft.value.subnetId = checked ? subnetId : '';

  if (editingIndex.value === null) {
    syncDraftToCurrentNode();
  }
}

function addVirtualNode() {
  if (!props.isNewOrUnprovisioned || editingIndex.value !== null) {
    return;
  }

  const node = {
    displayName: draft.value.displayName || '',
    subnetId:    draft.value.subnetId || '',
    tags:        Array.isArray(draft.value.tags) ? draft.value.tags : [],
  };

  if (!validateNode(node)) {
    return;
  }

  const next = cloneDeep(getVirtualNodes());

  if (!next[currentIndex.value]) {
    next[currentIndex.value] = createEmptyVirtualNode();
  }

  next[currentIndex.value] = {
    ...(next[currentIndex.value] || {}),
    ...node,
  };

  next.push(createEmptyVirtualNode());
  setVirtualNodes(next);

  currentIndex.value = next.length - 1;
  errors.value = [];
  loadDraftByIndex(currentIndex.value);
}

function openEditModal(realIndex) {
  const list = getVirtualNodes();
  const cur = list[realIndex];

  if (!cur || !props.isNewOrUnprovisioned) {
    return;
  }
  editingIndex.value = realIndex;
  errors.value = [];
  loadDraftByIndex(realIndex);

  const currentSubnet = find(props.subnetOptions || [], (r) => r.value === cur.subnetId);

  if (currentSubnet?.Zone) {
    editingZone.value = currentSubnet.Zone;
  }
  showEditModal.value = true;
}

function saveEdit() {
  if (!props.isNewOrUnprovisioned || editingIndex.value === null) {
    return;
  }

  const node = {
    displayName: draft.value.displayName || '',
    subnetId:    draft.value.subnetId || '',
    tags:        Array.isArray(draft.value.tags) ? draft.value.tags : [],
  };

  if (!validateNode(node)) {
    return;
  }

  const next = cloneDeep(getVirtualNodes());

  if (isValidIndex(editingIndex.value, next)) {
    next[editingIndex.value] = {
      ...(next[editingIndex.value] || {}),
      ...node,
    };
  }

  setVirtualNodes(next);
  errors.value = [];
  showEditModal.value = false;
  editingZone.value = '';
  editingIndex.value = null;
  loadDraftByIndex(currentIndex.value);
}

function cancelEdit() {
  errors.value = [];
  showEditModal.value = false;
  editingZone.value = '';
  editingIndex.value = null;
  loadDraftByIndex(currentIndex.value);
}

function removeVirtualNode(realIndex) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }
  if (realIndex === currentIndex.value) {
    return;
  }

  const next = cloneDeep(getVirtualNodes());

  next.splice(realIndex, 1);
  if (realIndex < currentIndex.value) {
    currentIndex.value -= 1;
  }
  if (next.length === 0) {
    next.push(createEmptyVirtualNode());
    currentIndex.value = 0;
  }
  setVirtualNodes(next);
  if (editingIndex.value !== null) {
    if (editingIndex.value === realIndex) {
      showEditModal.value = false;
      editingIndex.value = null;
      loadDraftByIndex(currentIndex.value);
    } else if (editingIndex.value > realIndex) {
      editingIndex.value -= 1;
    }
  }
}

function subnetRowById(id) {
  return find(props.subnetOptions || [], (r) => r.value === id);
}

function displaySubnetLabel(id) {
  const row = subnetRowById(id);

  return row?.label || id || '';
}

function displayAvailableZone(subnetId) {
  const row = find(props.subnetOptions || [], (r) => r.value === subnetId);
  const zone = props.zoneOptions.find((z) => z.value === row?.Zone);

  return zone?.label || zone?.value || row?.Zone || '';
}

const SUBNET_COLUMNS = computed(() => [
  {
    name:  'selected',
    label: '',
    width: 40
  },
  {
    name:  'label',
    label: t('tkeCn.superNodePool.subnetTable.name'),
    value: 'label'
  },
  {
    name:  'value',
    label: t('tkeCn.superNodePool.subnetTable.id'),
    value: 'value'
  },
  {
    name:  'cidr',
    label: t('tkeCn.superNodePool.subnetTable.cidr'),
    value: 'CidrBlock'
  },
  {
    name:  'zone',
    label: t('tkeCn.superNodePool.subnetTable.zone'),
    value: 'zoneLabel'
  },
  {
    name:  'ip',
    label: t('tkeCn.superNodePool.subnetTable.availableIp'),
    value: 'AvailableIpAddressCount'
  },
]);

const displayedVirtualNodes = computed(() => {
  return getVirtualNodes().map((vn, index) => ({ ...vn, _index: index }));
});

const filteredSubnetOptions = computed(() => {
  const selectedZone = editingIndex.value !== null ? (editingZone.value || zone.value) : zone.value;

  if (!props.vpcId || !selectedZone) {
    return [];
  }

  return props.subnetOptions
    .filter((item) => item.Zone === selectedZone && item.VpcId === props.vpcId)
    .map((item) => {
      const matchedZone = props.zoneOptions.find((z) => z.value === item.Zone);

      return {
        ...item,
        zoneLabel: matchedZone?.label || item.Zone,
      };
    });
});

watch(
  [() => props.zoneOptions, () => props.subnetOptions, () => props.isNewOrUnprovisioned],
  ([zoneOptions, subnetOptions, isNew]) => {
    if (!Array.isArray(zoneOptions) || zoneOptions.length === 0) {
      zone.value = '';

      return;
    }

    const exists = zoneOptions.some((item) => item.value === zone.value);

    if (editingIndex.value !== null) {
      const currentSubnet = find(subnetOptions || [], (r) => r.value === draft.value.subnetId);

      if (currentSubnet?.Zone) {
        zone.value = currentSubnet.Zone;
      }

      return;
    }
    const currentSubnetId = draft.value.subnetId || getVirtualNodes()?.[currentIndex.value]?.subnetId || '';

    if (!isNew && currentSubnetId) {
      const currentSubnet = find(subnetOptions || [], (r) => r.value === currentSubnetId);

      if (currentSubnet?.Zone) {
        zone.value = currentSubnet.Zone;
      }

      return;
    }

    if (isNew && !exists) {
      zone.value = zoneOptions[0].value;
    }
  },
  {
    immediate: true,
    deep:      true,
  }
);

watch(
  () => props.virtualNodes,
  (list) => {
    const nodes = Array.isArray(list) ? list : [];

    currentIndex.value = Math.max(0, nodes.length - 1);

    if (editingIndex.value !== null && !isValidIndex(editingIndex.value, nodes)) {
      editingIndex.value = null;
      showEditModal.value = false;
    }

    if (editingIndex.value === null) {
      loadDraftByIndex(currentIndex.value);
    }
  },
  {
    immediate: true,
    deep:      true,
  }
);

watch(
  [filteredSubnetOptions, () => props.vpcId, () => props.isNewOrUnprovisioned],
  ([options, vpcId, isNew]) => {
    if (!isNew || !Array.isArray(options) || options.length === 0 || !vpcId) {
      return;
    }
    const list = getVirtualNodes();

    if (!Array.isArray(list) || list.length === 0) {
      return;
    }

    const firstNode = list[0];

    if (firstNode?.subnetId) {
      return;
    }

    const next = cloneDeep(list);

    next[0] = {
      ...(next[0] || createEmptyVirtualNode()),
      subnetId: options[0].value || '',
    };

    setVirtualNodes(next);

    if (editingIndex.value === null) {
      loadDraftByIndex(currentIndex.value);
    }
  },
  {
    immediate: true,
    deep:      true,
  }
);
</script>

<template>
  <div class="basic-layout-row">
    <div class="config-card config-card--basic">
      <h3 class="title">
        {{ intl('tkeCn.superNodePool.basic.title') }}
      </h3>
      <div class="hint">
        {{ intl('tkeCn.superNodePool.basic.titleHelp') }}
      </div>
      <div class="config-card__content">
        <LabeledInput
          :value="nodePoolName"
          :mode="mode"
          :label="intl('tkeCn.nodePoolName.label')"
          required
          :disabled="isImported"
          :rules="rules.name"
          @update:value="emit('update:nodePoolName', $event)"
        />
      </div>
    </div>
    <div class="config-card config-card--protection">
      <h3 class="title">
        {{ intl('tkeCn.nodePool.deletionProtection.label') }}
      </h3>
      <div class="hint">
        {{ intl('tkeCn.nodePool.deletionProtection.description') }}
      </div>
      <div class="config-card__content config-card__content--protection">
        <DeletionProtectionSwitch
          :checked="deletionProtection"
          :t="intl"
          :disabled="isImported"
          @toggle-change="emit('update:deletionProtection', $event)"
        />
      </div>
    </div>
  </div>
  <div class="mt-20 card-container">
    <h3 class="title">
      {{ intl('tkeCn.superNodePool.config.title') }}
      <span class="required-mark">*</span>
    </h3>
    <div class="hint">
      {{ intl('tkeCn.superNodePool.config.hint') }}
    </div>
    <div class="row mt-10">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="zone"
          data-testid="crutke-node-pool-resource-zone"
          :mode="mode"
          :options="zoneOptions"
          option-label="label"
          option-key="value"
          label-key="tkeCn.zone.label"
          :disabled="!isNewOrUnprovisioned || isImported"
        />
      </div>
    </div>
    <h3 class="title mt-10">
      {{ intl('tkeCn.fields.subnetId') }}
      <span class="required-mark">*</span>
    </h3>
    <div class="hint">
      {{ intl('tkeCn.superNodePool.basic.hint') }}
    </div>
    <div class="mt-10">
      <SortableTable
        :loading="false"
        :rows="filteredSubnetOptions"
        :headers="SUBNET_COLUMNS"
        :table-actions="false"
        :row-actions="false"
        :rows-per-page="10"
        :paging="true"
        :search="false"
        key-field="value"
        class="mb-10"
      >
        <template #cell:selected="{ row }">
          <Checkbox
            :value="draft.subnetId === row.value"
            :disabled="!isNewOrUnprovisioned || isImported"
            @update:value="selectSubnet(row.value, $event)"
          />
        </template>
      </SortableTable>
      <div
        v-if="!subnetOptions || subnetOptions.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.subnetEmpty') }}
      </div>
    </div>
    <Banner
      v-for="(err, i) in errors"
      v-show="!showEditModal"
      :key="i"
      color="error"
      :label="stringify(err)"
    />
    <div class="section-title mt-20">
      {{ intl('tkeCn.superNodePool.added.title') }}
    </div>
    <div
      v-if="displayedVirtualNodes.length === 0"
      class="hint"
    >
      {{ intl('tkeCn.superNodePool.added.empty') }}
    </div>
    <div class="vn-grid mt-10">
      <div
        v-for="vn in displayedVirtualNodes"
        :key="`vn-${vn._index}`"
        :class="['vn-card', { 'vn-card--current': vn._index === currentIndex }]"
      >
        <div class="vn-head">
          <div class="vn-title">
            {{ vn.displayName || intl('tkeCn.superNodePool.added.defaultNodeName', { index: vn._index + 1 }) }}
          </div>
          <div class="vn-actions">
            <button
              v-show="isNewOrUnprovisioned"
              class="btn-link"
              type="button"
              :disabled="!isNewOrUnprovisioned || isImported"
              @click="openEditModal(vn._index)"
            >
              {{ intl('tkeCn.superNodePool.actions.edit') }}
            </button>
            <button
              v-show="isNewOrUnprovisioned && vn._index !== currentIndex"
              class="btn-danger"
              type="button"
              :disabled="!isNewOrUnprovisioned || isImported"
              @click="removeVirtualNode(vn._index)"
            >
              {{ intl('tkeCn.superNodePool.actions.delete') }}
            </button>
          </div>
        </div>
        <div class="vn-body">
          <div class="kv">
            <span class="k">{{ intl('tkeCn.superNodePool.card.resourceType') }}</span>
            <span class="v">{{ intl('tkeCn.superNodePool.card.postpaid') }}</span>
          </div>
          <div class="kv">
            <span class="k">{{ intl('tkeCn.superNodePool.card.availabilityZone') }}</span>
            <span class="v">
              <template v-if="displayAvailableZone(vn.subnetId)">
                {{ displayAvailableZone(vn.subnetId) }}
              </template>
              <span
                v-else
                class="required-mark"
              >
                *
              </span>
            </span>
          </div>
          <div class="kv">
            <span class="k">{{ intl('tkeCn.superNodePool.card.nodeNetwork') }}</span>
            <span class="v">
              <template v-if="displaySubnetLabel(vn.subnetId) && displaySubnetLabel(vn.subnetId) !== '-'">
                {{ displaySubnetLabel(vn.subnetId) }}
              </template>
              <span
                v-else
                class="required-mark"
              >
                *
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="super-node-add mt-10">
      <button
        class="super-node-add__btn"
        type="button"
        :disabled="!isNewOrUnprovisioned || isImported"
        @click="addVirtualNode"
      >
        <span class="super-node-add__icon">+</span>
        <span>{{ intl('tkeCn.superNodePool.actions.add') }}</span>
      </button>
    </div>
  </div>
  <div
    v-if="showEditModal"
    class="edit-modal-backdrop"
    @click.self="cancelEdit"
  >
    <div class="edit-modal">
      <div class="edit-modal__header">
        <h3 class="edit-modal__title">
          {{ intl('tkeCn.superNodePool.added.defaultNodeName', { index: editingIndex + 1 }) }}
        </h3>
        <button
          type="button"
          class="edit-modal__close"
          @click="cancelEdit"
        >
          ×
        </button>
      </div>
      <div class="edit-modal__body">
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="editingZone"
              data-testid="crutke-node-pool-resource-zone"
              :mode="mode"
              :options="zoneOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.zone.label"
              :disabled="!isNewOrUnprovisioned"
            />
          </div>
        </div>
        <SortableTable
          :loading="false"
          :rows="filteredSubnetOptions"
          :headers="SUBNET_COLUMNS"
          :table-actions="false"
          :row-actions="false"
          :rows-per-page="10"
          :paging="true"
          :search="false"
          key-field="value"
          class="mb-10"
        >
          <template #cell:selected="{ row }">
            <Checkbox
              :value="draft.subnetId === row.value"
              :disabled="!isNewOrUnprovisioned"
              @update:value="selectSubnet(row.value, $event)"
            />
          </template>
        </SortableTable>
        <Banner
          v-for="(err, i) in errors"
          :key="`edit-err-${i}`"
          color="error"
          :label="stringify(err)"
        />
      </div>
      <div class="edit-modal__footer">
        <button
          class="btn-ghost"
          type="button"
          @click="cancelEdit"
        >
          {{ intl('tkeCn.superNodePool.actions.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click="saveEdit"
        >
          {{ intl('tkeCn.superNodePool.actions.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.basic-layout-row {
  display: grid;
  grid-template-columns: minmax(0,1.3fr) minmax(220px,0.7fr);
  gap: 10px;
  align-items: stretch;
}
.config-card {
  padding: 10px;
  border-radius: var(--border-radius);
  background: var(--body-bg);
  box-shadow: 0 0 20px var(--shadow);
}
.config-card__content {
  margin-top: 10px;
}
.config-card__content--protection {
  display: flex;
  align-items: center;
}
.required-mark {
  color: var(--error);
}
.card-container {
  padding: 10px;
  border-radius: var(--border-radius);
  background: var(--body-bg);
  box-shadow: 0 0 20px var(--shadow);
}
.title {
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-weight: 700;
}
.hint {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
}
.actions-right {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 10px;
}
.btn-primary {
  padding: 6px 12px;
  border: 1px solid var(--primary);
  border-radius: var(--border-radius);
  background: var(--primary);
  color: var(--primary-text, #fff);
  cursor: pointer;
}
.btn-ghost {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.btn-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--link);
  cursor: pointer;
}
.btn-danger {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--error);
  cursor: pointer;
}
.vn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.vn-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.vn-card--current {
  border-color: var(--primary);
  background: #f5faff;
}
.vn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.vn-title {
  font-weight: 700;
}
.vn-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vn-body {
  margin-top: 10px;
}
.kv {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  margin-top: 6px;
  font-size: 13px;
}
.k {
  color: var(--input-label);
}
.v {
  color: #111827;
}
.edit-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(17 24 39 / 45%);
}
.edit-modal {
  display: flex;
  flex-direction: column;
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 12px;
  background: var(--body-bg);
  box-shadow: 0 12px 40px rgb(0 0 0 / 20%);
}
.edit-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
}
.edit-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.edit-modal__close {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.edit-modal__body {
  padding: 20px;
  overflow: auto;
}
.edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--body-bg);
}
@media (max-width: 1100px) {
  .vn-grid {
    grid-template-columns: 1fr;
  }
}
.super-node-add {
  display: flex;
  justify-content: center;
  padding: 10px 10px 0 0;
  border-top: 1px dashed var(--border);
}
.super-node-add__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #f5f7fa;
  color: #3d4148;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.super-node-add__btn:hover:not(:disabled) {
  background: #eef2f6;
  border-color: #c9d1db;
}
.super-node-add__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.super-node-add__icon {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
</style>
