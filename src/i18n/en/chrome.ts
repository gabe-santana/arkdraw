/** English UI strings — chrome. Keys are globally unique: 'chrome.<key>'. */
export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Clear search',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': 'Mixed',
  // color picker section: recently used colors
  'chrome.ui.recentColors': 'Recent',

  // Toolbar (floating tool dock) and zoom pill
  // aria-label of the tool dock
  'chrome.toolbar.label': 'Tools',
  'chrome.toolbar.playAnimation': 'Play animation',
  'chrome.toolbar.pauseAnimation': 'Pause animation',
  'chrome.zoom.out': 'Zoom out',
  'chrome.zoom.in': 'Zoom in',
  // button showing the zoom percentage; opens zoom presets
  'chrome.zoom.options': 'Zoom options',

  // Outline
  // noun: the minimap panel's title
  'chrome.outline.title': 'Outline',
  'chrome.outline.close': 'Close outline',

  // PageTabs
  // context menu on a page tab: edit the page's custom data
  'chrome.pageTabs.editData': 'Edit data…',
  'chrome.pageTabs.insertPage': 'Insert page',

  // StartScreen
  'chrome.start.title': 'Welcome to ArkDraw',
  'chrome.start.subtitle': 'Start a new diagram or pick up where you left off.',
  'chrome.start.blank': 'Blank diagram',
  'chrome.start.blankSub': 'Start from an empty canvas',
  'chrome.start.templates': 'Templates…',
  // "My templates" is the name of the user's own template category
  'chrome.start.templatesSub': 'Browse the gallery and My templates',
  // verb: open a file
  'chrome.start.open': 'Open…',
  'chrome.start.openSubDesktop': 'A file on this computer',
  'chrome.start.openSubWeb': 'A file from your device',
  'chrome.start.openBrowser': 'Open from browser…',
  'chrome.start.openBrowserSub': 'Diagrams saved in this browser',
  // section heading: a few quick templates
  'chrome.start.templatesHeading': 'Templates',
  // section heading: recently opened files
  'chrome.start.recentHeading': 'Recent',
  'chrome.start.recentEmpty': 'Files you open or save will show up here.',
  'chrome.start.dontShow': 'Don’t show this again',
  'chrome.start.reenableHint': 'Turn it back on in Preferences',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Edit data',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Shown in the layers panel',
  'chrome.editData.tooltip': 'Tooltip',
  'chrome.editData.tooltipPlaceholder': 'Shown on hover',
  // noun: hyperlink of a shape
  'chrome.editData.link': 'Link',
  // segmented option: link to a web address (vs. to a page)
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Tags',
  // example tags shown as placeholder
  'chrome.editData.tagsPlaceholder': 'frontend, critical',
  // custom key/value properties of a shape
  'chrome.editData.properties': 'Properties',
  // placeholder of a property's key field
  'chrome.editData.keyPlaceholder': 'key',
  // placeholder of a property's value field
  'chrome.editData.valuePlaceholder': 'value',
  'chrome.editData.addProperty': 'Add property',
  // {token} is the literal code token %property%
  'chrome.editData.placeholders': 'Show {token} placeholders in the label',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Edit style',
  'chrome.editStyle.subtitleDrawio': 'Style string (key=value;) — applied to the whole selection',
  // format option: the key=value; style string syntax (vs. "ArkDraw" keys)
  'chrome.editStyle.styleString': 'Style string',
  'chrome.editStyle.subtitleOpendraw': 'ArkDraw style keys, one per line — applied to the whole selection',
  'chrome.editStyle.keptKeys': 'Keys ArkDraw doesn’t use are kept and written back on .drawio export.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Edit diagram',
  'chrome.editDiagram.subtitle': 'The current page as ArkDraw JSON. Changes are undoable.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Toggle replace',
  'chrome.find.placeholder': 'Find in labels, names, tooltips and data',
  'chrome.find.matchCase': 'Match case',
  'chrome.find.wholeWord': 'Whole word',
  'chrome.find.regex': 'Regular expression',
  'chrome.find.allPages': 'All pages',
  // tiny toggle button: search all pages (keep very short)
  'chrome.find.allPagesShort': 'All',
  'chrome.find.replaceWith': 'Replace with',
  // verb: replace the current match
  'chrome.find.replace': 'Replace',
  // button next to "Replace": replace all matches (keep short)
  'chrome.find.replaceAll': 'All',

  // EditDialogs — Import from text
  'chrome.import.none': 'No text importers are installed.',
  'chrome.import.fromText': 'Import from text',
  'chrome.import.asNewPage': 'As new page',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Shapes',
  'chrome.dock.panel.format': 'Format',
  'chrome.dock.panel.layers': 'Layers',
  'chrome.dock.moveLeft': 'Move to left side',
  'chrome.dock.moveRight': 'Move to right side',
  'chrome.dock.moveUp': 'Move up',
  'chrome.dock.moveDown': 'Move down',
  'chrome.dock.reset': 'Reset panel layout',
  // {panel} is a panel name: Shapes, Format or Layers.
  'chrome.dock.handleAria': '{panel} panel: drag to move, click for options',
  'chrome.dock.handleTitle': 'Drag to move · click for options',
  // Drop zone for a dragged panel.
  'chrome.dock.dropHere': 'Drop here',
  'chrome.dock.resizeLeft': 'Resize left panels',
  'chrome.dock.resizeRight': 'Resize right panels',
  'chrome.rightTabs.aria': 'Right panel',
  'chrome.rightTabs.design': 'Design',
  'chrome.rightTabs.designHint': 'Style and layers of what you select',
  'chrome.rightTabs.ai': 'AI',
  'chrome.rightTabs.aiHint': 'Say what you want: the assistant draws or edits it',
  'chrome.dock.resizeAi': 'Resize the AI panel',
} as const;
