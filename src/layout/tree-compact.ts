/**
 * Compact tree (file-tree style): every node gets its own row; children are
 * stacked below their parent, indented to the right. Multiple roots form
 * side-by-side columns.
 */
import type { Vec } from '@/model/types';
import { makeRun, type LGraph } from './engine';
import { buildForest } from './tree-core';
import type { LayoutAlgorithm, LayoutOptions } from './types';

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const f = buildForest(g, 'y');
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const rowGap = Math.max(8, Math.round(o.nodeSpacing / 2));
  const indent = Math.max(24, Math.round(o.levelSpacing / 2));
  const res = new Map<string, Vec>();
  let colX = 0;
  for (const root of f.roots) {
    let y = 0;
    let right = 0;
    const visit = (id: string, x: number, guard: number) => {
      const n = byId.get(id)!;
      res.set(id, { x, y });
      y += n.h + rowGap;
      right = Math.max(right, x + n.w);
      if (guard > 10000) return;
      for (const k of f.children.get(id) ?? []) visit(k, x + indent, guard + 1);
    };
    visit(root, colX, 0);
    colX = right + o.nodeSpacing * 1.5;
  }
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'tree-compact',
  label: 'Compact Tree',
  description: 'Children stacked under their parent with indentation, like a file tree.',
  run: makeRun(place),
};
