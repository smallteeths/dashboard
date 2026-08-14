<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import Banner from '@components/Banner/Banner.vue';
import NativeNodePoolForm from './NativeNodePoolForm.vue';
import SuperNodePoolForm from './SuperNodePoolForm.vue';

const TYPE_SUPER = 'super';
const TYPE_NATIVE = 'native';

const props = defineProps({
  nodePoolType: {
    type:    String,
    default: 'native',
  },

  // native nodepool fields
  name: {
    type:    String,
    default: '',
  },
  instanceType: {
    type:    String,
    default: '',
  },
  osName: {
    type:    String,
    default: '',
  },
  instanceNum: {
    type:    Number,
    default: 0,
  },
  systemDiskType: {
    type:    String,
    default: '',
  },
  systemDiskSize: {
    type:    Number,
    default: 0,
  },
  dataDisks: {
    type:    Array,
    default: () => ([]),
  },
  bandwidthType: {
    type:    String,
    default: '',
  },
  bandwidth: {
    type:    Number,
    default: 0,
  },
  publicIpAssigned: {
    type:    Boolean,
    default: true,
  },
  subnetId: {
    type:    Array,
    default: () => ([]),
  },
  keyPair: {
    type:    String,
    default: '',
  },
  securityGroup: {
    type:    String,
    default: '',
  },

  // options
  instanceTypeOptions: {
    type:    Object,
    default: () => ({}),
  },
  bandwidthTypeOptions: {
    type:    Array,
    default: () => ([]),
  },
  subnetOptions: {
    type:    Array,
    default: () => ([]),
  },
  zoneOptions: {
    type:    Array,
    default: () => ([]),
  },
  allSubnets: {
    type:    Array,
    default: () => ([]),
  },
  keyPairOptions: {
    type:    Array,
    default: () => ([]),
  },
  securityGroupOptions: {
    type:    Array,
    default: () => ([]),
  },

  // loading / flags
  instanceTypeLoading: {
    type:    Boolean,
    default: false,
  },
  keyPairLoading: {
    type:    Boolean,
    default: false,
  },
  isNewOrUnprovisioned: {
    type:    Boolean,
    default: false,
  },
  tkeConfig: {
    type:    Object,
    default: () => ({}),
  },
  virtualNodePool: {
    type:    Object,
    default: () => ({}),
  },
  rules: {
    type:    Object,
    default: () => ({}),
  },
  mode: {
    type:     String,
    required: true,
  },
  userScript: {
    type:    String,
    default: '',
  },
  deletionProtection: {
    type:    Boolean,
    default: false,
  },
  // super node fields
  superNodeSubnetId: {
    type:    String,
    default: '',
  },
  superNodeSecurityGroup: {
    type:    String,
    default: '',
  },
});

const emit = defineEmits([
  'update:nodePoolType',
  'update:name',
  'update:instanceType',
  'update:osName',
  'update:instanceNum',
  'update:systemDiskType',
  'update:systemDiskSize',
  'update:dataDisks',
  'update:bandwidthType',
  'update:bandwidth',
  'update:publicIpAssigned',
  'update:securityGroup',
  'update:subnetId',
  'update:keyPair',
  'update:userScript',
  // super node emits
  'update:virtualNodePool',
  'update:deletionProtection',
]);
const store = useStore();
const intl = computed(() => store.getters['i18n/t']);
const selectedType = computed({
  get: () => props.nodePoolType || TYPE_NATIVE,
  set: (v) => emit('update:nodePoolType', v),
});

function selectType(v) {
  if (!props.isNewOrUnprovisioned) {
    return;
  }
  selectedType.value = v;
}

function updateVirtualNodePool(v) {
  emit('update:virtualNodePool', v);
}

const superMoreLink = computed(() => 'https://cloud.tencent.com/document/product/457/74014');
const nativeMoreLink = computed(() => 'https://cloud.tencent.com/document/product/457/43719');
</script>

