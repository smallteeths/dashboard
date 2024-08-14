<template>
  <div class="project">
    <div class="header">
      <h1>{{ t('nav.imageRepo.projects') }}</h1>
      <div class="right-buttons">
        <button
          v-if="!harborServerError"
          class="btn role-primary"
          @click="showDialog"
        >
          {{ t('harborConfig.btn.createProject') }}
        </button>
      </div>
    </div>
    <div
      v-if="harborServerError"
      class="ml-10 mt-10"
    >
      {{ t('harborConfig.errorInfo') }}
    </div>
    <HarborTable
      v-else
      ref="harborTableRef"
      rowSelection
      search
      paging
      :page="page"
      :loading="loading"
      :rows="rows"
      :columns="columns"
      :totalCount="totalCount"
      :subtractHeight="262"
      :defaultSelectOption="defaultSelectOption"
      :disableActionButton="disableActionButton"
      @action="action"
      @page-change="pageChange"
      @input-search="inputSearch"
      @bulk-remove="bulkRemove"
      @sort-change="sortChange"
      @checkbox-change="selectChange"
    >
      <template
        v-slot:name="{ row }"
      >
        <nuxt-link
          :to="row.to"
        >
          {{ row.name }}
        </nuxt-link>
      </template>
    </HarborTable>
    <Dialog
      :title="t('harborConfig.newProject')"
      :show="newProjectVisible"
      :loading="createProjectLoading"
      @close="closeDialog"
      @create="createProject"
    >
      <div>
        <LabeledInput
          v-model.trim="form.name"
          class="mb-10"
          :label="t('harborConfig.form.projectName.label')"
          required
        />
        <LabeledInput
          v-if="isSystemAdmin"
          v-model.number="form.count"
          class="mb-10"
          type="number"
          :label="t('harborConfig.form.count.label')"
          required
        />
        <div v-if="isSystemAdmin">
          <InputWithSelect
            :text-value="form.size"
            :select-before-text="false"
            :options="form.operation"
            :select-value="form.storageUnitValue"
            :text-label="t('harborConfig.form.storage.label')"
            type="number"
            @input="inputWithSelectChange($event)"
          />
        </div>

        <SwitchCheckbox
          :checked="form.checked"
          @toggle-change="toggleAccessChange"
        />
        <div class="acc-label">
          {{ t('harborConfig.form.accessLevel.info') }}
        </div>
        <Banner
          v-for="(err, i) in errors"
          :key="i"
          color="error"
          :label="err"
        />
      </div>
    </Dialog>
  </div>
</template>
<script>
import HarborTable from '@pkg/image-repo/components/table/HarborTable.vue';
import Dialog from '@pkg/image-repo/components/Dialog.vue';
import SwitchCheckbox from '@pkg/image-repo/components/form/SwitchCheckbox.vue';
import { LabeledInput } from '@components/Form/LabeledInput';
import InputWithSelect from '@shell/components/form/InputWithSelect';
import Banner from '@pkg/image-repo/components/Banner';
import util from '../mixins/util.js';
import access from '@pkg/image-repo/mixins/access.js';
import { mapGetters } from 'vuex';
import { PRODUCT_NAME } from '../config/image-repo.js';
import Schema from 'async-validator';

