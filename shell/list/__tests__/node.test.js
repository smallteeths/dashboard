import Node from '@shell/list/node.vue';
import { COLUMN_BREAKPOINTS } from '@shell/types/store/type-map';
import {
  STATE, NAME, ROLES, VERSION, INTERNAL_EXTERNAL_IP, CPU, RAM, KUBE_NODE_OS
} from '@shell/config/table-headers';

const headers = [
  STATE,
  NAME,
  ROLES,
  VERSION,
  INTERNAL_EXTERNAL_IP,
  { ...KUBE_NODE_OS }, { ...CPU }, { ...RAM }];

describe('component: list/node', () => {
  it('should contains cpu and memory header', () => {
    const localThis = {
      canPaginate: false,
      canViewPods: false,
      COLUMN_BREAKPOINTS,
      $store:      { getters: { 'type-map/headersFor': () => headers } },
    };
    const a = ['cpu', 'ram'];
    const h = Node.computed.headers.call(localThis).filter((item) => a.includes(item.name));

    expect(h).toHaveLength(2);
    expect(h.find((item) => item.name === 'cpu').formatter).toBe('CpuUsage');
    expect(h.find((item) => item.name === 'ram').formatter).toBe('MemoryUsage');
  });
});
