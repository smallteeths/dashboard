<template>
  <div>
    <h3>
      <router-link
        :to="backTo"
      >
        {{ t('harborConfig.tab.store') }}
      </router-link>
      <span class="mr-5">
        >
      </span>
      {{ imageName }}
    </h3>
    <HarborTable
      ref="harborTableRef"
      rowSelection
      search
      paging
      hideSelect
      :page="page"
      :enableFrontendPagination="true"
      :loading="loading"
      :rows="rows"
      :columns="columns"
      :totalCount="totalCount"
      :subtractHeight="230"
      :disableActionButton="disableActionButton"
      @action="action"
      @page-change="pageChange"
      @input-search="inputSearch"
      @bulk-remove="bulkRemove"
      @sort-change="sortChange"
      @checkbox-change="selectChange"
    >
      <template #pullCommand="{row}">
        <v-dropdown
          trigger="hover"
          placement="top"
        >
          <i
            style="cursor: pointer"
            class="icon icon-copy icon-lg guideLink"
            @click="copy(row.pullCommand)"
          />
          <template #popper>
            <div>
              Copy to Clipboard
            </div>
          </template>
        </v-dropdown>
      </template>
      <template #labels="{row}">
        <div
          v-if="row.formartLables"
        >
          <div
            v-for="label in row.formartLables"
            :key="label.name"
            :style="label.cssStyle"
          >
            {{ label?.iconCssStyle?.overflow }}
            <img
              :src="iconSrc"
              width="10"
              height="10"
              :style="label.iconCssStyle"
            >
            <span style="word-break: break-all">{{ label.name }}</span>
          </div>
        </div>
      </template>
    </harbortable>
    <Dialog
      :title="t('imageRepoSection.tagPage.copyDigest')"
      :show="copyDigestDialog"
      @close="copyDigestDialog = false"
    >
      <div class="digest-container">
        {{ currentRow.digest }}
      </div>
      <template #createButton>
        <button
          type="button"
          class="btn bg-primary"
          @click="copyDigest(currentRow.digest)"
        >
          {{ t('imageRepoSection.tagPage.copy') }}
        </button>
      </template>
    </Dialog>
    <Dialog
      :title="t('imageRepoSection.tagPage.addLabel')"
      :show="addLabelDialog"
      @close="addLabelDialog = false"
    >
      <div>
        <LabelCheckbox
          :items="labels"
          :selected="currentRow.labels ? currentRow.labels : []"
          @itemSelected="labelSelect"
        />
      </div>
      <template #createButton>
        <button
          v-loading="saveLabelLoading"
          :disabled="saveLabelLoading"
          type="button"
          class="btn bg-primary"
          @click="saveLabels"
        >
          {{ t('imageRepoSection.adminConfigPage.saveHarborConfig') }}
        </button>
      </template>
    </Dialog>
  </div>
</template>
<script>
import apiRequest from '@pkg/image-repo/mixins/apiRequest.js';
import HarborTable from '@pkg/image-repo/components/table/HarborTable.vue';
import util from '@pkg/image-repo/mixins/util.js';
import Dialog from '@pkg/image-repo/components/Dialog.vue';
import { PRODUCT_NAME } from '@pkg/image-repo/config/image-repo.js';
import LabelCheckbox from '@pkg/image-repo/components/form/LabelCheckbox.vue';
import access from '@pkg/image-repo/mixins/access.js';
import { mapGetters } from 'vuex';
import { concat, cloneDeep } from 'lodash';
import loading from '@/pkg/image-repo/plugin/loading';
import useConfirm from '@/pkg/image-repo/plugin/confirm.js';

