import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'È disponibile OpenDraw {version}',
  'desktop.update.downloading': 'Download in corso…',
  'desktop.update.downloadingPercent': 'Download · {percent}%',
  'desktop.update.installing': 'Installazione… OpenDraw verrà riavviato.',
  'desktop.update.restartHint': 'Riavvia per aggiornare. Prima ti verrà chiesto di salvare le modifiche non salvate.',
  'desktop.update.restart': 'Riavvia per aggiornare',

  // updater.ts
  'desktop.update.webAuto': 'Nella versione web gli aggiornamenti vengono installati automaticamente.',
  'desktop.update.upToDate': 'OpenDraw è aggiornato.',
  'desktop.update.checkFailed': 'Impossibile verificare la disponibilità di aggiornamenti: {error}',
  'desktop.update.failed': 'Aggiornamento non riuscito: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Modifica config.json, poi riavvia OpenDraw per applicarlo.',
  'desktop.config.noFolder': 'Nessuna cartella di configurazione',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': 'Aprire “{name}” in una nuova finestra?',
  'desktop.openWhere.message': '“{name}” ha modifiche non salvate. Puoi continuare a lavorarci qui e aprire il file in una nuova finestra.',
  'desktop.openWhere.confirm': 'Apri in nuova finestra',
  'desktop.openWhere.deny': 'Sostituisci questo diagramma',
} satisfies Translation<typeof en>;
