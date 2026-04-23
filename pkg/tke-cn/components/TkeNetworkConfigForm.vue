<template>
  <div>
    <div class="cluster-basic-card mb-10">
      <div class="cluster-basic-card__header">
        <h3 class="cluster-basic-card__title">
          {{ intl('tkeCn.networkConfig.title') }}
        </h3>
        <div class="cluster-basic-card__desc">
          {{ intl('tkeCn.networkConfig.description') }}
        </div>
      </div>
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            :value="localValue.vpcId"
            data-testid="crutke-resource-vpc"
            :loading="state.vpcIdLoading"
            required
            :mode="mode"
            :options="options.vpcOptions"
            option-label="label"
            option-key="value"
            label-key="tkeCn.vpc.label"
            :disabled="!isNewOrUnprovisioned || localValue.imported"
            :rules="ruleSets.vpc"
            @update:value="handleVpcChange"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model:value="localValue.networkType"
            data-testid="crutke-resource-network-type"
            :mode="mode"
            :options="options.networkTypeOptions"
            option-label="label"
            option-key="value"
            label-key="tkeCn.networkType.label"
            :disabled="!isNewOrUnprovisioned || localValue.imported"
            @update:value="handleNetworkTypeChange"
          />
        </div>
      </div>
      <template v-if="localValue.networkType !== 'VPC-CNI'">
        <div class="row mb-10">
          <div class="col span-6">
            <div class="cluster-cidr-field">
              <LabeledInput
                v-model:value="localValue.clusterCidr"
                data-testid="crutke-resource-cluster-cidr"
                required
                :mode="mode"
                label-key="tkeCn.clusterCidr.label"
                :disabled="!isNewOrUnprovisioned || localValue.imported"
                :rules="ruleSets.clusterCidr"
                :placeholder="intl('tkeCn.clusterCidr.placeholder')"
              />
              <div
                v-if="clusterCidrConflictError || clusterCidrValidating"
                class="cluster-cidr-field__status"
              >
                <v-dropdown
                  v-if="!clusterCidrValidating"
                  theme="info-tooltip"
                  placement="top"
                  :triggers="['hover', 'click']"
                  :auto-hide="true"
                  :distance="8"
                >
                  <span>
                    <i
                      class="icon icon-warning group-icon cluster-cidr-field__icon"
                    />
                  </span>
                  <template #popper>
                    <div class="cluster-cidr-field__tooltip">
                      {{ clusterCidrConflictError }}
                    </div>
                  </template>
                </v-dropdown>
                <span v-else>
                  <i class="icon icon-spinner icon-spin icon-lg" />
                </span>
              </div>
            </div>
          </div>
          <div class="col span-6">
            <LabeledSelect
              :value="localValue.maxNodePodNum"
              data-testid="crutke-resource-max-node-pod-num"
              :mode="mode"
              :options="currentMaxNodePodNumOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.maxNodePodNum.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              @update:value="updateValue({ maxNodePodNum: Number($event) })"
            />
          </div>
        </div>
        <div class="row">
          <div class="col span-6">
            <LabeledSelect
              :value="localValue.maxClusterServiceNum"
              data-testid="crutke-resource-max-cluster-service-num"
              :mode="mode"
              :options="maxClusterServiceNumOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.maxClusterServiceNum.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              @update:value="updateValue({ maxClusterServiceNum: Number($event) })"
            />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="row mb-10">
          <div class="col span-6">
            <div class="cluster-cidr-field">
              <LabeledInput
                v-model:value="localValue.serviceCidr"
                data-testid="crutke-resource-service-cidr"
                required
                :mode="mode"
                :rules="ruleSets.serviceCidr"
                label-key="tkeCn.serviceCidr.label"
                :disabled="!isNewOrUnprovisioned || localValue.imported"
                :placeholder="intl('tkeCn.serviceCidr.placeholder')"
              />
              <div
                v-if="serviceCidrConflictError || serviceCidrValidating"
                class="cluster-cidr-field__status"
              >
                <v-dropdown
                  v-if="!serviceCidrValidating"
                  theme="info-tooltip"
                  placement="top"
                  :triggers="['hover', 'click']"
                  :auto-hide="true"
                  :distance="8"
                >
                  <span>
                    <i
                      class="icon icon-warning group-icon cluster-cidr-field__icon"
                    />
                  </span>
                  <template #popper>
                    <div class="cluster-cidr-field__tooltip">
                      {{ serviceCidrConflictError }}
                    </div>
                  </template>
                </v-dropdown>
                <span v-else>
                  <i class="icon icon-spinner icon-spin icon-lg" />
                </span>
              </div>
            </div>
          </div>
          <div class="col span-6">
            <LabeledSelect
              :value="localValue.maxNodePodNum"
              data-testid="crutke-resource-max-node-pod-num"
              :mode="mode"
              :options="currentMaxNodePodNumOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.maxNodePodNum.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              @update:value="updateValue({ maxNodePodNum: Number($event) })"
            />
          </div>
        </div>
        <div class="network-option-card mt-10">
          <div class="network-option-card__title">
            {{ intl('tkeCn.eniSubnetIds.label') }}
          </div>
          <div class="network-option-card__desc">
            {{ intl('tkeCn.eniSubnetIds.help') }}
          </div>
          <SortableTable
            class="mt-10 eni-subnet-table"
            :rows="eniSubnetRows"
            :headers="eniSubnetHeaders"
            :table-actions="false"
            :row-actions="false"
            :search="false"
            :paging="false"
            key-field="id"
          >
            <template #header:selected>
              <Checkbox
                :value="allEniSelected"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned || localValue.imported || eniSubnetRows.length === 0"
                @update:value="toggleAllEniSubnets"
              />
            </template>
            <template #cell:selected="{ row }">
              <Checkbox
                :value="row.checked"
                :mode="mode"
                :disabled="!isNewOrUnprovisioned || localValue.imported"
                @update:value="toggleEniSubnet(row.subnetId, $event)"
              />
            </template>
            <template #cell:subnetId="{ row }">
              <span>{{ row.subnetName || row.subnetId }}</span>
            </template>
            <template #cell:zone="{ row }">
              <span>{{ row.zone || '-' }}</span>
            </template>
            <template #cell:cidr="{ row }">
              <span>{{ row.cidr || '-' }}</span>
            </template>
          </SortableTable>
          <div
            v-if="ruleSets.eniSubnetIds?.length && !localValue.eniSubnetIds?.length"
            class="eni-subnet-table__error"
          >
            {{ intl('validation.required', { key: intl('tkeCn.eniSubnetIds.label') }) }}
          </div>
        </div>
      </template>
      <div class="network-option-card mt-10">
        <div class="network-option-card__title">
          {{ intl('tkeCn.ipvs.label') }}
        </div>
        <div class="network-option-card__desc">
          {{ intl('tkeCn.ipvs.help') }}
        </div>
        <div class="mt-10">
          <RadioGroup
            v-model:value="localValue.ipvs"
            :disabled="!isNewOrUnprovisioned || localValue.imported"
            name="ipvs"
            :options="[true, false]"
            :labels="options.ipvsOptions"
            :mode="mode"
          />
        </div>
      </div>
    </div>
    <div class="cluster-basic-card mt-10 mb-10">
      <div class="cluster-basic-card__title">
        {{ intl('tkeCn.proxy.label') }}
      </div>
      <div class="cluster-basic-card__desc">
        {{ intl('tkeCn.proxy.info') }}
      </div>
      <div class="mt-10">
        <RadioGroup
          v-model:value="localValue.clusterEndpoint"
          :disabled="!isNewOrUnprovisioned || localValue.imported"
          name="clusterEndpoint"
          :options="[true, false]"
          :labels="options.clusterEndpointOptions"
          :mode="mode"
        />
        <div
          v-if="!localValue.clusterEndpoint"
          class="row mt-10"
        >
          <div class="col span-4">
            <LabeledSelect
              :value="localValue.zoneId"
              data-testid="crutke-resource-zone"
              :loading="state.zoneIdLoading"
              required
              :mode="mode"
              :options="options.zoneOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.zone.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              :rules="ruleSets.zoneId"
              @update:value="handleZoneChange"
            />
          </div>
          <div class="col span-4">
            <LabeledSelect
              v-model:value="localValue.subnetId"
              data-testid="crutke-resource-subnet"
              :loading="state.subnetLoading"
              required
              :mode="mode"
              :options="subnetOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.subnet.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              :rules="ruleSets.subnet"
            />
          </div>
          <div class="col span-4">
            <div class="domain-field">
              <LabeledInput
                v-model:value="localValue.domain"
                data-testid="crutke-resource-domain"
                :mode="mode"
                label-key="tkeCn.domain.label"
                :disabled="!isNewOrUnprovisioned || localValue.imported"
                :placeholder="intl('tkeCn.domain.placeholder')"
              />
              <v-dropdown
                class="domain-field__tooltip"
                theme="info-tooltip"
                placement="top"
                :triggers="['hover', 'click']"
                :auto-hide="true"
                :distance="8"
              >
                <span class="domain-field__tooltip-trigger">
                  <i class="icon icon-info" />
                </span>
                <template #popper>
                  <div class="domain-field__tooltip-content">
                    {{ intl('tkeCn.domain.help') }}
                  </div>
                </template>
              </v-dropdown>
            </div>
          </div>
        </div>
        <div
          v-else
          class="row mt-10"
        >
          <div class="col span-4">
            <LabeledSelect
              v-model:value="localValue.securityGroup"
              data-testid="crutke-resource-security-group"
              :loading="state.securityGroupLoading"
              required
              :mode="mode"
              :options="options.securityGroupOptions"
              option-label="label"
              option-key="value"
              label-key="tkeCn.securityGroup.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              :rules="ruleSets.securityGroup"
            />
          </div>
          <div class="col span-4">
            <UnitInput
              v-model:value="localValue.internetMaxBandwidthOut"
              data-testid="crutke-resource-internet-max-bandwidth-out"
              :mode="mode"
              label-key="tkeCn.internetMaxBandwidthOut.label"
              :disabled="!isNewOrUnprovisioned || localValue.imported"
              suffix="Mbps"
              :placeholder="intl('tkeCn.internetMaxBandwidthOut.placeholder')"
            />
          </div>
          <div class="col span-4">
            <div class="domain-field">
              <LabeledInput
                v-model:value="localValue.domain"
                data-testid="crutke-resource-domain"
                :mode="mode"
                label-key="tkeCn.domain.label"
                :disabled="!isNewOrUnprovisioned || localValue.imported"
                :placeholder="intl('tkeCn.domain.placeholder')"
              />
              <v-dropdown
                class="domain-field__tooltip"
                theme="info-tooltip"
                placement="top"
                :triggers="['hover', 'click']"
                :auto-hide="true"
                :distance="8"
              >
                <span class="domain-field__tooltip-trigger">
                  <i class="icon icon-info" />
                </span>
                <template #popper>
                  <div class="domain-field__tooltip-content">
                    {{ intl('tkeCn.domain.help') }}
                  </div>
                </template>
              </v-dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import cloneDeep from 'lodash/cloneDeep';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import { RadioGroup } from '@components/Form/Radio';
