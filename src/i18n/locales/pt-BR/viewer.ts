import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'Carregando diagrama…',
  'viewer.openFailed': 'Não foi possível abrir este diagrama',
  'viewer.viewTitle': 'Visualizar um diagrama',
  'viewer.emptyHint': 'Solte um arquivo de diagrama aqui ou abra um do seu dispositivo. Nada é enviado.',
  'viewer.openFile': 'Abrir um arquivo…',
  'viewer.openEditor': 'Abrir o editor',

  // Viewer — toolbar
  'viewer.openNewTab': 'Abrir em uma nova aba',
  'viewer.editInOpenDraw': 'Editar no ArkDraw',
  'viewer.previousPage': 'Página anterior',
  'viewer.nextPage': 'Próxima página',
  'viewer.zoomOut': 'Diminuir zoom',
  'viewer.zoomIn': 'Aumentar zoom',
  'viewer.resetZoom': 'Redefinir para 100%',
  'viewer.fit': 'Ajustar à tela',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': 'Ir para “{name}”',
  'viewer.goToPageUnnamed': 'Ir para “página”',
  'viewer.runAction': 'Clique para executar a ação',
  'viewer.unsupportedLink': 'Link não suportado',
} satisfies Translation<typeof en>;
