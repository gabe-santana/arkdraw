import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Caricamento diagramma…',
  'viewer.openFailed': 'Impossibile aprire questo diagramma',
  'viewer.viewTitle': 'Visualizza un diagramma',
  'viewer.emptyHint': 'Rilascia qui un file di diagramma oppure aprine uno dal tuo dispositivo. Non viene caricato nulla.',
  'viewer.openFile': 'Apri un file…',
  'viewer.openEditor': 'Apri l’editor',

  // Viewer — toolbar
  'viewer.openNewTab': 'Apri in una nuova scheda',
  'viewer.editInOpenDraw': 'Modifica in ArkDraw',
  'viewer.previousPage': 'Pagina precedente',
  'viewer.nextPage': 'Pagina successiva',
  'viewer.zoomOut': 'Riduci',
  'viewer.zoomIn': 'Ingrandisci',
  'viewer.resetZoom': 'Ripristina al 100%',
  'viewer.fit': 'Adatta allo schermo',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Vai a “{name}”',
  'viewer.goToPageUnnamed': 'Vai a “pagina”',
  'viewer.runAction': 'Fai clic per eseguire l’azione',
  'viewer.unsupportedLink': 'Collegamento non supportato',
} satisfies Translation<typeof en>;
