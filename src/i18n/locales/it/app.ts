import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': 'Ignora',
  'app.restoredUnsaved': 'Il diagramma non salvato è stato ripristinato',

  // commands.ts
  'app.style.copied': 'Stile copiato',
  'app.style.copyFirst': 'Copia prima uno stile',
  'app.style.defaultSet': 'Le nuove forme useranno questo stile',
  'app.style.defaultReset': 'Stile predefinito reimpostato',
  'app.layout.nothing': 'Niente da disporre',
  'app.copyAs.done': 'Copiato come {format}',
  'app.copyAs.failed': 'Copia non riuscita: {error}',
  'app.image.loadFailed': 'Impossibile caricare un’immagine da quell’URL.',
  'app.image.linked': 'Immagine collegata, non incorporata: il server blocca i download, quindi serve una connessione per visualizzarla.',
  'app.image.urlTitle': 'Inserisci immagine da URL',
  'app.image.urlMessage': 'Incolla un link a un’immagine PNG, JPEG, GIF, WebP o SVG, oppure un URI data:.',
  'app.image.urlInvalid': 'Inserisci un URL http(s) o data:image.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Tutti i diagrammi',
  'app.filter.arkdraw': 'Diagramma ArkDraw',
  'app.filter.drawio': 'XML diagramma (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Salvare le modifiche a “{name}”?',
  'app.discard.message': 'Se non le salvi, le modifiche andranno perse.',
  'app.discard.deny': 'Non salvare',
  'app.file.imported': '{count, plural, one {Importato # elemento} other {Importati # elementi}}',
  'app.file.importedPages': '{count, plural, one {Importato # elemento} other {Importati # elementi}} in {pages} pagine',
  'app.file.openFailed': 'Impossibile aprire questo file.',
  'app.file.savedToBrowser': 'Salvato nel browser',
  'app.file.saveFailed': 'Salvataggio non riuscito: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Niente da stampare',
  'app.playback.nothing': 'Ancora niente da animare. Seleziona un connettore e scegli un’animazione nel pannello delle proprietà.',
} satisfies Translation<typeof en>;
