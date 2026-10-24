import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'ahora mismo',
  'collab.connector': 'Conector',
  'collab.shape': 'Forma',

  // Comments
  'collab.comments': 'Comentarios',
  'collab.resolved': 'Resueltos',
  'collab.closeComments': 'Cerrar comentarios',
  'collab.noComments': 'Aún no hay comentarios. Selecciona una forma y deja una nota para tu equipo: los comentarios se guardan en el archivo.',
  'collab.commentOn': 'Comentar en “{name}”…',
  'collab.selectToComment': 'Selecciona un elemento para comentarlo',
  'collab.comment': 'Comentar',
  'collab.reply': 'Responder…',
  'collab.reopen': 'Reabrir',
  'collab.resolve': 'Resolver',

  // Revision history
  'collab.revisions': 'Historial de revisiones',
  'collab.revisionsSubtitle': 'Instantáneas locales de “{name}”, tomadas en cada guardado y mientras trabajas.',
  'collab.noRevisions': 'Aún no hay revisiones. Guarda el diagrama para crear una.',
  'collab.revisionSaved': 'Guardada',
  'collab.revisionAuto': 'Instantánea automática',
  'collab.revisionElements': '{count, plural, one {# elemento} other {# elementos}}',
  'collab.deleteRevision': 'Eliminar revisión',
  'collab.revisionPreview': 'Vista previa de la revisión',
  'collab.selectRevision': 'Selecciona una revisión',
  'collab.openAsCopy': 'Abrir como copia',
  'collab.restore': 'Restaurar',
  'collab.restoredSuffix': '{name} (restaurado)',

  // Preferences
  'prefs.title': 'Preferencias',
  'prefs.language': 'Idioma',
  'prefs.languageAuto': 'Automático (sistema: {language})',
  'prefs.languageHint': 'Los nombres de las formas y los términos de búsqueda de iconos se mantienen en inglés.',
  'prefs.author': 'Tu nombre (para los comentarios)',
  'prefs.authorPlaceholder': 'p. ej., Ada Lovelace',
  'prefs.defaultFont': 'Fuente predeterminada para formas nuevas',
  'prefs.fontHand': 'A mano alzada',
  'prefs.palette': 'Paleta personalizada (colores hexadecimales, separados por comas)',
  'prefs.autosave': 'Guardar automáticamente los cambios en el archivo abierto',
  'prefs.startScreen': 'Mostrar la pantalla de inicio al abrir',
  'prefs.autosaveDesktop': 'Los archivos guardados se escriben alrededor de un segundo después de cada cambio (un .bkp conserva la versión anterior si las copias de seguridad están activadas).',
  'prefs.autosaveWeb': 'Funciona con archivos abiertos o guardados mediante el selector de archivos del navegador y con documentos de la biblioteca del navegador.',
  'prefs.autosaveFailed': 'Error al guardar automáticamente: {error}',
} satisfies Translation<typeof en>;
