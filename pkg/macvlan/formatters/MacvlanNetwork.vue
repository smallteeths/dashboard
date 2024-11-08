<script>
import { mapGetters } from 'vuex';

export default {
  props: {
    value: {
      type:    [String, Array, Object],
      default: ''
    },
    row: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  data() {
    return {};
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    networks() {
      const out = [];

      if (this.row?.spec?.ranges?.length > 0) {
        const ipRanges = {
          key:   'ipRanges',
          label: this.t('macvlan.tableHeaders.ipRange'),
          value: this.row.spec.ranges.map((range) => {
            return `${ range.rangeStart ? range.rangeStart : range.from }-${ range.rangeEnd ? range.rangeEnd : range.to }`;
          }),
        };

        out.push(ipRanges);
      }

      if (this.row?.spec?.routes?.length > 0) {
        const ipRanges = {
          key:   'route',
          label: this.t('macvlan.tableHeaders.route'),
          value: this.row.spec.routes,
        };

        out.push(ipRanges);
      }

      let formattedTooltip = '<div>';

      (out || []).forEach((v) => {
        let content = [];

        if (v.key === 'ipRanges') {
          content = v.value?.map((ele) => {
            return `<div style='margin-top: 2px;'>${ ele }</div>`;
          });
        }

        formattedTooltip += `
        <div>
          <h4 style='margin: 5px 0px;'>${ v.label ? v.label : '' } ${ v.key === 'route' && v.value?.length ? v.value.length : '' }</h4>
          ${ content ? content?.join(' ') : '' }
        </div>`;
      });
      formattedTooltip += '</div>';

      return out?.length > 0 ? formattedTooltip : '';
    },
  }
};
</script>

<template>
  <div>
    <div>{{ value }}</div>
    <span
      v-if="networks"
      v-tooltip.bottom="networks"
      class="plus-more"
    >{{ t('macvlan.more') }}</span>
  </div>
</template>
