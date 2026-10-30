import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Borrar búsqueda',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': 'Mixto',
  // color picker section: recently used colors
  'chrome.ui.recentColors': 'Recientes',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': 'Herramientas',
  'chrome.toolbar.playAnimation': 'Reproducir animación',
  'chrome.toolbar.pauseAnimation': 'Pausar animación',
  'chrome.zoom.out': 'Alejar',
  'chrome.zoom.in': 'Acercar',
  'chrome.zoom.options': 'Opciones de zoom',

  // Outline
  'chrome.outline.title': 'Esquema',
  'chrome.outline.close': 'Cerrar esquema',

  // PageTabs
  'chrome.pageTabs.editData': 'Editar datos…',
  'chrome.pageTabs.insertPage': 'Insertar página',
  'chrome.pageTabs.allPages': 'Todas las páginas',
  'chrome.pageTabs.findPage': 'Buscar página',
  'chrome.pageTabs.noMatch': 'Ninguna página coincide',
  'chrome.pageTabs.deleteTitle': '¿Eliminar «{name}»?',
  'chrome.pageTabs.deleteMessage': '{count, plural, one {Tiene # elemento} other {Tiene # elementos}}. Eliminar una página no se puede deshacer.',

  // StartScreen
  'chrome.start.title': 'Te damos la bienvenida a ArkDraw',
  'chrome.start.subtitle': 'Empieza un diagrama nuevo o continúa donde lo dejaste.',
  'chrome.start.blank': 'Diagrama en blanco',
  'chrome.start.blankSub': 'Empezar con un lienzo vacío',
  'chrome.start.templates': 'Plantillas…',
  'chrome.start.templatesSub': 'Explorar la galería y Mis plantillas',
  'chrome.start.open': 'Abrir…',
  'chrome.start.openSubDesktop': 'Un archivo de este equipo',
  'chrome.start.openSubWeb': 'Un archivo de tu dispositivo',
  'chrome.start.openBrowser': 'Abrir desde el navegador…',
  'chrome.start.openBrowserSub': 'Diagramas guardados en este navegador',
  'chrome.start.templatesHeading': 'Plantillas',
  'chrome.start.recentHeading': 'Recientes',
  'chrome.start.recentEmpty': 'Los archivos que abras o guardes aparecerán aquí.',
  'chrome.start.dontShow': 'No volver a mostrar',
  'chrome.start.reenableHint': 'Puedes volver a activarla en Preferencias',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Editar datos',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Se muestra en el panel de capas',
  'chrome.editData.tooltip': 'Información sobre herramientas',
  'chrome.editData.tooltipPlaceholder': 'Se muestra al pasar el cursor',
  'chrome.editData.link': 'Enlace',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Etiquetas',
  'chrome.editData.tagsPlaceholder': 'frontend, crítico',
  'chrome.editData.properties': 'Propiedades',
  'chrome.editData.keyPlaceholder': 'clave',
  'chrome.editData.valuePlaceholder': 'valor',
  'chrome.editData.addProperty': 'Añadir propiedad',
  'chrome.editData.placeholders': 'Mostrar los marcadores {token} en la etiqueta',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Editar estilo',
  'chrome.editStyle.subtitleDrawio': 'Cadena de estilo (key=value;): se aplica a toda la selección',
  'chrome.editStyle.styleString': 'Cadena de estilo',
  'chrome.editStyle.subtitleArkdraw': 'Claves de estilo de ArkDraw, una por línea: se aplican a toda la selección',
  'chrome.editStyle.keptKeys': 'Las claves que ArkDraw no usa se conservan y se vuelven a escribir al exportar a .drawio.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Editar diagrama',
  'chrome.editDiagram.subtitle': 'La página actual como JSON de ArkDraw. Los cambios se pueden deshacer.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Mostrar u ocultar reemplazo',
  'chrome.find.placeholder': 'Buscar en etiquetas, nombres, información sobre herramientas y datos',
  'chrome.find.matchCase': 'Coincidir mayúsculas y minúsculas',
  'chrome.find.wholeWord': 'Palabra completa',
  'chrome.find.regex': 'Expresión regular',
  'chrome.find.allPages': 'Todas las páginas',
  'chrome.find.allPagesShort': 'Todas',
  'chrome.find.replaceWith': 'Reemplazar con',
  'chrome.find.replace': 'Reemplazar',
  'chrome.find.replaceAll': 'Todo',

  // EditDialogs — Import from text
  'chrome.import.none': 'No hay importadores de texto instalados.',
  'chrome.import.fromText': 'Importar desde texto',
  'chrome.import.asNewPage': 'Como página nueva',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Formas',
  'chrome.dock.panel.format': 'Formato',
  'chrome.dock.panel.layers': 'Capas',
  'chrome.dock.moveLeft': 'Mover al lado izquierdo',
  'chrome.dock.moveRight': 'Mover al lado derecho',
  'chrome.dock.moveUp': 'Subir',
  'chrome.dock.moveDown': 'Bajar',
  'chrome.dock.reset': 'Restablecer disposición de paneles',
  'chrome.dock.handleAria': 'Panel {panel}: arrastra para mover, haz clic para ver opciones',
  'chrome.dock.handleTitle': 'Arrastra para mover · haz clic para ver opciones',
  'chrome.dock.dropHere': 'Soltar aquí',
  'chrome.dock.resizeLeft': 'Cambiar tamaño de los paneles izquierdos',
  'chrome.dock.resizeRight': 'Cambiar tamaño de los paneles derechos',
  'chrome.rightTabs.aria': 'Panel derecho',
  'chrome.rightTabs.design': 'Diseño',
  'chrome.rightTabs.designHint': 'Estilo de lo que seleccionas',
  'chrome.rightTabs.layersHint': 'Capas y todos los elementos, de delante hacia atrás',
  'chrome.rightTabs.ai': 'IA',
  'chrome.rightTabs.aiHint': 'Di lo que quieres: el asistente lo dibuja o lo edita',
} satisfies Translation<typeof en>;
