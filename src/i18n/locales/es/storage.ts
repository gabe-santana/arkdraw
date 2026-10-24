import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Almacenamiento del navegador',
  'storage.subtitle': 'Diagramas guardados en este navegador (IndexedDB). Se quedan en este dispositivo y no se suben a ningún sitio.',
  'storage.searchPlaceholder': 'Buscar documentos',
  'storage.addFiles': 'Añadir archivos…',
  'storage.saveCurrent': 'Guardar actual',
  'storage.noMatches': 'Ningún documento coincide con la búsqueda.',
  'storage.empty': 'Aún no hay diagramas guardados en este navegador. Usa “Guardar actual” o Archivo → Guardar en el navegador.',
  'storage.openDoc': 'Abrir {name}',
  'storage.emptyThumb': 'Vacío',
  'storage.download': 'Descargar .opendraw',
  'storage.docActions': 'Acciones del documento',
  'storage.fileType': 'Diagrama de OpenDraw',
  'storage.opened': 'Se abrió “{name}”',
  'storage.savedToBrowser': 'Se guardó “{name}” en el navegador',
  'storage.deleteTitle': '¿Eliminar “{name}”?',
  'storage.deleteMessage': 'Se eliminará del almacenamiento de este navegador. Esta acción no se puede deshacer.',
  'storage.notADiagram': '“{name}” no es un diagrama de OpenDraw.',
  'storage.justNow': 'ahora mismo',
  'storage.minutesAgo': 'hace {count} min',
  'storage.hoursAgo': 'hace {count} h',

  // library.ts
  'storage.saveFailed': 'No se pudo guardar en el navegador: {error}',
  'storage.docGone': 'Ese documento ya no está en la biblioteca del navegador.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'Este documento reciente ya no está disponible.',
  'storage.recentPermission': 'Se denegó el permiso para leer “{name}”.',
  'storage.recentRemoved': '“{name}” se eliminó de la biblioteca del navegador.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Guardada a partir de uno de tus diagramas.',
} satisfies Translation<typeof en>;
