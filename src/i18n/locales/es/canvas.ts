import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': 'lienzo del diagrama',
  'canvas.ariaLabel': 'Lienzo del diagrama. Tab recorre las formas, Alt+flecha sigue las conexiones y Shift+F10 abre el menú contextual.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Empieza con un lienzo en blanco',
  'canvas.empty.body': 'Arrastra formas desde la biblioteca, dibuja con la barra de herramientas o describe un diagrama y deja que la IA lo esboce por ti.',
  'canvas.empty.rectangle': 'rectángulo',
  'canvas.empty.connector': 'conector',
  'canvas.empty.ai': 'IA',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': 'Reemplazar con…',
  'canvas.picker.insertShape': 'Insertar forma…',
  'canvas.picker.noMatch': 'Ninguna forma coincide.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Grupos abiertos',
  'canvas.group.backToDiagram': 'Volver al diagrama completo (Inicio)',
  'canvas.group.group': 'Grupo',
  'canvas.group.subgroup': 'Subgrupo',
  'canvas.group.exit': 'Salir del grupo',
  'canvas.group.nothingNested': 'No hay nada anidado en la selección',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': 'Agrupado · {count}',
  'canvas.flash.ungrouped': 'Desagrupado · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': 'Esquina {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'La acción de este enlace no es un JSON válido.',
  'canvas.link.pageMissing': 'Esa página ya no existe.',
  'canvas.link.unsupportedScheme': 'Solo se pueden abrir enlaces web, de correo y de teléfono.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Icono',
  'canvas.aria.connectorRole': 'conector',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': 'Conector de {from} a {to}',
  'canvas.aria.connectorNamedFromTo': 'Conector “{text}” de {from} a {to}',
  'canvas.aria.nothing': 'nada',
  'canvas.aria.nothingSelected': 'No hay nada seleccionado',
  'canvas.aria.selectedOne': 'Seleccionado: {description}',
  'canvas.aria.selectedMany': '{count, plural, one {# elemento seleccionado} other {# elementos seleccionados}}',

  // TableCellLayer
  'canvas.table.cellLabel': 'Celda fila {row}, columna {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Haz doble clic para añadir un punto',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Opciones del pincel',
  'canvas.brush.title': 'Pincel',
  'canvas.brush.color': 'Color del pincel',
  'canvas.brush.smooth': 'Suavizado',
  'canvas.brush.pressure': 'Presión del lápiz (ancho variable)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Movible',
  'canvas.behavior.movableHint': 'Se puede arrastrar o mover ligeramente',
  'canvas.behavior.resizable': 'Redimensionable',
  'canvas.behavior.resizableHint': 'Muestra los controladores de tamaño',
  'canvas.behavior.rotatable': 'Girable',
  'canvas.behavior.rotatableHint': 'Muestra el controlador de giro',
  'canvas.behavior.deletable': 'Eliminable',
  'canvas.behavior.deletableHint': 'Supr lo elimina',
  'canvas.behavior.editable': 'Editable',
  'canvas.behavior.editableHint': 'Doble clic edita la etiqueta',
  'canvas.behavior.connectable': 'Conectable',
  'canvas.behavior.connectableHint': 'Se le pueden unir conectores',
  'canvas.behavior.selectable': 'Seleccionable',
  'canvas.behavior.selectableHint': 'Se selecciona con clics y con el rectángulo de selección',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Formato de texto',
  'canvas.format.bold': 'Negrita ({shortcut})',
  'canvas.format.italic': 'Cursiva ({shortcut})',
  'canvas.format.underline': 'Subrayado ({shortcut})',
  'canvas.format.strikethrough': 'Tachado',
  'canvas.format.smaller': 'Más pequeño ({shortcut})',
  'canvas.format.larger': 'Más grande ({shortcut})',
  'canvas.format.textColor': 'Color del texto',
  'canvas.format.highlight': 'Resaltar',
  'canvas.format.subscript': 'Subíndice',
  'canvas.format.superscript': 'Superíndice',
  'canvas.format.link': 'Enlace',
  'canvas.format.removeLink': 'Quitar enlace',
  'canvas.format.clearFormatting': 'Borrar formato',
} satisfies Translation<typeof en>;
