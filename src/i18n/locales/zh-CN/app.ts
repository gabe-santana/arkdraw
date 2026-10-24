import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': '忽略',
  'app.restoredUnsaved': '已恢复未保存的图表',

  // commands.ts
  'app.style.copied': '已复制样式',
  'app.style.copyFirst': '请先复制样式',
  'app.style.defaultSet': '新图形将使用此样式',
  'app.style.defaultReset': '已重置默认样式',
  'app.layout.nothing': '没有可布局的内容',
  'app.copyAs.done': '已复制为 {format}',
  'app.copyAs.failed': '复制失败：{error}',
  'app.image.loadFailed': '无法从该 URL 加载图像。',
  'app.image.linked': '图像以链接方式插入，未嵌入：服务器禁止下载，因此需要联网才能显示。',
  'app.image.urlTitle': '从 URL 插入图像',
  'app.image.urlMessage': '粘贴指向 PNG、JPEG、GIF、WebP 或 SVG 图像的链接，或 data: URI。',
  'app.image.urlInvalid': '请输入 http(s) 或 data:image URL。',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': '所有图表',
  'app.filter.arkdraw': 'ArkDraw 图表',
  'app.filter.drawio': '图表 XML（.drawio）',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': '是否保存对“{name}”的更改？',
  'app.discard.message': '如果不保存，你的更改将会丢失。',
  'app.discard.deny': '不保存',
  'app.file.imported': '已导入 {count, plural, other {# 个元素}}',
  'app.file.importedPages': '已在 {pages} 个页面中导入 {count, plural, other {# 个元素}}',
  'app.file.openFailed': '无法打开此文件。',
  'app.file.savedToBrowser': '已保存到浏览器',
  'app.file.saveFailed': '保存失败：{error}',

  // print.ts / playback.ts
  'app.print.nothing': '没有可打印的内容',
  'app.playback.nothing': '还没有可播放的动画。选择一条连接线，并在属性面板中选择一种动画。',
} satisfies Translation<typeof en>;
