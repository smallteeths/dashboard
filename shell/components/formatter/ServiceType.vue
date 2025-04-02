<script>
import { DEFAULT_SERVICE_TYPES } from '@shell/models/service';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    },
    row: {
      type:     Object,
      required: true
    },
    col: {
      type:    Object,
      default: () => {}
    },
  },

  computed: {
    translated() {
      const value = this.value;
      const row = this.row;
      let cloned = value.toLocaleLowerCase();

      if (value === 'ClusterIP' && row?.spec?.clusterIP === 'None') {
        if (row?.metadata?.annotations?.['field.cattle.io/ipAddresses']) {
          cloned = 'externalip';
        } else {
          cloned = 'headless';
        }
      }

      return this.getLabel(cloned);
    },
    clusterIp() {
      return this.row?.spec?.clusterIP;
    },
    headless() {
      const value = this.value;
      const row = this.row;
      const clusterIp = this.clusterIp;

      if (value === 'ClusterIP' && clusterIp === 'None') {
        if (row?.metadata?.annotations?.['field.cattle.io/ipAddresses']) {
          return undefined;
        } else {
          return this.getLabel('headless');
        }
      }

      return undefined;
    }
  },

  methods: {
    getLabel(type) {
      const match = DEFAULT_SERVICE_TYPES.find((s) => s.id.toLowerCase() === type);
      const translationLabel = match?.label;
      let translated;

      if (translationLabel && this.$store.getters['i18n/exists'](translationLabel)) {
        translated = this.$store.getters['i18n/t'](translationLabel);
      } else {
        translated = this.value;
      }

      return translated;
    }
  }
};
</script>

<template>
  <span>{{ translated }}{{ headless ? ` (${headless})` : '' }}</span>
</template>
