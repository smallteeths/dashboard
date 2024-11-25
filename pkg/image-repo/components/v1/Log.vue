<template>
  <div
    v-loading="loading"
    class="Log"
  >
    <HarborTable
      ref="harborTableRef"
      search
      paging
      hideSelect
      :page="page"
      :loading="loading"
      :rows="rows"
      :columns="columns"
      :totalCount="totalCount"
      :subtractHeight="320"
      @page-change="pageChange"
      @input-search="inputSearch"
      @sort-change="sortChange"
    />
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import HarborTable from '@pkg/image-repo/components/table/HarborTable.vue';
import util from '../../mixins/util.js';
import loading from '../../plugin/loading';

export default {
  components: { HarborTable },
  mixins:     [util],
  props:      {
    apiRequest: {
      type:     Object,
      required: true
    },
    project: {
      type:    Object,
      default: () => {},
    }
  },
  data() {
    return {
      loading:     false,
      page:        1,
      page_size:   10,
      totalCount:  0,
      inputFilter: [],
      logs:        [],
      sortValue:   '',
    };
  },
  watch: {
    project: {
      immediate: true,
      async handler() {
        await this.fetchLogs();
      }
    }
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    columns() {
      return [
        {
          field:  'username',
          title:  this.t('harborConfig.table.username'),
          search: 'username',
          width:  160,
        },
        {
          field: 'repo_name',
          title: this.t('harborConfig.table.imagename'),
        },
        {
          field: 'repo_tag',
          title: this.t('harborConfig.table.tag'),
        },
        {
          field: 'operation',
          title: this.t('harborConfig.table.operation'),
        },
        {
          field: 'creation',
          title: this.t('harborConfig.table.timestamp'),
        },
      ];
    },
    rows() {
      return this.logs.map((d) => {
        return {
          ...d,
          creation: this.liveUpdate(d.op_time),
        };
      });
    },
  },
  methods: {
    async fetchLogs() {
      const params = {};

      if (this.project?.project_id) {
        if (this.inputFilter?.length > 0 ) {
          this.inputFilter.forEach((item) => {
            params[item.field] = item.value;
          });
        }
        if (this.sortValue !== '') {
          params.sort = this.sortValue;
        }
        this.loading = true;
        try {
          const logs = await this.apiRequest.fetchProjectLogs(this.project?.project_id, {
            page_size: this.page_size,
            page:      this.page,
            ...params
          });

          this.logs = logs?.length ? logs : [];
          this.totalCount = this.getTotalCount(logs) || 0;
          this.loading = false;
        } catch (e) {
          this.loading = false;
        }
      }
    },
    pageChange(record) {
      this.page = record;
      this.fetchLogs();
    },
    inputSearch(record) {
      this.page = 1;
      this.inputFilter = record;
      this.fetchLogs();
    },
    sortChange({ field, order }) {
      if (order) {
        if (order === 'desc') {
          field = `-${ field }`;
        }
        this.sortValue = field;
      } else {
        this.sortValue = '';
      }
      this.fetchLogs();
    },
  },
  directives: { loading }
};
</script>
