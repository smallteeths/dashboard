<script>
import { Banner } from '@components/Banner';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { CAPI } from '@shell/config/types';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { decodeHtml } from '@shell/utils/string';
import { mapGetters } from 'vuex';

import { deleteSubmarinerAndWait } from '../utils/loadChartInstallData';


export default {
  components: {
    Card,
    AsyncButton,
    Banner,
  },
  props: {
    applyAction: {
      type:    Function,
      default: () => {}
    },
    applyMode: {
      type:    String,
      default: 'delete'
    },
    title: {
      type:    String,
      default: ''
    },
    body: {
      type:    String,
      default: ''
    },
    clusterset: {
      type: Object,
      required: true
    },
    cluster:   {
      type:     Object,
      required: true
    },
  },
  emits: ['close'],
  data() {
    return {
      errors: [],
      deleteStatus: '',
      isClosed: false,
    };
  },
  computed: {
    ...mapGetters({
      t: 'i18n/t',
    }),
  },
  beforeUnmount() {
    this.isClosed = true;
  },
  methods: {
    decodeHtml,
    close() {
      this.$emit('close');
    },
    async confirm(result) {
      if (!result || this.isClosed) {
        return;
      }
      // delete Submariner CR
      const clusterName = this.cluster?.status?.clusterName;
      const url = `/k8s/clusters/${clusterName}/apis/catalog.cattle.io/v1/apps`;

      try {
        const resp  = await this.$store.dispatch('management/request', { url });
        const apps  = resp?.items ?? [];
        const match = apps.find(app => app?.spec?.chart?.metadata?.name === 'mcs-ext-chart');

        if (match) {
          const { ok: deleteOk, errors: collected } = await deleteSubmarinerAndWait(this.$store, this.cluster, {
            onProgress: (m) => { this.deleteStatus = m; },
            t: this.t,
            isClosed: () => false, // Temporarily hardcode it as false; closing the dialog should not terminate the request for now.
          });

          // if (this.isClosed) return;
          if (!deleteOk) {
            throw new Error(`Delete Submariner CR failed：${ String(collected) }`);
          }
        }

        // delete clusterset 
        const sc = await this.$store.dispatch(`management/clone`, { resource: this.clusterset });

        delete sc.spec.clusters[this.cluster.metadata.name];
        await sc.save();

        // Delete cluster anno
        const c = await this.$store.dispatch('management/find', { type: CAPI.RANCHER_CLUSTER, id: this.cluster.id, opt: { force: true }} );

        delete c.metadata?.annotations?.['field.cattle.io/clustersetId'];
        await c.save()
        this.close();
      } catch (e) {
        throw new Error(e?.message ? e.message : 'Delete Error');
      }
    },
    async apply(buttonDone) {
      try {
        await this.applyAction(buttonDone);
        await this.confirm(true);
        this.$emit('close', true);
      } catch (err) {
        console.error(err); // eslint-disable-line
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    }
  },
};
</script>

<template>
  <Card
    class="prompt-restore"
    :show-highlight-border="false"
  >
    <template #title>
      <slot name="title">
        <h4
          v-clean-html="title"
          class="text-default-text"
        />
      </slot>
    </template>
    <template #body>
      <slot name="body">
        <div
          v-clean-html="decodeHtml(body)"
          class="pl-10 pr-10"
          style="min-height: 50px; display: flex;"
        />
      </slot>
    </template>
    <template #actions>
      <div class="bottom">
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
        <div class="buttons">
          <button
            class="btn role-secondary mr-10"
            @click="close"
          >
            {{ t('generic.close') }}
          </button>
          <AsyncButton
            :mode="applyMode"
            class="btn bg-error ml-10"
            @click="apply"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<style lang='scss' scoped>
  .prompt-restore {
    margin: 0;
  }
  .bottom {
    display: flex;
    flex-direction: column;
    flex: 1;
    .banner {
      margin-top: 0
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  }
</style>