<template>
  <div class="nodepool-type-wrap">
    <div class="type-header">
      <h3 class="title">
        {{ intl('tkeCn.nodePool.type.title') }}
      </h3>
      <div class="type-sub">
        {{ intl('tkeCn.nodePool.type.help') }}
      </div>
    </div>
    <div class="type-cards">
      <div
        class="type-card"
        :class="{ active: selectedType === 'super' }"
        role="button"
        tabindex="0"
        @click="selectType(TYPE_SUPER)"
      >
        <div class="card-top">
          <div class="card-title">
            {{ intl('tkeCn.nodePool.type.super.title') }}
            <span class="badge">
              {{ intl('tkeCn.nodePool.type.badge.recommended') }}
            </span>
          </div>
          <a
            class="more"
            :href="superMoreLink"
            target="_blank"
            rel="noreferrer"
          >
            {{ intl('tkeCn.nodePool.type.more') }}
          </a>
        </div>
        <div class="card-desc">
          {{ intl('tkeCn.nodePool.type.super.desc') }}
        </div>
        <ul class="card-list">
          <li>{{ intl('tkeCn.nodePool.type.super.points.0') }}</li>
          <li>{{ intl('tkeCn.nodePool.type.super.points.1') }}</li>
          <li>{{ intl('tkeCn.nodePool.type.super.points.2') }}</li>
          <li>{{ intl('tkeCn.nodePool.type.super.points.3') }}</li>
        </ul>
      </div>
      <div
        class="type-card"
        :class="{ active: selectedType === 'native' }"
        role="button"
        tabindex="0"
        @click="selectType(TYPE_NATIVE)"
      >
        <div class="card-top">
          <div class="card-title">
            {{ intl('tkeCn.nodePool.type.native.title') }}
          </div>
          <a
            class="more"
            :href="nativeMoreLink"
            target="_blank"
            rel="noreferrer"
          >
            {{ intl('tkeCn.nodePool.type.more') }}
          </a>
        </div>
        <div class="card-desc">
          {{ intl('tkeCn.nodePool.type.native.desc') }}
        </div>
        <ul class="card-list">
          <li>{{ intl('tkeCn.nodePool.type.native.points.0') }}</li>
          <li>{{ intl('tkeCn.nodePool.type.native.points.1') }}</li>
          <li>{{ intl('tkeCn.nodePool.type.native.points.2') }}</li>
        </ul>
      </div>
    </div>
    <Banner
      v-if="!isNewOrUnprovisioned"
      color="info"
      :label="intl('tkeCn.nodePool.type.editTip')"
    />
    <div class="type-config">
      <SuperNodePoolForm
        v-if="selectedType === TYPE_SUPER"
        :value="virtualNodePool"
        :nodePoolName="name"
        :mode="mode"
        :isNewOrUnprovisioned="isNewOrUnprovisioned"
        :subnetOptions="allSubnets"
        :vpcId="tkeConfig.vpcId"
        :zoneOptions="zoneOptions"
        :securityGroupOptions="securityGroupOptions"
        :superNodeSubnetId="superNodeSubnetId"
        :superNodeSecurityGroup="superNodeSecurityGroup"
        :rules="rules"
        :isImported="tkeConfig.imported"
        @update:value="updateVirtualNodePool"
        @update:nodePoolName="emit('update:name', $event)"
      />
      <NativeNodePoolForm
        v-else
        :name="name"
        :instanceType="instanceType"
        :osName="osName"
        :instanceNum="instanceNum"
        :systemDiskType="systemDiskType"
        :systemDiskSize="systemDiskSize"
        :dataDisks="dataDisks"
        :bandwidthType="bandwidthType"
        :bandwidth="bandwidth"
        :publicIpAssigned="publicIpAssigned"
        :subnetId="subnetId"
        :keyPair="keyPair"
        :userScript="userScript"
        :securityGroup="securityGroup"
        :instanceTypeOptions="instanceTypeOptions"
        :bandwidthTypeOptions="bandwidthTypeOptions"
        :subnetOptions="subnetOptions"
        :zoneOptions="zoneOptions"
        :keyPairOptions="keyPairOptions"
        :securityGroupOptions="securityGroupOptions"
        :instanceTypeLoading="instanceTypeLoading"
        :keyPairLoading="keyPairLoading"
        :isNewOrUnprovisioned="isNewOrUnprovisioned"
        :tkeConfig="tkeConfig"
        :deletionProtection="deletionProtection"
        :rules="rules"
        :mode="mode"
        @update:name="emit('update:name', $event)"
        @update:instanceType="emit('update:instanceType', $event)"
        @update:osName="emit('update:osName', $event)"
        @update:instanceNum="emit('update:instanceNum', $event)"
        @update:systemDiskType="emit('update:systemDiskType', $event)"
        @update:systemDiskSize="emit('update:systemDiskSize', $event)"
        @update:dataDisks="emit('update:dataDisks', $event)"
        @update:bandwidthType="emit('update:bandwidthType', $event)"
        @update:bandwidth="emit('update:bandwidth', $event)"
        @update:publicIpAssigned="emit('update:publicIpAssigned', $event)"
        @update:securityGroup="emit('update:securityGroup', $event)"
        @update:subnetId="emit('update:subnetId', $event)"
        @update:keyPair="emit('update:keyPair', $event)"
        @update:userScript="emit('update:userScript', $event)"
        @update:deletionProtection="emit('update:deletionProtection', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.nodepool-type-wrap {
  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
  }
  .type-header {
    margin-bottom: 10px;
  }
  .type-sub {
    margin-top: 6px;
    color: var(--input-label);
    font-size: 13px;
  }
  .type-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 10px;
  }
  .type-card {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 12px;
    background: var(--body-bg);
    box-shadow: 0 0 16px var(--shadow);
    cursor: pointer;
    outline: none;
    &:hover {
      border-color: var(--primary);
    }
    &.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(0,0,0,0.06);
    }
  }
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .card-title {
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    background: rgba(34, 239, 171, 0.16);
    color: #065f46;
  }
  .more {
    color: var(--link);
    font-size: 13px;
    text-decoration: none;
  }
  .card-desc {
    margin-top: 8px;
    color: var(--input-label);
    font-size: 13px;
    line-height: 1.5;
  }
  .card-list {
    margin: 10px 0 0 16px;
    padding: 0;
    color: #374151;
    font-size: 13px;
    li {
      margin: 6px 0;
    }
  }
  .type-radio {
    margin: 12px 0 6px;
  }
  .type-config {
    margin-top: 10px;
  }
  @media (max-width: 1100px) {
    .type-cards {
      grid-template-columns: 1fr;
    }
  }
}
</style>
