import Masthead from '@shell/components/ResourceDetail/Masthead.vue';
import { mount } from '@vue/test-utils';

describe('test navlink name nowrap', () => {
  it('should have name-display class', () => {
    const wrapper = mount(Masthead, {
      stubs: { 'nuxt-link': true },
      mocks: {
        $store: {
          getters: {
            currentStore:          () => 'cluster',
            'cluster/schemaFor':   () => ({ id: 'ui.cattle.io.navlink', name: 'navlink' }),
            'type-map/labelFor':   () => 'navlink',
            'type-map/optionsFor': () => {},
            'i18n/t':              (t) => t,
            'i18n/withFallback':   jest.fn((key, args, fallback) => fallback),
            currentProduct:        { name: 'explorer' }
          }
        }
      }
    });

    const inputWraps = wrapper.findAll('[class="mastehead-resource-title"]');

    expect(inputWraps).toHaveLength(1);
  });
});
