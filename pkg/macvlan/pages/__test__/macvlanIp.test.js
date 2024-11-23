import MacvlanIp from '../macvlanIp.vue';

describe('component: macvlan', () => {
  it('should load the headers for the macvlanIp', () => {
    const headerKeys = ['name', 'subnet', 'namespace', 'address', 'ipType', 'mac', 'podId', 'workload'];

    expect(MacvlanIp.computed.headers.call().map((item) => item.name)).toStrictEqual(headerKeys);
  });

  it('methods: get workload name1 normal', () => {
    const localThis = { disabledEncryption: { value: 'true' } };
    const metadata = {
      labels: { 'workload.user.cattle.io/workloadselector': 'apps.deployment-default-test' },
      name:   'test-6fc968cc8b-4sphl',
    };

    const workloadName = MacvlanIp.methods.getWorkloadName.call(
      localThis,
      metadata.name,
      metadata.labels['workload.user.cattle.io/workloadselector']
    );

    expect(workloadName).toBe('test');
  });

  it('methods: get workload name2', () => {
    const localThis = { disabledEncryption: { value: 'true' } };
    const metadata = {
      name:   '',
      labels: { 'workload.user.cattle.io/workloadselector': 'apps.deployment-default-test' }
    };

    const workloadName = MacvlanIp.methods.getWorkloadName.call(
      localThis,
      metadata.name,
      metadata.labels['workload.user.cattle.io/workloadselector']
    );

    expect(workloadName).toBe('');
  });

  it('methods: get workload name3', () => {
    const localThis = { disabledEncryption: { value: 'true' } };
    const metadata = {
      name:   'apps-default-test-11234',
      labels: { 'workload.user.cattle.io/workloadselector': 'apps-default-test' }
    };

    const workloadName = MacvlanIp.methods.getWorkloadName.call(
      localThis,
      metadata.name,
      metadata.labels['workload.user.cattle.io/workloadselector']
    );

    expect(workloadName).toBe('apps-default-test');
  });
});
