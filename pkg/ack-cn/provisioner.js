import CruAck from './components/CruAck.vue';

class AckProvisioner {
  static ID = 'ack';

  constructor(context) {
    this.context = context;
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
    return false;
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
