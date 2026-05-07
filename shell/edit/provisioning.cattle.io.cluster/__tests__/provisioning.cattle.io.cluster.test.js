import Index from '@shell/edit/provisioning.cattle.io.cluster/index.vue';
jest.mock('@shell/edit/provisioning.cattle.io.cluster/shared', () => ({ INGRESS_NONE: 'none' }));

describe('computed: groupedSubTypes', () => {
  const testCases = [
    ['aliyun', 0],
    ['tencenttke', 0],
    ['huaweicce', 0],
    ['other', 1],
  ];

  it.each(testCases)('should be filtered out aliyun&tencenttke&huaweicce', (id, value) => {
    const localThis = {
      filteredSubTypes: [
        { id },
      ],
      $store: {
        getters:  { 'i18n/withFallback': (key) => key },
        dispatch: (key) => {
          return new Promise((resolve, reject) => {
            const store = {
              'catalog/load':       (key) => key,
              'rancher/find':       (key) => key,
              'management/findAll': (key) => key,
            };

            if (store[key]) {
              return resolve(store[key]());
            }
          });
        },
      },
    };

    expect(Index.computed.groupedSubTypes.call(localThis)).toHaveLength(value);
  });
});