import SortableTable from '@shell/components/SortableTable';
import UnitInput from '@shell/components/form/UnitInput.vue';

const props = defineProps({
  value: {
    type:     Object,
    required: true,
  },
  mode: {
    type:     String,
    required: true,
  },
  intl: {
    type:     Function,
    required: true,
  },
  options: {
    type:     Object,
    required: true,
  },
  state: {
    type:     Object,
    required: true,
  },
  ruleSets: {
    type:     Object,
    required: true,
  },
  subnetOptions: {
    type:    Array,
    default: () => [],
  },
  isNewOrUnprovisioned: {
    type:    Boolean,
    default: false,
  },
  clusterCidrConflictError: {
    type:    String,
    default: '',
  },
  clusterCidrValidating: {
    type:    Boolean,
    default: false,
  },
  serviceCidrConflictError: {
    type:    String,
    default: '',
  },
  serviceCidrValidating: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['vpc-change', 'update:value', 'network-type-change', 'zone-change']);
const grMaxNodePodNumOptions = [16, 32, 64, 128, 256, 512].map((value) => {
  return {
    label: `${ value }`,
    value,
  };
});
const vpcCniMaxNodePodNumOptions = [32, 64, 128, 256].map((value) => {
  return {
    label: `${ value }`,
    value,
  };
});
const maxClusterServiceNumOptions = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192].map((value) => {
  return {
    label: `${ value }`,
    value,
  };
});
const currentMaxNodePodNumOptions = computed(() => {
  return localValue.value.networkType === 'VPC-CNI' ? vpcCniMaxNodePodNumOptions : grMaxNodePodNumOptions;
});
const localValue = computed({
  get() {
    return props.value;
  },
  set(val) {
    emit('update:value', val);
  },
});

