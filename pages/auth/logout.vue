<script>
import { findBy } from '@/utils/array';
import { NORMAN } from '@/config/types';

export default {
  layout: 'unauthenticated',

  async asyncData({ redirect, store, router }) {
    const principals = await store.dispatch('rancher/findAll', {
      type: NORMAN.PRINCIPAL,
      opt:  { url: '/v3/principals', force: true }
    });
    const principal = findBy(principals, 'me', true);

    await store.dispatch('auth/logout', { provider: principal ? principal.provider : '' }, { root: true });
  }
};
</script>

<template>
  <main>
    <h1 class="text-center mt-50">
      Logging Out&hellip;
    </h1>
  </main>
</template>
