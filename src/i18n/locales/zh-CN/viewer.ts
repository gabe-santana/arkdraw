import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': '正在加载图表…',
  'viewer.openFailed': '无法打开此图表',
  'viewer.viewTitle': '查看图表',
  'viewer.emptyHint': '将图表文件拖放到此处，或从你的设备中打开。不会上传任何内容。',
  'viewer.openFile': '打开文件…',
  'viewer.openEditor': '打开编辑器',

  // Viewer — toolbar
  'viewer.openNewTab': '在新标签页中打开',
  'viewer.editInArkDraw': '在 ArkDraw 中编辑',
  'viewer.previousPage': '上一页',
  'viewer.nextPage': '下一页',
  'viewer.zoomOut': '缩小',
  'viewer.zoomIn': '放大',
  'viewer.resetZoom': '重置为 100%',
  'viewer.fit': '适应屏幕',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': '转到“{name}”',
  'viewer.goToPageUnnamed': '转到“页面”',
  'viewer.runAction': '点击以执行操作',
  'viewer.unsupportedLink': '不支持的链接',
} satisfies Translation<typeof en>;
