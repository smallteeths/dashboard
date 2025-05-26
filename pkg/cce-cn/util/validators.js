
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

const categoryRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.category ? intl.value('validation.required', { key: intl.value('cceCn.clusterType.label') }) : null;
  };
};

const versionRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.version ? intl.value('validation.required', { key: intl.value('cceCn.version.label') }) : null;
  };
};

const managementScaleRequired = (state, intl) => {
  return () => {
    return !state.value?.managementScale ? intl.value('validation.required', { key: intl.value('cceCn.managementScale.label') }) : null;
  };
};

const containerNetworkModeRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.containerNetworkMode ? intl.value('validation.required', { key: intl.value('cceCn.containerNetworkMode.label') }) : null;
  };
};

const vpcIdRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.vpcId ? intl.value('validation.required', { key: intl.value('cceCn.vpcId.label') }) : null;
  };
};

const subnetIdRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.subnetId ? intl.value('validation.required', { key: intl.value('cceCn.subnetId.label') }) : null;
  };
};

const containerNetworkCidrRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.containerNetworkCidr ? intl.value('validation.required', { key: intl.value('cceCn.containerNetworkCidr.label') }) : null;
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

const validateContainerNetworkCidr = (cceConfig, intl) => {
  return () => {
    const containerNetworkCidr = cceConfig.value.containerNetworkCidr;

    return !validateCIDR(containerNetworkCidr) ? intl.value('cceCn.containerNetworkCidr.cidrFormatError') : null;
  };
};

const eniNetworksRequired = (state, intl) => {
  return () => {
    return !(state.value?.eniNetworks?.length > 0) ? intl.value('validation.required', { key: intl.value('cceCn.eniNetworkCidr.label') }) : null;
  };
};

const kubernetesSvcIPRangeRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.kubernetesSvcIPRange ? intl.value('validation.required', { key: intl.value('cceCn.kubernetesSvcIPRange.label') }) : null;
  };
};

const validateKubernetesSvcIPRange = (cceConfig, intl) => {
  return () => {
    const kubernetesSvcIPRange = cceConfig.value.kubernetesSvcIPRange;

    return !validateCIDR(kubernetesSvcIPRange) ? intl.value('cceCn.kubernetesSvcIPRange.cidrFormatError') : null;
  };
};

const securityGroupRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.securityGroup ? intl.value('validation.required', { key: intl.value('cceCn.securityGroup.label') }) : null;
  };
};

const eipSelectionRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.clusterExternalIP ? intl.value('validation.required', { key: intl.value('cceCn.eipIds.label') }) : null;
  };
};

const eipTypeRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.eipType ? intl.value('validation.required', { key: intl.value('cceCn.eipType.label') }) : null;
  };
};

const eipChargeModeRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.eipChargeMode ? intl.value('validation.required', { key: intl.value('cceCn.eipChargeMode.label') }) : null;
  };
};

const eipBandwidthSizeRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.eipBandwidthSize ? intl.value('validation.required', { key: intl.value('cceCn.eipBandwidthSize.label') }) : null;
  };
};

const authenticatingProxyCaRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.authenticatingProxyCa ? intl.value('validation.required', { key: intl.value('cceCn.authenticatingProxyCa.label') }) : null;
  };
};

const authenticatingProxyCertRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.authenticatingProxyCert ? intl.value('validation.required', { key: intl.value('cceCn.authenticatingProxyCert.label') }) : null;
  };
};

const authenticatingProxyPrivateKeyRequired = (cceConfig, intl) => {
  return () => {
    return !cceConfig.value?.authenticatingProxyPrivateKey ? intl.value('validation.required', { key: intl.value('cceCn.authenticatingProxyPrivateKey.label') }) : null;
  };
};

export default {
  nameRequired,
  regionIdRequired,
  categoryRequired,
  versionRequired,
  managementScaleRequired,
  containerNetworkModeRequired,
  vpcIdRequired,
  subnetIdRequired,
  containerNetworkCidrRequired,
  validateContainerNetworkCidr,
  eniNetworksRequired,
  kubernetesSvcIPRangeRequired,
  validateKubernetesSvcIPRange,
  securityGroupRequired,
  eipSelectionRequired,
  eipTypeRequired,
  eipChargeModeRequired,
  eipBandwidthSizeRequired,
  authenticatingProxyCaRequired,
  authenticatingProxyCertRequired,
  authenticatingProxyPrivateKeyRequired,
};
