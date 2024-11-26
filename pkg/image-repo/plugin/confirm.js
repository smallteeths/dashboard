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
    app = createApp(Confirm, { ...options, onClose: () => clean() });
    Object.assign(app._context, appContext);
    container = document.createElement('div');
    el.appendChild(container);
    app.mount(container);
    app._instance.data.show = true;
  };

  return { show };
}
