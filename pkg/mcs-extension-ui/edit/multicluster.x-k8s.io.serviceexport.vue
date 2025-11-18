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
    <Tabbed
      :side-tabs="true"
      default-tab="labels"
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
    </Tabbed>
  </CruResource>
</template>

<script>
import CruResource from '@shell/components/CruResource';
import Labels from '@shell/components/form/Labels';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Loading from '@shell/components/Loading';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
export default {
  components: {
    Loading, NameNsDescription, Labels, Tabbed, Tab, CruResource
  },
  mixins:       [CreateEditView],
  inheritAttrs: false,
  emits:        ['input'],
  computed:     {
    doneLocationOverride() {
      return this.value.listLocation;
    },
  }
};
</script>
