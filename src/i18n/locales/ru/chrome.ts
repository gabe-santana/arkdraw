import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Очистить поиск',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': 'Разные',
  // color picker section: recently used colors
  'chrome.ui.recentColors': 'Недавние',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': 'Инструменты',
  'chrome.toolbar.playAnimation': 'Воспроизвести анимацию',
  'chrome.toolbar.pauseAnimation': 'Приостановить анимацию',
  'chrome.zoom.out': 'Уменьшить',
  'chrome.zoom.in': 'Увеличить',
  'chrome.zoom.options': 'Параметры масштаба',

  // Outline
  'chrome.outline.title': 'Обзор',
  'chrome.outline.close': 'Закрыть обзор',

  // PageTabs
  'chrome.pageTabs.editData': 'Изменить данные…',
  'chrome.pageTabs.insertPage': 'Вставить страницу',

  // StartScreen
  'chrome.start.title': 'Добро пожаловать в ArkDraw',
  'chrome.start.subtitle': 'Создайте новую диаграмму или продолжите с того места, где остановились.',
  'chrome.start.blank': 'Пустая диаграмма',
  'chrome.start.blankSub': 'Начать с чистого холста',
  'chrome.start.templates': 'Шаблоны…',
  'chrome.start.templatesSub': 'Галерея и «Мои шаблоны»',
  'chrome.start.open': 'Открыть…',
  'chrome.start.openSubDesktop': 'Файл на этом компьютере',
  'chrome.start.openSubWeb': 'Файл с вашего устройства',
  'chrome.start.openBrowser': 'Открыть из браузера…',
  'chrome.start.openBrowserSub': 'Диаграммы, сохранённые в этом браузере',
  'chrome.start.templatesHeading': 'Шаблоны',
  'chrome.start.recentHeading': 'Недавние',
  'chrome.start.recentEmpty': 'Здесь появятся файлы, которые вы открываете или сохраняете.',
  'chrome.start.dontShow': 'Больше не показывать',
  'chrome.start.reenableHint': 'Снова включить можно в параметрах',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Изменить данные',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Отображается на панели слоёв',
  'chrome.editData.tooltip': 'Подсказка',
  'chrome.editData.tooltipPlaceholder': 'Отображается при наведении',
  'chrome.editData.link': 'Ссылка',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Теги',
  'chrome.editData.tagsPlaceholder': 'фронтенд, критично',
  'chrome.editData.properties': 'Свойства',
  'chrome.editData.keyPlaceholder': 'ключ',
  'chrome.editData.valuePlaceholder': 'значение',
  'chrome.editData.addProperty': 'Добавить свойство',
  'chrome.editData.placeholders': 'Подставлять {token} в подпись',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Изменить стиль',
  'chrome.editStyle.subtitleDrawio': 'Строка стиля (key=value;) — применяется ко всему выделению',
  'chrome.editStyle.styleString': 'Строка стиля',
  'chrome.editStyle.subtitleArkdraw': 'Ключи стиля ArkDraw, по одному на строку — применяются ко всему выделению',
  'chrome.editStyle.keptKeys': 'Ключи, которые ArkDraw не использует, сохраняются и записываются обратно при экспорте в .drawio.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Изменить диаграмму',
  'chrome.editDiagram.subtitle': 'Текущая страница в формате ArkDraw JSON. Изменения можно отменить.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Показать замену',
  'chrome.find.placeholder': 'Поиск в подписях, именах, подсказках и данных',
  'chrome.find.matchCase': 'Учитывать регистр',
  'chrome.find.wholeWord': 'Слово целиком',
  'chrome.find.regex': 'Регулярное выражение',
  'chrome.find.allPages': 'Все страницы',
  'chrome.find.allPagesShort': 'Все',
  'chrome.find.replaceWith': 'Заменить на',
  'chrome.find.replace': 'Заменить',
  'chrome.find.replaceAll': 'Все',

  // EditDialogs — Import from text
  'chrome.import.none': 'Импорт из текста не установлен.',
  'chrome.import.fromText': 'Импорт из текста',
  'chrome.import.asNewPage': 'Как новую страницу',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Фигуры',
  'chrome.dock.panel.format': 'Формат',
  'chrome.dock.panel.layers': 'Слои',
  'chrome.dock.moveLeft': 'Переместить влево',
  'chrome.dock.moveRight': 'Переместить вправо',
  'chrome.dock.moveUp': 'Переместить вверх',
  'chrome.dock.moveDown': 'Переместить вниз',
  'chrome.dock.reset': 'Сбросить расположение панелей',
  'chrome.dock.handleAria': 'Панель «{panel}»: перетащите, чтобы переместить, или щёлкните для параметров',
  'chrome.dock.handleTitle': 'Перетащите для перемещения · щёлкните для параметров',
  'chrome.dock.dropHere': 'Перетащите сюда',
  'chrome.dock.resizeLeft': 'Изменить ширину левых панелей',
  'chrome.dock.resizeRight': 'Изменить ширину правых панелей',
  'chrome.rightTabs.aria': 'Правая панель',
  'chrome.rightTabs.design': 'Дизайн',
  'chrome.rightTabs.designHint': 'Стиль и слои выделенного',
  'chrome.rightTabs.ai': 'ИИ',
  'chrome.rightTabs.aiHint': 'Скажите, что нужно: ассистент нарисует или изменит',
  'chrome.dock.resizeAi': 'Изменить ширину панели ИИ',
} satisfies Translation<typeof en>;
