<script setup>
import { ref, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import ArrayListOrdered from './ArrayListOrdered.vue';
import { _CREATE } from '@shell/config/query-params';
import SortableTable from '@shell/components/SortableTable/index.vue';
import { fetchAvailableResourcesRaw } from '../util/request';
import {
  STATUS_AVAILABLE,
  INSTANCE_TYPE,
  WITH_STOCK,
  WITHOUT_STOCK,
  INSTANCE_TYPE_COLUMNS
} from '../util/config';

defineOptions({ name: 'InstanceType' });

const props = defineProps({
  mode:                 { type: String, default: _CREATE },
  value:                { type: Array, required: true }, // string[]
  config:               { type: Object, required: true }, // Record<string, any>
  disabled:             { type: Boolean, default: false },
  loadingInstanceTypes: { type: Boolean, default: false },
  allInstanceTypes:     { type: Object, default: () => ({}) },
  zones:                { type: Object, default: () => new Set() }, // Set<string>
  rules:                { type: Array, default: () => [] }, // ((val: string[]) => string | undefined)[]
});

const emit = defineEmits(['update:value', 'error']);
const store = useStore();
const { t } = useI18n(store);

const cpu = ref(undefined);
const memory = ref(undefined);
const localInstanceTypesLoading = ref(false);
const instanceTypeOptions = ref([]);
const typesDictionary = ref({});
const localInstanceTypes = ref([]);
const lastLocalInstanceTypesReqId = ref(0);

const instanceTypesList = computed({
  get: () => {
    return (props.value || []).map((instanceType) => {
      const fromDict = typesDictionary.value[instanceType];

      if (!fromDict) {
        return { label: instanceType, warning: true };
      }

      const labelParts = [instanceType];

      if (fromDict.vcpus && fromDict.vcpus !== '-') {
        labelParts.push(t('ackCn.nodePool.instanceTypes.table.labelParts.vcpus', { val: fromDict.vcpus }));
      }
      if (fromDict.memory && fromDict.memory !== '-') {
        labelParts.push(t('ackCn.nodePool.instanceTypes.table.labelParts.memory', { val: fromDict.memory }));
      }

      labelParts.push(fromDict.stock);
      labelParts.push((fromDict.zones || []).join(', '));

      return { label: labelParts.join(' - '), warning: false };
    });
  },
  set: (neu) => {
    const newInstanceTypes = (neu || []).map((it) => {
      return String(it.label || '').split(' - ')[0].trim();
    });

    emit('update:value', newInstanceTypes);
  }
});

const validationErrors = computed(() => {
  const ruleMessages = [];

  for (const rule of props.rules || []) {
    const message = rule(props.value);

    if (message) {
      ruleMessages.push(message);
    }
  }

  return ruleMessages;
});

function toggleInstanceType(instanceType, add) {
  const isSelected = (props.value || []).includes(instanceType);

  if (add && !isSelected) {
    emit('update:value', [...props.value, instanceType]);
  } else if (!add && isSelected) {
    emit('update:value', props.value.filter((x) => x !== instanceType));
  }
}

function formatInstanceTypesForTable() {
  const typesDictionaryNew = {};
  const availableZones = localInstanceTypes.value?.AvailableZones?.AvailableZone || [];

  availableZones.forEach((zone) => {
    const zoneAllowed =
      props.zones.size === 0 ||
      (zone.ZoneId && props.zones.has(zone.ZoneId)) ||
      props.disabled;

    if (zoneAllowed && zone.Status === STATUS_AVAILABLE) {
      const availableResources = zone.AvailableResources?.AvailableResource || [];

      availableResources.forEach((resource) => {
        if (resource.Type === INSTANCE_TYPE) {
          const instanceTypes = resource.SupportedResources?.SupportedResource || [];

          instanceTypes.forEach((type) => {
            if (type.StatusCategory === WITH_STOCK || type.StatusCategory === WITHOUT_STOCK) {
              const typeValue = type.Value;

              if (typesDictionaryNew[typeValue]) {
                typesDictionaryNew[typeValue].zones.push(zone.ZoneId);

                return;
              }

              if (props.allInstanceTypes[typeValue]) {
                const fromAll = props.allInstanceTypes[typeValue];
                const cpuMatches = !cpu.value || cpu.value === fromAll.cpu;
                const memoryMatches = !memory.value || memory.value === fromAll.memory;

                if (cpuMatches && memoryMatches) {
                  typesDictionaryNew[typeValue] = {
                    instanceFamily: fromAll.instanceTypeFamily,
                    vcpus:          fromAll.cpu,
                    memory:         fromAll.memory,
                    stock:          type.StatusCategory,
                    zones:          [zone.ZoneId]
                  };
                }

                return;
              }

              if (!memory.value && !cpu.value) {
                const typeSplit = String(typeValue).split('.');
                const family = `${ typeSplit[0] }.${ typeSplit[1] }`;

                typesDictionaryNew[typeValue] = {
                  instanceFamily: family,
                  vcpus:          '-',
                  memory:         '-',
                  stock:          type.StatusCategory,
                  zones:          [zone.ZoneId]
                };
              }
            }
          });
        }
      });
    }
  });

  const formatted = Object.entries(typesDictionaryNew).map(([key, val]) => {
    val.instanceType = key;

    return val;
  });

  return { formatted, typesDictionaryNew };
}

function updateTable() {
  const { formatted, typesDictionaryNew } = formatInstanceTypesForTable();

  instanceTypeOptions.value = formatted;
  typesDictionary.value = typesDictionaryNew;
}

async function getLocalInstanceTypes() {
  if (!props?.config?.regionId || !props?.config?.aliyun_credential_secret) {
    localInstanceTypes.value = [];
    instanceTypeOptions.value = [];
    typesDictionary.value = {};

    return;
  }

  const currentReqId = ++lastLocalInstanceTypesReqId.value;

  try {
    localInstanceTypesLoading.value = true;
    instanceTypeOptions.value = [];

    const externalParamsForAvailable = {
      regionId:            props.config.regionId,
      networkCategory:     'vpc',
      destinationResource: 'InstanceType'
    };

    const result = await fetchAvailableResourcesRaw({
      resource:          '',
      plural:            'AvailableResource',
      cloudCredentialId: props.config.aliyun_credential_secret,
      externalParams:    externalParamsForAvailable,
      store,
    });

    if (currentReqId !== lastLocalInstanceTypesReqId.value) {
      return;
    }

    localInstanceTypes.value = result;
  } catch (err) {
    if (currentReqId !== lastLocalInstanceTypesReqId.value) {
      return;
    }

    const parsedError = err.error || '';

    emit('error', t('ackCn.errors.instanceTypes', { e: parsedError || err }));
  } finally {
    if (currentReqId === lastLocalInstanceTypesReqId.value) {
      localInstanceTypesLoading.value = false;
    }
  }
}

watch(cpu, updateTable);
watch(memory, updateTable);
watch(localInstanceTypes, updateTable);

watch(
  () => props.zones,
  () => {
    getLocalInstanceTypes();
  }
);

watch(
  () => props.allInstanceTypes,
  () => {
    updateTable();
  },
  { deep: true }
);

getLocalInstanceTypes();
</script>

<template>
  <p
    class="mb-10"
  >
    {{ t('ackCn.nodePool.instanceTypes.table.subtitle') }}
  </p>
  <SortableTable
    :loading="localInstanceTypesLoading"
    :rows="instanceTypeOptions"
    :headers="INSTANCE_TYPE_COLUMNS"
    :table-actions="false"
    :row-actions="false"
    :rows-per-page="10"
    :paging="true"
    key-field="instanceType"
    class="mb-30"
  >
    <template #header-left>
      <div class="row">
        <div class="col span-3">
          <UnitInput
            v-model:value="cpu"
            :mode="mode"
            placeholder-key="ackCn.nodePool.instanceTypes.cpu.label"
            suffix="vCPU"
            type="number"
          />
        </div>
        <div class="col span-3">
          <UnitInput
            v-model:value="memory"
            type="number"
            :mode="mode"
            placeholder-key="ackCn.nodePool.instanceTypes.memory.label"
            suffix="GiB"
          />
        </div>
      </div>
    </template>
    <template #cell:selected="{ row }">
      <Checkbox
        :disabled="disabled"
        :value="value.includes(row.instanceType)"
        @update:value="toggleInstanceType(row.instanceType, $event)"
      />
    </template>
  </SortableTable>
  <h4 class="mb-10">
    {{ t('ackCn.nodePool.instanceTypes.list.title') }}
  </h4>
  <p class="mb-10">
    {{ t('ackCn.nodePool.instanceTypes.list.subtitle') }}
  </p>
  <div class="row">
    <ArrayListOrdered
      v-model:value="instanceTypesList"
      :mode="mode"
      :disabled="disabled"
      :types-dictionary="typesDictionary"
      class="col span-8"
    />
  </div>
  <p
    v-if="validationErrors.length > 0"
    class="mb-10 error"
  >
    {{ validationErrors.join(' ') }}
  </p>
</template>

<style lang="scss" scoped>
.error{
  color: var(--error);
}
.checkbox-outer-container {
  padding-top: 7px !important;
}
</style>
