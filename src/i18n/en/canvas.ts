/** English UI strings — canvas. Keys are globally unique: 'canvas.<key>'. */
export default {
  // Canvas (screen-reader description of the drawing area)
  // context: aria-roledescription, read by screen readers instead of "application"; lowercase
  'canvas.roleDescription': 'diagram canvas',
  'canvas.ariaLabel': 'Diagram canvas. Tab moves between shapes, Alt+Arrow follows connections, Shift+F10 opens the context menu.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Start with a blank canvas',
  'canvas.empty.body': 'Drag shapes from the library, draw with the toolbar, or describe a diagram and let AI sketch it for you.',
  // context: shown after the "R" key cap — the R key draws a rectangle; lowercase noun
  'canvas.empty.rectangle': 'rectangle',
  // context: shown after the "L" key cap — the L key draws a connector (line/arrow); lowercase noun
  'canvas.empty.connector': 'connector',
  // context: shown after the "Ctrl I" key caps — opens the AI diagram generator; abbreviation of artificial intelligence
  'canvas.empty.ai': 'AI',

  // ShapePicker (quick shape picker on double-click)
  // context: search placeholder when swapping the selected shapes for another shape
  'canvas.picker.replaceWith': 'Replace with…',
  // context: search placeholder when adding a new shape at the clicked point
  'canvas.picker.insertShape': 'Insert shape…',
  'canvas.picker.noMatch': 'No shapes match.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Entered groups',
  // context: tooltip; "Home" is the keyboard key name
  'canvas.group.backToDiagram': 'Back to the whole diagram (Home)',
  // context: breadcrumb item — noun, the outermost entered group
  'canvas.group.group': 'Group',
  // context: breadcrumb item — noun, a group nested inside another group
  'canvas.group.subgroup': 'Subgroup',
  // context: button — verb, leave the current group
  'canvas.group.exit': 'Exit group',
  'canvas.group.nothingNested': 'Nothing nested in the selection',

  // OverlayLayer (brief badge after grouping / ungrouping)
  // context: badge with the number of grouped shapes, e.g. "Grouped · 3"
  'canvas.flash.grouped': 'Grouped · {count}',
  // context: badge with the number of released shapes, e.g. "Ungrouped · 3"
  'canvas.flash.ungrouped': 'Ungrouped · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  // context: value tooltip while dragging the corner-radius handle, e.g. "Corner 12"
  'canvas.param.corner': 'Corner {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'This link action is not valid JSON.',
  'canvas.link.pageMissing': 'That page no longer exists.',
  'canvas.link.unsupportedScheme': 'Only web, mail and phone links can be opened.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Icon',
  // context: aria-roledescription of a connector element; lowercase
  'canvas.aria.connectorRole': 'connector',
  // context: element label for screen readers — {kind} is the shape type (e.g. "Rectangle"), {text} its label
  'canvas.aria.labeled': '{kind}: {text}',
  // context: {from}/{to} are the labels of the connected shapes
  'canvas.aria.connectorFromTo': 'Connector from {from} to {to}',
  // context: {text} is the connector's own label; {from}/{to} the connected shapes
  'canvas.aria.connectorNamedFromTo': 'Connector "{text}" from {from} to {to}',
  // context: stands in for a missing endpoint in "Connector from {from} to {to}"
  'canvas.aria.nothing': 'nothing',
  'canvas.aria.nothingSelected': 'Nothing selected',
  // context: {description} is e.g. "Rectangle: Login" or "Connector from A to B"
  'canvas.aria.selectedOne': 'Selected {description}',
  'canvas.aria.selectedMany': 'Selected {count, plural, one {# element} other {# elements}}',

  // TableCellLayer
  // context: screen-reader label of the table cell being edited (1-based numbers)
  'canvas.table.cellLabel': 'Cell row {row}, column {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Double-click to add a point',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Brush options',
  // context: heading — noun, the freehand drawing brush
  'canvas.brush.title': 'Brush',
  'canvas.brush.color': 'Brush color',
  // context: slider label in a narrow column — noun/adjective, stroke smoothing amount
  'canvas.brush.smooth': 'Smooth',
  'canvas.brush.pressure': 'Pen pressure (variable width)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Movable',
  'canvas.behavior.movableHint': 'Can be dragged or nudged',
  'canvas.behavior.resizable': 'Resizable',
  'canvas.behavior.resizableHint': 'Shows resize handles',
  'canvas.behavior.rotatable': 'Rotatable',
  'canvas.behavior.rotatableHint': 'Shows the rotation handle',
  'canvas.behavior.deletable': 'Deletable',
  // context: "Delete" is the keyboard key / command
  'canvas.behavior.deletableHint': 'Delete removes it',
  'canvas.behavior.editable': 'Editable',
  'canvas.behavior.editableHint': 'Double-click edits the label',
  'canvas.behavior.connectable': 'Connectable',
  'canvas.behavior.connectableHint': 'Connectors can attach to it',
  'canvas.behavior.selectable': 'Selectable',
  // context: "rubber bands" = the drag-to-select marquee rectangle
  'canvas.behavior.selectableHint': 'Clicks and rubber bands pick it',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Text format',
  'canvas.format.bold': 'Bold ({shortcut})',
  'canvas.format.italic': 'Italic ({shortcut})',
  'canvas.format.underline': 'Underline ({shortcut})',
  'canvas.format.strikethrough': 'Strikethrough',
  // context: button — make the selected text smaller
  'canvas.format.smaller': 'Smaller ({shortcut})',
  // context: button — make the selected text larger
  'canvas.format.larger': 'Larger ({shortcut})',
  'canvas.format.textColor': 'Text color',
  // context: button — text background highlight colour (noun/verb as in a highlighter pen)
  'canvas.format.highlight': 'Highlight',
  'canvas.format.subscript': 'Subscript',
  'canvas.format.superscript': 'Superscript',
  // context: button — insert a hyperlink
  'canvas.format.link': 'Link',
  'canvas.format.removeLink': 'Remove link',
  'canvas.format.clearFormatting': 'Clear formatting',
} as const;
