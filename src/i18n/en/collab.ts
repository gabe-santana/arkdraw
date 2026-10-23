/** English UI strings — comments panel, revision history and Preferences (src/chrome/Collaboration.tsx). */
export default {
  'collab.justNow': 'just now',
  'collab.connector': 'Connector',
  'collab.shape': 'Shape',

  // Comments
  'collab.comments': 'Comments',
  'collab.resolved': 'Resolved',
  'collab.closeComments': 'Close comments',
  'collab.noComments': 'No comments yet. Select a shape and leave a note for your team — comments are saved in the file.',
  'collab.commentOn': 'Comment on “{name}”…',
  'collab.selectToComment': 'Select an element to comment on it',
  'collab.comment': 'Comment',
  'collab.reply': 'Reply…',
  'collab.reopen': 'Reopen',
  'collab.resolve': 'Resolve',

  // Revision history
  'collab.revisions': 'Revision history',
  'collab.revisionsSubtitle': 'Local snapshots of “{name}” — taken on every save and while you work.',
  'collab.noRevisions': 'No revisions yet. Save the diagram to create one.',
  'collab.revisionSaved': 'Saved',
  'collab.revisionAuto': 'Autosnapshot',
  'collab.revisionElements': '{count, plural, one {# element} other {# elements}}',
  'collab.deleteRevision': 'Delete revision',
  'collab.revisionPreview': 'Revision preview',
  'collab.selectRevision': 'Select a revision',
  'collab.openAsCopy': 'Open as copy',
  'collab.restore': 'Restore',
  'collab.restoredSuffix': '{name} (restored)',

  // Preferences
  'prefs.title': 'Preferences',
  'prefs.language': 'Language',
  'prefs.languageAuto': 'Auto (system: {language})',
  'prefs.languageHint': 'Shape names and icon search terms stay in English.',
  'prefs.author': 'Your name (for comments)',
  'prefs.authorPlaceholder': 'e.g. Ada Lovelace',
  'prefs.defaultFont': 'Default font for new shapes',
  'prefs.fontHand': 'Hand-drawn',
  'prefs.palette': 'Custom palette (hex colors, comma separated)',
  'prefs.autosave': 'Autosave changes to the open file',
  'prefs.startScreen': 'Show the start screen on launch',
  'prefs.autosaveDesktop': 'Saved files are written about a second after each change (a .bkp keeps the previous version when backups are on).',
  'prefs.autosaveWeb': 'Works for files opened or saved through the browser’s file picker, and for documents in the browser library.',
  'prefs.autosaveFailed': 'Autosave failed: {error}',
} as const;
