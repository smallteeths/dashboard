import { GITHUB_NONCE, GITHUB_REDIRECT, GITHUB_SCOPE } from '@shell/config/query-params';
import { MANAGEMENT, NORMAN } from '@shell/config/types';
import { _MULTI } from '@shell/plugins/dashboard-store/actions';
import { addObjects, findBy } from '@shell/utils/array';
import { openAuthPopup, returnTo, thirdAuthLogout } from '@shell/utils/auth';
import { base64Encode } from '@shell/utils/crypto';
import { removeEmberPage } from '@shell/utils/ember-page';
import { randomStr } from '@shell/utils/string';
import { addParams, parse as parseUrl, removeParam } from '@shell/utils/url';

export const BASE_SCOPES = {
  github:       ['read:org'],
  googleoauth:  ['openid profile email'],
  azuread:      [],
  keycloakoidc: ['openid profile email']
};

const KEY = 'rc_nonce';

const ERR_NONCE = 'nonce';

export const LOGIN_ERRORS = {
  CLIENT:              'client',
  CLIENT_UNAUTHORIZED: 'client_unauthorized',
  SERVER:              'server'
};

export const state = function() {
  return {
    fromHeader:  null,
    hasAuth:     null,
    loggedIn:    false,
    principalId: null,
    v3User:      null,
    initialPass: null,
    me:          null,
    isAdmin:     false,

    isReadOnlyAdmin: false,
    loginCooldown:   0,
  };
};

export const getters = {
  fromHeader() {
    return state.fromHeader;
  },

  enabled(state) {
    return state.hasAuth;
  },

  loggedIn(state) {
    return state.loggedIn;
  },

  principalId(state) {
    return state.principalId;
  },

  v3User(state) {
    return state.v3User;
  },

  initialPass(state) {
    return state.initialPass;
  },

  isGithub(state) {
    return state.principalId && state.principalId.startsWith('github_user://');
  },

  me(state) {
    return state.me;
  },

  isAdmin(state) {
    return state.isAdmin;
  },

  isReadOnlyAdmin(state) {
    return state.isReadOnlyAdmin;
  },

  loginCooldown(state) {
    return state.loginCooldown;
  },
};

export const mutations = {
  gotHeader(state, fromHeader) {
    state.fromHeader = fromHeader;
  },

  gotUser(state, v3User) {
    // Always deference to avoid race condition when setting `mustChangePassword`
    state.v3User = { ...v3User };
    // do not modify reference, or you will lose reactive
    state.me = v3User;
  },

  hasAuth(state, hasAuth) {
    state.hasAuth = !!hasAuth;
  },

  loggedInAs(state, principalId) {
    state.loggedIn = true;
    state.principalId = principalId;

    this.$cookies.remove(KEY);
  },

  loggedOut(state) {
    // Note: plugin/norman/index watches for this mutation
    // to automatically disconnect subscribe sockets.

    state.loggedIn = false;
    state.principalId = null;
    state.v3User = null;
    state.initialPass = null;
    state.me = null;
    state.isReadOnlyAdmin = false;
  },

  initialPass(state, pass) {
    state.initialPass = pass;
  },

  setReadOnlyAdmin(state, isReadOnlyAdmin) {
    state.isReadOnlyAdmin = isReadOnlyAdmin;
  },

  setAdmin(state, isAdmin) {
    state.isAdmin = isAdmin;
  },

  setLoginCooldown(state, time) {
    state.loginCooldown = time;
  }
};

