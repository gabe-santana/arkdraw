import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Complementos',
  'plugins.subtitle': 'Amplía OpenDraw con comandos, bibliotecas de formas y formatos de archivo',
  'plugins.warning':
    'Los complementos se ejecutan dentro de OpenDraw con acceso completo al editor y a tus diagramas. Añade solo complementos de confianza. Se te pedirá confirmación antes de habilitar uno.',
  'plugins.status.active': 'Activo',
  'plugins.storedCopy': '{source} (copia guardada)',
  'plugins.remove': 'Quitar complemento',
  'plugins.empty': 'Aún no hay complementos.',
  'plugins.external': 'Cargado por la aplicación o su configuración',
  'plugins.add': 'Añadir complemento',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js o C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js o /plugins/my-plugin.js',
  'plugins.addFromFile': 'Añadir desde archivo…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': 'Se exportó {name}',
  'plugins.exportFailed': 'Error al exportar a {format}: {error}',
  'plugins.trustTitle': '¿Habilitar este complemento?',
  'plugins.trustMessage': '{what}\n\nLos complementos se ejecutan dentro de OpenDraw con acceso completo a tus diagramas y al editor. Habilita solo complementos de fuentes de confianza.',
  'plugins.trustConfirm': 'Habilitar complemento',
  'plugins.duplicate': 'Ese complemento ya está en la lista.',
  'plugins.enabled': 'Complemento habilitado: {name}',
  'plugins.failed': 'Error en el complemento {id}: {error}',
  'plugins.cspHint': '{error}: no se pudo cargar el script. Comprueba la URL; los hosts con una Content-Security-Policy estricta solo permiten complementos de su propio origen.',
} satisfies Translation<typeof en>;
