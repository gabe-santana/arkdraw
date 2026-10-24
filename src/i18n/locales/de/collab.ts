import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'gerade eben',
  'collab.connector': 'Verbinder',
  'collab.shape': 'Form',

  // Comments
  'collab.comments': 'Kommentare',
  'collab.resolved': 'Erledigt',
  'collab.closeComments': 'Kommentare schließen',
  'collab.noComments': 'Noch keine Kommentare. Wählen Sie eine Form aus und hinterlassen Sie eine Notiz für Ihr Team – Kommentare werden in der Datei gespeichert.',
  'collab.commentOn': '„{name}“ kommentieren…',
  'collab.selectToComment': 'Element auswählen, um es zu kommentieren',
  'collab.comment': 'Kommentieren',
  'collab.reply': 'Antworten…',
  'collab.reopen': 'Wieder öffnen',
  'collab.resolve': 'Erledigen',

  // Revision history
  'collab.revisions': 'Versionsverlauf',
  'collab.revisionsSubtitle': 'Lokale Snapshots von „{name}“ – bei jedem Speichern und während der Arbeit erstellt.',
  'collab.noRevisions': 'Noch keine Versionen. Speichern Sie das Diagramm, um eine zu erstellen.',
  'collab.revisionSaved': 'Gespeichert',
  'collab.revisionAuto': 'Auto-Snapshot',
  'collab.revisionElements': '{count, plural, one {# Element} other {# Elemente}}',
  'collab.deleteRevision': 'Version löschen',
  'collab.revisionPreview': 'Versionsvorschau',
  'collab.selectRevision': 'Version auswählen',
  'collab.openAsCopy': 'Als Kopie öffnen',
  'collab.restore': 'Wiederherstellen',
  'collab.restoredSuffix': '{name} (wiederhergestellt)',

  // Preferences
  'prefs.title': 'Einstellungen',
  'prefs.language': 'Sprache',
  'prefs.languageAuto': 'Automatisch (System: {language})',
  'prefs.languageHint': 'Formnamen und Suchbegriffe für Symbole bleiben auf Englisch.',
  'prefs.author': 'Ihr Name (für Kommentare)',
  'prefs.authorPlaceholder': 'z. B. Ada Lovelace',
  'prefs.defaultFont': 'Standardschrift für neue Formen',
  'prefs.fontHand': 'Handschriftlich',
  'prefs.palette': 'Eigene Palette (Hex-Farben, durch Komma getrennt)',
  'prefs.autosave': 'Änderungen automatisch in der geöffneten Datei speichern',
  'prefs.startScreen': 'Startbildschirm beim Start anzeigen',
  'prefs.autosaveDesktop': 'Gespeicherte Dateien werden etwa eine Sekunde nach jeder Änderung geschrieben (bei aktivierten Sicherungen bewahrt eine .bkp-Datei die vorherige Version).',
  'prefs.autosaveWeb': 'Funktioniert für Dateien, die über die Dateiauswahl des Browsers geöffnet oder gespeichert wurden, und für Dokumente in der Browser-Bibliothek.',
  'prefs.autosaveFailed': 'Automatisches Speichern fehlgeschlagen: {error}',
} satisfies Translation<typeof en>;
