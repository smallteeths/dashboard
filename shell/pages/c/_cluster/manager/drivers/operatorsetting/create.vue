<script>
import ResourceDetail from '@shell/components/ResourceDetail';

export default {
  name:       'OperatorSettingCreate',
  components: { ResourceDetail },
};
</script>

<template>
  <ResourceDetail
    resource-override="operatorSetting"
    parent-route-override="c-cluster-manager-driver-operatorsetting"
  />
</template>
