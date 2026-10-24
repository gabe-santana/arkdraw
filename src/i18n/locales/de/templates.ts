import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Mit einer Vorlage beginnen',
  'templates.subtitle': '{templates} Vorlagen in {categories} Kategorien – alle vollständig bearbeitbar.',
  'templates.categoriesNav': 'Vorlagenkategorien',
  'templates.searchPlaceholder': 'Vorlagen suchen',
  'templates.all': 'Alle Vorlagen',
  'templates.grid': 'Vorlagen',
  'templates.resultsFor': 'Ergebnisse für „{query}“',
  'templates.nothingSelected': 'Nichts ausgewählt',
  'templates.hint.browse': 'Blättern',
  'templates.doubleClickHint': 'Doppelklick auf eine Karte zum Erstellen',
  'templates.connectorCount': '{count, plural, one {# Verbinder} other {# Verbinder}}',
  'templates.createBlank': 'Leeres Diagramm erstellen',
  'templates.createNew': 'Neues Diagramm erstellen',
  'templates.insertIntoCurrent': 'In aktuelles Diagramm einfügen',
  'templates.noMatch': 'Keine Vorlagen für „{query}“',
  'templates.tryBroader': 'Versuchen Sie einen allgemeineren Begriff wie „cloud“, „uml“ oder „wireframe“.',
  'templates.created': '„{name}“ erstellt',
  'templates.inserted': '„{name}“ eingefügt',
} satisfies Translation<typeof en>;
