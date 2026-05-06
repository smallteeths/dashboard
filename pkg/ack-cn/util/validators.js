import ipaddr from 'ipaddr.js';

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

    return !!nodePools.value?.find((pool) => isNaN(pool.instances_num) || pool.instances_num < 0) ? intl.value('ackCn.numOfNodes.minRequired') : null;
  };
};

const MIN_NODE_POOL_SIZE = 0;

const isEmptyValue = (value) => {
  return value === '' || value === null || value === undefined;
};

const validateNodePoolSizeValue = (value, intl, labelKey) => {
  if (isEmptyValue(value)) {
    return intl.value('validation.required', { key: intl.value(labelKey) });
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return intl.value('ackCn.nodePool.validation.number', { key: intl.value(labelKey) });
  }

  if (!Number.isInteger(numberValue)) {
    return intl.value('ackCn.nodePool.validation.integer', { key: intl.value(labelKey) });
  }

  if (numberValue < MIN_NODE_POOL_SIZE) {
    return intl.value('ackCn.nodePool.validation.min', {
      key: intl.value(labelKey),
      min: MIN_NODE_POOL_SIZE,
    });
  }

  return null;
};

const validateNodePoolSizeRange = (minInstances, maxInstances, intl, currentField) => {
  if (isEmptyValue(minInstances) || isEmptyValue(maxInstances)) {
    return null;
  }

  const min = Number(minInstances);
  const max = Number(maxInstances);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  if (min <= max) {
    return null;
  }

  if (currentField === 'min') {
    return intl.value('ackCn.nodePool.validation.minLessThanOrEqualMax', {
      key: intl.value('ackCn.nodePool.minInstances.label'),
      max,
    });
  }

  return intl.value('ackCn.nodePool.validation.maxGreaterThanOrEqualMin', {
    key: intl.value('ackCn.nodePool.maxInstances.label'),
    min,
  });
};

const withPoolName = (message, pool) => {
  if (!message) {
    return null;
  }

  if (!pool?.name) {
    return message;
  }

  return `${ pool.name }: ${ message }`;
};

const validateAllNodePools = (nodePools, callback) => {
  const pools = Array.isArray(nodePools.value) ? nodePools.value : [];

  for (const pool of pools) {
    const message = callback(pool);

    if (message) {
      return withPoolName(message, pool);
    }
  }

  return null;
};

const nodePoolInstancesNumRequired = (nodePools, intl) => {
  return (...args) => {
    if (args.length > 0) {
      return validateNodePoolSizeValue(args[0], intl, 'ackCn.nodePool.desiredSize.label');
    }

    return validateAllNodePools(nodePools, (pool) => {
      if (pool.auto_scaling_enabled) {
        return null;
      }

      return validateNodePoolSizeValue(pool.instances_num, intl, 'ackCn.nodePool.desiredSize.label');
    });
  };
};

const minInstancesRequired = (nodePools, intl) => {
  return (...args) => {
    if (args.length > 0) {
      const [minInstances, maxInstances] = args;

      return validateNodePoolSizeValue(minInstances, intl, 'ackCn.nodePool.minInstances.label') || validateNodePoolSizeRange(minInstances, maxInstances, intl, 'min');
    }

    return validateAllNodePools(nodePools, (pool) => {
      if (!pool.auto_scaling_enabled) {
        return null;
      }

      return validateNodePoolSizeValue(pool.min_instances, intl, 'ackCn.nodePool.minInstances.label') || validateNodePoolSizeRange(pool.min_instances, pool.max_instances, intl, 'min');
    });
  };
};

const maxInstancesRequired = (nodePools, intl) => {
  return (...args) => {
    if (args.length > 0) {
      const [maxInstances, minInstances] = args;

      return validateNodePoolSizeValue(maxInstances, intl, 'ackCn.nodePool.maxInstances.label') || validateNodePoolSizeRange(minInstances, maxInstances, intl, 'max');
    }

    return validateAllNodePools(nodePools, (pool) => {
      if (!pool.auto_scaling_enabled) {
        return null;
      }

      return validateNodePoolSizeValue(pool.max_instances, intl, 'ackCn.nodePool.maxInstances.label') || validateNodePoolSizeRange(pool.min_instances, pool.max_instances, intl, 'max');
    });
  };
};

const nodePoolSizeValid = (pool, intl) => {
  if (!pool) {
    return false;
  }

  if (pool.auto_scaling_enabled) {
    return !validateNodePoolSizeValue(pool.min_instances, intl, 'ackCn.nodePool.minInstances.label') &&
      !validateNodePoolSizeValue(pool.max_instances, intl, 'ackCn.nodePool.maxInstances.label') &&
      !validateNodePoolSizeRange(pool.min_instances, pool.max_instances, intl, 'min');
  }

  return !validateNodePoolSizeValue(pool.instances_num, intl, 'ackCn.nodePool.desiredSize.label');
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
      } else if (quantity < 10) {
        return intl.value('ackCn.rootSize.minRequired');
      }

      return null;
    }

    return !!nodePools.value?.find((pool) => !pool.system_disk_size || isNaN(pool.system_disk_size) || pool.system_disk_size < 10) ? intl.value('ackCn.rootSize.minRequired') : null;
  };
};

const dataDiskSizeRequired = (nodePools, intl) => {
  return (quantity) => {
    if (quantity !== undefined) {
      if (isNaN(quantity)) {
        return intl.value('validation.required', { key: intl.value('ackCn.rootSize.label') });
      } else if (quantity < 10 && parseInt(quantity, 10) !== 0) {
        return intl.value('ackCn.storageSize.minRequired');
      }

      return null;
    }

    return !!nodePools.value?.find((pool) => {
      // Pool size can be omitted. When provided, it must be an integer value exceeding 10.
      if (pool.size === undefined) {
        return false;
      }

      return isNaN(pool.size) || (pool.size < 10 && parseInt(pool.size, 10) !== 0);
    }) ? intl.value('ackCn.storageSize.minRequired') : null;
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

function ipToLong(ip) {
  return (
    ip.split('.').reduce((cur, octet) => (cur << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function getCidrRange(cidr) {
  try {
    const [ip, prefix] = ipaddr.parseCIDR(cidr);

    if (ip.kind() !== 'ipv4') {
      return null;
    }

    const ipLong = ipToLong(ip.toString());
    // Create a subnet mask
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    // Get a start of the ip range
    const start = ipLong & mask;
    // Get an end of the ip range
    const end = start | (~mask >>> 0);

    return { start, end };
  } catch (e) {
    // We can swallow this error
    return null;
  }
}

export function doCidrOverlap(cidr1, cidr2) {
  if (!isValidCIDR(cidr1) || !isValidCIDR(cidr2)) {
    return false;
  }
  const range1 = getCidrRange(cidr1);
  const range2 = getCidrRange(cidr2);

  if (!range1 || !range2) {
    return false;
  }

  return range1.start <= range2.end && range2.start <= range1.end;
}

export function isValidCIDR(cidr) {
  return ipaddr.isValidCIDR(cidr);
}

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
  nodePoolInstancesNumRequired,
  minInstancesRequired,
  maxInstancesRequired,
  nodePoolSizeValid,
  systemDiskCategoryRequired,
  diskSizeRequired,
  dataDiskSizeRequired,
  platformRequired,
  keyPairRequired,
  clusterIdRequired,
};
