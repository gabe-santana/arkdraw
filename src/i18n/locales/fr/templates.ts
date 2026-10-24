import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Partir d’un modèle',
  'templates.subtitle': '{templates} modèles dans {categories} catégories, tous entièrement modifiables.',
  'templates.categoriesNav': 'Catégories de modèles',
  'templates.searchPlaceholder': 'Rechercher des modèles',
  'templates.all': 'Tous les modèles',
  'templates.grid': 'Modèles',
  'templates.resultsFor': 'Résultats pour « {query} »',
  'templates.nothingSelected': 'Aucune sélection',
  'templates.hint.browse': 'Parcourir',
  'templates.doubleClickHint': 'Double-cliquez sur une carte pour créer',
  'templates.connectorCount': '{count, plural, one {# connecteur} other {# connecteurs}}',
  'templates.createBlank': 'Créer un diagramme vierge',
  'templates.createNew': 'Créer un diagramme',
  'templates.insertIntoCurrent': 'Insérer dans le diagramme actuel',
  'templates.noMatch': 'Aucun modèle ne correspond à « {query} »',
  'templates.tryBroader': 'Essayez un terme plus général, comme « cloud », « uml » ou « wireframe ».',
  'templates.created': '« {name} » créé',
  'templates.inserted': '« {name} » inséré',
} satisfies Translation<typeof en>;
