import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'O OpenDraw {version} está disponível',
  'desktop.update.downloading': 'Baixando…',
  'desktop.update.downloadingPercent': 'Baixando · {percent}%',
  'desktop.update.installing': 'Instalando… O OpenDraw será reiniciado.',
  'desktop.update.restartHint': 'Reinicie para atualizar. Antes, será solicitado que você salve as alterações pendentes.',
  'desktop.update.restart': 'Reiniciar para atualizar',

  // updater.ts
  'desktop.update.webAuto': 'Na versão web, as atualizações são instaladas automaticamente.',
  'desktop.update.upToDate': 'O OpenDraw está atualizado.',
  'desktop.update.checkFailed': 'Não foi possível verificar atualizações: {error}',
  'desktop.update.failed': 'Falha na atualização: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'Edite o config.json e reinicie o OpenDraw para aplicá-lo.',
  'desktop.config.noFolder': 'Nenhuma pasta de configuração',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': 'Abrir “{name}” em uma nova janela?',
  'desktop.openWhere.message': '“{name}” tem alterações não salvas. Você pode continuar trabalhando nele aqui e abrir o arquivo em uma nova janela.',
  'desktop.openWhere.confirm': 'Abrir em nova janela',
  'desktop.openWhere.deny': 'Substituir este diagrama',
} satisfies Translation<typeof en>;
