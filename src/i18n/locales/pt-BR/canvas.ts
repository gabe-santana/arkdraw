import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': 'tela do diagrama',
  'canvas.ariaLabel': 'Tela do diagrama. Tab percorre as formas, Alt+Seta segue as conexões, Shift+F10 abre o menu de contexto.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Comece com uma tela em branco',
  'canvas.empty.body': 'Arraste formas da biblioteca, desenhe com a barra de ferramentas ou descreva um diagrama e deixe a IA esboçá-lo para você.',
  'canvas.empty.rectangle': 'retângulo',
  'canvas.empty.connector': 'conector',
  'canvas.empty.ai': 'IA',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': 'Substituir por…',
  'canvas.picker.insertShape': 'Inserir forma…',
  'canvas.picker.noMatch': 'Nenhuma forma corresponde.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': 'Grupos abertos',
  'canvas.group.backToDiagram': 'Voltar ao diagrama inteiro (Home)',
  'canvas.group.group': 'Grupo',
  'canvas.group.subgroup': 'Subgrupo',
  'canvas.group.exit': 'Sair do grupo',
  'canvas.group.nothingNested': 'Nada aninhado na seleção',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': 'Agrupado · {count}',
  'canvas.flash.ungrouped': 'Desagrupado · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': 'Canto {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'A ação deste link não é um JSON válido.',
  'canvas.link.pageMissing': 'Essa página não existe mais.',
  'canvas.link.unsupportedScheme': 'Somente links da web, de e-mail e de telefone podem ser abertos.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'Ícone',
  'canvas.aria.connectorRole': 'conector',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': 'Conector de {from} para {to}',
  'canvas.aria.connectorNamedFromTo': 'Conector “{text}” de {from} para {to}',
  'canvas.aria.nothing': 'nada',
  'canvas.aria.nothingSelected': 'Nada selecionado',
  'canvas.aria.selectedOne': 'Selecionado: {description}',
  'canvas.aria.selectedMany': '{count, plural, =0 {0 elementos selecionados} one {# elemento selecionado} other {# elementos selecionados}}',

  // TableCellLayer
  'canvas.table.cellLabel': 'Célula linha {row}, coluna {column}',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'Clique duas vezes para adicionar um ponto',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'Opções do pincel',
  'canvas.brush.title': 'Pincel',
  'canvas.brush.color': 'Cor do pincel',
  'canvas.brush.smooth': 'Suavizar',
  'canvas.brush.pressure': 'Pressão da caneta (largura variável)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': 'Móvel',
  'canvas.behavior.movableHint': 'Pode ser arrastado ou deslocado com as setas',
  'canvas.behavior.resizable': 'Redimensionável',
  'canvas.behavior.resizableHint': 'Mostra as alças de redimensionamento',
  'canvas.behavior.rotatable': 'Girável',
  'canvas.behavior.rotatableHint': 'Mostra a alça de rotação',
  'canvas.behavior.deletable': 'Excluível',
  'canvas.behavior.deletableHint': 'A tecla Delete o remove',
  'canvas.behavior.editable': 'Editável',
  'canvas.behavior.editableHint': 'Clique duplo edita o rótulo',
  'canvas.behavior.connectable': 'Conectável',
  'canvas.behavior.connectableHint': 'Conectores podem se ligar a ele',
  'canvas.behavior.selectable': 'Selecionável',
  'canvas.behavior.selectableHint': 'Cliques e seleção por área o selecionam',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'Formatação de texto',
  'canvas.format.bold': 'Negrito ({shortcut})',
  'canvas.format.italic': 'Itálico ({shortcut})',
  'canvas.format.underline': 'Sublinhado ({shortcut})',
  'canvas.format.strikethrough': 'Tachado',
  'canvas.format.smaller': 'Diminuir ({shortcut})',
  'canvas.format.larger': 'Aumentar ({shortcut})',
  'canvas.format.textColor': 'Cor do texto',
  'canvas.format.highlight': 'Realçar',
  'canvas.format.subscript': 'Subscrito',
  'canvas.format.superscript': 'Sobrescrito',
  'canvas.format.link': 'Link',
  'canvas.format.removeLink': 'Remover link',
  'canvas.format.clearFormatting': 'Limpar formatação',
} satisfies Translation<typeof en>;
