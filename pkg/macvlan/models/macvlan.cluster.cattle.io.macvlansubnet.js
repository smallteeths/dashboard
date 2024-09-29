import SteveModel from '@shell/plugins/steve/steve-class';

export default class extends SteveModel {
  promptRemove(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'promptRemoveDialog'
    });
  }

  get doneRoute() {
    return this.listLocation.name;
  }
}
