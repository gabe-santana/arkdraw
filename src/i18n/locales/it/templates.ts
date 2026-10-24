import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Inizia da un modello',
  'templates.subtitle': '{templates} modelli in {categories} categorie, tutti completamente modificabili.',
  'templates.categoriesNav': 'Categorie di modelli',
  'templates.searchPlaceholder': 'Cerca modelli',
  'templates.all': 'Tutti i modelli',
  'templates.grid': 'Modelli',
  'templates.resultsFor': 'Risultati per “{query}”',
  'templates.nothingSelected': 'Nessuna selezione',
  'templates.hint.browse': 'Sfoglia',
  'templates.doubleClickHint': 'Fai doppio clic su una scheda per creare',
  'templates.connectorCount': '{count, plural, one {# connettore} other {# connettori}}',
  'templates.createBlank': 'Crea diagramma vuoto',
  'templates.createNew': 'Crea nuovo diagramma',
  'templates.insertIntoCurrent': 'Inserisci nel diagramma corrente',
  'templates.noMatch': 'Nessun modello corrisponde a “{query}”',
  'templates.tryBroader': 'Prova un termine più generico, come “cloud”, “uml” o “wireframe”.',
  'templates.created': '“{name}” creato',
  'templates.inserted': '“{name}” inserito',
} satisfies Translation<typeof en>;
