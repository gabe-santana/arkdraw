import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': 'Empezar con una plantilla',
  'templates.subtitle': '{templates} plantillas en {categories} categorías, todas totalmente editables.',
  'templates.categoriesNav': 'Categorías de plantillas',
  'templates.searchPlaceholder': 'Buscar plantillas',
  'templates.all': 'Todas las plantillas',
  'templates.grid': 'Plantillas',
  'templates.resultsFor': 'Resultados para “{query}”',
  'templates.nothingSelected': 'No hay nada seleccionado',
  'templates.hint.browse': 'Explorar',
  'templates.doubleClickHint': 'Haz doble clic en una tarjeta para crear',
  'templates.connectorCount': '{count, plural, one {# conector} other {# conectores}}',
  'templates.createBlank': 'Crear diagrama en blanco',
  'templates.createNew': 'Crear diagrama nuevo',
  'templates.insertIntoCurrent': 'Insertar en el diagrama actual',
  'templates.noMatch': 'Ninguna plantilla coincide con “{query}”',
  'templates.tryBroader': 'Prueba con un término más amplio, como “nube”, “uml” o “wireframe”.',
  // toasts; {name} is a template name
  'templates.created': 'Se creó “{name}”',
  'templates.inserted': 'Se insertó “{name}”',
} satisfies Translation<typeof en>;
