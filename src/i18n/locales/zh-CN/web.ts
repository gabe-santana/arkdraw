import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': '保存（{shortcut}）',
  'web.embed.exit': '退出',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'ArkDraw 新版本已就绪',
  'web.pwa.offlineReady': 'ArkDraw 现已支持离线使用',
  'web.pwa.reloadHint': '重新加载以更新。未保存的工作会在重新加载后恢复。',
  'web.pwa.cached': '应用已缓存到此设备。',
  'web.pwa.updating': '正在更新…',
  'web.pwa.reload': '重新加载',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': '只能打开 http(s) 图表 URL。',
  'web.shared.askTitle': '打开分享的图表？',
  'web.shared.askMessage': '你有上次会话中未保存的工作。打开分享的图表会将其替换。',
  'web.shared.confirm': '打开分享的图表',
  'web.shared.deny': '保留我的工作',
  'web.shared.openFailed': '无法打开分享的图表：{error}',

  // loadDiagram.ts
  'web.load.empty': '图表为空。',
  'web.load.noPages': '未找到任何图表页面。',
  'web.load.unrecognized': '无法识别的图表格式。',
  'web.load.sharedDiagram': '分享的图表',
  'web.load.cors': '无法下载图表。服务器可能不允许跨域请求（CORS）。',
  'web.load.http': '无法下载图表（HTTP {status}）。',
  'web.load.tooLarge': '图表太大，无法打开。',
} satisfies Translation<typeof en>;
