
const nameRequired = (normanCluster, intl) => {
  return () => {
    return !normanCluster.value?.name ? intl.value('validation.required', { key: intl.value('nameNsDescription.name.label') }) : null;
  };
};

const clusterIDRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.clusterID ? intl.value('validation.required', { key: intl.value('tkeCn.clusterSelect.importCluster') }) : null;
  };
};

export default {
  clusterIDRequired,
  nameRequired,
}
