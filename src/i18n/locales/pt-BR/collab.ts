import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'agora mesmo',
  'collab.connector': 'Conector',
  'collab.shape': 'Forma',

  // Comments
  'collab.comments': 'Comentários',
  'collab.resolved': 'Resolvidos',
  'collab.closeComments': 'Fechar comentários',
  'collab.noComments': 'Nenhum comentário ainda. Selecione uma forma e deixe uma nota para a equipe — os comentários são salvos no arquivo.',
  'collab.commentOn': 'Comentar em “{name}”…',
  'collab.selectToComment': 'Selecione um elemento para comentar',
  'collab.comment': 'Comentar',
  'collab.reply': 'Responder…',
  'collab.reopen': 'Reabrir',
  'collab.resolve': 'Resolver',

  // Revision history
  'collab.revisions': 'Histórico de revisões',
  'collab.revisionsSubtitle': 'Instantâneos locais de “{name}” — criados a cada salvamento e enquanto você trabalha.',
  'collab.noRevisions': 'Nenhuma revisão ainda. Salve o diagrama para criar uma.',
  'collab.revisionSaved': 'Salvo',
  'collab.revisionAuto': 'Instantâneo automático',
  'collab.revisionElements': '{count, plural, =0 {0 elementos} one {# elemento} other {# elementos}}',
  'collab.deleteRevision': 'Excluir revisão',
  'collab.revisionPreview': 'Visualização da revisão',
  'collab.selectRevision': 'Selecione uma revisão',
  'collab.openAsCopy': 'Abrir como cópia',
  'collab.restore': 'Restaurar',
  'collab.restoredSuffix': '{name} (restaurado)',

  // Preferences
  'prefs.title': 'Preferências',
  'prefs.language': 'Idioma',
  'prefs.languageAuto': 'Automático (sistema: {language})',
  'prefs.languageHint': 'Os nomes das formas e os termos de pesquisa de ícones permanecem em inglês.',
  'prefs.author': 'Seu nome (para comentários)',
  'prefs.authorPlaceholder': 'ex.: Ada Lovelace',
  'prefs.defaultFont': 'Fonte padrão para novas formas',
  'prefs.fontHand': 'À mão livre',
  'prefs.palette': 'Paleta personalizada (cores hex, separadas por vírgula)',
  'prefs.autosave': 'Salvar automaticamente as alterações no arquivo aberto',
  'prefs.startScreen': 'Mostrar a tela inicial ao abrir',
  'prefs.autosaveDesktop': 'Os arquivos são gravados cerca de um segundo após cada alteração (um .bkp mantém a versão anterior quando os backups estão ativados).',
  'prefs.autosaveWeb': 'Funciona com arquivos abertos ou salvos pelo seletor de arquivos do navegador e com documentos da biblioteca do navegador.',
  'prefs.autosaveFailed': 'Falha no salvamento automático: {error}',
} satisfies Translation<typeof en>;
