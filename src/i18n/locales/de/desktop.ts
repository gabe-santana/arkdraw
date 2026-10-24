import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'OpenDraw {version} ist verfügbar',
  'desktop.update.downloading': 'Wird heruntergeladen…',
  'desktop.update.downloadingPercent': 'Wird heruntergeladen · {percent}%',
  'desktop.update.installing': 'Wird installiert… OpenDraw wird neu gestartet.',
  'desktop.update.restartHint': 'Zum Aktualisieren neu starten. Sie werden zuvor aufgefordert, ungespeicherte Änderungen zu speichern.',
  'desktop.update.restart': 'Neu starten und aktualisieren',

  // updater.ts
  'desktop.update.webAuto': 'In der Webversion werden Updates automatisch installiert.',
  'desktop.update.upToDate': 'OpenDraw ist auf dem neuesten Stand.',
  'desktop.update.checkFailed': 'Suche nach Updates fehlgeschlagen: {error}',
  'desktop.update.failed': 'Update fehlgeschlagen: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Bearbeiten Sie config.json und starten Sie OpenDraw dann neu, um die Änderungen zu übernehmen.',
  'desktop.config.noFolder': 'Kein Konfigurationsordner',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': '„{name}“ in neuem Fenster öffnen?',
  'desktop.openWhere.message': '„{name}“ hat ungespeicherte Änderungen. Sie können hier weiterarbeiten und die Datei in einem neuen Fenster öffnen.',
  'desktop.openWhere.confirm': 'In neuem Fenster öffnen',
  'desktop.openWhere.deny': 'Dieses Diagramm ersetzen',
} satisfies Translation<typeof en>;
