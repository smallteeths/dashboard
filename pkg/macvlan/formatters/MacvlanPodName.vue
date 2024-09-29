<script>
import { BLANK_CLUSTER } from '@shell/store/store-types.js';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    },
    row: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    currentCluster: {
      type:    Object,
      default: () => {
        return {};
      }
    },
  },

  data() {
    return {
      getStartedLink: {
        name:   'c-cluster-product-resource-namespace-id',
        params: {
          cluster:   this.currentCluster?.id === BLANK_CLUSTER ? 'local' : this.currentCluster?.id,
          namespace: this.row?.metadata?.namespace || 'default',
          resource:  'pod',
          id:        this.row.metadata.name,
        },
      },
    };
  },
};
</script>

<template>
  <n-link
    :to="getStartedLink"
  >
    <span>{{ row.metadata.name }}</span>
  </n-link>
</template>
