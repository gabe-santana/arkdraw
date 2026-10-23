/**
 * English UI strings — stencils (Edit shape… / Insert shape from stencil XML,
 * src/stencils). XML parser errors stay in English. Keys: 'stencils.<key>'.
 */
export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Edit shape',
  'stencils.insertTitle': 'Insert shape',
  // "stencil XML" is mxGraph's XML format for shapes
  'stencils.stencilXml': 'mxGraph stencil XML',
  // {shape} is a shape name, e.g. "Rectangle"
  'stencils.builtIn': '{shape} is a built-in shape',
  'stencils.insertSubtitle': 'Describe a shape in mxGraph stencil XML',
  // {customShape} is the bold term from stencils.customShapeTerm
  'stencils.convertInfo':
    'Built-in shapes are drawn in code. Applying converts this one into an editable {customShape} at its current proportions; text, style and connections are kept.',
  'stencils.customShapeTerm': 'custom shape',
  'stencils.replaceInfo': 'You can still replace it with a custom shape written from scratch.',
  'stencils.startFromSample': 'Start from a sample',
  // file-type name in the open dialog; also the editor's accessible name
  'stencils.fileType': 'Stencil XML',
  // default name of a stencil without a name attribute
  'stencils.customShape': 'Custom shape',
  // "Scratchpad" is the name of the user's scratch shape library
  'stencils.addedToScratchpad': 'Added “{name}” to the Scratchpad',
  // <shape> is an XML tag: keep it
  'stencils.noShape': 'No <shape> in this file.',
  'stencils.firstOfMany': 'Loaded the first of {count} shapes. Import the file as a library to get all of them.',
  'stencils.fixToPreview': 'Fix the XML to see a preview',
  'stencils.nothingToPreview': 'Nothing to preview',
  // {aspect} is a stencil XML value ("variable" or "fixed"); keep it
  'stencils.aspect': '{aspect} aspect',
  'stencils.connectionPoints': '{count, plural, one {# connection point} other {# connection points}}',
  // stroke width of the stencil outline
  'stencils.stroke': 'stroke {width}',
  // the stroke width comes from the shape's style
  'stencils.strokeFromStyle': 'stroke from style',
  // {items} lists XML tags the renderer skips
  'stencils.ignored': 'Ignored: {items}',
  'stencils.openXml': 'Open XML…',
  // button: restore the XML the dialog opened with
  'stencils.revert': 'Revert',
  'stencils.convertApply': 'Convert & apply',
  'stencils.addToScratchpad': 'Add to Scratchpad',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'This custom shape has no stencil yet.',
  'stencils.convert.ownText': "{shape} draws its own text, which stencils can't express.",
  // {why} is a short technical reason (in English)
  'stencils.convert.unsupported': "{shape} is a built-in shape that uses features stencils can't express ({why}).",
  'stencils.convert.dynamic': 'dynamic rendering',
  'stencils.convert.noOutline': '{shape} has no outline to convert.',
} as const;
