<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <ResourceTable
      ref="table"
      class="table mcs-table"
      :schema="schema"
      :headers="headers"
      :rows="filteredRows"
      :loading="loading"
      :groupable="true"
      group-tooltip="mcs.table.groupBy.name"
      :table-actions="false"
      key-field="id"
    >
      <template #group-by="{ group }">
        <div
          class="clusterset-bar"
        >
          <div
            v-trim-whitespace
            class="group-tab"
          >
            <div class="clusterset-name">
              <div v-if="group.rows[0].id.startsWith('cluster_')">
                {{ t('mcs.table.notInClusterset') }}
              </div>
              <div v-else>
                <span>Clusterset:</span> <span><router-link :to="{name: 'globalMultiClusterService-c-cluster-resource-id', params: {cluster: 'local', resource: CLUSTER_SET, id: group.rows[0].clusterset.id}}">{{ group?.rows[0]?.nameDisplay }}</router-link></span>
              </div>
            </div>
          </div>
          <div
            v-if="!group.rows[0].id.startsWith('cluster_')"
            class="right"
          >
            <button
              v-if="clustersWithoutClusterset.length > 0"
              class="mcs-add-cluster btn btn-sm role-secondary mr-5"
              @click="showAddClusterModal(group)"
            >
              {{ t('mcs.table.addCluster') }}
            </button>
            <ButtonMultiAction
              class="clusterset-action mr-10"
              :borderless="true"
              @click="showClustersetAction($event, group)"
            />
          </div>
        </div>
      </template>
      <template #cell:state="{row}">
        <BadgeState
          v-if="row.stateDisplay"
          :color="row.stateBackground"
          :label="row.stateDisplay"
        />
        <span
          v-else
          class="text-muted"
        >
          &ndash;
        </span>
      </template>
      <template #cell:name="{row}">
        <span v-if="row.nameDisplay">{{ row.nameDisplay }}</span>
        <span
          v-else
          class="text-muted"
        >
          &ndash;
        </span>
      </template>
      <template #cell:cluster="{row}">
        <template v-if="groupPreference === 'none'">
          {{ Object.keys(row.spec?.clusters ?? {}).join(', ') }}
        </template>
        <template v-else>
          <span v-if="row.cluster">{{ row.cluster.nameDisplay }}</span>
          <span
            v-else
            class="text-muted"
          >
            &ndash;
          </span>
        </template>
      </template>
      <template #row-actions="{row}" @click="showClusterAction($event, row)">
        <ButtonMultiAction
          class="clusterset-action mr-10"
          :borderless="true"
        />
      </template>

      <template
        v-for="item in clustersetWithoutCluster"
        #[`main-row:clusterset_${item.clusterset.metadata.name}`]="{ fullColspan }"
        :key="item.id"
      >
        <tr
          :key="item.id"
          class="main-row"
        >
          <td
            class="empty text-center"
            :colspan="fullColspan"
          >
            {{ t('mcs.table.noClusters') }}
          </td>
        </tr>
      </template>
      <template #sub-row="{fullColspan, row}">
        <tr><td :colspan="fullColspan">
          <div class="text-error">
              {{ row.stateDescription }}
          </div>
        </td></tr>
      </template>
    </ResourceTable>
  </div>
</template>

<script>
import { BadgeState } from '@components/BadgeState';
import ButtonMultiAction from '@shell/components/ButtonMultiAction.vue';
import Loading from '@shell/components/Loading';
import ResourceTable from '@shell/components/ResourceTable';
import { STATE, AGE, NAME } from '@shell/config/table-headers';
import { CAPI } from '@shell/config/types';
import ResourceFetch from '@shell/mixins/resource-fetch';
import { mapPref, GROUP_RESOURCES } from '@shell/store/prefs';

