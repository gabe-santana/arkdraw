import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': 'Schließen',
  'app.restoredUnsaved': 'Ihr ungespeichertes Diagramm wurde wiederhergestellt',

  // commands.ts
  'app.style.copied': 'Stil kopiert',
  'app.style.copyFirst': 'Kopieren Sie zuerst einen Stil',
  'app.style.defaultSet': 'Neue Formen verwenden diesen Stil',
  'app.style.defaultReset': 'Standardstil zurückgesetzt',
  'app.layout.nothing': 'Nichts anzuordnen',
  'app.copyAs.done': 'Als {format} kopiert',
  'app.copyAs.failed': 'Kopieren fehlgeschlagen: {error}',
  'app.image.loadFailed': 'Von dieser URL konnte kein Bild geladen werden.',
  'app.image.linked': 'Bild verlinkt, nicht eingebettet: Der Server blockiert Downloads, daher ist zur Anzeige eine Verbindung nötig.',
  'app.image.urlTitle': 'Bild von URL einfügen',
  'app.image.urlMessage': 'Fügen Sie einen Link zu einem PNG-, JPEG-, GIF-, WebP- oder SVG-Bild oder eine data:-URI ein.',
  'app.image.urlInvalid': 'Geben Sie eine http(s)- oder data:image-URL ein.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Alle Diagramme',
  'app.filter.opendraw': 'ArkDraw-Diagramm',
  'app.filter.drawio': 'Diagramm-XML (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Änderungen an „{name}“ speichern?',
  'app.discard.message': 'Ihre Änderungen gehen verloren, wenn Sie sie nicht speichern.',
  'app.discard.deny': 'Nicht speichern',
  'app.file.imported': '{count, plural, one {# Element} other {# Elemente}} importiert',
  'app.file.importedPages': '{count, plural, one {# Element} other {# Elemente}} auf {pages} Seiten importiert',
  'app.file.openFailed': 'Diese Datei konnte nicht geöffnet werden.',
  'app.file.savedToBrowser': 'Im Browser gespeichert',
  'app.file.saveFailed': 'Speichern fehlgeschlagen: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Nichts zu drucken',
  'app.playback.nothing': 'Noch nichts zu animieren. Wählen Sie einen Verbinder aus und wählen Sie im Eigenschaftenbereich eine Animation.',
} satisfies Translation<typeof en>;
