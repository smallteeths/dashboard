
const nameRequired = (normanCluster, intl) => {
  return () => {
    return !normanCluster.value?.name ? intl.value('validation.required', { key: intl.value('nameNsDescription.name.label') }) : null;
  };
};

const regionIdRequired = (ackConfig, intl) => {
  return () => {
    return !ackConfig.value?.regionId ? intl.value('validation.required', { key: intl.value('ackCn.region.label') }) : null;
  };
};

const clusterIdRequired = (ackConfig, intl) => {
  return () => {
    return !ackConfig.value?.cluster_id ? intl.value('validation.required', { key: intl.value('ackCn.clusterSelect.importCluster') }) : null;
  };
};

const vpcIdRequired = (ackConfig, intl) => {
  return () => {
    return !ackConfig.value?.vpcId ? intl.value('validation.required', { key: 'VPC' }) : null;
  };
};

const podCidrRequired = (ackConfig, intl, state) => {
  return () => {
    if (!state.value.isFlannel) {
      return null;
    }

    return !ackConfig.value?.containerCidr ? intl.value('validation.required', { key: 'Container CIDR' }) : null;
  };
};

const serviceCidrRequired = (ackConfig, intl) => {
  return () => {
    return !ackConfig.value?.serviceCidr ? intl.value('validation.required', { key: 'Service CIDR' }) : null;
  };
};

const vswitchIdsRequired = (state, intl) => {
  return () => {
    return !(state.value?.vswitchIds?.length > 0) ? intl.value('validation.required', { key: 'VSwitch' }) : null;
  };
};

const validatePodCidr = (ackConfig, intl, state) => {
  return () => {
    if (!state.value.isFlannel) {
      return null;
    }
    const containerCidr = ackConfig.value.containerCidr;

    return !validateCIDR(containerCidr) ? intl.value('ackCn.containerCidr.invalid') : null;
  };
};

const validateServiceCidr = (ackConfig, intl) => {
  return () => {
    const serviceCidr = ackConfig.value.serviceCidr;

    return !validateCIDR(serviceCidr) ? intl.value('ackCn.serviceCidr.invalid') : null;
  };
};

const validateCIDR = (cidr) => {
  if (typeof cidr !== 'string' || !cidr) return false;

  const [ip, mask] = cidr.split('/');

  if (!ip || mask === undefined) return false;

  const maskNum = parseInt(mask, 10);

  if (isNaN(maskNum)) return false;

  if (ip.includes('.')) {
    return isValidIPv4(ip) && maskNum >= 0 && maskNum <= 32;
  }

  if (ip.includes(':')) {
    return isValidIPv6(ip) && maskNum >= 0 && maskNum <= 128;
  }

  return false;
};

function isValidIPv4(ip) {
  const octets = ip.split('.');

  if (octets.length !== 4) return false;

  return octets.every((octet) => {
    if (octet === '' || octet.length > 3) return false;
    const num = parseInt(octet, 10);

    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === octet;
  });
}

function isValidIPv6(ip) {
  const fullIp = expandIPv6(ip);

  if (!fullIp) return false;

  const segments = fullIp.split(':');

  if (segments.length !== 8) return false;

  return segments.every((segment) => {
    if (segment === '' || segment.length > 4) return false;

    return /^[0-9a-fA-F]{1,4}$/.test(segment);
  });
}

function expandIPv6(ip) {
  if (!ip.includes(':')) return null;

  const parts = ip.split('::');

  if (parts.length > 2) return null;

  if (parts.length === 1) return ip;

  const [left, right = ''] = parts;
  const leftSegments = left ? left.split(':') : [];
  const rightSegments = right ? right.split(':') : [];
  const missingCount = 8 - (leftSegments.length + rightSegments.length);

  if (missingCount < 0) return null;

  return [...leftSegments, ...Array(missingCount).fill('0'), ...rightSegments].join(':');
}

