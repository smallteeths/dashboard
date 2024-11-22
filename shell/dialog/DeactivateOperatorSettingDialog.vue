<script>
import AsyncButton from '@shell/components/AsyncButton';
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { mapGetters } from 'vuex';

export default {
  components: {
    Card,
    AsyncButton,
    Banner,
  },
  emits: ['close'],
  props: {
    urls: {
      type:    Array,
      default: null,
    },
    names: {
      type:    Array,
      default: () => [],
    },
  },

  data() {
    return { errors: [] };
  },
  computed: {
    formattedText() {
      const names = this.names;
      const count = this.names.length;
      const warningDrivers = this.t('drivers.deactivate.warningDrivers', { names, count });

      return this.t('drivers.deactivate.warning', { warningDrivers, count });
    },
    ...mapGetters({ t: 'i18n/t' }),
  },
  methods: {
    close(buttonDone) {
      if (buttonDone && typeof buttonDone === 'function') {
        buttonDone(true);
      }
      this.$emit('close');
    },
    async apply(buttonDone) {
      try {
        for (const url of this.urls) {
          await this.$store.dispatch('rancher/request', {
            url,
            method: 'post'
          });
        }

        this.close(buttonDone);
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    }
  }
};
</script>
<template>
  <Card
    class="prompt-deactivate"
    :show-highlight-border="false"
    :data-testid="'prompt-deactivate'"
  >
    <h4
      slot="title"
      class="text-default-text"
    >
      {{ t('drivers.deactivate.title') }}
    </h4>

    <template #body>
      <div class="pl-10 pr-10">
        <div class="text info mb-10 mt-20">
          <span v-clean-html="formattedText" />
        </div>
        <Banner
          v-for="(err, i) in errors"
          :key="i"
          color="error"
          :label="err"
        />
      </div>
    </template>

    <template #actions>
      <button
        class="btn role-secondary"
        @click="close"
      >
        {{ t('generic.cancel') }}
      </button>
      <div class="spacer" />
      <AsyncButton
        mode="deactivate"
        class="btn bg-error ml-10"
        :data-testid="'deactivate-driver-confirm'"
        @click="apply"
      />
    </template>
  </Card>
</template>

<style lang='scss'>
  .prompt-deactivate {
    &.card-container {
      box-shadow: none;
    }
    #confirm {
      width: 90%;
      margin-left: 3px;
    }

    .actions {
      text-align: right;
    }

    .card-actions {
      display: flex;

      .spacer {
        flex: 1;
      }
    }
  }
</style>
