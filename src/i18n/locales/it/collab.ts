import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'adesso',
  'collab.connector': 'Connettore',
  'collab.shape': 'Forma',

  // Comments
  'collab.comments': 'Commenti',
  'collab.resolved': 'Risolti',
  'collab.closeComments': 'Chiudi commenti',
  'collab.noComments': 'Ancora nessun commento. Seleziona una forma e lascia una nota al team: i commenti vengono salvati nel file.',
  'collab.commentOn': 'Commenta “{name}”…',
  'collab.selectToComment': 'Seleziona un elemento per commentarlo',
  'collab.comment': 'Commenta',
  'collab.reply': 'Rispondi…',
  'collab.reopen': 'Riapri',
  'collab.resolve': 'Risolvi',

  // Revision history
  'collab.revisions': 'Cronologia revisioni',
  'collab.revisionsSubtitle': 'Istantanee locali di “{name}”, acquisite a ogni salvataggio e durante il lavoro.',
  'collab.noRevisions': 'Ancora nessuna revisione. Salva il diagramma per crearne una.',
  'collab.revisionSaved': 'Salvata',
  'collab.revisionAuto': 'Istantanea automatica',
  'collab.revisionElements': '{count, plural, one {# elemento} other {# elementi}}',
  'collab.deleteRevision': 'Elimina revisione',
  'collab.revisionPreview': 'Anteprima revisione',
  'collab.selectRevision': 'Seleziona una revisione',
  'collab.openAsCopy': 'Apri come copia',
  'collab.restore': 'Ripristina',
  'collab.restoredSuffix': '{name} (ripristinato)',

  // Preferences
  'prefs.title': 'Preferenze',
  'prefs.language': 'Lingua',
  'prefs.languageAuto': 'Auto (sistema: {language})',
  'prefs.languageHint': 'I nomi delle forme e i termini di ricerca delle icone restano in inglese.',
  'prefs.author': 'Il tuo nome (per i commenti)',
  'prefs.authorPlaceholder': 'es. Ada Lovelace',
  'prefs.defaultFont': 'Carattere predefinito per le nuove forme',
  'prefs.fontHand': 'A mano libera',
  'prefs.palette': 'Tavolozza personalizzata (colori esadecimali, separati da virgole)',
  'prefs.autosave': 'Salva automaticamente le modifiche nel file aperto',
  'prefs.startScreen': 'Mostra la schermata iniziale all’avvio',
  'prefs.autosaveDesktop': 'I file salvati vengono scritti circa un secondo dopo ogni modifica (con i backup attivi, un file .bkp conserva la versione precedente).',
  'prefs.autosaveWeb': 'Funziona per i file aperti o salvati tramite la finestra di selezione file del browser e per i documenti nella libreria del browser.',
  'prefs.autosaveFailed': 'Salvataggio automatico non riuscito: {error}',
} satisfies Translation<typeof en>;
