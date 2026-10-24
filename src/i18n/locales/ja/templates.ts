import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'テンプレートから開始',
  'templates.subtitle': '{categories} カテゴリ、{templates} 個のテンプレート。すべて自由に編集できます。',
  'templates.categoriesNav': 'テンプレートのカテゴリ',
  'templates.searchPlaceholder': 'テンプレートを検索',
  'templates.all': 'すべてのテンプレート',
  // aria-label of the template grid
  'templates.grid': 'テンプレート',
  'templates.resultsFor': '「{query}」の検索結果',
  'templates.nothingSelected': '何も選択されていません',
  // keyboard hint: arrow keys browse the gallery
  'templates.hint.browse': '移動',
  'templates.doubleClickHint': 'カードをダブルクリックして作成',
  'templates.connectorCount': '{count, plural, other {# 本のコネクタ}}',
  'templates.createBlank': '空白のダイアグラムを作成',
  'templates.createNew': '新しいダイアグラムを作成',
  'templates.insertIntoCurrent': '現在のダイアグラムに挿入',
  'templates.noMatch': '「{query}」に一致するテンプレートはありません',
  'templates.tryBroader': '「cloud」「uml」「wireframe」など、より広い語句で検索してみてください。',
  // toasts; {name} is a template name
  'templates.created': '「{name}」を作成しました',
  'templates.inserted': '「{name}」を挿入しました',
} satisfies Translation<typeof en>;
