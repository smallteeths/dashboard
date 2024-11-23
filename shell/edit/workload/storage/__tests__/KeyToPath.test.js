import { shallowMount } from '@vue/test-utils';
import KeyToPath from '@shell/edit/workload/storage/KeyToPath.vue';
import cleanTooltip from '@shell/directives/clean-tooltip';
describe('index.vue', () => {
  it('should render correctly with pod volume tips', () => {
    const wrapper = shallowMount(KeyToPath, {
      props: {
        value: {
          secret: {
            items: [
              {
                key:  '',
                path: '',
                mode: null,
              }]
          }
        },
        savePvcHookName: 'test',
      },
      global: {
        directives: { cleanTooltip },
        stubs:      {
          LabeledInput: true, LabeledSelect: true, RadioGroup: { template: '<div><slot /></div>' }
        },
        mocks: { $store: { getters: { 'i18n/t': () => {} } } },
      }

    });

    expect(wrapper.findAll('[data-test="tips"]')).toHaveLength(1);
  });
});
