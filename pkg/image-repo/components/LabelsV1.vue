<template>
  <div>
    <HarborTable
      search
      rowSelection
      paging
      hideSelect
      :page="page"
      :loading="loading"
      :rows="rows"
      :columns="columns"
      :total-count="totalCount"
      :default-select-option="filterKeyOptions"
      :enableFrontendPagination="true"
      :sortConfig="{remote: false}"
      :subtractHeight="subtractHeight"
      :autoHide="autoHide"
      @page-change="pageChange"
      @action="action"
      @input-search="inputSearch"
      @bulk-remove="bulkRemove"
    >
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
    <Dialog
      :title="t('harborConfig.formTag.titleAdd')"
      :show="addDialogVisible"
      :loading="loading"
      @close="addDialogVisible = false"
      @create="createLabel"
    >
      <div class="label">
        <div class="label-item mb-20">
          <LabeledInput
            v-model:value.trim="newForm.name"
            :label="t('harborConfig.formTag.name.label')"
            required
          />
          <v-popover
            trigger="click"
            placement="bottom-start"
          >
            <div class="color-form">
              <label class="color-label">{{ t("harborConfig.formTag.color.label") }} </label>
              <div class="color-value">
                {{ newForm.color }}
                <i class="icon icon-chevron-up" />
                <i class="icon icon-chevron-down" />
              </div>
            </div>
            <template #popover>
              <div class="color-container">
                <div
                  v-for="c in labelColors"
                  :key="c.color"
                  class="color-option"
                  :style="{color: c.textColor, backgroundColor: c.color}"
                  @click="newForm.color = c.color"
                >
                  Aa
                </div>
              </div>
            </template>
          </v-popover>
        </div>
        <LabeledInput
          v-model:value.trim="newForm.description"
          :label="t('harborConfig.formTag.description')"
        />

        <div class="mt-20">
          <Banner
            v-for="(err, i) in errors"
            :key="i"
            color="error"
            :label="err"
          />
        </div>
      </div>
    </Dialog>
    <Dialog
      :title="t('harborConfig.formTag.titleEdit')"
      :show="editDialogVisible"
      @close="editDialogVisible = false"
    >
      <div class="label">
        <div class="label-item mb-20">
          <LabeledInput
            v-model:value.trim="editForm.name"
            :label="t('harborConfig.formTag.name.label')"
            required
          />
          <v-popover
            trigger="click"
            placement="bottom-start"
          >
            <div class="color-form">
              <label class="color-label">{{ t("harborConfig.formTag.color.label") }} </label>
              <div class="color-value">
                {{ editForm.color }}
                <i class="icon icon-chevron-up" />
                <i class="icon icon-chevron-down" />
              </div>
            </div>
            <template #popover>
              <div class="color-container">
                <div
                  v-for="c in labelColors"
                  :key="c.color"
                  class="color-option"
                  :style="{color: c.textColor, backgroundColor: c.color}"
                  @click="editForm.color = c.color"
                >
                  Aa
                </div>
              </div>
            </template>
          </v-popover>
        </div>
        <LabeledInput
          v-model:value.trim="editForm.description"
          :label="t('harborConfig.formTag.description')"
        />

        <div class="mt-20">
          <Banner
            v-for="(err, i) in errors"
            :key="i"
            color="error"
            :label="err"
          />
        </div>
      </div>
      <template #createButton>
        <button
          v-loading="loading"
          :disabled="loading"
          type="button"
          class="btn bg-primary"
          @click="saveLabel"
        >
          {{ t('generic.save') }}
        </button>
      </template>
    </Dialog>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import HarborTable from '@pkg/image-repo/components/table/HarborTable.vue';
import Dialog from '@pkg/image-repo/components/Dialog.vue';
import LabelItem from '@pkg/image-repo/components/LabelItem.vue';
import util from '../mixins/util.js';
import Schema from 'async-validator';
import { LabeledInput } from '@components/Form/LabeledInput';
import Banner from '@pkg/image-repo/components/Banner';
import loading from '../plugin/loading';

