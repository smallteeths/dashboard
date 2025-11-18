<template>
  <Loading v-if="$fetchState.pending" />
  <CruResource
    v-else
    :done-route="doneLocationOverride.name"
    :mode="mode"
    :resource="value"
    :subtypes="[]"
    :validation-passed="true"
    :errors="errors"
    :apply-hooks="applyHooks"
    @error="e=>errors = e"
    @finish="save"
    @cancel="done"
  >
    <NameNsDescription
      v-if="!isView"
      :value="value"
      :namespaced="true"
      :mode="mode"
    />
    <ResourceTabs
      :value="value"
      :mode="mode"
      @input="$emit('input', $event)"
    >
      <Tab
        name="labels"
        label-key="generic.labelsAndAnnotations"
        :weight="-1"
      >
        <Labels
          :value="value"
          :mode="mode"
          @update:value="$emit('input', $event)"
        />
      </Tab>
    </ResourceTabs>
  </CruResource>
</template>
<script>
import CruResource from '@shell/components/CruResource';
import Labels from '@shell/components/form/Labels';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import ResourceTabs from '@shell/components/form/ResourceTabs';
import Loading from '@shell/components/Loading';
import Tab from '@shell/components/Tabbed/Tab';
import { _CREATE } from '@shell/config/query-params';
import CreateEditView from '@shell/mixins/create-edit-view';

export default {
  components: {
    Loading, NameNsDescription, Labels, ResourceTabs, Tab, CruResource
  },
  mixins:       [CreateEditView],
  inheritAttrs: false,
  emits:        ['input'],
  computed:     {
    isCreate() {
      return this.mode === _CREATE;
    },
    doneLocationOverride() {
      return this.value.listLocation;
    },
  },
};
</script>
<style scoped>
</style>
