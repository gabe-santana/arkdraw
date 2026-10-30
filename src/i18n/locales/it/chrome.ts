import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Cancella ricerca',
  'chrome.ui.mixed': 'Misto',
  'chrome.ui.recentColors': 'Recenti',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': 'Strumenti',
  'chrome.toolbar.playAnimation': 'Riproduci animazione',
  'chrome.toolbar.pauseAnimation': 'Metti in pausa animazione',
  'chrome.zoom.out': 'Riduci',
  'chrome.zoom.in': 'Ingrandisci',
  'chrome.zoom.options': 'Opzioni zoom',

  // Outline
  'chrome.outline.title': 'Struttura',
  'chrome.outline.close': 'Chiudi struttura',

  // PageTabs
  'chrome.pageTabs.editData': 'Modifica dati…',
  'chrome.pageTabs.insertPage': 'Inserisci pagina',

  // StartScreen
  'chrome.start.title': 'Benvenuto in ArkDraw',
  'chrome.start.subtitle': 'Inizia un nuovo diagramma o riprendi da dove avevi lasciato.',
  'chrome.start.blank': 'Diagramma vuoto',
  'chrome.start.blankSub': 'Inizia da un’area di disegno vuota',
  'chrome.start.templates': 'Modelli…',
  'chrome.start.templatesSub': 'Sfoglia la galleria e I miei modelli',
  'chrome.start.open': 'Apri…',
  'chrome.start.openSubDesktop': 'Un file su questo computer',
  'chrome.start.openSubWeb': 'Un file dal tuo dispositivo',
  'chrome.start.openBrowser': 'Apri dal browser…',
  'chrome.start.openBrowserSub': 'Diagrammi salvati in questo browser',
  'chrome.start.templatesHeading': 'Modelli',
  'chrome.start.recentHeading': 'Recenti',
  'chrome.start.recentEmpty': 'I file aperti o salvati verranno visualizzati qui.',
  'chrome.start.dontShow': 'Non mostrare più',
  'chrome.start.reenableHint': 'Riattivala in Preferenze',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Modifica dati',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Visualizzato nel pannello Livelli',
  'chrome.editData.tooltip': 'Descrizione comando',
  'chrome.editData.tooltipPlaceholder': 'Visualizzata al passaggio del mouse',
  'chrome.editData.link': 'Collegamento',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Tag',
  'chrome.editData.tagsPlaceholder': 'frontend, critico',
  'chrome.editData.properties': 'Proprietà',
  'chrome.editData.keyPlaceholder': 'chiave',
  'chrome.editData.valuePlaceholder': 'valore',
  'chrome.editData.addProperty': 'Aggiungi proprietà',
  'chrome.editData.placeholders': 'Mostra i segnaposto {token} nell’etichetta',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Modifica stile',
  'chrome.editStyle.subtitleDrawio': 'Stringa di stile (key=value;), applicata all’intera selezione',
  'chrome.editStyle.styleString': 'Stringa di stile',
  'chrome.editStyle.subtitleArkdraw': 'Chiavi di stile ArkDraw, una per riga, applicate all’intera selezione',
  'chrome.editStyle.keptKeys': 'Le chiavi non usate da ArkDraw vengono conservate e riscritte nell’esportazione .drawio.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Modifica diagramma',
  'chrome.editDiagram.subtitle': 'La pagina corrente come JSON di ArkDraw. Le modifiche si possono annullare.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Mostra/nascondi sostituzione',
  'chrome.find.placeholder': 'Trova in etichette, nomi, descrizioni comandi e dati',
  'chrome.find.matchCase': 'Maiuscole/minuscole',
  'chrome.find.wholeWord': 'Parola intera',
  'chrome.find.regex': 'Espressione regolare',
  'chrome.find.allPages': 'Tutte le pagine',
  'chrome.find.allPagesShort': 'Tutte',
  'chrome.find.replaceWith': 'Sostituisci con',
  'chrome.find.replace': 'Sostituisci',
  'chrome.find.replaceAll': 'Tutti',

  // EditDialogs — Import from text
  'chrome.import.none': 'Non è installato alcun importatore di testo.',
  'chrome.import.fromText': 'Importa da testo',
  'chrome.import.asNewPage': 'Come nuova pagina',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Forme',
  'chrome.dock.panel.format': 'Formato',
  'chrome.dock.panel.layers': 'Livelli',
  'chrome.dock.moveLeft': 'Sposta a sinistra',
  'chrome.dock.moveRight': 'Sposta a destra',
  'chrome.dock.moveUp': 'Sposta su',
  'chrome.dock.moveDown': 'Sposta giù',
  'chrome.dock.reset': 'Reimposta disposizione pannelli',
  'chrome.dock.handleAria': 'Pannello {panel}: trascina per spostare, fai clic per le opzioni',
  'chrome.dock.handleTitle': 'Trascina per spostare · clic per le opzioni',
  'chrome.dock.dropHere': 'Rilascia qui',
  'chrome.dock.resizeLeft': 'Ridimensiona pannelli di sinistra',
  'chrome.dock.resizeRight': 'Ridimensiona pannelli di destra',
  'chrome.rightTabs.aria': 'Pannello destro',
  'chrome.rightTabs.design': 'Design',
  'chrome.rightTabs.designHint': 'Stile di ciò che selezioni',
  'chrome.rightTabs.layersHint': 'Livelli e tutti gli elementi, dal primo all’ultimo',
  'chrome.rightTabs.ai': 'IA',
  'chrome.rightTabs.aiHint': 'Di\' cosa vuoi: l\'assistente lo disegna o lo modifica',
  'chrome.dock.resizeAi': 'Ridimensiona il pannello IA',
} satisfies Translation<typeof en>;
