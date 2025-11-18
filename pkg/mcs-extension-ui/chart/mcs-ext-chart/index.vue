<template>
  <div class="multi-service-mcs">
    <Loading v-if="$fetchState.pending" />
    <div v-else>
      <div v-if="warnings.length">
        <Banner
          v-for="(w, index) in warnings"
          :key="index"
          :closable="true"
          class="cluster-tools-tip"
          color="warning"
          :label="w"
        />
      </div>
      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.global.installationType"
            :label="t('mcs.chart.installType')"
            :mode="mode"
            :options="installTypeOptions"
            disabled
          />
        </div>
      </div>
      <div v-if="!isGlobal">
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              v-model:value="submarinerClusterID"
              :label="t('mcs.chart.submarinerClusterID')"
              disabled
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              v-model:value="submarinerBrokerUrl"
              :label="t('mcs.chart.submarinerBrokerUrl')"
              disabled
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              v-model:value="clusterCIDR"
              :label="t('mcs.chart.submarinerClusterCIDR')"
              disabled
            />
          </div>
        </div>
        <div class="row mb-10">
          <div class="col span-6">
            <LabeledInput
              v-model:value="serviceCIDR"
              :label="t('mcs.chart.submarinerServiceCIDR')"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Banner } from '@components/Banner';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Loading from '@shell/components/Loading';
import { mapGetters } from 'vuex';

import { loadClusterInstallData, applyInstallDataToValue } from '../../utils/loadChartInstallData';

export default {
  components: {
    LabeledInput,
    LabeledSelect,
    Loading,
    Banner
  },
  props: {
    value: {
      type:     Object,
      required: true,
    },
    mode: {
      type:    String,
      default: 'create',
    },
  },
  emits: ['update:value'],
  data() {
    return {
      installTypeOptions: [
        { label: 'global', value: 'global' },
        { label: 'submariner', value: 'submariner' },
      ],
      clusterCIDR:         '',
      serviceCIDR:         '',
      submarinerBrokerUrl: '',
      submarinerClusterID: '',
      isGlobal:            false,
      warnings:            [],
    };
  },
  async fetch() {
    const installationType = this.currentCluster.id === 'local' ? 'global' : 'submariner';
    const type = this.mode === 'create' ? installationType : this?.value?.global?.installationType;

    if (type === 'global') {
      this.isGlobal = true;
      // If it is a broker cluster, the submariner-operator configuration items are not required.
      delete this.value['submariner-operator'];
      this.setInstallationType(type);
    } else {
      const clusterId = this.$route.params?.cluster;
      const data = await loadClusterInstallData(this.$store, clusterId, this.t);

      // Assigning them to this is only for display purposes (for now, they cannot be edited).
      this.clusterCIDR = data.clusterCIDR;
      this.serviceCIDR = data.serviceCIDR;
      this.submarinerBrokerUrl = data.submarinerBrokerUrl;
      this.submarinerClusterID = data.submarinerClusterID;
      this.warnings = data.warnings;

      const applyValue = applyInstallDataToValue(this.value, data, type);

      this.setApplyValue(applyValue);
    }
  },
  computed: {
    ...mapGetters({
      currentCluster: 'currentCluster',
      t:              'i18n/t',
    }),
  },
  created() {
    const type = this.$route.query?.installationType;

    if (type) {
      this.setInstallationType(type);
    }
  },
  methods: {
    setInstallationType(type) {
      // 更新 value
      if (!this.value) return;
      const global = this.value.global || {};

      this.$emit('update:value', {
        ...this.value,
        global: { ...global, installationType: type }
      });
    },
    setApplyValue(applyValue) {
      // 更新 value
      if (!this.value) return;
      this.$emit('update:value', applyValue);
    },
  }
};
</script>
<style lang="scss" scoped>
  .multi-service-mcs {
    :deep() .overlay-content-mode {
      left: 0;
      top: 260px;
    }
  }
</style>
