import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Chargement du diagramme…',
  'viewer.openFailed': 'Impossible d’ouvrir ce diagramme',
  'viewer.viewTitle': 'Afficher un diagramme',
  'viewer.emptyHint': 'Déposez un fichier de diagramme ici ou ouvrez-en un depuis votre appareil. Rien n’est envoyé.',
  'viewer.openFile': 'Ouvrir un fichier…',
  'viewer.openEditor': 'Ouvrir l’éditeur',

  // Viewer — toolbar
  'viewer.openNewTab': 'Ouvrir dans un nouvel onglet',
  'viewer.editInOpenDraw': 'Modifier dans OpenDraw',
  'viewer.previousPage': 'Page précédente',
  'viewer.nextPage': 'Page suivante',
  'viewer.zoomOut': 'Zoom arrière',
  'viewer.zoomIn': 'Zoom avant',
  'viewer.resetZoom': 'Revenir à 100 %',
  'viewer.fit': 'Ajuster à l’écran',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Aller à « {name} »',
  'viewer.goToPageUnnamed': 'Aller à la page',
  'viewer.runAction': 'Cliquez pour exécuter l’action',
  'viewer.unsupportedLink': 'Lien non pris en charge',
} satisfies Translation<typeof en>;
