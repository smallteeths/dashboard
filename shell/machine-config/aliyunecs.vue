<script>
import Loading from '@shell/components/Loading';
import Banner from '@components/Banner/Banner.vue';
import CreateEditView from '@shell/mixins/create-edit-view';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import KeyValue from '@shell/components/form/KeyValue.vue';
import UnitInput from '@shell/components/form/UnitInput';
import RadioGroup from '@components/Form/Radio/RadioGroup.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import ArrayList from '@shell/components/form/ArrayList';

import AliyunInstanceType from '@shell/machine-config/AliyunInstanceType.vue';
import { NORMAN } from '@shell/config/types';
import { allHash } from '@shell/utils/promise';
import { sortBy } from '@shell/utils/sort';
import { stringify, exceptionToErrorsArray } from '@shell/utils/error';
import { findBy } from '@shell/utils/array';
import { upperFirst } from 'lodash';

const DEFAULT_GROUP = 'docker-machine';
const OPTION_CHARGETYPES = [
  {
    label: 'cluster.machineConfig.aliyunecs.internetChargeTypes.payByTraffic',
    value: 'PayByTraffic'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.internetChargeTypes.payByBandwidth',

    value: 'PayByBandwidth'
  },
];
const DISKS = [
  {
    label: 'cluster.machineConfig.aliyunecs.disk.cloud',
    value: 'cloud'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.ephemeralSsd',
    value: 'ephemeral_ssd'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.ssd',
    value: 'cloud_ssd'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.efficiency',
    value: 'cloud_efficiency'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.essd',
    value: 'cloud_essd'
  },
  {
    label: 'cluster.machineConfig.aliyunecs.disk.auto',
    value: 'cloud_auto'
  },
];

const periodWeek = ['1'];
const periodMonth = ['1', '2', '3', '6', '12', '24', '36', '48', '60'];
// 新建时默认实例规格：优先 2 核 8 GiB
const DEFAULT_INSTANCE_CPU = 2;
const DEFAULT_INSTANCE_MEMORY = 8;

