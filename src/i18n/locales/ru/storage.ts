import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Хранилище браузера',
  'storage.subtitle': 'Диаграммы, хранящиеся в этом браузере (IndexedDB). Они остаются на этом устройстве и никуда не загружаются.',
  'storage.searchPlaceholder': 'Поиск документов',
  'storage.addFiles': 'Добавить файлы…',
  'storage.saveCurrent': 'Сохранить текущую',
  'storage.noMatches': 'Нет документов, соответствующих запросу.',
  'storage.empty': 'В этом браузере пока нет сохранённых диаграмм. Нажмите «Сохранить текущую» или выберите Файл → Сохранить в браузере.',
  'storage.openDoc': 'Открыть {name}',
  'storage.emptyThumb': 'Пусто',
  'storage.download': 'Скачать .opendraw',
  'storage.docActions': 'Действия с документом',
  'storage.fileType': 'Диаграмма OpenDraw',
  'storage.opened': 'Открыто: «{name}»',
  'storage.savedToBrowser': '«{name}» сохранено в браузере',
  'storage.deleteTitle': 'Удалить «{name}»?',
  'storage.deleteMessage': 'Документ будет удалён из хранилища этого браузера. Это действие нельзя отменить.',
  'storage.notADiagram': '«{name}» не является диаграммой OpenDraw.',
  'storage.justNow': 'только что',
  'storage.minutesAgo': '{count} мин назад',
  'storage.hoursAgo': '{count} ч назад',

  // library.ts
  'storage.saveFailed': 'Не удалось сохранить в браузере: {error}',
  'storage.docGone': 'Этого документа больше нет в библиотеке браузера.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'Этот недавний документ больше недоступен.',
  'storage.recentPermission': 'Отказано в доступе на чтение «{name}».',
  'storage.recentRemoved': '«{name}» удалён из библиотеки браузера.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Сохранён из одной из ваших диаграмм.',
} satisfies Translation<typeof en>;
