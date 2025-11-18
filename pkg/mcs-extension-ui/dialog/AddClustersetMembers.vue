<template>
  <Card
    class="add-clusterset-member"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('mcs.addClustersetMembersModal.title', {name: resource.metadata.name}) }}
      </h4>
    </template>
    <template #body>
      <div class="row mt-20 container-flex-center">
        <div class="col span-8">
          <ClusterSelect
            ref="clusterFormRef"
            v-model="checkedClusters"
            class="mb-20"
            :clusters="clusterOptions"
          />
          <Banner
            v-for="(err, i) in errors"
            :key="i"
            color="error"
            :label="err"
          />
        </div>
      </div>
    </template>
    <template #actions>
      <div class="buttons">
        <button
          class="mr-10 btn role-secondary"
          @click="close"
        >
          {{ t('generic.cancel') }}
        </button>
        <div class="spacer" />
        <AsyncButton
          :disabled="loading || saveBtnDisabled"
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
import { mapGetters } from 'vuex';

import ClusterSelect from '../components/ClusterSelect.vue';
import { upgradeMcsExtChart, DISPLAY_NAME_ANNO } from '../utils/loadChartInstallData';

export default {
  components: {
    Card, ClusterSelect, AsyncButton, Banner
  },
  props: {
    resource: {
      type:     Object,
      required: true
    },
    clusters: {
      type: Array,
      default() {
        return [];
      }
    }
  },
  emits: ['close'],
  data() {
    return {
      loading:         false,
      errors:          [],
      checkedClusters: []
    };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    clusterOptions() {
      const initClusters = Object.keys(this.resource.spec?.clusters ?? {});

      return this.clusters.filter((c) => !initClusters.includes(c.metadata.name));
    },
    saveBtnDisabled() {
      return this.checkedClusters.length === 0;
    }
  },
  async created() {
    this.errors = [];
    // await this.loadClusters();
  },
  methods: {
    close() {
      this.$emit('close');
    },
    async save(btn) {
      try {
        const sc = await this.$store.dispatch(`management/clone`, { resource: this.resource });
        const { installedClusters, uninstalledClusters } = await this.splitClustersByAppInstalled();

        [...uninstalledClusters, ...installedClusters].forEach((c) => {
          if (!sc.spec) {
            sc.spec = {};
          }
          if (!sc.spec.clusters) {
            sc.spec.clusters = {};
          }
          sc.spec.clusters[c.name] = {};
        });
        try {
          await sc.save();
        } catch (err) {
          throw new Error(err?.message ? err.message : 'Save Clusterset Error');
        }
        if (installedClusters.length) {
          await Promise.all(installedClusters.map(async(c) => {
            try {
              await upgradeMcsExtChart({
                store:            this.$store,
                clusters:         [c.cluster],
                targetClusterset: sc.metadata.name,
                t:                this.t,
              });
            } catch (err) {
              throw new Error(err?.message ? err.message : 'Update Chart Error');
            }
          }));
        }
        btn(true);
        this.close();
      } catch (error) {
        this.errors = [error];
        btn(false);
      }
    },
    async splitClustersByAppInstalled() {
      const installedClusters = [];
      const uninstalledClusters = [];
      const selected = this.clusters.filter((c) => this.checkedClusters.includes(c.metadata.name) || this.checkedClusters.includes(c.metadata?.annotations?.[DISPLAY_NAME_ANNO]));

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
          // Handle the case where fetching fails and the installation is not completed
          uninstalledClusters.push({
            name:    c.metadata.name,
            cluster: c,
          });
        }
      }));

      return { installedClusters, uninstalledClusters };
    },
  }
};
</script>

<style lang="scss">
.add-clusterset-member {
  margin: 0;
  .buttons {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
  .card-actions {
    padding-top: 0px !important;
  }
}
</style>
