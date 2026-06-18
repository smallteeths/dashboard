const MAX_DEFAULT_VCPUS = 4;
const MAX_DEFAULT_MEMORY = 16;

function normalizeNumber(value) {
  const num = Number(value);

  return Number.isNaN(num) ? undefined : num;
}

function getFlavorSpec(item) {
  return {
    vcpus:  normalizeNumber(item?.vcpus ?? item?.raw?.vcpus),
    memory: normalizeNumber(item?.memory ?? item?.raw?.ram / 1024),
  };
}

export function getDefaultFlavorValue(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }

  const underCap = list.filter((item) => {
    const { vcpus, memory } = getFlavorSpec(item);

    return vcpus !== undefined &&
      memory !== undefined &&
      vcpus <= MAX_DEFAULT_VCPUS &&
      memory <= MAX_DEFAULT_MEMORY;
  });

  if (underCap.length) {
    const sorted = [...underCap].sort((a, b) => {
      const specA = getFlavorSpec(a);
      const specB = getFlavorSpec(b);

      if (specB.vcpus !== specA.vcpus) {
        return specB.vcpus - specA.vcpus;
      }

      return specB.memory - specA.memory;
    });

    return sorted[0]?.value || '';
  }

  return list[0]?.value || '';
}
