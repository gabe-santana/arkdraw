import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': 'Dispensar',
  'app.restoredUnsaved': 'Seu diagrama não salvo foi restaurado',

  // commands.ts
  'app.style.copied': 'Estilo copiado',
  'app.style.copyFirst': 'Copie um estilo primeiro',
  'app.style.defaultSet': 'Novas formas usarão este estilo',
  'app.style.defaultReset': 'Estilo padrão redefinido',
  'app.layout.nothing': 'Nada para organizar',
  'app.copyAs.done': 'Copiado como {format}',
  'app.copyAs.failed': 'Falha ao copiar: {error}',
  'app.image.loadFailed': 'Não foi possível carregar uma imagem dessa URL.',
  'app.image.linked': 'Imagem vinculada, não incorporada: o servidor bloqueia downloads, então é preciso conexão para exibi-la.',
  'app.image.urlTitle': 'Inserir imagem de URL',
  'app.image.urlMessage': 'Cole um link para uma imagem PNG, JPEG, GIF, WebP ou SVG, ou um URI data:.',
  'app.image.urlInvalid': 'Insira uma URL http(s) ou data:image.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Todos os diagramas',
  'app.filter.opendraw': 'Diagrama do OpenDraw',
  'app.filter.drawio': 'XML de diagrama (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Salvar as alterações em “{name}”?',
  'app.discard.message': 'Suas alterações serão perdidas se não forem salvas.',
  'app.discard.deny': 'Não salvar',
  'app.file.imported': '{count, plural, =0 {Nenhum elemento importado} one {# elemento importado} other {# elementos importados}}',
  'app.file.importedPages': '{count, plural, =0 {Nenhum elemento importado} one {# elemento importado} other {# elementos importados}} em {pages} páginas',
  'app.file.openFailed': 'Não foi possível abrir este arquivo.',
  'app.file.savedToBrowser': 'Salvo no navegador',
  'app.file.saveFailed': 'Falha ao salvar: {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Nada para imprimir',
  'app.playback.nothing': 'Ainda não há nada para animar. Selecione um conector e escolha uma animação no painel de propriedades.',
} satisfies Translation<typeof en>;
