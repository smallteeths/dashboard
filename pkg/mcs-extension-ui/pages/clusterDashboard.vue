<template>
  <div>
    <Loading v-if="$fetchState.pending" />
    <template v-else>
      <div
        v-if="!serviceImportAndExportSchema || !mcsApp"
        class="cluster-dashboard"
      >
        <h1>{{ t('mcs.welcome') }}</h1>
        <template v-if="isClusterSetMember">
          <router-link
            :to="chartRoute"
            class="btn role-secondary"
          >
            {{ t('mcs.install') }}
          </router-link>
        </template>
        <template v-else>
          <Banner
            label-key="mcs.notClusterSetMemberTips"
            color="warning"
          />
        </template>
      </div>
      <div v-else>
        <header>
          <div class="title">
            <h1>{{ t('product.multiClusterService') }}</h1>
          </div>
        </header>
        <div class="cd-content">
          <div class="cluster-dashboard-glance">
            <label class="mr-5">{{ t('mcs.chart.installType') }}: </label>
            <span>Cluster</span>
          </div>
          <div class="cd-resource">
            <div class="cd-resource-item">
              <h1>{{ resourceCounts.serviceexport?.summary?.count ?? 0 }}</h1>
              <h3>Service Export</h3>
            </div>
            <div class="cd-resource-item">
              <h1>{{ resourceCounts.serviceimport?.summary?.count ?? 0 }}</h1>
              <h3>Service Import</h3>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import Banner from '@components/Banner/Banner.vue';
import Loading from '@shell/components/Loading';
import { REPO_TYPE, REPO, CHART, VERSION } from '@shell/config/query-params';
import { COUNT } from '@shell/config/types';
import { mapGetters } from 'vuex';

const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';
const SUBMARINER = 'serviceDiscovery.v1alpha1.submariner.io';
const CATALOG_APPS = 'catalog.cattle.io.apps';

// const TARGET_CHARS = ['mcs-addon', 'mcs-addon-controller'];
const TARGET_CHARS = ['mcs-ext-chart'];

export default {
  components: {
    Loading,
    Banner
  },
  data() {
    return {
      apps:        [],
      localApps:   [],
      clusterSets: []
    };
  },
  async fetch() {
    const promises = [];
    const id = this.$route.params.cluster;

    promises.push(this.$store.dispatch('management/request', { url: `/k8s/clusters/${ id === '_' ? 'local' : id }/v1/${ CATALOG_APPS }` }).then((resp) => {
      this.apps = resp.data;
    }));
    promises.push(this.$store.dispatch('management/request', { url: `/k8s/clusters/local/v1/${ CATALOG_APPS }` }).then((resp) => {
      this.localApps = resp.data || [];
    }).catch(() => {
      this.localApps = [];
    }));

    if ( this.$store.getters['management/canList'](CLUSTER_SET) ) {
      promises.push(this.$store.dispatch('management/findAll', { type: CLUSTER_SET }).then((clusterSets) => {
        this.clusterSets = clusterSets ?? [];
      }));
    }
    if (!this.mcsRepo) {
      promises.push(this.$store.dispatch('catalog/refresh'));
    }
    await Promise.all(promises);
  },
  computed: {
    ...mapGetters({
      charts:         'catalog/charts',
      currentCluster: 'currentCluster',
      currentProduct: 'currentProduct'
    }),
    clusterSetSchema() {
      return this.$store.getters['management/schemaFor'](CLUSTER_SET);
    },
    mcsApp() {
      // return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'mcs-addon');
      return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'mcs-ext-chart');
    },
    localMcsApp() {
      return this.localApps.find((app) => app.spec?.chart?.metadata?.name === 'mcs-ext-chart');
    },
    localMcsChartVersion() {
      return this.localMcsApp?.spec?.chart?.metadata?.version || '';
    },
    mcsRepoName() {
      const chart = this.charts?.find((chart) => TARGET_CHARS.includes(chart.chartName));

      return chart?.repoName;
    },

    submarinerSchema() {
      return this.$store.getters['cluster/schemaFor'](SUBMARINER);
    },
    serviceImportAndExportSchema() {
      return this.$store.getters['cluster/schemaFor']('multicluster.x-k8s.io.serviceimport') && this.$store.getters['cluster/schemaFor']('multicluster.x-k8s.io.serviceexport');
    },
    isClusterSetMember() {
      // For v3 cluster is this.currentCluster?.metadata?.name
      // For v1 cluster is this.currentCluster?.spec?.displayName
      const clusterDisPlayName = this.currentCluster?.spec?.displayName ?? 'local';
      const clusterName = this.currentCluster?.metadata?.name ?? 'local';

      return this.clusterSets?.find((c) => c?.spec?.clusters?.[clusterDisPlayName] || c?.spec?.clusters?.[clusterName] );
    },
    chartRoute() {
      const cluster = this.currentCluster?.id ?? 'local';
      const chart = 'mcs-ext-chart';
      const query = {
        [REPO_TYPE]: 'cluster',
        [REPO]:      this.mcsRepoName,
        [CHART]:     chart,
      };

      if (this.localMcsChartVersion) {
        query[VERSION] = this.localMcsChartVersion;
      }

      return {
        name:   'c-cluster-apps-charts-install',
        params: { cluster },
        query,
      };
    },
    resourceCounts() {
      const inStore = this.$store.getters['currentStore'](COUNT);
      const clusterCounts = this.$store.getters[`${ inStore }/all`](COUNT)?.[0]?.counts;
      const clusterset = clusterCounts?.['multicluster.pandaria.io.clusterset'] || {};
      const serviceimport = clusterCounts?.['multicluster.x-k8s.io.serviceimport'] || {};
      const serviceexport = clusterCounts?.['multicluster.x-k8s.io.serviceexport'] || {};

      return {
        clusterset,
        serviceimport,
        serviceexport
      };
    }
  },
};
</script>
<style scoped>
.cluster-dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
}

.cluster-dashboard-glance {
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 10px 0px;
  display: flex;
}

.cluster-dashboard-glance > span{
  font-weight: bold
}

.cd-content {
  border-top: 1px solid var(--border);
}
.cd-resource {
  display: grid;
  gap: 15px;
  margin-top: 25px;
  grid-template-columns: 1fr 1fr 1fr;
  margin-top: 25px;
}

.cd-resource-item {
  background: var(--simple-box-bg) 0% 0% no-repeat padding-box;
  box-shadow: 0px 0px 10px var(--simple-box-shadow);
  border: 1px solid var(--simple-box-border);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cd-resource-item h1, .cd-resource-item h3 {
  margin: 0;
}
</style>
