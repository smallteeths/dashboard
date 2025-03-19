import { importTypes } from '@rancher/auto-import';
import { AckProvisioner } from './provisioner';

// Init the package
export default function(plugin) {
  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide plugin metadata from package.json
  plugin.metadata = require('./package.json');

  // Register custom provisioner object
  plugin.register('provisioner', AckProvisioner.ID, AckProvisioner);

  // Built-in icon
  plugin.metadata.icon = require('./icon.svg');
}
