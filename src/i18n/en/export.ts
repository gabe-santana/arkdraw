/** English UI strings — export. Keys are globally unique: 'export.<key>'. */
export default {
  // ExportDialog
  'export.subtitle': 'Rendered locally — nothing leaves your machine.',
  // aria-label of the file-format picker
  'export.formatGroup': 'Format',
  // format card label for a shareable URL (the other cards are format names)
  'export.format.url': 'Link',
  'export.format.png.desc': 'Lossless image',
  'export.format.jpeg.desc': 'Compact photo image',
  'export.format.webp.desc': 'Small web image',
  'export.format.svg.desc': 'Scalable vector',
  'export.format.gif.desc': 'Animated',
  'export.format.pdf.desc': 'Vector document',
  'export.format.html.desc': 'Interactive viewer',
  'export.format.drawio.desc': 'Editable XML',
  'export.format.vsdx.desc': 'VSDX drawing',
  'export.format.url.desc': 'Shareable URL',
  'export.previewAlt': 'Export preview',
  'export.empty': 'Nothing to export on this page yet.',
  'export.rendering': 'Rendering preview…',
  // badge on an animated GIF preview: its duration
  'export.gifLoop': '{seconds}s loop',
  'export.prevPage': 'Previous page',
  'export.nextPage': 'Next page',
  // page scope options (narrow segmented control)
  'export.scope.current': 'Current',
  'export.scope.all': 'All',
  'export.scope.selection': 'Selection',
  'export.scope.range': 'Range',
  // page range: first page (very narrow label)
  'export.rangeFrom': 'From',
  // page range: last page (very narrow label)
  'export.rangeTo': 'To',
  'export.zipHint': 'One {format} per page, bundled as a .zip.',
  // noun: export scale factor
  'export.scale': 'Scale',
  'export.scaleResolution': 'Scale · resolution',
  // dots per inch (narrow field label)
  'export.dpi': 'DPI',
  'export.quality': 'Quality',
  // which part of the page to export
  'export.area': 'Area',
  'export.cropToContent': 'Crop to content',
  'export.wholePage': 'Whole page',
  'export.wholePageTitlePageView': 'Page-sized area',
  'export.wholePageTitle': 'Uses the page size from page settings',
  // margin around the exported content, in px (narrow field label)
  'export.border': 'Border',
  'export.background': 'Background',
  // background option: plain white
  'export.bg.white': 'White',
  'export.bg.transparent': 'Transparent',
  'export.appearance': 'Appearance',
  // light color theme
  'export.light': 'Light',
  // dark color theme
  'export.dark': 'Dark',
  'export.autoTitle': 'Follows the viewer’s light/dark setting',
  'export.autoHint': 'Switches with the viewer’s system theme (prefers-color-scheme).',
  // PDF sheet size
  'export.sheetSize': 'Sheet size',
  // PDF sheet size option: as large as the diagram
  'export.fitContent': 'Fit content',
  'export.paperSize': 'Paper size',
  'export.paperHint': 'Each page on its paper format (page settings), scaled to fit.',
  'export.contentHint': 'Each PDF page is sized to its diagram.',
  'export.frameRate': 'Frame rate',
  'export.loopForever': 'Loop forever',
  // {flow} and {dots} are the connector animation names below, shown in bold
  'export.gifNoAnimation': 'This diagram has no animation yet. Select a connector and pick {flow} or {dots} in the properties panel, or set reveal steps.',
  // connector animation style (as named in the Format panel)
  'export.gifFlow': 'Flow',
  // connector animation style (as named in the Format panel)
  'export.gifDots': 'Dots',
  'export.includeGrid': 'Include grid',
  'export.embedFonts': 'Embed fonts',
  'export.embedImages': 'Embed images',
  // switch label; {hint} is export.editableHint, shown dimmed
  'export.editable': 'Editable {hint}',
  'export.editableHint': '— include diagram data',
  'export.compressedXml': 'Compressed XML',
  'export.hint.svg': 'Text is written as native SVG text, so it stays selectable and searchable.',
  'export.hint.html': 'A single offline file: page tabs, zoom & pan, layer toggles, tooltips and links.',
  'export.hint.vsdx': 'Standard VSDX package. Shapes map to rectangles, ellipses and diamonds; icons become pictures.',
  'export.hint.drawio': 'mxGraph XML with every page.',
  'export.shareLink': 'Share link',
  // length of the share URL
  'export.shareChars': '{count, plural, one {# char} other {# chars}}',
  'export.shareEmpty': 'Nothing to share yet.',
  'export.shareTooLong': 'This link is longer than {max} characters — some apps and browsers may cut it off. Share the file instead for large diagrams.',
  'export.shareHint': 'The diagram is compressed into the link itself — no upload, no account.',
  // footer: size of the share link in kilobytes
  'export.linkSize': '{size} KB link',
  // footer: estimated file size
  'export.estimate': '≈ {size}',
  'export.estimateZip': '≈ {size} · {count, plural, one {# file} other {# files}} (.zip)',
  // file-type name in the save dialog
  'export.zipArchive': 'ZIP archive',
  'export.linkCopied': 'Link copied to clipboard',
  'export.exported': 'Exported {name}',
  'export.failed': 'Export failed: {error}',
  'export.exporting': 'Exporting…',
  'export.copyLink': 'Copy link',
  'export.exportFiles': '{count, plural, one {Export # file} other {Export # files}}',
  // {format} is a file-format name: PNG, SVG, PDF…
  'export.exportFormat': 'Export {format}',
} as const;
