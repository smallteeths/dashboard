<template>
  <Card
    class="clear-ack-deletion-protection-dialog"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('cluster.cloudProvider.ack.deletionProtection.removeAction') }}
      </h4>
    </template>
    <template #body>
      <div class="clear-ack-deletion-protection-dialog__body">
        <div class="clear-ack-deletion-protection-dialog__message">
          {{ t('cluster.cloudProvider.ack.deletionProtection.removeConfirm') }}
        </div>
        <div
          v-if="clusterName"
          class="clear-ack-deletion-protection-dialog__cluster"
        >
          {{ t('cluster.cloudProvider.ack.deletionProtection.targetCluster', { name: clusterName }) }}
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
  name:       'ClearAckDeletionProtectionDialog',
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
    ackConfig() {
      return this.mgmtCluster?.spec?.ackConfig || null;
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
      config.deletionProtection = false;
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

        if (!editable?.ackConfig) {
          buttonDone(false);
          this.$emit('close', false);

          return;
        }
        this.resetDeletionProtection(editable.ackConfig);
        await editable.save();
        this.cluster?.$dispatch('growl/success', { title: this.t('cluster.cloudProvider.ack.deletionProtection.removeSuccess') }, { root: true });
        buttonDone(true);
        this.$emit('close', true);
      } catch (err) {
        this.cluster?.$dispatch('growl/fromError', {
          title: this.t('cluster.cloudProvider.ack.deletionProtection.removeFailed'),
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
.clear-ack-deletion-protection-dialog {
  &.card-container {
    box-shadow: none;
  }
  .clear-ack-deletion-protection-dialog__body {
    padding: 0 10px;
  }
  .clear-ack-deletion-protection-dialog__message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--default-text);
  }
  .clear-ack-deletion-protection-dialog__cluster {
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
