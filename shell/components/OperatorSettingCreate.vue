<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import ArrayList from '@shell/components/form/ArrayList';
import { _EDIT } from '@shell/config/query-params';

export default {
  name: 'OperatorSettingCreate',

  components: {
    LabeledSelect,
    LabeledInput,
    ArrayList
  },
  props: {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    rules: {
      default: () => ({
        url:              [],
        whitelistDomains: []
      }),
      type: Object,
    }
  },
  data: () => {
    return {
      providerChoices: [
        {
          label: 'Alibaba',
          value: 'ackoperatorsetting',
        },
        {
          label: 'Tencent',
          value: 'tkeoperatorsetting',
        },
        {
          label: 'Huawei',
          value: 'cceoperatorsetting',
        },
      ],
    };
  },

  computed: {
    isEdit() {
      return this.mode === _EDIT;
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <LabeledSelect
        v-model="value.name"
        :options="providerChoices"
        :label="t('drivers.add.name.label')"
        :mode="mode"
        :disabled="isEdit"
      />
    </div>
    <div class="row mb-20">
      <LabeledInput
        v-model.trim="value.url"
        :label="t('drivers.add.customUiUrl.label')"
        :placeholder="t('drivers.add.customUiUrl.placeholder', null, true)"
        :tooltip="t('drivers.add.customUiUrl.tooltip', null, true)"
        :mode="mode"
        :rules="rules.url"
        :data-testid="'driver-create-url-field'"
        required
      />
    </div>
    <div class="col span-6">
      <ArrayList
        v-model="value.whitelistDomains"
        :protip="false"
        :mode="mode"
        :title="t('drivers.add.whitelist')"
        :rules="rules.whitelistDomains"
        :data-testid="'driver-create-whitelist-list'"
      />
    </div>
  </div>
</template>
