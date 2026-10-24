import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': 'холст диаграммы',
  'canvas.ariaLabel': 'Холст диаграммы. Tab переходит между фигурами, Alt+стрелка — по соединениям, Shift+F10 открывает контекстное меню.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Начните с чистого холста',
  'canvas.empty.body': 'Перетащите фигуры из библиотеки, рисуйте с помощью панели инструментов или опишите диаграмму, и ИИ набросает её за вас.',
  'canvas.empty.rectangle': 'прямоугольник',
  'canvas.empty.connector': 'соединитель',
  'canvas.empty.ai': 'ИИ',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': 'Заменить на…',
  'canvas.picker.insertShape': 'Вставить фигуру…',
  'canvas.picker.noMatch': 'Подходящих фигур нет.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Открытые группы',
  'canvas.group.backToDiagram': 'Вернуться ко всей диаграмме (Home)',
  'canvas.group.group': 'Группа',
  'canvas.group.subgroup': 'Подгруппа',
  'canvas.group.exit': 'Выйти из группы',
  'canvas.group.nothingNested': 'В выделении нет вложенных элементов',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': 'Сгруппировано · {count}',
  'canvas.flash.ungrouped': 'Разгруппировано · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': 'Угол {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'Действие этой ссылки не является корректным JSON.',
  'canvas.link.pageMissing': 'Эта страница больше не существует.',
  'canvas.link.unsupportedScheme': 'Открывать можно только веб-ссылки, ссылки на почту и телефон.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Значок',
  'canvas.aria.connectorRole': 'соединитель',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': 'Соединитель от {from} к {to}',
  'canvas.aria.connectorNamedFromTo': 'Соединитель «{text}» от {from} к {to}',
  'canvas.aria.nothing': 'ничего',
  'canvas.aria.nothingSelected': 'Ничего не выделено',
  'canvas.aria.selectedOne': 'Выделено: {description}',
  'canvas.aria.selectedMany': 'Выделено: {count, plural, one {# элемент} few {# элемента} many {# элементов} other {# элемента}}',

  // TableCellLayer
  'canvas.table.cellLabel': 'Ячейка: строка {row}, столбец {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Дважды щёлкните, чтобы добавить точку',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Параметры кисти',
  'canvas.brush.title': 'Кисть',
  'canvas.brush.color': 'Цвет кисти',
  'canvas.brush.smooth': 'Сглаживание',
  'canvas.brush.pressure': 'Нажим пера (переменная толщина)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Перемещение',
  'canvas.behavior.movableHint': 'Можно перетаскивать и сдвигать',
  'canvas.behavior.resizable': 'Изменение размера',
  'canvas.behavior.resizableHint': 'Показываются маркеры изменения размера',
  'canvas.behavior.rotatable': 'Поворот',
  'canvas.behavior.rotatableHint': 'Показывается маркер поворота',
  'canvas.behavior.deletable': 'Удаление',
  'canvas.behavior.deletableHint': 'Удаляется клавишей Delete',
  'canvas.behavior.editable': 'Редактирование',
  'canvas.behavior.editableHint': 'Двойной щелчок изменяет подпись',
  'canvas.behavior.connectable': 'Соединение',
  'canvas.behavior.connectableHint': 'К ней можно присоединять соединители',
  'canvas.behavior.selectable': 'Выделение',
  'canvas.behavior.selectableHint': 'Выделяется щелчком и рамкой',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Формат текста',
  'canvas.format.bold': 'Полужирный ({shortcut})',
  'canvas.format.italic': 'Курсив ({shortcut})',
  'canvas.format.underline': 'Подчёркнутый ({shortcut})',
  'canvas.format.strikethrough': 'Зачёркнутый',
  'canvas.format.smaller': 'Уменьшить ({shortcut})',
  'canvas.format.larger': 'Увеличить ({shortcut})',
  'canvas.format.textColor': 'Цвет текста',
  'canvas.format.highlight': 'Выделение цветом',
  'canvas.format.subscript': 'Подстрочный',
  'canvas.format.superscript': 'Надстрочный',
  'canvas.format.link': 'Ссылка',
  'canvas.format.removeLink': 'Удалить ссылку',
  'canvas.format.clearFormatting': 'Очистить формат',
} satisfies Translation<typeof en>;
