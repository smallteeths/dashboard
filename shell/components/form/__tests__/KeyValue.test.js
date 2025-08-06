import { shallowMount } from '@vue/test-utils';
import KeyValue from '@shell/components/form/KeyValue.vue';

describe('component: shell/form/KeyValue', () => {
  it('should contain protipValue prop', () => {
    const tip = 'test value protip';
    const wrapper = shallowMount(KeyValue, { propsData: { protipValue: tip } });

    expect(wrapper.props().protipValue).toBe(tip);
  });
});
