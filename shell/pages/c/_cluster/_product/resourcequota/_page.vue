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

    try {
      const url = `/v1/management.cattle.io.projectresourcequotausages/${ backingNamespace }/${ this.projectId.replace(':', '-') }`;
      const res = await this.$store.dispatch('rancher/request', { url });

      this.projectUsage = res?.status ? res.status : {};
    } catch (error) {
      this.projectUsage = {};
    }
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
    editProjectLink() {
      if (!this.projectId) {
        return '';
      }

      return {
        name:   'c-cluster-product-projectsnamespaces',
        params: { cluster: this.currentCluster?.id }
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
            v-if="editProjectLink"
            :to="editProjectLink"
            role="link"
            class="masthead-resource-list-link"
          >
            {{ t('quotasCn.project.title') }}:
          </router-link>
          {{ project?.spec?.displayName }} {{ t('quotasCn.quotas') }}
        </h1>
      </div>
    </div>
    <Banner
      color="warning"
      label-key="quotasCn.chart.qesourceQuotaLink"
    />
    <div class="quotas-wrapper">
      <template
        v-for="item in quotaItems"
        :key="item.storageKey ? `${item.quotaKey}-${item.storageKey}` : item.quotaKey"
      >
        <div
          v-if="item?.resourceQuota?.total"
          class="quota-item"
        >
          <ProjectQuotaUsage
            class="quota-project-item-cn"
            :quotaKey="item.quotaKey"
            :storageKey="item.storageKey"
            :projectId="getMgmtProjectId(projectId)"
            :projectName="project?.spec?.displayName"
            :resourceQuota="item.resourceQuota"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .quotas-wrapper {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr));
    gap: 20px 20px;
    align-items: stretch;
  }
  .quota-item {
    box-sizing: border-box;
  }
</style>
