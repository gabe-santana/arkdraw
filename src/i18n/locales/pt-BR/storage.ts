import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Armazenamento do navegador',
  'storage.subtitle': 'Diagramas guardados neste navegador (IndexedDB). Eles ficam neste dispositivo e não são enviados para lugar nenhum.',
  'storage.searchPlaceholder': 'Pesquisar documentos',
  'storage.addFiles': 'Adicionar arquivos…',
  'storage.saveCurrent': 'Salvar atual',
  'storage.noMatches': 'Nenhum documento corresponde à pesquisa.',
  'storage.empty': 'Nenhum diagrama salvo neste navegador ainda. Use “Salvar atual” ou Arquivo → Salvar no navegador.',
  'storage.openDoc': 'Abrir {name}',
  'storage.emptyThumb': 'Vazio',
  'storage.download': 'Baixar .opendraw',
  'storage.docActions': 'Ações do documento',
  'storage.fileType': 'Diagrama do OpenDraw',
  'storage.opened': '“{name}” aberto',
  'storage.savedToBrowser': '“{name}” salvo no navegador',
  'storage.deleteTitle': 'Excluir “{name}”?',
  'storage.deleteMessage': 'Ele será removido do armazenamento deste navegador. Não é possível desfazer.',
  'storage.notADiagram': '“{name}” não é um diagrama do OpenDraw.',
  'storage.justNow': 'agora mesmo',
  'storage.minutesAgo': 'há {count} min',
  'storage.hoursAgo': 'há {count} h',

  // library.ts
  'storage.saveFailed': 'Não foi possível salvar no navegador: {error}',
  'storage.docGone': 'Esse documento não está mais na biblioteca do navegador.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'Este documento recente não está mais disponível.',
  'storage.recentPermission': 'A permissão para ler “{name}” foi negada.',
  'storage.recentRemoved': '“{name}” foi removido da biblioteca do navegador.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'Salvo a partir de um dos seus diagramas.',
} satisfies Translation<typeof en>;
