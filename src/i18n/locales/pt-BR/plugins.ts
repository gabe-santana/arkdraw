import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'Plug-ins',
  'plugins.subtitle': 'Amplie o OpenDraw com comandos, bibliotecas de formas e formatos de arquivo',
  'plugins.warning':
    'Os plug-ins são executados dentro do OpenDraw com acesso total ao editor e aos seus diagramas. Adicione apenas plug-ins confiáveis. Será solicitada uma confirmação antes de ativar cada um.',
  'plugins.status.active': 'Ativo',
  'plugins.storedCopy': '{source} (cópia armazenada)',
  'plugins.remove': 'Remover plug-in',
  'plugins.empty': 'Nenhum plug-in ainda.',
  'plugins.external': 'Carregado pelo aplicativo ou pela configuração dele',
  'plugins.add': 'Adicionar plug-in',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js ou C:\\caminho\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js ou /plugins/my-plugin.js',
  'plugins.addFromFile': 'Adicionar de arquivo…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': '{name} exportado',
  'plugins.exportFailed': 'Falha na exportação {format}: {error}',
  'plugins.trustTitle': 'Ativar este plug-in?',
  'plugins.trustMessage': '{what}\n\nOs plug-ins são executados dentro do OpenDraw com acesso total aos seus diagramas e ao editor. Ative apenas plug-ins de fontes confiáveis.',
  'plugins.trustConfirm': 'Ativar plug-in',
  'plugins.duplicate': 'Esse plug-in já está na lista.',
  'plugins.enabled': 'Plug-in ativado: {name}',
  'plugins.failed': 'Falha no plug-in {id}: {error}',
  'plugins.cspHint': '{error} — não foi possível carregar o script. Verifique a URL; hosts com uma Content-Security-Policy rígida só permitem plug-ins da própria origem.',
} satisfies Translation<typeof en>;
