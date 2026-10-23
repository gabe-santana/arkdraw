/**
 * English UI strings — storage (src/storage: File → Open from browser, the
 * browser library, recent documents, user templates). Keys: 'storage.<key>'.
 */
export default {
  // LibraryDialog
  'storage.title': 'Browser storage',
  'storage.subtitle': 'Diagrams kept in this browser (IndexedDB). They stay on this device and aren’t uploaded anywhere.',
  'storage.searchPlaceholder': 'Search documents',
  'storage.addFiles': 'Add files…',
  // button: save the open diagram into the browser library
  'storage.saveCurrent': 'Save current',
  'storage.noMatches': 'No documents match your search.',
  // “Save current” is a button and File → Save to browser a menu command
  'storage.empty': 'No diagrams saved in this browser yet. Use “Save current” or File → Save to browser.',
  // {name} is a document name
  'storage.openDoc': 'Open {name}',
  // thumbnail placeholder for a document without content
  'storage.emptyThumb': 'Empty',
  'storage.download': 'Download .opendraw',
  'storage.docActions': 'Document actions',
  // file-type name in the save dialog
  'storage.fileType': 'OpenDraw Diagram',
  'storage.opened': 'Opened “{name}”',
  'storage.savedToBrowser': 'Saved “{name}” to the browser',
  'storage.deleteTitle': 'Delete “{name}”?',
  'storage.deleteMessage': 'It will be removed from this browser’s storage. This can’t be undone.',
  'storage.notADiagram': '“{name}” is not an OpenDraw diagram.',
  // last-modified time: under a minute ago
  'storage.justNow': 'just now',
  // last-modified time, abbreviated: minutes ago
  'storage.minutesAgo': '{count} min ago',
  // last-modified time, abbreviated: hours ago
  'storage.hoursAgo': '{count} h ago',

  // library.ts
  'storage.saveFailed': 'Could not save to the browser: {error}',
  'storage.docGone': 'That document is no longer in the browser library.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'This recent document is no longer available.',
  'storage.recentPermission': 'Permission to read “{name}” was denied.',
  'storage.recentRemoved': '“{name}” was removed from the browser library.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Saved from one of your diagrams.',
} as const;
