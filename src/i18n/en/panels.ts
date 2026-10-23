/**
 * English UI strings — panels. Keys are globally unique: 'panels.<key>'.
 * The Format panel is narrow (~280px): row labels sit in a 64px column and
 * number-field prefixes in a 28px box, so keep those translations short.
 */
export default {
  // Shared within the panels
  // Shown when the selection has different values for a property.
  'panels.mixed': 'Mixed',
  // Button that opens an editor dialog.
  'panels.editEllipsis': 'Edit…',
  // Verb (button / menu item): lock the element(s).
  'panels.lock': 'Lock',
  // Verb (button / menu item): unlock the element(s).
  'panels.unlock': 'Unlock',
  // Number-field prefix (max ~2 letters): abbreviation of "Width".
  'panels.abbr.width': 'W',
  // Number-field prefix (max ~2 letters): abbreviation of "Height".
  'panels.abbr.height': 'H',
  // Number-field prefix (max ~2 letters): abbreviation of "Size".
  'panels.abbr.size': 'Sz',
  // Switch: hand-drawn (rough.js) rendering.
  'panels.sketch': 'Sketch (hand-drawn)',
  'panels.alignLeft': 'Align left',
  'panels.alignCenter': 'Align center',
  'panels.alignRight': 'Align right',

  // PropertiesPanel
  'panels.formatPanel': 'Format panel',
  // Header title when nothing is selected.
  'panels.header.canvas': 'Canvas',
  'panels.header.nothingSelected': 'Nothing selected',
  'panels.header.icon': 'Icon',
  'panels.header.elements': '{count, plural, one {# element} other {# elements}}',
  'panels.header.connectorCount': '{count, plural, one {# connector} other {# connectors}}',
  'panels.canvas.theme': 'Theme',
  'panels.canvas.themeLight': 'Light',
  'panels.canvas.themeDark': 'Dark',
  'panels.canvas.adaptColors': 'Adapt diagram colors in dark mode',
  // Section title: canvas settings (grid, snapping…).
  'panels.canvas.title': 'Canvas',
  'panels.canvas.showGrid': 'Show grid',
  'panels.canvas.snapToGrid': 'Snap to grid',
  'panels.canvas.smartGuides': 'Smart guides',
  'panels.canvas.gridSize': 'Grid size',
  'panels.tips.title': 'Tips',
  // {dot} is rendered as the highlighted words of 'panels.tips.blueDot'.
  'panels.tips.connect': 'Hover a shape and drag from a {dot} to connect.',
  'panels.tips.blueDot': 'blue dot',
  // {key} is the key name "Ctrl".
  'panels.tips.duplicate': 'Hold {key} while dragging to duplicate.',
  // {key} is the shortcut "Ctrl K".
  'panels.tips.palette': 'Press {key} for every command.',
  'panels.canvas.elementCount': '{count, plural, one {# element on canvas} other {# elements on canvas}}',
  // Section title: noun (fill color of shapes).
  'panels.fill': 'Fill',
  'panels.fillColor': 'Fill color',
  'panels.dropShadow': 'Drop shadow',
  // Section title: noun (outline of shapes / connector line).
  'panels.stroke': 'Stroke',
  'panels.strokeColor': 'Stroke color',
  'panels.stroke.solid': 'Solid',
  'panels.stroke.dashed': 'Dashed',
  'panels.stroke.dotted': 'Dotted',
  'panels.text.bold': 'Bold',
  'panels.text.italic': 'Italic',
  // Vertical text alignment.
  'panels.text.top': 'Top',
  // Vertical text alignment.
  'panels.text.middle': 'Middle',
  // Vertical text alignment.
  'panels.text.bottom': 'Bottom',
  'panels.text.color': 'Text color',
  'panels.animation.title': 'Animation',
  // Button: pause the animation preview.
  'panels.animation.pause': 'Pause',
  // Button: play the animations on the canvas.
  'panels.animation.preview': 'Preview',
  'panels.animation.none': 'No animation',
  'panels.animation.flow': 'Flow (marching dashes)',
  'panels.animation.dots': 'Travelling dots',
  'panels.animation.pulse': 'Pulse',
  // Shape animation option "none" (emphasis effects: pulse, glow, bounce).
  'panels.animation.noEmphasis': 'No emphasis',
  'panels.animation.glow': 'Glow',
  'panels.animation.bounce': 'Bounce',
  'panels.animation.speed': 'Speed',
  'panels.animation.reverse': 'Reverse direction',
  // Row label: reveal step number in presentation/animation order.
  'panels.animation.step': 'Step',
  'panels.animation.revealInOrder': 'Reveal in selection order',
  'panels.animation.hint': 'Step 0 = always visible. Export as GIF from File → Export.',
  // Section title (several shapes selected).
  'panels.arrange.align': 'Align',
  // Section title (one element selected): z-order, grouping, locking.
  'panels.arrange.title': 'Arrange',
  'panels.arrange.sendToBack': 'Send to back',
  'panels.arrange.sendBackward': 'Send backward',
  'panels.arrange.bringForward': 'Bring forward',
  'panels.arrange.bringToFront': 'Bring to front',
  // Verb: group the selected shapes.
  'panels.arrange.group': 'Group',
  'panels.arrange.ungroup': 'Ungroup',

  // PropertiesExtras
  'panels.transform.title': 'Transform',
  'panels.transform.rotate90': 'Rotate 90°',
  'panels.transform.flipH': 'Flip horizontal',
  'panels.transform.flipV': 'Flip vertical',
  'panels.effects.title': 'Effects',
  'panels.effects.gradient': 'Gradient',
  'panels.effects.gradientColor': 'Gradient color',
  // Gradient direction.
  'panels.effects.down': 'Down',
  // Gradient direction.
  'panels.effects.up': 'Up',
  // Gradient direction.
  'panels.effects.right': 'Right',
  // Gradient direction.
  'panels.effects.left': 'Left',
  // Gradient direction.
  'panels.effects.radial': 'Radial',
  // Row label (64px): fill opacity (α = alpha).
  'panels.effects.fillAlpha': 'Fill α',
  // Row label (64px): stroke opacity (α = alpha).
  'panels.effects.strokeAlpha': 'Stroke α',
  // Row label (64px): fill pattern of hand-drawn shapes.
  'panels.effects.fillStyle': 'Fill style',
  // Hand-drawn fill pattern.
  'panels.sketchFill.hachure': 'Hachure',
  'panels.sketchFill.solid': 'Solid',
  'panels.sketchFill.zigzag': 'Zigzag',
  'panels.sketchFill.crossHatch': 'Cross hatch',
  'panels.sketchFill.dots': 'Dots',
  'panels.sketchFill.dashed': 'Dashed',
  'panels.sketchFill.zigzagLine': 'Zigzag line',
  // Switch: glossy glass effect on shapes.
  'panels.effects.glass': 'Glass',
  // Section title: text label styling.
  'panels.label.title': 'Label',
  'panels.label.underline': 'Underline',
  'panels.label.strikethrough': 'Strikethrough',
  'panels.label.verticalText': 'Vertical text',
  // Switch: label is rich (HTML) text.
  'panels.label.formatted': 'Formatted',
  // Switch: label contains LaTeX/AsciiMath formulas.
  'panels.label.math': 'Math',
  // Switch: wrap the label text.
  'panels.label.wrap': 'Wrap',
  // Row label (64px): text opacity (α = alpha).
  'panels.label.textAlpha': 'Text α',
  // Row label (64px): background color behind the label text.
  'panels.label.highlight': 'Highlight',
  'panels.label.background': 'Label background',
  'panels.data.title': 'Data',
  // Placeholder: hover tooltip text of the element.
  'panels.data.tooltip': 'Tooltip',
  // Read-only field showing a link to another page.
  'panels.data.pageLink': 'Page: {name}',
  'panels.data.linkPlaceholder': 'Link (https://…)',
  'panels.data.removeLink': 'Remove link',
  'panels.data.propertyCount': '{count, plural, one {# property} other {# properties}}',
  'panels.page.title': 'Page · {name}',
  // Row label (64px): page background color.
  'panels.page.background': 'Background',
  'panels.page.backgroundColor': 'Page background',
  // Button: replace the page background image.
  'panels.page.replaceImage': 'Replace',
  // Button: pick a background image file.
  'panels.page.chooseImage': 'Choose…',
  'panels.page.removeImage': 'Remove image',
  'panels.page.pageView': 'Page view',
  // Row label (64px): paper size (A4, Letter…).
  'panels.page.paper': 'Paper',
  'panels.page.portrait': 'Portrait',
  'panels.page.landscape': 'Landscape',
  'panels.page.shadowAll': 'Shadow on all shapes',
  // Row label (64px): measurement units.
  'panels.page.units': 'Units',

  // StyleSection
  // Section title: quick style presets.
  'panels.style.title': 'Style',
  'panels.style.setDefault': 'Set as default',
  'panels.style.setDefaultHint': 'New shapes will use this shape\'s style',
  'panels.style.myDefault': 'My default',
  // Accessible name of a style preset swatch; {name} is the preset name.
  'panels.style.presetAria': '{name} style',
  'panels.shadow.options': 'Shadow options',
  'panels.shadow.color': 'Shadow color',
  // Number-field prefix (28px box, ~4 letters max): shadow blur radius.
  'panels.shadow.blur': 'Blur',
  'panels.shadow.reset': 'Reset shadow',
  // Row label (64px): how rough the hand-drawn strokes are.
  'panels.sketch.roughness': 'Roughness',
  'panels.dark.title': 'Dark mode',
  'panels.dark.custom': 'Custom dark colors',
  // Row label (64px): dark-mode fill color.
  'panels.dark.fill': 'Fill',
  'panels.dark.fillAria': 'Dark fill',
  // Row label (64px): dark-mode line (stroke) color.
  'panels.dark.line': 'Line',
  'panels.dark.lineAria': 'Dark line',
  // Row label (64px): dark-mode text color.
  'panels.dark.text': 'Text',
  'panels.dark.textAria': 'Dark text',
  'panels.dark.hintOn': 'Used instead of the automatic tint in dark mode. Empty = automatic.',
  'panels.dark.hintOff': 'Turn on "Adapt diagram colors in dark mode" (View → Theme) to use these.',
  'panels.grid.color': 'Grid color',
  'panels.grid.scrollbars': 'Scrollbars',
  'panels.grid.hint': 'Grid, snap and grid color are saved with this page.',
  'panels.bgUrl.title': 'Background image from URL',
  // Button: load the background image from a URL.
  'panels.bgUrl.button': 'URL…',

  // TextSection
  'panels.font.aria': 'Font',
  'panels.font.searchPlaceholder': 'Search or type any font name…',
  'panels.font.custom': 'Custom font',
  // {name} is a font name the user typed.
  'panels.font.useCustom': 'Use “{name}”',
  // Hint next to a typed font name: a font installed on this computer.
  'panels.font.installed': 'installed',
  // Group of built-in font stacks.
  'panels.font.builtIn': 'Built-in',
  // Group of the operating system's fonts.
  'panels.font.system': 'System',
  // Group showing the font currently in use.
  'panels.font.current': 'Current',
  'panels.labelPos.aria': 'Label position',
  'panels.labelPos.top-left': 'Top left',
  'panels.labelPos.top': 'Top',
  'panels.labelPos.top-right': 'Top right',
  'panels.labelPos.left': 'Left',
  'panels.labelPos.inside': 'Inside',
  'panels.labelPos.right': 'Right',
  'panels.labelPos.bottom-left': 'Bottom left',
  'panels.labelPos.bottom': 'Bottom',
  'panels.labelPos.bottom-right': 'Bottom right',
  // Row label (64px): writing direction.
  'panels.textDir.title': 'Direction',
  'panels.textDir.ltr': 'Left to right',
  'panels.textDir.rtl': 'Right to left',
  // Writing direction detected from the text itself.
  'panels.textDir.auto': 'From the text',
  'panels.spacing.perSide': 'Spacing per side',
  // Number-field prefix (1 letter): Top.
  'panels.spacing.top': 'T',
  // Number-field prefix (1 letter): Right.
  'panels.spacing.right': 'R',
  // Number-field prefix (1 letter): Bottom.
  'panels.spacing.bottom': 'B',
  // Number-field prefix (1 letter): Left.
  'panels.spacing.left': 'L',
  // Row label (64px): label border color.
  'panels.label.border': 'Border',
  'panels.label.borderColor': 'Label border',
  'panels.translations.title': 'Translations',
  'panels.translations.addLanguage': 'Add language',
  'panels.translations.hint': 'Add a translated label per language. The page\'s diagram language picks which one is shown.',
  // {language} is a language name.
  'panels.translations.remove': 'Remove {language}',
  'panels.language.defaultOption': 'Default (base labels)',
  // Row label (64px): the page's diagram language.
  'panels.language.title': 'Language',

  // ConnectorSection
  // Row label (64px): arrowhead at the connector's start.
  'panels.connector.start': 'Start',
  // Row label (64px): arrowhead at the connector's end.
  'panels.connector.end': 'End',
  // Switch: draw the arrowhead filled.
  'panels.connector.arrowFill': 'Fill',
  // {name} is a connector style preset name.
  'panels.connector.presetAria': 'Style preset: {name}',
  'panels.connector.swap': 'Swap direction',
  // Section title: connector routing.
  'panels.route.title': 'Route',
  // Row label (64px): routing style.
  'panels.route.style': 'Style',
  // Row label (64px): connector shape (line, pipe, arrow…).
  'panels.route.shape': 'Shape',
  'panels.route.orthogonal': 'Orthogonal (auto)',
  'panels.route.straight': 'Straight',
  'panels.route.curved': 'Curved',
  'panels.route.elbowH': 'Elbow (horizontal)',
  'panels.route.elbowV': 'Elbow (vertical)',
  'panels.route.entity': 'Entity relation',
  'panels.route.isometric': 'Isometric',
  'panels.connShape.line': 'Line',
  'panels.connShape.link': 'Link (double line)',
  'panels.connShape.arrow': 'Simple arrow',
  'panels.connShape.flexArrow': 'Flex / wide arrow',
  'panels.connShape.pipe': 'Pipe',
  'panels.connShape.wire': 'Wire',
  'panels.connShape.filledEdge': 'Filled edge',
  // Row label (64px): line jumps where connectors cross.
  'panels.route.jumps': 'Jumps',
  // Line-jump style.
  'panels.jumps.arc': 'Arc',
  // Line-jump style.
  'panels.jumps.gap': 'Gap',
  // Line-jump style.
  'panels.jumps.sharp': 'Sharp',
  // Row label (64px): gap between connector end and shape outline.
  'panels.route.spacing': 'Spacing',
  'panels.route.clearWaypoints': 'Clear waypoints',
  'panels.connLabels.title': 'Labels',
  'panels.connLabels.hint': 'Extra labels along the connector. Drag the orange handle to move one; double-click it to edit.',
  'panels.connLabels.textAria': 'Label {n} text',
  'panels.connLabels.remove': 'Remove label',
  // Connector style presets (display names).
  'panels.connectorPreset.straight': 'Straight',
  'panels.connectorPreset.orthogonal': 'Orthogonal',
  'panels.connectorPreset.curved': 'Curved',
  'panels.connectorPreset.entity': 'Entity relation',
  'panels.connectorPreset.isometric': 'Isometric',
  'panels.connectorPreset.dependency': 'Dashed dependency',
  'panels.connectorPreset.inheritance': 'Inheritance',
  'panels.connectorPreset.association': 'Association (no arrows)',
  'panels.connectorPreset.simple-arrow': 'Simple arrow',
  'panels.connectorPreset.link': 'Link',
  // Arrowhead names (mxGraph markers).
  'panels.arrow.none': 'None',
  'panels.arrow.arrow': 'Open',
  'panels.arrow.openThin': 'Open thin',
  'panels.arrow.triangle': 'Block',
  'panels.arrow.triangleOpen': 'Open block',
  'panels.arrow.blockThin': 'Block thin',
  'panels.arrow.classic': 'Classic',
  'panels.arrow.classicThin': 'Classic thin',
  'panels.arrow.doubleBlock': 'Double block',
  'panels.arrow.diamond': 'Diamond',
  'panels.arrow.diamondOpen': 'Open diamond',
  'panels.arrow.diamondThin': 'Diamond thin',
  'panels.arrow.circle': 'Oval',
  'panels.arrow.circleOpen': 'Open oval',
  'panels.arrow.circlePlus': 'Circle plus',
  'panels.arrow.halfCircle': 'Half circle',
  // ER = entity-relationship (crow's foot) notation.
  'panels.arrow.erOne': 'ER one',
  'panels.arrow.erOnlyOne': 'ER mandatory one',
  'panels.arrow.erMany': 'ER many',
  'panels.arrow.erOneMany': 'ER one or many',
  'panels.arrow.erZeroMany': 'ER zero or many',
  'panels.arrow.erZeroOne': 'ER zero or one',
  'panels.arrow.dash': 'Dash',
  'panels.arrow.cross': 'Cross',
  'panels.arrow.halfArrow': 'Half arrow (open async)',
  'panels.arrow.async': 'Async',
  'panels.arrow.box': 'Box',
  'panels.arrow.boxOpen': 'Open box',

  // BehaviorSection
  'panels.aspect.on': 'Proportions constrained',
  'panels.aspect.off': 'Constrain proportions',
  // Switch: the shape acts as a container for other shapes.
  'panels.container': 'Container',
  'panels.group.enter': 'Enter group',
  'panels.group.exit': 'Exit group',
  'panels.group.selectContainer': 'Select container',
  'panels.behavior.title': 'Behaviour',
  // Shown when some interactions are disabled on the selection.
  'panels.behavior.restricted': 'Restricted',
  'panels.behavior.mixed': '(mixed)',
  'panels.behavior.exportHint': 'Saved as mxGraph style keys (movable=0, …) on export.',
  'panels.behavior.restrictedCount': '{count, plural, one {# element with restrictions} other {# elements with restrictions}}',
  'panels.behavior.summary': 'Movable, resizable, editable…',
  'panels.table.title': 'Table',
  'panels.table.rangeMulti': 'Rows {top}–{bottom}, columns {left}–{right}',
  'panels.table.rangeOne': 'Row {row}, column {col}',
  'panels.table.noCell': 'No cell selected — edits apply at the end / to all cells',
  // Button: insert a row above.
  'panels.table.rowAbove': 'Row above',
  // Button: insert a row below.
  'panels.table.rowBelow': 'Row below',
  // Button: insert a column to the left.
  'panels.table.colLeft': 'Column left',
  // Button: insert a column to the right.
  'panels.table.colRight': 'Column right',
  'panels.table.deleteRow': 'Delete row',
  'panels.table.deleteCol': 'Delete column',
  // Verb: merge the selected cells.
  'panels.table.merge': 'Merge',
  'panels.table.unmerge': 'Unmerge',
  'panels.table.headerRow': 'Header row',
  'panels.table.selectedCells': 'Selected cells',
  'panels.table.allCells': 'All cells',
  'panels.table.cellFill': 'Cell fill',
  'panels.table.cellText': 'Cell text',
  'panels.table.boldCells': 'Bold cells',
  'panels.table.italicCells': 'Italic cells',
  'panels.table.hint': 'Click a cell to select it, Shift-click for a range, double-click or Enter to type.',
  'panels.freehand.title': 'Freehand',
  'panels.freehand.points': '{count, plural, one {# point} other {# points}}',
  'panels.freehand.doneEditing': 'Done editing points',
  'panels.freehand.editPoints': 'Edit points',
  'panels.freehand.hint': 'Drag a point to move it. Double-click a segment to add one; double-click a point or press Delete to remove it. Esc finishes.',

  // ShapeParamsSection
  'panels.params.reset': 'Reset shape parameters',
  // Button: reset the color to automatic.
  'panels.params.automatic': 'Automatic',

  // ImageSection
  'panels.image.cropTop': 'Crop top',
  'panels.image.cropRight': 'Crop right',
  'panels.image.cropBottom': 'Crop bottom',
  'panels.image.cropLeft': 'Crop left',
  'panels.image.resetCrop': 'Reset crop',
  'panels.image.originalSize': 'Original size',
  'panels.image.sizeError': 'Couldn\'t read the image\'s size.',

  // LayersPanel
  'panels.layers.panel': 'Layers panel',
  'panels.layers.resize': 'Resize layers panel',
  'panels.layers.elements': 'Elements',
  'panels.layers.filterPlaceholder': 'Filter elements',
  'panels.layers.noMatch': 'No elements match.',
  'panels.layers.empty': 'Elements appear here as you add shapes.',
  // Tree toggle of a container row.
  'panels.layers.expand': 'Expand',
  'panels.layers.collapse': 'Collapse',

  // LayersManager
  'panels.layers.editData': 'Edit data…',
  'panels.layers.selectAll': 'Select all in layer',
  'panels.layers.moveHere': 'Move selection here',
  'panels.layers.delete': 'Delete layer',
  'panels.layers.documentLayers': 'Document layers',
  'panels.layers.moveToActive': 'Move selection to active layer',
  'panels.layers.moveToLayer': 'Move selection to layer',
  'panels.layers.add': 'Add layer',
  'panels.layers.hide': 'Hide layer',
  'panels.layers.show': 'Show layer',
  'panels.layers.lock': 'Lock layer',
  'panels.layers.unlock': 'Unlock layer',
  'panels.layers.actions': 'Layer actions',
  'panels.layers.tags': 'Tags',
  // Button: clear the tag filter.
  'panels.layers.showAll': 'Show all',

  // LeftPanel
  'panels.left.aria': 'Shapes panel',
  // Tab: cloud & vendor icon packs (AWS, Azure…).
  'panels.left.cloud': 'Cloud',
  'panels.left.searchShapes': 'Search shapes',
  'panels.left.bestMatches': 'Best matches',
  'panels.left.noShapes': 'No shapes match “{query}”.',
  'panels.left.hintConnect': 'Click to add it connected to the selected shape (Alt-click: unconnected) · Shift-drop on a shape to replace it',
  'panels.left.hintInsert': 'Drag onto the canvas, or click to insert · Shift-drop on a shape to replace it',
  'panels.left.removeFavorite': 'Remove from favorites',
  'panels.left.addFavorite': 'Add to favorites',
  'panels.left.favorites': 'Favorites',
  'panels.left.recent': 'Recent',
  'panels.icons.none': 'No icon packs installed.',
  // {count} is a rounded number such as "4,000".
  'panels.icons.searchPlaceholder': 'Search {count}+ icons',
  'panels.icons.noMatch': 'No icons match “{query}”.',
  // Hover-card fallback; {provider} is a vendor (AWS…), {category} an icon category.
  'panels.icons.description': '{provider} {category} icon for architecture diagrams.',
  // {name} is the icon pack (AWS…), {version} its version.
  'panels.icons.footer': '{name} icons · {version}. Trademarks of their respective owners; provided for architecture diagrams.',
  // Badge on the drag ghost while Shift-dropping onto a shape to replace it.
  'panels.libraryDrag.replace': 'Replace',
  // Built-in shape library names (Shapes panel section titles).
  'panels.library.general': 'General',
  'panels.library.flowchart': 'Flowchart',
  'panels.library.erd': 'Entity Relation',
  'panels.library.c4': 'C4 Model',
  'panels.library.network': 'Network',
  'panels.library.agile': 'Atlassian style (Jira / Confluence)',
  'panels.library.arrows': 'Arrows',
  'panels.library.basic': 'Basic',
  'panels.library.misc': 'Misc / Advanced',
  'panels.library.cisco': 'Network (Cisco style)',
  'panels.library.citrix': 'Citrix style (VDI)',
  'panels.library.clipart': 'Clipart',
  'panels.library.containers': 'Swimlanes & Containers',
  'panels.library.crm': 'Salesforce style (CRM)',
  'panels.library.eip': 'Enterprise Integration Patterns',
  'panels.library.electrical': 'Electrical',
  'panels.library.floorplan': 'Floorplan',
  'panels.library.infographic': 'Infographic',
  'panels.library.isometric': 'Isometric',
  'panels.library.lean': 'Lean / Value Stream',
  'panels.library.mindmap': 'Mind Map',
  'panels.library.mockups': 'Mockups',
  'panels.library.pid': 'Process Engineering (P&ID)',
  'panels.library.venn': 'Venn & Matrix',
  'panels.library.kanban': 'Kanban',
  'panels.library.orgchart': 'Org Chart',
  'panels.library.timeline': 'Timeline & Gantt',
  'panels.library.rack': 'Rack',
  'panels.library.signs': 'Signs & Clipart',
  'panels.library.sitemap': 'Sitemap',
  'panels.library.veeam': 'Veeam style (Backup)',

  // UserLibrariesSection
  // Default name of a new user library; {n} is a number.
  'panels.userLib.defaultName': 'Library {n}',
  // The built-in user library for keeping shapes for reuse.
  'panels.userLib.scratchpad': 'Scratchpad',
  'panels.userLib.new': 'New library',
  'panels.userLib.open': 'Open library…',
  // File-dialog filter name.
  'panels.userLib.filterName': 'Libraries',
  // File-dialog filter name.
  'panels.userLib.fileType': 'OpenDraw library',
  'panels.userLib.loaded': '{count, plural, one {Loaded # item from “{name}”} other {Loaded # items from “{name}”}}',
  'panels.userLib.notALibrary': 'Not an OpenDraw library.',
  'panels.userLib.unsupported': 'Unsupported library file.',
  // Verb: add the selected shapes to this library.
  'panels.userLib.addSelection': 'Add selection',
  'panels.userLib.selectToAdd': 'Select shapes to add them',
  'panels.userLib.export': 'Export library',
  'panels.userLib.delete': 'Delete library',
  'panels.userLib.scratchpadEmpty': 'Select shapes and press + to keep them here for reuse.',
  'panels.userLib.empty': 'Empty library — add selections with +.',
  'panels.userLib.removeItem': 'Remove item',

  // ConnectionPointsDialog
  'panels.points.title': 'Edit connection points',
  'panels.points.subtitle': 'Positions as fractions of the shape (0 = left/top, 1 = right/bottom)',
  'panels.points.removeN': 'Remove point {n}',
  'panels.points.remove': 'Remove point',
  'panels.points.none': 'No points: connectors will only float to the outline.',
  'panels.points.add': 'Add point',
  'panels.points.resetDefault': 'Reset to default',
  'panels.points.section': 'Connection points',
  // {custom} is "yes" when the shape has its own points (adds " (custom)").
  'panels.points.summary': '{count, plural, one {# point} other {# points}}{custom, select, yes { (custom)} other {}}. Drop a connector end on one to fix it there; hold Shift to fix it anywhere on the outline.',
} as const;
