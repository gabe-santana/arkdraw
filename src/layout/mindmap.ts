/**
 * Balanced mind map: the root sits in the middle and its first-level topics
 * are split between the right and left sides so both carry about the same
 * number of nodes; each side is a horizontal tidy tree (mirrored on the left).
 * Topics keep their clockwise order (right side top→bottom, then left side
 * bottom→top), taken from their current positions. Multiple roots become
 * separate maps packed in rows.
 */
import type { Vec } from '@/model/types';
import { makeRun, packBlocks, type LGraph, type LNode } from './engine';
import { buildForest, subtreeSizes, tidyTree, type Forest } from './tree-core';
import type { LayoutAlgorithm, LayoutOptions } from './types';

function collect(f: Forest, id: string, into: string[]) {
  into.push(id);
  for (const k of f.children.get(id) ?? []) collect(f, k, into);
}

function side(f: Forest, root: string, kids: string[], byId: Map<string, LNode>, o: LayoutOptions) {
  const ids = [root];
  for (const k of kids) collect(f, k, ids);
  const children = new Map(f.children);
  children.set(root, kids);
  const sub: Forest = { roots: [root], children, parent: f.parent, depth: f.depth };
  return tidyTree(sub, new Map(ids.map((id) => [id, byId.get(id)!])), true, o.nodeSpacing, o.levelSpacing);
}

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const f = buildForest(g, 'y');
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const sizes = subtreeSizes(f);
  const cx = (id: string) => byId.get(id)!.x + byId.get(id)!.w / 2;
  const cy = (id: string) => byId.get(id)!.y + byId.get(id)!.h / 2;
  const res = new Map<string, Vec>();
  const maps: { local: Map<string, Vec>; minX: number; minY: number; w: number; h: number }[] = [];

  for (const root of f.roots) {
    const kids = f.children.get(root) ?? [];
    const byY = (a: string, b: string) => cy(a) - cy(b) || byId.get(a)!.index - byId.get(b)!.index;
    const right0 = kids.filter((k) => cx(k) >= cx(root)).sort(byY);
    const left0 = kids.filter((k) => cx(k) < cx(root)).sort(byY);
    const clockwise = [...right0, ...left0.reverse()];
    const total = clockwise.reduce((s, k) => s + sizes.get(k)!, 0);
    let bestK = 0;
    let bestDiff = Infinity;
    let prefix = 0;
    for (let k = 0; k <= clockwise.length; k++) {
      const diff = Math.abs(2 * prefix - total);
      if (diff <= bestDiff) {
        bestDiff = diff;
        bestK = k;
      }
      if (k < clockwise.length) prefix += sizes.get(clockwise[k])!;
    }
    const rightKids = clockwise.slice(0, bestK);
    const leftKids = clockwise.slice(bestK).reverse();

    const r = side(f, root, rightKids, byId, o);
    const l = side(f, root, leftKids, byId, o);
    const rootW = byId.get(root)!.w;
    const dy = r.get(root)!.y - l.get(root)!.y;
    const local = new Map<string, Vec>(r);
    for (const [id, p] of l) {
      if (id === root) continue;
      local.set(id, { x: rootW - (p.x + byId.get(id)!.w), y: p.y + dy });
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [id, p] of local) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + byId.get(id)!.w);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + byId.get(id)!.h);
    }
    maps.push({ local, minX, minY, w: maxX - minX, h: maxY - minY });
  }
  const offs = packBlocks(maps, o.nodeSpacing * 2);
  maps.forEach((m, i) => {
    for (const [id, p] of m.local) res.set(id, { x: p.x - m.minX + offs[i].x, y: p.y - m.minY + offs[i].y });
  });
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'mindmap',
  label: 'Mind Map',
  description: 'Root in the middle, first-level topics balanced left and right as horizontal trees.',
  run: makeRun(place),
};
