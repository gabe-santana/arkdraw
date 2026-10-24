import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Diagramm wird geladen…',
  'viewer.openFailed': 'Dieses Diagramm konnte nicht geöffnet werden',
  'viewer.viewTitle': 'Diagramm anzeigen',
  'viewer.emptyHint': 'Legen Sie hier eine Diagrammdatei ab oder öffnen Sie eine von Ihrem Gerät. Es wird nichts hochgeladen.',
  'viewer.openFile': 'Datei öffnen…',
  'viewer.openEditor': 'Editor öffnen',

  // Viewer — toolbar
  'viewer.openNewTab': 'In neuem Tab öffnen',
  'viewer.editInOpenDraw': 'In OpenDraw bearbeiten',
  'viewer.previousPage': 'Vorherige Seite',
  'viewer.nextPage': 'Nächste Seite',
  'viewer.zoomOut': 'Verkleinern',
  'viewer.zoomIn': 'Vergrößern',
  'viewer.resetZoom': 'Auf 100% zurücksetzen',
  'viewer.fit': 'An Bildschirm anpassen',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Zu „{name}“ wechseln',
  'viewer.goToPageUnnamed': 'Zur Seite wechseln',
  'viewer.runAction': 'Klicken, um Aktion auszuführen',
  'viewer.unsupportedLink': 'Nicht unterstützter Link',
} satisfies Translation<typeof en>;
