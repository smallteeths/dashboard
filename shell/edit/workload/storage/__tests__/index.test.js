import { shallowMount } from '@vue/test-utils';
import Index from '@shell/edit/workload/storage/index.vue';
describe('index.vue', () => {
  it('should render correctly with pod volume tips', () => {
    const t = jest.fn();

    shallowMount(Index, {
      props: {
        value:           {},
        savePvcHookName: 'test',
      },
      global: {
        stubs: {
          ArrayListGrouped: true, ButtonDropdown: true, Mount: true, CodeMirror: true, Banner: { template: '<div><slot /></div>' }
        },
        mocks: { t },
      }

    });

    expect(t.mock.calls[0][0]).toBe('workload.storage.podVolumeTips');
  });
});
