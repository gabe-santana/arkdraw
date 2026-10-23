/**
 * Keyboard navigation & accessibility for the canvas.
 *
 * - Tab / Shift+Tab: next / previous element in reading order (rows top to
 *   bottom, left to right; groups move as one unit). With a shape you clicked
 *   selected, Tab keeps its mind-map role (add child node); once you are
 *   traversing (started with Tab on an empty selection, or with Shift+Tab),
 *   Tab keeps moving. Past the last element focus leaves the canvas.
 * - Alt+Arrow: jump to the connected shape in that direction.
 * - Shift+F10 / ContextMenu key: open the context menu for the selection.
 * - Esc: leaves point editing, then the cell selection, then an entered group.
 */
import type { Doc, Rect, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { center } from '@/lib/geometry';
import { elementBounds, isHidden, isLocked, selectionBounds, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { getShapeDef } from '@/shapes/registry';
import { canPick, exitGroup, pickMembers } from './groups';
import { deleteActivePoint, stopEditPoints } from './pointEdit';
import { t } from '@/i18n';
import { clearSelectedCells, currentCell, selectedTable, startCellEdit } from './tableCells';
import { useInteraction } from './store';

// ---------------------------------------------------------------------------
// Reading order
// ---------------------------------------------------------------------------

/** Selection units (a group at the current level counts once) in reading order. */
export function traversalUnits(doc: Doc): string[][] {
  const seen = new Set<string>();
  const units: Array<{ ids: string[]; b: Rect; conn: boolean }> = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (!el || seen.has(id) || isHidden(doc, el) || isLocked(doc, el) || !canPick(doc, id)) continue;
    const ids = pickMembers(doc, id);
    ids.forEach((m) => seen.add(m));
    const b = selectionBounds(doc, ids);
    if (b) units.push({ ids, b, conn: ids.every((m) => isConnector(doc.elements[m])) });
  }
  const shapes = units.filter((u) => !u.conn).sort((a, b) => a.b.y + a.b.h / 2 - (b.b.y + b.b.h / 2));
  // Bucket into rows: a unit joins the current row when its center lies within the row's first unit.
  const rows: Array<typeof shapes> = [];
  for (const u of shapes) {
    const row = rows[rows.length - 1];
    const cy = u.b.y + u.b.h / 2;
    if (row && cy >= row[0].b.y && cy <= row[0].b.y + row[0].b.h) row.push(u);
    else rows.push([u]);
  }
  const ordered = rows.flatMap((row) => row.sort((a, b) => a.b.x - b.b.x));
  return [...ordered, ...units.filter((u) => u.conn)].map((u) => u.ids);
}

let navSelecting = false;
/** Selects as part of keyboard navigation (keeps Tab in traversal mode). */
function navSelect(ids: string[]) {
  navSelecting = true;
  try {
    useEditor.getState().select(ids);
  } finally {
    navSelecting = false;
  }
  useInteraction.getState().set({ traversing: true });
}

/** Moves the selection one unit forward/back; returns false past either end. */
export function traverse(dir: 1 | -1): boolean {
  const s = useEditor.getState();
  const units = traversalUnits(s.doc);
  if (!units.length) return false;
  const sel = new Set(s.selection);
  const at = units.findIndex((u) => u.some((id) => sel.has(id)));
  const next = at < 0 ? (dir > 0 ? 0 : units.length - 1) : at + dir;
  if (next < 0 || next >= units.length) {
    s.clearSelection();
    useInteraction.getState().set({ traversing: false });
    return false;
  }
  navSelect(units[next]);
  revealSelection();
  return true;
}

/** Shapes connected to `id`, keyed by connector. */
function neighbours(doc: Doc, id: string): string[] {
  const out = new Set<string>();
  for (const cid of doc.order) {
    const c = doc.elements[cid];
    if (!isConnector(c)) continue;
    if (c.source.elementId === id && c.target.elementId) out.add(c.target.elementId);
    if (c.target.elementId === id && c.source.elementId) out.add(c.source.elementId);
  }
  out.delete(id);
  return [...out];
}

/** The connected shape best matching a direction (within ±75°), nearest first. */
export function connectedInDirection(doc: Doc, id: string, dir: Vec): string | null {
  const el = doc.elements[id];
  if (!isShape(el)) return null;
  const c0 = center(el);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const nid of neighbours(doc, id)) {
    const n = doc.elements[nid];
    if (!isShape(n) || isHidden(doc, n) || !canPick(doc, nid)) continue;
    const c = center(n);
    const v = { x: c.x - c0.x, y: c.y - c0.y };
    const d = Math.hypot(v.x, v.y) || 1;
    const cos = (v.x * dir.x + v.y * dir.y) / d;
    if (cos < Math.cos((75 * Math.PI) / 180)) continue;
    const score = d * (2 - cos);
    if (score < bestScore) {
      bestScore = score;
      best = nid;
    }
  }
  return best;
}

