import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Começar com um modelo',
  'templates.subtitle': '{templates} modelos em {categories} categorias — todos totalmente editáveis.',
  'templates.categoriesNav': 'Categorias de modelos',
  'templates.searchPlaceholder': 'Pesquisar modelos',
  'templates.all': 'Todos os modelos',
  'templates.grid': 'Modelos',
  'templates.resultsFor': 'Resultados para “{query}”',
  'templates.nothingSelected': 'Nada selecionado',
  'templates.hint.browse': 'Navegar',
  'templates.doubleClickHint': 'Clique duas vezes em um cartão para criar',
  'templates.connectorCount': '{count, plural, =0 {0 conectores} one {# conector} other {# conectores}}',
  'templates.createBlank': 'Criar diagrama em branco',
  'templates.createNew': 'Criar novo diagrama',
  'templates.insertIntoCurrent': 'Inserir no diagrama atual',
  'templates.noMatch': 'Nenhum modelo corresponde a “{query}”',
  'templates.tryBroader': 'Tente um termo mais amplo, como “nuvem”, “uml” ou “wireframe”.',
  'templates.created': '“{name}” criado',
  'templates.inserted': '“{name}” inserido',
} satisfies Translation<typeof en>;
