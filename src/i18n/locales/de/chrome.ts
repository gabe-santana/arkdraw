import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Suche leeren',
  'chrome.ui.mixed': 'Gemischt',
  'chrome.ui.recentColors': 'Zuletzt',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': 'Werkzeuge',
  'chrome.toolbar.playAnimation': 'Animation abspielen',
  'chrome.toolbar.pauseAnimation': 'Animation pausieren',
  'chrome.zoom.out': 'Verkleinern',
  'chrome.zoom.in': 'Vergrößern',
  'chrome.zoom.options': 'Zoomoptionen',

  // Outline
  'chrome.outline.title': 'Übersicht',
  'chrome.outline.close': 'Übersicht schließen',

  // PageTabs
  'chrome.pageTabs.editData': 'Daten bearbeiten…',
  'chrome.pageTabs.insertPage': 'Seite einfügen',
  'chrome.pageTabs.allPages': 'Alle Seiten',
  'chrome.pageTabs.findPage': 'Seite nach Name oder Nummer suchen',
  'chrome.pageTabs.noMatch': 'Keine passende Seite',
  'chrome.pageTabs.deleteTitle': '„{name}“ löschen?',
  'chrome.pageTabs.deleteMessage': '{count, plural, one {Sie enthält # Element} other {Sie enthält # Elemente}}. Das Löschen einer Seite lässt sich nicht rückgängig machen.',

  // StartScreen
  'chrome.start.title': 'Willkommen bei ArkDraw',
  'chrome.start.subtitle': 'Beginnen Sie ein neues Diagramm oder machen Sie dort weiter, wo Sie aufgehört haben.',
  'chrome.start.blank': 'Leeres Diagramm',
  'chrome.start.blankSub': 'Mit leerer Zeichenfläche beginnen',
  'chrome.start.templates': 'Vorlagen…',
  'chrome.start.templatesSub': 'Galerie und Meine Vorlagen durchsuchen',
  'chrome.start.open': 'Öffnen…',
  'chrome.start.openSubDesktop': 'Eine Datei auf diesem Computer',
  'chrome.start.openSubWeb': 'Eine Datei von Ihrem Gerät',
  'chrome.start.openBrowser': 'Aus Browser öffnen…',
  'chrome.start.openBrowserSub': 'In diesem Browser gespeicherte Diagramme',
  'chrome.start.templatesHeading': 'Vorlagen',
  'chrome.start.recentHeading': 'Zuletzt verwendet',
  'chrome.start.recentEmpty': 'Dateien, die Sie öffnen oder speichern, werden hier angezeigt.',
  'chrome.start.dontShow': 'Nicht mehr anzeigen',
  'chrome.start.reenableHint': 'In den Einstellungen wieder aktivieren',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Daten bearbeiten',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Wird im Ebenenbereich angezeigt',
  'chrome.editData.tooltip': 'QuickInfo',
  'chrome.editData.tooltipPlaceholder': 'Wird beim Darüberfahren angezeigt',
  'chrome.editData.link': 'Link',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Tags',
  'chrome.editData.tagsPlaceholder': 'frontend, kritisch',
  'chrome.editData.properties': 'Eigenschaften',
  'chrome.editData.keyPlaceholder': 'Schlüssel',
  'chrome.editData.valuePlaceholder': 'Wert',
  'chrome.editData.addProperty': 'Eigenschaft hinzufügen',
  'chrome.editData.placeholders': '{token}-Platzhalter in der Beschriftung anzeigen',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Stil bearbeiten',
  'chrome.editStyle.subtitleDrawio': 'Stilzeichenfolge (key=value;) – gilt für die gesamte Auswahl',
  'chrome.editStyle.styleString': 'Stilzeichenfolge',
  'chrome.editStyle.subtitleArkdraw': 'ArkDraw-Stilschlüssel, einer pro Zeile – gilt für die gesamte Auswahl',
  'chrome.editStyle.keptKeys': 'Von ArkDraw nicht verwendete Schlüssel bleiben erhalten und werden beim .drawio-Export zurückgeschrieben.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Diagramm bearbeiten',
  'chrome.editDiagram.subtitle': 'Die aktuelle Seite als ArkDraw-JSON. Änderungen lassen sich rückgängig machen.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Ersetzen ein/aus',
  'chrome.find.placeholder': 'In Beschriftungen, Namen, QuickInfos und Daten suchen',
  'chrome.find.matchCase': 'Groß-/Kleinschreibung',
  'chrome.find.wholeWord': 'Ganzes Wort',
  'chrome.find.regex': 'Regulärer Ausdruck',
  'chrome.find.allPages': 'Alle Seiten',
  'chrome.find.allPagesShort': 'Alle',
  'chrome.find.replaceWith': 'Ersetzen durch',
  'chrome.find.replace': 'Ersetzen',
  'chrome.find.replaceAll': 'Alle',

  // EditDialogs — Import from text
  'chrome.import.none': 'Es sind keine Textimporter installiert.',
  'chrome.import.fromText': 'Aus Text importieren',
  'chrome.import.asNewPage': 'Als neue Seite',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Formen',
  'chrome.dock.panel.format': 'Format',
  'chrome.dock.panel.layers': 'Ebenen',
  'chrome.dock.moveLeft': 'Nach links verschieben',
  'chrome.dock.moveRight': 'Nach rechts verschieben',
  'chrome.dock.moveUp': 'Nach oben',
  'chrome.dock.moveDown': 'Nach unten',
  'chrome.dock.reset': 'Bereichslayout zurücksetzen',
  'chrome.dock.handleAria': 'Bereich {panel}: zum Verschieben ziehen, für Optionen klicken',
  'chrome.dock.handleTitle': 'Zum Verschieben ziehen · für Optionen klicken',
  'chrome.dock.dropHere': 'Hier ablegen',
  'chrome.dock.resizeLeft': 'Linke Bereiche skalieren',
  'chrome.dock.resizeRight': 'Rechte Bereiche skalieren',
  'chrome.rightTabs.aria': 'Rechter Bereich',
  'chrome.rightTabs.design': 'Design',
  'chrome.rightTabs.designHint': 'Stil der Auswahl',
  'chrome.rightTabs.layersHint': 'Ebenen und alle Elemente, von vorne nach hinten',
  'chrome.rightTabs.ai': 'KI',
  'chrome.rightTabs.aiHint': 'Sagen Sie, was Sie möchten: Der Assistent zeichnet oder bearbeitet es',
} satisfies Translation<typeof en>;