/** Pans so the selection is on screen (keyboard moves can leave the viewport). */
export function revealSelection() {
  const s = useEditor.getState();
  const b = selectionBounds(s.doc, s.selection);
  if (!b) return;
  const { camera: cam, viewport: v } = s;
  const pad = 80;
  const x1 = b.x * cam.z + cam.x;
  const y1 = b.y * cam.z + cam.y;
  const x2 = (b.x + b.w) * cam.z + cam.x;
  const y2 = (b.y + b.h) * cam.z + cam.y;
  let dx = 0;
  let dy = 0;
  if (x1 < pad) dx = pad - x1;
  else if (x2 > v.w - pad) dx = v.w - pad - x2;
  if (y1 < pad) dy = pad - y1;
  else if (y2 > v.h - pad) dy = v.h - pad - y2;
  if (dx || dy) s.animateCamera({ ...cam, x: cam.x + dx, y: cam.y + dy });
}

/** Opens the context menu at the selection (or the canvas center). */
export function openContextMenuForSelection() {
  const canvas = document.querySelector('[data-canvas]');
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const s = useEditor.getState();
  const b = selectionBounds(s.doc, s.selection);
  const { camera: cam } = s;
  const x = b ? r.left + (b.x + b.w / 2) * cam.z + cam.x : r.left + r.width / 2;
  const y = b ? r.top + (b.y + b.h) * cam.z + cam.y + 6 : r.top + r.height / 2;
  useUi.getState().set({ contextMenu: { x: Math.min(Math.max(x, r.left + 8), r.right - 8), y: Math.min(Math.max(y, r.top + 8), r.bottom - 8) } });
}

/** Spoken description of an element (ARIA labels and the live region). */
export function describeElement(doc: Doc, id: string): string {
  const el = doc.elements[id];
  if (!el) return '';
  const text = (el.name || el.text || '').split('\n')[0].trim();
  if (isShape(el)) {
    const kind = el.kind === 'icon' ? t('canvas.aria.icon') : getShapeDef(el.kind).label;
    return text ? t('canvas.aria.labeled', { kind, text }) : kind;
  }
  const end = (eid?: string) => {
    const e = eid ? doc.elements[eid] : undefined;
    return e ? (e.name || e.text || (isShape(e) ? getShapeDef(e.kind).label : '')).split('\n')[0] : t('canvas.aria.nothing');
  };
  const from = end(el.source.elementId);
  const to = end(el.target.elementId);
  return text ? t('canvas.aria.connectorNamedFromTo', { text, from, to }) : t('canvas.aria.connectorFromTo', { from, to });
}

/** Live-region text for the current selection. */
export function describeSelection(doc: Doc, selection: string[]): string {
  if (!selection.length) return t('canvas.aria.nothingSelected');
  if (selection.length === 1) return t('canvas.aria.selectedOne', { description: describeElement(doc, selection[0]) });
  return t('canvas.aria.selectedMany', { count: selection.length });
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

const isTyping = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]');

/** Focus is on the canvas or nowhere in particular (keys belong to the diagram). */
const canvasKeys = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !el || el === document.body || !!el.closest?.('[data-canvas]');
};

const modalOpen = () => {
  const ui = useUi.getState();
  return ui.paletteOpen || ui.exportOpen || !!ui.confirm || ui.shortcutsOpen || ui.aiSettingsOpen || !!ui.editDataId || ui.editStyleOpen || ui.editDiagramOpen || ui.importOpen || ui.templatesOpen || !!ui.shapePicker || !!ui.contextMenu;
};

const ARROWS: Record<string, Vec> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };

