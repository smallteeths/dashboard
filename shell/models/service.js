import { insertAt } from '@shell/utils/array';
import find from 'lodash/find';
import { POD } from '@shell/config/types';
import SteveModel from '@shell/plugins/steve/steve-class';
import { parse } from '@shell/utils/selector';

// i18n-uses servicesPage.serviceTypes.clusterIp.*, servicesPage.serviceTypes.externalName.*, servicesPage.serviceTypes.headless.*
// i18n-uses servicesPage.serviceTypes.loadBalancer.*, servicesPage.serviceTypes.nodePort.*
export const DEFAULT_SERVICE_TYPES = [
  {
    id:          'ClusterIP',
    label:       'servicesPage.serviceTypes.clusterIp.label',
    description: 'servicesPage.serviceTypes.clusterIp.description',
    bannerAbbrv: 'servicesPage.serviceTypes.clusterIp.abbrv',
  },
  {
    id:          'ExternalName',
    label:       'servicesPage.serviceTypes.externalName.label',
    description: 'servicesPage.serviceTypes.externalName.description',
    bannerAbbrv: 'servicesPage.serviceTypes.externalName.abbrv',
  },
  {
    id:          'Headless',
    label:       'servicesPage.serviceTypes.headless.label',
    description: 'servicesPage.serviceTypes.headless.description',
    bannerAbbrv: 'servicesPage.serviceTypes.headless.abbrv',
  },
  {
    id:          'LoadBalancer',
    label:       'servicesPage.serviceTypes.loadBalancer.label',
    description: 'servicesPage.serviceTypes.loadBalancer.description',
    bannerAbbrv: 'servicesPage.serviceTypes.loadBalancer.abbrv',
  },
  {
    id:          'NodePort',
    label:       'servicesPage.serviceTypes.nodePort.label',
    description: 'servicesPage.serviceTypes.nodePort.description',
    bannerAbbrv: 'servicesPage.serviceTypes.nodePort.abbrv',
  },
  {
    id:          'ExternalIP',
    label:       'servicesPage.serviceTypes.externalIP.label',
    description: 'servicesPage.serviceTypes.externalIP.description',
    bannerAbbrv: 'servicesPage.serviceTypes.externalIP.abbrv',
  },
];

export const HEADLESS = (() => {
  const headless = find(DEFAULT_SERVICE_TYPES, ['id', 'Headless']);

  return headless.id;
})();

export const CLUSTERIP = (() => {
  const clusterIp = find(DEFAULT_SERVICE_TYPES, ['id', 'ClusterIP']);

  return clusterIp.id;
})();

export const EXTERNALIP = (() => {
  const externalIP = find(DEFAULT_SERVICE_TYPES, ['id', 'ExternalIP']);

  return externalIP.id;
})();

export default class Service extends SteveModel {
  get customValidationRules() {
    return [
      {
        nullable:       false,
        path:           'metadata.name',
        required:       true,
        translationKey: 'generic.name',
        type:           'dnsLabel',
      },
      {
        nullable:   false,
        path:       'spec',
        required:   true,
        type:       'array',
        validators: ['servicePort'],
      },
      {
        nullable:   true,
        path:       'spec',
        required:   true,
        type:       'string',
        validators: ['clusterIp'],
      },
      {
        nullable:   true,
        path:       'spec',
        required:   true,
        type:       'array',
        validators: ['externalName'],
      },
    ];
  }

  get details() {
    const out = [{
      label:   this.t('generic.type'),
      content: this.serviceType?.id || this.serviceType,
    }];

    const {
      clusterIP, externalName, sessionAffinity, loadBalancerIP
    } = this.spec;

    if (clusterIP) {
      out.push({
        label:   this.t('servicesPage.serviceTypes.clusterIp.label'),
        content: clusterIP,
      });
    }

    if (this.serviceType === 'LoadBalancer') {
      const statusIps = this.status.loadBalancer?.ingress?.map((ingress) => ingress.hostname || ingress.ip).join(', ');

      const loadbalancerInfo = loadBalancerIP || statusIps || '';

      if (loadbalancerInfo) {
        out.push({
          label:   this.t('servicesPage.ips.loadBalancer.label'),
          content: loadbalancerInfo
        });
      }
    }

    if (externalName) {
      out.push({
        label:   this.t('servicesPage.serviceTypes.externalName.label'),
        content: externalName,
      });
    }

    if (sessionAffinity) {
      out.push({
        label:   this.t('servicesPage.affinity.label'),
        content: sessionAffinity,
      });
    }

    return out;
  }

  get podRelationship() {
    const { metadata:{ relationships = [] } } = this;

    return (relationships || []).filter((relationship) => relationship.toType === POD)[0];
  }

