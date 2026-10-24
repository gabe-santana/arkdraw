import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Plugins',
  'plugins.subtitle': 'OpenDraw um Befehle, Formbibliotheken und Dateiformate erweitern',
  'plugins.warning':
    'Plugins laufen innerhalb von OpenDraw mit vollem Zugriff auf den Editor und Ihre Diagramme. Fügen Sie nur Plugins hinzu, denen Sie vertrauen. Vor dem Aktivieren werden Sie um Bestätigung gebeten.',
  'plugins.status.active': 'Aktiv',
  'plugins.storedCopy': '{source} (gespeicherte Kopie)',
  'plugins.remove': 'Plugin entfernen',
  'plugins.empty': 'Noch keine Plugins.',
  'plugins.external': 'Von der App oder ihrer Konfiguration geladen',
  'plugins.add': 'Plugin hinzufügen',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js oder C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js oder /plugins/my-plugin.js',
  'plugins.addFromFile': 'Aus Datei hinzufügen…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': '{name} exportiert',
  'plugins.exportFailed': '{format}-Export fehlgeschlagen: {error}',
  'plugins.trustTitle': 'Dieses Plugin aktivieren?',
  'plugins.trustMessage': '{what}\n\nPlugins laufen innerhalb von OpenDraw mit vollem Zugriff auf Ihre Diagramme und den Editor. Aktivieren Sie nur Plugins aus vertrauenswürdigen Quellen.',
  'plugins.trustConfirm': 'Plugin aktivieren',
  'plugins.duplicate': 'Dieses Plugin ist bereits in der Liste.',
  'plugins.enabled': 'Plugin aktiviert: {name}',
  'plugins.failed': 'Plugin {id} fehlgeschlagen: {error}',
  'plugins.cspHint': '{error} – das Skript konnte nicht geladen werden. Prüfen Sie die URL; Hosts mit strikter Content-Security-Policy erlauben nur Plugins vom eigenen Ursprung.',
} satisfies Translation<typeof en>;