export default {
  components: {
    Banner, Loading, LabeledInput, LabeledSelect, Checkbox, RadioGroup, UnitInput, KeyValue, ArrayList, AliyunInstanceType
  },
  mixins: [CreateEditView],
  props:  {
    uuid: {
      type:     String,
      required: true,
    },
    cluster: {
      type:    Object,
      default: () => ({})
    },
    credentialId: {
      type:     String,
      required: true,
    },
    disabled: {
      type:    Boolean,
      default: false
    },
    createOption: {
      default: (text) => {
        if (text) {
          return text;
        }
      },
      type: Function
    },
    // 编辑集群时新增 Machine Pool 也为 true，用于区分「新建」与「编辑已有配置」
    poolCreateMode: {
      type:    Boolean,
      default: false,
    },
  },
  async fetch() {
    this.errors = [];
    const cloudCredentialId = this.credentialId;

    if (!cloudCredentialId) {
      return;
    }
    if (!this.defaultValue) {
      this.defaultValue = this.$store.getters['aliyun/defaultValue'];
    }
    try {
      if (this.credential?.id !== cloudCredentialId) {
        this.credential = await this.$store.dispatch('rancher/find', {
          type: NORMAN.CLOUD_CREDENTIAL,
          id:   cloudCredentialId
        });
      }
    } catch (e) {
      this.credential = null;
    }
    if (!this.regions) {
      this.regions = await this.$store.dispatch('aliyun/regions', { cloudCredentialId });
    }
    try {
      const region = this.value?.region || this.$store.getters['aliyun/defaultRegion'];
      const hash = {};

      this.setDefaultIfUnset('region', region);
      this.setDefaultIfUnset('resourceGroupId', '');
      if (!this.resourceGroups) {
        hash.resourceGroups = this.$store.dispatch('aliyun/resourceGroups', { cloudCredentialId });
      }
      if (this.loadedRegionalFor !== region) {
        const { resourceGroupId } = this.value;

        hash.zones = this.$store.dispatch('aliyun/zones', { cloudCredentialId, regionId: region });
        hash.vpcs = this.$store.dispatch('aliyun/vpcs', {
          cloudCredentialId, regionId: region, resourceGroupId
        });
      }
      const res = await allHash(hash);

      for (const k in res) {
        this[k] = res[k];
      }
      // 新建时按顺序填充网络默认值：可用区 → VPC → 交换机
      this.applyDefaultZoneIfNeeded();
      this.applyDefaultVpcIfNeeded();
      if (this.value?.vpcId) {
        await this.vpcChangeFetch();
        this.applyDefaultVswitchIfNeeded();
      }
      // 以下字段仅在新建/poolCreateMode 时写入，避免编辑已有配置被静默修改
      this.setDefaultIfUnset('upgradeKernel', false);
      this.setDefaultIfUnset('ioOptimized', 'optimized');
      this.setDefaultIfUnset('diskFs', 'ext4');
      this.setDefaultIfUnset('internetChargeType', 'PayByTraffic');
      this.setDefaultIfUnset('internetMaxBandwidth', '50');
      this.setDefaultIfUnset('instanceChargeType', this.defaultValue?.instanceChargeType);

      const openPort = this.value?.openPort;

      // NOTE (legacy behavior):
      // Even when the user selects an existing Security Group, we still pass `openPort`.
      // This is intentional for backward compatibility: many users have running environments created with
      // this behavior. Changing how `openPort` is sent when an existing Security Group is chosen could
      // unintentionally affect instances created previously (or automation relying on the old behavior).
      // Therefore, we preserve the original/default logic here.
      if (this.shouldApplyDefaults && (this.isUnset(openPort) || (Array.isArray(openPort) && openPort.length === 0))) {
        this.value.openPort = this.defaultValue?.openPort || [];
      }
      this.initTags();
      this.loadedRegionalFor = region;
      // 拉取可用实例类型，并在新建时自动选中默认规格及联动镜像/磁盘
      await this.fetchInstanceTypes({ cloudCredentialId, regionId: region });
    } catch (e) {
      this.errors = exceptionToErrorsArray(e);
    }
  },
  data() {
    return {
      securityGroupMode:     'default',
      instanceChargeType:    'PostPaid',
      tag:                   null,
      loadedRegionalFor:     null,
      loadedZoneFor:         null,
      loadedInstanceFor:     null,
      loadedIoOptiomizedFor: null,

      regions:                   null,
      resourceGroups:            null,
      zones:                     null,
      vpcs:                      null,
      vSwitches:                 null,
      securityGroups:            null,
      instanceTypes:             null,
      availableInstanceTypes:    null,
      images:                    null,
      systemDiskCategories:      null,
      dataDiskCategories:        null,
      periodUnit:                null,
      spotDuration:              true,
      imageType:                 null,
      imageVersionChoose:        [],
      instanceTypeChangeLoading: false,
      vswitchIdLoading:          false,
      instanceTypeLoading:       false,
      instanceTypeErrors:        [],
    };
  },
  mounted() {
    // 编辑模式仅加载选项数据，不写入默认值
    this.value?.vpcId && this.vpcChangeFetch();
    this.value?.instanceType && this.instanceChangeFetch();

    this.initInstanceChargeType();
  },
  watch: {
    'credentialId'() {
      this.$fetch();
    },
  },
  methods: {
    stringify,
    async fetchInstanceTypes({ cloudCredentialId, regionId } = {}) {
      this.instanceTypeErrors = [];

      const cloudCredential = cloudCredentialId || this.credentialId;
      const region = regionId || (this.value?.region || this.$store.getters['aliyun/defaultRegion']);

      if (!cloudCredential || !region) {
        return;
      }
      this.instanceTypeLoading = true;
      try {
        const zoneId = this.value?.zone;
        const instanceChargeType = this.value?.instanceChargeType;
        const [all, allow] = await Promise.all([
          this.$store.dispatch('aliyun/instanceTypes', { cloudCredentialId: cloudCredential, regionId: region }),
          this.$store.dispatch('aliyun/availableInstanceTypes', {
            cloudCredentialId:   cloudCredential,
            regionId:            region,
            destinationResource: 'InstanceType',
            zoneId,
            instanceChargeType,
          }),
        ]);
        const allowSet = new Set(allow || []);
        // availableInstanceTypes
        const filtered = (all || []).filter((obj) => allowSet.has(obj.InstanceTypeId));

        this.availableInstanceTypes = sortBy(filtered, ['isDefault:desc', 'InstanceTypeFamily']);
        this.instanceTypes = all || this.instanceTypes || [];
        // 实例类型列表就绪后，尝试设置默认规格并触发镜像/磁盘联动
        await this.applyDefaultInstanceTypeAndCascade();
      } catch (e) {
        this.instanceTypeErrors = exceptionToErrorsArray(e);
      } finally {
        this.instanceTypeLoading = false;
      }
    },

    async vpcChangeFetch() {
      const cloudCredentialId = this.credentialId;
      const { region, vpcId, ResourceGroupId } = this.value || {};

      if (!vpcId) {
        return;
      }
      this.vswitchIdLoading = true;
      try {
        const [vSwitches, securityGroups] = await Promise.all([
          this.$store.dispatch('aliyun/vSwitches', {
            cloudCredentialId,
            regionId: region,
            vpcId,
            ResourceGroupId,
          }),
          this.$store.dispatch('aliyun/securityGroups', {
            cloudCredentialId,
            regionId: region,
            vpcId,
          }),
        ]);

        this.vSwitches = vSwitches;
        this.securityGroups = securityGroups;

        const sg = this.value?.securityGroup;
        const hasCustomSg = !!sg && (!!findBy(this.securityGroupOptions, 'value', sg) || sg !== DEFAULT_GROUP);

        this.securityGroupMode = hasCustomSg ? 'custom' : 'default';
      } catch (e) {
        this.errors = exceptionToErrorsArray(e);
      } finally {
        this.vswitchIdLoading = false;
      }
    },
    // 实例类型变更后拉取镜像、系统盘/数据盘可用类型
    // applyDefaults=true 时才会写入镜像/磁盘默认值（新建或用户手动切换实例类型）
    async instanceChangeFetch({ applyDefaults = false } = {}) {
      const cloudCredentialId = this.credentialId;
      const {
        region,
        instanceType,
        zone: zoneId,
        ioOptimized,
        resourceGroupId,
        systemDiskCategory,
        imageId,
      } = this.value || {};

      if (!instanceType) {
        return;
      }

      const hash = {
        images: this.$store.dispatch('aliyun/images', {
          cloudCredentialId,
          regionId:             region,
          instanceType,
          imageOwnerAlias:      'system',
          isSupportIoOptimized: true,
          resourceGroupId,
        }),
        systemDiskCategories: this.$store.dispatch('aliyun/systemDiskCategories', {
          cloudCredentialId,
          regionId:            region,
          zoneId,
          instanceType,
          networkCategory:     'vpc',
          ioOptimized,
          destinationResource: 'SystemDisk',
        }),
        dataDiskCategories: this.$store.dispatch('aliyun/dataDiskCategories', {
          cloudCredentialId,
          regionId:            region,
          zoneId,
          instanceType,
          systemDiskCategory,
          networkCategory:     'vpc',
          ioOptimized,
          destinationResource: 'DataDisk',
        }),
      };

      this.instanceTypeChangeLoading = true;
      try {
        const { images, systemDiskCategories, dataDiskCategories } = await allHash(hash);

        this.images = images;
        this.systemDiskCategories = systemDiskCategories;
        this.dataDiskCategories = dataDiskCategories;

        const { imageType, imageVersionChoose } = this.resolveImageSelection({ images, imageId });

        this.imageType = imageType;
        this.imageVersionChoose = imageVersionChoose;

        if (applyDefaults) {
          await this.$nextTick();
          // 联动填充：系统镜像、镜像版本、系统盘类型与大小
          this.applyInstanceLinkedDefaults();
        }
      } catch (e) {
        this.errors = exceptionToErrorsArray(e);
      } finally {
        this.instanceTypeChangeLoading = false;
      }
    },
    resolveImageSelection({ images, imageId }) {
      let imageType = this.imageType;
      let imageVersionChoose = this.imageVersionChoose;

      if (!imageId) {
        imageType = imageType || this.imageTypeChoose?.[0]?.value;
        imageVersionChoose = this.groupImages?.[imageType] || [];

        return { imageType, imageVersionChoose };
      }

      const found = findBy(images, 'ImageId', imageId);

      if (found) {
        imageType = found?.Platform;
        imageVersionChoose = this.groupImages?.[imageType] || [];

        return { imageType, imageVersionChoose };
      }

      const { systemName } = this.parseImageIdFallback(imageId);

      imageType = systemName;
      imageVersionChoose = (this.groupImages?.[imageType] || []).slice();

      return { imageType, imageVersionChoose };
    },
    parseImageIdFallback(imageId) {
      const segments = String(imageId).split('_');
      const name = segments[0] || '';

      const systemName = ({
        anolisos:   () => 'Anolis',
        centos:     () => (segments[1] === 'stream' ? 'CentOS Stream' : 'CentOS'),
        coreos:     () => 'CoreOS',
        fcos:       () => 'Fedora CoreOS',
        rockylinux: () => 'Rocky Linux',
        opensuse:   () => 'openSUSE',
      }[name]?.() || this.capitalizeFirst(name));

      return {
        systemName,
        label: `${ systemName } ${ imageId }`,
      };
    },
    updateTags(tag) {
      const ary = [];

      for ( const k in tag ) {
        ary.push(`${ k }=${ tag[k] }`);
      }

      this.value.tag = ary;
    },
    initTags() {
      const parts = this.value.tag || [];
      const out = {};
      let i = 0;

      while ( i < parts.length ) {
        const arr = parts[i].split('=');
        const key = arr[0];
        const value = arr[1];

        if ( key ) {
          out[key] = value;
        }
        i += 1;
      }
      this.tag = out;
    },
    test() {
      const errors = [];
      const requiredList = [
        'zone',
        'vpcId',
        'vswitchId',
        'instanceType',
        'diskFs',
        'internetChargeType',
        'imageId',
        'systemDiskCategory',
        'instanceChargeType',
        'systemDiskSize',
      ];

      requiredList.forEach((item) => {
        if (!this.value?.[item]) {
          const key = this.t(`cluster.machineConfig.aliyunecs.${ item }.label`);

          errors.push(this.t('validation.required', { key }, true));
        }
      });

      if (this.instanceChargeType === 'PrePaid') {
        if (!this.value.period) {
          const key = this.t('cluster.machineConfig.aliyunecs.periodUnit.label');

          errors.push(this.t('validation.required', { key }, true));
        }
      } else if (this.instanceChargeType === 'SpotStrategy' && this.value.spotStrategy === 'SpotWithPriceLimit') {
        if (!this.value.spotPriceLimit) {
          const key = this.t('cluster.machineConfig.aliyunecs.spotPriceLimit.label');

          errors.push(this.t('validation.required', { key }, true));
        }
      }

      return { errors };
    },
    unitInputRangeLimit(ele, min, max, key) {
      this.$nextTick(() => {
        const value = ele?.target?.value;

        if (!value) {
          this.value[key] = min.toString();

          return;
        }

        if (value < min) {
          this.value[key] = min.toString();
        }

        if (value > max) {
          this.value[key] = max.toString();
        }
      });
    },
    initInstanceChargeType() {
      let instanceChargeType = this.value?.instanceChargeType || this.instanceChargeType;

      if (instanceChargeType === 'PrePaid') {
        this.periodUnit = `${ this.value.period }_${ this.value.periodUnit }`;
      }
      if (this.value.spotStrategy && this.value.spotStrategy !== 'NoSpot') {
        instanceChargeType = 'SpotStrategy';
      }
      this.instanceChargeType = instanceChargeType;
    },
    getAvailableInstanceTypes() {
      const hash = {};
      const cloudCredentialId = this?.credentialId;
      const regionId = this.value.region;

      hash.availableInstanceTypes = this.$store.dispatch('aliyun/availableInstanceTypes', {
        cloudCredentialId, regionId, destinationResource: 'InstanceType', zoneId: this.value?.zone, instanceChargeType: this.value?.instanceChargeType
      });
      allHash(hash).then(async(h) => {
        const out = (this.instanceTypes || []).filter((obj) => h.availableInstanceTypes.includes(obj.InstanceTypeId));

        this.availableInstanceTypes = sortBy(out, ['isDefault:desc', 'InstanceTypeFamily']);
        // 新建时：当前规格在新计费方式下不可用时清空，再尝试重新选默认规格
        if (
          this.shouldApplyDefaults &&
          this.value.instanceType &&
          !h.availableInstanceTypes.includes(this.value.instanceType)
        ) {
          this.value.instanceType = '';
        }

        await this.applyDefaultInstanceTypeAndCascade();
      });
    },
    // 切换系统镜像类型时，自动选中该类型下第一个镜像版本
    imageTypeChanged(val) {
      let imageVersionChoose = [];

      if (val && this.groupImages) {
        imageVersionChoose = this.groupImages[val] || [];
      }
      this.imageVersionChoose = imageVersionChoose;
      this.value.imageId = imageVersionChoose?.[0]?.value || '';
    },
    capitalizeFirst(str) {
      if (typeof str !== 'string' || str.length === 0) return str;

      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    onPrivateAddressOnlyChange(next) {
      this.value.privateAddressOnly = next;
      if (next) {
        this.value.allocatePublicStaticIp = false;
      }
    },
    onAllocatePublicStaticIpChange(next) {
      this.value.allocatePublicStaticIp = next;
      if (next) {
        this.value.privateAddressOnly = false;
      }
    },
    isUnset(val) {
      // 空字符串也视为未设置，用于默认值判断
      return val === undefined || val === null || val === '';
    },
    applyDefaultZoneIfNeeded() {
      // 新建时默认选中第一个可用区
      if (!this.shouldApplyDefaults || !this.isUnset(this.value?.zone)) {
        return false;
      }

      const zone = this.defaultValue?.zone || this.zones?.[0]?.ZoneId;

      if (zone) {
        this.value.zone = zone;

        return true;
      }

      return false;
    },
    applyDefaultVpcIfNeeded() {
      // 新建时默认选中标记为 IsDefault 的 VPC，否则取第一个
      if (!this.shouldApplyDefaults || !this.isUnset(this.value?.vpcId)) {
        return false;
      }

      const vpc = this.vpcs?.find((obj) => obj.IsDefault) || this.vpcs?.[0];

      if (vpc?.VpcId) {
        this.value.vpcId = vpc.VpcId;

        return true;
      }

      return false;
    },
    applyDefaultVswitchIfNeeded() {
      if (!this.shouldApplyDefaults || !this.isUnset(this.value?.vswitchId)) {
        return false;
      }

      const vswitches = (this.vSwitches || []).filter((obj) => obj.ZoneId === this.value?.zone);
      const vswitch = vswitches.find((obj) => obj.IsDefault) || vswitches[0];

      if (vswitch?.VSwitchId) {
        this.value.vswitchId = vswitch.VSwitchId;

        return true;
      }

      return false;
    },
    resetInstanceLinkedFields() {
      // 实例类型变更时清空镜像/磁盘相关字段，避免残留旧联动数据
      this.imageType = '';
      this.imageVersionChoose = [];
      this.value.imageId = '';
      this.value.systemDiskCategory = '';
      this.value.diskCategory = '';
      this.value.systemDiskSize = '';
      this.images = null;
      this.systemDiskCategories = null;
      this.dataDiskCategories = null;
    },
    applyInstanceLinkedDefaults() {
      // 填充实例类型关联字段：镜像类型/版本、系统盘类型与最小容量
      if (this.isUnset(this.value?.imageId)) {
        const imageType = this.imageType || this.imageTypeChoose?.[0]?.value;

        if (imageType) {
          this.imageType = imageType;
          this.imageVersionChoose = this.groupImages?.[imageType] || [];
          const firstImage = this.imageVersionChoose?.[0]?.value;

          if (firstImage) {
            this.value.imageId = firstImage;
          }
        }
      }

      if (this.isUnset(this.value?.systemDiskCategory) && this.systemDiskCategoryOptions?.length) {
        this.value.systemDiskCategory = this.systemDiskCategoryOptions[0].value;
      }

      if (this.isUnset(this.value?.systemDiskSize)) {
        this.value.systemDiskSize = String(this.systemDiskCategorySize.Min);
      }
    },
    async applyDefaultInstanceTypeAndCascade() {
      // 设置默认实例类型后，继续拉取并填充镜像/磁盘联动字段
      if (!this.applyDefaultInstanceTypeIfNeeded()) {
        return false;
      }

      await this.instanceChangeFetch({ applyDefaults: true });

      return true;
    },
    applyDefaultInstanceTypeIfNeeded() {
      // 仅新建且 instanceType 为空时写入默认规格
      if (!this.shouldApplyDefaults || !this.isUnset(this.value?.instanceType)) {
        return false;
      }

      const defaultInstanceType = this.resolveDefaultInstanceTypeId(this.availableInstanceTypes);

      if (defaultInstanceType) {
        this.value.instanceType = defaultInstanceType;

        return true;
      }

      return false;
    },
    resolveDefaultInstanceTypeId(types = []) {
      if (!types?.length) {
        return '';
      }

      // 优先 2 核 8 GiB，没有则取列表第一项
      const exact = types.find(
        (obj) => Number(obj.CpuCoreCount) === DEFAULT_INSTANCE_CPU &&
          Number(obj.MemorySize) === DEFAULT_INSTANCE_MEMORY
      );

      return exact?.InstanceTypeId || types[0]?.InstanceTypeId || '';
    },
    setIfUnset(key, fallback) {
      if (!this.value) {
        return;
      }
      if (this.isUnset(this.value[key])) {
        this.value[key] = fallback;
      }
    },
    setDefaultIfUnset(key, fallback) {
      // 仅新建/poolCreateMode 时填充默认值，编辑已有配置不修改
      if (!this.shouldApplyDefaults) {
        return;
      }

      this.setIfUnset(key, fallback);
    },
    updateRegion() {
      this.resetValue();
      this.value.zone = '';
      this.$fetch();
    },
    updateResourceGroupId() {
      this.$fetch();
    },
    updateZone(val) {
      if (val) {
        // 切换可用区会清空 VPC/交换机/实例类型等下游字段，再重新走默认值流程
        this.resetValue();
        this.$fetch();
      }
    },
    updateVpcId(val) {
      if (val) {
        this.value.vswitchId = '';
        // 切换 VPC 只刷新交换机/安全组，不重新请求实例类型（实例类型与可用区相关）
        this.vpcChangeFetch().then(() => {
          this.applyDefaultVswitchIfNeeded();
        });
      }
    },
    updateInstanceType(val) {
      const previous = this.value?.instanceType;

      // AliyunInstanceType 使用 :value 单向绑定，需在此写入 instanceType
      this.value.instanceType = val;

      if (!val) {
        this.resetInstanceLinkedFields();

        return;
      }

      if (val !== previous) {
        this.resetInstanceLinkedFields();
        // 用户手动切换实例类型时，重新初始化镜像/磁盘联动值
        this.instanceChangeFetch({ applyDefaults: true });
      }
    },
    updateInstanceChargeType(val) {
      this.value.instanceChargeType = val;
      if (val === 'SpotStrategy') {
        this.value.instanceChargeType = this.defaultValue?.instanceChargeType;
        this.value.spotDuration = '1';
        this.spotDuration = true;
        this.value.spotStrategy = 'SpotAsPriceGo';
      } else {
        this.value.spotStrategy = this.defaultValue.spotStrategy;
        delete this.value.spotDuration;
        delete this.value.spotStrategy;
      }
      if (this.value.instanceChargeType === this.defaultValue?.instanceChargeType) {
        delete this.value.period;
        delete this.value.periodUnit;
      }
      this.getAvailableInstanceTypes();
    },
    updatePeriodUnit(val) {
      if (val) {
        const ary = val.split('_');

        if (ary[1]) {
          this.value.period = ary[0];
          this.value.periodUnit = ary[1];
        }
      } else {
        delete this.value.period;
        delete this.value.periodUnit;
      }
    },
    updateSpotDuration(val) {
      this.value.spotDuration = val ? '1' : '0';
    },
    updateSecurityGroupMode(val) {
      const cur = this.value?.securityGroup;

      if (val === 'default') {
        // Only force DEFAULT_GROUP when it isn't already set.
        if (cur !== DEFAULT_GROUP) {
          this.value.securityGroup = DEFAULT_GROUP;
        }

        return;
      }
      // val !== 'default' -> custom mode
      if (cur !== DEFAULT_GROUP) {
        return;
      }
      // If it is DEFAULT_GROUP but DEFAULT_GROUP is not a valid selectable option,
      // clear it to let user pick a real security group.
      const hasDefaultOption = !!findBy(this.securityGroupOptions || [], 'value', DEFAULT_GROUP);

      if (!hasDefaultOption) {
        this.value.securityGroup = null;
      }
    },
    resetValue() {
      if (this.value) {
        this.value.vpcId = '';
        this.value.vswitchId = '';
        this.value.instanceType = '';
        this.imageType = '';
        this.value.imageId = '';
        this.value.systemDiskCategory = '';
        this.value.diskCategory = '';
      }
    },
  },
  computed: {
    defaultGroup() {
      return DEFAULT_GROUP;
    },
    securityGroupLabels() {
      return [
        this.t('cluster.machineConfig.aliyunecs.securityGroup.mode.default', { defaultGroup: DEFAULT_GROUP }),
        this.t('cluster.machineConfig.aliyunecs.securityGroup.mode.custom')
      ];
    },
    regionOptions() {
      if ( !this.regions ) {
        return [];
      }

      return this.regions.map((obj) => {
        return {
          label: obj.LocalName,
          value: obj.RegionId,
        };
      });
    },
    zoneOptions() {
      if ( !this.zones ) {
        return [];
      }

      return this.zones.map((obj) => {
        return {
          label: obj.LocalName,
          value: obj.ZoneId,
        };
      });
    },
    resourceGroupOptions() {
      if ( !this.resourceGroups ) {
        return [];
      }

      const out = this.resourceGroups.map((obj) => {
        return {
          label: `${ obj.DisplayName || obj.Name } (${ obj.Id })`,
          value: obj.Id,
        };
      }).sort();

      out.unshift({
        label: this.t('cluster.machineConfig.aliyunecs.resourceGroup.all'),
        value: ''
      });

      return out;
    },
    vpcOptions() {
      if ( !this.vpcs ) {
        return [];
      }

      return this.vpcs.map((obj) => {
        return {
          label: `${ obj.IsDefault ? this.t('cluster.machineConfig.aliyunecs.vpcId.default') : obj.VpcName } (${ obj.VpcId })`,
          value: obj.VpcId,
        };
      }).sort();
    },
    securityGroupOptions() {
      if ( !this.securityGroups ) {
        return [];
      }

      return this.securityGroups.map((obj) => {
        return {
          label: `${ obj.SecurityGroupName } (${ obj.SecurityGroupId })`,
          value: obj.SecurityGroupName,
        };
      }).sort();
    },
    vSwitcheOptions() {
      if ( !this.vSwitches ) {
        return [];
      }

      return this.vSwitches.filter((i) => i.ZoneId === this.value.zone).map((obj) => {
        return {
          label: `${ obj.IsDefault ? this.t('cluster.machineConfig.aliyunecs.vswitchId.default') : obj.VSwitchName } (${ obj.VSwitchId })`,
          value: obj.VSwitchId,
        };
      }).sort();
    },
    internetChargeTypeOptions() {
      return OPTION_CHARGETYPES.map((item) => ({
        value: item.value,
        label: this.t(item.label),
      }));
    },
    instanceTypeTableOptions() {
      // 供 AliyunInstanceType 表格展示的扁平化选项
      if (!this.availableInstanceTypes) {
        return [];
      }

      return this.availableInstanceTypes.map((obj) => ({
        label:  `${ obj.InstanceTypeId } ( ${ obj.CpuCoreCount } ${ obj.CpuCoreCount > 1 ? 'Cores' : 'Core' } ${ obj.MemorySize }GB RAM )`,
        value:  obj.InstanceTypeId,
        group:  obj.InstanceTypeFamily,
        vcpus:  obj.CpuCoreCount,
        memory: obj.MemorySize,
        raw:    obj,
      }));
    },
    defaultInstanceTypeId() {
      return this.resolveDefaultInstanceTypeId(this.availableInstanceTypes);
    },
    shouldApplyDefaults() {
      console.log(this.poolCreateMode);

      // 新建集群或编辑时新增 Machine Pool 才自动填默认值
      return this.isCreate || this.poolCreateMode;
    },
    groupImages() {
      if ( !this.images ) {
        return [];
      }
      const out = {};

      this.images.forEach((obj) => {
        if (!out[obj.Platform]) {
          out[obj.Platform] = [];
        }

        out[obj.Platform].push({
          label: obj.ImageOwnerAlias === 'system' ? obj.OSName : obj.ImageName,
          value: obj.ImageId,
          raw:   obj,
        });
      });

      return out;
    },
    imageTypeChoose() {
      return Object.keys(this.groupImages).map((key) => {
        return {
          label: key,
          value: key
        };
      });
    },
    systemDiskCategoryOptions() {
      if ( !this.systemDiskCategories ) {
        return [];
      }
      const out = [];

      DISKS.forEach((disk) => {
        if (this.systemDiskCategories.includes(disk.value)) {
          out.push({
            label: disk?.label ? this.t(disk.label) : disk.value,
            value: disk.value,
          });
        }
      });

      return out;
    },
    diskCategoryOptions() {
      if ( !this.dataDiskCategories ) {
        return [];
      }
      const out = [];

      DISKS.forEach((disk) => {
        if (this.dataDiskCategories.includes(disk.value)) {
          out.push({
            label: disk?.label ? this.t(disk.label) : disk.value,
            value: disk.value,
          });
        }
      });

      return out;
    },
    instanceChargeTypeOptions() {
      const options = ['prePaid', 'postPaid', 'spotStrategy'];

      return options.map((o) => {
        return {
          label: this.t(`cluster.machineConfig.aliyunecs.instanceChargeType.${ o }`),
          value: upperFirst(o),
        };
      });
    },
    periodUnitOptions() {
      const out = [];

      periodWeek.forEach((item) => {
        out.push({
          label: `${ item }${ this.t('cluster.machineConfig.aliyunecs.periodUnit.week') }`,
          value: `${ item }_Week`
        });
      });
      periodMonth.forEach((item) => {
        const month = Number(item);
        let label = '';

        if (month === 6) {
          label = `${ this.t('cluster.machineConfig.aliyunecs.periodUnit.half') }${ this.t('cluster.machineConfig.aliyunecs.periodUnit.year') }`;
        } else if (month % 12 === 0) {
          const year = month / 12;

          label = `${ year } ${ this.t('cluster.machineConfig.aliyunecs.periodUnit.year') }`;
        } else {
          label = `${ item } ${ this.t('cluster.machineConfig.aliyunecs.periodUnit.month') }`;
        }
        out.push({
          label,
          value: `${ item }_Month`
        });
      });

      return out;
    },
    systemDiskCategorySize() {
      const size = this.defaultValue.systemDiskSize;

      if ( this.value.systemDiskCategory && this.value.systemDiskCategory === 'cloud_auto' ) {
        size.Min = 40;
      } else {
        size.Min = 20;
      }

      return size;
    },
    diskCategorySize() {
      const size = this.defaultValue.dataDiskSize;

      if ( this.value.diskCategory && this.value.diskCategory === 'cloud_auto' ) {
        size.Min = 40;
      } else {
        size.Min = 20;
      }

      return size;
    }
  }
};
</script>

<template>
  <div>
    <Loading v-if="$fetchState.pending" />
    <template v-else>
      <div v-if="errors.length">
        <div
          v-for="(err, idx) in errors"
          :key="idx"
        >
          <Banner
            color="error"
            :label="stringify(err)"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.resourceGroupId"
            :mode="mode"
            :options="resourceGroupOptions"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.resourceGroup.label')"
            @update:value="updateResourceGroupId"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.region"
            :mode="mode"
            :options="regionOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.region.label')"
            @update:value="updateRegion"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.zone"
            :mode="mode"
            :options="zoneOptions"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.zone.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.zone.prompt')"
            @update:value="updateZone"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.vpcId"
            :mode="mode"
            :options="vpcOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.vpcId.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.vpcId.prompt')"
            @update:value="updateVpcId"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.vswitchId"
            :mode="mode"
            :options="vSwitcheOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :loading="vswitchIdLoading"
            :label="t('cluster.machineConfig.aliyunecs.vswitchId.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.vswitchId.prompt')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-12">
          <AliyunInstanceType
            :value="value.instanceType"
            :mode="mode"
            :options="instanceTypeTableOptions"
            :disabled="disabled"
            :loading="instanceTypeLoading"
            @update:value="updateInstanceType"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.internetChargeType"
            :mode="mode"
            :options="internetChargeTypeOptions"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.internetChargeType.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.internetChargeType.prompt')"
          />
        </div>
        <div class="col span-6">
          <UnitInput
            v-model:value="value.internetMaxBandwidth"
            output-as="string"
            :mode="mode"
            :disabled="disabled"
            :min="1"
            :max="100"
            :label="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.placeholder')"
            :suffix="t('cluster.machineConfig.aliyunecs.internetMaxBandwidth.suffix')"
            @blur="unitInputRangeLimit($event, 1, 100, 'internetMaxBandwidth')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="imageType"
            :mode="mode"
            :options="imageTypeChoose"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.imageId.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.imageId.placeholder')"
            :loading="instanceTypeChangeLoading"
            @update:value="imageTypeChanged"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.imageId"
            :mode="mode"
            :options="imageVersionChoose"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :loading="instanceTypeChangeLoading"
            :label="t('cluster.machineConfig.aliyunecs.systemImageVersion.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.systemImageVersion.placeholder')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.systemDiskCategory"
            :mode="mode"
            :options="systemDiskCategoryOptions"
            :loading="instanceTypeChangeLoading"
            :required="true"
            :searchable="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.systemDiskCategory.label')"
          />
        </div>
        <div class="col span-6">
          <UnitInput
            v-model:value="value.systemDiskSize"
            output-as="string"
            :mode="mode"
            :min="20"
            :max="500"
            :disabled="disabled"
            :required="true"
            :label="t('cluster.machineConfig.aliyunecs.systemDiskSize.label')"
            :placeholder="t('cluster.machineConfig.aliyunecs.systemDiskSize.placeholder', {min: systemDiskCategorySize.Min, max: systemDiskCategorySize.Max})"
            :suffix="t('cluster.machineConfig.aliyunecs.systemDiskSize.suffix')"
            @blur="unitInputRangeLimit($event, systemDiskCategorySize.Min, 500, 'systemDiskSize')"
          />
        </div>
      </div>
      <div class="row mb-20">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="value.diskFs"
            :mode="mode"
            :options="['ext4','xfs']"
            :required="true"
            :disabled="disabled"
            :label="t('cluster.machineConfig.aliyunecs.diskFs.label')"
          />
        </div>
      </div>
      <portal :to="'advanced-'+uuid">
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              v-model:value="value.slbId"
              :mode="mode"
              :disabled="disabled"
              :placeholder="t('cluster.machineConfig.aliyunecs.aliyunSLB.placeholder')"
              :label="t('cluster.machineConfig.aliyunecs.aliyunSLB.label')"
            />
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="value.diskCategory"
              :mode="mode"
              :options="diskCategoryOptions"
              :loading="instanceTypeChangeLoading"
              :searchable="true"
              :disabled="disabled"
              :label="t('cluster.machineConfig.aliyunecs.diskCategory.label')"
            />
          </div>
          <div class="col span-6">
            <UnitInput
              v-model:value="value.diskSize"
              output-as="string"
              :mode="mode"
              :min="20"
              :max="32768"
              :disabled="disabled"
              :label="t('cluster.machineConfig.aliyunecs.diskSize.label')"
              :placeholder="t('cluster.machineConfig.aliyunecs.diskSize.placeholder', {min: diskCategorySize.Min, max: diskCategorySize.Max})"
              :suffix="t('cluster.machineConfig.aliyunecs.diskSize.suffix')"
            />
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="instanceChargeType"
              :mode="mode"
              :options="instanceChargeTypeOptions"
              :required="true"
              :searchable="true"
              :disabled="disabled"
              :label="t('cluster.machineConfig.aliyunecs.instanceChargeType.label')"
              @update:value="updateInstanceChargeType"
            />
          </div>
          <div
            v-if="instanceChargeType === 'PrePaid'"
            class="col span-6"
          >
            <LabeledSelect
              v-model:value="periodUnit"
              :mode="mode"
              :options="periodUnitOptions"
              :required="true"
              :searchable="true"
              :disabled="disabled"
              :placeholder="t('cluster.machineConfig.aliyunecs.periodUnit.placeholder')"
              :label="t('cluster.machineConfig.aliyunecs.periodUnit.label')"
              @update:value="updatePeriodUnit"
            />
          </div>
        </div>
        <div
          v-if="instanceChargeType === 'SpotStrategy'"
          class="row mb-20"
        >
          <div class="col span-6">
            <div class="title">
              <h3>
                {{ t('cluster.machineConfig.aliyunecs.spotDuration.label') }}
              </h3>
            </div>
            <RadioGroup
              v-model:value="spotDuration"
              name="spotDuration"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('cluster.machineConfig.aliyunecs.spotDuration.default'), t('cluster.machineConfig.aliyunecs.spotDuration.none')]"
              :options="[true,false]"
              @update:value="updateSpotDuration"
            />
          </div>
          <div class="col span-6">
            <div class="title">
              <h3>{{ t('cluster.machineConfig.aliyunecs.spotStrategy.label') }}</h3>
            </div>
            <RadioGroup
              v-model:value="value.spotStrategy"
              name="spotStrategy"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('cluster.machineConfig.aliyunecs.spotStrategy.spotAsPriceGo'), t('cluster.machineConfig.aliyunecs.spotStrategy.spotWithPriceLimit')]"
              :options="['SpotAsPriceGo', 'SpotWithPriceLimit']"
            />
            <UnitInput
              v-if="value.spotStrategy === 'SpotWithPriceLimit'"
              v-model:value="value.spotPriceLimit"
              output-as="string"
              :mode="mode"
              :min="0"
              :max="10000"
              :max-precision="3"
              :disabled="disabled"
              :suffix="t('cluster.machineConfig.aliyunecs.spotStrategy.suffix')"
            />
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            <div class="title">
              <h3>{{ t('cluster.machineConfig.aliyunecs.ioOptimized.label') }}</h3>
            </div>
            <RadioGroup
              v-model:value="value.ioOptimized"
              name="ioOptimized"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('generic.yes'), t('generic.no')]"
              :options="['optimized','none']"
            />
          </div>
          <div class="col span-6">
            <div class="title">
              <h3>{{ t('cluster.machineConfig.aliyunecs.upgradeKernel.label') }}</h3>
            </div>
            <RadioGroup
              v-model:value="value.upgradeKernel"
              name="upgradeKernel"
              :mode="mode"
              :disabled="disabled"
              :labels="[t('generic.yes'), t('generic.no')]"
              :options="[true,false]"
            />
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-6">
            <ArrayList
              v-model:value="value.openPort"
              table-class="fixed"
              :mode="mode"
              :title="t('cluster.machineConfig.azure.openPort.label')"
              :add-label="t('cluster.machineConfig.azure.openPort.add')"
              :show-protip="true"
              :protip="t('cluster.machineConfig.azure.openPort.help')"
              :disabled="disabled"
            />
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-12">
            <h3>
              {{ t('cluster.machineConfig.aliyunecs.securityGroup.title') }}
              <span
                v-if="!value.vpcId"
                class="text-muted text-small"
              >
                {{ t('cluster.machineConfig.aliyunecs.securityGroup.vpcId') }}
              </span>
            </h3>
            <RadioGroup
              v-model:value="securityGroupMode"
              name="securityGroupMode"
              :mode="mode"
              :disabled="!value.vpcId || disabled"
              :labels="securityGroupLabels"
              :options="['default','custom']"
              @update:value="updateSecurityGroupMode"
            />
            <LabeledSelect
              v-if="value.vpcId && securityGroupMode === 'custom'"
              v-model:value="value.securityGroup"
              :mode="mode"
              :disabled="!value.vpcId || disabled"
              :options="securityGroupOptions"
              :searchable="true"
              :taggable="true"
              :create-option="createOption"
            />
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-12">
            <h3>
              {{ t('cluster.machineConfig.aliyunecs.networkInterface.label') }}
              <span
                class="text-muted text-small"
              >
                {{ t('cluster.machineConfig.aliyunecs.networkInterface.desc') }}
              </span>
            </h3>
            <div>
              <div>
                <Checkbox
                  v-model:value="value.privateAddressOnly"
                  :mode="mode"
                  :disabled="disabled"
                  :label="t('cluster.machineConfig.aliyunecs.privateAddressOnly.label')"
                  @update:value="onPrivateAddressOnlyChange"
                />
              </div>
              <div>
                <Checkbox
                  v-model:value="value.allocatePublicStaticIp"
                  :mode="mode"
                  :disabled="disabled"
                  :label="t('cluster.machineConfig.aliyunecs.allocatePublicStaticIp.label')"
                  @update:value="onAllocatePublicStaticIpChange"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="row mt-20">
          <div class="col span-12">
            <KeyValue
              :value="tag"
              :mode="mode"
              :read-allowed="false"
              :label="t('cluster.machineConfig.aliyunecs.tagTitle')"
              :add-label="t('labels.addTag')"
              :disabled="disabled"
              @update:value="updateTags"
            />
          </div>
        </div>
      </portal>
    </template>
  </div>
</template>
