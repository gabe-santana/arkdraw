import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'только что',
  'collab.connector': 'Соединитель',
  'collab.shape': 'Фигура',

  // Comments
  'collab.comments': 'Комментарии',
  'collab.resolved': 'Решённые',
  'collab.closeComments': 'Закрыть комментарии',
  'collab.noComments': 'Комментариев пока нет. Выделите фигуру и оставьте заметку для команды — комментарии сохраняются в файле.',
  'collab.commentOn': 'Комментарий к «{name}»…',
  'collab.selectToComment': 'Выделите элемент, чтобы прокомментировать его',
  'collab.comment': 'Комментировать',
  'collab.reply': 'Ответить…',
  'collab.reopen': 'Открыть снова',
  'collab.resolve': 'Решено',

  // Revision history
  'collab.revisions': 'История версий',
  'collab.revisionsSubtitle': 'Локальные снимки «{name}» — создаются при каждом сохранении и во время работы.',
  'collab.noRevisions': 'Версий пока нет. Сохраните диаграмму, чтобы создать первую.',
  'collab.revisionSaved': 'Сохранено',
  'collab.revisionAuto': 'Автоснимок',
  'collab.revisionElements': '{count, plural, one {# элемент} few {# элемента} many {# элементов} other {# элемента}}',
  'collab.deleteRevision': 'Удалить версию',
  'collab.revisionPreview': 'Предпросмотр версии',
  'collab.selectRevision': 'Выберите версию',
  'collab.openAsCopy': 'Открыть как копию',
  'collab.restore': 'Восстановить',
  'collab.restoredSuffix': '{name} (восстановлено)',

  // Preferences
  'prefs.title': 'Параметры',
  'prefs.language': 'Язык',
  'prefs.languageAuto': 'Авто (системный: {language})',
  'prefs.languageHint': 'Названия фигур и поисковые слова для значков остаются на английском.',
  'prefs.author': 'Ваше имя (для комментариев)',
  'prefs.authorPlaceholder': 'например, Ада Лавлейс',
  'prefs.defaultFont': 'Шрифт по умолчанию для новых фигур',
  'prefs.fontHand': 'Рукописный',
  'prefs.palette': 'Своя палитра (цвета в hex через запятую)',
  'prefs.autosave': 'Автосохранение изменений в открытый файл',
  'prefs.startScreen': 'Показывать начальный экран при запуске',
  'prefs.autosaveDesktop': 'Файл записывается примерно через секунду после каждого изменения (если включены резервные копии, предыдущая версия хранится в .bkp).',
  'prefs.autosaveWeb': 'Работает для файлов, открытых или сохранённых через диалог выбора файлов браузера, и для документов в библиотеке браузера.',
  'prefs.autosaveFailed': 'Ошибка автосохранения: {error}',
} satisfies Translation<typeof en>;