const nodePoolNameRequired = (nodePools, intl) => {
  return (nodeName) => {
    if (nodeName !== undefined) {
      return nodeName === '' ? intl.value('validation.required', { key: intl.value('ackCn.nodePoolName.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.name) ? intl.value('validation.required', { key: intl.value('ackCn.nodePoolName.label') }) : null;
  };
};

const nodePoolNamesUnique = (nodePools, intl) => {
  return (nodeName) => {
    let out = '';

    const names = nodePools.value?.map((node) => node.name);

    if (nodeName !== undefined) {
      const matchingNames = names.filter((n) => n === nodeName);

      return matchingNames.length > 1 ? intl.value('ackCn.nodePoolName.unique') : null;
    }
    nodePools.value?.forEach((pool) => {
      const name = pool.name;

      if (names.filter((n) => n === name).length > 1) {
        if (!out) {
          out = intl.value('ackCn.nodePoolName.unique');
        }
      }
    });

    return out;
  };
};

const runtimeVersionRequired = (nodePools, intl) => {
  return (runtimeVersion) => {
    if (runtimeVersion !== undefined) {
      return runtimeVersion === '' ? intl.value('validation.required', { key: intl.value('ackCn.runtime.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.runtime_version) ? intl.value('validation.required', { key: intl.value('ackCn.runtime.label') }) : null;
  };
};

const instanceTypesRequired = (nodePools, intl) => {
  return (instanceTypes) => {
    if (instanceTypes !== undefined) {
      return instanceTypes === '' ? intl.value('validation.required', { key: intl.value('ackCn.instanceType.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.instance_types) ? intl.value('validation.required', { key: intl.value('ackCn.instanceType.label') }) : null;
  };
};

const instancesNumRequired = (nodePools, intl) => {
  return (instancesNum) => {
    if (instancesNum !== undefined) {
      if (isNaN(instancesNum)) {
        return intl.value('validation.required', { key: intl.value('ackCn.instancesNum.label') });
      } else if (instancesNum < 0) {
        return intl.value('ackCn.numOfNodes.minRequired');
      }

      return null;
    }

    return !!nodePools.value?.find((pool) => !pool.instances_num || isNaN(pool.instances_num) || pool.instances_num < 0) ? intl.value('ackCn.numOfNodes.minRequired') : null;
  };
};

const systemDiskCategoryRequired = (nodePools, intl) => {
  return (systemDiskCategory) => {
    if (systemDiskCategory !== undefined) {
      return systemDiskCategory === '' ? intl.value('validation.required', { key: intl.value('ackCn.rootType.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.system_disk_category) ? intl.value('validation.required', { key: intl.value('ackCn.rootType.label') }) : null;
  };
};

const diskSizeRequired = (nodePools, intl) => {
  return (quantity) => {
    if (quantity !== undefined) {
      if (isNaN(quantity)) {
        return intl.value('validation.required', { key: intl.value('ackCn.rootSize.label') });
      } else if (quantity < 40) {
        return intl.value('ackCn.rootSize.minRequired');
      }

      return null;
    }

    return !!nodePools.value?.find((pool) => !pool.system_disk_size || isNaN(pool.system_disk_size) || pool.system_disk_size < 40) ? intl.value('ackCn.rootSize.minRequired') : null;
  };
};

const dataDiskSizeRequired = (nodePools, intl) => {
  return (quantity) => {
    if (quantity !== undefined) {
      if (isNaN(quantity)) {
        return intl.value('validation.required', { key: intl.value('ackCn.rootSize.label') });
      } else if (quantity < 40 && parseInt(quantity, 10) !== 0) {
        return intl.value('ackCn.rootSize.minRequired');
      }

      return null;
    }

    return !!nodePools.value?.find((pool) => isNaN(pool.system_disk_size) || (pool.system_disk_size < 40 && parseInt(pool.system_disk_size, 10) !== 0) ) ? intl.value('ackCn.rootSize.minRequired') : null;
  };
};

const platformRequired = (nodePools, intl) => {
  return (platform) => {
    if (platform !== undefined) {
      return platform === '' ? intl.value('validation.required', { key: intl.value('ackCn.platform.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.platform) ? intl.value('validation.required', { key: intl.value('ackCn.platform.label') }) : null;
  };
};

const keyPairRequired = (nodePools, intl) => {
  return (keyPair) => {
    if (keyPair !== undefined) {
      return keyPair === '' ? intl.value('validation.required', { key: intl.value('ackCn.keyPair.label') }) : null;
    }

    return !!nodePools.value?.find((pool) => !pool.key_pair) ? intl.value('validation.required', { key: intl.value('ackCn.keyPair.label') }) : null;
  };
};

export default {
  nameRequired,
  regionIdRequired,
  vpcIdRequired,
  vswitchIdsRequired,
  podCidrRequired,
  validatePodCidr,
  validateServiceCidr,
  serviceCidrRequired,
  nodePoolNameRequired,
  nodePoolNamesUnique,
  runtimeVersionRequired,
  instanceTypesRequired,
  instancesNumRequired,
  systemDiskCategoryRequired,
  diskSizeRequired,
  dataDiskSizeRequired,
  platformRequired,
  keyPairRequired,
  clusterIdRequired,
};
