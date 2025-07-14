<script>
import { mapGetters } from 'vuex';
import { MANAGEMENT, NAMESPACE } from '@shell/config/types';
import { Banner } from '@components/Banner';
import ProjectQuotaUsage from './ProjectQuotaUsage';

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
const ANNORESOURCEQUOTA = 'field.cattle.io/resourceQuota';

export default {
  async fetch() {
    this.project = await this.$store.getters['management/byId'](MANAGEMENT.PROJECT, this.getMgmtProjectId(this.projectId));
    this.namespaces = await this.$store.dispatch('cluster/findAll', { type: NAMESPACE });
    const backingNamespace = this.project?.status?.backingNamespace ? this.project?.status?.backingNamespace : this.projectId?.split(':')?.[1];

    this.projectUsage = await this.$store.dispatch('rancher/request', { url: `/v3/projectresourcequotausages/${ backingNamespace }:${ this.projectId.replace(':', '-') }` }).then((res) => {
      const usage = res?.status ? res?.status : {};

      return usage;
    }).catch(() => {
      return {};
    });
  },
  components: {
    Banner,
    ProjectQuotaUsage,
  },
  data() {
    const projectId = this.$route.query.projectId;

    return {
      projectId,
      project:         null,
      projectUsage:    {},
      namespaces:      [],
      storageClassKey: ['requestsStorageClassStorage', 'requestsStorageClassPVC'],
    };
  },
  computed: {
    ...mapGetters(['namespaces', 'currentCluster']),
    allResourceQuota() {
      const {
        namespaces, project, storageClassKey, projectUsage
      } = this;
      const totalLimits = project?.spec?.resourceQuota?.limit || {};
      const usedLimits = project?.spec?.resourceQuota?.usedLimit || {};
      const nsQuotasArray = namespaces.filter((n) => n.project?.id === project?.id);

      const pick = (obj, key, fallback = 0) => {
        const v = obj?.[key];

        return v !== null ? v : fallback;
      };
      const isStorageClass = (key) => storageClassKey.includes(key);

      const baseQuota = QUOTA_TPYE_CN.reduce((acc, key) => {
        if (isStorageClass(key)) {
          const storageTotals = totalLimits[key] || {};

          acc[key] = Object.entries(storageTotals)
            .map(([storageKey, tot]) => ({
              key:       storageKey,
              total:     tot,
              usage:     pick(projectUsage[key], storageKey),
              allocated: pick(usedLimits[key], storageKey),
              ns:        [],
            }));
        } else {
          acc[key] = {
            total:     pick(totalLimits, key),
            usage:     pick(projectUsage, key),
            allocated: pick(usedLimits, key),
            ns:        [],
          };
        }

        return acc;
      }, {});

      nsQuotasArray.forEach((nsItem) => {
        let nsQuota;

        try {
          nsQuota = JSON.parse(nsItem.metadata.annotations[ANNORESOURCEQUOTA])?.limit || {};
        } catch (e) {
          return;
        }

        Object.entries(nsQuota).forEach(([key, val]) => {
          if (!(key in baseQuota)) return;

          if (isStorageClass(key)) {
            baseQuota[key].forEach((storage) => {
              storage.ns.push({
                namespace: nsItem,
                allocated: pick(val, storage.key),
              });
            });
          } else {
            baseQuota[key].ns.push({
              namespace: nsItem,
              allocated: val,
            });
          }
        });
      });

      return baseQuota;
    },
    quotaItems() {
      return Object.entries(this.allResourceQuota).flatMap(([quotaKey, data]) => {
        if (this.storageClassKey.includes(quotaKey)) {
          return data
            .filter((s) => s.total !== null)
            .map((s) => ({
              quotaKey,
              storageKey:    s.key,
              resourceQuota: s,
            }));
        }

        return data.total !== null ? [{
          quotaKey, storageKey: null, resourceQuota: data
        }] : [];
      });
    },
  },
  methods: {
    getMgmtProjectId(projectId) {
      return projectId.replace(':', '/');
    },
  }
};
</script>

<template>
  <div>
    <h1>
      {{ t('quotasCn.project.title') }}
    </h1>
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
        <ProjectQuotaUsage
          v-if="item.resourceQuota.total"
          :quotaKey="item.quotaKey"
          :storageKey="item.storageKey"
          :projectId="getMgmtProjectId(projectId)"
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
  .quota-item {
    flex: 1 1 280px;
    box-sizing: border-box;
  }
</style>
