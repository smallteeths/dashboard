
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

const clusterVersionRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterVersion ? intl.value('validation.required', { key: intl.value('tkeCn.version.label') }) : null;
  };
};

const zoneIdRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.zoneId ? intl.value('validation.required', { key: intl.value('tkeCn.zone.label') }) : null;
  };
};

const vpcIdRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.vpcId ? intl.value('validation.required', { key: intl.value('tkeCn.vpc.label') }) : null;
  };
};

const subnetIdRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.subnetId ? intl.value('validation.required', { key: intl.value('tkeCn.subnet.label') }) : null;
  };
};

const osNameRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.osName ? intl.value('validation.required', { key: intl.value('tkeCn.osName.label') }) : null;
  };
};

const clusterCidrRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterCidr ? intl.value('validation.required', { key: intl.value('tkeCn.clusterCidr.label') }) : null;
  };
};

const clusterValidate = (tkeConfig, intl) => {
  return () => {
    const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;
    let isValidate = false;

    if (cidrIPV4RegExp.test(tkeConfig.clusterCidr)) {
      isValidate = true;
    }

    return !isValidate ? intl.value('validation.required', { key: intl.value('tkeCn.clusterCidr.formatError') }) : null;
  };
};

const securityGroupRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.securityGroup ? intl.value('validation.required', { key: intl.value('tkeCn.securityGroup.label') }) : null;
  };
};

const clusterIDRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.clusterID ? intl.value('validation.required', { key: intl.value('tkeCn.clusterSelect.importCluster') }) : null;
  };
};

const masterInstanceTypeRequired = (tkeConfig, intl) => {
  return () => {
    return !tkeConfig?.instanceType ? intl.value('validation.required', { key: intl.value('tkeCn.instanceType.label') }) : null;
  };
};

const nodePoolNameRequired = (nodePools, intl) => {
  return (nodeName) => {
    if (nodeName !== undefined) {
      return nodeName === '' ? intl.value('validation.required', { key: intl.value('tkeCn.nodePoolName.label') }) : null;
    }

    return !!nodePools?.find((pool) => !pool.nodePoolName) ? intl.value('validation.required', { key: intl.value('tkeCn.nodePoolName.label') }) : null;
  };
};

const nodePoolNamesUnique = (nodePools, intl) => {
  return (nodeName) => {
    let out = '';
    const names = nodePools?.map((node) => node.nodePoolName);

    if (nodeName !== undefined) {
      const matchingNames = names.filter((n) => n === nodeName);

      return matchingNames.length > 1 ? intl.value('tkeCn.nodePoolName.same', nodeName) : null;
    }
    nodePools?.forEach((pool) => {
      const name = pool.nodePoolName;

      if (names.filter((n) => n === name).length > 1) {
        if (!out) {
          out = intl.value('tkeCn.nodePoolName.same');
        }
      }
    });

    return out;
  };
};

const instanceTypeRequired = (nodePools, intl) => {
  return (instanceType) => {
    if (instanceType !== undefined) {
      return instanceType === '' ? intl.value('validation.required', { key: intl.value('tkeCn.instanceType.label') }) : null;
    }

    return !!nodePools?.find((pool) => pool.nodePoolType !== 'super' && !pool.instanceType) ? intl.value('validation.required', { key: intl.value('tkeCn.instanceType.label') }) : null;
  };
};

const nodePoolOsNameRequired = (nodePools, intl) => {
  return (osName) => {
    if (osName !== undefined) {
      return osName === '' ? intl.value('validation.required', { key: intl.value('tkeCn.osName.label') }) : null;
    }

    return !!nodePools?.find((pool) => pool.nodePoolType !== 'super' && !pool.osName) ? intl.value('validation.required', { key: intl.value('tkeCn.osName.label') }) : null;
  };
};

