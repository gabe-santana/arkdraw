import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': 'Salva ({shortcut})',
  'web.embed.exit': 'Esci',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'È pronta una nuova versione di ArkDraw',
  'web.pwa.offlineReady': 'Ora ArkDraw funziona offline',
  'web.pwa.reloadHint': 'Ricarica per aggiornare. Il lavoro non salvato viene ripristinato dopo il ricaricamento.',
  'web.pwa.cached': 'L’app è memorizzata su questo dispositivo.',
  'web.pwa.updating': 'Aggiornamento…',
  'web.pwa.reload': 'Ricarica',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Si possono aprire solo URL di diagrammi http(s).',
  'web.shared.askTitle': 'Aprire il diagramma condiviso?',
  'web.shared.askMessage': 'Hai del lavoro non salvato da una sessione precedente. Aprendo il diagramma condiviso verrà sostituito.',
  'web.shared.confirm': 'Apri diagramma condiviso',
  'web.shared.deny': 'Mantieni il mio lavoro',
  'web.shared.openFailed': 'Impossibile aprire il diagramma condiviso: {error}',

  // loadDiagram.ts
  'web.load.empty': 'Il diagramma è vuoto.',
  'web.load.noPages': 'Nessuna pagina di diagramma trovata.',
  'web.load.unrecognized': 'Formato di diagramma non riconosciuto.',
  'web.load.sharedDiagram': 'Diagramma condiviso',
  'web.load.cors': 'Impossibile scaricare il diagramma. Il server potrebbe non consentire richieste cross-origin (CORS).',
  'web.load.http': 'Impossibile scaricare il diagramma (HTTP {status}).',
  'web.load.tooLarge': 'Il diagramma è troppo grande per essere aperto.',
} satisfies Translation<typeof en>;
