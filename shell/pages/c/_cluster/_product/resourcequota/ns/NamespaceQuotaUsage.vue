<script>
import { mapGetters } from 'vuex';
import PartialChart from '../PartialChart';
import { parseSi } from '@shell/utils/units';

const quotaName = {
  requestsCpu:                 'CPU',
  limitsCpu:                   'CPU',
  requestsMemory:              'Memory',
  limitsMemory:                'Memory',
  servicesNodePorts:           'NodePorts',
  servicesLoadBalancers:       'LoadBalancers',
  persistentVolumeClaims:      'PVC',
  configMaps:                  'Config Maps',
  requestsStorage:             'Storage',
  pods:                        'Pods',
  services:                    'Services',
  secrets:                     'Secrets',
  replicationControllers:      'Replication Controllers',
  requestsGpuMemory:           'GPU Memory',
  requestsGpuCount:            'GPU Count',
  requestsStorageClassStorage: 'StorageClass Storage',
  requestsStorageClassPVC:     'StorageClassPVC',
};

export default {
  components: { PartialChart },
  props:      {
    storageKey: {
      type:    String,
      default: '',
    },
    quotaKey: {
      type:    String,
      default: '',
    },
    namespaceId: {
      type:    String,
      default: '',
    },
    resourceQuota: {
      type:    Object,
      default: () => {},
    },
  },
  computed: {
    ...mapGetters({
      t:              'i18n/t',
      currentCluster: 'currentCluster',
    }),
    percentValues() {
      if (this.resourceQuota.total) {
        const usage = this.convertToLimit(this.quotaKey, this.resourceQuota.usage);
        const total = this.convertToLimit(this.quotaKey, this.resourceQuota.total);
        const percentUsageOfTotal = (parseInt(usage, 10) / parseInt(total, 10)) * 100;

        return [100, 0, percentUsageOfTotal];
      }

      return [100, 0, 0];
    },
    nameText() {
      let quotaState = 'limit';
      let intlKey = '';
      const key = this.quotaKey;

      if (key === 'requestsCpu' || key === 'requestsMemory' || key === 'requestsStorage') {
        quotaState = 'reserved';
      } else if (key === 'requestsGpuMemory' || key === 'requestsGpuCount') {
        quotaState = '';
      }
      if (quotaState) {
        intlKey = `quotasCn.common.${ quotaState }`;
      }

      return `${ quotaName[key] } ${ intlKey ? this.t(intlKey) : '' }`;
    },
    totalText() {
      const key = this.quotaKey;
      const total = this.convertToLimit(key, this.resourceQuota.total);

      if (this.storageKey) {
        return `${ this.storageKey }: ${ this.quotaWithUnits(key, total, true) }`;
      }

      return `${ this.quotaWithUnits(key, total, true) }`;
    },
    remainText() {
      const key = this.quotaKey;
      const total = this.convertToLimit(key, this.resourceQuota.total);
      const usage = this.convertToLimit(key, this.resourceQuota.usage);
      const remain = total - usage;

      return `${ this.t('quotasCn.chart.remain') } ${ this.quotaWithUnits(key, remain, true) }`;
    },
    quotaLabels() {
      const key = this.quotaKey;
      const total = this.convertToLimit(key, this.resourceQuota.total);
      const usage = this.convertToLimit(key, this.resourceQuota.usage);

      return [
        { key: this.t('quotasCn.chart.total'), value: this.quotaWithUnits(key, total, true) },
        { key: this.t('quotasCn.chart.distribution'), value: '' },
        { key: this.t('quotasCn.chart.used'), value: this.quotaWithUnits(key, usage, true) }
      ];
    },
  },
  data() {
    return {};
  },
  methods: {
    convertToMillis(strValue) {
      if (!strValue) {
        return '';
      }
      if (strValue.endsWith('m')) {
        return parseFloat(strValue.substr(0, strValue.length - 1), 10);
      } else if (strValue.endsWith('u')) {
        return parseFloat(strValue, 10) / 1000;
      } else {
        return parseFloat(strValue, 10) * 1000;
      }
    },
    convertToLimit(key, value) {
      if ( !value ) {
        return 0;
      }

      switch (key) {
      case 'limitsCpu':
      case 'requestsCpu':
        return this.convertToMillis(value);
      case 'limitsMemory':
      case 'requestsMemory':
        return (parseSi(value, 1024) / 1048576);
      case 'requestsStorage':
      case 'requestsStorageClassStorage':
        return (parseSi(value) / (1024 ** 3));
      default:
        return parseInt(value, 10);
      }
    },
    quotaWithUnits(label, value, readable = false) {
      const cpuNotation = readable ? 'milli CPUs' : 'm';
      const memNotation = readable ? 'MiB' : 'Mi';
      const storageNotation = readable ? 'GiB' : 'Gi';

      if ( label === 'limitsCpu' || label === 'requestsCpu' ) {
        return `${ value }${ cpuNotation }`;
      } else if ( label === 'limitsMemory' || label === 'requestsMemory' ) {
        return `${ value }${ memNotation }`;
      } else if ( label === 'requestsStorage' || label === 'requestsStorageClassStorage' ) {
        return `${ value }${ storageNotation }`;
      } else if ( label === 'requestsGpuMemory' ) {
        return `${ value } GiB`;
      } else {
        return value;
      }
    }
  }
};
</script>

<template>
  <div class="quota-project-item-cn">
    <div class="quota-project-item-cn-container">
      <PartialChart
        :nameText="nameText"
        :totalText="totalText"
        :remainText="remainText"
        :values="percentValues"
        :labels="quotaLabels"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.quota-project-item-cn {
  height: 280px;
  max-width: 700px;
  margin: 0 20px 60px;
  display: flex;
  overflow: hidden;
  .quota-project-item-cn-container {
    position: relative;
    width: 310px;
    min-width: 310px;
    border: 1px solid #ebebeb;
    display: flex;
    justify-content: center;
  }
}
</style>
