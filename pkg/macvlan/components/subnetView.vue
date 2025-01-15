<script>
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { MANAGEMENT } from '@shell/config/types';
import { mapGetters } from 'vuex';
import { find } from 'lodash';

export default {
  name:  'SubnetView',
  props: {
    config: {
      type:     Object,
      required: true
    },
  },
  components: {
    Tabbed,
    Tab,
  },
  data() {
    return { mode: 'view' };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    project() {
      const currentProjectId = this.config?.metadata?.labels?.project ? this.config.metadata.labels.project : '';

      const out = [{
        label: 'All Projects',
        value: ''
      }];

      this.$store.getters['management/all'](
        MANAGEMENT.PROJECT
      ).forEach((obj) => {
        out.push({
          label: obj.nameDisplay,
          value: obj.id.replace(/[/]/g, '-'),
        });
      });

      return find(out, (o) => {
        return o.value === currentProjectId;
      });
    },
    ranges() {
      return this.config?.spec?.ranges || [];
    },
    routes() {
      return this.config?.spec?.routes || [];
    },
    showPodRouteSettings() {
      return this.config?.spec?.routeSettings?.addClusterCIDR ||
        this.config?.spec?.routeSettings?.addServiceCIDR ||
        this.config?.spec?.routeSettings?.addNodeCIDR;
    },
    showAdvanced() {
      return this.routes.length > 0 ||
        this.ranges.length > 0 ||
        this.showPodRouteSettings ||
        this.config?.spec?.routeSettings?.addPodIPToHost ||
        this.config?.spec?.routeSettings?.flatNetworkDefaultGateway;
    }
  }
};
</script>
<template>
  <div>
    <div class="mb-5">
      <h3>
        {{ t('macvlan.titleV2') }}: {{ config?.metadata?.name }}
      </h3>
    </div>
    <Tabbed
      :side-tabs="true"
      default-tab="general"
      :useHash="false"
    >
      <Tab
        name="general"
        :label="t('macvlan.tabs.general')"
        :weight="99"
      >
        <div class="row mb-20">
          <div class="col span-6">
            {{ t('macvlan.master.label') }}: {{ config?.spec?.master }}
          </div>
          <div class="col span-6">
            {{ t('macvlan.vlan.label') }}: {{ config?.spec?.vlan }}
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            {{ t('macvlan.cidr.label') }}: {{ config?.spec?.cidr }}
          </div>
          <div class="col span-6">
            {{ t('macvlan.mode.flatMode') }}: {{ config?.spec?.flatMode }}
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            {{ t('macvlan.mode.label') }}: {{ config?.spec?.mode }}
          </div>
          <div class="col span-6">
            {{ t('macvlan.gateway.label') }}: {{ config?.spec?.gateway }}
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            {{ t('macvlan.project.label') }}: {{ project.label }}
          </div>
          <div
            v-if="config?.spec?.ipvlanFlag"
            class="col span-6"
          >
            {{ t('macvlan.ipvlanFlag.label') }}: {{ config?.spec?.ipvlanFlag }}
          </div>
        </div>
      </Tab>
      <Tab
        v-if="showAdvanced"
        name="advanced"
        :label="t('macvlan.tabs.advanced')"
        :weight="98"
      >
        <div>
          <div
            v-if="ranges.length > 0"
          >
            <h3>
              {{ t('macvlan.ipRange.label') }}
            </h3>
            <div
              v-for="(range, index) in ranges"
              :key="index"
            >
              <div>
                {{ range.rangeStart ? range.rangeStart : range.from }}-{{ range.rangeEnd ? range.rangeEnd : range.to }}
              </div>
            </div>
          </div>
          <div
            v-if="routes.length > 0"
            class="mt-15 advanced"
          >
            <h3>
              {{ t('macvlan.route.label') }}
            </h3>
            <div class="route-headers">
              <label class="text-label">
                {{ t('macvlan.route.dst.label') }}
              </label>
              <label class="text-label">
                {{ t('macvlan.route.via.label') }}
              </label>
              <label class="text-label">
                {{ t('macvlan.route.dev.label') }}
              </label>
              <label class="text-label">
                {{ t('macvlan.route.src.label') }}
              </label>
              <label class="text-label">
                {{ t('macvlan.route.priority.label') }}
              </label>
            </div>
            <div
              v-for="(row, idx) in routes"
              :key="idx"
              class="route-row"
            >
              <div class="dst">
                {{ row.dst }}
              </div>
              <div class="via">
                {{ row.via }}
              </div>
              <div class="dev">
                {{ row.dev }}
              </div>
              <div class="src">
                {{ row.src }}
              </div>
              <div class="priority">
                {{ row.priority }}
              </div>
            </div>
          </div>
          <div
            v-if="showPodRouteSettings"
            class="mt-15 advanced"
          >
            <h3>
              {{ t('macvlan.routeSettings.title.pod') }}
            </h3>
            <div>
              {{ config?.spec?.routeSettings?.addClusterCIDR ? t('macvlan.routeSettings.addClusterCIDR') : '' }}
            </div>
            <div>
              {{ config?.spec?.routeSettings?.addServiceCIDR ? t('macvlan.routeSettings.addServiceCIDR') : '' }}
            </div>
            <div>
              {{ config?.spec?.routeSettings?.addNodeCIDR ? t('macvlan.routeSettings.addNodeCIDR') : '' }}
            </div>
          </div>
          <div
            v-if="config?.spec?.routeSettings?.addPodIPToHost"
            class="mt-15 advanced"
          >
            <h3>
              {{ t('macvlan.routeSettings.title.node') }}
            </h3>
            <div>
              {{ t('macvlan.routeSettings.addPodIPToHost') }}
            </div>
          </div>
          <div
            v-if="config?.spec?.routeSettings?.flatNetworkDefaultGateway"
            class="mt-15 advanced"
          >
            <h3>
              {{ t('macvlan.routeSettings.title.default') }}
            </h3>
            <div>
              {{ t('macvlan.routeSettings.flatNetworkDefaultGateway') }}
            </div>
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.flexwrap {
  flex-wrap: wrap;
}
.advanced {
  SPAN {
    padding: 2px 5px;
    display: inline-block;
    min-with: 100px;
    min-width: 100px;
    text-align: center;
  }
  .route-headers, .route-row{
    display: grid;
    grid-template-columns: 16% 16% 16% 16% 16% 90px .5fr .5fr;
    grid-column-gap: $column-gutter;
    margin-bottom: 10px;
    align-items: center;
  }

  .route-headers {
    color: var(--input-label);
  }
}
</style>
