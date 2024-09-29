<script>
import { mapGetters } from 'vuex';

const v2IpLabel = 'flatnetwork.pandaria.io/selectedIP';

export default {
  props: {
    value: {
      type:    [Array, String],
      default: () => {
        return [];
      }
    },

    row: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    podIP() {
      return this.row?.status?.podIP;
    },
    flatnetworkIP() {
      return this.row?.metadata?.labels[v2IpLabel];
    }
  }

};
</script>

<template>
  <div>
    <p>
      {{ podIP }}
    </p>
    <p v-if="flatnetworkIP">
      {{ flatnetworkIP }}
    </p>
  </div>
</template>

<style scoped>
  .formatter-pod-images {
    word-break: break-all;
  }
</style>