const eniSubnetOptions = computed(() => {
  if (!Array.isArray(props.state.allSubnets) || !localValue.value.vpcId) {
    return [];
  }

  return props.state.allSubnets.filter((subnet) => {
    return subnet.vpcId === localValue.value.vpcId;
  }).map((subnet) => {
    return {
      label: `${ subnet.SubnetName || subnet.label } (${ subnet.SubnetId || subnet.value })`,
      value: subnet.SubnetId || subnet.value,
      zone:  subnet.Zone || subnet.zone || '',
      cidr:  subnet.CidrBlock || '',
      raw:   subnet,
    };
  });
});

const eniSubnetRows = computed(() => {
  return eniSubnetOptions.value.map((item) => {
    return {
      id:         item.value,
      subnetId:   item.value,
      subnetName: item.raw?.SubnetName || item.label || item.value,
      zone:       item.zone || '',
      cidr:       item.cidr || '',
      checked:    (localValue.value.eniSubnetIds || []).includes(item.value),
    };
  });
});

const eniSubnetHeaders = computed(() => {
  return [
    {
      name:  'selected',
      label: '',
      value: 'selected',
      width: 60,
    },
    {
      name:  'subnetId',
      label: props.intl('tkeCn.eniSubnetIds.table.subnet'),
      value: 'subnetId',
    },
    {
      name:  'zone',
      label: props.intl('tkeCn.eniSubnetIds.table.zone'),
      value: 'zone',
    },
    {
      name:  'cidr',
      label: props.intl('tkeCn.eniSubnetIds.table.cidr'),
      value: 'cidr',
    },
  ];
});

