import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Изменить фигуру',
  'stencils.insertTitle': 'Вставить фигуру',
  'stencils.stencilXml': 'XML трафарета mxGraph',
  'stencils.builtIn': '{shape} — встроенная фигура',
  'stencils.insertSubtitle': 'Опишите фигуру в формате XML трафарета mxGraph',
  'stencils.convertInfo':
    'Встроенные фигуры рисуются программно. При применении эта фигура будет преобразована в редактируемую {customShape} с текущими пропорциями; текст, стиль и соединения сохранятся.',
  'stencils.customShapeTerm': 'пользовательскую фигуру',
  'stencils.replaceInfo': 'Её также можно заменить пользовательской фигурой, написанной с нуля.',
  'stencils.startFromSample': 'Начать с образца',
  'stencils.fileType': 'XML трафарета',
  'stencils.customShape': 'Пользовательская фигура',
  'stencils.addedToScratchpad': 'Фигура «{name}» добавлена в «Блокнот»',
  'stencils.noShape': 'В этом файле нет <shape>.',
  'stencils.firstOfMany': 'Загружена первая из {count} фигур. Импортируйте файл как библиотеку, чтобы получить их все.',
  'stencils.fixToPreview': 'Исправьте XML, чтобы увидеть предпросмотр',
  'stencils.nothingToPreview': 'Нечего показать',
  'stencils.aspect': 'пропорции: {aspect}',
  'stencils.connectionPoints': '{count, plural, one {# точка соединения} few {# точки соединения} many {# точек соединения} other {# точки соединения}}',
  'stencils.stroke': 'линия {width}',
  'stencils.strokeFromStyle': 'линия из стиля',
  'stencils.ignored': 'Пропущено: {items}',
  'stencils.openXml': 'Открыть XML…',
  'stencils.revert': 'Вернуть',
  'stencils.convertApply': 'Преобразовать и применить',
  'stencils.addToScratchpad': 'Добавить в «Блокнот»',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'У этой пользовательской фигуры ещё нет трафарета.',
  'stencils.convert.ownText': '{shape} рисует собственный текст, который невозможно выразить трафаретом.',
  'stencils.convert.unsupported': '{shape} — встроенная фигура, использующая возможности, недоступные трафаретам ({why}).',
  'stencils.convert.dynamic': 'динамическая отрисовка',
  'stencils.convert.noOutline': 'У фигуры {shape} нет контура для преобразования.',
} satisfies Translation<typeof en>;
