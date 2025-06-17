
const nameRequired = (normanCluster, intl) => {
  return () => {
    return !normanCluster?.name ? intl.value('validation.required', { key: intl.value('nameNsDescription.name.label') }) : null;
  };
};

const regionIdRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.region ? intl.value('validation.required', { key: intl.value('tkeCn.region.label') }) : null;
  };
};

const containerRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.container ? intl.value('validation.required', { key: intl.value('tkeCn.container.label') }) : null;
  };
};

const clusterTypeRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterType ? intl.value('validation.required', { key: intl.value('tkeCn.clusterType.label') }) : null;
  };
};

const clusterLevelRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterLevel ? intl.value('validation.required', { key: intl.value('tkeCn.clusterLevel.label') }) : null;
  };
};

const clusterIDRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterID ? intl.value('validation.required', { key: intl.value('tkeCn.clusterSelect.importCluster') }) : null;
  };
};

export default {
  clusterIDRequired,
  regionIdRequired,
  containerRequired,
  nameRequired,
  clusterTypeRequired,
  clusterLevelRequired,
}
