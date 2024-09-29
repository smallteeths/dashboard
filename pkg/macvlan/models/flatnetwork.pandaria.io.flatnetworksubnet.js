import SteveModel from '@shell/plugins/steve/steve-class';
import { escapeHtml } from '@shell/utils/string';

export default class extends SteveModel {
  promptRemove(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'promptRemoveDialog'
    });
  }

  get groupByLabel() {
    const name = this.metadata.namespace;

    if (name) {
      return this.$rootGetters['i18n/t']('resourceTable.groupLabel.workspace', { name: escapeHtml(name) });
    } else {
      return this.$rootGetters['i18n/t']('resourceTable.groupLabel.notInAWorkspace');
    }
  }

  get doneRoute() {
    return this.listLocation.name;
  }
}
