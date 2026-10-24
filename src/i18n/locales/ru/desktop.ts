import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'Доступна версия OpenDraw {version}',
  'desktop.update.downloading': 'Загрузка…',
  'desktop.update.downloadingPercent': 'Загрузка · {percent}%',
  'desktop.update.installing': 'Установка… OpenDraw перезапустится.',
  'desktop.update.restartHint': 'Перезапустите для обновления. Сначала будет предложено сохранить изменения.',
  'desktop.update.restart': 'Перезапустить и обновить',

  // updater.ts
  'desktop.update.webAuto': 'В веб-версии обновления устанавливаются автоматически.',
  'desktop.update.upToDate': 'Установлена последняя версия OpenDraw.',
  'desktop.update.checkFailed': 'Не удалось проверить обновления: {error}',
  'desktop.update.failed': 'Ошибка обновления: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Измените config.json и перезапустите OpenDraw, чтобы применить изменения.',
  'desktop.config.noFolder': 'Нет папки конфигурации',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': 'Открыть «{name}» в новом окне?',
  'desktop.openWhere.message': 'В «{name}» есть несохранённые изменения. Можно продолжить работу с ним здесь, а файл открыть в новом окне.',
  'desktop.openWhere.confirm': 'Открыть в новом окне',
  'desktop.openWhere.deny': 'Заменить эту диаграмму',
} satisfies Translation<typeof en>;
