import MacvlanSubnet from '../macvlan.cluster.cattle.io.macvlansubnet.vue';
import { mount } from '@vue/test-utils';
import { _CREATE } from '@shell/config/query-params';
import cleanHtml from '@shell/directives/clean-html';
import cleanTooltip from '@shell/directives/clean-tooltip';

const emptyForm = {
  apiVersion: 'macvlan.cluster.cattle.io/v1',
  kind:       'MacvlanSubnet',
  metadata:   {
    name:      '',
    namespace: 'kube-system',
    labels:    { project: '' },
  },
  spec: {
    master:            '',
    vlan:              0,
    cidr:              '',
    mode:              'bridge',
    gateway:           '',
    ranges:            [],
    routes:            [],
    podDefaultGateway: {
      enable:      false,
      serviceCidr: ''
    }
  }
};

describe('macvlansubnet: edit', () => {
  it('should have input and select', () => {
    const wrapper = mount(MacvlanSubnet, {
      props:  { mode: _CREATE, value: {} },
      global: {
        directives: { cleanHtml, cleanTooltip },
        mocks:      {
          $router: { currentRoute: {}, replace: () => jest.fn() },
          $route:  { query: {}, hash: '#labels' },
          $store:  {
            getters: {
              'cluster/all':                () => [],
              'i18n/exists':                (key) => key,
              currentStore:                 () => 'cluster',
              'cluster/schemaFor':          () => ({ id: 'macvlan', name: 'macvlan' }),
              'i18n/t':                     (t) => t,
              'resource-fetch/refreshFlag': () => jest.fn(),
              'macvlan/emptyForm':          emptyForm,
              'management/all':             () => [],
              currentProduct:               { name: 'explorer' }
            },
            dispatch: jest.fn()
          },
        },
        stubs: {
          CruResource: { template: '<div><slot /></div>' },
          Tabbed:      { template: '<div><slot /></div>' },
          Tab:         { template: '<div><slot /></div>' }
        }
      },

    });

    const selectWraps = wrapper.findAll('.labeled-select');
    const inputWraps = wrapper.findAll('.labeled-input');

    expect(selectWraps).toHaveLength(2);
    expect(inputWraps).toHaveLength(7);
  });
});
