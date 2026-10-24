import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Plugins',
  'plugins.subtitle': 'Étendez OpenDraw avec des commandes, des bibliothèques de formes et des formats de fichier',
  'plugins.warning':
    'Les plugins s’exécutent dans OpenDraw avec un accès complet à l’éditeur et à vos diagrammes. N’ajoutez que des plugins de confiance. Une confirmation vous sera demandée avant l’activation de chacun d’eux.',
  'plugins.status.active': 'Actif',
  'plugins.storedCopy': '{source} (copie enregistrée)',
  'plugins.remove': 'Retirer le plugin',
  'plugins.empty': 'Aucun plugin pour l’instant.',
  'plugins.external': 'Chargé par l’application ou sa configuration',
  'plugins.add': 'Ajouter un plugin',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js ou C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js ou /plugins/my-plugin.js',
  'plugins.addFromFile': 'Ajouter depuis un fichier…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin} : {error}',
  'plugins.exported': '{name} exporté',
  'plugins.exportFailed': 'Échec de l’export {format} : {error}',
  'plugins.trustTitle': 'Activer ce plugin ?',
  'plugins.trustMessage': '{what}\n\nLes plugins s’exécutent dans OpenDraw avec un accès complet à vos diagrammes et à l’éditeur. N’activez que des plugins provenant de sources de confiance.',
  'plugins.trustConfirm': 'Activer le plugin',
  'plugins.duplicate': 'Ce plugin figure déjà dans la liste.',
  'plugins.enabled': 'Plugin activé : {name}',
  'plugins.failed': 'Échec du plugin {id} : {error}',
  'plugins.cspHint': '{error} — impossible de charger le script. Vérifiez l’URL ; les hôtes dotés d’une Content-Security-Policy stricte n’autorisent que les plugins de leur propre origine.',
} satisfies Translation<typeof en>;
