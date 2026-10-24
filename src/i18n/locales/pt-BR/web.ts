import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': 'Salvar ({shortcut})',
  'web.embed.exit': 'Sair',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'Uma nova versão do ArkDraw está pronta',
  'web.pwa.offlineReady': 'O ArkDraw agora funciona offline',
  'web.pwa.reloadHint': 'Recarregue para atualizar. O trabalho não salvo é restaurado após recarregar.',
  'web.pwa.cached': 'O aplicativo está armazenado em cache neste dispositivo.',
  'web.pwa.updating': 'Atualizando…',
  'web.pwa.reload': 'Recarregar',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'Somente URLs de diagrama http(s) podem ser abertas.',
  'web.shared.askTitle': 'Abrir o diagrama compartilhado?',
  'web.shared.askMessage': 'Há trabalho não salvo de uma sessão anterior. Abrir o diagrama compartilhado vai substituí-lo.',
  'web.shared.confirm': 'Abrir diagrama compartilhado',
  'web.shared.deny': 'Manter meu trabalho',
  'web.shared.openFailed': 'Não foi possível abrir o diagrama compartilhado: {error}',

  // loadDiagram.ts
  'web.load.empty': 'O diagrama está vazio.',
  'web.load.noPages': 'Nenhuma página de diagrama foi encontrada.',
  'web.load.unrecognized': 'Formato de diagrama não reconhecido.',
  'web.load.sharedDiagram': 'Diagrama compartilhado',
  'web.load.cors': 'Não foi possível baixar o diagrama. O servidor pode não permitir solicitações entre origens (CORS).',
  'web.load.http': 'Não foi possível baixar o diagrama (HTTP {status}).',
  'web.load.tooLarge': 'O diagrama é grande demais para ser aberto.',
} satisfies Translation<typeof en>;
