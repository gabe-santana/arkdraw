/**
 * Mermaid regeneration: diagrams inserted from Mermaid text are grouped and
 * keep their source (in the hidden `__mermaid` data key of the group's first
 * element). "Edit Mermaid…" (or double-clicking the selected group) reopens
 * the source; applying re-imports it and replaces the group in place.
 */
import type { DiagramElement, Doc } from '@/model/types';
import { uid } from '@/lib/id';
import { cloneElements, groupMembers, selectionBounds, useEditor } from '@/store/editor';
import { t } from '@/i18n';

export const MERMAID_KEY = '__mermaid';

/** Groups freshly imported Mermaid elements and stores the source on the first one. */
export function withMermaidSource(importerId: string, source: string, els: DiagramElement[]): DiagramElement[] {
  if (importerId !== 'mermaid' || !els.length) return els;
  const gid = uid();
  return els.map((e, i) => ({
    ...e,
    groupIds: [...e.groupIds, gid],
    ...(i === 0 ? { data: { ...e.data, [MERMAID_KEY]: source.trim() } } : {}),
  }));
}

/** The Mermaid group an element belongs to: its members and the stored source. */
export function mermaidGroupOf(doc: Doc, id: string): { members: string[]; source: string; outer: string } | null {
  const el = doc.elements[id];
  if (!el?.groupIds.length) return null;
  const outer = el.groupIds[el.groupIds.length - 1];
  const members = groupMembers(doc, id);
  const holder = members.map((m) => doc.elements[m]).find((m) => m?.data?.[MERMAID_KEY]);
  return holder ? { members, source: holder.data![MERMAID_KEY], outer } : null;
}

/** The selected Mermaid group, if the selection is (part of) one. */
export function selectedMermaidGroup() {
  const s = useEditor.getState();
  return s.selection.length ? mermaidGroupOf(s.doc, s.selection[0]) : null;
}

/** Re-imports `source` and swaps it in for the group, keeping its top-left corner. One undo step. */
export async function regenerateMermaid(anchorId: string, source: string): Promise<void> {
  const { importer } = await import('@/io/import/mermaid');
  const res = await importer.run(source);
  const page = res.pages[0];
  if (!page?.doc.order.length) throw new Error(t('automation.mermaid.noShapes'));
  const s = useEditor.getState();
  const group = mermaidGroupOf(s.doc, anchorId);
  if (!group) throw new Error(t('automation.mermaid.gone'));
  const old = selectionBounds(s.doc, group.members);
  const fresh = page.doc.order.map((id) => page.doc.elements[id]);
  const b = selectionBounds(page.doc, page.doc.order);
  const offset = old && b ? { x: old.x - b.x, y: old.y - b.y } : { x: 0, y: 0 };
  // Keep the replacement on the same layer as the original.
  const layerId = s.doc.elements[group.members[0]]?.layerId;
  const clones = withMermaidSource('mermaid', source, cloneElements(fresh, offset)).map((e) => (layerId ? { ...e, layerId } : e));
  s.beginInteraction();
  useEditor.getState().deleteElements(group.members, true);
  useEditor.getState().addElements(clones);
  useEditor.getState().endInteraction();
}
