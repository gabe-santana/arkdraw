/** English UI strings — SVG → shapes import (src/app/svgImport.tsx, src/io/import/svgShapes.ts messages). */
export default {
  'svgImport.title': 'Import SVG',
  // {name} is a quoted file name, or svgImport.unnamed.
  'svgImport.message': 'Insert {name} as a single image, or convert its paths, shapes and text into editable shapes.',
  'svgImport.unnamed': 'this SVG',
  'svgImport.perGroup': 'One shape per group (keeps colours, fewer shapes)',
  'svgImport.asImage': 'Insert as image',
  'svgImport.convert': 'Convert to shapes',
  'svgImport.converted': '{count, plural, one {Converted to # shape (grouped).} other {Converted to # shapes (grouped).}}',
  'svgImport.pickTitle': 'SVG as shapes',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'This file is not a valid SVG image.',
  'svgImport.msg.empty': 'The SVG has nothing that can be converted to shapes.',
  'svgImport.msg.gradient': 'Gradients were replaced by their first colour.',
  'svgImport.msg.pattern': 'Pattern fills were replaced by a flat colour.',
  'svgImport.msg.clip': 'Clipping paths and masks were ignored.',
  'svgImport.msg.filter': 'Filters (blur, shadows) were ignored.',
  'svgImport.msg.marker': 'Path markers were ignored (lines keep simple arrowheads).',
  'svgImport.msg.skewText': 'Skewed text and images were approximated by their rotated box.',
  'svgImport.msg.foreign': 'Embedded HTML (foreignObject) was converted to plain text.',
  'svgImport.msg.relativeImage': 'Images with relative links were skipped.',
} as const;