const systemDiskTypeRequired = (nodePools, intl) => {
  return (systemDiskType) => {
    if (systemDiskType !== undefined) {
      return systemDiskType === '' ? intl.value('validation.required', { key: intl.value('tkeCn.systemDiskType.label') }) : null;
    }

    return !!nodePools?.find((pool) => pool.nodePoolType !== 'super' && !pool.systemDiskType) ? intl.value('validation.required', { key: intl.value('tkeCn.systemDiskType.label') }) : null;
  };
};

const nodePoolSubnetIdRequired = (nodePools, intl) => {
  return (subnetId) => {
    if (subnetId !== undefined) {
      return subnetId === '' ? intl.value('validation.required', { key: intl.value('tkeCn.subnet.label') }) : null;
    }

    return !!nodePools?.find((pool) => pool.nodePoolType !== 'super' && !pool.subnetId) ? intl.value('validation.required', { key: intl.value('tkeCn.subnet.label') }) : null;
  };
};

const nodePoolSecurityGroupRequired = (nodePools, intl) => {
  return (securityGroup) => {
    if (securityGroup !== undefined) {
      return securityGroup === '' ? intl.value('validation.required', { key: intl.value('tkeCn.securityGroup.label') }) : null;
    }

    return !!nodePools?.find((pool) => pool.nodePoolType !== 'super' && !pool.securityGroup) ? intl.value('validation.required', { key: intl.value('tkeCn.securityGroup.label') }) : null;
  };
};

const virtualNodePoolRequired = (nodePools, intl) => {
  const buildError = (fieldKey) => {
    return intl.value('validation.required', { key: `${ intl.value(fieldKey) }` });
  };

  const validateVirtualNodePool = (virtualNodePool) => {
    if (!virtualNodePool || typeof virtualNodePool !== 'object') {
      return buildError('tkeCn.fields.virtualNodes');
    }

    const securityGroupIds = Array.isArray(virtualNodePool.securityGroupIds) ? virtualNodePool.securityGroupIds : [];
    const virtualNodes = Array.isArray(virtualNodePool.virtualNodes) ? virtualNodePool.virtualNodes : [];
    // const subnetIds = Array.isArray(virtualNodePool.subnetIds) ? virtualNodePool.subnetIds : [];

    if (securityGroupIds.length === 0) {
      return buildError('tkeCn.fields.securityGroupIds');
    }

    if (virtualNodes.length === 0) {
      return buildError('tkeCn.fields.virtualNodes');
    }

    if (virtualNodes.length > 0) {
      const hasMissingSubnetId = virtualNodes.some((node) => !node?.subnetId);

      if (hasMissingSubnetId) {
        return buildError('tkeCn.fields.subnetId');
      }
    }

    // if (subnetIds.length === 0) {
    //   return buildError('tkeCn.virtualNodePool.fields.subnetIds');
    // }

    return null;
  };

  return (virtualNodePool) => {
    if (virtualNodePool !== undefined) {
      return validateVirtualNodePool(virtualNodePool);
    }
    const invalidSuperPool = (nodePools || []).find((pool) => {
      return pool.nodePoolType === 'super' && validateVirtualNodePool(pool.virtualNodePool);
    });

    if (!invalidSuperPool) {
      return null;
    }

    return validateVirtualNodePool(invalidSuperPool.virtualNodePool);
  };
};

export default {
  clusterIDRequired,
  regionIdRequired,
  containerRequired,
  nameRequired,
  clusterTypeRequired,
  clusterLevelRequired,
  clusterVersionRequired,
  zoneIdRequired,
  vpcIdRequired,
  subnetIdRequired,
  osNameRequired,
  clusterCidrRequired,
  clusterValidate,
  securityGroupRequired,
  nodePoolNameRequired,
  nodePoolNamesUnique,
  instanceTypeRequired,
  nodePoolOsNameRequired,
  systemDiskTypeRequired,
  nodePoolSubnetIdRequired,
  nodePoolSecurityGroupRequired,
  masterInstanceTypeRequired,
  virtualNodePoolRequired,
};
