/** English UI strings — desktop. Keys are globally unique: 'desktop.<key>'. */
export default {
  // UpdatePrompt
  'desktop.update.available': 'OpenDraw {version} is available',
  'desktop.update.downloading': 'Downloading…',
  'desktop.update.downloadingPercent': 'Downloading · {percent}%',
  'desktop.update.installing': 'Installing… OpenDraw will restart.',
  'desktop.update.restartHint': 'Restart to update. You’ll be asked to save unsaved changes first.',
  // Button: restart the app to install the update
  'desktop.update.restart': 'Restart to update',

  // updater.ts
  'desktop.update.webAuto': 'Updates are installed automatically in the web version.',
  'desktop.update.upToDate': 'OpenDraw is up to date.',
  'desktop.update.checkFailed': 'Could not check for updates: {error}',
  'desktop.update.failed': 'Update failed: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Edit config.json, then restart OpenDraw to apply it.',
  'desktop.config.noFolder': 'No configuration folder',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': 'Open “{name}” in a new window?',
  'desktop.openWhere.message': '“{name}” has unsaved changes. You can keep working on it here and open the file in a new window.',
  'desktop.openWhere.confirm': 'Open in new window',
  'desktop.openWhere.deny': 'Replace this diagram',
} as const;
