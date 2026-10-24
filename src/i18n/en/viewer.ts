/** English UI strings — viewer. Keys are globally unique: 'viewer.<key>'. */
export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Loading diagram…',
  'viewer.openFailed': 'Couldn’t open this diagram',
  'viewer.viewTitle': 'View a diagram',
  'viewer.emptyHint': 'Drop a diagram file here, or open one from your device. Nothing is uploaded.',
  'viewer.openFile': 'Open a file…',
  'viewer.openEditor': 'Open the editor',

  // Viewer — toolbar
  'viewer.openNewTab': 'Open in a new tab',
  'viewer.editInOpenDraw': 'Edit in ArkDraw',
  'viewer.previousPage': 'Previous page',
  'viewer.nextPage': 'Next page',
  'viewer.zoomOut': 'Zoom out',
  'viewer.zoomIn': 'Zoom in',
  'viewer.resetZoom': 'Reset to 100%',
  'viewer.fit': 'Fit to screen',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Go to “{name}”',
  'viewer.goToPageUnnamed': 'Go to “page”',
  'viewer.runAction': 'Click to run action',
  'viewer.unsupportedLink': 'Unsupported link',
} as const;
