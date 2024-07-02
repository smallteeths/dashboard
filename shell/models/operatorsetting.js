import Driver from '@shell/models/driver';

export default class OperatorSetting extends Driver {
  get doneRoute() {
    return 'c-cluster-manager-driver-operatorsetting';
  }

  get _availableActions() {
    const out = [
      {
        action:     'activate',
        bulkAction: 'activate',
        label:      'Activate',
        icon:       'icon icon-play',
        bulkable:   true,
        enabled:    !!this.links.update && !this.active
      },
      {
        action:     'deactivate',
        bulkAction: 'deactivate',
        label:      'Deactivate',
        icon:       'icon icon-pause',
        bulkable:   true,
        enabled:    !!this.links.update && !!this.active,
        weight:     -1
      },
      { divider: true },
      {
        action:  'viewInApi',
        enabled: true,
        icon:    'icon icon-external-link',
        label:   this.t('action.viewInApi'),
      },
      { divider: true },
      {
        action:   'goToEdit',
        label:    this.t('action.edit'),
        icon:     'icon icon-edit',
        bulkable: false,
        enabled:  !!this.links.update && !this.builtin,
      },
      {
        action:     'promptRemove',
        altAction:  'remove',
        bulkAction: 'promptRemove',
        label:      this.t('action.remove'),
        bulkable:   true,
        icon:       'icon icon-delete',
        enabled:    !!this.links.remove,
        weight:     -10,
      }
    ];

    return out;
  }

  deactivate(record) {
    const urls = [];
    const names = [];

    if (record?.length > 0) {
      record.forEach((ele) => {
        urls.push(`v3/operatorsettings/${ escape(ele.id) }?action=deactivate`);
        names.push(ele.nameDisplay);
      });
    } else {
      urls.push(`v3/operatorsettings/${ escape(this.id) }?action=deactivate`);
      names.push(this.nameDisplay);
    }
    this.$dispatch('promptModal', {
      componentProps: {
        urls,
        name: names?.join(', '),
      },
      component: 'DeactivateOperatorSettingDialog'
    });
  }

  async activate(record) {
    const urls = [];

    if (record?.length > 0) {
      record.forEach((ele) => {
        urls.push(`v3/operatorsettings/${ escape(ele.id) }?action=activate`);
      });
    } else {
      urls.push(`v3/operatorsettings/${ escape(this.id) }?action=activate`);
    }

    for (const url of urls) {
      await this.$dispatch('rancher/request', {
        url,
        method: 'post',
      }, { root: true });
    }
  }
}
