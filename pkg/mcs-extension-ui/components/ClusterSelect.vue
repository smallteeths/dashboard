<template>
  <div>
    <Dropdown
      v-model:shown="isShown"
      :disabled="disabled"
      placement="bottom-start"
      @apply-show="handleShow"
    >
      <div
        ref="targetRef"
        class="cluster-select__content "
        :class="{ 'cluster-select_disabled' : disabled }"
      >
        <label>{{ t('mcs.clusterSelect.label') }} <span
          v-if="required"
          class="required"
        >*</span></label>
        <div class="cluster-select__selected-items mt-5">
          <div
            v-for="(c, index) in checkedClusters"
            :key="c"
            class="cluster-select__selected-item mb-10"
            :class="{ 'cluster-select_disabled' : disabled }"
          >
            <div>{{ getNameByValue(c) }}</div>
            <i
              v-if="!disabled"
              class="icon icon-close"
              @click="handleRemove(c, index)"
            />
          </div>
          <div
            v-for="(c, index) in missingClusters"
            :key="c"
            class="cluster-select__selected-item mb-10"
            :class="{ 'cluster-select_disabled' : disabled }"
          >
            <div>{{ c }}</div>
            <i
              v-if="!disabled"
              class="icon icon-close"
              @click="handleRemoveMissingCluster(c, index)"
            />
          </div>
        </div>
        <i
          v-if="!disabled"
          class="icon icon-chevron-down cluster-select__arraw"
          :class="[isShown ? 'icon-chevron-up' : 'icon-chevron-down']"
        />
      </div>
      <template #popper>
        <div
          class="cluster-select__dropdown-content"
          :style="{minWidth: targetWidth}"
        >
          <Tabbed :flat="true">
            <Tab
              :label="t('tableHeaders.clusters')"
              name="clusters"
              :weight="2"
            >
              <div
                v-for="c in clusterOptions"
                :key="c.id"
                class="cluster-select__option-item"
                @click="handleCheck(c)"
              >
                <div>{{ c.name }}</div>
                <i
                  v-if="c.checked"
                  class="icon icon-checkmark"
                />
              </div>
            </Tab>
            <Tab
              v-if="clusterGroups.length > 0"
              :label="t('tableHeaders.clusterGroups')"
              name="groupClusters"
              :weight="1"
            >
              <div
                v-for="g in clusterGroupOptions"
                :key="g.id"
                class="cluster-select__option-item"
                @click="handleClusterGroupClick(g)"
              >
                <div>{{ g.name }}</div>
                <i
                  v-if="g.checked"
                  class="icon icon-checkmark"
                />
              </div>
            </Tab>
          </Tabbed>
        </div>
      </template>
    </Dropdown>
  </div>
</template>
<script>
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { DISPLAY_NAME_ANNO } from '../utils/loadChartInstallData';
import { Dropdown } from 'floating-vue';

