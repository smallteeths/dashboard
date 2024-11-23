import { SETTING } from '@shell/config/settings';
import { MANAGEMENT } from '@shell/config/types';
import throttle from 'lodash/throttle';
import { LOGGED_OUT } from '@shell/config/query-params';

const defaultEvents = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel'];

export default {
  data() {
    return {
      lastActive:      new Date().getTime(),
      autoLogoutTimer: null,
    };
  },

  computed: {
    uiSessionTimeout() {
      return parseInt(this.sessionLogoutMinutes, 10) * 1000 * 60;
    },
    sessionLogoutMinutes() {
      return this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.UI_SESSION_LOGOUT_MINUTES)?.value ?? 30;
    }
  },

  methods: {
    checkTimeout() {
      const now = new Date().getTime();

      if (now - this.lastActive < this.uiSessionTimeout) {
        return;
      }

      this.$store.dispatch('growl/warning', {
        title:   this.t('autoLogout.title'),
        message: this.t('autoLogout.message', { autoLogoutTime: this.sessionLogoutMinutes })
      }, { root: true });

      window.setTimeout(() => {
        this.$router.push({ name: 'auth-logout', query: { [LOGGED_OUT]: true } });
      }, 5000);
    },

    init() {
      this.autoLogoutTimer = window.setInterval(() => {
        this.checkTimeout();
      }, 60 * 1000);

      defaultEvents.forEach((e) => {
        window.document.addEventListener(e, this.resetLastActive);
      });
    },
    resetLastActive: throttle(function() {
      this.lastActive = new Date().getTime();
    }, 250, { leading: true })
  },

  mounted() {
    this.init();
  },
  beforeUnmount() {
    if (this.autoLogoutTimer) {
      window.clearInterval(this.autoLogoutTimer);
    }

    defaultEvents.forEach((e) => {
      window.document.removeEventListener(e, this.resetLastActive);
    });
  }
};