export const actions = {
  gotHeader({ commit }, fromHeader) {
    commit('gotHeader', fromHeader);
  },

  async getUser({ dispatch, commit, getters }) {
    if (getters.v3User) {
      return;
    }

    try {
      const user = await dispatch('rancher/findAll', {
        type: NORMAN.USER,
        opt:  {
          url:    '/v3/users',
          filter: { me: true },
          load:   _MULTI
        }
      }, { root: true });

      commit('gotUser', user?.[0]);
    } catch { }
  },

  gotUser({ commit }, user) {
    commit('gotUser', user);
  },

  setInitialPass({ commit }, pass) {
    commit('initialPass', pass);
  },

  getAuthProviders({ dispatch }) {
    return dispatch('rancher/findAll', {
      type: 'authProvider',
      opt:  { url: `/v3-public/authProviders`, watch: false }
    }, { root: true });
  },

  getAuthConfigs({ dispatch }) {
    return dispatch('rancher/findAll', {
      type: 'authConfig',
      opt:  { url: `/v3/authConfigs` }
    }, { root: true });
  },

  async getAuthProvider({ dispatch }, id) {
    const authProviders = await dispatch('getAuthProviders');

    return findBy(authProviders, 'id', id);
  },

  async getAuthConfig({ dispatch }, id) {
    const authConfigs = await dispatch('getAuthConfigs');

    return findBy(authConfigs, 'id', id);
  },

  /**
   * Create the basic json object used for the nonce (this includes the random nonce/state)
   */
  createNonce(ctx, opt) {
    const out = { nonce: randomStr(16), to: 'vue' };

    if ( opt.test ) {
      out.test = true;
    }

    if (opt.provider) {
      out.provider = opt.provider;
    }

    return out;
  },

  /**
   * Save nonce details. Information it contains will be used to validate auth requests/responses
   * Note - this may be structurally different than the nonce we encode and send
   */
  saveNonce(ctx, opt) {
    const strung = JSON.stringify(opt);

    this.$cookies.set(KEY, strung, {
      path:     '/',
      sameSite: true,
      secure:   true,
    });

    return strung;
  },

  /**
   * Convert the nonce into something we can send
   */
  encodeNonce(ctx, nonce) {
    const stringify = JSON.stringify(nonce);

    return base64Encode(stringify, 'url');
  },

  async redirectTo({ state, commit, dispatch }, opt = {}) {
    const provider = opt.provider;
    let redirectUrl = opt.redirectUrl;

    if ( !redirectUrl ) {
      const driver = await dispatch('getAuthProvider', provider);

      redirectUrl = driver.redirectUrl;
    }
    let returnToUrl = `${ window.location.origin }/verify-auth`;

    if (provider === 'azuread') {
      const params = { response_type: 'code', response_mode: 'query' };

      redirectUrl = addParams(redirectUrl, params );
      returnToUrl = `${ window.location.origin }/verify-auth-azure`;
    }

    // The base nonce that will be sent server way
    const baseNonce = opt.nonce || await dispatch('createNonce', opt);

    // Save a possibly expanded nonce
    await dispatch('saveNonce', opt.persistNonce || baseNonce);
    // Convert the base nonce in to something we can transmit
    const encodedNonce = await dispatch('encodeNonce', baseNonce);

    const fromQuery = unescape(parseUrl(redirectUrl).query?.[GITHUB_SCOPE] || '');
    const scopes = fromQuery.split(/[, ]+/).filter((x) => !!x);

    if (BASE_SCOPES[provider]) {
      addObjects(scopes, BASE_SCOPES[provider]);
    }

    if ( opt.scopes ) {
      addObjects(scopes, opt.scopes);
    }

    let url = removeParam(redirectUrl, GITHUB_SCOPE);

    const params = {
      [GITHUB_SCOPE]: scopes.join(opt.scopesJoinChar || ','), // Some providers won't accept comma separated scopes
      [GITHUB_NONCE]: encodedNonce
    };

    if (!url.includes(GITHUB_REDIRECT)) {
      params[GITHUB_REDIRECT] = returnToUrl;
    }

    url = addParams(url, params);

    if ( opt.redirect === false ) {
      return url;
    } else {
      window.location.href = url;
    }
  },

  verifyOAuth({ dispatch }, { nonce, code, provider }) {
    const expectJSON = this.$cookies.get(KEY, { parseJSON: false });
    let parsed;

    try {
      parsed = JSON.parse(expectJSON);
    } catch {
      return ERR_NONCE;
    }

    const expect = parsed.nonce;

    if ( !expect || expect !== nonce ) {
      return ERR_NONCE;
    }

    const body = { code };

    // If the request came with a pkce code ensure we also sent that in the verify
    if (parsed.pkceCodeVerifier) {
      body.code_verifier = parsed.pkceCodeVerifier;
    }

    return dispatch('login', {
      provider,
      body
    });
  },

  verifyCASAuth({ dispatch }, { ticket }) {
    return dispatch('login', {
      provider: 'cas',
      body:     { ticket }
    });
  },

  async test({ dispatch }, { provider, body }) {
    const driver = await dispatch('getAuthConfig', provider);

    try {
      // saml providers
      if (!!driver?.actions?.testAndEnable) {
        const finalRedirectUrl = returnTo({ config: provider }, this);

        const res = await driver.doAction('testAndEnable', { finalRedirectUrl });

        const { idpRedirectUrl } = res;

        return openAuthPopup(idpRedirectUrl, provider);
      } else {
      // github, google, azuread, oidc
        const res = await driver.doAction('configureTest', body);
        const { redirectUrl } = res;

        const url = await dispatch('redirectTo', {
          provider,
          redirectUrl,
          test:     true,
          redirect: false
        });

        return openAuthPopup(url, provider);
      }
    } catch (err) {
      return Promise.reject(err);
    }
  },

  async login({ commit, dispatch }, { provider, body }) {
    const driver = await dispatch('getAuthProvider', provider);

    try {
      const res = await driver.doAction('login', {
        description:  'UI session',
        responseType: 'cookie',
        ...body
      }, { redirectUnauthorized: false });

      commit('setLoginCooldown', 0);

      try {
        const harborServerUrlSetting = await dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-server-url' }, { root: true });

        if (harborServerUrlSetting?.value) {
          const user = await dispatch('rancher/findAll', {
            type: NORMAN.USER,
            opt:  {
              url:    '/v3/users',
              filter: { me: true },
              load:   _MULTI
            }
          }, { root: true });

          if (user?.length > 0 && user[0]?.id) {
            await dispatch('rancher/request', {
              url:    `/v1/management.cattle.io.users/${ user[0]?.id }?action=harbor`,
              method: 'post',
              data:   {
                ...body,
                provider,
                actionName: 'syncharboruser',
              },
            }, { root: true });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(error);
      }

      return res;
    } catch (err) {
      const loginCooldown = err._headers?.['x-pandaria-login-cooldown'];

      if (loginCooldown) {
        commit('setLoginCooldown', parseInt(loginCooldown, 10));
      }

      if (err._status === 401) {
        return Promise.reject(LOGIN_ERRORS.CLIENT_UNAUTHORIZED);
      } else if (err.message) {
        return Promise.reject(err.message);
      } else if ( err._status >= 400 && err._status <= 499 ) {
        return Promise.reject(LOGIN_ERRORS.CLIENT);
      }

      return Promise.reject(LOGIN_ERRORS.SERVER);
    }
  },

  async logout({ dispatch, commit }, payload) {
    if (payload?.provider) {
      try {
        const driver = await dispatch('getAuthProvider', payload.provider);

        if (driver?.logoutUrl) {
          await thirdAuthLogout(driver.logoutUrl);
        }
      } catch (e) {
      }
    }
    // Unload plugins - we will load again on login
    await this.$plugin.logout();

    try {
      await dispatch('rancher/request', {
        url:                  '/v3/tokens?action=logout',
        method:               'post',
        data:                 {},
        headers:              { 'Content-Type': 'application/json' },
        redirectUnauthorized: false,
      }, { root: true });
    } catch (e) {
    }

    removeEmberPage();

    commit('loggedOut');
    dispatch('onLogout', null, { root: true });
  }
};
