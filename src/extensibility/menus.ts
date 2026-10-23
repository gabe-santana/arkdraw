/**
 * Runtime menu extensions: actions that extensions and plugins add to the
 * title-bar menus. The title bar appends them (after a separator) when it
 * builds a menu.
 */
export type MenuName = 'File' | 'Edit' | 'View' | 'Arrange' | 'Extras' | 'Help';
export const MENU_NAMES: MenuName[] = ['File', 'Edit', 'View', 'Arrange', 'Extras', 'Help'];

const ITEMS = new Map<string, string[]>();

/** Adds an action id to a menu. Returns a remover. */
export function addMenuItem(menu: MenuName, actionId: string): () => void {
  const list = ITEMS.get(menu) ?? [];
  if (!list.includes(actionId)) ITEMS.set(menu, [...list, actionId]);
  return () => ITEMS.set(menu, (ITEMS.get(menu) ?? []).filter((id) => id !== actionId));
}

/** Action ids added to a menu, in insertion order. */
export const menuItemsFor = (menu: string): string[] => ITEMS.get(menu) ?? [];

/** Appends a menu's runtime items (after a separator) to the built-in entries. */
export function withMenuExtensions<T>(menu: string, items: T[], toEntry: (id: string) => T, separator: T, exists: (id: string) => boolean): T[] {
  const extra = menuItemsFor(menu).filter(exists);
  return extra.length ? [...items, separator, ...extra.map(toEntry)] : items;
}
