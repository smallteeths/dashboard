function updateLoading(el, isLoading) {
  const loadingOverlay = el.querySelector('.v-loading-mask');

  if (loadingOverlay && !isLoading) {
    try {
      loadingOverlay.parentNode?.removeChild(loadingOverlay);
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
    }

    return;
  }

  if (!isLoading) return;

  if (!loadingOverlay) {
    const mask = document.createElement('div');

    mask.className = 'v-loading-mask';
    mask.innerHTML = `<div class="v-loading-spinner">
    <i
      v-if="loading"
      class="icon icon-spinner delayed-loader text-primary"
    />
  </div>`;
    el.appendChild(mask);
    el.style.position = 'relative';
    mask.style.display = 'block';
  }
}

const loading = {
  beforeMount(el, binding) {
    updateLoading(el, binding.value);
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      updateLoading(el, binding.value);
    }
  },
  unmounted(el) {
    updateLoading(el, false);
  },
};

export default loading;
