/**
 * Shape of a translation module: any subset of one English namespace's keys
 * (missing keys fall back to English). Use with `satisfies` so a typo'd key
 * is a type error:
 *
 *   import type en from '../../en/panels';
 *   export default { 'panels.fill': 'Preenchimento' } satisfies Translation<typeof en>;
 */
export type Translation<T> = { [K in keyof T]?: string };

/** Registry-backed catalogs (commands, templates) are keyed by id. */
export type CatalogTranslation = Record<string, string>;
