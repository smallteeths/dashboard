<script>
import { MACVLAN_IP_PRODUCT_NAME, MACVLAN_IP_PRODUCT_NAME_V2 } from '../config/macvlan-types';

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
    }
  },

  data() {
    const name = this.row.kind === 'FlatNetworkSubnet' ? MACVLAN_IP_PRODUCT_NAME_V2 : MACVLAN_IP_PRODUCT_NAME;

    return {
      getStartedLink: {
        name:   `${ name }-c-cluster-resource-ip`,
        params: { id: this.row.metadata.name }
      },
    };
  },

  computed: {
    totalCount() {
      const count = this.row.kind === 'FlatNetworkSubnet' ? this.row?.status?.usedIPCount : this.row?.metadata?.annotations?.macvlanipCount;

      return count || 0;
    }
  }
};
</script>

<template>
  <router-link
    :to="getStartedLink"
  >
    <span v-tooltip="{ content: `<div style='font-size: 12px;line-height: 20px;'>${row.nameDisplay}<br>${t('macvlan.macvlanIp.totalCount')}：${totalCount}</div>`, html: true }">{{ row.metadata.name }}</span>
  </router-link>
</template>
