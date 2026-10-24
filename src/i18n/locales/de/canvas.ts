import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': 'Diagramm-Zeichenfläche',
  'canvas.ariaLabel': 'Diagramm-Zeichenfläche. Tab wechselt zwischen Formen, Alt+Pfeiltaste folgt Verbindungen, Shift+F10 öffnet das Kontextmenü.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Mit leerer Zeichenfläche beginnen',
  'canvas.empty.body': 'Ziehen Sie Formen aus der Bibliothek, zeichnen Sie mit der Werkzeugleiste oder beschreiben Sie ein Diagramm und lassen Sie es von der KI skizzieren.',
  'canvas.empty.rectangle': 'Rechteck',
  'canvas.empty.connector': 'Verbinder',
  'canvas.empty.ai': 'KI',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': 'Ersetzen durch…',
  'canvas.picker.insertShape': 'Form einfügen…',
  'canvas.picker.noMatch': 'Keine passenden Formen.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Geöffnete Gruppen',
  'canvas.group.backToDiagram': 'Zurück zum gesamten Diagramm (Pos1)',
  'canvas.group.group': 'Gruppe',
  'canvas.group.subgroup': 'Untergruppe',
  'canvas.group.exit': 'Gruppe verlassen',
  'canvas.group.nothingNested': 'Die Auswahl enthält nichts Verschachteltes',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': 'Gruppiert · {count}',
  'canvas.flash.ungrouped': 'Gruppierung aufgehoben · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': 'Ecke {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'Diese Link-Aktion ist kein gültiges JSON.',
  'canvas.link.pageMissing': 'Diese Seite existiert nicht mehr.',
  'canvas.link.unsupportedScheme': 'Nur Web-, E-Mail- und Telefonlinks können geöffnet werden.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Symbol',
  'canvas.aria.connectorRole': 'Verbinder',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': 'Verbinder von {from} zu {to}',
  'canvas.aria.connectorNamedFromTo': 'Verbinder „{text}“ von {from} zu {to}',
  'canvas.aria.nothing': 'nichts',
  'canvas.aria.nothingSelected': 'Nichts ausgewählt',
  'canvas.aria.selectedOne': '{description} ausgewählt',
  'canvas.aria.selectedMany': '{count, plural, one {# Element} other {# Elemente}} ausgewählt',

  // TableCellLayer
  'canvas.table.cellLabel': 'Zelle Zeile {row}, Spalte {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Doppelklicken, um einen Punkt hinzuzufügen',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Pinseloptionen',
  'canvas.brush.title': 'Pinsel',
  'canvas.brush.color': 'Pinselfarbe',
  'canvas.brush.smooth': 'Glättung',
  'canvas.brush.pressure': 'Stiftdruck (variable Breite)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Verschiebbar',
  'canvas.behavior.movableHint': 'Kann gezogen oder schrittweise verschoben werden',
  'canvas.behavior.resizable': 'Größe änderbar',
  'canvas.behavior.resizableHint': 'Zeigt Ziehpunkte zur Größenänderung',
  'canvas.behavior.rotatable': 'Drehbar',
  'canvas.behavior.rotatableHint': 'Zeigt den Drehpunkt',
  'canvas.behavior.deletable': 'Löschbar',
  'canvas.behavior.deletableHint': 'Entf entfernt das Element',
  'canvas.behavior.editable': 'Bearbeitbar',
  'canvas.behavior.editableHint': 'Doppelklick bearbeitet die Beschriftung',
  'canvas.behavior.connectable': 'Verbindbar',
  'canvas.behavior.connectableHint': 'Verbinder können andocken',
  'canvas.behavior.selectable': 'Auswählbar',
  'canvas.behavior.selectableHint': 'Per Klick oder Auswahlrahmen auswählbar',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Textformat',
  'canvas.format.bold': 'Fett ({shortcut})',
  'canvas.format.italic': 'Kursiv ({shortcut})',
  'canvas.format.underline': 'Unterstrichen ({shortcut})',
  'canvas.format.strikethrough': 'Durchgestrichen',
  'canvas.format.smaller': 'Kleiner ({shortcut})',
  'canvas.format.larger': 'Größer ({shortcut})',
  'canvas.format.textColor': 'Textfarbe',
  'canvas.format.highlight': 'Hervorheben',
  'canvas.format.subscript': 'Tiefgestellt',
  'canvas.format.superscript': 'Hochgestellt',
  'canvas.format.link': 'Link',
  'canvas.format.removeLink': 'Link entfernen',
  'canvas.format.clearFormatting': 'Formatierung löschen',
} satisfies Translation<typeof en>;
