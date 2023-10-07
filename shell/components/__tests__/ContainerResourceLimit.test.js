import ContainerResourceLimit from '@shell/components/ContainerResourceLimit.vue';
import { shallowMount } from '@vue/test-utils';
import { CONTAINER_DEFAULT_RESOURCE_LIMIT } from '@shell/config/labels-annotations';
import UnitInput from '@shell/components/form/UnitInput';

describe('component: ContainerResourceLimit, method: validateResourceLimits', () => {
  // have not empty errors
  it('should return not empty errors for method validateResourceLimits', () => {
    // CPU：min <= request <= limit <= max
    // Memory: min <= request <= limit <= max

    const localThis = { t: jest.fn() };

    const cpuLimitKeys = ['minCpu', 'requestsCpu', 'limitsCpu', 'maxCpu'];
    const cpuLimitValues = ['400m', '300m', '200m', '100m'];

    // all cpu limits have a invalid value
    const cpuLimits1 = cpuLimitKeys.reduce((t, c, index) => {
      t[c] = cpuLimitValues[index];

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, cpuLimits1)).toHaveLength(3);

    const invalidValue = (limit, k, index) => {
      limit[k] = cpuLimitValues[index];

      return limit;
    };
    // have three limits: invalid value
    const cpuLimits2 = [
      ['requestsCpu', 'limitsCpu', 'maxCpu'],
      ['minCpu', 'limitsCpu', 'maxCpu'],
      ['minCpu', 'requestsCpu', 'maxCpu'],
      ['minCpu', 'requestsCpu', 'limitsCpu']
    ].map((limitKeys) => {
      const limits = limitKeys.reduce(invalidValue, {});

      return limits;
    });

    cpuLimits2.forEach((limits) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits)).toHaveLength(2);
    });

    // have two limits: invalid value
    const cpuLimits3 = [
      ['minCpu', 'requestsCpu'],
      ['minCpu', 'limitsCpu'],
      ['minCpu', 'maxCpu'],
      ['requestsCpu', 'limitsCpu'],
      ['requestsCpu', 'maxCpu'],
      ['limitsCpu', 'maxCpu'],
    ].map((limitKeys) => {
      const limits = limitKeys.reduce(invalidValue, {});

      return limits;
    });

    cpuLimits3.forEach((limits) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits)).toHaveLength(1);
    });

    const memoryLimitKeys = ['minMemory', 'requestsMemory', 'limitsMemory', 'maxMemory'];
    const memoryLimitValues = ['400Mi', '300Mi', '200Mi', '100Mi'];

    // all memory limits have a invalid value
    const memoryLimits1 = memoryLimitKeys.reduce((t, c, index) => {
      t[c] = memoryLimitValues[index];

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, memoryLimits1)).toHaveLength(3);

    const invalidMemValue = (limit, k, index) => {
      limit[k] = memoryLimitValues[index];

      return limit;
    };
    // have three limits: same value, valid value
    const memoryLimits2 = [
      ['requestsMemory', 'limitsMemory', 'maxMemory'],
      ['minMemory', 'limitsMemory', 'maxMemory'],
      ['minMemory', 'requestsMemory', 'maxMemory'],
      ['minMemory', 'requestsMemory', 'limitsMemory']
    ].map((limitKeys) => {
      const limits = limitKeys.reduce(invalidMemValue, {});

      return limits;
    });

    memoryLimits2.forEach((limits) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits)).toHaveLength(2);
    });

    // have two limits: same value, valid value
    const memoryLimits3 = [
      ['minMemory', 'requestsMemory'],
      ['minMemory', 'limitsMemory'],
      ['minMemory', 'maxMemory'],
      ['requestsMemory', 'limitsMemory'],
      ['requestsMemory', 'maxMemory'],
      ['limitsMemory', 'maxMemory'],
    ].map((limitKeys) => {
      const limits = limitKeys.reduce(invalidMemValue, {});

      return limits;
    });

    memoryLimits3.forEach((limits) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits)).toHaveLength(1);
    });
  });
  // ---------------- empty errors ------------------
  it('should return empty errors for method validateResourceLimits', () => {
    // CPU：min <= request <= limit <= max
    // Memory: min <= request <= limit <= max

    const localThis = { t: jest.fn() };
    // empty limit
    const errors = ContainerResourceLimit.methods.validateResourceLimits.call(localThis, {});

    expect(errors).toHaveLength(0);

    const cpuLimitKeys = ['minCpu', 'requestsCpu', 'limitsCpu', 'maxCpu'];
    const cpuLimitValues = ['100m', '200m', '300m', '400m'];

    // all cpu limits have the same value
    const cpuLimits1 = cpuLimitKeys.reduce((t, c) => {
      t[c] = '100m';

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, cpuLimits1)).toHaveLength(0);

    // all cpu limits have a valid value
    const cpuLimits2 = cpuLimitKeys.reduce((t, c, index) => {
      t[c] = cpuLimitValues[index];

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, cpuLimits2)).toHaveLength(0);

    const sameValue = (limit, k) => {
      limit[k] = '100m';

      return limit;
    };
    const validValue = (limit, k, index) => {
      limit[k] = cpuLimitValues[index];

      return limit;
    };
    // have three limits: same value, valid value
    const cpuLimits3 = [
      ['requestsCpu', 'limitsCpu', 'maxCpu'],
      ['minCpu', 'limitsCpu', 'maxCpu'],
      ['minCpu', 'requestsCpu', 'maxCpu'],
      ['minCpu', 'requestsCpu', 'limitsCpu']
    ].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameValue, {});
      const limits2 = limitKeys.reduce(validValue, {});

      return [limits1, limits2];
    });

    cpuLimits3.forEach(([limits1, limits2]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits2)).toHaveLength(0);
    });

    // have two limits: same value, valid value
    const cpuLimits4 = [
      ['minCpu', 'requestsCpu'],
      ['minCpu', 'limitsCpu'],
      ['minCpu', 'maxCpu'],
      ['requestsCpu', 'limitsCpu'],
      ['requestsCpu', 'maxCpu'],
      ['limitsCpu', 'maxCpu'],
    ].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameValue, {});
      const limits2 = limitKeys.reduce(validValue, {});

      return [limits1, limits2];
    });

    cpuLimits4.forEach(([limits1, limits2]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits2)).toHaveLength(0);
    });
    // have one limit: same value, valid value
    const cpuLimits5 = [['minCpu'], ['requestsCpu'], ['limitsCpu'], ['maxCpu']].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameValue, {});

      return [limits1];
    });

    cpuLimits5.forEach(([limits1]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
    });

    const memoryLimitKeys = ['minMemory', 'requestsMemory', 'limitsMemory', 'maxMemory'];
    const memoryLimitValues = ['100Mi', '200Mi', '300Mi', '400Mi'];

    // all memory limits have the same value
    const memoryLimits1 = cpuLimitKeys.reduce((t, c) => {
      t[c] = '100m';

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, memoryLimits1)).toHaveLength(0);

    // all memory limits have a valid value
    const memoryLimits2 = memoryLimitKeys.reduce((t, c, index) => {
      t[c] = memoryLimitValues[index];

      return t;
    }, {});

    expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, memoryLimits2)).toHaveLength(0);

    const sameMemValue = (limit, k) => {
      limit[k] = '100Mi';

      return limit;
    };
    const validMemValue = (limit, k, index) => {
      limit[k] = memoryLimitValues[index];

      return limit;
    };
    // have three limits: same value, valid value
    const memoryLimits3 = [
      ['requestsMemory', 'limitsMemory', 'maxMemory'],
      ['minMemory', 'limitsMemory', 'maxMemory'],
      ['minMemory', 'requestsMemory', 'maxMemory'],
      ['minMemory', 'requestsMemory', 'limitsMemory']
    ].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameMemValue, {});
      const limits2 = limitKeys.reduce(validMemValue, {});

      return [limits1, limits2];
    });

    memoryLimits3.forEach(([limits1, limits2]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits2)).toHaveLength(0);
    });

    // have two limits: same value, valid value
    const memoryLimits4 = [
      ['minMemory', 'requestsMemory'],
      ['minMemory', 'limitsMemory'],
      ['minMemory', 'maxMemory'],
      ['requestsMemory', 'limitsMemory'],
      ['requestsMemory', 'maxMemory'],
      ['limitsMemory', 'maxMemory'],
    ].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameMemValue, {});
      const limits2 = limitKeys.reduce(validMemValue, {});

      return [limits1, limits2];
    });

    memoryLimits4.forEach(([limits1, limits2]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits2)).toHaveLength(0);
    });
    // have one limit: same value, valid value
    const memoryLimits5 = [['minMemory'], ['requestsMemory'], ['limitsMemory'], ['maxMemory']].map((limitKeys) => {
      const limits1 = limitKeys.reduce(sameMemValue, {});

      return [limits1];
    });

    memoryLimits5.forEach(([limits1]) => {
      expect(ContainerResourceLimit.methods.validateResourceLimits.call(localThis, limits1)).toHaveLength(0);
    });
  });
});

