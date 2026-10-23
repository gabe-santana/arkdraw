/**
 * Translations for registry-backed strings, looked up by id with the
 * registry's English text as the fallback (so plugin commands and new
 * entries keep working untranslated):
 *
 *   commands   'action.<id>'                 src/i18n/locales/<code>/actions.ts
 *   templates  'template.<id>.name' / '.description', 'templateCategory.<name>'
 *                                            src/i18n/locales/<code>/templateCatalog.ts
 */
import { tx } from './index';

interface ActionLike {
  id: string;
  label: string;
  group?: string;
}

/** A command's label in the UI language. */
export const actionLabel = (a: ActionLike): string => tx(`action.${a.id}`, a.label);

/** A command group ("File", "Edit"…) in the UI language. */
export const groupLabel = (group: string): string => tx(`group.${group}`, group);

interface TemplateLike {
  id: string;
  name: string;
  description: string;
}

export const templateName = (tpl: TemplateLike): string => tx(`template.${tpl.id}.name`, tpl.name);
export const templateDescription = (tpl: TemplateLike): string => tx(`template.${tpl.id}.description`, tpl.description);
export const templateCategory = (category: string): string => tx(`templateCategory.${category}`, category);

/** Menu-bar menu names ('File', 'Edit'…) → translated title. */
export const menuTitle = (menu: string): string => tx(`menu.${menu.toLowerCase()}`, menu);
