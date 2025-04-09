import { NORMAN } from '@shell/config/types';

const OPERATOR_SETTINGS_BASE_URL = 'v1/management.cattle.io.operatorsettings';

export default async function(context) {
  const operatorSettings = await context.store.dispatch('management/request', {
    url:                  `${ OPERATOR_SETTINGS_BASE_URL }`,
    method:               'GET',
    headers:              { accept: 'application/json' },
    redirectUnauthorized: false,
  });

  console.log(operatorSettings);
}
