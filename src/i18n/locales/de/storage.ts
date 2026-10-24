import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Browserspeicher',
  'storage.subtitle': 'In diesem Browser gespeicherte Diagramme (IndexedDB). Sie bleiben auf diesem Gerät und werden nirgendwohin hochgeladen.',
  'storage.searchPlaceholder': 'Dokumente suchen',
  'storage.addFiles': 'Dateien hinzufügen…',
  'storage.saveCurrent': 'Aktuelles speichern',
  'storage.noMatches': 'Keine Dokumente entsprechen Ihrer Suche.',
  'storage.empty': 'Noch keine Diagramme in diesem Browser gespeichert. Verwenden Sie „Aktuelles speichern“ oder Datei → Im Browser speichern.',
  'storage.openDoc': '{name} öffnen',
  'storage.emptyThumb': 'Leer',
  'storage.download': '.opendraw herunterladen',
  'storage.docActions': 'Dokumentaktionen',
  'storage.fileType': 'OpenDraw-Diagramm',
  'storage.opened': '„{name}“ geöffnet',
  'storage.savedToBrowser': '„{name}“ im Browser gespeichert',
  'storage.deleteTitle': '„{name}“ löschen?',
  'storage.deleteMessage': 'Es wird aus dem Speicher dieses Browsers entfernt. Dies kann nicht rückgängig gemacht werden.',
  'storage.notADiagram': '„{name}“ ist kein OpenDraw-Diagramm.',
  'storage.justNow': 'gerade eben',
  'storage.minutesAgo': 'vor {count} Min.',
  'storage.hoursAgo': 'vor {count} Std.',

  // library.ts
  'storage.saveFailed': 'Speichern im Browser fehlgeschlagen: {error}',
  'storage.docGone': 'Dieses Dokument ist nicht mehr in der Browser-Bibliothek.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'Dieses zuletzt verwendete Dokument ist nicht mehr verfügbar.',
  'storage.recentPermission': 'Die Leseberechtigung für „{name}“ wurde verweigert.',
  'storage.recentRemoved': '„{name}“ wurde aus der Browser-Bibliothek entfernt.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Aus einem Ihrer Diagramme gespeichert.',
} satisfies Translation<typeof en>;
