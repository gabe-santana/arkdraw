import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'Импорт SVG',
  'svgImport.message': 'Вставьте {name} как одно изображение или преобразуйте его контуры, фигуры и текст в редактируемые фигуры.',
  'svgImport.unnamed': 'этот SVG',
  'svgImport.perGroup': 'Одна фигура на группу (сохраняет цвета, меньше фигур)',
  'svgImport.asImage': 'Вставить как изображение',
  'svgImport.convert': 'Преобразовать в фигуры',
  'svgImport.converted': '{count, plural, one {Преобразовано в # фигуру (сгруппировано).} few {Преобразовано в # фигуры (сгруппированы).} many {Преобразовано в # фигур (сгруппированы).} other {Преобразовано в # фигуры (сгруппированы).}}',
  'svgImport.pickTitle': 'SVG как фигуры',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'Этот файл не является корректным изображением SVG.',
  'svgImport.msg.empty': 'В SVG нет ничего, что можно преобразовать в фигуры.',
  'svgImport.msg.gradient': 'Градиенты заменены их первым цветом.',
  'svgImport.msg.pattern': 'Узорные заливки заменены сплошным цветом.',
  'svgImport.msg.clip': 'Обтравочные контуры и маски пропущены.',
  'svgImport.msg.filter': 'Фильтры (размытие, тени) пропущены.',
  'svgImport.msg.marker': 'Маркеры контуров пропущены (у линий остаются простые стрелки).',
  'svgImport.msg.skewText': 'Наклонный текст и изображения приближены повёрнутой рамкой.',
  'svgImport.msg.foreign': 'Встроенный HTML (foreignObject) преобразован в обычный текст.',
  'svgImport.msg.relativeImage': 'Изображения с относительными ссылками пропущены.',
} satisfies Translation<typeof en>;
