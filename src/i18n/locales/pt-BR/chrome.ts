import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': 'Limpar pesquisa',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': 'Misto',
  // color picker section: recently used colors
  'chrome.ui.recentColors': 'Recentes',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': 'Ferramentas',
  'chrome.toolbar.playAnimation': 'Reproduzir animação',
  'chrome.toolbar.pauseAnimation': 'Pausar animação',
  'chrome.zoom.out': 'Diminuir zoom',
  'chrome.zoom.in': 'Aumentar zoom',
  'chrome.zoom.options': 'Opções de zoom',

  // Outline
  'chrome.outline.title': 'Visão geral',
  'chrome.outline.close': 'Fechar visão geral',

  // PageTabs
  'chrome.pageTabs.editData': 'Editar dados…',
  'chrome.pageTabs.insertPage': 'Inserir página',

  // StartScreen
  'chrome.start.title': 'Boas-vindas ao ArkDraw',
  'chrome.start.subtitle': 'Comece um novo diagrama ou continue de onde parou.',
  'chrome.start.blank': 'Diagrama em branco',
  'chrome.start.blankSub': 'Comece com uma tela vazia',
  'chrome.start.templates': 'Modelos…',
  'chrome.start.templatesSub': 'Explore a galeria e Meus modelos',
  'chrome.start.open': 'Abrir…',
  'chrome.start.openSubDesktop': 'Um arquivo neste computador',
  'chrome.start.openSubWeb': 'Um arquivo do seu dispositivo',
  'chrome.start.openBrowser': 'Abrir do navegador…',
  'chrome.start.openBrowserSub': 'Diagramas salvos neste navegador',
  'chrome.start.templatesHeading': 'Modelos',
  'chrome.start.recentHeading': 'Recentes',
  'chrome.start.recentEmpty': 'Os arquivos que você abrir ou salvar aparecerão aqui.',
  'chrome.start.dontShow': 'Não mostrar novamente',
  'chrome.start.reenableHint': 'Reative em Preferências',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Editar dados',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Exibido no painel de camadas',
  'chrome.editData.tooltip': 'Dica',
  'chrome.editData.tooltipPlaceholder': 'Exibida ao passar o mouse',
  'chrome.editData.link': 'Link',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Tags',
  'chrome.editData.tagsPlaceholder': 'frontend, crítico',
  'chrome.editData.properties': 'Propriedades',
  'chrome.editData.keyPlaceholder': 'chave',
  'chrome.editData.valuePlaceholder': 'valor',
  'chrome.editData.addProperty': 'Adicionar propriedade',
  'chrome.editData.placeholders': 'Mostrar espaços reservados {token} no rótulo',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Editar estilo',
  'chrome.editStyle.subtitleDrawio': 'String de estilo (chave=valor;) — aplicada a toda a seleção',
  'chrome.editStyle.styleString': 'String de estilo',
  'chrome.editStyle.subtitleArkdraw': 'Chaves de estilo do ArkDraw, uma por linha — aplicadas a toda a seleção',
  'chrome.editStyle.keptKeys': 'Chaves que o ArkDraw não usa são mantidas e regravadas na exportação .drawio.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Editar diagrama',
  'chrome.editDiagram.subtitle': 'A página atual como JSON do ArkDraw. As alterações podem ser desfeitas.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Alternar substituição',
  'chrome.find.placeholder': 'Localizar em rótulos, nomes, dicas e dados',
  'chrome.find.matchCase': 'Diferenciar maiúsculas',
  'chrome.find.wholeWord': 'Palavra inteira',
  'chrome.find.regex': 'Expressão regular',
  'chrome.find.allPages': 'Todas as páginas',
  'chrome.find.allPagesShort': 'Todas',
  'chrome.find.replaceWith': 'Substituir por',
  'chrome.find.replace': 'Substituir',
  'chrome.find.replaceAll': 'Todas',

  // EditDialogs — Import from text
  'chrome.import.none': 'Nenhum importador de texto instalado.',
  'chrome.import.fromText': 'Importar de texto',
  'chrome.import.asNewPage': 'Como nova página',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Formas',
  'chrome.dock.panel.format': 'Formatar',
  'chrome.dock.panel.layers': 'Camadas',
  'chrome.dock.moveLeft': 'Mover para o lado esquerdo',
  'chrome.dock.moveRight': 'Mover para o lado direito',
  'chrome.dock.moveUp': 'Mover para cima',
  'chrome.dock.moveDown': 'Mover para baixo',
  'chrome.dock.reset': 'Redefinir layout dos painéis',
  'chrome.dock.handleAria': 'Painel {panel}: arraste para mover, clique para ver opções',
  'chrome.dock.handleTitle': 'Arraste para mover · clique para ver opções',
  'chrome.dock.dropHere': 'Solte aqui',
  'chrome.dock.resizeLeft': 'Redimensionar painéis à esquerda',
  'chrome.dock.resizeRight': 'Redimensionar painéis à direita',
  'chrome.rightTabs.aria': 'Painel direito',
  'chrome.rightTabs.design': 'Design',
  'chrome.rightTabs.designHint': 'Estilo do que você seleciona',
  'chrome.rightTabs.layersHint': 'Camadas e todos os elementos, da frente para trás',
  'chrome.rightTabs.ai': 'IA',
  'chrome.rightTabs.aiHint': 'Diga o que você quer: o assistente desenha ou edita',
} satisfies Translation<typeof en>;
