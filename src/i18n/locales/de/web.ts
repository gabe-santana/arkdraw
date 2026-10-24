import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': 'Speichern ({shortcut})',
  'web.embed.exit': 'Beenden',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'Eine neue Version von ArkDraw ist bereit',
  'web.pwa.offlineReady': 'ArkDraw funktioniert jetzt offline',
  'web.pwa.reloadHint': 'Zum Aktualisieren neu laden. Ungespeicherte Arbeit wird nach dem Neuladen wiederhergestellt.',
  'web.pwa.cached': 'Die App ist auf diesem Gerät zwischengespeichert.',
  'web.pwa.updating': 'Wird aktualisiert…',
  'web.pwa.reload': 'Neu laden',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Nur http(s)-Diagramm-URLs können geöffnet werden.',
  'web.shared.askTitle': 'Geteiltes Diagramm öffnen?',
  'web.shared.askMessage': 'Sie haben ungespeicherte Arbeit aus einer früheren Sitzung. Das Öffnen des geteilten Diagramms ersetzt sie.',
  'web.shared.confirm': 'Geteiltes Diagramm öffnen',
  'web.shared.deny': 'Meine Arbeit behalten',
  'web.shared.openFailed': 'Geteiltes Diagramm konnte nicht geöffnet werden: {error}',

  // loadDiagram.ts
  'web.load.empty': 'Das Diagramm ist leer.',
  'web.load.noPages': 'Es wurden keine Diagrammseiten gefunden.',
  'web.load.unrecognized': 'Unbekanntes Diagrammformat.',
  'web.load.sharedDiagram': 'Geteiltes Diagramm',
  'web.load.cors': 'Das Diagramm konnte nicht heruntergeladen werden. Der Server erlaubt möglicherweise keine Cross-Origin-Anfragen (CORS).',
  'web.load.http': 'Das Diagramm konnte nicht heruntergeladen werden (HTTP {status}).',
  'web.load.tooLarge': 'Das Diagramm ist zu groß zum Öffnen.',
} satisfies Translation<typeof en>;
