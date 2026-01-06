import SteveModel from '@shell/plugins/steve/steve-class';

const BLANK_CLUSTER = '_';
const PRODUCT_NAME = 'globalMultiClusterService';

export default class ClusterSet extends SteveModel {
  get parentLocationOverride() {
    return {
      name:   `${ PRODUCT_NAME }-c-cluster-resource`,
      params: { cluster: BLANK_CLUSTER }
    };
  }

  get detailLocation() {
    return {
      ...this._detailLocation,
      name:   `${ PRODUCT_NAME }-c-cluster-resource-id`,
      params: { cluster: BLANK_CLUSTER, id: this.id }
    };
  }

  get canDelete() {
    const hasClusterKeys =
      this?.spec?.clusters && typeof this.spec.clusters === 'object' &&
      !Array.isArray(this.spec.clusters) &&
      Object.keys(this.spec.clusters).length > 0;

    return !hasClusterKeys;
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
    return true;
  }

  get canYaml() {
    return true;
  }
}
