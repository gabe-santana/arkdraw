import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': 'Закрыть',
  'app.restoredUnsaved': 'Несохранённая диаграмма восстановлена',

  // commands.ts
  'app.style.copied': 'Стиль скопирован',
  'app.style.copyFirst': 'Сначала скопируйте стиль',
  'app.style.defaultSet': 'Новые фигуры будут использовать этот стиль',
  'app.style.defaultReset': 'Стиль по умолчанию сброшен',
  'app.layout.nothing': 'Нечего упорядочивать',
  'app.copyAs.done': 'Скопировано как {format}',
  'app.copyAs.failed': 'Ошибка копирования: {error}',
  'app.image.loadFailed': 'Не удалось загрузить изображение по этому URL.',
  'app.image.linked': 'Изображение связано, а не встроено: сервер запрещает скачивание, поэтому для отображения нужно подключение к сети.',
  'app.image.urlTitle': 'Вставить изображение по URL',
  'app.image.urlMessage': 'Вставьте ссылку на изображение PNG, JPEG, GIF, WebP или SVG либо data: URI.',
  'app.image.urlInvalid': 'Введите URL вида http(s) или data:image.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Все диаграммы',
  'app.filter.opendraw': 'Диаграмма OpenDraw',
  'app.filter.drawio': 'XML диаграммы (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Сохранить изменения в «{name}»?',
  'app.discard.message': 'Если не сохранить изменения, они будут потеряны.',
  'app.discard.deny': 'Не сохранять',
  'app.file.imported': '{count, plural, one {Импортирован # элемент} few {Импортировано # элемента} many {Импортировано # элементов} other {Импортировано # элемента}}',
  'app.file.importedPages': '{count, plural, one {Импортирован # элемент} few {Импортировано # элемента} many {Импортировано # элементов} other {Импортировано # элемента}} (страниц: {pages})',
  'app.file.openFailed': 'Не удалось открыть этот файл.',
  'app.file.savedToBrowser': 'Сохранено в браузере',
  'app.file.saveFailed': 'Ошибка сохранения: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Нечего печатать',
  'app.playback.nothing': 'Пока нечего анимировать. Выделите соединитель и выберите анимацию на панели свойств.',
} satisfies Translation<typeof en>;
