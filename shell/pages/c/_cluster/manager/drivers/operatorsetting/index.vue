<script>
import { NORMAN } from '@shell/config/types';
import ResourceTable from '@shell/components/ResourceTable';
import Loading from '@shell/components/Loading';
import Masthead from '@shell/components/ResourceList/Masthead';
export default {
  name:       'OperatorSetting',
  components: {
    ResourceTable, Loading, Masthead
  },

  async fetch() {
    this.allOperatorSetting = await this.$store.dispatch('rancher/findAll', { type: NORMAN.OPERATOR_SETTING }, { root: true });
  },

  data() {
    return {
      allOperatorSetting:               null,
      resource:                         NORMAN.OPERATOR_SETTING,
      schema:                           this.$store.getters['rancher/schemaFor'](NORMAN.OPERATOR_SETTING),
      useQueryParamsForSimpleFiltering: false,
      forceUpdateLiveAndDelayed:        10
    };
  },
  computed: {
    rows() {
      return this.allOperatorSetting || [];
    },
  },
  mounted() {
    window.c = this;
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <Masthead
      :schema="schema"
      :resource="resource"
      :type-display="t('drivers.operatorsetting.title')"
    />
    <ResourceTable
      :schema="schema"
      :rows="rows"
      :use-query-params-for-simple-filtering="useQueryParamsForSimpleFiltering"
      :force-update-live-and-delayed="forceUpdateLiveAndDelayed"
      :tableActions="true"
      :data-testid="'operator-setting-list'"
    >
      <template #cell:name="{row}">
        <span>{{ row.nameDisplay }}</span>
        <div
          v-if="row.description"
          class="description text-muted text-small"
        >
          {{ row.description }}
        </div>
      </template>
    </ResourceTable>
  </div>
</template>
