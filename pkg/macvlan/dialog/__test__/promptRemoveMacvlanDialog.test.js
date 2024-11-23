import { shallowMount } from '@vue/test-utils';
import promptRemoveDialog from '../promptRemoveDialog.vue';
import SortableTable from '@shell/components/SortableTable';
import { Card } from '@components/Card';

describe('component: macvlan', () => {
  it('should load the headers for the macvlan', () => {
    const headerKeys = ['subnet', 'namespace', 'podName', 'ip'];
    const resource = 'macvlan.cluster.cattle.io.macvlansubnet';
    const wrapper = shallowMount(promptRemoveDialog, {
      props:      { resources: [{ metadata: { name: 'test' } }] },
      components: { SortableTable, Card },
      global:     {
        mocks: {
          $store: {
            dispatch: () => jest.fn(),
            getters:  {
              'i18n/t':                     (t) => t,
              'management/byId':            () => jest.fn(),
              'prefs/get':                  () => resource,
              'resource-fetch/refreshFlag': () => jest.fn(),
            }
          },
          $fetchState: {
            pending: false, error: true, timestamp: Date.now()
          },
          $route: { params: { resource } },
        },
      }

    });

    expect(wrapper.vm.headers.map((item) => item.name)).toStrictEqual(headerKeys);
  });
});
