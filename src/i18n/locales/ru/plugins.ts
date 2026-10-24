import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Плагины',
  'plugins.subtitle': 'Расширьте ArkDraw командами, библиотеками фигур и форматами файлов',
  'plugins.warning':
    'Плагины работают внутри ArkDraw с полным доступом к редактору и вашим диаграммам. Добавляйте только плагины, которым доверяете. Перед включением плагина потребуется подтверждение.',
  'plugins.status.active': 'Активен',
  'plugins.storedCopy': '{source} (сохранённая копия)',
  'plugins.remove': 'Удалить плагин',
  'plugins.empty': 'Плагинов пока нет.',
  'plugins.external': 'Загружен приложением или его конфигурацией',
  'plugins.add': 'Добавить плагин',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js или C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js или /plugins/my-plugin.js',
  'plugins.addFromFile': 'Добавить из файла…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': 'Экспортировано: {name}',
  'plugins.exportFailed': 'Ошибка экспорта в {format}: {error}',
  'plugins.trustTitle': 'Включить этот плагин?',
  'plugins.trustMessage': '{what}\n\nПлагины работают внутри ArkDraw с полным доступом к вашим диаграммам и редактору. Включайте только плагины из надёжных источников.',
  'plugins.trustConfirm': 'Включить плагин',
  'plugins.duplicate': 'Этот плагин уже есть в списке.',
  'plugins.enabled': 'Плагин включён: {name}',
  'plugins.failed': 'Ошибка плагина {id}: {error}',
  'plugins.cspHint': '{error} — не удалось загрузить скрипт. Проверьте URL: сайты со строгой политикой Content-Security-Policy разрешают плагины только со своего источника.',
} satisfies Translation<typeof en>;
