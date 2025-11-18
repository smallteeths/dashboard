<template>
  <div>
    <Loading v-if="$fetchState.pending" />
    <template v-else>
      <div
        v-if="!mcsApp"
        class="global-dashboard"
      >
        <h1>{{ t('mcs.welcome') }}</h1>
        <p class="mb-30">
          {{ t('mcs.chartNotInstallTips.global') }}
        </p>
        <router-link
          :to="chartRoute"
          class="btn role-secondary"
        >
          {{ t('mcs.install') }}
        </router-link>
      </div>
      <div v-else>
        <header>
          <div class="title">
            <h1>Multi-Cluster Service</h1>
          </div>
        </header>
        <div class="gd-content">
          <div class="global-dashboard-glance">
            <label>{{ t('mcs.chart.installType') }}: </label>
            <span>Global</span>
          </div>
          <div class="gd-resource">
            <div class="gd-resource-item">
              <h1>{{ resourceCounts.clusterset?.summary?.count ?? 0 }}</h1>
              <h3>clusterset</h3>
            </div>
            <div class="gd-resource-item">
              <h1>{{ resourceCounts.serviceexport?.summary?.count ?? 0 }}</h1>
              <h3>serviceexport</h3>
            </div>
            <div class="gd-resource-item">
              <h1>{{ resourceCounts.serviceimport?.summary?.count ?? 0 }}</h1>
              <h3>serviceimport</h3>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import Loading from '@shell/components/Loading';
import { REPO_TYPE, REPO, CHART } from '@shell/config/query-params';
import { COUNT } from '@shell/config/types';
import { mapGetters } from 'vuex';

const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';
const CATALOG_APPS = 'catalog.cattle.io.apps';

export default {
  components: { Loading },
  data() {
    return { apps: [] };
  },
  async fetch() {
    const promises = [];

    promises.push(this.$store.dispatch('management/request', { url: `/k8s/clusters/local/v1/${ CATALOG_APPS }` }).then((resp) => {
      this.apps = resp.data;
    }));
    if (!this.mcsRepo) {
      promises.push(this.$store.dispatch('catalog/refresh'));
    }
    await Promise.all(promises);
  },

  computed: {
    ...mapGetters({ charts: 'catalog/charts' }),
    clusterSetSchema() {
      return this.$store.getters['management/schemaFor'](CLUSTER_SET);
    },
    mcsApp() {
      return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'mcs-ext-chart');
      // return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'mcs-addon');
    },
    mcsRepoName() {
      const chart = this.charts?.find((chart) => chart.chartName === 'mcs-ext-chart');
      // const chart = this.charts?.find((chart) => chart.chartName === 'mcs-addon');

      return chart?.repoName;
    },
    chartRoute() {
      return {
        name:   'c-cluster-apps-charts-install',
        params: { cluster: 'local' },
        query:  {
          [REPO_TYPE]: 'cluster',
          [REPO]:      this.mcsRepoName,
          // [CHART]:     'mcs-addon',
          [CHART]:     'mcs-ext-chart',
        },
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
.global-dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
}
.global-dashboard-glance {
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 10px 0px;
  display: flex;
}

.global-dashboard-glance > span{
  font-weight: bold
}
.gd-content {
  border-top: 1px solid var(--border);
}
.gd-resource {
  display: grid;
  gap: 15px;
  margin-top: 25px;
  grid-template-columns: 1fr 1fr 1fr;
  margin-top: 25px;
}

.gd-resource-item {
  background: var(--simple-box-bg) 0% 0% no-repeat padding-box;
  box-shadow: 0px 0px 10px var(--simple-box-shadow);
  border: 1px solid var(--simple-box-border);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.gd-resource-item h1, .gd-resource-item h3 {
  margin: 0;
}
</style>
