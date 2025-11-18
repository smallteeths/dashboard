<template>
  <Loading v-if="$fetchState.pending" />
  <CruResource
    v-else
    :done-route="doneLocationOverride.name"
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
      :mode="mode"
    />
    <ResourceTabs
      :value="value"
      :mode="mode"
      @input="$emit('input', $event)"
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
          :required="false"
          :disabled="isView"
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
    </ResourceTabs>
  </CruResource>
</template>
<script>
import CruResource from '@shell/components/CruResource';
import Labels from '@shell/components/form/Labels';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import Loading from '@shell/components/Loading';
import Tab from '@shell/components/Tabbed/Tab';
import { _CREATE } from '@shell/config/query-params';
import { CAPI } from '@shell/config/types';
import CreateEditView from '@shell/mixins/create-edit-view';

import ClusterSelect from '../components/ClusterSelect.vue';


const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';

export default {
  components: {
    Loading, NameNsDescription, Labels, ResourceTabs, Tab, CruResource, ClusterSelect
  },
  mixins:       [CreateEditView],
  inheritAttrs: false,
  emits:        ['input'],
  data() {
    return {
      rancherClusters: [],
      clustersets:     []
    };
  },
  async fetch() {
    if (this.$store.getters['management/canList'](CAPI.RANCHER_CLUSTER)) {
      this.rancherClusters = await this.$store.dispatch('management/findAll', { type: CAPI.RANCHER_CLUSTER });
    }
    if (this.$store.getters['management/canList'](CLUSTER_SET)) {
      this.clustersets = await this.$store.dispatch('management/findAll', { type: CLUSTER_SET });
    }
  },
  computed: {
    isCreate() {
      return this.mode === _CREATE;
    },
    doneLocationOverride() {
      return this.value.listLocation;
    },
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
  },
  methods: {
    willSave() {
      if (!this.value.spec) {
        this.value.spec = {};
      }
      if (!this.value.spec.clusters) {
        this.value.spec.clusters = {};
      }
      const clusters = this.$refs.clustersRef.getForm().reduce((t, c) => {
        t[c] = {};

        return t;
      }, {});

      this.value.spec.clusters = clusters;
    }
  }
};
</script>
<style scoped>
</style>
