/**
 * Table model operations: cell geometry, row/column insertion and deletion at
 * any position, merged cells and per-cell styles. Everything here is pure —
 * it maps a `TableData` (+ the shape's size) to a new one — so the canvas,
 * the Format panel and the tests share one implementation.
 */
import type { Rect, ShapeElement, TableCellStyle, TableData, TableMerge, Vec } from '@/model/types';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const cellKey = (r: number, c: number) => `${r},${c}`;

/** Cumulative edges (0 … w) of the columns scaled to the shape width. */
export function colEdges(t: TableData, w: number): number[] {
  const k = w / (sum(t.cols) || 1);
  const xs = [0];
  for (const c of t.cols) xs.push(xs[xs.length - 1] + c * k);
  return xs;
}

export function rowEdges(t: TableData, h: number): number[] {
  const k = h / (sum(t.rows) || 1);
  const ys = [0];
  for (const r of t.rows) ys.push(ys[ys.length - 1] + r * k);
  return ys;
}

/** The merge covering a cell, if any. */
export function mergeAt(t: TableData, r: number, c: number): TableMerge | null {
  return t.merges?.find((m) => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs) ?? null;
}

/** True when the cell is hidden under another cell's merge. */
export const isCovered = (t: TableData, r: number, c: number) => {
  const m = mergeAt(t, r, c);
  return !!m && (m.r !== r || m.c !== c);
};

/** Local rect of a cell (spanning its merge). */
export function cellRect(t: TableData, w: number, h: number, r: number, c: number): Rect {
  const xs = colEdges(t, w);
  const ys = rowEdges(t, h);
  const m = mergeAt(t, r, c);
  const r0 = m ? m.r : r;
  const c0 = m ? m.c : c;
  const r1 = m ? m.r + m.rs : r + 1;
  const c1 = m ? m.c + m.cs : c + 1;
  return { x: xs[c0], y: ys[r0], w: xs[c1] - xs[c0], h: ys[r1] - ys[r0] };
}

/** Cell under a local point (merged cells resolve to their top-left anchor). */
export function cellAt(t: TableData, w: number, h: number, p: Vec): { r: number; c: number } | null {
  if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return null;
  const xs = colEdges(t, w);
  const ys = rowEdges(t, h);
  let c = xs.findIndex((x, i) => i > 0 && p.x <= x) - 1;
  let r = ys.findIndex((y, i) => i > 0 && p.y <= y) - 1;
  if (c < 0) c = t.cols.length - 1;
  if (r < 0) r = t.rows.length - 1;
  const m = mergeAt(t, r, c);
  return m ? { r: m.r, c: m.c } : { r, c };
}

/** Normalized rectangle of a cell range, grown to include any merges it touches. */
export function rangeBounds(t: TableData, r1: number, c1: number, r2: number, c2: number) {
  let top = Math.min(r1, r2), bottom = Math.max(r1, r2), left = Math.min(c1, c2), right = Math.max(c1, c2);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of t.merges ?? []) {
      const overlaps = m.r <= bottom && m.r + m.rs - 1 >= top && m.c <= right && m.c + m.cs - 1 >= left;
      if (!overlaps) continue;
      const nt = Math.min(top, m.r), nb = Math.max(bottom, m.r + m.rs - 1), nl = Math.min(left, m.c), nr = Math.max(right, m.c + m.cs - 1);
      if (nt !== top || nb !== bottom || nl !== left || nr !== right) {
        [top, bottom, left, right] = [nt, nb, nl, nr];
        grew = true;
      }
    }
  }
  return { top, bottom, left, right };
}

// ---------------------------------------------------------------------------
// Structural edits
// ---------------------------------------------------------------------------

