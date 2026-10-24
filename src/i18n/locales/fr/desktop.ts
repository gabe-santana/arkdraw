import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'ArkDraw {version} est disponible',
  'desktop.update.downloading': 'Téléchargement…',
  'desktop.update.downloadingPercent': 'Téléchargement · {percent} %',
  'desktop.update.installing': 'Installation… ArkDraw va redémarrer.',
  'desktop.update.restartHint': 'Redémarrez pour mettre à jour. Vous serez d’abord invité à enregistrer les modifications.',
  'desktop.update.restart': 'Redémarrer pour mettre à jour',

  // updater.ts
  'desktop.update.webAuto': 'Les mises à jour sont installées automatiquement dans la version web.',
  'desktop.update.upToDate': 'ArkDraw est à jour.',
  'desktop.update.checkFailed': 'Impossible de rechercher des mises à jour : {error}',
  'desktop.update.failed': 'Échec de la mise à jour : {error}',

  // startup.ts
  'desktop.config.editHint': 'Modifiez config.json, puis redémarrez ArkDraw pour appliquer les changements.',
  'desktop.config.noFolder': 'Aucun dossier de configuration',

  // windows.ts
  'desktop.openWhere.title': 'Ouvrir « {name} » dans une nouvelle fenêtre ?',
  'desktop.openWhere.message': '« {name} » contient des modifications non enregistrées. Vous pouvez continuer à travailler dessus ici et ouvrir le fichier dans une nouvelle fenêtre.',
  'desktop.openWhere.confirm': 'Ouvrir dans une nouvelle fenêtre',
  'desktop.openWhere.deny': 'Remplacer ce diagramme',
} satisfies Translation<typeof en>;
