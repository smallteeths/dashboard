import User from '@shell/edit/management.cattle.io.user.vue';
import AESEncrypt from '@shell/utils/aes-encrypt';

jest.mock('@shell/utils/aes-encrypt', () => {
  return {
    __esModule: true,
    default:    jest.fn()
  };
});
jest.mock('@shell/utils/clipboard', () => {
  return { copyTextToClipboard: jest.fn(() => Promise.resolve({})) };
});

describe('edit: management.cattle.io.user', () => {
  it('shold not encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'true' })) } } };

    User.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledTimes(0);
  });
  it('shold encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'false' })) } } };

    User.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledWith('test');
  });
});
