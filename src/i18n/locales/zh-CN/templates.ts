import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': '从模板开始',
  'templates.subtitle': '{categories} 个类别共 {templates} 个模板——全部可完全编辑。',
  'templates.categoriesNav': '模板类别',
  'templates.searchPlaceholder': '搜索模板',
  'templates.all': '所有模板',
  'templates.grid': '模板',
  'templates.resultsFor': '“{query}”的搜索结果',
  'templates.nothingSelected': '未选择任何内容',
  'templates.hint.browse': '浏览',
  'templates.doubleClickHint': '双击卡片即可创建',
  'templates.connectorCount': '{count, plural, other {# 条连接线}}',
  'templates.createBlank': '创建空白图表',
  'templates.createNew': '创建新图表',
  'templates.insertIntoCurrent': '插入到当前图表',
  'templates.noMatch': '没有与“{query}”匹配的模板',
  'templates.tryBroader': '试试更宽泛的词，如“cloud”、“uml”或“wireframe”。',
  // toasts; {name} is a template name
  'templates.created': '已创建“{name}”',
  'templates.inserted': '已插入“{name}”',
} satisfies Translation<typeof en>;
