import SteveModel from '@shell/plugins/steve/steve-class';

export default class ClusterSet extends SteveModel {
  get canDelete() {
    return false;
  }

  get canClone() {
    return false;
  }

  get canUpdate() {
    return false;
  }

  get canCustomEdit() {
    return false;
  }

  get canEditYaml() {
    return false;
  }

  get canYaml() {
    return false;
  }
}
