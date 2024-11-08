<script>
import { mapGetters } from 'vuex';
import { CATALOG } from '@shell/config/types';
import ResourceTable from '@shell/components/ResourceTable';
import { Banner } from '@components/Banner';
import ResourceFetch from '@shell/mixins/resource-fetch';
import { MACVLAN_PRODUCT_NAME, MACVLAN_CHARTS } from '../config/macvlan-types';

export default {
  name:       'ListMacvlan',
  components: { ResourceTable, Banner },
  mixins:     [ResourceFetch],
  props:      {
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
        id:   `${ MACVLAN_CHARTS.NAMESPACE }/${ MACVLAN_CHARTS.APP_NAME }`,
      });
    } catch (e) {
      this.$router.push({ name: `${ MACVLAN_PRODUCT_NAME }-c-cluster-resource-install`, params: { product: 'explorer', version: 'v1' } });
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
          name:      'name',
          labelKey:  'tableHeaders.name',
          value:     'nameDisplay',
          sort:      'nameDisplay',
          width:     120,
          formatter: 'MacvlanName'
        },
        {
          name:      'project',
          labelKey:  'tableHeaders.project',
          value:     'project',
          width:     100,
          formatter: 'MacvlanProject'
        },
        {
          name:     'master',
          labelKey: 'macvlan.tableHeaders.master',
          value:    'spec.master',
          width:    120
        },
        {
          name:     'vlan',
          labelKey: 'macvlan.tableHeaders.vlan',
          value:    'spec.vlan',
          width:    70
        },
        {
          name:     'cidr',
          labelKey: 'macvlan.tableHeaders.cidr',
          value:    'spec.cidr',
          width:    120
        },
        {
          name:      'ipRange',
          labelKey:  'macvlan.tableHeaders.ipRange',
          value:     'spec.ranges',
          width:     260,
          formatter: 'MacvlanIpRange'
        },
        {
          name:      'customRoute',
          labelKey:  'macvlan.tableHeaders.route',
          value:     'spec.routes',
          width:     150,
          formatter: 'MacvlanRoute'
        },
        {
          name:     'gateway',
          labelKey: 'macvlan.tableHeaders.gateway',
          value:    'spec.gateway',
          width:    120
        },
      ];
    },
  },
};
</script>
<template>
  <div>
    <Banner
      color="warning"
      class="banner-right"
    >
      {{ t('macvlan.deprecated') }}
    </Banner>
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      :rows="rows"
      :groupable="false"
      :schema="schema"
      key-field="_key"
      :loading="loading"
      v-on="$listeners"
    />
  </div>
</template>
