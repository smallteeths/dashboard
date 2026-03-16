// useCreateEditView.js
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { base64Encode } from '@shell/utils/crypto';
import { exceptionToErrorsArray } from '@shell/utils/error';

export function useCreateEditView(props, context) {
  const {
    normanCluster, tkeConfig, nodePools, state
  } = context;

  const $router = useRouter();
  const doneRoute = computed(() => {
    return props.value?.listLocation?.name;
  });

  function done() {
    if (!doneRoute.value) {
      return;
    }
    $router.replace({ name: doneRoute.value });
  }

  async function save(buttonDone, url, depth = 0) {
    try {
      await actuallySave(url);
      buttonDone && buttonDone(true);
      done();
    } catch (err) {
      state.value.errors = exceptionToErrorsArray(err);
      buttonDone && buttonDone(false);
    }
  }

  async function actuallySave() {
    if (tkeConfig.value.imported && tkeConfig.value.clusterId) {
      // Use tkeConfig.value.clusterVersion to detect edit mode for imported clusters.
      // If this is an imported cluster and clusterVersion is set, the cluster is in edit mode.
      // Since TKE config changes on imported clusters have no effect, simply return the original value.
      if (!tkeConfig.value.clusterVersion) {
        const importConfig = {
          imported:            true,
          tkeCredentialSecret: tkeConfig.value.tkeCredentialSecret,
          clusterId:           tkeConfig.value.clusterId,
          region:              tkeConfig.value.region,
          clusterEndpoint:     { enable: tkeConfig.value.clusterEndpoint }
        };

        normanCluster.value.tkeConfig = importConfig;
      }

      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    normanCluster.value.tkeConfig = formatConfig();

    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function formatConfig() {
    const config = tkeConfig.value;
    const nodePoolList = [];
    const virtualNodePoolList = [];

    nodePools.value.forEach((node) => {
      delete node.isNew;
      if (node.nodePoolType === 'super') {
        const virtualNode = {
          ...node.virtualNodePool,
          name: node.nodePoolName,
        };

        delete virtualNode.nodePoolType;
        virtualNodePoolList.push(virtualNode);

        return;
      }
      const dataDisks = node.dataDisks?.filter((disk) => Number(disk.size) > 0).map((disk) => ({
        diskSize: disk.size,
        diskType: disk.type,
      }));

      const autoScalingGroupPara = {
        autoScalingGroupName: '',
        desiredCapacity:      node.instanceNum,
        maxSize:              node.instanceNum,
        minSize:              0,
        vpcId:                config.vpcId,
        subnetIds:            [node.subnetId],
      };
      const launchConfigurePara = {
        launchConfigurationName: '',
        instanceType:            node.instanceType,
        systemDisk:              {
          diskSize: node.systemDiskSize,
          diskType: node.systemDiskType,
        },
        internetChargeType:      node.bandwidthType,
        internetMaxBandwidthOut: node.bandwidth,
        publicIpAssigned:        true,
        dataDisks:               dataDisks?.length ? dataDisks : [],
        keyIds:                  node.keyPair ? [node.keyPair] : [],
        securityGroupIds:        [node.securityGroup],
        instanceChargeType:      'POSTPAID_BY_HOUR', // todo POSTPAID_BY_HOUR | SPOTPAID | PREPAID
      };

      const out = {
        clusterId:          node.clusterId,
        nodePoolId:         node.nodePoolId,
        autoScalingGroupPara,
        launchConfigurePara,
        enableAutoscale:    true,
        name:               node.nodePoolName,
        labels:             [],
        taints:             [],
        nodePoolOs:         node.osName,
        osCustomizeType:    'GENERAL',
        tags:               [],
        deletionProtection: false,
        userScript:         base64Encode(node.userScript),
      };

      nodePoolList.push(out);
    });

    const clusterEndpoint = {
      enable:        config.clusterEndpoint,
      subnetId:      config.subnetId,
      securityGroup: config.securityGroup,
      domain:        config.domain,
    };
    const clusterBasicSettings = {
      clusterDescription: '',
      clusterName:        config.name ? config.name : normanCluster.value.name,
      clusterOs:          config.osName,
      clusterType:        config.clusterType,
      clusterVersion:     config.clusterVersion,
      vpcId:              config.vpcId,
      clusterLevel:       config.clusterLevel,
      isAutoUpgrade:      true,
    };
    const clusterCIDRSettings = {
      clusterCIDR:               config.clusterCidr,
      ignoreClusterCIDRConflict: true,
      maxClusterServiceNum:      1024,
      maxNodePodNum:             64,
      needWorkSecurityGroup:     true,
      osCustomizeType:           'GENERAL',
    };

    const dataDisks = [{
      diskSize: config.dataDiskSize,
      diskType: config.dataDiskType,
    }];

    let runInstancesForNode = {
      nodeRole:           'MASTER_ETCD',
      instanceChargeType: 'POSTPAID_BY_HOUR',
      zone:               config.zoneId,
      instanceCount:      config.ecsCount,
      projectId:          0,
      instanceType:       config.instanceType,
      imageId:            config.osName,
      systemDisk:         {
        diskSize: config.systemDiskSize,
        diskType: config.systemDiskType,
      },
      dataDisks:               config.dataDiskSize ? dataDisks : [],
      vpcId:                   config.vpcId,
      subnetId:                config.subnetId,
      internetChargeType:      config.bandwidthType,
      internetMaxBandwidthOut: config.bandwidth,
      publicIpAssigned:        true,
      instanceName:            '',
      keyIds:                  [config.keyPair],
      securityService:         false,
      monitorService:          false,
      userData:                '',
    };

    const clusterAdvancedSettings = {
      containerRuntime: config.container,
      ipvs:             config.ipvs,
    };

    if (config.clusterType !== 'INDEPENDENT_CLUSTER') {
      runInstancesForNode = undefined;
    }

    const extensionAddon = JSON.parse(config.component || []);

    return {
      tkeCredentialSecret: config.tkeCredentialSecret,
      region:              config.region,
      imported:            false,
      nodePoolList,
      clusterEndpoint,
      clusterBasicSettings,
      clusterCIDRSettings,
      runInstancesForNode,
      clusterAdvancedSettings,
      extensionAddon,
      virtualNodePoolList,
    };
  }

  return {
    doneRoute,
    save,
  };
}
