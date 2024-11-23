import { mount } from '@vue/test-utils';
import { Banner } from '@components/Banner';
import DownloadFileDialog from '@shell/dialog/DownloadFileDialog.vue';
import cleanHtml from '@shell/directives/clean-html';

describe('component: DownloadFileDialog', () => {
  it('should clear old error message after verifying the connection', async() => {
    const wrapper = mount(DownloadFileDialog, {

      slots: { title: '<h4 />' },
      props: {
        resources: [
          {
            id:       'test',
            metadata: { name: 'test' }
          }
        ]
      },

      global: {
        directives: { cleanHtml },
        mocks:      {
          $store: {
            dispatch: jest.fn(() => Promise.resolve({})),
            getters:  { 'i18n/t': jest.fn(), 'i18n/exists': (k) => k }
          }
        },
      }
    });

    await wrapper.setData({ errors: ['error'] });
    expect(wrapper.findComponent(Banner).props('label')).toStrictEqual('error');

    await wrapper.setData({ largeFileSize: true });

    expect(wrapper.findAllComponents(Banner)).toHaveLength(2);
  });
});
