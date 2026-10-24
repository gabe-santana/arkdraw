import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'OpenDraw {version} 已发布',
  'desktop.update.downloading': '正在下载…',
  'desktop.update.downloadingPercent': '正在下载 · {percent}%',
  'desktop.update.installing': '正在安装… OpenDraw 将重新启动。',
  'desktop.update.restartHint': '重新启动以更新。系统会先提示你保存未保存的更改。',
  'desktop.update.restart': '重新启动以更新',

  // updater.ts
  'desktop.update.webAuto': '网页版会自动安装更新。',
  'desktop.update.upToDate': 'OpenDraw 已是最新版本。',
  'desktop.update.checkFailed': '无法检查更新：{error}',
  'desktop.update.failed': '更新失败：{error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': '编辑 config.json，然后重新启动 OpenDraw 以应用。',
  'desktop.config.noFolder': '没有配置文件夹',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': '在新窗口中打开“{name}”？',
  'desktop.openWhere.message': '“{name}”有未保存的更改。你可以在此继续编辑，并在新窗口中打开该文件。',
  'desktop.openWhere.confirm': '在新窗口中打开',
  'desktop.openWhere.deny': '替换此图表',
} satisfies Translation<typeof en>;
