<script>
import Brand from '@shell/mixins/brand';
import AutoLogout from '@shell/mixins/auto-logout';
import Inactivity from '@shell/components/Inactivity';

export default {
  components: { Inactivity },
  mixins:     [Brand, AutoLogout],
};
</script>

<template>
  <main class="main-layout">
    <router-view :key="$route.path" />

    <Inactivity />
  </main>
</template>

<style lang="scss" scoped>
</style>
