import day from 'dayjs';
import { diffFrom } from '@shell/utils/time';
import { DATE_FORMAT, TIME_FORMAT } from '@shell/store/prefs';
import { escapeHtml } from '@shell/utils/string';

export default {
  methods: {
    timeFormatStr() {
      const dateFormat = escapeHtml( this.$store.getters['prefs/get'](DATE_FORMAT));
      const timeFormat = escapeHtml( this.$store.getters['prefs/get'](TIME_FORMAT));

      return `${ dateFormat }, ${ timeFormat }`;
    },
    liveUpdate(creationTime) {
      if (!creationTime) {
        return '-';
      }
      const now = day();
      const createdDate = day(creationTime);
      const revisionAgeObject = diffFrom(createdDate, now, this.t);

      return revisionAgeObject.string;
    },
    getTotalCount(resp) {
      const count = resp?._headers && resp?._headers['x-total-count'];

      return count ? parseInt(count, 10) : 0;
    },
    changeToBytes(size, unit) {
      const u = unit?.toUpperCase();

      console.log(u);
      if (u === 'MB') {
        return size * 1024 * 1024;
      } else if (u === 'GB') {
        return size * 1024 * 1024 * 1024;
      } else if ( u === 'TB') {
        return size * 1024 * 1024 * 1024 * 1024;
      } else {
        return -1;
      }
    },
    getRequestErrorMessage(error) {
      if (typeof error === 'object') {
        if (error?.message) {
          const errorMessage = error.message;

          return [errorMessage];
        }
        if (error?.errors?.length > 0) {
          const errorMessage = error.errors[0].message;

          return [errorMessage];
        }

        return ['unknown error'];
      }
      if (!error?.message) {
        return [error.message];
      }
      if (typeof error === 'string') {
        const jsonMatch = error.message.match(/{.*}/);

        if (jsonMatch) {
          const jsonString = jsonMatch[0];

          try {
            const errorObject = JSON.parse(jsonString);

            if (errorObject.errors && errorObject.errors.length > 0) {
              const errorMessage = errorObject.errors[0].message;

              return [errorMessage];
            }

            return ['unknown error'];
          } catch (e) {
            return ['unknown error'];
          }
        } else {
          return ['unknown error'];
        }
      }

      return ['unknown error'];
    }
  },
};
