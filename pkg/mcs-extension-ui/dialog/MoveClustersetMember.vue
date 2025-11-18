<template>
  <Card
    class="move-clusterset-member"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('mcs.moveClustersetMemeberModal.title') }}
      </h4>
    </template>
    <template #body>
      <div class="mb-10">
        <div>
          {{ t('mcs.moveClustersetMemeberModal.desc') }}
          <ul class="clusters">
            <li
              v-for="(cluster, i) in clusters"
              :key="i"
            >
              {{ cluster.nameDisplay }}
            </li>
          </ul>
        </div>
        <LabeledSelect
          v-model:value="targetClusterset"
          :options="clustersetOptions"
          :label="t('mcs.moveClustersetMemeberModal.targetClusterset')"
        />
        <Banner
          v-if="deleteStatus"
          color="warning"
          :label="deleteStatus"
        />
        <Banner
          v-for="(err, i) in errors"
          :key="i"
          color="error"
          :label="err"
        />
      </div>
    </template>
    <template #actions>
      <div class="buttons">
        <button
          class="mr-10 btn role-secondary"
          @click="close"
        >
          {{ t('generic.close') }}
        </button>
        <div class="spacer" />
        <AsyncButton
          :disabled="saveBtnDisabled"
          mode="edit"
          @click="save"
        />
      </div>
    </template>
  </Card>
</template>

<script>
import { Banner } from '@components/Banner';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { CAPI } from '@shell/config/types';
import { mapGetters } from 'vuex';

import { deleteSubmarinerAndWait, upgradeMcsExtChart } from '../utils/loadChartInstallData';

export default {
  components: {
    Card, AsyncButton, Banner, LabeledSelect
  },
  props: {
    clusterset: { type: Object, required: true },
    clusters:   {
      type:     Array,
      required: true
    },
    clustersets: {
      type: Array,
      default() {
        return [];
      }
    },
  },
  emits: ['close'],
  data() {
    return {
      errors:           [],
      targetClusterset: '',
      deleteStatus:     '',
      installedChart:   {},
      isClosed: false
    };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    clustersetOptions() {
      return this.clustersets.map((cs) => ({
        label: cs.metadata.name, value: cs.id, raw: cs
      }));
    },
    saveBtnDisabled() {
      return this.targetClusterset === '';
    }
  },
  async created() {
    this.t('mcs.clusterSets.label');
    this.errors = [];
  },
  beforeUnmount() {
    this.isClosed = true;
  },
  methods: {
    close() {
      this.$emit('close');
    },
    async save(btn) {
      const currentCluster = this?.clusters?.[0];
      const clusterName = currentCluster?.status?.clusterName;
      const url = `/k8s/clusters/${clusterName}/apis/catalog.cattle.io/v1/apps`;
      const resp  = await this.$store.dispatch('management/request', { url });
      const apps  = resp?.items ?? [];
      // Only clusters with the app installed need to be deleted.
      const match = apps.find(app => app?.spec?.chart?.metadata?.name === 'mcs-ext-chart');

      if (match) {
        const { ok: deleteOk, errors: collected } = await deleteSubmarinerAndWait(this.$store, currentCluster, {
          onProgress: (m) => { this.deleteStatus = m; },
          t: this.t,
          isClosed: () => false, // Temporarily hardcode it as false; closing the dialog should not terminate the request for now.
        });
        if (!deleteOk) {
          this.errors = collected;
        }
        this.deleteStatus = '';
      }
      /*
        1. If the app is already installed, delete the Submariner CR
        2. After deletion is complete, update the Clusterset and Cluster to ensure the chart can be upgraded correctly.
        3. Upgrade the chart.
      */
      if (!this.errors.length) {
        try {
          const c = await this.$store.dispatch('management/find', { type: CAPI.RANCHER_CLUSTER, id: currentCluster.id, opt: { force: true }} );

          delete c.metadata?.annotations?.['field.cattle.io/clustersetId'];
          await c.save()

          const targetClustersetId = this.targetClusterset;
          const sc = await this.$store.dispatch(`management/clone`, { resource: this.clusterset });
          const target = this.clustersetOptions.find((item) => item.value === targetClustersetId).raw;
          const targetSc = await this.$store.dispatch(`management/clone`, { resource: target });

          this.clusters.forEach((cluster) => {
            delete sc.spec.clusters[cluster.metadata.name];
          });

          if (!targetSc.spec) {
            targetSc.spec = {};
          }
          if (!targetSc.spec.clusters) {
            targetSc.spec.clusters = {};
          }
          this.clusters.forEach((cluster) => {
            targetSc.spec.clusters[cluster.metadata.name] = {};
          });

          await Promise.all([sc.save(), targetSc.save()]);
        } catch (error) {
          this.errors = [error];
        }
        if (match && !this.errors.length) {
          try {
            await upgradeMcsExtChart({
              store: this.$store,
              clusters: this.clusters,
              targetClusterset: this.targetClusterset,
              t: this.t,
            })
          } catch (error) {
            this.errors = [error];
          }
        }
        if (!this.errors.length) {
          btn(true);
          this.close();
        }
      }
      btn(false);
    },
  }
};
</script>

<style scss lang="scss">
.move-clusterset-member {
  margin: 0;
  .card-body {
    min-height: 210px;
    justify-content: start;
  }
}
.buttons {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
