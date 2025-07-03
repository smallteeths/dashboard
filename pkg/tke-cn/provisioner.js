import CruTke from './components/CruTke.vue';

class TkeProvisioner {
  static ID = 'tke';

  constructor(context) {
    this.context = context;
  }

  get id() {
    return TkeProvisioner.ID;
  }

  get icon() {
    return require('./icon.svg');
  }

  get group() {
    return 'kontainer';
  }

  get label() {
    return this.context.t('tkeCn.label');
  }

  get component() {
    return CruTke;
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

export { TkeProvisioner };
