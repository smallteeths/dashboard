export default {
  computed: {
    isSystemAdmin() {
      console.log(this.currentUser);

      return this?.currentUser?.sysadmin_flag || this?.currentUser?.has_admin_role;
    },
    isProjectAdmin() {
      console.log(this.project);
      if (this.isSystemAdmin) {
        return true;
      }

      return parseInt(this?.project?.current_user_role_id, 10) === 1;
    },
    isProjectMaster() {
      if (this.isSystemAdmin) {
        return true;
      }

      return parseInt(this?.project?.current_user_role_id, 10) === 4;
    },
    isMember() {
      if (this.isSystemAdmin) {
        return true;
      }

      return parseInt(this?.project?.current_user_role_id, 10) > 0;
    },
    isLimitedGuest() {
      if (this.isSystemAdmin) {
        return false;
      }

      return parseInt(this?.project?.current_user_role_id, 10) === 5;
    },
  },
};
