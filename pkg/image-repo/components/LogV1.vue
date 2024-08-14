<template>
  <div>
    <div class="title">
      <t k="harborConfig.log" />
    </div>
    <div
      v-if="harborServerError"
      class="ml-10 mt-10"
    >
      {{ t('harborConfig.errorInfo') }}
    </div>
    <HarborTable
      v-else
      search
      paging
      hideSelect
      :page="page"
      :loading="loading"
      :rows="rows"
      :columns="columns"
      :total-count="totalCount"
      :defaultSelectOption="defaultSelectOption"
      :enableFrontendPagination="false"
      :subtractHeight="262"
      @input-search="inputSearch"
      @page-change="pageChange"
    >
      <select
        v-model="extraSearchFields"
      >
        <option
          v-for="t in defaultSelectOption"
          :key="t.label"
          :value="t.value"
        >
          {{ t.label }}
        </option>
      </select>
      <template #name="{row}">
        <LabelItem
          :color="row.color"
          :global="true"
          :label-colors="labelColors"
        >
          {{ row.name }}
        </LabelItem>
      </template>
      <template #creation_time="{row}">
        {{ row.creation }}
      </template>
    </HarborTable>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import HarborTable from '@pkg/image-repo/components/table/HarborTable.vue';
import util from '../mixins/util.js';

export default {
  components: { HarborTable },
  mixins:     [util],
  props:      {
    apiRequest: {
      type:     Object,
      required: true
    },
    projectId: {
      type:    Number,
      default: -1
    }
  },

  data() {
    return {
      errors:            [],
      loading:           false,
      data:              [],
      inputFilter:       [],
      sort:              '',
      totalCount:        0,
      page:              1,
      page_size:         10,
      extraSearchFields: 'username',
      harborServerError: false,
    };
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
          field: 'op_time',
          title: this.t('harborConfig.table.timestamp'),
        },
      ];
    },
    params() {
      const filter = this.inputFilter.reduce((t, c) => {
        t[c.field] = c.value;

        return t;
      }, {});

      return filter;
    },
    defaultSelectOption() {
      return [
        {
          label: this.t('harborConfig.form.search.username'),
          value: 'username',
        },
        {
          label: this.t('harborConfig.form.search.store'),
          value: 'repository',
        },
        {
          label: this.t('harborConfig.form.search.tag'),
          value: 'tag',
        },
        {
          label: this.t('harborConfig.form.search.operation'),
          value: 'operation',
        },
      ];
    },
    rows() {
      return this.data.map((d) => {
        return {
          ...d,
          creation: this.liveUpdate(d.op_time),
        };
      });
    },
  },
  watch: {
    params: {
      immediate: true,
      handler() {
        this.loadData();
      }
    }
  },
  methods: {
    pageChange(record) {
      this.page = record;
      this.loadData();
    },
    fetchLogs(p) {
      if (this.projectId > -1) {
        return this.apiRequest.fetchProjectLogs(this.projectId, p);
      }

      return this.apiRequest.fetchLogs(p);
    },
    resetParams() {
      this.page = 1;
      this.page_size = 10;
      this.inputFilter = [];
    },
    async loadData() {
      this.loading = true;
      this.errors = [];
      try {
        const data = await this.fetchLogs({
          page_size: this.page_size,
          page:      this.page,
          ...this.params
        });

        this.totalCount = this.getTotalCount(data);
        this.data = data?.length ? data : [];
        this.harborServerError = false;
      } catch (err) {
        this.errors = [err];
        this.harborServerError = true;
      }
      this.loading = false;
    },
    reloadData() {
      this.resetParams();
      this.loadData();
    },
    inputSearch(record) {
      this.page = 1;
      if (record.length > 0) {
        record[0].field = this.extraSearchFields;
      }
      this.inputFilter = record;
    },
  }
};
</script>
<style scoped>
  .header {
    display: grid;
    grid-template-areas: 'title action'
                          'sub-title action';
    grid-template-columns: 1fr auto;
  }
  .title {
    padding: 10px;
    font-size: 1.5em;
  }
  .sub-title {
    grid-area: sub-title;
  }
  .action {
    grid-area: action;
  }
  .color-option {
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 24px;
    text-align: center;
    line-height: 24px;
    border: 0;
    font-size: 12px;
  }
  .color-container {
    max-width: 360px;
    display: flex;
    gap: 8px 16px;
    flex-wrap: wrap;
  }
  .color-label {
    color: var(--input-label);
  }
  .color-form {
    box-sizing: border-box;
    height: 61px;
    width: 265px;
    padding: 10px;
    background-color: var(--input-bg);
    border-radius: var(--border-radius);
    border: solid var(--border-width) var(--input-border);
    color: var(--input-text);
    display: flex;
    flex-direction: column;
  }
  .color-value {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-top: 3px;
  }

  ::v-deep .icon-chevron-up {
    display: none;
  }
  ::v-deep .icon-chevron-down {
    display: block;
  }
  ::v-deep .open .icon-chevron-up {
    display: block;
  }
  ::v-deep .open .icon-chevron-down {
    display: none;
  }
  .label-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