  get canToggleExportService() {
    const cluster = this?.$rootGetters['currentCluster'];
    const serviceType = this.spec?.type;

    return this?.$rootGetters['cluster/schemaFor']('multicluster.x-k8s.io.serviceimport') &&
      this?.$rootGetters['cluster/schemaFor']('multicluster.x-k8s.io.serviceexport') &&
      cluster?.id !== 'local' &&
      (serviceType === CLUSTERIP || serviceType === HEADLESS);
  }

  isExported() {
    return !!this.metadata?.annotations?.['multicluster.service.pandaria.io/export'];
  }

  get exportServiceMenuItem() {
    const enabled = this.canToggleExportService && !this.isExported();

    return {
      action:  'exportService',
      enabled: !!enabled,
      icon:    'icon icon-globe',
      label:   this.t('action.exportService'),
    };
  }

  get cancelExportServiceMenuItem() {
    const enabled = this.canToggleExportService && this.isExported();

    return {
      action:  'cancelExportService',
      enabled: !!enabled,
      icon:    'icon icon-globe',
      label:   this.t('action.cancelExportService'),
    };
  }

  async exportService() {
    this.setAnnotation('multicluster.service.pandaria.io/export', 'true');

    try {
      await this.save();
      this.$dispatch('growl/success', {
        title:   this.t('asyncButton.load.success'),
        timeout: 100,
      }, { root: true });
    } catch {
      this.$dispatch('growl/error', {
        title:   this.t('asyncButton.default.error'),
        timeout: 100,
      }, { root: true });
    }
  }

  async cancelExportService() {
    if (this.metadata?.annotations?.['multicluster.service.pandaria.io/export']) {
      delete this.metadata?.annotations?.['multicluster.service.pandaria.io/export'];
    }

    try {
      await this.save();
      this.$dispatch('growl/success', {
        title:   this.t('asyncButton.load.success'),
        timeout: 100,
      }, { root: true });
    } catch {
      this.$dispatch('growl/error', {
        title:   this.t('asyncButton.default.error'),
        timeout: 100,
      }, { root: true });
    }
  }

  async fetchPods() {
    if (!this.podRelationship) {
      // If empty or not present, the service is assumed to have an external process managing its endpoints
      return [];
    }

    return await this.$dispatch('findLabelSelector', {
      type:     POD,
      matching: {
        namespace:     this.metadata.namespace,
        labelSelector: { matchExpressions: parse(this.podRelationship?.selector) },
      }
    });
  }

  async unWatchPods() {
    return await this.$dispatch('unwatch', { type: POD, all: true });
  }

  /**
   * This getter expects a superset of workload pods to have been fetched already
   *
   * It assumes fetchPods has been called and should be used instead of the response of fetchPods
   * (findAll --> findLabelSelector world results won't trigger change detection)
   */
  get pods() {
    if (this.podRelationship?.selector) {
      return this.$getters['matchingLabelSelector'](POD, { matchExpressions: parse(this.podRelationship?.selector) }, this.metadata.namespace);
    } else {
      return [];
    }
  }

  get serviceType() {
    const serviceType = this.spec?.type;
    const clusterIp = this.spec?.clusterIP;
    const defaultService = find(DEFAULT_SERVICE_TYPES, ['id', CLUSTERIP]);

    if (serviceType) {
      if (serviceType === CLUSTERIP && clusterIp === 'None') {
        if (this.metadata?.annotations?.['field.cattle.io/ipAddresses']) {
          return EXTERNALIP;
        }

        return HEADLESS;
      } else {
        return serviceType;
      }
    }

    return defaultService;
  }

  get _availableActions() {
    const out = super._availableActions;

    insertAt(out, out?.length, this.exportServiceMenuItem);
    insertAt(out, out?.length, this.cancelExportServiceMenuItem);

    return out;
  }

  proxyUrl(scheme, port) {
    const view = this.linkFor('view');
    const idx = view.lastIndexOf(`/`);

    return proxyUrlFromBase(view.slice(0, idx), scheme, this.metadata.name, port);
  }
}

export function proxyUrlFromParts(clusterId, namespace, name, scheme, port, path) {
  const base = `/k8s/clusters/${ escape(clusterId) }/api/v1/namespaces/${ escape(namespace) }/services`;

  return proxyUrlFromBase(base, scheme, name, port, path);
}

export function proxyUrlFromBase(base, scheme, name, port, path) {
  const schemaNamePort = (scheme ? `${ escape(scheme) }:` : '') + escape(name) + (port ? `:${ escape(port) }` : '');

  const cleanPath = `/${ (path || '').replace(/^\/+/g, '') }`;
  const cleanBase = base.replace(/\/+$/g, '');

  const out = `${ cleanBase }/${ schemaNamePort }/proxy${ cleanPath }`;

  return out;
}
