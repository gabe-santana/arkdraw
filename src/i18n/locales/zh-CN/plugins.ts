import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': '插件',
  'plugins.subtitle': '通过命令、图形库和文件格式扩展 ArkDraw',
  'plugins.warning':
    '插件在 ArkDraw 内运行，可完全访问编辑器和你的图表。请只添加你信任的插件。启用插件前会请你确认。',
  'plugins.status.active': '运行中',
  'plugins.storedCopy': '{source}（已存储副本）',
  'plugins.remove': '移除插件',
  'plugins.empty': '还没有插件。',
  'plugins.external': '由应用或其配置加载',
  'plugins.add': '添加插件',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js 或 C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js 或 /plugins/my-plugin.js',
  'plugins.addFromFile': '从文件添加…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}：{error}',
  'plugins.exported': '已导出 {name}',
  'plugins.exportFailed': '{format} 导出失败：{error}',
  'plugins.trustTitle': '启用此插件？',
  'plugins.trustMessage': '{what}\n\n插件在 ArkDraw 内运行，可完全访问你的图表和编辑器。请只启用来自可信来源的插件。',
  'plugins.trustConfirm': '启用插件',
  'plugins.duplicate': '该插件已在列表中。',
  'plugins.enabled': '已启用插件：{name}',
  'plugins.failed': '插件 {id} 运行失败：{error}',
  'plugins.cspHint': '{error}——无法加载脚本。请检查 URL；设置了严格内容安全策略（Content-Security-Policy）的站点仅允许加载同源插件。',
} satisfies Translation<typeof en>;
