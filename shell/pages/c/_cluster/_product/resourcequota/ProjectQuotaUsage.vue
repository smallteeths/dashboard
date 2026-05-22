<script>
import { mapGetters } from 'vuex';
import PartialChart from './PartialChart';
import LazyImage from '@shell/components/LazyImage';
import { parseSi } from '@shell/utils/units';
import { Table as VxeTable, Column as VxeColumn } from 'vxe-table';

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
  components: {
    PartialChart,
    VxeTable,
    VxeColumn,
    LazyImage,
  },
  props: {
    quotaKey: {
      type:    String,
      default: '',
    },
    storageKey: {
      type:    String,
      default: '',
    },
    projectId: {
      type:    String,
      default: '',
    },
    projectName: {
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
    pagedRows() {
      const ns = this.resourceQuota.ns;

      if (ns?.length > 0) {
        return ns.map((item) => {
          const allocated = this.convertToLimit(this.quotaKey, item.allocated);
          let used = this.quotaWithUnits(this.quotaKey, parseInt(allocated, 10), true);

          if ( this.quotaKey === 'requestsCpu' || this.quotaKey === 'limitsCpu') {
            used = used.replace('milli CPUs', 'milli');
          }

          return {
            namespace: item.namespace,
            used,
          };
        });
      }

      return [];
    },
    percentValues() {
      if (this.resourceQuota.total) {
        const allocated = this.convertToLimit(this.quotaKey, this.resourceQuota.allocated);
        const usage = this.convertToLimit(this.quotaKey, this.resourceQuota.usage);
        const total = this.convertToLimit(this.quotaKey, this.resourceQuota.total);
        const percentAllocatedOfTotal = (parseInt(allocated, 10) / parseInt(total, 10)) * 100;
        const percentUsageOfTotal = (parseInt(usage, 10) / parseInt(total, 10)) * 100;

        return [100, percentAllocatedOfTotal, percentUsageOfTotal];
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
      const allocated = this.convertToLimit(key, this.resourceQuota.allocated);
      const remain = total - allocated;

      return `${ this.t('quotasCn.chart.remain') } ${ this.quotaWithUnits(key, remain, true) }`;
    },
    quotaLabels() {
      const key = this.quotaKey;
      const total = this.convertToLimit(key, this.resourceQuota.total);
      const allocated = this.convertToLimit(key, this.resourceQuota.allocated);
      const usage = this.convertToLimit(key, this.resourceQuota.usage);

      return [
        { key: this.t('quotasCn.chart.total'), value: this.quotaWithUnits(key, total, true) },
        { key: this.t('quotasCn.chart.distribution'), value: this.quotaWithUnits(key, allocated, true) },
        { key: this.t('quotasCn.chart.used'), value: this.quotaWithUnits(key, usage, true) }
      ];
    },
  },
  data() {
    return {
      columns: [
        {
          field: 'namespace',
          title: this.t('quotasCn.headers.namespace'),
        },
        {
          field: 'used',
          title: this.t('quotasCn.headers.used'),
        },
      ],
      minHeight:          280,
      maxHeight:          280,
      projectquotaImgSrc: require('~shell/assets/images/vendor/projectquota.svg'),
    };
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
    <div class="quota-project-item-cn-table">
      <VxeTable
        :empty-text="t('sortableTable.noRows')"
        :data="pagedRows"
        :scroll-y="{enabled: false}"
        :min-height="minHeight"
        :max-height="maxHeight"
      >
        <VxeColumn
          v-for="th in columns"
          :key="th.field"
          :field="th.field"
          :title="th.title"
          :width="th.width"
          :min-width="th.minWidth"
        >
          <template
            #default="{row}"
          >
            <div>
              <div
                v-if="th.field === 'namespace'"
                :style="{'display':'flex'}"
              >
                <div
                  class="icon-image"
                >
                  <LazyImage
                    :src="projectquotaImgSrc"
                  />
                </div>
                <router-link
                  :to="{
                    name: 'c-cluster-legacy-resourcequota-ns-page',
                    params: {
                      cluster: currentCluster?.id,
                      product: 'explorer'
                    },
                    query: {
                      ns: row[th.field].id,
                      projectName: projectName,
                    }
                  }"
                  class="link"
                >
                  {{ row[th.field].id }}
                </router-link>
              </div>
              <div
                v-else
              >
                {{ row[th.field] }}
              </div>
            </div>
          </template>
        </VxeColumn>
      </VxeTable>
    </div>
  </div>
</template>

<style scoped lang="scss">
.quota-project-item-cn {
  width: clamp(400px, 100%, 650px);
  margin: 0;
  display: grid;
  grid-template-columns: 280px minmax(230px, 1fr);
  overflow: hidden;

  .quota-project-item-cn-container {
    position: relative;
    border: 1px solid #ebebeb;
    border-right: none;
    display: flex;
    justify-content: center;
    height: 280px;
    width: 280px;
  }
  .quota-project-item-cn-table {
    min-width: 230px;
    width: 100%;
    max-width: none;
    .icon-image {
      width: 20px;
      height: 20px;
      margin-right: 5px;

      img{
        width: 20px;
      }
    }
  }
}
</style>