const defaultForm = {
  name:        '',
  color:       '#FFFFFF',
  description: '',
  scope:       '',
  project_id:  0,
};
const labelColors = [
  {
    color:     '#000000',
    textColor: 'white'
  }, {
    color:     '#61717D',
    textColor: 'white'
  },
  {
    color:     '#737373',
    textColor: 'white'
  }, {
    color:     '#80746D',
    textColor: 'white'
  },
  {
    color:     '#FFFFFF',
    textColor: 'black'
  }, {
    color:     '#A9B6BE',
    textColor: 'black'
  },
  {
    color:     '#DDDDDD',
    textColor: 'black'
  }, {
    color:     '#BBB3A9',
    textColor: 'black'
  },
  {
    color:     '#0065AB',
    textColor: 'white'
  }, {
    color:     '#343DAC',
    textColor: 'white'
  },
  {
    color:     '#781DA0',
    textColor: 'white'
  }, {
    color:     '#9B0D54',
    textColor: 'white'
  },
  {
    color:     '#0095D3',
    textColor: 'black'
  }, {
    color:     '#9DA3DB',
    textColor: 'black'
  },
  {
    color:     '#BE90D6',
    textColor: 'black'
  }, {
    color:     '#F1428A',
    textColor: 'black'
  },
  {
    color:     '#1D5100',
    textColor: 'white'
  }, {
    color:     '#006668',
    textColor: 'white'
  },
  {
    color:     '#006690',
    textColor: 'white'
  }, {
    color:     '#004A70',
    textColor: 'white'
  },
  {
    color:     '#48960C',
    textColor: 'black'
  }, {
    color:     '#00AB9A',
    textColor: 'black'
  },
  {
    color:     '#00B7D6',
    textColor: 'black'
  }, {
    color:     '#0081A7',
    textColor: 'black'
  },
  {
    color:     '#C92100',
    textColor: 'white'
  }, {
    color:     '#CD3517',
    textColor: 'white'
  },
  {
    color:     '#C25400',
    textColor: 'white'
  }, {
    color:     '#D28F00',
    textColor: 'white'
  },
  {
    color:     '#F52F52',
    textColor: 'black'
  }, {
    color:     '#FF5501',
    textColor: 'black'
  },
  {
    color:     '#F57600',
    textColor: 'black'
  }, {
    color:     '#FFDC0B',
    textColor: 'black'
  },
];

