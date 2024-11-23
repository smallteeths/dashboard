import { shallowMount } from '@vue/test-utils';
import rke2 from '@shell/edit/provisioning.cattle.io.cluster/rke2.vue';
import CustomContainerdConfig from '@shell/edit/provisioning.cattle.io.cluster/CustomContainerdConfig.vue';
import { _CREATE } from '@shell/config/query-params';

describe('component: rke2, computed: generateName', () => {
  it('should return default generate name when empty registry hostname', () => {
    const localThis = { registryHost: '' };

    expect(rke2.computed.generateName.call(localThis)).toBe('');
  });

  it('should return registry hostname generate name', () => {
    const localThis = { registryHost: 'a.a.a' };

    expect(rke2.computed.generateName.call(localThis)).toBe(localThis.registryHost);
  });

  describe('component: rke2, CustomContainerConfig', () => {
    it('should contain component CustomContainerdConfig', () => {
      const mockAgentArgs = { 'cloud-provider-name': { options: [], profile: { options: [{ anything: 'yes' }] } } };
      const value = {
        spec: {
          rkeConfig:         { etcd: { disableSnapshots: false } },
          chartValues:       {},
          kubernetesVersion: 'v1.25.0+rke2r1'
        },
        agentConfig: { 'cloud-provider-name': 'any' }
      };
      const wrapper = shallowMount(rke2, {
        props: {
          mode:            _CREATE,
          value,
          selectedVersion: { agentArgs: mockAgentArgs },
          provider:        'custom'
        },

        global: {
          stubs: {
            CruResource:              { template: '<div><slot></slot></div>' }, // Required to render the slot content
            Banner:                   true,
            LabeledSelect:            true,
            ACE:                      true,
            AgentEnv:                 true,
            AgentConfiguration:       true,
            ArrayList:                true,
            ArrayListGrouped:         true,
            BadgeState:               true,
            Checkbox:                 true,
            ClusterMembershipEditor:  true,
            ClusterAppearance:        true,
            DrainOptions:             true,
            LabeledInput:             true,
            Labels:                   true,
            Loading:                  true,
            MachinePool:              true,
            MatchExpressions:         true,
            NameNsDescription:        true,
            Questions:                true,
            RadioGroup:               true,
            RegistryConfigs:          true,
            RegistryMirrors:          true,
            S3Config:                 true,
            SelectCredential:         true,
            SelectOrCreateAuthSecret: true,
            UnitInput:                true,
            YamlEditor:               true,
            MemberRoles:              true,
            Basics:                   true,
            Etcd:                     true,
            Networking:               true,
            Upgrade:                  true,
            Registries:               true,
            AddOnConfig:              true,
            Advanced:                 true,
            Tabbed:                   { template: '<div><slot /></div>' },
            Tab:                      { template: '<div><slot /></div>' }
          },
          mocks: {
            $fetchState: { pending: false },
            $route:      {
              name:  'anything',
              query: { AS: 'yaml' },
            },
            $store: {
              dispatch: () => jest.fn(),
              getters:  {
                currentStore:                      () => 'current_store',
                'management/schemaFor':            jest.fn(),
                'current_store/all':               jest.fn(),
                'i18n/t':                          jest.fn(),
                'i18n/withFallback':               jest.fn(),
                'plugins/cloudProviderForDriver':  jest.fn(),
                'customization/getPreviewCluster': jest.fn()
              }
            },
            $plugin: { getDynamic: jest.fn(() => undefined ) }

          }
        }

      });
      const c = wrapper.findComponent(CustomContainerdConfig);

      expect(c.exists()).toBe(true);
      expect(c.props('value')).toStrictEqual(value);
      expect(c.props('mode')).toBe('create');
    });
  });
});
