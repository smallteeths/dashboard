
const nameRequired = (normanCluster, intl) => {
  return () => {
    return !normanCluster.value?.name ? intl.value('validation.required', { key: intl.value('nameNsDescription.name.label') }) : null;
  };
};

const regionIdRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.regionId ? intl.value('validation.required', { key: intl.value('cceCn.region.label') }) : null;
  };
};

export default {
  nameRequired,
  regionIdRequired,
};