function remapStyles(styles: TableData['cellStyles'], map: (r: number, c: number) => [number, number] | null) {
  if (!styles) return undefined;
  const out: Record<string, TableCellStyle> = {};
  for (const [k, v] of Object.entries(styles)) {
    const [r, c] = k.split(',').map(Number);
    const to = map(r, c);
    if (to) out[cellKey(to[0], to[1])] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const tidy = (t: TableData): TableData => {
  const next = { ...t };
  if (!next.merges?.length) delete next.merges;
  if (!next.cellStyles || !Object.keys(next.cellStyles).length) delete next.cellStyles;
  return next;
};

/** Inserts a row so it becomes row `at` (0 … rows.length). */
export function insertRow(t: TableData, at: number, size?: number): TableData {
  at = Math.max(0, Math.min(t.rows.length, at));
  const ref = t.rows[Math.min(at, t.rows.length - 1)] ?? 34;
  const rows = [...t.rows.slice(0, at), size ?? ref, ...t.rows.slice(at)];
  const cells = [...t.cells.slice(0, at), Array(t.cols.length).fill(''), ...t.cells.slice(at)];
  const merges = t.merges?.map((m) => (m.r >= at ? { ...m, r: m.r + 1 } : m.r + m.rs > at ? { ...m, rs: m.rs + 1 } : m));
  const cellStyles = remapStyles(t.cellStyles, (r, c) => [r >= at ? r + 1 : r, c]);
  return tidy({ ...t, rows, cells, merges, cellStyles });
}

/** Inserts a column so it becomes column `at` (0 … cols.length). */
export function insertCol(t: TableData, at: number, size?: number): TableData {
  at = Math.max(0, Math.min(t.cols.length, at));
  const ref = t.cols[Math.min(at, t.cols.length - 1)] ?? 110;
  const cols = [...t.cols.slice(0, at), size ?? ref, ...t.cols.slice(at)];
  const cells = t.cells.map((row) => [...row.slice(0, at), '', ...row.slice(at)]);
  const merges = t.merges?.map((m) => (m.c >= at ? { ...m, c: m.c + 1 } : m.c + m.cs > at ? { ...m, cs: m.cs + 1 } : m));
  const cellStyles = remapStyles(t.cellStyles, (r, c) => [r, c >= at ? c + 1 : c]);
  return tidy({ ...t, cols, cells, merges, cellStyles });
}

export function deleteRow(t: TableData, at: number): TableData {
  if (t.rows.length < 2 || at < 0 || at >= t.rows.length) return t;
  const rows = t.rows.filter((_, i) => i !== at);
  const cells = t.cells.filter((_, i) => i !== at);
  const merges = (t.merges ?? [])
    .map((m) => (m.r > at ? { ...m, r: m.r - 1 } : m.r + m.rs > at ? { ...m, rs: m.rs - 1 } : m))
    .filter((m) => m.rs > 0 && m.rs * m.cs > 1);
  const cellStyles = remapStyles(t.cellStyles, (r, c) => (r === at ? null : [r > at ? r - 1 : r, c]));
  return tidy({ ...t, rows, cells, merges, cellStyles });
}

export function deleteCol(t: TableData, at: number): TableData {
  if (t.cols.length < 2 || at < 0 || at >= t.cols.length) return t;
  const cols = t.cols.filter((_, i) => i !== at);
  const cells = t.cells.map((row) => row.filter((_, i) => i !== at));
  const merges = (t.merges ?? [])
    .map((m) => (m.c > at ? { ...m, c: m.c - 1 } : m.c + m.cs > at ? { ...m, cs: m.cs - 1 } : m))
    .filter((m) => m.cs > 0 && m.rs * m.cs > 1);
  const cellStyles = remapStyles(t.cellStyles, (r, c) => (c === at ? null : [r, c > at ? c - 1 : c]));
  return tidy({ ...t, cols, cells, merges, cellStyles });
}

/** Merges a range into one cell; the texts are joined into the top-left cell. */
export function mergeCells(t: TableData, r1: number, c1: number, r2: number, c2: number): TableData {
  const { top, bottom, left, right } = rangeBounds(t, r1, c1, r2, c2);
  if (top === bottom && left === right) return t;
  const cells = t.cells.map((row) => row.slice());
  const texts: string[] = [];
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (cells[r][c]) texts.push(cells[r][c]);
      cells[r][c] = '';
    }
  }
  cells[top][left] = texts.join('\n');
  const inside = (m: TableMerge) => m.r >= top && m.r + m.rs - 1 <= bottom && m.c >= left && m.c + m.cs - 1 <= right;
  const merges = [...(t.merges ?? []).filter((m) => !inside(m)), { r: top, c: left, rs: bottom - top + 1, cs: right - left + 1 }];
  return tidy({ ...t, cells, merges });
}

