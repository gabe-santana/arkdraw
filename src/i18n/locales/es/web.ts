import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': 'Guardar ({shortcut})',
  'web.embed.exit': 'Salir',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'Hay una nueva versión de OpenDraw lista',
  'web.pwa.offlineReady': 'OpenDraw ya funciona sin conexión',
  'web.pwa.reloadHint': 'Recarga para actualizar. El trabajo sin guardar se restaura después de recargar.',
  'web.pwa.cached': 'La aplicación está almacenada en caché en este dispositivo.',
  'web.pwa.updating': 'Actualizando…',
  'web.pwa.reload': 'Recargar',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Solo se pueden abrir diagramas desde URL http(s).',
  'web.shared.askTitle': '¿Abrir el diagrama compartido?',
  'web.shared.askMessage': 'Tienes trabajo sin guardar de una sesión anterior. Si abres el diagrama compartido, se reemplazará.',
  'web.shared.confirm': 'Abrir diagrama compartido',
  'web.shared.deny': 'Conservar mi trabajo',
  'web.shared.openFailed': 'No se pudo abrir el diagrama compartido: {error}',

  // loadDiagram.ts
  'web.load.empty': 'El diagrama está vacío.',
  'web.load.noPages': 'No se encontraron páginas de diagrama.',
  'web.load.unrecognized': 'Formato de diagrama no reconocido.',
  'web.load.sharedDiagram': 'Diagrama compartido',
  'web.load.cors': 'No se pudo descargar el diagrama. Es posible que el servidor no permita solicitudes de origen cruzado (CORS).',
  'web.load.http': 'No se pudo descargar el diagrama (HTTP {status}).',
  'web.load.tooLarge': 'El diagrama es demasiado grande para abrirlo.',
} satisfies Translation<typeof en>;
