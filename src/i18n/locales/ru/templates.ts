import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Создать по шаблону',
  'templates.subtitle': 'Шаблонов: {templates}, категорий: {categories} — все полностью редактируемые.',
  'templates.categoriesNav': 'Категории шаблонов',
  'templates.searchPlaceholder': 'Поиск шаблонов',
  'templates.all': 'Все шаблоны',
  'templates.grid': 'Шаблоны',
  'templates.resultsFor': 'Результаты по запросу «{query}»',
  'templates.nothingSelected': 'Ничего не выбрано',
  'templates.hint.browse': 'Выбор',
  'templates.doubleClickHint': 'Дважды щёлкните карточку, чтобы создать',
  'templates.connectorCount': '{count, plural, one {# соединитель} few {# соединителя} many {# соединителей} other {# соединителя}}',
  'templates.createBlank': 'Создать пустую диаграмму',
  'templates.createNew': 'Создать новую диаграмму',
  'templates.insertIntoCurrent': 'Вставить в текущую диаграмму',
  'templates.noMatch': 'Нет шаблонов по запросу «{query}»',
  'templates.tryBroader': 'Попробуйте более общий запрос, например «cloud», «uml» или «wireframe».',
  'templates.created': 'Создано: «{name}»',
  'templates.inserted': 'Вставлено: «{name}»',
} satisfies Translation<typeof en>;
