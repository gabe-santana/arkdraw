import type en from '../../en/automation';
import type { Translation } from '../../types';

export default {
  // formUi (key/value editor)
  'automation.kv.keyPlaceholder': 'clave',
  'automation.kv.valuePlaceholder': 'valor',
  'automation.kv.remove': 'Quitar propiedad',
  'automation.kv.add': 'Añadir propiedad',

  // ConfigurationBody
  'automation.config.title': 'Configuración',
  'automation.config.subtitle': 'Ajustes de toda la aplicación en JSON: estilos y fuente predeterminados, colores predefinidos, bibliotecas de formas, cuadrícula y guardado automático.',
  'automation.config.insertExample': 'Insertar ejemplo',
  'automation.config.keys': 'Claves: defaultVertexStyle, defaultEdgeStyle, defaultFont, customPresetColors, defaultLibraries, libraries, gridSize, autosave.',
  'automation.config.applied': 'Configuración aplicada',
  // configuration.ts — validation messages
  'automation.config.invalidJson': 'JSON no válido: {error}',
  'automation.config.notObject': 'La configuración debe ser un objeto JSON.',
  'automation.config.unknownKey': 'Clave desconocida “{key}”.',
  'automation.config.styleNotObject': '“{key}” debe ser un objeto de propiedades de estilo.',
  'automation.config.notStyleProperty': '“{key}” no es una propiedad de estilo.',
  'automation.config.stylePrimitive': '“{key}” debe ser una cadena, un número o un booleano.',
  'automation.config.styleType': '“{key}” debe ser de tipo {type}.',
  'automation.config.defaultFont': '“defaultFont” debe ser uno de estos valores: {fonts}.',
  'automation.config.customPresetColors': '“customPresetColors” debe ser una lista de colores hexadecimales como “#0ea5e9”.',
  'automation.config.defaultLibraries': '“defaultLibraries” debe ser una cadena como “general;uml”.',
  'automation.config.libraries': '“libraries” debe ser una lista de URL http(s).',
  'automation.config.gridSize': '“gridSize” debe ser un número entre 1 y 200.',
  'automation.config.autosave': '“autosave” debe ser true o false.',
  'automation.config.librarySelectionNote': 'La selección de bibliotecas de formas se aplica la próxima vez que se abra el panel Formas.',
  'automation.config.librariesLoaded': '{count, plural, one {Se cargó # biblioteca personalizada} other {Se cargaron # bibliotecas personalizadas}}.',
  'automation.librariesFailed': '{count, plural, one {No se pudo cargar # biblioteca} other {No se pudieron cargar # bibliotecas}} (red o CORS).',
  'automation.urlParams.librariesLoaded': '{count, plural, one {Se cargó # biblioteca personalizada} other {Se cargaron # bibliotecas personalizadas}}',

  // LayoutJsonBody
  'automation.layoutJson.title': 'Aplicar diseño desde JSON',
  'automation.layoutJson.subtitle':
    'JSON de diseño de mxGraph: mxHierarchicalLayout, mxCompactTreeLayout, mxRadialTreeLayout, mxFastOrganicLayout, mxCircleLayout, mxOrgChartLayout, mxParallelEdgeLayout. Se aplica a la selección o a toda la página.',
  'automation.layoutJson.example': 'Ejemplo',
  'automation.layoutJson.apply': 'Aplicar diseño',
  'automation.layoutJson.nothing': 'No hay nada que organizar',

  // PrintBody
  'automation.print.title': 'Imprimir',
  'automation.print.subtitle': 'Abre el cuadro de diálogo de impresión del sistema con esta configuración.',
  'automation.print.all': 'Todas ({count})',
  'automation.print.current': 'Actual',
  'automation.print.range': 'Rango',
  'automation.print.fromTo': 'De {from} a {to}',
  'automation.print.scaling': 'Escala',
  'automation.print.fitOne': 'Ajustar a 1 hoja',
  'automation.print.fitSheets': 'Ajustar a hojas',
  'automation.print.scale': 'Escala',
  'automation.print.sheets': '{cols} de ancho × {rows} de alto',
  'automation.print.scaleHint': 'Imprimir al {percent}: las páginas más grandes se reparten en varias hojas.',
  'automation.print.paper': 'Papel',
  'automation.print.orientation': 'Orientación',
  'automation.print.portrait': 'Vertical',
  'automation.print.landscape': 'Horizontal',
  'automation.print.background': 'Incluir el fondo de la página',
  'automation.print.print': 'Imprimir…',

  // EmbedBody
  'automation.embed.title': 'Incrustar',
  'automation.embed.subtitle': 'Fragmentos para páginas web, wikis y Markdown. El diagrama viaja dentro del enlace: no se sube nada.',
  'automation.embed.allPages': 'Todas las páginas',
  'automation.embed.currentPage': 'Página actual',
  'automation.embed.toolbar': 'Barra de herramientas',
  'automation.embed.iframe': 'Interactivo (iframe)',
  'automation.embed.longLink': 'Enlace largo ({count}k caracteres)',
  'automation.embed.viewerLink': 'Enlace del visor',
  'automation.embed.markdownLink': 'Enlace Markdown',
  'automation.embed.imageHtml': 'Imagen (HTML, página actual)',
  'automation.embed.imageMarkdown': 'Imagen (Markdown, página actual)',
  'automation.embed.dataUriSize': 'URI de datos de {size} KB',
  'automation.embed.copy': 'Copiar {label}',

  // MermaidBody / mermaidRegen.ts
  'automation.mermaid.title': 'Editar Mermaid',
  'automation.mermaid.subtitle': 'Cambia el código fuente y aplícalo: el diagrama se regenera en su lugar (un solo paso para deshacer).',
  'automation.mermaid.noShapes': 'El código fuente de Mermaid no generó ninguna forma.',
  'automation.mermaid.gone': 'Este diagrama de Mermaid ya no está en la página.',

  // ReplayBody
  'automation.replay.title': 'Reproducir historial',
  'automation.replay.subtitle': 'Recorre el historial de revisiones de este documento (página actual), de la más antigua a la más reciente.',
  'automation.replay.loading': 'Cargando revisiones…',
  'automation.replay.emptyPage': 'Página vacía en este punto',
  'automation.replay.first': 'Primera',
  'automation.replay.last': 'Última',
  'automation.replay.play': 'Reproducir',
  'automation.replay.pause': 'Pausar',
  'automation.replay.revision': 'Revisión',
  'automation.replay.now': 'Ahora',
  'automation.replay.noRevisions': 'Aún no hay revisiones: se registran en cada guardado y cada pocos minutos de trabajo sin guardar.',

  // DataBody (Edit Data for layers, pages, the document)
  'automation.data.layerTitle': 'Editar datos de la capa',
  'automation.data.pageTitle': 'Editar datos de la página',
  'automation.data.documentTitle': 'Editar datos del documento',
  'automation.data.id': 'ID {id}',
  'automation.data.documentSubtitle': 'Valores que todas las páginas pueden usar como %placeholders%.',
  'automation.data.properties': 'Propiedades',
  'automation.data.propertiesHint': 'Las etiquetas con marcadores activados dentro de este ámbito muestran los valores de %key%',

  // PropertiesBody (File → Properties)
  'automation.props.title': 'Propiedades del archivo',
  'automation.props.author': 'Autor',
  'automation.props.authorPlaceholder': 'Quién creó este diagrama',
  'automation.props.descriptionPlaceholder': 'De qué trata este diagrama',
  'automation.props.created': 'Creado',
  'automation.props.lastSaved': 'Último guardado',
  'automation.props.labels': 'Etiquetas',
  'automation.props.images': 'Imágenes e iconos',
  'automation.props.comments': 'Comentarios',
  'automation.props.docData': 'Datos del doc.',
  'automation.props.note': 'El título, el autor y la descripción se guardan en el archivo .opendraw y se pueden usar en las etiquetas como %title%, %author% y %description%.',

  // TemplateTools (My templates, Save as template)
  'automation.templates.imported': 'Se importó la plantilla “{name}”',
  'automation.templates.importFailed': 'No se pudo importar la plantilla: {error}',
  'automation.templates.importFile': 'Importar archivo de plantilla',
  'automation.templates.importTooltip': 'Importar un archivo .{ext} u .opendraw',
  'automation.templates.fileType': 'Plantilla de ArkDraw',
  'automation.templates.deleteTitle': '¿Eliminar “{name}”?',
  'automation.templates.deleteMessage': 'La plantilla se elimina de este dispositivo. Los diagramas creados a partir de ella no se ven afectados.',
  'automation.templates.nothingToSave': 'No hay nada que guardar como plantilla.',
  'automation.templates.saved': 'Se guardó “{name}” en Mis plantillas',
  'automation.templates.saveFailed': 'No se pudo guardar la plantilla: {error}',
  'automation.templates.saveTitle': 'Guardar como plantilla',
  'automation.templates.saveSubtitle': 'Aparece en Mis plantillas en Archivo → Nuevo desde plantilla… en este dispositivo.',
  'automation.templates.optional': 'Opcional',
  'automation.templates.contents': 'Contenido',
  'automation.templates.wholeDiagram': '{count, plural, one {Diagrama completo} other {Diagrama completo (# páginas)}}',
  'automation.templates.thisPage': 'Esta página',
  'automation.templates.save': 'Guardar plantilla',

  // actions.tsx
  'automation.parallelEdgesNone': 'Ningún conector une las mismas dos formas.',
  'automation.savedToBrowser': 'Se guardó “{name}” en el navegador',

  // plugins.ts (Explore, Anonymize, Dictate)
  'automation.explore.selectFirst': 'Selecciona un elemento desde el que explorar.',
  'automation.explore.hint': 'Explorar: selecciona un vecino para avanzar; Esc para salir.',
  'automation.anonymize.title': '¿Anonimizar esta página?',
  'automation.anonymize.message':
    'Todas las etiquetas, nombres, información sobre herramientas y valores de datos se convierten en marcadores x/X, y se eliminan los comentarios, para poder compartir el diagrama sin su contenido. Puedes deshacerlo.',
  'automation.anonymize.confirm': 'Anonimizar',
  'automation.anonymize.done': 'Página anonimizada',
  'automation.dictate.unavailable': 'El reconocimiento de voz no está disponible en este navegador.',
  'automation.dictate.selectFirst': 'Selecciona una forma o un conector para dictar su etiqueta.',
  'automation.dictate.said': '“{text}”',
  'automation.dictate.denied': 'Se denegó el acceso al micrófono.',
  'automation.dictate.failed': 'Error en el dictado ({error}).',
  'automation.dictate.listening': 'Escuchando… di la etiqueta',
} satisfies Translation<typeof en>;
