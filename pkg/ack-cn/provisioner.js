import CruAck from './components/CruAck.vue';
import { mapDriver } from '@shell/store/plugins';
import { MANAGEMENT } from '@shell/config/types';

class AckProvisioner {
  static ID = 'ack';

  constructor(context) {
    this.context = context;
    mapDriver(this.id, 'azure');
  }

  get id() {
    return AckProvisioner.ID;
  }

  get icon() {
    return require('./icon.svg');
  }

  get group() {
    return 'kontainer';
  }

  get label() {
    return this.context.t('ackCn.label');
  }

  get component() {
    return CruAck;
  }

  get showImport() {
    return true;
  }

  get hidden() {
    const kontainerDriver = this.context.getters['management/byId'](MANAGEMENT.KONTAINER_DRIVER, 'azurekubernetesservice');

    return !kontainerDriver?.spec?.active;
  }

  get detailTabs() {
    return {
      machines:     false,
      logs:         false,
      registration: false,
      snapshots:    false,
      related:      true,
      events:       false,
      conditions:   false,
    };
  }
}

export { AckProvisioner };
