import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': '清除搜索',
  'chrome.ui.mixed': '混合',
  'chrome.ui.recentColors': '最近使用',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': '工具',
  'chrome.toolbar.playAnimation': '播放动画',
  'chrome.toolbar.pauseAnimation': '暂停动画',
  'chrome.zoom.out': '缩小',
  'chrome.zoom.in': '放大',
  'chrome.zoom.options': '缩放选项',

  // Outline
  'chrome.outline.title': '缩略图',
  'chrome.outline.close': '关闭缩略图',

  // PageTabs
  'chrome.pageTabs.editData': '编辑数据…',
  'chrome.pageTabs.insertPage': '插入页面',

  // StartScreen
  'chrome.start.title': '欢迎使用 ArkDraw',
  'chrome.start.subtitle': '新建图表，或从上次中断的地方继续。',
  'chrome.start.blank': '空白图表',
  'chrome.start.blankSub': '从空白画布开始',
  'chrome.start.templates': '模板…',
  'chrome.start.templatesSub': '浏览模板库和“我的模板”',
  'chrome.start.open': '打开…',
  'chrome.start.openSubDesktop': '此电脑上的文件',
  'chrome.start.openSubWeb': '设备上的文件',
  'chrome.start.openBrowser': '从浏览器打开…',
  'chrome.start.openBrowserSub': '保存在此浏览器中的图表',
  'chrome.start.templatesHeading': '模板',
  'chrome.start.recentHeading': '最近',
  'chrome.start.recentEmpty': '你打开或保存的文件会显示在这里。',
  'chrome.start.dontShow': '不再显示',
  'chrome.start.reenableHint': '可在“首选项”中重新开启',

  // EditDialogs — Edit data
  'chrome.editData.title': '编辑数据',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': '显示在图层面板中',
  'chrome.editData.tooltip': '工具提示',
  'chrome.editData.tooltipPlaceholder': '悬停时显示',
  'chrome.editData.link': '链接',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': '标签',
  'chrome.editData.tagsPlaceholder': '前端, 关键',
  'chrome.editData.properties': '属性',
  'chrome.editData.keyPlaceholder': '键',
  'chrome.editData.valuePlaceholder': '值',
  'chrome.editData.addProperty': '添加属性',
  'chrome.editData.placeholders': '在标签中显示 {token} 占位符',

  // EditDialogs — Edit style
  'chrome.editStyle.title': '编辑样式',
  'chrome.editStyle.subtitleDrawio': '样式字符串（key=value;）——应用于全部所选内容',
  'chrome.editStyle.styleString': '样式字符串',
  'chrome.editStyle.subtitleArkdraw': 'ArkDraw 样式键，每行一个——应用于全部所选内容',
  'chrome.editStyle.keptKeys': 'ArkDraw 不使用的键会被保留，并在导出 .drawio 时写回。',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': '编辑图表',
  'chrome.editDiagram.subtitle': '当前页面的 ArkDraw JSON。更改可撤销。',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': '切换替换',
  'chrome.find.placeholder': '在标签、名称、工具提示和数据中查找',
  'chrome.find.matchCase': '区分大小写',
  'chrome.find.wholeWord': '全字匹配',
  'chrome.find.regex': '正则表达式',
  'chrome.find.allPages': '所有页面',
  'chrome.find.allPagesShort': '全部',
  'chrome.find.replaceWith': '替换为',
  'chrome.find.replace': '替换',
  'chrome.find.replaceAll': '全部',

  // EditDialogs — Import from text
  'chrome.import.none': '未安装文本导入器。',
  'chrome.import.fromText': '从文本导入',
  'chrome.import.asNewPage': '作为新页面',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': '图形',
  'chrome.dock.panel.format': '格式',
  'chrome.dock.panel.layers': '图层',
  'chrome.dock.moveLeft': '移到左侧',
  'chrome.dock.moveRight': '移到右侧',
  'chrome.dock.moveUp': '上移',
  'chrome.dock.moveDown': '下移',
  'chrome.dock.reset': '重置面板布局',
  'chrome.dock.handleAria': '{panel}面板：拖动可移动，点击查看选项',
  'chrome.dock.handleTitle': '拖动可移动 · 点击查看选项',
  'chrome.dock.dropHere': '拖放到此处',
  'chrome.dock.resizeLeft': '调整左侧面板大小',
  'chrome.dock.resizeRight': '调整右侧面板大小',
  'chrome.rightTabs.aria': '右侧面板',
  'chrome.rightTabs.design': '设计',
  'chrome.rightTabs.designHint': '所选内容的样式和图层',
  'chrome.rightTabs.ai': 'AI',
  'chrome.rightTabs.aiHint': '说出你想要的：助手会绘制或修改',
  'chrome.dock.resizeAi': '调整 AI 面板大小',
} satisfies Translation<typeof en>;
