import Service from '@shell/edit/service.vue';
import { CLUSTERIP, EXTERNALIP } from '@shell/models/service';
import { shallowMount } from '@vue/test-utils';

describe('edit: service', () => {
  it('should return the correct value for the computed prop isExternalIP', () => {
    const localThis1 = {
      value: {
        spec: {
          type:      CLUSTERIP,
          clusterIP: 'None'
        },
        metadata: { annotations: { 'field.cattle.io/ipAddresses': '["10.1.1.2"]' } }
      }
    };

    expect(!!Service.computed.isExternalIP.call(localThis1)).toBe(true);

    const localThis2 = { selectedServiceType: EXTERNALIP };

    expect(Service.computed.isExternalIP.call(localThis2)).toBe(true);
  });

  it('should contain external ip address form', () => {
    const wrapper = shallowMount(Service, {
      props: {
        value: {
          spec: {
            type:      CLUSTERIP,
            clusterIP: 'None'
          },
          metadata: { annotations: { 'field.cattle.io/ipAddresses': '["10.1.1.2"]' } }
        }
      },
      global: {
        directives: { cleanHtml: jest.fn() },
        stubs:      {
          NameNsDescription: true, CruResource: { template: '<div><slot /></div>' }, Tabbed: { template: '<div><slot /></div>' }, Tab: { template: '<div><slot /></div>' }
        },
        mocks: {
          $route: { name: 'test', query: {} },
          $store: {
            getters: {
              'management/all':    jest.fn(() => []),
              'i18n/t':            jest.fn(),
              currentStore:        jest.fn(() => 'cluster'),
              'cluster/schemaFor': jest.fn()
            },

          }
        },

      }
    });

    expect(wrapper.find('[data-test="external-ips-new"]').exists()).toBe(true);
  });
});
