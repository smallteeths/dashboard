
import Aliyunecs from '@shell/machine-config/aliyunecs.vue';
import { getters } from '@shell/store/aliyun.js';
import { mount } from '@vue/test-utils';
import cleanHtml from '@shell/directives/clean-html';
import cleanTooltip from '@shell/directives/clean-tooltip';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import UnitInput from '@shell/components/form/UnitInput';

describe('component: aliyunecs', () => {
  it('should have input and select', () => {
    const wrapper = mount(Aliyunecs, {

      props: {
        uuid:         '1234',
        credentialId: 'credentialId',
        cluster:      {},
        value:        { systemDiskSize: '' },
      },
      data() {
        return { systemDiskSize: '', defaultValue: getters.defaultValue() };
      },
      global: {
        stubs:      { portal: true },
        directives: { cleanTooltip, cleanHtml },
        mocks:      {
          $fetchState: {
            pending: false, error: true, timestamp: Date.now()
          },
          $route: { query: {}, hash: '#labels' },
          $store: {
            dispatch: () => jest.fn(),
            getters:  {
              'aliyun/defaultValue': getters.defaultValue(),
              'i18n/t':              (t) => t,
            }
          }
        }
      },

    });

    const selectWraps = wrapper.findAllComponents(LabeledSelect);
    const inputWraps = wrapper.findAllComponents(UnitInput);

    expect(selectWraps).toHaveLength(11);
    expect(inputWraps).toHaveLength(2);
  });
});