describe('component: ContainerResourceLimit, method: updateBeforeSave', () => {
  it('should return reject promise', async() => {
    const localThis = {
      namespace:              'test',
      validateResourceLimits: jest.fn(() => ['error'])
    };

    await expect(ContainerResourceLimit.methods.updateBeforeSave.call(localThis)).rejects.toContain('error');
  });
  it('should return normally', async() => {
    const setAnnotationMock = jest.fn();
    const localThis = {
      namespace:              { setAnnotation: setAnnotationMock },
      validateResourceLimits: jest.fn(() => [])
    };

    await expect(ContainerResourceLimit.methods.updateBeforeSave.call(localThis)).toBeUndefined();
    expect(setAnnotationMock).toHaveBeenCalledTimes(1);
  });

  describe('component: ContainerResourceLimit, show or hide max/min cpu/memory limit', () => {
    it('should show max/min cpu/memory limit', () => {
      const tMock = jest.fn((t) => t);

      const wrapper = shallowMount(ContainerResourceLimit, { mocks: { t: tMock } });

      expect(tMock).toHaveBeenCalledWith('containerResourceLimit.maxCpu');
      expect(tMock).toHaveBeenCalledWith('containerResourceLimit.minCpu');
      expect(tMock).toHaveBeenCalledWith('containerResourceLimit.maxMemory');
      expect(tMock).toHaveBeenCalledWith('containerResourceLimit.minMemory');
      const allComponents = wrapper.findAllComponents(UnitInput);

      expect(allComponents.at(4).props()).toMatchObject({
        label: 'containerResourceLimit.maxCpu', inputExponent: -1, outputModifier: true, baseUnit: 'suffix.cpus'
      });
      expect(allComponents.at(5).props()).toMatchObject({
        label: 'containerResourceLimit.maxMemory', inputExponent: 2, increment: 1024, outputModifier: true
      });
      expect(allComponents.at(6).props()).toMatchObject({
        label: 'containerResourceLimit.minCpu', inputExponent: -1, outputModifier: true, baseUnit: 'suffix.cpus'
      });
      expect(allComponents.at(7).props()).toMatchObject({
        label: 'containerResourceLimit.minMemory', inputExponent: 2, increment: 1024, outputModifier: true
      });
    });
    it('should hide max/min cpu/memory limit', () => {
      const tMock = jest.fn();

      shallowMount(ContainerResourceLimit, {
        propsData: { limitMinMaxValues: false },
        mocks:     { t: tMock }
      });

      expect(tMock).not.toHaveBeenCalledWith('containerResourceLimit.maxCpu');
      expect(tMock).not.toHaveBeenCalledWith('containerResourceLimit.minCpu');
      expect(tMock).not.toHaveBeenCalledWith('containerResourceLimit.maxMemory');
      expect(tMock).not.toHaveBeenCalledWith('containerResourceLimit.minMemory');
    });
    const limits = {
      minCpu: '100m', maxCpu: '200m', minMemory: '100Mi', maxMemory: '200Mi'
    };

    it('should init min/max cpu/memory in namespace annotation', () => {
      const crLimitWrapper = shallowMount(ContainerResourceLimit, {
        propsData: {
          namespace: {
            id:       'test',
            metadata: { annotations: { [CONTAINER_DEFAULT_RESOURCE_LIMIT]: JSON.stringify(limits) } },
          }
        },

        mocks: { t: jest.fn() }
      });

      expect(crLimitWrapper.vm.$data).toMatchObject(limits);
    });
    it('should update min/max cpu/memory in namespace annotation', async() => {
      const setAnnotationMock = jest.fn();
      const crLimitWrapper = shallowMount(ContainerResourceLimit, {
        propsData: {
          namespace: {
            id:            'test',
            metadata:      { annotations: { [CONTAINER_DEFAULT_RESOURCE_LIMIT]: JSON.stringify(limits) } },
            setAnnotation: setAnnotationMock
          }
        },
        mocks: {
          t:                      jest.fn(),
          validateResourceLimits: jest.fn(() => []),
        }
      });
      const updatedLimits = {
        minCpu: '200m', maxCpu: '300m', minMemory: '200Mi', maxMemory: '300Mi'
      };

      await crLimitWrapper.setData(updatedLimits);
      crLimitWrapper.vm.updateBeforeSave();
      expect(setAnnotationMock).toHaveBeenCalledWith(CONTAINER_DEFAULT_RESOURCE_LIMIT, JSON.stringify(updatedLimits));

      const updatedLimits2 = {
        minCpu: null, maxCpu: '300m', minMemory: '200Mi', maxMemory: null
      };

      await crLimitWrapper.setData(updatedLimits2);
      crLimitWrapper.vm.updateBeforeSave();
      expect(setAnnotationMock).toHaveBeenCalledWith(CONTAINER_DEFAULT_RESOURCE_LIMIT, JSON.stringify({ maxCpu: '300m', minMemory: '200Mi' }));
      const updatedLimits3 = {
        minCpu: null, maxCpu: null, minMemory: null, maxMemory: null
      };

      await crLimitWrapper.setData(updatedLimits3);
      crLimitWrapper.vm.updateBeforeSave();
      expect(setAnnotationMock).toHaveBeenCalledWith(CONTAINER_DEFAULT_RESOURCE_LIMIT, JSON.stringify({}));
    });
    it('should not include min/max cpu/memory in namespace annotation', () => {
      const setAnnotationMock = jest.fn();
      const crLimitWrapper = shallowMount(ContainerResourceLimit, {
        propsData: {
          namespace: {
            id:            'test',
            setAnnotation: setAnnotationMock
          }
        },
        mocks: {
          t:                      jest.fn(),
          validateResourceLimits: jest.fn(() => []),
        }
      });

      crLimitWrapper.vm.updateBeforeSave();
      expect(setAnnotationMock).toHaveBeenCalledWith(CONTAINER_DEFAULT_RESOURCE_LIMIT, '{}');
    });
  });
});