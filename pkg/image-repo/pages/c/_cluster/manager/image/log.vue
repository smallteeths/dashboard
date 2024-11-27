<template>
  <VersionSwitchLayout>
    <template #default="{apiRequest}">
      <LogV1 :api-request="apiRequest" />
    </template>
    <template #v2="{apiRequest}">
      <LogV2 :api-request="apiRequest" />
    </template>
  </VersionSwitchLayout>
</template>

<script>
import VersionSwitchLayout from '@pkg/image-repo/components/VersionSwitchLayout.vue';
import LogV1 from '@pkg/image-repo/components/LogV1.vue';
import LogV2 from '@pkg/image-repo/components/LogV2.vue';

export default {
  components: {
    VersionSwitchLayout,
    LogV1,
    LogV2
  }
};
</script>
