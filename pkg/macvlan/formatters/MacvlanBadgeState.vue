<script>
import { BadgeState } from '@components/BadgeState';

const ACTIVE = 'Active';
const INIT = 'Init';
const PENDING = 'Pending';

export default {
  components: { BadgeState },
  props:      {
    value: {
      type:    String,
      default: ''
    },
    row: {
      type:     Object,
      required: true
    },
  },

  computed: {
    stateDisplay() {
      if (!this.row?.status?.phase) {
        return INIT;
      }

      return this.row?.status?.phase;
    },

    stateBackground() {
      if ( this.stateDisplay === ACTIVE ) {
        return 'bg-success';
      } else if ( this.stateDisplay === INIT || this.stateDisplay === PENDING ) {
        return 'bg-warning';
      } else {
        return 'bg-error';
      }
    },
  },
};
</script>

<template>
  <div>
    <BadgeState
      :color="stateBackground"
      :label="stateDisplay"
    />
  </div>
</template>
