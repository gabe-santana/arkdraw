import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': 'area di disegno del diagramma',
  'canvas.ariaLabel': 'Area di disegno del diagramma. Tab passa da una forma all’altra, Alt+Freccia segue le connessioni, Shift+F10 apre il menu contestuale.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Inizia da un’area di disegno vuota',
  'canvas.empty.body': 'Trascina le forme dalla libreria, disegna con la barra degli strumenti oppure descrivi un diagramma e lascia che l’IA lo abbozzi per te.',
  'canvas.empty.rectangle': 'rettangolo',
  'canvas.empty.connector': 'connettore',
  'canvas.empty.ai': 'IA',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': 'Sostituisci con…',
  'canvas.picker.insertShape': 'Inserisci forma…',
  'canvas.picker.noMatch': 'Nessuna forma corrispondente.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Gruppi aperti',
  'canvas.group.backToDiagram': 'Torna all’intero diagramma (Home)',
  'canvas.group.group': 'Gruppo',
  'canvas.group.subgroup': 'Sottogruppo',
  'canvas.group.exit': 'Esci dal gruppo',
  'canvas.group.nothingNested': 'Nessun elemento annidato nella selezione',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': 'Raggruppati · {count}',
  'canvas.flash.ungrouped': 'Separati · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': 'Angolo {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'L’azione di questo collegamento non è un JSON valido.',
  'canvas.link.pageMissing': 'Quella pagina non esiste più.',
  'canvas.link.unsupportedScheme': 'Si possono aprire solo collegamenti web, e-mail e telefonici.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Icona',
  'canvas.aria.connectorRole': 'connettore',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': 'Connettore da {from} a {to}',
  'canvas.aria.connectorNamedFromTo': 'Connettore “{text}” da {from} a {to}',
  'canvas.aria.nothing': 'niente',
  'canvas.aria.nothingSelected': 'Nessuna selezione',
  'canvas.aria.selectedOne': 'Selezionato: {description}',
  'canvas.aria.selectedMany': '{count, plural, one {Selezionato # elemento} other {Selezionati # elementi}}',

  // TableCellLayer
  'canvas.table.cellLabel': 'Cella riga {row}, colonna {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Fai doppio clic per aggiungere un punto',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Opzioni pennello',
  'canvas.brush.title': 'Pennello',
  'canvas.brush.color': 'Colore pennello',
  'canvas.brush.smooth': 'Levigatura',
  'canvas.brush.pressure': 'Pressione penna (spessore variabile)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Spostabile',
  'canvas.behavior.movableHint': 'Si può trascinare o spostare con le frecce',
  'canvas.behavior.resizable': 'Ridimensionabile',
  'canvas.behavior.resizableHint': 'Mostra le maniglie di ridimensionamento',
  'canvas.behavior.rotatable': 'Ruotabile',
  'canvas.behavior.rotatableHint': 'Mostra la maniglia di rotazione',
  'canvas.behavior.deletable': 'Eliminabile',
  'canvas.behavior.deletableHint': 'Canc lo rimuove',
  'canvas.behavior.editable': 'Modificabile',
  'canvas.behavior.editableHint': 'Il doppio clic modifica l’etichetta',
  'canvas.behavior.connectable': 'Collegabile',
  'canvas.behavior.connectableHint': 'I connettori possono agganciarsi',
  'canvas.behavior.selectable': 'Selezionabile',
  'canvas.behavior.selectableHint': 'Si seleziona con clic e riquadro di selezione',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Formato testo',
  'canvas.format.bold': 'Grassetto ({shortcut})',
  'canvas.format.italic': 'Corsivo ({shortcut})',
  'canvas.format.underline': 'Sottolineato ({shortcut})',
  'canvas.format.strikethrough': 'Barrato',
  'canvas.format.smaller': 'Più piccolo ({shortcut})',
  'canvas.format.larger': 'Più grande ({shortcut})',
  'canvas.format.textColor': 'Colore testo',
  'canvas.format.highlight': 'Evidenzia',
  'canvas.format.subscript': 'Pedice',
  'canvas.format.superscript': 'Apice',
  'canvas.format.link': 'Collegamento',
  'canvas.format.removeLink': 'Rimuovi collegamento',
  'canvas.format.clearFormatting': 'Cancella formattazione',
} satisfies Translation<typeof en>;
