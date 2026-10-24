import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Archivio del browser',
  'storage.subtitle': 'Diagrammi conservati in questo browser (IndexedDB). Restano su questo dispositivo e non vengono caricati altrove.',
  'storage.searchPlaceholder': 'Cerca documenti',
  'storage.addFiles': 'Aggiungi file…',
  'storage.saveCurrent': 'Salva corrente',
  'storage.noMatches': 'Nessun documento corrisponde alla ricerca.',
  'storage.empty': 'Ancora nessun diagramma salvato in questo browser. Usa “Salva corrente” o File → Salva nel browser.',
  'storage.openDoc': 'Apri {name}',
  'storage.emptyThumb': 'Vuoto',
  'storage.download': 'Scarica .opendraw',
  'storage.docActions': 'Azioni documento',
  'storage.fileType': 'Diagramma ArkDraw',
  'storage.opened': '“{name}” aperto',
  'storage.savedToBrowser': '“{name}” salvato nel browser',
  'storage.deleteTitle': 'Eliminare “{name}”?',
  'storage.deleteMessage': 'Verrà rimosso dall’archivio di questo browser. L’operazione non può essere annullata.',
  'storage.notADiagram': '“{name}” non è un diagramma ArkDraw.',
  'storage.justNow': 'adesso',
  'storage.minutesAgo': '{count} min fa',
  'storage.hoursAgo': '{count} h fa',

  // library.ts
  'storage.saveFailed': 'Impossibile salvare nel browser: {error}',
  'storage.docGone': 'Il documento non è più presente nella libreria del browser.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'Questo documento recente non è più disponibile.',
  'storage.recentPermission': 'Autorizzazione alla lettura di “{name}” negata.',
  'storage.recentRemoved': '“{name}” è stato rimosso dalla libreria del browser.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Salvato da uno dei tuoi diagrammi.',
} satisfies Translation<typeof en>;
