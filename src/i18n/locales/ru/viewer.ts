import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Загрузка диаграммы…',
  'viewer.openFailed': 'Не удалось открыть эту диаграмму',
  'viewer.viewTitle': 'Просмотр диаграммы',
  'viewer.emptyHint': 'Перетащите сюда файл диаграммы или откройте его с устройства. Ничего не загружается на сервер.',
  'viewer.openFile': 'Открыть файл…',
  'viewer.openEditor': 'Открыть редактор',

  // Viewer — toolbar
  'viewer.openNewTab': 'Открыть в новой вкладке',
  'viewer.editInArkDraw': 'Изменить в ArkDraw',
  'viewer.previousPage': 'Предыдущая страница',
  'viewer.nextPage': 'Следующая страница',
  'viewer.zoomOut': 'Уменьшить',
  'viewer.zoomIn': 'Увеличить',
  'viewer.resetZoom': 'Сбросить до 100%',
  'viewer.fit': 'По размеру экрана',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Перейти к «{name}»',
  'viewer.goToPageUnnamed': 'Перейти к странице',
  'viewer.runAction': 'Щёлкните, чтобы выполнить действие',
  'viewer.unsupportedLink': 'Неподдерживаемая ссылка',
} satisfies Translation<typeof en>;
