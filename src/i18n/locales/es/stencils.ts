import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Editar forma',
  'stencils.insertTitle': 'Insertar forma',
  'stencils.stencilXml': 'XML de plantilla de forma de mxGraph',
  'stencils.builtIn': '{shape} es una forma integrada',
  'stencils.insertSubtitle': 'Describe una forma en XML de plantilla de forma de mxGraph',
  'stencils.convertInfo':
    'Las formas integradas se dibujan mediante código. Al aplicar, esta se convierte en una {customShape} editable con sus proporciones actuales; se conservan el texto, el estilo y las conexiones.',
  'stencils.customShapeTerm': 'forma personalizada',
  'stencils.replaceInfo': 'También puedes reemplazarla por una forma personalizada escrita desde cero.',
  'stencils.startFromSample': 'Empezar con un ejemplo',
  'stencils.fileType': 'XML de plantilla de forma',
  'stencils.customShape': 'Forma personalizada',
  'stencils.addedToScratchpad': 'Se añadió “{name}” al Bloc de notas',
  'stencils.noShape': 'No hay ningún <shape> en este archivo.',
  'stencils.firstOfMany': 'Se cargó la primera de {count} formas. Importa el archivo como biblioteca para obtenerlas todas.',
  'stencils.fixToPreview': 'Corrige el XML para ver una vista previa',
  'stencils.nothingToPreview': 'No hay nada que previsualizar',
  'stencils.aspect': 'Aspecto {aspect}',
  'stencils.connectionPoints': '{count, plural, one {# punto de conexión} other {# puntos de conexión}}',
  'stencils.stroke': 'línea {width}',
  'stencils.strokeFromStyle': 'línea según el estilo',
  'stencils.ignored': 'Ignorado: {items}',
  'stencils.openXml': 'Abrir XML…',
  'stencils.revert': 'Revertir',
  'stencils.convertApply': 'Convertir y aplicar',
  'stencils.addToScratchpad': 'Añadir al Bloc de notas',

  // convert.ts — why a built-in shape can't become a stencil
  'stencils.convert.noStencil': 'Esta forma personalizada aún no tiene plantilla de forma.',
  'stencils.convert.ownText': '{shape} dibuja su propio texto, algo que las plantillas de forma no pueden expresar.',
  'stencils.convert.unsupported': '{shape} es una forma integrada que usa funciones que las plantillas de forma no pueden expresar ({why}).',
  'stencils.convert.dynamic': 'representación dinámica',
  'stencils.convert.noOutline': '{shape} no tiene ningún contorno que convertir.',
} satisfies Translation<typeof en>;
