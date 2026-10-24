import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Editar forma',
  'stencils.insertTitle': 'Inserir forma',
  'stencils.stencilXml': 'XML de stencil do mxGraph',
  'stencils.builtIn': '{shape} é uma forma integrada',
  'stencils.insertSubtitle': 'Descreva uma forma em XML de stencil do mxGraph',
  'stencils.convertInfo':
    'As formas integradas são desenhadas por código. Ao aplicar, esta forma é convertida em uma {customShape} editável, com as proporções atuais; texto, estilo e conexões são mantidos.',
  'stencils.customShapeTerm': 'forma personalizada',
  'stencils.replaceInfo': 'Você ainda pode substituí-la por uma forma personalizada escrita do zero.',
  'stencils.startFromSample': 'Começar com um exemplo',
  'stencils.fileType': 'XML de stencil',
  'stencils.customShape': 'Forma personalizada',
  'stencils.addedToScratchpad': '“{name}” adicionada ao Rascunho',
  'stencils.noShape': 'Nenhum <shape> neste arquivo.',
  'stencils.firstOfMany': 'A primeira de {count} formas foi carregada. Importe o arquivo como biblioteca para obter todas.',
  'stencils.fixToPreview': 'Corrija o XML para ver a visualização',
  'stencils.nothingToPreview': 'Nada para visualizar',
  'stencils.aspect': 'proporção {aspect}',
  'stencils.connectionPoints': '{count, plural, =0 {0 pontos de conexão} one {# ponto de conexão} other {# pontos de conexão}}',
  'stencils.stroke': 'contorno {width}',
  'stencils.strokeFromStyle': 'contorno do estilo',
  'stencils.ignored': 'Ignorado: {items}',
  'stencils.openXml': 'Abrir XML…',
  'stencils.revert': 'Reverter',
  'stencils.convertApply': 'Converter e aplicar',
  'stencils.addToScratchpad': 'Adicionar ao Rascunho',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'Esta forma personalizada ainda não tem stencil.',
  'stencils.convert.ownText': '{shape} desenha o próprio texto, algo que os stencils não conseguem representar.',
  'stencils.convert.unsupported': '{shape} é uma forma integrada que usa recursos que os stencils não conseguem representar ({why}).',
  'stencils.convert.dynamic': 'renderização dinâmica',
  'stencils.convert.noOutline': '{shape} não tem contorno para converter.',
} satisfies Translation<typeof en>;
