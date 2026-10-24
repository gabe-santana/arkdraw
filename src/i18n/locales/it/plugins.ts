import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Plugin',
  'plugins.subtitle': 'Estendi OpenDraw con comandi, librerie di forme e formati di file',
  'plugins.warning':
    'I plugin vengono eseguiti in OpenDraw con accesso completo all’editor e ai tuoi diagrammi. Aggiungi solo plugin attendibili. Prima di abilitarne uno ti verrà chiesta una conferma.',
  'plugins.status.active': 'Attivo',
  'plugins.storedCopy': '{source} (copia memorizzata)',
  'plugins.remove': 'Rimuovi plugin',
  'plugins.empty': 'Ancora nessun plugin.',
  'plugins.external': 'Caricato dall’app o dalla sua configurazione',
  'plugins.add': 'Aggiungi plugin',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js o C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js o /plugins/my-plugin.js',
  'plugins.addFromFile': 'Aggiungi da file…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': '{name} esportato',
  'plugins.exportFailed': 'Esportazione {format} non riuscita: {error}',
  'plugins.trustTitle': 'Abilitare questo plugin?',
  'plugins.trustMessage': '{what}\n\nI plugin vengono eseguiti in OpenDraw con accesso completo ai tuoi diagrammi e all’editor. Abilita solo plugin provenienti da fonti attendibili.',
  'plugins.trustConfirm': 'Abilita plugin',
  'plugins.duplicate': 'Questo plugin è già nell’elenco.',
  'plugins.enabled': 'Plugin abilitato: {name}',
  'plugins.failed': 'Errore del plugin {id}: {error}',
  'plugins.cspHint': '{error}: impossibile caricare lo script. Controlla l’URL; gli host con una Content-Security-Policy restrittiva consentono solo plugin provenienti dalla propria origine.',
} satisfies Translation<typeof en>;
