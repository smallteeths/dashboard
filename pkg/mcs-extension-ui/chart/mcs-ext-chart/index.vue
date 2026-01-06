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
        <div class="row mb-10">
          <div class="col span-6">
            <Checkbox
              v-model:value="airGappedDeployment"
              :mode="mode"
              label-key="mcs.chart.airGappedDeployment"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { NODE } from '@shell/config/types';
import { Banner } from '@components/Banner';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Loading from '@shell/components/Loading';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import { mapGetters } from 'vuex';
import set from 'lodash/set';

import { loadClusterInstallData, applyInstallDataToValue } from '../../utils/loadChartInstallData';

export default {
  components: {
    LabeledInput,
    LabeledSelect,
    Loading,
    Checkbox,
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
  emits: ['update:value', 'register-before-hook'],
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
      airGappedDeployment: false,
      warnings:            [],
      type:                'global',
    };
  },
  async fetch() {
    const installationType = this.currentCluster.id === 'local' ? 'global' : 'submariner';
    const type = this.mode === 'create' ? installationType : this?.value?.global?.installationType;

    this.type = type;
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
      // init airGappedDeployment
      const airGappedDeployment = this.value?.['submariner-operator']?.submariner?.airGappedDeployment ?? false;

      this.airGappedDeployment = airGappedDeployment;
      data.airGappedDeployment = airGappedDeployment;
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

    this.$emit('register-before-hook', this.willSave, 'willSave');
    if (type) {
      this.setInstallationType(type);
    }
  },
  methods: {
    async willSave() {
      const errors = [];

      // Currently only `airGappedDeployment` is user-editable.
      if (this.type !== 'global') {
        set(this.value, 'submariner-operator.submariner.airGappedDeployment', this.airGappedDeployment);
      }
      if (this.currentCluster.id !== 'local') {
        const nodes = await this.$store.dispatch('cluster/findAll', { type: NODE }, { root: true });
        const gatewayNodes = nodes.filter((node) => node?.metadata?.labels?.['submariner.io/gateway'] === 'true');
        const count = gatewayNodes.length;

        if (count === 0) {
          errors.push(this.t('mcs.errors.missNodeLabelError'));
        } else if (count > 1) {
          errors.push(this.t('mcs.errors.tooManyNodeLabelError'));
        }

        if (errors.length) {
          throw errors;
        }
      }
    },
    setInstallationType(type) {
      if (!this.value) return;
      const global = this.value.global || {};

      this.$emit('update:value', {
        ...this.value,
        global: { ...global, installationType: type }
      });
    },
    setApplyValue(applyValue) {
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