const allEniSelected = computed(() => {
  return eniSubnetOptions.value.length > 0 && eniSubnetOptions.value.every((item) => {
    return (localValue.value.eniSubnetIds || []).includes(item.value);
  });
});

function updateValue(patch) {
  localValue.value = {
    ...cloneDeep(localValue.value),
    ...patch,
  };
}

function getSubnetOptionsByVpcId(vpcId) {
  if (!Array.isArray(props.state.allSubnets) || !vpcId) {
    return [];
  }

  return props.state.allSubnets.filter((subnet) => {
    return subnet.vpcId === vpcId;
  }).map((subnet) => {
    return {
      label: `${ subnet.SubnetName || subnet.label } (${ subnet.SubnetId || subnet.value })`,
      value: subnet.SubnetId || subnet.value,
      zone:  subnet.Zone || subnet.zone || '',
      cidr:  subnet.CidrBlock || '',
      raw:   subnet,
    };
  });
}

function getEniSubnetOptionsByVpcId(vpcId) {
  if (!Array.isArray(props.state.allSubnets) || !vpcId) {
    return [];
  }

  return props.state.allSubnets.filter((subnet) => {
    return subnet.vpcId === vpcId;
  }).map((subnet) => {
    return {
      label: `${ subnet.SubnetName || subnet.label } (${ subnet.SubnetId || subnet.value })`,
      value: subnet.SubnetId || subnet.value,
      zone:  subnet.Zone || subnet.zone || '',
      cidr:  subnet.CidrBlock || '',
      raw:   subnet,
    };
  });
}

