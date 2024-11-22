<script>
import { mapGetters } from 'vuex';
import { CATALOG } from '@shell/config/types';
import ResourceTable from '@shell/components/ResourceTable';
import ResourceFetch from '@shell/mixins/resource-fetch';
import { MACVLAN_PRODUCT_NAME, MACVLAN_CHARTS_V2 } from '../config/macvlan-types';

export default {
  name:         'ListFlatNetWork',
  inheritAttrs: false,
  components:   { ResourceTable },
  mixins:       [ResourceFetch],
  props:        {
    schema: {
      type:     Object,
      required: true,
    },
    resource: {
      type:     String,
      required: true,
    },
  },
  async fetch() {
    try {
      this.existing = await this.$store.dispatch('cluster/find', {
        type: CATALOG.APP,
        id:   `${ MACVLAN_CHARTS_V2.NAMESPACE }/${ MACVLAN_CHARTS_V2.APP_NAME }`,
      });
    } catch (e) {
      this.$router.push({ name: `${ MACVLAN_PRODUCT_NAME }-c-cluster-resource-install`, params: { product: 'explorer', version: 'v2' } });
      this.existing = null;
    }

    await this.$fetchType(this.resource);
  },

  data() {
    return { existing: null };
  },

  computed: {
    ...mapGetters(['currentCluster']),
    headers() {
      return [
        {
          name:      'status',
          labelKey:  'macvlan.tableHeaders.status',
          value:     'status.phase',
          sort:      'status.phase',
          width:     120,
          formatter: 'MacvlanBadgeState',
        },
        {
          name:      'name',
          labelKey:  'tableHeaders.name',
          value:     'nameDisplay',
          sort:      'nameDisplay',
          width:     100,
          formatter: 'MacvlanName'
        },
        {
          name:     'master',
          labelKey: 'macvlan.tableHeaders.master',
          value:    'spec.master',
          width:    120
        },
        {
          name:     'mode',
          labelKey: 'macvlan.tableHeaders.mode',
          value:    'spec.mode',
          width:    120
        },
        {
          name:     'vlan',
          labelKey: 'macvlan.tableHeaders.vlan',
          value:    'spec.vlan',
          width:    120
        },
        {
          name:      'network',
          labelKey:  'macvlan.tableHeaders.cidr',
          value:     'spec.cidr',
          formatter: 'MacvlanNetwork',
          width:     220
        },
      ];
    },
  },
  typeDisplay() {
    return this.t('macvlan.titleV2');
  },
};
</script>
<template>
  <div>
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :rows="rows"
      :groupable="false"
      :schema="schema"
      key-field="_key"
      :loading="loading"
    />
  </div>
</template>
