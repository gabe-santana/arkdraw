/** English UI strings — templates. Keys are globally unique: 'templates.<key>'. */
export default {
  // TemplatesDialog
  'templates.title': 'Start from a template',
  'templates.subtitle': '{templates} templates across {categories} categories — every one fully editable.',
  'templates.categoriesNav': 'Template categories',
  'templates.searchPlaceholder': 'Search templates',
  'templates.all': 'All templates',
  // aria-label of the template grid
  'templates.grid': 'Templates',
  'templates.resultsFor': 'Results for “{query}”',
  'templates.nothingSelected': 'Nothing selected',
  // keyboard hint: arrow keys browse the gallery
  'templates.hint.browse': 'Browse',
  'templates.doubleClickHint': 'Double-click a card to create',
  'templates.connectorCount': '{count, plural, one {# connector} other {# connectors}}',
  'templates.createBlank': 'Create blank diagram',
  'templates.createNew': 'Create new diagram',
  'templates.insertIntoCurrent': 'Insert into current diagram',
  'templates.noMatch': 'No templates match “{query}”',
  'templates.tryBroader': 'Try a broader term like “cloud”, “uml” or “wireframe”.',
  // toasts; {name} is a template name
  'templates.created': 'Created “{name}”',
  'templates.inserted': 'Inserted “{name}”',
} as const;