export default {
  mixins:     [util],
  components: {
    HarborTable,
    Dialog,
    LabelItem,
    LabeledInput,
    Banner
  },
  props: {
    apiRequest: {
      type:     Object,
      required: true
    },
    projectId: {
      type:    Number,
      default: 0
    },
    scope: {
      type:    String,
      default: 'g'
    },
    subtractHeight: {
      type:    Number,
      default: 0,
    },
    autoHide: {
      type:    Boolean,
      default: true,
    }
  },

  data() {
    const descriptor = { name: { required: true, message: () => this.t('harborConfig.formTag.name.nameReq') } };

    return {
      descriptor,
      labelColors,
      errors:            [],
      loading:           false,
      addDialogVisible:  false,
      editDialogVisible: false,
      data:              [],
      inputFilter:       [],
      sort:              '',
      totalCount:        0,
      newForm:           {},
      editForm:          {},
      page:              1,
    };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    params() {
      const filter = this.inputFilter.reduce((t, c) => {
        t[c.field] = c.value;

        return t;
      }, {});

      const p = {
        scope: this.scope,
        ...filter,
      };

      if (this.projectId !== 0) {
        p.project_id = this.projectId;
      }

      if (this.sort) {
        p.sort = this.sort;
      }

      return p;
    },
    filterKeyOptions() {
      return [{
        label: this.t('harborConfig.advanced.label.title'),
        value: 'name',
      }];
    },
    rows() {
      return this.data.map((d) => {
        return {
          ...d,
          creation: this.liveUpdate(d.creation_time),
        };
      });
    },
    columns() {
      return [
        {
          field:    'name',
          title:    this.t('harborConfig.advanced.label.name'),
          sortable: true,
          search:   'name',
          slot:     true,
        },
        {
          field:    'description',
          title:    this.t('harborConfig.advanced.label.describe'),
          sortable: true,
        },
        {
          field:    'creation_time',
          title:    this.t('harborConfig.advanced.label.createTime'),
          slot:     true,
          sortable: true,
        },
        {
          action: {
            options: [
              {
                label: this.t('harborConfig.labelTableAction.edit'),
                value: 'edit'
              }, {
                label: this.t('harborConfig.labelTableAction.delete'),
                value: 'delete'
              }
            ],
          },
          width: 50
        }
      ];
    }
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
    resetParams() {
      this.page = 1;
      this.page_size = 10;
      this.sort = '';
      this.inputFilter = [];
    },
    async loadData() {
      this.loading = true;
      this.errors = [];
      try {
        const data = await this.apiRequest.fetchLabels(this.params);

        this.totalCount = this.getTotalCount(data);
        this.data = data?.length ? data : [];
      } catch (err) {
        this.errors = [err];
      }
      this.loading = false;
    },
    reloadData() {
      this.resetParams();
      this.loadData();
    },
    showAddModal() {
      this.errors = [];
      this.newForm = {
        ...defaultForm,
        project_id: this.projectId,
        scope:      this.scope
      };
      this.addDialogVisible = true;
    },
    pageChange(page) {
      this.page = page;
    },
    async action(action, record) {
      if (action.value === 'delete' && record.id) {
        this.$customConfrim({
          type:           this.t('harborConfig.table.label'),
          resources:      [record],
          propKey:        'name',
          store:          this.$store,
          removeCallback: async() => {
            await this.apiRequest.removeLabels([record.id]);
            this.reloadData();
          }
        });

        return;
      }
      if (action.value === 'edit') {
        this.editForm = { ...record };
        this.editDialogVisible = true;
      }
    },
    inputSearch(f) {
      this.page = 1;
      this.inputFilter = f;
    },
    bulkRemove(d) {
      const ids = d.map((item) => item.id);

      this.$customConfrim({
        type:           this.t('harborConfig.table.label'),
        resources:      d,
        propKey:        'name',
        store:          this.$store,
        removeCallback: async() => {
          await this.apiRequest.removeLabels(ids);
          this.reloadData();
        }
      });
    },
    async createLabel() {
      this.loading = true;
      try {
        await this.validate(this.newForm);
      } catch (err) {
        this.errors = err.errors.map((e) => e.message);
        this.loading = false;

        return;
      }
      try {
        await this.apiRequest.createLabel(this.newForm);
        this.addDialogVisible = false;
        await this.loadData();
      } catch (err) {
        if (err?._status === 409) {
          this.errors.push(this.t('harborConfig.formTag.name.nameExist'));
        } else {
          this.errors = this.getRequestErrorMessage(err);
        }
      }

      this.loading = false;
    },
    validate(form) {
      const validator = new Schema(this.descriptor);

      return validator.validate(form);
    },
    async saveLabel() {
      this.loading = true;
      try {
        await this.validate(this.editForm);
      } catch (err) {
        this.errors = err.errors.map((e) => e.message);
        this.loading = false;

        return;
      }
      try {
        await this.apiRequest.updateLabel(this.editForm);
        this.editDialogVisible = false;
        await this.loadData();
      } catch (err) {
        if (err?._status === 409) {
          this.errors.push(this.t('harborConfig.formTag.name.nameExist'));
        } else {
          this.errors = this.getRequestErrorMessage(err);
        }
      }

      this.loading = false;
    }
  },
  directives: { loading }
};
</script>
<style scoped>
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

  :deep(.icon-chevron-up) {
    display: none;
  }
  :deep(.icon-chevron-down) {
    display: block;
  }
  :deep(.open .icon-chevron-up) {
    display: block;
  }
  :deep(.open .icon-chevron-down) {
    display: none;
  }
  .label-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
