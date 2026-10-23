/**
 * Group navigation (draw.io parity): Enter group isolates a group's members
 * (everything else is dimmed and can't be picked), Exit group / Home climb
 * back out, and selection inside an entered group works one nesting level at
 * a time. Also Select descendants.
 */
import type { Doc } from '@/model/types';
import { isShape } from '@/model/types';
import { containedShapes, groupMembers, isHidden, isLocked, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { useInteraction } from './store';

const iso = () => useInteraction.getState().isolation;
const current = () => iso()[iso().length - 1] as string | undefined;

/** True when the element can be picked at the current isolation level. */
export function inIsolation(doc: Doc, id: string, isolation = iso()): boolean {
  const g = isolation[isolation.length - 1];
  if (!g) return true;
  return !!doc.elements[id]?.groupIds.includes(g);
}

/** The group one level below `level` that `id` belongs to (undefined = none). */
function groupBelow(doc: Doc, id: string, level: string | undefined): string | undefined {
  const el = doc.elements[id];
  if (!el?.groupIds.length) return undefined;
  if (!level) return el.groupIds[el.groupIds.length - 1];
  const k = el.groupIds.indexOf(level);
  return k > 0 ? el.groupIds[k - 1] : undefined;
}

/**
 * What a click on `id` selects: its group at the current isolation level
 * (the outermost group at the root, like `groupMembers`).
 */
export function pickMembers(doc: Doc, id: string, isolation = iso()): string[] {
  const level = isolation[isolation.length - 1];
  if (!level) return groupMembers(doc, id);
  const g = groupBelow(doc, id, level);
  if (!g) return [id];
  return doc.order.filter((oid) => doc.elements[oid]?.groupIds.includes(g));
}

/** Whether the element may be picked by a click or rubber band. */
export function canPick(doc: Doc, id: string): boolean {
  const el = doc.elements[id];
  return !!el && el.behavior?.selectable !== false && inIsolation(doc, id);
}

/** Members of the entered group (empty at the root). */
export function isolationMembers(doc: Doc, isolation = iso()): string[] {
  const g = isolation[isolation.length - 1];
  return g ? doc.order.filter((id) => doc.elements[id]?.groupIds.includes(g)) : [];
}

/** The group the selection forms at the current level, if it is exactly one group. */
export function selectedGroup(): string | undefined {
  const { doc, selection } = useEditor.getState();
  if (!selection.length) return undefined;
  const level = current();
  const g = groupBelow(doc, selection[0], level);
  if (!g) return undefined;
  return selection.every((id) => groupBelow(doc, id, level) === g) ? g : undefined;
}

export const canEnterGroup = () => !!selectedGroup();

/** Enters the selected group; `focusId` (a clicked member) gets selected inside it. */
export function enterGroup(focusId?: string) {
  const g = selectedGroup();
  if (!g) return;
  const s = useEditor.getState();
  useInteraction.getState().set({ isolation: [...iso(), g] });
  s.select(focusId ? pickMembers(s.doc, focusId) : []);
}

/** Leaves the innermost entered group and selects it. Without isolation, selects the parent container (draw.io "Up"). */
export function exitGroup() {
  const s = useEditor.getState();
  const stack = iso();
  if (!stack.length) {
    const el = s.doc.elements[s.selection[0]];
    if (isShape(el) && el.containerId) s.select([el.containerId]);
    return;
  }
  const left = stack[stack.length - 1];
  const next = stack.slice(0, -1);
  useInteraction.getState().set({ isolation: next });
  const member = s.doc.order.find((id) => s.doc.elements[id]?.groupIds.includes(left));
  s.select(member ? pickMembers(s.doc, member, next) : []);
}

/** Back to the root: leaves every entered group (draw.io "Home"). */
export function exitAllGroups() {
  const stack = iso();
  if (!stack.length) return;
  const s = useEditor.getState();
  useInteraction.getState().set({ isolation: [] });
  const member = s.doc.order.find((id) => s.doc.elements[id]?.groupIds.includes(stack[0]));
  s.select(member ? groupMembers(s.doc, member) : []);
}

export const canExitGroup = () => {
  if (iso().length) return true;
  const s = useEditor.getState();
  const el = s.doc.elements[s.selection[0]];
  return s.selection.length === 1 && isShape(el) && !!el.containerId;
};

/**
 * Descendants of the selection: shapes nested (recursively) in selected
 * containers and the members of selected groups and of their sub-groups.
 * The selected containers themselves are dropped when they have children.
 */
export function descendantsOf(doc: Doc, ids: string[]): string[] {
  const out = new Set<string>();
  const queue = [...ids];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const el = doc.elements[id];
    if (!el) continue;
    for (const gid of el.groupIds) {
      for (const oid of doc.order) if (doc.elements[oid]?.groupIds.includes(gid) && !seen.has(oid)) {
        out.add(oid);
        queue.push(oid);
      }
    }
    for (const cid of containedShapes(doc, [id])) {
      out.add(cid);
      if (!seen.has(cid)) queue.push(cid);
    }
  }
  // Group members that were selected stay selected; containers give way to their content.
  for (const id of ids) {
    const hasChildren = containedShapes(doc, [id]).length > 0;
    if (!hasChildren) out.add(id);
    else out.delete(id);
  }
  return doc.order.filter((id) => out.has(id) && !isHidden(doc, doc.elements[id]) && !isLocked(doc, doc.elements[id]));
}

export function selectDescendants() {
  const s = useEditor.getState();
  const next = descendantsOf(s.doc, s.selection);
  if (!next.length) return useUi.getState().toast('Nothing nested in the selection');
  s.select(next);
}
