import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'ArkDraw {version} está disponible',
  'desktop.update.downloading': 'Descargando…',
  'desktop.update.downloadingPercent': 'Descargando · {percent}%',
  'desktop.update.installing': 'Instalando… ArkDraw se reiniciará.',
  'desktop.update.restartHint': 'Reinicia para actualizar. Antes se te pedirá que guardes los cambios pendientes.',
  'desktop.update.restart': 'Reiniciar para actualizar',

  // updater.ts
  'desktop.update.webAuto': 'En la versión web, las actualizaciones se instalan automáticamente.',
  'desktop.update.upToDate': 'ArkDraw está actualizado.',
  'desktop.update.checkFailed': 'No se pudieron buscar actualizaciones: {error}',
  'desktop.update.failed': 'Error al actualizar: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Edita config.json y reinicia ArkDraw para aplicarlo.',
  'desktop.config.noFolder': 'No hay carpeta de configuración',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': '¿Abrir “{name}” en una ventana nueva?',
  'desktop.openWhere.message': '“{name}” tiene cambios sin guardar. Puedes seguir trabajando en él aquí y abrir el archivo en una ventana nueva.',
  'desktop.openWhere.confirm': 'Abrir en una ventana nueva',
  'desktop.openWhere.deny': 'Reemplazar este diagrama',
} satisfies Translation<typeof en>;
