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

const props = defineProps({
  value:                { type: Object, default: () => ({}) },
  nodePoolName:         { type: String, default: '' },
  mode:                 { type: String, required: true },
  isNewOrUnprovisioned: { type: Boolean, default: false },
  subnetOptions:        { type: Array, default: () => ([]) },
  zoneOptions:          { type: Array, default: () => ([]) },
  rules:                { type: Object, default: () => ({}) },
  vpcId:                { type: String, default: '' },
});
const emit = defineEmits(['update:value', 'update:nodePoolName']);
const errors = ref([]);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const zone = ref('');

function t(key, args) {
  return intl.value(key, args);
}

function patch(p) {
  emit('update:value', { ...(props.value || {}), ...p });
}

function virtualNodes() {
  return Array.isArray(props.value?.virtualNodes) ? props.value.virtualNodes : [];
}

function setVirtualNodes(next) {
  patch({ virtualNodes: next });
}

const editingIndex = ref(null);
const draft = ref({
  displayName: '',
  subnetId:    '',
});

function resetDraft() {
  errors.value = [];
  editingIndex.value = null;
  draft.value = { displayName: '', subnetId: '' };
}

function selectSubnet(subnetId, checked) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  draft.value.subnetId = checked ? subnetId : '';
}

// function selectVirtualNodePoolSubnet(subnetId, checked) {
//   if (!props.isNewOrUnprovisioned) {
//     return;
//   }
//   checked ? patch({ subnetIds: [subnetId] }) : patch({ subnetIds: [] });
// }

function subnetRowById(id) {
  return find(props.subnetOptions || [], (r) => r.value === id);
}

function displaySubnetLabel(id) {
  const row = subnetRowById(id);

  return row?.label || id || '-';
}

function displayAvailableZone(subnetId) {
  const row = find(filteredSubnetOptions.value || [], (r) => r.value === subnetId);

  return row?.zoneLabel || '-';
}

function saveDraftToList() {
  errors.value = [];
  if (!props.isNewOrUnprovisioned) {
    return;
  }
  const node = {
    displayName: draft.value.displayName || '',
    subnetId:    draft.value.subnetId || '',
    tags:        [],
  };

  if (!node.subnetId) {
    errors.value.push(t('tkeCn.superNodePool.errors.subnetRequired'));

    return;
  }

  const next = cloneDeep(virtualNodes());

  if (editingIndex.value !== null && editingIndex.value >= 0 && editingIndex.value < next.length) {
    next[editingIndex.value] = { ...(next[editingIndex.value] || {}), ...node };
    setVirtualNodes(next);
    resetDraft();

    return;
  }

  next.push(node);
  setVirtualNodes(next);
  resetDraft();
}

function removeVirtualNode(i) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  const next = cloneDeep(virtualNodes());

  next.splice(i, 1);
  setVirtualNodes(next);
  if (editingIndex.value === i) {
    resetDraft();
  } else if (editingIndex.value !== null && editingIndex.value > i) {
    editingIndex.value -= 1;
  }
}

function editVirtualNode(i) {
  const list = virtualNodes();
  const cur = list[i];

  if (!cur) {
    return;
  }

  editingIndex.value = i;
  draft.value = {
    displayName: cur.displayName || '',
    subnetId:    cur.subnetId || '',
  };
}

function cancelEdit() {
  resetDraft();
}

const SUBNET_COLUMNS = computed(() => [
  {
    name: 'selected', label: '', width: 40
  },
  {
    name: 'label', label: t('tkeCn.superNodePool.subnetTable.name'), value: 'label'
  },
  {
    name: 'value', label: t('tkeCn.superNodePool.subnetTable.id'), value: 'value'
  },
  {
    name: 'cidr', label: t('tkeCn.superNodePool.subnetTable.cidr'), value: 'CidrBlock'
  },
  {
    name: 'zone', label: t('tkeCn.superNodePool.subnetTable.zone'), value: 'zoneLabel'
  },
  {
    name: 'ip', label: t('tkeCn.superNodePool.subnetTable.availableIp'), value: 'AvailableIpAddressCount'
  },
]);

watch(
  () => props.zoneOptions,
  (zoneOptions) => {
    if (!Array.isArray(zoneOptions) || zoneOptions.length === 0) {
      zone.value = '';

      return;
    }

    const exists = zoneOptions.some((item) => item.value === zone.value);

    const firstVirtualNodeSubnetId = props.value?.virtualNodes?.[0]?.subnetId || '';

    if (!props.isNewOrUnprovisioned || firstVirtualNodeSubnetId) {
      const currentSubnet = find(props.subnetOptions || [], (r) => r.value === firstVirtualNodeSubnetId);

      if (currentSubnet?.Zone) {
        zone.value = currentSubnet.Zone;
      }

      return;
    }

    if (!zone.value || !exists) {
      zone.value = zoneOptions[0].value;
    }
  },
  {
    immediate: true,
    deep:      true,
  }
);

const isEditing = computed(() => editingIndex.value !== null);
const actionText = computed(() => (isEditing.value ? t('tkeCn.superNodePool.actions.save') : t('tkeCn.superNodePool.actions.add')));
const filteredSubnetOptions = computed(() => {
  if (!props.vpcId || !zone.value) {
    return [];
  }

  return props.subnetOptions
    .filter((item) => item.Zone === zone.value && item.VpcId === props.vpcId)
    .map((item) => {
      const matchedZone = props.zoneOptions.find((z) => z.value === item.Zone);

      return {
        ...item,
        zoneLabel: matchedZone?.label || item.Zone,
      };
    });
});
</script>

