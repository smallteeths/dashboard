import { mount } from '@vue/test-utils';
import PrivateRegistry from '@shell/edit/provisioning.cattle.io.cluster/PrivateRegistry.vue';
import { LabeledInput } from '@components/Form/LabeledInput';

describe('component: PrivateRegistry', () => {
  it('should change spec.systemDefaultRegistry prop', async() => {
    const wrapper = mount(PrivateRegistry, {
      props: {
        mode:  'create',
        value: { spec: { systemDefaultRegistry: '' } }
      },
      global: { stubs: { Tab: { template: '<div><slot></slot></div>' } } }

    });
    const input = wrapper.findComponent(LabeledInput);

    input.find('input').trigger('input', 'exemple.com');
    await wrapper.vm.$nextTick();
    setTimeout(() => {
      expect(wrapper.props('value')).toStrictEqual({ spec: { systemDefaultRegistry: 'exemple.com' } });
    }, 300);
  });
});
