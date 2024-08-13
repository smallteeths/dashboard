import AESEncrypt from '@shell/utils/aes-encrypt';
import { MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';

export const harborAPI = (spec = { harborVersion: '', harborServer: '' }) => {
  let { harborVersion, harborServer, store } = spec;
  let baseUrl = '';
  const request = {};
  const checkBaseUrl = () => {
    if (!baseUrl) {
      throw new Error('Base URL Can Not Be Empty');
    }
  };

  const factoryNewPromise = async(promise, interceptRequest) => {
    try {
      const resp = await promise;

      return resp;
    } catch (error) {
      // Uniformly intercept 500 errors
      if (interceptRequest) {
        // v1 error message
        if (error?.message) {
          const errMessage = error.message;

          store.dispatch('growl/warning', {
            title:   error?.code,
            message: errMessage
          }, { root: true });
        }
        // v2 error message
        if (error?.errors?.length > 0 && error.errors[0]) {
          const errMessage = error.errors[0];

          store.dispatch('growl/warning', {
            title:   errMessage?.code,
            message: errMessage?.message
          }, { root: true });
        }
      }
      throw error;
    }
  };

  const updateBaseUrl = () => {
    baseUrl = `/meta/harbor/${ harborServer.replace('//', '/').replace(/\/+$/, '') }/api${ harborVersion === 'v1' || !harborVersion ? '' : `/${ harborVersion }` }`;
  };

  if (harborVersion && harborServer) {
    updateBaseUrl();
  }

  const getBaseUrl = () => {
    return baseUrl;
  };

  const fetchHarborServerUrl = async() => {
    const setting = await store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-server-url' });

    const url = setting.value;

    harborServer = url;

    return setting;
  };

  const setHarborServer = (url) => {
    harborServer = url;
  };
  const setHarborVersion = (version) => {
    harborVersion = version;
  };

  const getHarborServerIp = () => {
    const harborServerArr = harborServer?.split('//');
    const harborServerIp = (harborServerArr?.length ? harborServerArr[1] : '').replace(/\/+$/, '');

    return harborServerIp;
  };

  const fetchHarborVersion = async() => {
    let setting;

    try {
      setting = await store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-version' });
    } catch (err) {
      setting = await store.dispatch('management/create', {
        type: MANAGEMENT.SETTING, value: '', metadata: { name: 'harbor-version' }
      }, { root: true });
    }

    return setting;
  };

  const fetchInsecureSkipVerify = async() => {
    let setting;

    try {
      setting = await store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-insecure-skip-verify' });
    } catch (err) {
      setting = await store.dispatch('management/create', {
        type: MANAGEMENT.SETTING, value: '', metadata: { name: 'harbor-insecure-skip-verify' }
      }, { root: true });
    }

    return setting;
  };

  const initAPIRequest = async(version, serverURL) => {
    const promises = [];

    if (!version) {
      promises.push(fetchHarborVersion());
    } else {
      setHarborVersion(version);
    }

    if (!serverURL) {
      promises.push(fetchHarborServerUrl());
    } else {
      setHarborServer(serverURL);
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
    updateBaseUrl();
  };

  const fetchSystemInfo = () => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/systeminfo`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const removeProjects = (projectIds) => {
    checkBaseUrl();
    const promises = projectIds.map((id) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ id }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const createProject = (project) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'POST',
      data:                 project,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const fetchProject = (id) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ id }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchAdminConfig = () => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/configurations`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const fetchHarborUserInfo = () => {
    return store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-admin-auth' });
  };

  const addWhitelist = async(ip) => {
    const setting = await store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'whitelist-domain' });

    const wl = setting.value.split(',');

    wl.push(ip);
    const value = [...new Set(wl)].join(',');

    setting.value = value;

    return setting.save();
  };

  const removeHarborAccount = async() => { // for store.getters['auth/isAdmin'] user
    checkBaseUrl();
    const [serverSetting, authSetting, authModeSetting, insecureSkipVerify] = await Promise.all([
      store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-server-url' }),
      store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-admin-auth' }),
      store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-auth-mode' }),
      store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-insecure-skip-verify' }),
    ]);
    let versionSetting;

    try {
      versionSetting = await store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-version' });
    } catch (err) {
      versionSetting = await store.dispatch('management/create', {
        type: MANAGEMENT.SETTING, value: '', metadata: { name: 'harbor-version' }
      }, { root: true });
    }

    serverSetting.value = '';
    authSetting.value = '';
    authModeSetting.value = '';
    versionSetting.value = '';
    insecureSkipVerify.value = 'false';

    return Promise.all([serverSetting.save(), authSetting.save(), authModeSetting.save(), versionSetting.save(), insecureSkipVerify.save()]);
  };

  const syncHarborAccount = (params) => {
    const data = { ...params };
    const disabledEncryption = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.DISABLE_PASSWORD_ENCRYPT);
    const p = data.password;

    if (p) {
      data.password = disabledEncryption?.value === 'true' ? p : AESEncrypt(p.trim());
    }
    const userId = store.getters['auth/me']?.id;

    return store.dispatch('management/request', {
      url:    `/v1/management.cattle.io.users/${ userId }?action=setharborauth`,
      method: 'POST',
      data,
    });
  };

  const testEmailServer = (config) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/email/ping`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'POST',
      data:                 config,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const updateAdminConfig = (config) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/configurations`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'PUT',
      data:                 config,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const fetchLabels = (param) => {
    checkBaseUrl();
    const p = Object.keys(param).map((k) => `${ k }=${ param[k] }`);
    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/labels?${ p.join('&') }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const updateLabel = (label) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/labels/${ label.id }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'PUT',
      data:                 label,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const createLabel = (label) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/labels`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'POST',
      data:                 label,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const removeLabels = (labelIds) => {
    checkBaseUrl();
    const promises = labelIds.map((id) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/labels/${ id }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const fetchSchedule = () => {
    checkBaseUrl();

    return store.dispatch('management/request', {
      url:                  `${ baseUrl }/system/gc/schedule`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });
  };

  const updateSchedule = (s) => {
    checkBaseUrl();

    return store.dispatch('management/request', {
      url:                  `${ baseUrl }/system/gc/schedule`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'PUT',
      data:                 s,
      redirectUnauthorized: false,
    });
  };

  const getProjectDetail = (id) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ id }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const fetchRepo = (param) => {
    checkBaseUrl();
    const p = Object.entries(param).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/repositories?${ p }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const deleteRepos = (names) => {
    checkBaseUrl();
    const promises = names.map((n) => {
      const params = n.split('/');

      if (params.length > 1) {
        const res = store.dispatch('management/request', {
          url:                  `${ baseUrl }/projects/${ params[0] }/repositories/${ params[1] }`,
          headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
          method:               'DELETE',
          redirectUnauthorized: false,
        });

        return factoryNewPromise(res, true);
      }

      return new Promise();
    });

    return Promise.all(promises);
  };

  const fetchTags = (projectId, name) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/repositories/${ name }/tags?detail=${ projectId }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const removeTags = (repo, tags) => {
    checkBaseUrl();
    const promises = tags.map((tag) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/repositories/${ repo }/tags/${ tag }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const removeTagsV2 = (project, repo, digests) => {
    checkBaseUrl();
    const repoName = repo.replace(`${ project }/`, '').replace('/', '%252F');

    const promises = digests.map((digest) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const addTagLabels = (repo, tag, labelIds) => {
    checkBaseUrl();

    return labelIds.map((labelId) => store.dispatch('management/request', {
      url:                  `${ baseUrl }/repositories/${ repo }/tags/${ tag }/labels`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'POST',
      data:                 { id: labelId },
      redirectUnauthorized: false,
    }));
  };

  const removeTagLabels = (repo, tag, labelIds) => {
    checkBaseUrl();
    const promises = labelIds.map((labelId) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/repositories/${ repo }/tags/${ tag }/labels/${ labelId }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const addTagLabelsV2 = (project, repo, digest, labels) => {
    const repoName = repo.replace(`${ project }/`, '').replace('/', '%252F');

    const promises = labels.map((label) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }/labels`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'POST',
        data:                 label,
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res);
    });

    return Promise.all(promises);
  };

  const removeTagLabelsV2 = (project, repo, digest, labelIds) => {
    const repoName = repo.replace(`${ project }/`, '').replace('/', '%252F');

    const promises = labelIds.map((id) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }/labels/${ id }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const setProjectPublic = (id, s) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ id }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'PUT',
      data:                 s,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const fetchProjectsAndImages = (q) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/search?q=${ encodeURIComponent(q) }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const addProjectUser = (params, id) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ id }/members`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'POST',
      data:                 params,
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const projectChangeRole = (id, memeberIds, params) => {
    checkBaseUrl();
    const promises = memeberIds.map((memeberId) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ id }/members/${ memeberId }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'PUT',
        data:                 params,
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res);
    });

    return Promise.all(promises);
  };

  const projectDeleteMemberRole = (id, memeberIds) => {
    checkBaseUrl();
    const promises = memeberIds.map((memeberId) => {
      const res = store.dispatch('management/request', {
        url:                  `${ baseUrl }/projects/${ id }/members/${ memeberId }`,
        headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
        method:               'DELETE',
        redirectUnauthorized: false,
      });

      return factoryNewPromise(res, true);
    });

    return Promise.all(promises);
  };

  const fetchProjects = (p) => {
    checkBaseUrl();
    const params = Object.entries(p).filter((p) => p[1] !== '').map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects?${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });
  };

  const fetchLogs = (p) => {
    checkBaseUrl();
    const params = Object.entries(p).filter((p) => p[1] !== '').map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return store.dispatch('management/request', {
      url:                  `${ baseUrl }/logs?${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });
  };

  const fetchLogsV2 = (p) => {
    const params = Object.entries(p).map((p) => {
      if (p[0] === 'page' || p[0] === 'page_size' ) {
        return `${ p[0] }=${ p[1] }`;
      } else {
        return `q=${ encodeURIComponent(`${ p[0] }%3D~${ p[1] }`) }`;
      }
    }).join('&');

    const res = store.dispatch('management/request', {
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      url:                  `${ baseUrl }/audit-logs?${ params }`,
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectSummary = (projectId) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectId }/summary`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectImages = (param) => {
    checkBaseUrl();
    const p = Object.entries(param).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/repositories?${ p }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectImagesV2 = (projectName, param) => {
    checkBaseUrl();
    const p = Object.entries(param).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectName }/repositories?${ p }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectMembersList = (projectId, p) => {
    checkBaseUrl();
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectId }/members?${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectLogs = (projectId, p) => {
    checkBaseUrl();
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectId }/logs?${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectLogsV2 = (projectId, p) => {
    const params = Object.entries(p).map((p) => {
      if (p[0] === 'page' || p[0] === 'page_size' ) {
        return `${ p[0] }=${ p[1] }`;
      } else {
        return `q=${ encodeURIComponent(`${ p[0] }%3D~${ p[1] }`) }`;
      }
    }).join('&');

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectId }/logs?${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const updateHarborPwd = (userId, params) => {
    const disabledEncryption = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.DISABLE_PASSWORD_ENCRYPT);
    const data = {
      ...params,
      newPassword: disabledEncryption?.value === 'true' ? params.newPassword : AESEncrypt(params.newPassword.trim()),
      oldPassword: disabledEncryption?.value === 'true' ? params.oldPassword : AESEncrypt(params.oldPassword.trim())
    };

    const res = store.dispatch('management/request', {
      url:     `/v1/management.cattle.io.users/${ userId }?action=updateharborauth`,
      headers: { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:  'POST',
      data
    });

    return factoryNewPromise(res);
  };
  const fetchCurrentHarborUser = () => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/users/current`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchProjectMembers = (projectId, entityName) => {
    checkBaseUrl();

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectId }/members?entityname=${ entityName }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const fetchImageTags = (projectName, repositoryName, p) => {
    checkBaseUrl();

    const params = Object.entries(p).map((p) => {
      if (p[0] === 'page' || p[0] === 'page_size' ) {
        return `${ p[0] }=${ p[1] }`;
      } else {
        return `q=${ encodeURIComponent(`${ p[0] }%3D~${ p[1] }`) }`;
      }
    }).join('&');
    const repoName = repositoryName.replace(`${ projectName }/`, '').replace('/', '%252F');
    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/projects/${ projectName }/repositories/${ repoName }/artifacts?with_tag=true&with_scan_overview=true&with_label=true&${ params }`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res, true);
  };

  const syncHarborUser = async(data) => {
    const url = await fetchHarborServerUrl();

    if (!url) {
      return;
    }

    const res = store.dispatch('management/request', {
      url:    `/v1/management.cattle.io.users?action=syncharboruser`,
      method: 'POST',
      data:   { ...data },
    });

    return factoryNewPromise(res);
  };

  const fetchSystemInfoToTest = (url, version) => {
    const baseUrl = `/meta/harbor/${ url.replace('//', '/').replace(/\/+$/, '') }/api${ version === 'v1' || !version ? '' : `/${ version }` }`;

    const res = store.dispatch('management/request', {
      url:                  `${ baseUrl }/systeminfo`,
      headers:              { 'X-API-Harbor-Admin-Header': store.getters['auth/isAdmin'] },
      method:               'GET',
      redirectUnauthorized: false,
    });

    return factoryNewPromise(res);
  };

  const saveHarborAccount = async(url, u, p, v, systeminfo = {}) => {
    const authMode = systeminfo.auth_mode;
    const disabledEncryption = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.DISABLE_PASSWORD_ENCRYPT);

    const serverSettingP = store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-server-url' });
    const authSettingP = store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-admin-auth' });
    const authModeSettingP = store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-auth-mode' });
    let versionSettingP;

    try {
      versionSettingP = store.dispatch('management/find', { type: MANAGEMENT.SETTING, id: 'harbor-version' });
    } catch (err) {
      versionSettingP = store.dispatch('management/create', {
        type: MANAGEMENT.SETTING, value: '', metadata: { name: 'harbor-version' }
      }, { root: true });
    }

    const [serverSetting,
      authSetting,
      authModeSetting,
      versionSetting
    ] = await Promise.all([
      serverSettingP,
      authSettingP,
      authModeSettingP,
      versionSettingP
    ]);

    await store.dispatch('management/request', {
      url:    `/v1/management.cattle.io.users?action=saveharborconfig`,
      method: 'POST',
      data:   {
        serverURL: url.replace(/\/+$/, ''),
        username:  u,
        password:  disabledEncryption?.value === 'true' ? p : AESEncrypt(p.trim()),
        version:   v,
      }
    });
    serverSetting.value = url.replace(/\/+$/, '');
    authSetting.value = u;
    versionSetting.value = v;
    authModeSetting.value = authMode;

    return Promise.all([serverSetting.save(), authSetting.save(), authModeSetting.save(), versionSetting.save()]);
  };

  request.factoryNewPromise = factoryNewPromise;
  request.checkBaseUrl = checkBaseUrl;
  request.fetchHarborServerUrl = fetchHarborServerUrl;
  request.fetchSystemInfo = fetchSystemInfo;
  request.removeProjects = removeProjects;
  request.createProject = createProject;
  request.fetchProject = fetchProject;
  request.fetchAdminConfig = fetchAdminConfig;
  request.fetchHarborUserInfo = fetchHarborUserInfo;
  request.addWhitelist = addWhitelist;
  request.removeHarborAccount = removeHarborAccount;
  request.syncHarborAccount = syncHarborAccount;
  request.testEmailServer = testEmailServer;
  request.updateAdminConfig = updateAdminConfig;
  request.fetchLabels = fetchLabels;
  request.updateLabel = updateLabel;
  request.createLabel = createLabel;
  request.removeLabels = removeLabels;
  request.fetchSchedule = fetchSchedule;
  request.updateSchedule = updateSchedule;
  request.getProjectDetail = getProjectDetail;
  request.fetchRepo = fetchRepo;
  request.fetchImageTags = fetchImageTags;
  request.deleteRepos = deleteRepos;
  request.fetchTags = fetchTags;
  request.removeTags = removeTags;
  request.removeTagsV2 = removeTagsV2;
  request.addTagLabels = addTagLabels;
  request.removeTagLabels = removeTagLabels;
  request.addTagLabelsV2 = addTagLabelsV2;
  request.removeTagLabelsV2 = removeTagLabelsV2;
  request.setProjectPublic = setProjectPublic;
  request.fetchProjectsAndImages = fetchProjectsAndImages;
  request.addProjectUser = addProjectUser;
  request.projectChangeRole = projectChangeRole;
  request.projectDeleteMemberRole = projectDeleteMemberRole;
  request.fetchProjects = fetchProjects;
  request.fetchLogs = fetchLogs;
  request.fetchLogsV2 = fetchLogsV2;
  request.fetchProjectSummary = fetchProjectSummary;
  request.fetchProjectImages = fetchProjectImages;
  request.fetchProjectImagesV2 = fetchProjectImagesV2;
  request.fetchProjectMembersList = fetchProjectMembersList;
  request.fetchProjectLogs = fetchProjectLogs;
  request.fetchProjectLogsV2 = fetchProjectLogsV2;
  request.updateHarborPwd = updateHarborPwd;
  request.fetchCurrentHarborUser = fetchCurrentHarborUser;
  request.fetchHarborVersion = fetchHarborVersion;
  request.fetchProjectMembers = fetchProjectMembers;
  request.syncHarborUser = syncHarborUser;
  request.fetchSystemInfoToTest = fetchSystemInfoToTest;
  request.saveHarborAccount = saveHarborAccount;
  request.setHarborServer = setHarborServer;
  request.setHarborVersion = setHarborVersion;
  request.initAPIRequest = initAPIRequest;
  request.fetchInsecureSkipVerify = fetchInsecureSkipVerify;
  request.getBaseUrl = getBaseUrl;
  request.updateBaseUrl = updateBaseUrl;
  request.getHarborServerIp = getHarborServerIp;

  return request;
};
