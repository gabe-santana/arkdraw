import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': '浏览器存储',
  'storage.subtitle': '保存在此浏览器（IndexedDB）中的图表。它们只保留在此设备上，不会上传到任何地方。',
  'storage.searchPlaceholder': '搜索文档',
  'storage.addFiles': '添加文件…',
  'storage.saveCurrent': '保存当前图表',
  'storage.noMatches': '没有与搜索匹配的文档。',
  'storage.empty': '此浏览器中还没有保存的图表。请使用“保存当前图表”或“文件 → 保存到浏览器”。',
  'storage.openDoc': '打开 {name}',
  'storage.emptyThumb': '空',
  'storage.download': '下载 .arkdraw',
  'storage.docActions': '文档操作',
  'storage.fileType': 'ArkDraw 图表',
  'storage.opened': '已打开“{name}”',
  'storage.savedToBrowser': '已将“{name}”保存到浏览器',
  'storage.deleteTitle': '删除“{name}”？',
  'storage.deleteMessage': '它将从此浏览器的存储中删除。此操作无法撤销。',
  'storage.notADiagram': '“{name}”不是 ArkDraw 图表。',
  'storage.justNow': '刚刚',
  'storage.minutesAgo': '{count} 分钟前',
  'storage.hoursAgo': '{count} 小时前',

  // library.ts
  'storage.saveFailed': '无法保存到浏览器：{error}',
  'storage.docGone': '该文档已不在浏览器库中。',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': '此最近文档已不可用。',
  'storage.recentPermission': '读取“{name}”的权限被拒绝。',
  'storage.recentRemoved': '“{name}”已从浏览器库中删除。',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': '从你的某个图表保存而来。',
} satisfies Translation<typeof en>;