const CLUSTER_SET = 'multicluster.pandaria.io.clusterset';
const CLUSTER_SET_PHASE_BG_MAP = {
  'Ready': 'bg-success',
  'Degraded': 'bg-warning',
  'Failed': 'bg-error'
}
const genMainRowKey = (cluster, clusterset) => {
  if (cluster && clusterset) {
    return `${ clusterset.id }_${ cluster.id }`;
  }
  if (cluster && !clusterset) {
    return `cluster_${ cluster.id }`;
  }
  if (!cluster && clusterset) {
    return `clusterset_${ clusterset.id }`;
  }
};
const genRowObj = (cluster, clusterset, that) => {
  const actions = [];

  if (clusterset?.hasLink('update')) {
    actions.push({
      action: 'remove',
      label:  that.t('action.remove'),
      icon:   'icon icon-trash',
    });
    if (cluster) {
      actions.push({
        action: 'move',
        label:  that.t('mcs.nav.clusterMove'),
        icon:   'icon icon-fork'
      });
    }
  }

  const id = genMainRowKey(cluster, clusterset);
  const d = {
    id,
    nameDisplay:       clusterset?.metadata?.name,
    cluster,
    clusterset,
    creationTimestamp: clusterset ? clusterset.metadata.creationTimestamp : cluster?.metadata?.creationTimestamp,
    mainRowKey:        id,
    groupByLabel:      id.startsWith('cluster_') ? 'empty' : id,
    availableActions:  actions,
    remove() {
      that.$store.dispatch('management/promptModal', {
        component:      'PromptRemoveClustersetMember',
        componentProps: {
          applyMode: 'delete',
          title:     that.t('promptRemove.title'),
          cluster,
          clusterset,
          body:      `${ that.t('promptRemove.attemptingToRemove', { type: 'clusterset member' }) } <span>${ cluster.nameDisplay }</span>`,
        },
        modalWidth: '600px'
      });
    },
    move() {
      that.$store.dispatch('management/promptModal', {
        component:      'MoveClustersetMember',
        componentProps: {
          clusterset,
          clusters:    [cluster],
          clustersets: that.rows.filter((cs) => cs.id !== clusterset.id),
          applyMode:   'edit',
        },
        modalWidth: '600px'
      });
    }
  };

  // if (clusterset && cluster) {
  //   const clustersetId = cluster.metadata?.annotations?.['field.cattle.io/clustersetId'];

  //   d.stateDisplay = clustersetId ? 'Active' : 'Notready';
  //   d.stateBackground = clustersetId ? 'bg-success' : 'bg-info';
  // } else if (clusterset) {
  //   const name = clusterset.metadata.state.name;

  //   d.stateDisplay = `${ name.slice(0, 1).toUpperCase() }${ name.slice(1) }`;
  //   d.stateBackground = clusterset.metadata.error ? 'bg-info' : 'bg-success';
  // }

  if (clusterset && cluster && clusterset.status?.memberStatus) {
    const state = clusterset.status?.memberStatus[cluster.metadata.name]?.phase
    d.stateDisplay = state && `${ state.slice(0, 1).toUpperCase() }${ state.slice(1) }`
    d.stateBackground = CLUSTER_SET_PHASE_BG_MAP[state] ?? 'bg-info';
    if (state === 'Failed') {
      d.stateDescription = clusterset.status.memberStatus[cluster.metadata.name]?.message
    }
  } else if (clusterset) {
    const state = clusterset.status.phase
    d.stateDisplay = state && `${ state.slice(0, 1).toUpperCase() }${ state.slice(1) }`;
    d.stateBackground = CLUSTER_SET_PHASE_BG_MAP[state] ?? 'bg-info';
    // if (['Degraded', 'Failed'].includes(clusterset.status.phase)) {
    //   d.showSubRow = true
    //   d.stateDescription = Object.entries(clusterset.status.memberStatus).filter(([k, v]) => v.phase === 'Failed').map(([k,v]) => `${k}\n${v.message}`).join('\n')
    // }
  }

  return d;
};

