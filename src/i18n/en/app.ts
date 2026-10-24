/** English UI strings — app. Keys are globally unique: 'app.<key>'. */
export default {
  // Shared by the update / offline notices (web and desktop)
  // Verb: hide this notice
  'app.dismiss': 'Dismiss',
  'app.restoredUnsaved': 'Restored your unsaved diagram',

  // commands.ts
  'app.style.copied': 'Style copied',
  'app.style.copyFirst': 'Copy a style first',
  'app.style.defaultSet': 'New shapes will use this style',
  'app.style.defaultReset': 'Default style reset',
  'app.layout.nothing': 'Nothing to lay out',
  // {format} is PNG or SVG
  'app.copyAs.done': 'Copied as {format}',
  'app.copyAs.failed': 'Copy failed: {error}',
  'app.image.loadFailed': "Couldn't load an image from that URL.",
  'app.image.linked': 'Image linked, not embedded: the server blocks downloads, so it needs a connection to display.',
  'app.image.urlTitle': 'Insert image from URL',
  'app.image.urlMessage': 'Paste a link to a PNG, JPEG, GIF, WebP or SVG image, or a data: URI.',
  'app.image.urlInvalid': 'Enter an http(s) or data:image URL.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'All diagrams',
  'app.filter.opendraw': 'ArkDraw Diagram',
  'app.filter.drawio': 'Diagram XML (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Save changes to “{name}”?',
  'app.discard.message': 'Your changes will be lost if you don’t save them.',
  'app.discard.deny': 'Don’t save',
  'app.file.imported': 'Imported {count, plural, one {# element} other {# elements}}',
  'app.file.importedPages': 'Imported {count, plural, one {# element} other {# elements}} on {pages} pages',
  'app.file.openFailed': 'Could not open this file.',
  'app.file.savedToBrowser': 'Saved to browser',
  'app.file.saveFailed': 'Save failed: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Nothing to print',
  'app.playback.nothing': 'Nothing to animate yet. Select a connector and choose an animation in the properties panel.',
} as const;
