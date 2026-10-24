import type en from '../../en/automation';
import type { Translation } from '../../types';

export default {
  // formUi (key/value editor)
  'automation.kv.keyPlaceholder': '键',
  'automation.kv.valuePlaceholder': '值',
  'automation.kv.remove': '删除属性',
  'automation.kv.add': '添加属性',

  // ConfigurationBody
  'automation.config.title': '配置',
  'automation.config.subtitle': '以 JSON 表示的全局设置：默认样式和字体、预设颜色、图形库、网格和自动保存。',
  'automation.config.insertExample': '插入示例',
  'automation.config.keys': '键：defaultVertexStyle、defaultEdgeStyle、defaultFont、customPresetColors、defaultLibraries、libraries、gridSize、autosave。',
  'automation.config.applied': '配置已应用',
  // configuration.ts — validation messages
  'automation.config.invalidJson': '无效的 JSON：{error}',
  'automation.config.notObject': '配置必须是 JSON 对象。',
  'automation.config.unknownKey': '未知的键“{key}”。',
  'automation.config.styleNotObject': '“{key}”必须是由样式属性组成的对象。',
  'automation.config.notStyleProperty': '“{key}”不是样式属性。',
  'automation.config.stylePrimitive': '“{key}”必须是字符串、数字或布尔值。',
  'automation.config.styleType': '“{key}”必须是 {type}。',
  'automation.config.defaultFont': '“defaultFont”必须是 {fonts} 之一。',
  'automation.config.customPresetColors': '“customPresetColors”必须是十六进制颜色列表，如“#0ea5e9”。',
  'automation.config.defaultLibraries': '“defaultLibraries”必须是字符串，如“general;uml”。',
  'automation.config.libraries': '“libraries”必须是 http(s) URL 列表。',
  'automation.config.gridSize': '“gridSize”必须是 1 到 200 之间的数字。',
  'automation.config.autosave': '“autosave”必须为 true 或 false。',
  'automation.config.librarySelectionNote': '图形库选择将在下次打开图形面板时生效。',
  'automation.config.librariesLoaded': '已加载 {count, plural, other {# 个自定义库}}。',
  'automation.librariesFailed': '无法加载 {count, plural, other {# 个库}}（网络或 CORS 问题）。',
  'automation.urlParams.librariesLoaded': '已加载 {count, plural, other {# 个自定义库}}',

  // LayoutJsonBody
  'automation.layoutJson.title': '从 JSON 应用布局',
  'automation.layoutJson.subtitle':
    'mxGraph 布局 JSON：mxHierarchicalLayout、mxCompactTreeLayout、mxRadialTreeLayout、mxFastOrganicLayout、mxCircleLayout、mxOrgChartLayout、mxParallelEdgeLayout。应用于所选内容或整个页面。',
  'automation.layoutJson.example': '示例',
  'automation.layoutJson.apply': '应用布局',
  'automation.layoutJson.nothing': '没有可布局的内容',

  // PrintBody
  'automation.print.title': '打印',
  'automation.print.subtitle': '使用以下设置打开系统打印对话框。',
  'automation.print.all': '全部（{count}）',
  'automation.print.current': '当前',
  'automation.print.range': '范围',
  'automation.print.fromTo': '从 {from} 到 {to}',
  'automation.print.scaling': '缩放',
  'automation.print.fitOne': '缩放至 1 页',
  'automation.print.fitSheets': '缩放至多页',
  'automation.print.scale': '比例',
  'automation.print.sheets': '宽 {cols} × 高 {rows}',
  'automation.print.scaleHint': '按 {percent} 打印——较大的页面将拼贴到多张纸上。',
  'automation.print.paper': '纸张',
  'automation.print.orientation': '方向',
  'automation.print.portrait': '纵向',
  'automation.print.landscape': '横向',
  'automation.print.background': '包含页面背景',
  'automation.print.print': '打印…',

  // EmbedBody
  'automation.embed.title': '嵌入',
  'automation.embed.subtitle': '用于网页、Wiki 和 Markdown 的代码片段。图表数据包含在链接中——不会上传任何内容。',
  'automation.embed.allPages': '所有页面',
  'automation.embed.currentPage': '当前页面',
  'automation.embed.toolbar': '工具栏',
  'automation.embed.iframe': '交互式（iframe）',
  'automation.embed.longLink': '长链接（{count}k 个字符）',
  'automation.embed.viewerLink': '查看器链接',
  'automation.embed.markdownLink': 'Markdown 链接',
  'automation.embed.imageHtml': '图像（HTML，当前页面）',
  'automation.embed.imageMarkdown': '图像（Markdown，当前页面）',
  'automation.embed.dataUriSize': '{size} KB data URI',
  'automation.embed.copy': '复制{label}',

  // MermaidBody / mermaidRegen.ts
  'automation.mermaid.title': '编辑 Mermaid',
  'automation.mermaid.subtitle': '修改源代码并应用：图表将原地重新生成（可一步撤销）。',
  'automation.mermaid.noShapes': 'Mermaid 源代码未生成任何图形。',
  'automation.mermaid.gone': '此 Mermaid 图表已不在页面上。',

  // ReplayBody
  'automation.replay.title': '回放',
  'automation.replay.subtitle': '按时间顺序（从最早开始）逐步回放此文档的修订历史（当前页面）。',
  'automation.replay.loading': '正在加载修订版本…',
  'automation.replay.emptyPage': '此时页面为空',
  'automation.replay.first': '最早',
  'automation.replay.last': '最新',
  'automation.replay.play': '播放',
  'automation.replay.pause': '暂停',
  'automation.replay.revision': '修订版本',
  'automation.replay.now': '现在',
  'automation.replay.noRevisions': '还没有修订版本：每次保存以及有未保存的编辑时每隔几分钟都会记录一次。',

  // DataBody (Edit Data for layers, pages, the document)
  'automation.data.layerTitle': '编辑图层数据',
  'automation.data.pageTitle': '编辑页面数据',
  'automation.data.documentTitle': '编辑文档数据',
  'automation.data.id': 'ID {id}',
  'automation.data.documentSubtitle': '所有页面都可以通过 %placeholders% 使用的值。',
  'automation.data.properties': '属性',
  'automation.data.propertiesHint': '在此范围内启用了占位符的标签会显示 %key% 的值',

  // PropertiesBody (File → Properties)
  'automation.props.title': '文件属性',
  'automation.props.author': '作者',
  'automation.props.authorPlaceholder': '此图表的作者',
  'automation.props.descriptionPlaceholder': '此图表的内容简介',
  'automation.props.created': '创建时间',
  'automation.props.lastSaved': '上次保存',
  'automation.props.labels': '标签',
  'automation.props.images': '图像和图标',
  'automation.props.comments': '评论',
  'automation.props.docData': '文档数据',
  'automation.props.note': '标题、作者和描述保存在 .arkdraw 文件中，可在标签中以 %title%、%author% 和 %description% 引用。',

  // TemplateTools (My templates, Save as template)
  'automation.templates.imported': '已导入模板“{name}”',
  'automation.templates.importFailed': '无法导入模板：{error}',
  'automation.templates.importFile': '导入模板文件',
  'automation.templates.importTooltip': '导入 .{ext} 或 .arkdraw 文件',
  'automation.templates.fileType': 'ArkDraw 模板',
  'automation.templates.deleteTitle': '删除“{name}”？',
  'automation.templates.deleteMessage': '模板将从此设备中删除。基于该模板创建的图表不受影响。',
  'automation.templates.nothingToSave': '没有可保存为模板的内容。',
  'automation.templates.saved': '已将“{name}”保存到“我的模板”',
  'automation.templates.saveFailed': '无法保存模板：{error}',
  'automation.templates.saveTitle': '另存为模板',
  'automation.templates.saveSubtitle': '将显示在此设备上“文件 → 从模板新建…”的“我的模板”中。',
  'automation.templates.optional': '可选',
  'automation.templates.contents': '内容',
  'automation.templates.wholeDiagram': '{count, plural, =1 {整个图表} other {整个图表（# 页）}}',
  'automation.templates.thisPage': '此页面',
  'automation.templates.save': '保存模板',

  // actions.tsx
  'automation.parallelEdgesNone': '没有连接相同两个图形的连接线。',
  'automation.savedToBrowser': '已将“{name}”保存到浏览器',

  // plugins.ts (Explore, Anonymize, Dictate)
  'automation.explore.selectFirst': '请选择一个元素作为探索起点。',
  'automation.explore.hint': '探索：选择相邻元素继续，按 Esc 退出。',
  'automation.anonymize.title': '匿名化此页面？',
  'automation.anonymize.message':
    '所有标签、名称、工具提示和数据值都将替换为 x/X 占位符，评论也会被删除，以便在不泄露内容的情况下分享图表。此操作可以撤销。',
  'automation.anonymize.confirm': '匿名化',
  'automation.anonymize.done': '页面已匿名化',
  'automation.dictate.unavailable': '此浏览器不支持语音识别。',
  'automation.dictate.selectFirst': '请选择一个图形或连接线以听写其标签。',
  'automation.dictate.said': '“{text}”',
  'automation.dictate.denied': '麦克风访问被拒绝。',
  'automation.dictate.failed': '听写失败（{error}）。',
  'automation.dictate.listening': '正在聆听…请说出标签内容',
} satisfies Translation<typeof en>;
