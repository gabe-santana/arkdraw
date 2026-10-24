import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar
  'web.embed.saveTitle': 'Enregistrer ({shortcut})',
  'web.embed.exit': 'Quitter',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'Une nouvelle version d’OpenDraw est prête',
  'web.pwa.offlineReady': 'OpenDraw fonctionne désormais hors ligne',
  'web.pwa.reloadHint': 'Rechargez pour mettre à jour. Le travail non enregistré sera restauré après le rechargement.',
  'web.pwa.cached': 'L’application est en cache sur cet appareil.',
  'web.pwa.updating': 'Mise à jour…',
  'web.pwa.reload': 'Recharger',

  // Launch
  'web.launch.onlyHttpUrls': 'Seules les URL de diagramme http(s) peuvent être ouvertes.',
  'web.shared.askTitle': 'Ouvrir le diagramme partagé ?',
  'web.shared.askMessage': 'Vous avez du travail non enregistré d’une session précédente. L’ouverture du diagramme partagé le remplacera.',
  'web.shared.confirm': 'Ouvrir le diagramme partagé',
  'web.shared.deny': 'Conserver mon travail',
  'web.shared.openFailed': 'Impossible d’ouvrir le diagramme partagé : {error}',

  // loadDiagram.ts
  'web.load.empty': 'Le diagramme est vide.',
  'web.load.noPages': 'Aucune page de diagramme trouvée.',
  'web.load.unrecognized': 'Format de diagramme non reconnu.',
  'web.load.sharedDiagram': 'Diagramme partagé',
  'web.load.cors': 'Impossible de télécharger le diagramme. Le serveur n’autorise peut-être pas les requêtes multi-origines (CORS).',
  'web.load.http': 'Impossible de télécharger le diagramme (HTTP {status}).',
  'web.load.tooLarge': 'Le diagramme est trop volumineux pour être ouvert.',
} satisfies Translation<typeof en>;
