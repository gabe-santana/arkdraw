import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': 'Сохранить ({shortcut})',
  'web.embed.exit': 'Выйти',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'Доступна новая версия OpenDraw',
  'web.pwa.offlineReady': 'OpenDraw теперь работает офлайн',
  'web.pwa.reloadHint': 'Перезагрузите страницу для обновления. Несохранённая работа будет восстановлена.',
  'web.pwa.cached': 'Приложение сохранено на этом устройстве.',
  'web.pwa.updating': 'Обновление…',
  'web.pwa.reload': 'Перезагрузить',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Открывать можно только диаграммы по URL http(s).',
  'web.shared.askTitle': 'Открыть общую диаграмму?',
  'web.shared.askMessage': 'У вас есть несохранённая работа из прошлого сеанса. Если открыть общую диаграмму, она будет заменена.',
  'web.shared.confirm': 'Открыть общую диаграмму',
  'web.shared.deny': 'Оставить мою работу',
  'web.shared.openFailed': 'Не удалось открыть общую диаграмму: {error}',

  // loadDiagram.ts
  'web.load.empty': 'Диаграмма пуста.',
  'web.load.noPages': 'Страницы диаграммы не найдены.',
  'web.load.unrecognized': 'Нераспознанный формат диаграммы.',
  'web.load.sharedDiagram': 'Общая диаграмма',
  'web.load.cors': 'Не удалось скачать диаграмму. Возможно, сервер не разрешает запросы с других источников (CORS).',
  'web.load.http': 'Не удалось скачать диаграмму (HTTP {status}).',
  'web.load.tooLarge': 'Диаграмма слишком велика, чтобы её открыть.',
} satisfies Translation<typeof en>;
