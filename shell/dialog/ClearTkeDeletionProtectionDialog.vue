<template>
  <Card
    class="clear-tke-deletion-protection-dialog"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('cluster.cloudProvider.tke.deletionProtection.removeAction') }}
      </h4>
    </template>
    <template #body>
      <div class="clear-tke-deletion-protection-dialog__body">
        <div class="clear-tke-deletion-protection-dialog__message">
          {{ t('cluster.cloudProvider.tke.deletionProtection.removeConfirm') }}
        </div>
        <div
          v-if="clusterName"
          class="clear-tke-deletion-protection-dialog__cluster"
        >
          {{ t('cluster.cloudProvider.tke.deletionProtection.targetCluster', { name: clusterName }) }}
        </div>
      </div>
    </template>
    <template #actions>
      <div class="actions-container">
        <button
          class="btn role-secondary mr-5"
          type="button"
          @click="close"
        >
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton
          mode="apply"
          @click="apply"
        />
      </div>
    </template>
  </Card>
</template>

<script>
import { mapGetters } from 'vuex';
import AsyncButton from '@shell/components/AsyncButton';
import { Card } from '@components/Card';

export default {
  name:       'ClearTkeDeletionProtectionDialog',
  emits:      ['close'],
  components: {
    Card,
    AsyncButton,
  },
  props: {
    resources: {
      type:    Array,
      default: () => [],
    },
  },
  data() {
    return { loading: false };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    cluster() {
      return this.resources?.[0] || null;
    },
    mgmtCluster() {
      return this.cluster?.mgmt || null;
    },
    tkeConfig() {
      return this.mgmtCluster?.spec?.tkeConfig || null;
    },
    clusterName() {
      return this.mgmtCluster?.nameDisplay || this.mgmtCluster?.metadata?.name || '';
    },
  },
  methods: {
    close() {
      if (this.loading) {
        return;
      }
      this.$emit('close', false);
    },
    resetDeletionProtection(config) {
      config.clusterAdvancedSettings = config.clusterAdvancedSettings || {};
      config.clusterAdvancedSettings.deletionProtection = false;
      config.nodePoolList = (config.nodePoolList || []).map((item) => {
        return {
          ...item,
          deletionProtection: false,
        };
      });
      config.virtualNodePoolList = (config.virtualNodePoolList || []).map((item) => {
        return {
          ...item,
          deletionProtection: false,
        };
      });
    },
    async apply(buttonDone) {
      if (this.loading) {
        buttonDone(false);

        return;
      }
      if (!this.cluster || typeof this.cluster.findNormanCluster !== 'function') {
        buttonDone(false);
        this.$emit('close', false);

        return;
      }
      this.loading = true;
      try {
        const liveNormanCluster = await this.cluster.findNormanCluster();

        if (!liveNormanCluster) {
          buttonDone(false);
          this.$emit('close', false);

          return;
        }

        const editable = await this.$store.dispatch('rancher/clone', { resource: liveNormanCluster }, { root: true });

        if (!editable?.tkeConfig) {
          buttonDone(false);
          this.$emit('close', false);

          return;
        }

        this.resetDeletionProtection(editable.tkeConfig);
        await editable.save();

        this.cluster?.$dispatch('growl/success', { title: this.t('cluster.cloudProvider.tke.deletionProtection.removeSuccess') }, { root: true });

        buttonDone(true);
        this.$emit('close', true);
      } catch (err) {
        this.cluster?.$dispatch('growl/fromError', {
          title: this.t('cluster.cloudProvider.tke.deletionProtection.removeFailed'),
          err,
        }, { root: true });

        buttonDone(false);
      } finally {
        this.loading = false;
      }
    }
  },
};
</script>

<style lang='scss'>
.clear-tke-deletion-protection-dialog {
  &.card-container {
    box-shadow: none;
  }
  .clear-tke-deletion-protection-dialog__body {
    padding: 0 10px;
  }
  .clear-tke-deletion-protection-dialog__message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--default-text);
  }
  .clear-tke-deletion-protection-dialog__cluster {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
  }
  .actions-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
  .actions-container :deep(.apply-btn),
  .actions-container :deep(.async-button) {
    margin-left: 20px;
  }
}
</style>