export default {
  components: {
    Dropdown, Tab, Tabbed
  },
  props: {
    initClusters: {
      type: Array,
      default() {
        return [];
      }
    },
    clusters: {
      type: Array,
      default() {
        return [];
      }
    },
    clusterGroups: {
      type: Array,
      default() {
        return [];
      }
    },
    disabled: {
      type:    Boolean,
      default: false
    },
    required: {
      type:    Boolean,
      default: true
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      clusterOptions:         [],
      checkedClusters:        [],
      checkedMissingClusters: [],
      clusterGroupOptions:    [],
      isShown:                false,
      targetWidth:            '100px',
    };
  },
  /*
  * This component needs an explanation for:
  *   c.metadata?.annotations?.[DISPLAY_NAME_ANNO] || c.metadata.name
  *
  * For clusters created via v1:
  *   The name that should be displayed externally is c.metadata.name.
  *
  * For clusters created via v3:
  *   The name that should be displayed externally is c.metadata?.annotations?.[DISPLAY_NAME_ANNO].
  *
  * However, the value stored when adding a cluster into a ClusterSet is always c.metadata.name.
  * So during rendering we do this conversion to make sure both v1 and v3 clusters are displayed correctly.
  *
  */
  computed: {
    missingClusters() {
      const optionValues = this.clusterOptions.map((o) => o.value);

      return this.initClusters.filter((c) => !optionValues.some((item) => item === c));
    },
  },
  watch: {
    clusters: {
      handler() {
        const initClusters = this.initClusters;

        this.clusterOptions = this.clusters.filter((c) => c.metadata.namespace !== 'fleet-local')
          .map((c) => ({
            id:        c.id,
            name:      c.metadata?.annotations?.[DISPLAY_NAME_ANNO] || c.metadata.name, // display
            value:     c.metadata.name, // value
            namespace: c.metadata.namespace,
            checked:   initClusters.includes(c.metadata.name),
            raw:       c,
          }));
      },
      immediate: true
    },
    clusterGroups: {
      handler() {
        const initClusters = this.initClusters;

        this.clusterGroupOptions = this.clusterGroups.filter((g) => g.metadata.namespace !== 'fleet-local')
          .map((g) => ({
            id:      g.id,
            name:    g.metadata.name,
            checked: g.targetClusters.some((c) => initClusters.includes(c.metadata.name)),
            raw:     g
          }));
      },
      immediate: true
    },
    initClusters: {
      handler(clusters) {
        this.clusterOptions.forEach((c) => {
          c.checked = clusters.includes(c.value);
        });
        this.checkedClusters = [...this.initClusters.filter((c) => this.clusterOptions.some((item) => item.value === c))];
      },
      immediate: true
    },
  },
  methods: {
    handleCheck(o) {
      if (o.checked) {
        o.checked = false;
        const i = this.checkedClusters.findIndex((c) => c === o.value);

        if (i > -1) {
          this.checkedClusters.splice(i, 1);
        }
      } else {
        o.checked = true;
        this.checkedClusters.push(o.value);
      }
      this.$emit('update:modelValue', [...this.checkedClusters]);
    },
    handleRemove(c, i) {
      this.checkedClusters.splice(i, 1);
      const option = this.clusterOptions.find((o) => o.value === c);

      if (option) {
        option.checked = false;
      }
      this.$emit('update:modelValue', [...this.checkedClusters]);
    },
    handleRemoveMissingCluster(c, i) {
      this.missingClusters.splice(i, 1);
    },
    handleClusterGroupClick(g) {
      const targetClusters = g.raw.targetClusters.map((c) => {
        return c.metadata.name;
      });
      const targets = new Set(targetClusters);

      this.clusterGroupOptions = this.clusterGroupOptions.map((o) => ({
        ...o,
        checked: o.id === g.id,
      }));
      this.clusterOptions = this.clusterOptions.map((o) => ({
        ...o,
        checked: targets.has(o.value),
      }));
      this.checkedClusters = this.clusterOptions.filter((c) => targets.has(c.value))
        .map((c) => c.value);

      this.$emit('update:modelValue', [...this.checkedClusters]);
    },
    handleShow() {
      this.targetWidth = `${ (this.$refs.targetRef?.offsetWidth ?? 100) - 20 }px`;
    },
    getForm() {
      return [...this.checkedClusters, ...this.missingClusters];
    },
    getNameByValue(val) {
      return this.clusterOptions.find((o) => o.value === val)?.name || val;
    }
  }
};
</script>
<style scoped>
.cluster-select__tabs-nav {
  display: flex;
  gap: 8px;
}
.cluster-select_disabled {
  color: var(--input-disabled-text) !important;
  background-color: var(--input-disabled-bg) !important;
  outline-width: 0 !important;
  border-color: var(--input-disabled-border) !important;
}
.cluster-select__content {
  background-color: var(--input-bg);
  border-radius: var(--border-radius);
  border: solid var(--border-width) var(--input-border);
  color: var(--input-text);
  min-height: 78px;
  min-width: 75px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'label label'
                       'target arraw';
}
.cluster-select__selected-items {
  grid-area: target;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cluster-select__selected-item {
  border-radius: var(--border-radius);
  border: solid var(--border-width) var(--input-border);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 5px;
}
.cluster-select__selected-item i {
  cursor: pointer;
}
.cluster-select__arraw {
  grid-area: arraw;
}
.cluster-select__content > label {
  color: var(--input-label);
  grid-area: label;
}
.cluster-select__content .required {
  color: var(--error);
}
.cluster-select__dropdown-content {
  display: grid;
  gap: 8px;
}
.cluster-select__option-item {
  display: grid;
  grid-template-columns: 1fr auto;
  cursor: pointer;
  padding: 10px 10px;

}
.cluster-select__option-item:hover{
  color: var(--dropdown-hover-text);
  background: var(--dropdown-hover-bg);
}
</style>