<template>
  <div class="m-0 mb-10 card-container">
    <h3 class="title">
      {{ intl('tkeCn.superNodePool.basic.title') }}
    </h3>
    <div class="row mb-10">
      <div class="col span-6">
        <LabeledInput
          :value="nodePoolName"
          :mode="mode"
          :label="intl('tkeCn.nodePoolName.label')"
          required
          :disabled="!isNewOrUnprovisioned"
          :rules="rules.name"
          @update:value="emit('update:nodePoolName', $event)"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="zone"
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
    <div class="hint">
      {{ intl('tkeCn.superNodePool.basic.hint') }}
    </div>
    <!-- <div class="mt-10">
      <SortableTable
        v-if="true"
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
            :value="value?.subnetIds?.[0] === row.value"
            :disabled="!isNewOrUnprovisioned"
            @update:value="selectVirtualNodePoolSubnet(row.value, $event)"
          />
        </template>
      </SortableTable>
      <div
        v-if="!subnetOptions || subnetOptions.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.subnetEmpty') }}
      </div>
    </div> -->
  </div>
  <div class="mt-20 card-container">
    <h3 class="title">
      {{ intl('tkeCn.superNodePool.config.title') }}
      <span class="required-mark">*</span>
    </h3>
    <div class="hint">
      {{ intl('tkeCn.superNodePool.config.hint', { action: actionText }) }}
    </div>
    <div class="row mt-10">
      <div class="col span-6">
        <LabeledInput
          :value="draft.displayName"
          :mode="mode"
          :label="intl('tkeCn.superNodePool.fields.nodeName')"
          :disabled="!isNewOrUnprovisioned"
          :placeholder="intl('tkeCn.superNodePool.fields.nodeNamePlaceholder')"
          @update:value="draft.displayName = $event"
        />
      </div>
      <div class="col span-6 actions-right">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!isNewOrUnprovisioned"
          @click="saveDraftToList"
        >
          {{ actionText }}
        </button>
        <button
          v-if="isEditing"
          class="btn-ghost"
          type="button"
          :disabled="!isNewOrUnprovisioned"
          @click="cancelEdit"
        >
          {{ intl('tkeCn.superNodePool.actions.cancel') }}
        </button>
      </div>
    </div>
    <div class="mt-10">
      <SortableTable
        v-if="true"
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
      <div
        v-if="!subnetOptions || subnetOptions.length === 0"
        class="hint"
      >
        {{ intl('tkeCn.superNodePool.subnetEmpty') }}
      </div>
    </div>
    <Banner
      v-for="(err, i) in errors"
      :key="i"
      color="error"
      :label="stringify(err)"
    />
    <div class="section-title mt-20">
      {{ intl('tkeCn.superNodePool.added.title') }}
    </div>
    <div
      v-if="virtualNodes().length === 0"
      class="hint"
    >
      {{ intl('tkeCn.superNodePool.added.empty') }}
    </div>
    <div class="vn-grid mt-10">
      <div
        v-for="(vn, i) in virtualNodes()"
        :key="`vn-${i}`"
        class="vn-card"
        :class="{ active: editingIndex === i }"
      >
        <div class="vn-head">
          <div class="vn-title">
            {{ vn.displayName || intl('tkeCn.superNodePool.added.defaultNodeName', { index: i + 1 }) }}
          </div>

          <div class="vn-actions">
            <button
              v-show="isNewOrUnprovisioned"
              class="btn-link"
              type="button"
              :disabled="!isNewOrUnprovisioned"
              @click="editVirtualNode(i)"
            >
              {{ intl('tkeCn.superNodePool.actions.edit') }}
            </button>
            <button
              v-show="isNewOrUnprovisioned"
              class="btn-danger"
              type="button"
              :disabled="!isNewOrUnprovisioned"
              @click="removeVirtualNode(i)"
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
            <span class="k">{{ displayAvailableZone(vn.subnetId) }}</span>
          </div>
          <div class="kv">
            <span class="k">{{ intl('tkeCn.superNodePool.card.nodeNetwork') }}</span>
            <span class="v">{{ displaySubnetLabel(vn.subnetId) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.required-mark {
  color: var(--error);
}
.card-container {
  border-radius: var(--border-radius);
  padding: 10px;
  box-shadow: 0 0 20px var(--shadow);
  background: var(--body-bg);
}
.title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
.section-title {
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:700;
  margin-top: 6px;
}
.hint {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
}
.actions-right {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 10px;
}
.btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: var(--primary-text, #fff);
  border-radius: var(--border-radius);
  padding: 6px 12px;
  cursor: pointer;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--border-radius);
  padding: 6px 12px;
  cursor: pointer;
}
.btn-link {
  background:transparent;
  border:none;
  color:var(--link);
  cursor:pointer;
  padding:0;
}
.btn-danger {
  background:transparent;
  border:none;
  color:var(--error);
  cursor:pointer;
  padding:0;
}
.vn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.vn-card {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 12px;
  background: #fff;
}
.vn-card.active {
  border-color: var(--primary);
  background: rgba(0,0,0,0.02);
}
.vn-head {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}
.vn-title {
  font-weight: 700;
}
.vn-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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
@media (max-width: 1100px) {
  .vn-grid {
    grid-template-columns: 1fr;
  }
}
</style>