function handleKey(e: KeyboardEvent): boolean {
  const s = useEditor.getState();
  const st = useInteraction.getState();
  if (s.editingId || st.editingCell || isTyping(e.target) || modalOpen()) return false;
  if (!canvasKeys(e.target)) return false;
  const plain = !e.ctrlKey && !e.metaKey && !e.altKey;

  // --- point editing
  if (st.editPointsId) {
    if (e.key === 'Escape') return stopEditPoints(), true;
    if ((e.key === 'Delete' || e.key === 'Backspace') && plain) return deleteActivePoint() || true;
  }

  // --- table cells
  const cell = currentCell();
  if (cell) {
    if (e.key === 'Escape') return st.set({ cell: null }), true;
    if ((e.key === 'Delete' || e.key === 'Backspace') && plain) return clearSelectedCells();
    if ((e.key === 'Enter' || e.key === 'F2') && plain && !e.shiftKey) return startCellEdit(cell.id, cell.r, cell.c), true;
    if (plain && [...e.key].length === 1 && e.key !== ' ' && !e.isComposing) {
      seedCellEditor(e.key);
      startCellEdit(cell.id, cell.r, cell.c);
      return true;
    }
    if (e.key in ARROWS && plain && !e.shiftKey) {
      const el = s.doc.elements[cell.id];
      if (isShape(el) && el.table) {
        const d = ARROWS[e.key];
        const r = Math.max(0, Math.min(el.table.rows.length - 1, cell.r + d.y));
        const c = Math.max(0, Math.min(el.table.cols.length - 1, cell.c + d.x));
        st.set({ cell: { id: cell.id, r, c, r2: r, c2: c } });
        return true;
      }
    }
  }

  // A selected table types into its cells, never into its (hidden) label.
  const table = selectedTable();
  if (table && !cell && plain && (e.key === 'Enter' || e.key === 'F2' || ([...e.key].length === 1 && e.key !== ' ' && !e.isComposing))) {
    if ([...e.key].length === 1) seedCellEditor(e.key);
    startCellEdit(table.id, 0, 0);
    return true;
  }

  // --- context menu
  if ((e.key === 'F10' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) || (e.key === 'ContextMenu' && plain)) {
    openContextMenuForSelection();
    return true;
  }

  // --- Tab traversal (Tab with a clicked shape selected stays "add child node")
  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const single = s.selection.length === 1 && isShape(s.doc.elements[s.selection[0]]);
    if (!e.shiftKey && single && !st.traversing) return false;
    return traverse(e.shiftKey ? -1 : 1);
  }

  // --- Alt+Arrow: follow connections
  if (e.key in ARROWS && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && s.selection.length) {
    const from = s.selection.find((id) => isShape(s.doc.elements[id]));
    if (!from) return false;
    const next = connectedInDirection(s.doc, from, ARROWS[e.key]);
    if (next) {
      navSelect(pickMembers(s.doc, next));
      revealSelection();
    }
    return true;
  }

  // --- leaving an entered group
  if (e.key === 'Escape' && !s.selection.length && st.isolation.length) return exitGroup(), true;
  return false;
}

let cellSeed: string | null = null;
export const seedCellEditor = (text: string) => {
  cellSeed = text;
};
export const takeCellSeed = () => {
  const v = cellSeed;
  cellSeed = null;
  return v;
};

/** Installs the canvas keyboard layer (capture phase, ahead of the global shortcuts). */
export function installKeyboardNavigation(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (handleKey(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  window.addEventListener('keydown', onKey, true);
  // Any selection change not made by keyboard navigation ends "traversing" (Tab adds child nodes again).
  let last = useEditor.getState().selection;
  const unsub = useEditor.subscribe((s) => {
    if (s.selection === last) return;
    last = s.selection;
    if (!navSelecting && useInteraction.getState().traversing) useInteraction.getState().set({ traversing: false });
  });
  return () => {
    window.removeEventListener('keydown', onKey, true);
    unsub();
  };
}

/** Bounds of an element on screen (for focus rings / announcements). */
export function screenRectOf(doc: Doc, id: string): Rect | null {
  const el = doc.elements[id];
  if (!el) return null;
  const { camera: c } = useEditor.getState();
  const b = elementBounds(el, doc);
  return { x: b.x * c.z + c.x, y: b.y * c.z + c.y, w: b.w * c.z, h: b.h * c.z };
}
