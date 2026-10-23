/**
 * Grid: arranges shapes in reading order (by current position) into a
 * roughly square grid. Columns/rows take the size of their largest member,
 * shapes are centered in their cell, and everything snaps to the 10px grid.
 */
import type { Vec } from '@/model/types';
import { makeRun, type LGraph } from './engine';
import type { LayoutAlgorithm, LayoutOptions } from './types';

const GRID = 10;
const up = (v: number) => Math.ceil(v / GRID) * GRID;
const down = (v: number) => Math.floor(v / GRID) * GRID;

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const nodes = [...g.nodes].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x || a.index - b.index);
  const n = nodes.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  // Re-sort each row band left to right so a rough grid keeps its columns.
  const rows: (typeof nodes)[] = [];
  for (let i = 0; i < n; i += cols) rows.push(nodes.slice(i, i + cols).sort((a, b) => a.x - b.x || a.index - b.index));
  const gap = up(Math.max(GRID, o.nodeSpacing));
  const colW: number[] = [];
  const rowH: number[] = [];
  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      colW[c] = Math.max(colW[c] ?? 0, up(v.w));
      rowH[r] = Math.max(rowH[r] ?? 0, up(v.h));
    }),
  );
  const colX: number[] = [];
  let acc = 0;
  for (let c = 0; c < colW.length; c++) {
    colX[c] = acc;
    acc += colW[c] + gap;
  }
  const res = new Map<string, Vec>();
  let y = 0;
  rows.forEach((row, r) => {
    row.forEach((v, c) => res.set(v.id, { x: colX[c] + down((colW[c] - v.w) / 2), y: y + down((rowH[r] - v.h) / 2) }));
    y += rowH[r] + gap;
  });
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'grid',
  label: 'Grid',
  description: 'Arranges shapes in a roughly square grid aligned to the 10px grid.',
  run: makeRun(place, { snap: GRID }),
};
