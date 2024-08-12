import { PRODUCT_NAME } from '../config/image-repo.js';
import Config from '../pages/c/_cluster/manager/image/config.vue';
import Project from '../pages/c/_cluster/manager/image/project.vue';
import Log from '../pages/c/_cluster/manager/image/log.vue';
import ProjectDetail from '../pages/c/_cluster/manager/image/projectDetail/_id.vue';
import ProjectImageDetail from '../pages/c/_cluster/manager/image/projectDetail/image/_imageId.vue';
import ProjectImageDetailV1 from '../pages/c/_cluster/manager/image/projectDetail/image/_imageIdV1.vue';

const routes = [{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-config`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/config`,
  component: Config
},
{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-project`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/project`,
  component: Project
},
{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-project-detail`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/project/:id`,
  component: ProjectDetail,
  meta:      { parentRouteName: `${ PRODUCT_NAME }-c-cluster-manager-project` }
},
{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-project-detail-image`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/project/:id/:roleId/image/:imageName`,
  component: ProjectImageDetail,
  meta:      { parentRouteName: `${ PRODUCT_NAME }-c-cluster-manager-project` }
},
{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-project-detail-image-v1`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/projectv1/:id/:roleId/image/:imageName`,
  component: ProjectImageDetailV1,
  meta:      { parentRouteName: `${ PRODUCT_NAME }-c-cluster-manager-project` }
},
{
  name:      `${ PRODUCT_NAME }-c-cluster-manager-log`,
  path:      `/${ PRODUCT_NAME }/c/:cluster/:product/log`,
  component: Log
}];

export default routes;
