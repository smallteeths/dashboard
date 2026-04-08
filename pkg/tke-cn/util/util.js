import ipaddr from 'ipaddr.js';

function isValidCIDR(cidr) {
  return ipaddr.isValidCIDR(cidr);
}

function ipToLong(ip) {
  return ip.split('.').reduce((cur, octet) => {
    return (cur << 8) + parseInt(octet, 10);
  }, 0) >>> 0;
}

function getCidrRange(cidr) {
  try {
    const [ip, prefix] = ipaddr.parseCIDR(cidr);

    if (ip.kind() !== 'ipv4') {
      return null;
    }

    const ipLong = ipToLong(ip.toString());
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    const start = ipLong & mask;
    const end = start | (~mask >>> 0);

    return { start, end };
  } catch (e) {
    return null;
  }
}

export function DoCidrOverlap(cidr1, cidr2) {
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
