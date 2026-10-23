/** Context-menu entries for the editing & interaction features (shown only when they apply). */
import type { MenuEntry, MenuItemEntry } from '@/ui/Menu';
import { canEnterGroup } from './groups';
import { canEditPoints } from './pointEdit';
import { hasTable } from './tableCells';
import { useInteraction } from './store';
import { TABLE_MENU_IDS } from './actions';

export function interactionContextItems(e: (id: string) => MenuItemEntry): MenuEntry[] {
  const out: MenuEntry[] = [];
  if (canEnterGroup()) out.push(e('arrange.enterGroup'));
  if (useInteraction.getState().isolation.length) out.push(e('arrange.exitGroup'));
  if (canEditPoints()) out.push(e('edit.editPoints'));
  if (hasTable()) out.push({ label: 'Table', items: TABLE_MENU_IDS.map(e) });
  return out;
}