export default {
  name:       'ListMCS',
  components: {
    ResourceTable, ButtonMultiAction, BadgeState, Loading
  },
  mixins: [ResourceFetch],
  props:  {
    resource: {
      type:     String,
      required: true,
    },

    schema: {
      type:     Object,
      required: true,
    },

    useQueryParamsForSimpleFiltering: {
      type:    Boolean,
      default: false
    }
  },
  data() {
    return {
      loadResources:     [CLUSTER_SET],
      loadIndeterminate: true,
      CLUSTER_SET,
      rancherClusters:   []
    };
  },
  async fetch() {
    if (this.$store.getters['management/canList'](CAPI.RANCHER_CLUSTER)) {
      this.rancherClusters = await this.$fetchType(CAPI.RANCHER_CLUSTER);
    }
    await this.$fetchType(this.resource);
  },
  computed: {
    groupPreference: mapPref(GROUP_RESOURCES),
    headers() {
      const cluster = {
        name:  'cluster',
        label: this.t('tableHeaders.cluster'),
        value: 'cluster.name',
      };

      return [
        STATE,
        this.groupPreference === 'none' ? NAME : null,
        cluster,
        AGE
      ].filter((h) => h);
    },
    rancherClusterRows() {
      return this.rancherClusters.filter((r) => r.metadata.namespace !== 'fleet-local');
    },
    clustersetWithoutCluster() {
      const groupPreference = this.groupPreference;
      const rowData = this.rows;

      if (groupPreference === 'none') {
        return [];
      }

      return rowData.filter((r) => Object.keys(r.spec?.clusters ?? {}).length === 0).map((c) => genRowObj(null, c, this));
    },
    filteredRows() {
      const nameToClusterMap = this.nameToClusterMap;
      const groupPreference = this.groupPreference;
      const rowData = this.rows;
      const clustersetWithoutCluster = this.clustersetWithoutCluster;
      const clustersWithoutClusterset = this.clustersWithoutClusterset;

      if (groupPreference === 'none') {
        return rowData;
      }

      const rows = rowData.filter((r) => Object.keys(r.spec?.clusters ?? {}).length > 0).reduce((t, c) => {
        const rows = Object.keys(c.spec.clusters).map((item) => genRowObj(nameToClusterMap[item], c, this));

        t.push(...rows);

        return t;
      }, []);

      return [...rows, ...clustersetWithoutCluster, ...clustersWithoutClusterset];
    },
    clustersWithoutClusterset() {
      const idSet = this.rows.filter((c) => Object.keys(c.spec?.clusters ?? {}).length > 0).reduce((t, c) => {
        Object.keys(c.spec.clusters).forEach((k) => {
          t.add(k);
        });

        return t;
      }, new Set());

      return this.rancherClusterRows.filter((c) => !idSet.has(c.metadata.name)).map((c) => genRowObj(c, null, this));
    },
    nameToClusterMap() {
      return this.rancherClusterRows.reduce((t, c) => {
        t[c.metadata.name] = c;

        return t;
      }, {});
    }

  },
  methods: {
    showClustersetAction(event, group) {
      const cs = group.rows[0].clusterset;
      this.$store.commit(`action-menu/show`, {
        resources: [cs],
        elem:      event.target
      });
    },
    showClusterAction(event, row) {
      this.$store.commit(`action-menu/show`, {
        resources: [row],
        elem:      event.target
      });
    },
    showAddClusterModal(group) {
      this.$store.dispatch('management/promptModal', {
        component:      'AddClustersetMembers',
        componentProps: {
          applyMode: 'create',
          resource:  group.rows[0].clusterset,
          clusters:  this.clustersWithoutClusterset.map((c) => c.cluster)
        },
        modalWidth: '600px',
        modalSticky: true
      });
    }
  },
};
</script>

<style scoped>
.clusterset-name {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.clusterset-bar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.group-tab {
  max-width: calc(100% - 230px);
}
.clusterset-name span:first-child {
  padding-right: 8px;
}
.clusterset-name  span:last-child {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
