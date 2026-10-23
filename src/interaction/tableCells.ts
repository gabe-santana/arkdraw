/**
 * Table cell selection and editing on the canvas, plus the commands the
 * menus / Format panel run on the current cell (insert above/below/left/
 * right, delete row/column, merge, per-cell style).
 */
import type { ShapeElement, TableCellStyle } from '@/model/types';
import { isShape } from '@/model/types';
import { rotatePoint } from '@/lib/geometry';
import { useEditor } from '@/store/editor';
import { cellAt, cellsInRange, mergeAt, setCellText, styleCells, tablePatch, type TableOp } from './table';
import { useInteraction, type CellRange } from './store';

/** The single selected table shape, if any. */
export function selectedTable(): ShapeElement | null {
  const s = useEditor.getState();
  const el = s.selection.length === 1 ? s.doc.elements[s.selection[0]] : undefined;
  return isShape(el) && el.table ? el : null;
}

/** The selected cell range when it belongs to the selected table. */
export function currentCell(): CellRange | null {
  const t = selectedTable();
  const cell = useInteraction.getState().cell;
  return t && cell && cell.id === t.id ? cell : null;
}

/** Cell of a table under a world point. */
export function cellAtWorld(el: ShapeElement, p: { x: number; y: number }) {
  if (!el.table) return null;
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const local = rotatePoint(p, c, -(el.rotation ?? 0));
  return cellAt(el.table, el.w, el.h, { x: local.x - el.x, y: local.y - el.y });
}

export function selectCell(id: string, r: number, c: number, extend = false) {
  const cur = useInteraction.getState().cell;
  if (extend && cur && cur.id === id) useInteraction.getState().set({ cell: { ...cur, r2: r, c2: c } });
  else useInteraction.getState().set({ cell: { id, r, c, r2: r, c2: c } });
}

export function startCellEdit(id: string, r: number, c: number) {
  const el = useEditor.getState().doc.elements[id];
  if (!isShape(el) || !el.table || el.locked || el.behavior?.editable === false) return;
  const m = mergeAt(el.table, r, c);
  const at = m ? { r: m.r, c: m.c } : { r, c };
  useInteraction.getState().set({ cell: { id, ...at, r2: at.r, c2: at.c }, editingCell: { id, ...at } });
}

export function commitCellText(id: string, r: number, c: number, text: string) {
  const s = useEditor.getState();
  const el = s.doc.elements[id];
  if (!isShape(el) || !el.table || el.table.cells[r]?.[c] === text) return;
  s.updateElements({ [id]: { table: setCellText(el.table, r, c, text) } });
}

/** Runs a structural edit relative to the current cell (or at the table's end). */
export function runTableOp(kind: 'rowAbove' | 'rowBelow' | 'colLeft' | 'colRight' | 'delRow' | 'delCol' | 'merge' | 'unmerge') {
  const el = selectedTable();
  if (!el?.table) return;
  const cell = currentCell();
  const t = el.table;
  const r = cell ? Math.min(cell.r, cell.r2) : t.rows.length - 1;
  const r2 = cell ? Math.max(cell.r, cell.r2) : r;
  const c = cell ? Math.min(cell.c, cell.c2) : t.cols.length - 1;
  const c2 = cell ? Math.max(cell.c, cell.c2) : c;
  const m = cell ? mergeAt(t, r, c) : null;
  const ops: Record<typeof kind, TableOp> = {
    rowAbove: { op: 'insertRow', at: r },
    rowBelow: { op: 'insertRow', at: Math.max(r2, m ? m.r + m.rs - 1 : r2) + 1 },
    colLeft: { op: 'insertCol', at: c },
    colRight: { op: 'insertCol', at: Math.max(c2, m ? m.c + m.cs - 1 : c2) + 1 },
    delRow: { op: 'deleteRow', at: r },
    delCol: { op: 'deleteCol', at: c },
    merge: { op: 'merge', r1: r, c1: c, r2, c2 },
    unmerge: { op: 'unmerge', r, c },
  };
  const patch = tablePatch(el, ops[kind]);
  if (!patch) return;
  useEditor.getState().updateElements({ [el.id]: patch });
  // Keep a sensible cell selected after the edit.
  const nt = patch.table!;
  const clampR = (v: number) => Math.max(0, Math.min(nt.rows.length - 1, v));
  const clampC = (v: number) => Math.max(0, Math.min(nt.cols.length - 1, v));
  const below = (ops.rowBelow as { at: number }).at;
  const right = (ops.colRight as { at: number }).at;
  const next = kind === 'rowBelow' ? { r: clampR(below), c } : kind === 'colRight' ? { r, c: clampC(right) } : { r: clampR(r), c: clampC(c) };
  useInteraction.getState().set({ cell: { id: el.id, r: next.r, c: next.c, r2: next.r, c2: next.c } });
}

/** Cells the style commands target: the selected range, or every cell. */
function targetCells(el: ShapeElement): Array<[number, number]> {
  const t = el.table!;
  const cell = currentCell();
  if (cell) return cellsInRange(t, cell.r, cell.c, cell.r2, cell.c2);
  return cellsInRange(t, 0, 0, t.rows.length - 1, t.cols.length - 1);
}

export function styleSelectedCells(patch: Partial<TableCellStyle>) {
  const el = selectedTable();
  if (!el?.table) return;
  useEditor.getState().updateElements({ [el.id]: { table: styleCells(el.table, targetCells(el), patch) } });
}

/** Common style value across the targeted cells (null when mixed). */
export function cellStyleValue<K extends keyof TableCellStyle>(el: ShapeElement, key: K): TableCellStyle[K] | null | undefined {
  const vals = targetCells(el).map(([r, c]) => el.table!.cellStyles?.[`${r},${c}`]?.[key]);
  return vals.every((v) => v === vals[0]) ? vals[0] : null;
}

/** Clears the text of the selected cells (Delete with a cell selected). */
export function clearSelectedCells(): boolean {
  const el = selectedTable();
  const cell = currentCell();
  if (!el?.table || !cell) return false;
  let t = el.table;
  for (const [r, c] of cellsInRange(t, cell.r, cell.c, cell.r2, cell.c2)) t = setCellText(t, r, c, '');
  if (t !== el.table) useEditor.getState().updateElements({ [el.id]: { table: t } });
  return true;
}

export const hasTable = () => !!selectedTable();
export const hasCellRange = () => {
  const c = currentCell();
  return !!c && (c.r !== c.r2 || c.c !== c.c2);
};
export const inMergedCell = () => {
  const el = selectedTable();
  const c = currentCell();
  return !!el?.table && !!c && !!mergeAt(el.table, c.r, c.c);
};
