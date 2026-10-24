import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Тема',
  'styling.theme.subtitle': 'Перекрашивает заливки, линии и текст по их роли. Фигуры одного цвета останутся одного цвета. Отменить — Ctrl+Z.',
  'styling.theme.wholePage': 'Вся страница',
  'styling.theme.empty': 'Сначала добавьте фигуры — тема перекрашивает содержимое страницы.',
  'styling.theme.applied': 'Применена тема «{theme}»',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Классика',
  'styling.theme.ocean': 'Океан',
  'styling.theme.sunset': 'Закат',
  'styling.theme.forest': 'Лес',
  'styling.theme.mono': 'Монохром',
  'styling.theme.bold': 'Яркая',
  'styling.theme.midnight': 'Полночь',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Простой',
  'styling.preset.gray': 'Серый',
  'styling.preset.blue': 'Синий',
  'styling.preset.green': 'Зелёный',
  'styling.preset.orange': 'Оранжевый',
  'styling.preset.yellow': 'Жёлтый',
  'styling.preset.red': 'Красный',
  'styling.preset.purple': 'Фиолетовый',
  'styling.preset.ink': 'Чернильный',
  'styling.preset.indigo': 'Индиго',
  'styling.preset.teal': 'Бирюзовый',
  'styling.preset.outline': 'Контур',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL фонового изображения',
  'styling.bgImage.message': 'Изображение рисуется под диаграммой от начала координат страницы. Укажите URL вида https:// или data:.',
  'styling.bgImage.confirm': 'Задать фон',
  'styling.bgImage.invalid': 'Введите URL вида http(s):// или data:image.',
  'styling.bgImage.loadFailed': 'Не удалось загрузить изображение — проверьте URL',
} satisfies Translation<typeof en>;
