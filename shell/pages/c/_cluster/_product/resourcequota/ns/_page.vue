<script>
import { mapGetters } from 'vuex';
import { NAMESPACE, RESOURCE_QUOTA, MANAGEMENT } from '@shell/config/types';
import NamespaceQuotaUsage from './NamespaceQuotaUsage';
import { Banner } from '@components/Banner';

const ANNORESOURCEQUOTA = 'field.cattle.io/resourceQuota';

const manualMapping = {
  'requests.cpu':                'requestsCpu',
  'limits.cpu':                  'limitsCpu',
  'requests.memory':             'requestsMemory',
  'limits.memory':               'limitsMemory',
  'services.nodeports':          'servicesNodePorts',
  'services.loadbalancers':      'servicesLoadBalancers',
  persistentvolumeclaims:        'persistentVolumeClaims',
  configmaps:                    'configMaps',
  'requests.storage':            'requestsStorage',
  pods:                          'pods',
  services:                      'services',
  secrets:                       'secrets',
  replicationcontrollers:        'replicationControllers',
  'requests.rancher.io/gpu-mem': 'requestsGpuMemory',
  'requests.nvidia.com/gpu':     'requestsGpuCount'
};

const QUOTA_TPYE_CN = [
  'requestsCpu',
  'limitsCpu',
  'requestsMemory',
  'limitsMemory',
  'servicesNodePorts',
  'servicesLoadBalancers',
  'persistentVolumeClaims',
  'configMaps',
  'requestsStorage',
  'pods',
  'services',
  'secrets',
  'replicationControllers',
  'requestsGpuMemory',
  'requestsGpuCount',
  'requestsStorageClassStorage',
  'requestsStorageClassPVC',
];

export default {
  async fetch() {
    this.namespace = await this.$store.dispatch('cluster/find', { type: NAMESPACE, id: this.nsId });

    this.projectId = this.namespace?.metadata?.annotations['field.cattle.io/projectId'];
    const allResourceQuota = await this.$store.dispatch('cluster/findAll', { type: RESOURCE_QUOTA });
    const resourcequotas = allResourceQuota?.filter((quota) => {
      return quota?.metadata?.namespace === this.nsId;
    });
    let resourcequotaUsage = null;

    if (resourcequotas?.length > 0 && resourcequotas[0]) {
      resourcequotaUsage = resourcequotas[0].status.used;
    }

    if (resourcequotaUsage) {
      this.resourcequotaUsage = Object.entries(resourcequotaUsage).reduce((acc, [key, val]) => {
        const newKey = manualMapping[key] || key;

        acc[newKey] = val;

        return acc;
      }, {});
    }
  },
  components: {
    Banner,
    NamespaceQuotaUsage,
  },
  data() {
    const nsId = this.$route.query.ns;
    const projectName = this.$route.query.projectName;

    return {
      nsId,
      projectName,
      projectId:          '',
      namespace:          null,
      resourcequotaUsage: null,
      storageClassKey:    ['requestsStorageClassStorage', 'requestsStorageClassPVC'],
    };
  },
  computed: {
    ...mapGetters(['currentCluster']),
    allResourceQuota() {
      const { namespace, resourcequotaUsage, storageClassKey } = this;
      const result = {};

      if (!namespace || !resourcequotaUsage) {
        return result;
      }

      let nsQuota = {};

      try {
        nsQuota = JSON.parse(namespace.metadata.annotations[ANNORESOURCEQUOTA]).limit || {};
      } catch {
        nsQuota = {};
      }

      const pick = (obj, key, fallback = 0) => {
        const v = obj?.[key];

        return v !== null ? v : fallback;
      };
      const isStorageClass = (key) => storageClassKey.includes(key);

      QUOTA_TPYE_CN.forEach((key) => {
        if (isStorageClass(key)) {
          const storages = nsQuota[key] || {};

          result[key] = Object.entries(storages).map(([storageKey, tot]) => ({
            storageKey,
            usage: pick(resourcequotaUsage[key], storageKey),
            total: tot || 0,
          }));
        } else {
          result[key] = {
            storageKey: null,
            usage:      pick(resourcequotaUsage, key),
            total:      pick(nsQuota, key),
          };
        }
      });

      return result;
    },
    quotaItems() {
      return Object.entries(this.allResourceQuota).flatMap(([quotaKey, val]) => {
        if (Array.isArray(val)) {
          return val.map((item) => ({
            quotaKey,
            storageKey:    item.storageKey,
            resourceQuota: item,
          }));
        }

        return [{
          quotaKey,
          storageKey:    null,
          resourceQuota: val,
        }];
      });
    },
    editNamespaceLink() {
      if (!this.namespace?.id) {
        return '';
      }

      return {
        name:   'c-cluster-product-resource-id',
        params: {
          cluster:  this.currentCluster?.id,
          resource: 'namespace',
          id:       this.namespace.id,
        },
        query: { mode: 'edit' },
      };
    },
    editProjectLink() {
      if (!this.projectId) {
        return '';
      }

      return {
        name:   'c-cluster-product-resource-id',
        params: {
          cluster:  this.currentCluster?.id,
          resource: MANAGEMENT.PROJECT,
          id:       this.getMgmtProjectId(this.projectId),
        },
        query: { mode: 'edit' },
      };
    }
  },
  methods: {
    getMgmtProjectId(projectId) {
      return projectId?.replace(':', '/');
    },
  }
};
</script>

<template>
  <div>
    <div class="title">
      <div class="primaryheader">
        <h1>
          <router-link
            v-if="editNamespaceLink"
            :to="editNamespaceLink"
            role="link"
            class="masthead-resource-list-link"
          >
            {{ t('quotasCn.namespace.title') }}:
          </router-link>
          {{ nsId }} {{ t('quotasCn.quotas') }}
        </h1>
      </div>
    </div>
    <div class="title">
      <div class="primaryheader">
        <div>
          {{ t('quotasCn.project.title') }}:
          <router-link
            v-if="editProjectLink"
            :to="editProjectLink"
            role="link"
            class="masthead-resource-list-link"
          >
            {{ projectName }}
          </router-link>
        </div>
      </div>
    </div>
    <Banner
      color="warning"
      label-key="quotasCn.chart.qesourceQuotaLink"
    />
    <div class="quotas-wrapper">
      <div
        v-for="item in quotaItems"
        :key="item.storageKey != null
          ? `${item.quotaKey}-${item.storageKey}`
          : item.quotaKey"
        class="quota-item"
      >
        <NamespaceQuotaUsage
          v-if="item.resourceQuota.total"
          :quotaKey="item.quotaKey"
          :storageKey="item.storageKey"
          :namespaceId="namespace.id"
          :resourceQuota="item.resourceQuota"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .quotas-wrapper {
    display: flex;
    flex-wrap: wrap;
  }
</style>
