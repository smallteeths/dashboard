import Index from '@shell/pages/c/_cluster/apps/charts/index.vue';

describe('page: apps/charts/index.vue', () => {
  it('should call loadRepos and loadRepoCharts', async() => {
    const loadReposMock = jest.fn(() => Promise.resolve());
    const loadRepoChartsMock = jest.fn(() => Promise.resolve());

    const localThis = {
      $store:         { dispatch: loadReposMock },
      loadRepoCharts: loadRepoChartsMock,
      areAllEnabled:  jest.fn(),
      $route:         { query: {} }
    };

    await Index.fetch.call(localThis);
    expect(loadReposMock).toHaveBeenCalledWith('catalog/loadRepos');
    expect(loadRepoChartsMock).toHaveBeenCalledWith();
  });
});