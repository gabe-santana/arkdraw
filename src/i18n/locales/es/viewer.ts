import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Cargando diagrama…',
  'viewer.openFailed': 'No se pudo abrir este diagrama',
  'viewer.viewTitle': 'Ver un diagrama',
  'viewer.emptyHint': 'Suelta aquí un archivo de diagrama o abre uno desde tu dispositivo. No se sube nada.',
  'viewer.openFile': 'Abrir un archivo…',
  'viewer.openEditor': 'Abrir el editor',

  // Viewer — toolbar
  'viewer.openNewTab': 'Abrir en una pestaña nueva',
  'viewer.editInArkDraw': 'Editar en ArkDraw',
  'viewer.previousPage': 'Página anterior',
  'viewer.nextPage': 'Página siguiente',
  'viewer.zoomOut': 'Alejar',
  'viewer.zoomIn': 'Acercar',
  'viewer.resetZoom': 'Restablecer al 100%',
  'viewer.fit': 'Ajustar a la pantalla',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Ir a “{name}”',
  'viewer.goToPageUnnamed': 'Ir a “página”',
  'viewer.runAction': 'Haz clic para ejecutar la acción',
  'viewer.unsupportedLink': 'Enlace no compatible',
} satisfies Translation<typeof en>;
