<template>
  <Loading v-if="$fetchState.pending" />
  <CruResource
    v-else
    :done-route="doneRoute"
    :mode="mode"
    :resource="value"
    :subtypes="[]"
    :validation-passed="true"
    :errors="errors"
    :apply-hooks="applyHooks"
    @error="e=>errors = e"
    @finish="save"
    @cancel="done"
  >
    <NameNsDescription
      v-if="!isView"
      :value="value"
      :namespaced="false"
      :nameRequired="false"
      :mode="mode"
    />
    <Tabbed
      :side-tabs="true"
      default-tab="clusters"
    >
      <Tab
        name="clusters"
        :label="t('mcs.nav.clusters')"
        :weight="99"
      >
        <ClusterSelect
          ref="clustersRef"
          :init-clusters="clusters"
          :clusters="clustersOptions"
          :cluster-groups="clusterGroups"
          :required="false"
          :disabled="!isCreate"
        />
      </Tab>
      <Tab
        name="labels"
        label-key="generic.labelsAndAnnotations"
        :weight="-1"
      >
        <Labels
          :value="value"
          :mode="mode"
          @update:value="$emit('input', $event)"
        />
      </Tab>
    </Tabbed>
  </CruResource>
</template>
<script>
import CruResource from '@shell/components/CruResource';
import Labels from '@shell/components/form/Labels';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Loading from '@shell/components/Loading';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { _CREATE } from '@shell/config/query-params';
import { CAPI, FLEET } from '@shell/config/types';
import CreateEditView from '@shell/mixins/create-edit-view';
import { allHash } from '@shell/utils/promise';
import { mapGetters } from 'vuex';
import ClusterSelect from '../components/ClusterSelect.vue';
import { upgradeMcsExtChart, DISPLAY_NAME_ANNO } from '../utils/loadChartInstallData';

const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';

export default {
  components: {
    Loading, NameNsDescription, Labels, Tabbed, Tab, CruResource, ClusterSelect
  },
  mixins:       [CreateEditView],
  inheritAttrs: false,
  emits:        ['input'],
  data() {
    return {
      rancherClusters: [],
      clustersets:     [],
      fleetClusters:   [],
      workspaces:      [],
      clusterGroups:   []
    };
  },
  async fetch() {
    const hash = {};

    if (this.$store.getters['management/canList'](CAPI.RANCHER_CLUSTER)) {
      hash.rancherClusters = this.$store.dispatch('management/findAll', { type: CAPI.RANCHER_CLUSTER });
    }
    if (this.$store.getters['management/canList'](CLUSTER_SET)) {
      hash.clustersets = await this.$store.dispatch('management/findAll', { type: CLUSTER_SET });
    }
    if (this.$store.getters['management/canList'](FLEET.CLUSTER)) {
      hash.fleetClusters = this.$store.dispatch('management/findAll', { type: FLEET.CLUSTER });
    }
    if (this.$store.getters['cluster/canList'](FLEET.WORKSPACE)) {
      hash.workspaces = this.$store.dispatch('cluster/findAll', { type: FLEET.WORKSPACE });
    }
    if (this.$store.getters['management/canList'](FLEET.CLUSTER_GROUP)) {
      hash.clusterGroups = this.$store.dispatch('management/findAll', { type: FLEET.CLUSTER_GROUP });
    }
    const resp = await allHash(hash);

    this.rancherClusters = resp.rancherClusters ?? [];
    this.clustersets = resp.clustersets ?? [];
    this.fleetClusters = resp.fleetClusters ?? [];
    this.workspaces = resp.workspaces ?? [];
    this.clusterGroups = resp.clusterGroups ?? [];
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    isCreate() {
      return this.mode === _CREATE;
    },
    // doneLocationOverride() {
    //   return this.value.listLocation;
    // },
    clustersOptions() {
      const currentClusterset = this.value;
      const idSet = this.clustersets.filter((c) => c.id !== currentClusterset.id && c.spec?.clusters && Object.keys(c.spec.clusters ?? {}).length > 0)
        .reduce((t, c) => {
          Object.keys(c.spec.clusters).forEach((k) => {
            t.add(k);
          });

          return t;
        }, new Set());

      return this.rancherClusters.filter((c) => c.metadata.namespace !== 'fleet-local' && !idSet.has(c.metadata.name));
    },
    clusters() {
      return Object.keys(this.value.spec?.clusters ?? {});
    }
  },
  created() {
    this.registerBeforeHook(this.willSave, 'willSave');
    this.registerAfterHook(this.upgradeMcsExtChart, 'upgradeMcsExtChart');
  },
  methods: {
    willSave() {
      if (!this.value.spec) {
        this.value.spec = {};
      }
      if (!this.value.spec.clusters) {
        this.value.spec.clusters = {};
      }
      const checkedClusters = this.$refs.clustersRef.getForm().map((c) => {
        return c;
      });
      const selected = this.rancherClusters.filter((c) => checkedClusters.includes(c.metadata.name) || checkedClusters.includes(c.metadata?.annotations?.[DISPLAY_NAME_ANNO]));
      const clusters = selected.reduce((t, c) => {
        if (c?.metadata?.name) {
          t[c.metadata.name] = {};
        }

        return t;
      }, {});

      this.value.spec.clusters = clusters;
    },
    async splitClustersByAppInstalled() {
      const installedClusters = [];
      const uninstalledClusters = [];
      const checkedClusters = this.$refs.clustersRef.getForm().map((c) => {
        return c;
      });
      const selected = this.rancherClusters.filter((c) => checkedClusters.includes(c.metadata.name) || checkedClusters.includes(c.metadata?.annotations?.[DISPLAY_NAME_ANNO]));

      await Promise.all(selected.map(async(c) => {
        const clusterName = c?.status?.clusterName;
        const url = `/k8s/clusters/${ clusterName }/apis/catalog.cattle.io/v1/apps`;

        try {
          const resp = await this.$store.dispatch('management/request', { url });
          const apps = resp?.items ?? [];
          const match = apps.find((app) => app?.spec?.chart?.metadata?.name === 'mcs-ext-chart');

          (match ? installedClusters : uninstalledClusters).push({
            name:    c.metadata.name,
            cluster: c,
            app:     match || null,
          });
        } catch (e) {
          uninstalledClusters.push({
            name:    c.metadata.name,
            cluster: c,
          });
        }
      }));

      return { installedClusters, uninstalledClusters };
    },
    async upgradeMcsExtChart() {
      const { installedClusters } = await this.splitClustersByAppInstalled();

      if (installedClusters?.length > 0) {
        await Promise.all(installedClusters.map(async(c) => {
          try {
            await upgradeMcsExtChart({
              store:            this.$store,
              clusters:         [c.cluster],
              targetClusterset: this.value?.metadata?.name,
              t:                this.t,
            });
          } catch (err) {
            throw new Error(err);
          }
        }));
      }
    }
  }
};
</script>
