<template>
  <VersionSwitchLayout>
    <template #default="{apiRequest}">
      <ProjectV1 :api-request="apiRequest" />
    </template>
    <template #v2="{apiRequest}">
      <ProjectV2 :api-request="apiRequest" />
    </template>
  </VersionSwitchLayout>
</template>

<script>
import VersionSwitchLayout from '@pkg/image-repo/components/VersionSwitchLayout.vue';
import ProjectV1 from '@pkg/image-repo/components/ProjectV1.vue';
import ProjectV2 from '@pkg/image-repo/components/ProjectV2.vue';

export default {
  components: {
    VersionSwitchLayout,
    ProjectV1,
    ProjectV2
  }
};
</script>