export function unmergeCell(t: TableData, r: number, c: number): TableData {
  const m = mergeAt(t, r, c);
  if (!m) return t;
  return tidy({ ...t, merges: t.merges!.filter((x) => x !== m) });
}

export function setCellText(t: TableData, r: number, c: number, text: string): TableData {
  const cells = t.cells.map((row) => row.slice());
  if (!cells[r]) return t;
  cells[r][c] = text;
  return { ...t, cells };
}

/** Applies a style patch to cells; `undefined` values clear a property. */
export function styleCells(t: TableData, targets: Array<[number, number]>, patch: Partial<TableCellStyle>): TableData {
  const cellStyles = { ...t.cellStyles };
  for (const [r, c] of targets) {
    const next: TableCellStyle = { ...cellStyles[cellKey(r, c)], ...patch };
    for (const k of Object.keys(next) as Array<keyof TableCellStyle>) if (next[k] === undefined) delete next[k];
    if (Object.keys(next).length) cellStyles[cellKey(r, c)] = next;
    else delete cellStyles[cellKey(r, c)];
  }
  return tidy({ ...t, cellStyles });
}

/** Anchor cells (merges resolved, covered cells skipped) inside a range. */
export function cellsInRange(t: TableData, r1: number, c1: number, r2: number, c2: number): Array<[number, number]> {
  const { top, bottom, left, right } = rangeBounds(t, r1, c1, r2, c2);
  const out: Array<[number, number]> = [];
  for (let r = top; r <= bottom; r++) for (let c = left; c <= right; c++) if (!isCovered(t, r, c)) out.push([r, c]);
  return out;
}

// ---------------------------------------------------------------------------
// Element-level ops (keep the shape's pixel scale while it grows / shrinks)
// ---------------------------------------------------------------------------

export type TableOp =
  | { op: 'insertRow'; at: number }
  | { op: 'insertCol'; at: number }
  | { op: 'deleteRow'; at: number }
  | { op: 'deleteCol'; at: number }
  | { op: 'merge'; r1: number; c1: number; r2: number; c2: number }
  | { op: 'unmerge'; r: number; c: number };

/** Patch for a table shape after a structural edit; the size changes by the added/removed track. */
export function tablePatch(el: ShapeElement, o: TableOp): Partial<ShapeElement> | null {
  const t = el.table;
  if (!t) return null;
  const sx = el.w / (sum(t.cols) || 1);
  const sy = el.h / (sum(t.rows) || 1);
  let next: TableData;
  switch (o.op) {
    case 'insertRow':
      next = insertRow(t, o.at);
      break;
    case 'insertCol':
      next = insertCol(t, o.at);
      break;
    case 'deleteRow':
      next = deleteRow(t, o.at);
      break;
    case 'deleteCol':
      next = deleteCol(t, o.at);
      break;
    case 'merge':
      next = mergeCells(t, o.r1, o.c1, o.r2, o.c2);
      break;
    case 'unmerge':
      next = unmergeCell(t, o.r, o.c);
      break;
  }
  if (next === t) return null;
  return { table: next, w: Math.round(sum(next.cols) * sx), h: Math.round(sum(next.rows) * sy) };
}
