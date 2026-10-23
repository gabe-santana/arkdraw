/** English UI strings — web. Keys are globally unique: 'web.<key>'. */
export default {
  // EmbedBar (editor embedded in another site)
  // {shortcut} is a key combo, e.g. Ctrl+S
  'web.embed.saveTitle': 'Save ({shortcut})',
  // Verb: leave the embedded editor
  'web.embed.exit': 'Exit',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'A new version of OpenDraw is ready',
  'web.pwa.offlineReady': 'OpenDraw works offline now',
  'web.pwa.reloadHint': 'Reload to update. Unsaved work is restored after the reload.',
  'web.pwa.cached': 'The app is cached on this device.',
  'web.pwa.updating': 'Updating…',
  // Verb: reload the page
  'web.pwa.reload': 'Reload',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Only http(s) diagram URLs can be opened.',
  'web.shared.askTitle': 'Open the shared diagram?',
  'web.shared.askMessage': 'You have unsaved work from a previous session. Opening the shared diagram replaces it.',
  'web.shared.confirm': 'Open shared diagram',
  'web.shared.deny': 'Keep my work',
  'web.shared.openFailed': 'Could not open the shared diagram: {error}',

  // loadDiagram.ts
  'web.load.empty': 'The diagram is empty.',
  'web.load.noPages': 'No diagram pages were found.',
  'web.load.unrecognized': 'Unrecognized diagram format.',
  // Default document name for a diagram opened from a link
  'web.load.sharedDiagram': 'Shared diagram',
  'web.load.cors': 'Could not download the diagram. The server may not allow cross-origin requests (CORS).',
  'web.load.http': 'Could not download the diagram (HTTP {status}).',
  'web.load.tooLarge': 'The diagram is too large to open.',
} as const;