export default {
  components: {
    HarborTable,
    Dialog,
    LabelCheckbox
  },
  mixins: [
    apiRequest,
    util,
    access
  ],
  setup() {
    const { show } = useConfirm();

    return { customConfirm: show };
  },
  data() {
    return {
      loading:              false,
      saveLabelLoading:     false,
      project:              {},
      currentUser:          {},
      currentRow:           {},
      imageTags:            [],
      page:                 1,
      page_size:            10,
      totalCount:           0,
      inputFilter:          [],
      sortValue:            '',
      projectId:            this?.$route?.params?.id,
      imageName:            this?.$route?.params?.imageName,
      currentUserRoleId:    this?.$route?.params?.roleId,
      harborServerSettings: {},
      currentDigest:        '',
      time:                 '0001-01-01T00:00:00.000Z',
      copyDigestDialog:     false,
      addLabelDialog:       false,
      labels:               [],
      selectedLabels:       [],
      backTo:               {
        name:   `${ PRODUCT_NAME }-c-cluster-manager-project`,
        params: {}
      },
      labelColors: [
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
      ],
      iconSrc: require('@pkg/image-repo/assets/image/harbor-icon.svg'),
    };
  },
  watch: {
    harborServerSetting: {
      async handler(value) {
        if (value) {
          await this.init();
          if (
            parseInt(this.project?.current_user_role_id, 10) === 1 ||
            this?.currentUser?.sysadmin_flag ||
            this?.currentUser?.has_admin_role ||
            parseInt(this?.project?.current_user_role_id, 10) === 4 ||
            parseInt(this?.project?.current_user_role_id, 10) === 2
          ) {
            await this.fetchLabels();
          }
          await this.fetchImage();
        }
      },
      deep: true
    },
  },
  methods: {
    async init() {
      const maxRetries = 3;
      let retries = 0;

      this.loading = true;
      const harborServerSettings = await this.harborAPIRequest.fetchHarborServerUrl() || {};

      this.harborServerSettings = harborServerSettings;
      while (retries < maxRetries) {
        try {
          const project = await this.harborAPIRequest.getProjectDetail(this.projectId);

          this.project = project;
          this.backTo = {
            name:   `${ PRODUCT_NAME }-c-cluster-manager-project-detail`,
            params: {
              id:       project.project_id,
              tabIndex: 1,
            }
          };
          break;
        } catch (e) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      retries = 0;
      while (retries < maxRetries) {
        try {
          const currentUser = await this.harborAPIRequest.fetchCurrentHarborUser();

          this.currentUser = currentUser;
          break;
        } catch (e) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    },
    async fetchImage() {
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
        const imageTags = await this.harborAPIRequest.fetchTags(this?.project?.project_id, `${ this?.project?.name }/${ this.imageName }`);

        this.totalCount = this.getTotalCount(imageTags) || 0;
        this.imageTags = imageTags;
        this.loading = false;
      } catch (e) {
        this.loading = false;
      }
    },
    async fetchLabels() {
      this.labels = [];
      const params = { scope: 'g' };

      try {
        const labels = await this.harborAPIRequest.fetchLabels(params);

        if (labels?.length > 0) {
          this.labels = concat(this.labels, labels);
        }
      } catch (e) {}

      params.scope = 'p';
      params.project_id = this.project.project_id;
      try {
        const projectLabels = await this.harborAPIRequest.fetchLabels(params);

        if (projectLabels?.length > 0) {
          this.labels = concat(this.labels, projectLabels);
        }
      } catch (e) {}
    },
    async removeTabs(record) {
      this.loading = true;
      try {
        await this.harborAPIRequest.removeTags(`${ this?.project?.name }/${ this.imageName }`, record);
      } catch (e) {
        this.loading = false;
      }
      await this.fetchImage();
    },
    pageChange(record) {
      this.page = record;
      this.fetchImage();
    },
    inputSearch(record) {
      this.page = 1;
      this.inputFilter = record;
      this.fetchImage();
    },
    bulkRemove(record) {
      this.customConfirm({
        type:           this.t('harborConfig.table.tag'),
        resources:      record,
        store:          this.$store,
        propKey:        'name',
        removeCallback: async() => {
          await this.removeTabs(record.map((item) => item.name));
        }
      }, this._.appContext);
    },
    action(record, row) {
      this.currentRow = row;
      switch (record.action) {
      case 'copyDigest':
        this.copyDigestDialog = true;

        return;
      case 'addLabel':
        this.addLabelDialog = true;

        return;
      case 'remove':
        this.customConfirm({
          type:           this.t('harborConfig.table.tag'),
          resources:      [row],
          propKey:        'name',
          store:          this.$store,
          removeCallback: async() => {
            await this.removeTabs([row].map((item) => item.name));
          }
        }, this._.appContext);
      }
    },
    copyDigest(value) {
      this.copy(value);
      this.copyDigestDialog = false;
    },
    selectChange(record) {
      this.selectedRows = record;
    },
    sortChange({ field, order }) {
      if (!order) {
        this.fetchImage();

        return;
      }
      const key = field;

      this.imageTags.sort((a, b) => {
        const fieldA = a[key];
        const fieldB = b[key];

        let comparison = 0;

        if (fieldA > fieldB) {
          comparison = 1;
        } else if (fieldA < fieldB) {
          comparison = -1;
        }

        return order === 'asc' ? comparison : -comparison;
      });
    },
    sizeTransform(tagSize) {
      const size = Number.parseInt(tagSize);

      if (Math.pow(1024, 1) <= size && size < Math.pow(1024, 2)) {
        return `${ (size / Math.pow(1024, 1)).toFixed(2) }KB`;
      } else if (Math.pow(1024, 2) <= size && size < Math.pow(1024, 3)) {
        return `${ (size / Math.pow(1024, 2)).toFixed(2) }MB`;
      } else if (Math.pow(1024, 3) <= size && size < Math.pow(1024, 4)) {
        return `${ (size / Math.pow(1024, 3)).toFixed(2) }GB`;
      } else {
        return `${ size }B`;
      }
    },
    pullCommand(digest) {
      const harborServer = this.harborServerSettings.value || '';
      const endpoint = harborServer.indexOf('://') > -1 ? harborServer.substr(harborServer.indexOf('://') + 3).replace(/\/+$/, '') : harborServer.replace(/\/+$/, '');
      const url = `${ endpoint }/${ this.project?.name }/${ this.imageName }${ digest ? `@${ digest }` : '' }`;

      return `docker pull ${ url }`;
    },
    formatLabels(labels) {
      return labels ? labels.map((label) => {
        const color = label.color || '#FFFFFF';
        const font = this.labelColors.find((c) => c.color === color);

        return {
          cssStyle: {
            overflow:        'hidden',
            maxWidth:        '300px',
            fontSize:        '12px',
            display:         'inline-block',
            padding:         '0 6px',
            border:          '1px solid rgb(161, 161, 161)',
            borderRadius:    '2px',
            backgroundColor: color,
            color:           font && font.textColor,
            marginRight:     '2px',
          },
          iconCssStyle: {
            marginRight: '10px',
            position:    'relative',
            top:         '3360px',
            filter:      `drop-shadow(${ font && font.textColor } 0px -3358px)`
          },
          name:       label.name,
          classNames: label.scope === 'g' ? 'icon icon-user' : 'icon icon-tag',
        };
      }) : null;
    },
    copy(value) {
      const input = document.createElement('input');

      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('Copy');
      document.body.removeChild(input);
    },
    labelSelect(record) {
      this.selectedLabels = record;
    },
    async saveLabels() {
      this.saveLabelLoading = true;
      if (this.currentRow?.labels) {
        await Promise.all(
          this.currentRow?.labels
            .filter((item) => !this.selectedLabels.some((ele) => ele.id === item.id))
            .map(async(item) => {
              await this.harborAPIRequest.removeTagLabels(`${ this.project.name }/${ this.imageName }`, this?.currentRow?.name, [item.id]);
            })
        );
      }

      await Promise.all(
        this.selectedLabels
          .filter((item) => !this.currentRow?.labels?.some((ele) => ele.id === item.id))
          .map(async(item) => {
            await this.harborAPIRequest.addTagLabels(`${ this.project.name }/${ this.imageName }`, this?.currentRow?.name, [item.id]);
          })
      );

      this.saveLabelLoading = false;
      this.addLabelDialog = false;
      await this.fetchImage();
    }
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    columns() {
      const developerRoleOrAbove = `${ this.currentUserRoleId }` === '2' || `${ this.currentUserRoleId }` === '1' || this.currentUser.sysadmin_flag;
      const hasProjectAdminRole = `${ this.currentUserRoleId }` === '1' || this.currentUser.sysadmin_flag;
      const hasProjectMasterRole = `${ this.currentUserRoleId }` === '4' || this.currentUser.sysadmin_flag;

      const options = [
        {
          label:  this.t('imageRepoSection.tagPage.action.copyDigest'),
          icon:   'icon icon-copy',
          action: 'copyDigest'
        }
      ];

      if (developerRoleOrAbove || hasProjectMasterRole) {
        options.push({
          label:  this.t('imageRepoSection.tagPage.action.addLabel'),
          icon:   'icon icon-plus',
          action: 'addLabel',
        });
      }
      if (hasProjectAdminRole || hasProjectMasterRole) {
        options.push({
          label:  this.t('action.remove'),
          icon:   'icon icon-trash',
          action: 'remove',
        });
      }

      return [
        {
          field:    'name',
          search:   'name',
          sortable: true,
          title:    this.t('harborConfig.table.imageTag'),
        },
        {
          field:    'size',
          sortable: true,
          title:    this.t('harborConfig.table.size'),
        },
        {
          field: 'pullCommand',
          slot:  true,
          title: this.t('harborConfig.table.pullCommand'),
        },
        {
          field:    'author',
          sortable: true,
          title:    this.t('harborConfig.table.author'),
        },
        {
          field:    'created',
          sortable: true,
          title:    this.t('generic.created'),
        },
        {
          field: 'docker_version',
          title: this.t('harborConfig.table.dockerVersion'),
        },
        {
          field: 'labels',
          slot:  true,
          title: this.t('harborConfig.table.label'),
        },
        {
          field:  'action',
          title:  '',
          width:  50,
          action: { options }
        },
      ];
    },
    rows() {
      const deepCopiedImageTags = cloneDeep(this.imageTags);

      return deepCopiedImageTags?.map((tag) => {
        const pullCommand = this.pullCommand(tag.digest);
        const formartLables = this.formatLabels(tag.labels);

        tag.created = tag.created ? this.liveUpdate(tag.created) : '';
        tag.size = this.sizeTransform(tag.size);

        return {
          pullCommand,
          formartLables,
          ...tag,
        };
      });
    },
    disableActionButton() {
      return parseInt(this?.project?.current_user_role_id, 10) !== 1 &&
        !this?.currentUser?.sysadmin_flag &&
        !this?.currentUser?.has_admin_role &&
        parseInt(this?.project?.current_user_role_id, 10) !== 4;
    }
  },
  directives: { loading }

};

</script>
<style lang="scss" scoped>
  .digest-container {
    display: block;
    box-sizing: border-box;
    border-width: 1.25px;
    border-color: #cdd0dd;
    border-radius: 0;
    border-style: solid;
    padding: 5px 10px;
    font-size: 15px;
    line-height: 24px;
    width: 100%;
    padding: 30px;
    word-wrap: break-word;
  }
</style>
