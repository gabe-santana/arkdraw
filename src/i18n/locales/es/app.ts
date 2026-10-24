import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': 'Descartar',
  'app.restoredUnsaved': 'Se restauró el diagrama sin guardar',

  // commands.ts
  'app.style.copied': 'Estilo copiado',
  'app.style.copyFirst': 'Copia primero un estilo',
  'app.style.defaultSet': 'Las formas nuevas usarán este estilo',
  'app.style.defaultReset': 'Se restableció el estilo predeterminado',
  'app.layout.nothing': 'No hay nada que organizar',
  'app.copyAs.done': 'Copiado como {format}',
  'app.copyAs.failed': 'Error al copiar: {error}',
  'app.image.loadFailed': 'No se pudo cargar una imagen desde esa URL.',
  'app.image.linked': 'Imagen vinculada, no incrustada: el servidor bloquea las descargas, por lo que necesita conexión para mostrarse.',
  'app.image.urlTitle': 'Insertar imagen desde URL',
  'app.image.urlMessage': 'Pega un enlace a una imagen PNG, JPEG, GIF, WebP o SVG, o un URI data:.',
  'app.image.urlInvalid': 'Introduce una URL http(s) o data:image.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Todos los diagramas',
  'app.filter.opendraw': 'Diagrama de OpenDraw',
  'app.filter.drawio': 'XML de diagrama (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': '¿Guardar los cambios en “{name}”?',
  'app.discard.message': 'Si no los guardas, los cambios se perderán.',
  'app.discard.deny': 'No guardar',
  'app.file.imported': '{count, plural, one {Se importó # elemento} other {Se importaron # elementos}}',
  'app.file.importedPages': '{count, plural, one {Se importó # elemento} other {Se importaron # elementos}} en {pages} páginas',
  'app.file.openFailed': 'No se pudo abrir este archivo.',
  'app.file.savedToBrowser': 'Guardado en el navegador',
  'app.file.saveFailed': 'Error al guardar: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'No hay nada que imprimir',
  'app.playback.nothing': 'Aún no hay nada que animar. Selecciona un conector y elige una animación en el panel de propiedades.',
} satisfies Translation<typeof en>;
