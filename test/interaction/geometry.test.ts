import { describe, expect, it } from 'vitest';
import { buildStroke, freehandGeometry, hasPressure, pressureOutline, simplify, smoothPath, type StrokePoint } from '@/interaction/freehandPath';
import { cellAt, cellRect, cellsInRange, deleteCol, deleteRow, insertCol, insertRow, mergeAt, mergeCells, styleCells, tablePatch, unmergeCell } from '@/interaction/table';
import type { TableData } from '@/model/types';
import { createShape } from '@/model/defaults';

describe('freehand smoothing', () => {
  it('simplify keeps endpoints and drops near-collinear points', () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: (i % 2) * 0.2 }));
    const out = simplify(line, 1);
    expect(out[0]).toBe(line[0]);
    expect(out[out.length - 1]).toBe(line[line.length - 1]);
    expect(out.length).toBe(2);
    const corner = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }];
    expect(simplify(corner, 1)).toHaveLength(3);
  });

  it('smoothPath fits cubic Béziers through the points', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(d.endsWith('20,0')).toBe(true);
  });

  it('buildStroke normalizes into the bounding box and only keeps varying pressure', () => {
    const raw: StrokePoint[] = Array.from({ length: 30 }, (_, i) => ({ x: 100 + i * 4, y: 50 + Math.sin(i / 3) * 20, p: 0.2 + i / 50 }));
    const s = buildStroke(raw, 0.5, true)!;
    expect(s.x).toBe(100);
    for (const q of s.points) {
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.x).toBeLessThanOrEqual(1);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeLessThanOrEqual(1);
    }
    expect(hasPressure(s.points)).toBe(true);
    expect(s.points.length).toBeLessThan(raw.length);
    // Constant (mouse) pressure: no pressure data.
    const flat = buildStroke(raw.map((q) => ({ ...q, p: 0.5 })), 0.5, true)!;
    expect(flat.points.every((q) => q.p === undefined)).toBe(true);
    // Brush with pressure turned off.
    expect(buildStroke(raw, 0.5, false)!.points.every((q) => q.p === undefined)).toBe(true);
  });

  it('more smoothing keeps fewer points', () => {
    const raw = Array.from({ length: 60 }, (_, i) => ({ x: i * 3, y: Math.sin(i / 2) * 6 + (i % 3) }));
    expect(buildStroke(raw, 1, false)!.points.length).toBeLessThan(buildStroke(raw, 0, false)!.points.length);
  });

  it('pressure strokes render as a closed variable-width outline', () => {
    const d = pressureOutline([{ x: 0, y: 0, p: 0.2 }, { x: 50, y: 10, p: 0.9 }, { x: 100, y: 0, p: 0.4 }], 4);
    expect(d.startsWith('M')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
    const g = freehandGeometry([{ x: 0, y: 0 }, { x: 1, y: 1 }], 100, 50, 2)!;
    expect(g.outline).toBeNull();
    expect(g.path).toContain('L100,50');
  });
});

const table = (): TableData => ({
  cols: [100, 100, 100],
  rows: [30, 30, 30],
  cells: [
    ['a', 'b', 'c'],
    ['d', 'e', 'f'],
    ['g', 'h', 'i'],
  ],
  header: true,
});

describe('table model', () => {
  it('inserts rows and columns at any position, shifting cell styles', () => {
    let t = styleCells(table(), [[1, 1]], { fill: '#ff0000' });
    t = insertRow(t, 1);
    expect(t.cells.map((r) => r[0])).toEqual(['a', '', 'd', 'g']);
    expect(t.cellStyles).toEqual({ '2,1': { fill: '#ff0000' } });
    t = insertCol(t, 0);
    expect(t.cells[0]).toEqual(['', 'a', 'b', 'c']);
    expect(t.cellStyles).toEqual({ '2,2': { fill: '#ff0000' } });
    expect(t.cols).toHaveLength(4);
  });

  it('deletes a specific row / column', () => {
    expect(deleteRow(table(), 1).cells).toEqual([['a', 'b', 'c'], ['g', 'h', 'i']]);
    expect(deleteCol(table(), 0).cells[0]).toEqual(['b', 'c']);
    const one: TableData = { cols: [10], rows: [10], cells: [['x']] };
    expect(deleteRow(one, 0)).toBe(one);
  });

  it('merges cells (joining text), resolves hits to the anchor and unmerges', () => {
    let t = mergeCells(table(), 0, 0, 1, 1);
    expect(t.merges).toEqual([{ r: 0, c: 0, rs: 2, cs: 2 }]);
    expect(t.cells[0][0]).toBe('a\nb\nd\ne');
    expect(t.cells[1][1]).toBe('');
    expect(cellAt(t, 300, 90, { x: 150, y: 40 })).toEqual({ r: 0, c: 0 });
    expect(cellRect(t, 300, 90, 1, 1)).toEqual({ x: 0, y: 0, w: 200, h: 60 });
    expect(cellsInRange(t, 0, 0, 2, 2)).toHaveLength(6);
    // Inserting inside a merge grows it; deleting a spanned row shrinks it.
    expect(insertRow(t, 1).merges).toEqual([{ r: 0, c: 0, rs: 3, cs: 2 }]);
    expect(deleteRow(t, 1).merges).toEqual([{ r: 0, c: 0, rs: 1, cs: 2 }]);
    t = unmergeCell(t, 1, 1);
    expect(mergeAt(t, 0, 0)).toBeNull();
    expect(t.merges).toBeUndefined();
  });

  it('tablePatch keeps the pixel scale while the table grows', () => {
    const el = createShape('table', { x: 0, y: 0, w: 600, h: 90 });
    el.table = table();
    const p = tablePatch(el, { op: 'insertCol', at: 3 })!;
    expect(p.w).toBe(800);
    expect(p.h).toBe(90);
    expect(tablePatch(el, { op: 'deleteRow', at: 0 })!.h).toBe(60);
  });
});
