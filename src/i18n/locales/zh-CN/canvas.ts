import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': '图表画布',
  'canvas.ariaLabel': '图表画布。Tab 在图形之间移动，Alt+方向键沿连接线跳转，Shift+F10 打开上下文菜单。',

  // Canvas → empty-page hint
  'canvas.empty.title': '从空白画布开始',
  'canvas.empty.body': '从图形库拖入图形、使用工具栏绘制，或描述你想要的图表，让 AI 为你绘制草图。',
  'canvas.empty.rectangle': '矩形',
  'canvas.empty.connector': '连接线',
  'canvas.empty.ai': 'AI',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': '替换为…',
  'canvas.picker.insertShape': '插入图形…',
  'canvas.picker.noMatch': '没有匹配的图形。',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': '已进入的组合',
  'canvas.group.backToDiagram': '返回整个图表（Home）',
  'canvas.group.group': '组合',
  'canvas.group.subgroup': '子组合',
  'canvas.group.exit': '退出组合',
  'canvas.group.nothingNested': '所选内容中没有嵌套的元素',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': '已组合 · {count}',
  'canvas.flash.ungrouped': '已取消组合 · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': '圆角 {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': '此链接操作不是有效的 JSON。',
  'canvas.link.pageMissing': '该页面已不存在。',
  'canvas.link.unsupportedScheme': '只能打开网页、邮件和电话链接。',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': '图标',
  'canvas.aria.connectorRole': '连接线',
  'canvas.aria.labeled': '{kind}：{text}',
  'canvas.aria.connectorFromTo': '从 {from} 到 {to} 的连接线',
  'canvas.aria.connectorNamedFromTo': '从 {from} 到 {to} 的连接线“{text}”',
  'canvas.aria.nothing': '无',
  'canvas.aria.nothingSelected': '未选择任何内容',
  'canvas.aria.selectedOne': '已选择 {description}',
  'canvas.aria.selectedMany': '已选择 {count, plural, other {# 个元素}}',

  // TableCellLayer
  'canvas.table.cellLabel': '单元格：第 {row} 行，第 {column} 列',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': '双击可添加点',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': '画笔选项',
  'canvas.brush.title': '画笔',
  'canvas.brush.color': '画笔颜色',
  'canvas.brush.smooth': '平滑',
  'canvas.brush.pressure': '笔压（可变宽度）',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': '可移动',
  'canvas.behavior.movableHint': '可拖动或微移',
  'canvas.behavior.resizable': '可调整大小',
  'canvas.behavior.resizableHint': '显示调整大小手柄',
  'canvas.behavior.rotatable': '可旋转',
  'canvas.behavior.rotatableHint': '显示旋转手柄',
  'canvas.behavior.deletable': '可删除',
  'canvas.behavior.deletableHint': '按 Delete 可将其删除',
  'canvas.behavior.editable': '可编辑',
  'canvas.behavior.editableHint': '双击可编辑标签',
  'canvas.behavior.connectable': '可连接',
  'canvas.behavior.connectableHint': '连接线可连接到它',
  'canvas.behavior.selectable': '可选择',
  'canvas.behavior.selectableHint': '可通过点击和框选选中',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': '文本格式',
  'canvas.format.bold': '粗体（{shortcut}）',
  'canvas.format.italic': '斜体（{shortcut}）',
  'canvas.format.underline': '下划线（{shortcut}）',
  'canvas.format.strikethrough': '删除线',
  'canvas.format.smaller': '缩小字号（{shortcut}）',
  'canvas.format.larger': '增大字号（{shortcut}）',
  'canvas.format.textColor': '文本颜色',
  'canvas.format.highlight': '突出显示',
  'canvas.format.subscript': '下标',
  'canvas.format.superscript': '上标',
  'canvas.format.link': '链接',
  'canvas.format.removeLink': '删除链接',
  'canvas.format.clearFormatting': '清除格式',
} satisfies Translation<typeof en>;
