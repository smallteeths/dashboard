import Confirm from './ConfirmModal.vue';
import { createApp, onBeforeUnmount } from 'vue';

export default function useConfirm() {
  let app = null;
  let container = null;
  const clean = () => {
    // destroy app/component
    app?.unmount();
    container?.remove();
    app = null;
    container = null;
  };

  onBeforeUnmount(() => {
    clean();
  });
  const show = (options, appContext = {}, el = document.body) => {
    const onClose = () => clean();

    app = createApp(Confirm, {
      ...options,
      modelValue:            true,
      'onUpdate:modelValue': (v) => {
        if (!v) {
          // delete the confirm app
          onClose();
        }
      },
      // watch emit close
      onClose,
    });

    Object.assign(app._context, appContext);
    container = document.createElement('div');
    el.appendChild(container);
    app.mount(container);
  };

  return { show };
}