export default {
  components: {
    HarborTable,
    LabeledInput,
    Dialog,
    Banner,
    InputWithSelect,
    SwitchCheckbox
  },
  mixins: [util, access],
  props:  {
    apiRequest: {
      type:     Object,
      required: true
    }
  },
  async fetch() {
    try {
      await this.fetchCurrentUser();
      this.harborServerError = false;
    } catch (err) {
      this.loading = false;
      this.harborServerError = true;

      return;
    }
    await this.getProject();
  },
  data() {
    const nameReg = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

    const descriptor = {
      name: [
        {
          type:     'string',
          required: true,
          message:  () => this.t('harborConfig.validate.projectNameReq')
        },
        {
          validator: (rule, value, callback, source, options) => {
            const errors = [];

            if (!nameReg.test(value) && value !== '') {
              errors.push(this.t('harborConfig.validate.projectNameFormatError'));
            }

            return errors;
          }
        }
      ],
    };

    return {
      descriptor,
      loading:              false,
      page_size:            10,
      mainRowSearchKey:     'artifact_count',
      totalCount:           0,
      page:                 1,
      inputFilter:          [],
      selectedRows:         [],
      currentUser:          {},
      newProjectVisible:    false,
      createProjectLoading: false,
      projects:             [],
      form:                 {
        name:             '',
        size:             -1,
        count:            -1,
        storageLimit:     -1,
        storageUnitValue: 'gb',
        checked:          false,
        operation:        [
          {
            label: 'MiB',
            value: 'mb'
          },
          {
            label: 'GiB',
            value: 'gb'
          },
          {
            label: 'TiB',
            value: 'tb'
          }
        ]
      },
      errors:            [],
      sortValue:         '',
      harborServerError: false,
    };
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    defaultSelectOption() {
      return [
        {
          filterKey: 'public',
          label:     this.t('harborConfig.form.image.all'),
          value:     '',
        },
        {
          filterKey: 'public',
          label:     this.t('harborConfig.form.image.public'),
          value:     1,
        },
        {
          filterKey: 'public',
          label:     this.t('harborConfig.form.image.private'),
          value:     0,
        },
      ];
    },
    rows() {
      return this.projects.map((project) => {
        const to = {
          name:   `${ PRODUCT_NAME }-c-cluster-manager-project-detail`,
          params: { id: project.project_id }
        };

        if (project.current_user_role_ids === null) {
          project.current_user_role_id = 0;
        }

        return {
          role:     this.getRole(project),
          access:   project?.metadata?.public === 'true' ? this.t('harborConfig.table.storeStatus.public') : this.t('harborConfig.table.storeStatus.private'),
          creation: this.liveUpdate(project.creation_time),
          to,
          ...project
        };
      });
    },
    columns() {
      return [
        {
          field:    'name',
          title:    this.t('harborConfig.table.projectName'),
          sortable: true,
          search:   'name',
          slot:     true,
        },
        {
          field:    'access',
          sortable: true,
          title:    this.t('harborConfig.table.level'),
        },
        {
          field:    'role',
          sortable: true,
          title:    this.t('harborConfig.table.role'),
        },
        {
          field:    'repo_count',
          sortable: true,
          title:    this.t('harborConfig.table.count'),
          width:    200,
        },
        {
          field:    'creation',
          title:    this.t('generic.created'),
          sortable: true,
        },
        {
          field:  'action',
          title:  '',
          width:  50,
          action: {
            options: [
              {
                action:         'delete',
                label:          this.t('action.remove'),
                icon:           'icon-trash',
                disableActions: (record) => {
                  return parseInt(record?.current_user_role_id, 10) !== 1 && !this?.currentUser?.sysadmin_flag && !this?.currentUser?.has_admin_role;
                }
              },
            ],
          }
        },
      ];
    },
    disableActionButton() {
      return this.selectedRows?.some((item) => {
        return parseInt(item?.current_user_role_id, 10) !== 1;
      }) && !this?.currentUser?.sysadmin_flag && !this?.currentUser?.has_admin_role;
    },
  },
  methods: {
    async fetchCurrentUser() {
      this.loading = true;
      const currentUser = await this.apiRequest.fetchCurrentHarborUser();

      this.currentUser = currentUser;
    },
    async getProject() {
      const params = {};

      if (this.inputFilter?.length > 0 ) {
        this.inputFilter.forEach((item) => {
          params[item.field] = item.value;
        });
      }
      if (this.sortValue !== '') {
        params.sort = this.sortValue;
      }
      try {
        this.loading = true;
        const projects = await this.apiRequest.fetchProjects({
          page_size: this.page_size,
          page:      this.page,
          ...params,
        });

        this.totalCount = this.getTotalCount(projects) || 0;
        this.projects = projects.length ? projects : [];
        this.loading = false;
      } catch (err) {
        this.loading = false;
      }
    },
    validate() {
      const validator = new Schema(this.descriptor);

      return validator.validate(this.form);
    },
    selectChange(record) {
      this.selectedRows = record;
    },
    inputWithSelectChange({ text, selected }) {
      this.form.storageUnitValue = selected;
      this.form.size = text;
    },
    action(action, record) {
      if (action.action === 'delete' && record.project_id) {
        this.$customConfrim({
          type:           this.t('harborConfig.image'),
          resources:      [record],
          propKey:        'name',
          store:          this.$store,
          removeCallback: async() => {
            await this.removeProjects([record.project_id]);
          }
        });
      }
    },
    toggleAccessChange() {
      this.form.checked = !this.form.checked;
    },
    pageChange(record) {
      this.page = record;
      this.getProject();
    },
    inputSearch(record) {
      this.page = 1;
      this.inputFilter = record;
      this.getProject();
    },
    sortChange({ field, order }) {
      if (!order) {
        this.getProject();

        return;
      }
      let key = field;

      if (field === 'creation') {
        key = 'creation_time';
      }
      if (field === 'role') {
        key = 'current_user_role_id';
      }
      this.projects.sort((a, b) => {
        let fieldA = a[key];
        let fieldB = b[key];

        if (field === 'access') {
          fieldA = a?.metadata?.public;
          fieldB = b?.metadata?.public;
        }
        let comparison = 0;

        if (fieldA > fieldB) {
          comparison = 1;
        } else if (fieldA < fieldB) {
          comparison = -1;
        }

        return order === 'asc' ? comparison : -comparison;
      });
    },
    bulkRemove(record) {
      const projectIDs = record.map((project) => {
        return project.project_id;
      });

      this.$customConfrim({
        type:           this.t('harborConfig.image'),
        resources:      record,
        propKey:        'name',
        store:          this.$store,
        removeCallback: async() => {
          await this.removeProjects(projectIDs);
        }
      });
    },
    async removeProjects(projectIDs) {
      this.loading = true;
      try {
        await this.apiRequest.removeProjects(projectIDs);
      } catch (e) {}
      await this.getProject();
    },
    showDialog() {
      this.newProjectVisible = true;
    },
    closeDialog() {
      this.clearForm();
      this.newProjectVisible = false;
    },
    async createProject() {
      this.createProjectLoading = true;
      this.errors = [];
      try {
        await this.validate();
      } catch (err) {
        this.errors = err.errors.map((e) => e.message);
        this.createProjectLoading = false;

        return;
      }
      const size = parseInt(this.form.size, 10) !== -1 ? this.changeToBytes(this.form.size, this.form.storageUnitValue) : -1;
      const data = {
        project_name:  this.form.name,
        storage_limit: size,
        count_limit:   parseInt(this.form.count, 10) ?? -1,
        metadata:      { public: this.form.checked ? 'true' : 'false' }
      };

      try {
        await this.apiRequest.createProject(data);
        this.createProjectLoading = false;
        this.clearForm();
        this.newProjectVisible = false;
        this.clearSelect();
        this.getProject();
      } catch (err) {
        this.errors = this.getRequestErrorMessage(err);
        this.createProjectLoading = false;
      }
    },
    getRole(project) {
      let roleText;

      switch (project.current_user_role_id) {
      case 0:
        roleText = '';
        break;
      case 1:
        roleText = this.t('harborConfig.table.roleItem.admin');
        break;
      case 2:
        roleText = this.t('harborConfig.table.roleItem.developer');
        break;
      case 3:
        roleText = this.t('harborConfig.table.roleItem.visitor');
        break;
      case 4:
        roleText = this.t('harborConfig.table.roleItem.master');
        break;
      case 5:
        roleText = this.t('harborConfig.table.roleItem.limitedGuest');
        break;
      default:
        roleText = '';
      }

      return roleText;
    },
    clearForm() {
      this.form.name = '';
      this.form.size = -1;
      this.form.count = -1;
      this.form.storageUnitValue = 'mb';
      this.form.checked = false;
      this.errors = [];
    },
    clearSelect() {
      this.$refs.harborTableRef?.clearSearch();
    },
  }
};
</script>
<style lang="scss" scoped>
.project {
  .header {
    display: grid;
    grid-template-areas:
        "type-banner type-banner"
        "title actions"
        "state-banner state-banner";
    grid-template-columns: auto auto;
    margin-bottom: 20px;
    min-height: 48px;
    align-items: center;
    padding-top: 20px;
    .right-buttons {
      justify-content: flex-end;
      align-self: center;
      text-align: right;
    }
  }
  A {
    display: flex;
    justify-content: left;
    align-items: center;
  }
  .acc-label {
    color: #4a4b52;
    padding-bottom: 5px;
    font-size: .85em;
    margin-top: 10px;
  }
}
</style>
