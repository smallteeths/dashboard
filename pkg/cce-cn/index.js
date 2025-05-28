import { importTypes } from '@rancher/auto-import';
import { CceProvisioner } from './provisioner';

// Init the package
export default function(plugin) {
  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide plugin metadata from package.json
  plugin.metadata = require('./package.json');

  // Register custom provisioner object
  plugin.register('provisioner', CceProvisioner.ID, CceProvisioner);

  // Built-in icon
  plugin.metadata.icon = require('./icon.svg');
}
