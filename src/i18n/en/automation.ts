/**
 * English UI strings — automation (src/automation): Configuration, Layout from
 * JSON, Print, Embed, Edit Mermaid, Replay, Edit Data, File properties, user
 * templates and the automation commands' messages. Keys: 'automation.<key>'.
 */
export default {
  // formUi (key/value editor)
  // placeholder of the property-name input (a data key, not a keyboard key)
  'automation.kv.keyPlaceholder': 'key',
  // placeholder of the property-value input
  'automation.kv.valuePlaceholder': 'value',
  'automation.kv.remove': 'Remove property',
  'automation.kv.add': 'Add property',

  // ConfigurationBody
  'automation.config.title': 'Configuration',
  'automation.config.subtitle': 'App-wide settings as JSON: default styles and font, preset colours, shape libraries, grid and autosave.',
  'automation.config.insertExample': 'Insert example',
  // the key names are JSON keys: keep them in English
  'automation.config.keys': 'Keys: defaultVertexStyle, defaultEdgeStyle, defaultFont, customPresetColors, defaultLibraries, libraries, gridSize, autosave.',
  'automation.config.applied': 'Configuration applied',
  // configuration.ts — validation messages listed under the JSON editor; quoted names are JSON keys (keep them)
  'automation.config.invalidJson': 'Invalid JSON: {error}',
  'automation.config.notObject': 'The configuration must be a JSON object.',
  'automation.config.unknownKey': 'Unknown key "{key}".',
  'automation.config.styleNotObject': '"{key}" must be an object of style properties.',
  'automation.config.notStyleProperty': '"{key}" is not a style property.',
  'automation.config.stylePrimitive': '"{key}" must be a string, number or boolean.',
  // {type} is a JavaScript type name: string, number or boolean
  'automation.config.styleType': '"{key}" must be a {type}.',
  'automation.config.defaultFont': '"defaultFont" must be one of {fonts}.',
  'automation.config.customPresetColors': '"customPresetColors" must be a list of hex colours like "#0ea5e9".',
  'automation.config.defaultLibraries': '"defaultLibraries" must be a string like "general;uml".',
  'automation.config.libraries': '"libraries" must be a list of http(s) URLs.',
  'automation.config.gridSize': '"gridSize" must be a number between 1 and 200.',
  'automation.config.autosave': '"autosave" must be true or false.',
  'automation.config.librarySelectionNote': 'Shape library selection applies the next time the Shapes panel opens.',
  'automation.config.librariesLoaded': 'Loaded {count, plural, one {# custom library} other {# custom libraries}}.',
  // shape libraries loaded from URLs (Configuration and the ?clibs= URL parameter)
  'automation.librariesFailed': 'Could not load {count, plural, one {# library} other {# libraries}} (network or CORS).',
  // urlParams.ts — toast after loading ?clibs= shape libraries
  'automation.urlParams.librariesLoaded': 'Loaded {count, plural, one {# custom library} other {# custom libraries}}',

  // LayoutJsonBody
  'automation.layoutJson.title': 'Apply layout from JSON',
  'automation.layoutJson.subtitle':
    'mxGraph layout JSON: mxHierarchicalLayout, mxCompactTreeLayout, mxRadialTreeLayout, mxFastOrganicLayout, mxCircleLayout, mxOrgChartLayout, mxParallelEdgeLayout. Applies to the selection, or the whole page.',
  // button: fills the editor with sample JSON
  'automation.layoutJson.example': 'Example',
  'automation.layoutJson.apply': 'Apply layout',
  'automation.layoutJson.nothing': 'Nothing to lay out',

  // PrintBody
  'automation.print.title': 'Print',
  'automation.print.subtitle': 'Opens the system print dialog with these settings.',
  // page choice: all pages, with the page count
  'automation.print.all': 'All ({count})',
  // page choice: the current page only
  'automation.print.current': 'Current',
  // page choice: a range of pages
  'automation.print.range': 'Range',
  // {from} and {to} are number inputs
  'automation.print.fromTo': 'From {from} to {to}',
  'automation.print.scaling': 'Scaling',
  'automation.print.fitOne': 'Fit to 1 sheet',
  'automation.print.fitSheets': 'Fit to sheets',
  // scaling option: print at a percentage
  'automation.print.scale': 'Scale',
  // {cols} and {rows} are number inputs: number of sheets across and down
  'automation.print.sheets': '{cols} wide × {rows} tall',
  // {percent} is a number input followed by "%"
  'automation.print.scaleHint': 'Print at {percent} — larger pages are tiled across sheets.',
  // paper size
  'automation.print.paper': 'Paper',
  'automation.print.orientation': 'Orientation',
  'automation.print.portrait': 'Portrait',
  'automation.print.landscape': 'Landscape',
  'automation.print.background': 'Include page background',
  // button: opens the system print dialog
  'automation.print.print': 'Print…',

  // EmbedBody
  'automation.embed.title': 'Embed',
  'automation.embed.subtitle': 'Snippets for web pages, wikis and Markdown. The diagram travels inside the link — nothing is uploaded.',
  'automation.embed.allPages': 'All pages',
  'automation.embed.currentPage': 'Current page',
  // switch: show the viewer toolbar in the embedded diagram
  'automation.embed.toolbar': 'Toolbar',
  'automation.embed.iframe': 'Interactive (iframe)',
  // {count} is thousands of characters
  'automation.embed.longLink': 'Long link ({count}k chars)',
  'automation.embed.viewerLink': 'Viewer link',
  'automation.embed.markdownLink': 'Markdown link',
  'automation.embed.imageHtml': 'Image (HTML, current page)',
  'automation.embed.imageMarkdown': 'Image (Markdown, current page)',
  'automation.embed.dataUriSize': '{size} KB data URI',
  // copy button; {label} is the snippet name, e.g. "Viewer link"
  'automation.embed.copy': 'Copy {label}',

  // MermaidBody / mermaidRegen.ts
  'automation.mermaid.title': 'Edit Mermaid',
  'automation.mermaid.subtitle': 'Change the source and apply: the diagram is regenerated in place (one undo step).',
  'automation.mermaid.noShapes': 'The Mermaid source produced no shapes.',
  'automation.mermaid.gone': 'This Mermaid diagram is no longer on the page.',

  // ReplayBody
  // dialog title: plays the revision history back as an animation
  'automation.replay.title': 'Replay',
  'automation.replay.subtitle': 'Steps through this document’s revision history (current page), oldest first.',
  'automation.replay.loading': 'Loading revisions…',
  'automation.replay.emptyPage': 'Empty page at this point',
  // button: jump to the first revision
  'automation.replay.first': 'First',
  // button: jump to the last revision
  'automation.replay.last': 'Last',
  'automation.replay.play': 'Play',
  'automation.replay.pause': 'Pause',
  // slider: the revision shown
  'automation.replay.revision': 'Revision',
  // the current (unsaved) state, shown instead of a date
  'automation.replay.now': 'Now',
  'automation.replay.noRevisions': 'No revisions yet: they are recorded on every save and every few minutes of unsaved work.',

  // DataBody (Edit Data for layers, pages, the document)
  'automation.data.layerTitle': 'Edit layer data',
  'automation.data.pageTitle': 'Edit page data',
  'automation.data.documentTitle': 'Edit document data',
  'automation.data.id': 'ID {id}',
  // %placeholders% is literal syntax: keep the percent signs
  'automation.data.documentSubtitle': 'Values every page can use as %placeholders%.',
  'automation.data.properties': 'Properties',
  // %key% is literal placeholder syntax
  'automation.data.propertiesHint': 'Labels with placeholders on, inside this scope, show %key% values',

  // PropertiesBody (File → Properties)
  'automation.props.title': 'File properties',
  'automation.props.author': 'Author',
  'automation.props.authorPlaceholder': 'Who made this diagram',
  'automation.props.descriptionPlaceholder': 'What this diagram is about',
  // date the file was created
  'automation.props.created': 'Created',
  'automation.props.lastSaved': 'Last saved',
  // statistic: number of text labels
  'automation.props.labels': 'Labels',
  'automation.props.images': 'Images & icons',
  'automation.props.comments': 'Comments',
  // statistic: number of document-level data properties
  'automation.props.docData': 'Doc data',
  // %title%, %author%, %description% are literal placeholders: keep them
  'automation.props.note': 'Title, author and description are saved in the .opendraw file and can be used in labels as %title%, %author% and %description%.',

  // TemplateTools (My templates, Save as template)
  'automation.templates.imported': 'Imported template “{name}”',
  'automation.templates.importFailed': 'Could not import template: {error}',
  'automation.templates.importFile': 'Import template file',
  // {ext} is a file extension
  'automation.templates.importTooltip': 'Import a .{ext} or .opendraw file',
  // file-type name in the save dialog
  'automation.templates.fileType': 'ArkDraw template',
  'automation.templates.deleteTitle': 'Delete “{name}”?',
  'automation.templates.deleteMessage': 'The template is removed from this device. Diagrams made from it are not affected.',
  'automation.templates.nothingToSave': 'There is nothing to save as a template.',
  // "My templates" is the name of the template category
  'automation.templates.saved': 'Saved “{name}” to My templates',
  'automation.templates.saveFailed': 'Could not save the template: {error}',
  'automation.templates.saveTitle': 'Save as template',
  // "My templates" is the template category; "File → New from template…" is a menu path
  'automation.templates.saveSubtitle': 'Appears under My templates in File → New from template… on this device.',
  // placeholder of an optional description field
  'automation.templates.optional': 'Optional',
  // what the template contains: whole diagram / this page / selection
  'automation.templates.contents': 'Contents',
  'automation.templates.wholeDiagram': '{count, plural, one {Whole diagram} other {Whole diagram (# pages)}}',
  'automation.templates.thisPage': 'This page',
  'automation.templates.save': 'Save template',

  // actions.tsx
  'automation.parallelEdgesNone': 'No connectors share the same two shapes.',
  'automation.savedToBrowser': 'Saved “{name}” to the browser',

  // plugins.ts (Explore, Anonymize, Dictate)
  'automation.explore.selectFirst': 'Select an element to explore from.',
  // Esc is the Escape key
  'automation.explore.hint': 'Explore: select a neighbour to move on, Esc to exit.',
  'automation.anonymize.title': 'Anonymize this page?',
  'automation.anonymize.message':
    'Every label, name, tooltip and data value becomes x/X placeholders, and comments are removed, so the diagram can be shared without its content. You can undo this.',
  // confirm button (verb)
  'automation.anonymize.confirm': 'Anonymize',
  'automation.anonymize.done': 'Page anonymized',
  'automation.dictate.unavailable': 'Speech recognition is not available in this browser.',
  'automation.dictate.selectFirst': 'Select a shape or connector to dictate its label.',
  // echoes what was recognized
  'automation.dictate.said': '“{text}”',
  'automation.dictate.denied': 'Microphone access was denied.',
  'automation.dictate.failed': 'Dictation failed ({error}).',
  'automation.dictate.listening': 'Listening… say the label',
} as const;