function handleVpcChange(value) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  const nextSubnetOptions = getSubnetOptionsByVpcId(value);
  const nextEniSubnetOptions = getEniSubnetOptionsByVpcId(value);
  const defaultSubnetId = nextSubnetOptions?.[0]?.value || '';
  const defaultEniSubnetId = nextEniSubnetOptions?.[0]?.value || '';

  updateValue({
    vpcId:        value,
    subnetId:     defaultSubnetId,
    eniSubnetIds: localValue.value.networkType === 'VPC-CNI' && defaultEniSubnetId ? [defaultEniSubnetId] : [],
  });

  emit('vpc-change');
}

function handleNetworkTypeChange(value) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }

  if (value === 'GR') {
    updateValue({
      networkType:  value,
      eniSubnetIds: [],
    });
    emit('network-type-change', value);

    return;
  }

  const currentEniSubnetIds = Array.isArray(localValue.value.eniSubnetIds) ? localValue.value.eniSubnetIds : [];
  const defaultEniSubnetId = eniSubnetOptions.value?.[0]?.value || '';

  updateValue({
    networkType:  value,
    eniSubnetIds: currentEniSubnetIds.length > 0 ? currentEniSubnetIds : (defaultEniSubnetId ? [defaultEniSubnetId] : []),
  });
  emit('network-type-change', value);
}

function handleZoneChange(value) {
  updateValue({ zoneId: value });
  emit('zone-change', value);
}

function toggleEniSubnet(subnetId, checked) {
  const current = Array.isArray(localValue.value.eniSubnetIds) ? [...localValue.value.eniSubnetIds] : [];

  if (checked) {
    if (!current.includes(subnetId)) {
      current.push(subnetId);
    }
    updateValue({ eniSubnetIds: current });

    return;
  }

  updateValue({ eniSubnetIds: current.filter((item) => item !== subnetId) });
}

function toggleAllEniSubnets(checked) {
  if (!checked) {
    updateValue({ eniSubnetIds: [] });

    return;
  }

  updateValue({ eniSubnetIds: eniSubnetOptions.value.map((item) => item.value) });
}
</script>

<style scoped>
.cluster-basic-card {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--body-bg);
  box-shadow: 0 0 16px var(--shadow);
}
.cluster-basic-card__header {
  margin-bottom: 20px;
}
.cluster-basic-card__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--body-text);
  line-height: 1.4;
}
.cluster-basic-card__desc {
  margin-top: 8px;
  max-width: 980px;
  color: var(--input-label);
  font-size: 14px;
  line-height: 1.6;
}
.network-option-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--body-bg);
}
.network-option-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--body-text);
  line-height: 1.4;
}
.network-option-card__desc {
  margin-top: 6px;
  color: var(--input-label);
  font-size: 13px;
  line-height: 1.6;
}
.cluster-cidr-field {
  position: relative;
}
.cluster-cidr-field__status {
  position: absolute;
  top: 30px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
}
.cluster-cidr-field__icon {
  color: var(--error);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.cluster-cidr-field__tooltip {
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--error);
  font-size: 12px;
  line-height: 1.5;
}
.eni-subnet-table__empty {
  padding: 16px;
  color: var(--input-label);
  text-align: center;
}
.eni-subnet-table__error {
  margin-top: 8px;
  color: var(--error);
  font-size: 12px;
  line-height: 1.5;
}
.domain-field {
  position: relative;
}
.domain-field__tooltip {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 2;
}
.domain-field__tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--input-label);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.domain-field__tooltip-trigger:hover {
  color: var(--body-text);
}
.domain-field__tooltip-content {
  max-width: 240px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--body-text);
  white-space: normal;
}
</style>
