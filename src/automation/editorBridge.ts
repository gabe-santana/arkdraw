/**
 * Editor-side glue for automation features: one-step document commits, the
 * transient highlight overlay, and the editor's `ActionHost` for custom link
 * actions (`data:action/json,…`).
 */
import { create } from 'zustand';
import type { Doc, Rect } from '@/model/types';
import { elementBounds, useEditor } from '@/store/editor';
import { unionRects } from '@/lib/geometry';
import { runActionLink, type ActionHost } from './linkActions';

/** Replaces the live doc as a single undo step. */
export function commitDoc(doc: Doc) {
  const s = useEditor.getState();
  if (doc === s.doc) return;
  s.beginInteraction();
  useEditor.getState().setDoc(doc);
  useEditor.getState().endInteraction();
}

// ---------------------------------------------------------------------------
// Highlights (drawn by <HighlightOverlay /> in AutomationHost)
// ---------------------------------------------------------------------------

export interface Highlight {
  key: number;
  rects: Rect[];
  color: string;
}

interface HighlightState {
  items: Highlight[];
  /** Element ids emphasised by Explore mode (others are dimmed). */
  explore: { focus: string; ids: string[] } | null;
}

export const useHighlights = create<HighlightState>(() => ({ items: [], explore: null }));

let seq = 0;
export function highlightElements(ids: string[], color = '#f59e0b', duration = 1500) {
  const { doc } = useEditor.getState();
  const rects = ids.map((id) => doc.elements[id]).filter(Boolean).map((el) => elementBounds(el, doc));
  if (!rects.length) return;
  const item: Highlight = { key: ++seq, rects, color };
  useHighlights.setState((s) => ({ items: [...s.items, item] }));
  window.setTimeout(() => useHighlights.setState((s) => ({ items: s.items.filter((i) => i.key !== item.key) })), Math.max(200, duration));
}

/** Centres the camera on elements without changing the zoom (zooms out if they don't fit). */
export function scrollToElements(ids: string[]) {
  const s = useEditor.getState();
  const b = unionRects(ids.map((id) => s.doc.elements[id]).filter(Boolean).map((el) => elementBounds(el, s.doc)));
  if (!b) return;
  const { viewport, camera } = s;
  if (b.w * camera.z > viewport.w * 0.9 || b.h * camera.z > viewport.h * 0.9) return s.zoomToFit(ids);
  s.animateCamera({ x: viewport.w / 2 - (b.x + b.w / 2) * camera.z, y: viewport.h / 2 - (b.y + b.h / 2) * camera.z, z: camera.z });
}

const editorHost = (open: (link: string) => void): ActionHost => ({
  getDoc: () => useEditor.getState().doc,
  setDoc: commitDoc,
  select: (ids) => useEditor.getState().select(ids),
  highlight: highlightElements,
  scrollTo: scrollToElements,
  open,
});

/** Runs a custom link action in the editor. `open` follows plain links. Returns false if it isn't one. */
export function runEditorActionLink(link: string, open: (link: string) => void): boolean {
  return runActionLink(link, editorHost(open));
}
