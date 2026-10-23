/**
 * Radial tree: the root sits at the center and each level lies on a
 * concentric ring. A subtree gets an angular wedge proportional to its leaf
 * count; ring radii grow until no two nodes (bounded by their circumcircles)
 * can touch, both along a ring and between rings. Multiple roots are packed
 * side by side in rows.
 */
import type { Vec } from '@/model/types';
import { makeRun, packBlocks, type LGraph } from './engine';
import { buildForest, leafCounts, type Forest } from './tree-core';
import type { LayoutAlgorithm, LayoutOptions } from './types';

function radialTree(root: string, f: Forest, leaves: Map<string, number>, circ: (id: string) => number, o: LayoutOptions) {
  const angle = new Map<string, number>();
  const levels: string[][] = [];
  const visit = (id: string, start: number, span: number, depth: number) => {
    angle.set(id, start + span / 2);
    (levels[depth] ??= []).push(id);
    const kids = f.children.get(id) ?? [];
    const total = leaves.get(id)!;
    let a = start;
    for (const k of kids) {
      const s = (span * leaves.get(k)!) / total;
      visit(k, a, s, depth + 1);
      a += s;
    }
  };
  visit(root, -Math.PI / 2, Math.PI * 2, 0);

  const radius: number[] = [0];
  const maxC = levels.map((ids) => Math.max(...ids.map(circ)));
  for (let l = 1; l < levels.length; l++) {
    let r = radius[l - 1] + maxC[l - 1] + maxC[l] + o.levelSpacing;
    const ids = [...levels[l]].sort((a, b) => angle.get(a)! - angle.get(b)!);
    const m = ids.length;
    const reach = m > 400 ? 3 : m; // all pairs for normal sizes
    for (let i = 0; i < m; i++) {
      for (let s = 1; s < Math.min(reach, m); s++) {
        const j = (i + s) % m;
        if (j === i) continue;
        let t = Math.abs(angle.get(ids[j])! - angle.get(ids[i])!);
        t = Math.min(t, Math.PI * 2 - t);
        const need = circ(ids[i]) + circ(ids[j]) + o.nodeSpacing;
        const sin = Math.sin(t / 2);
        if (sin > 1e-9) r = Math.max(r, need / (2 * sin));
      }
    }
    radius[l] = r;
  }
  const pos = new Map<string, Vec>(); // centers
  levels.forEach((ids, l) => {
    for (const id of ids) {
      const a = angle.get(id)!;
      pos.set(id, { x: Math.cos(a) * radius[l], y: Math.sin(a) * radius[l] });
    }
  });
  return pos;
}

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const f = buildForest(g, 'x');
  const leaves = leafCounts(f);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const circ = (id: string) => Math.hypot(byId.get(id)!.w, byId.get(id)!.h) / 2;
  // Lay out each tree, then pack the trees into rows.
  const trees = f.roots.map((root) => {
    const centers = radialTree(root, f, leaves, circ, o);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [id, c] of centers) {
      const n = byId.get(id)!;
      minX = Math.min(minX, c.x - n.w / 2);
      maxX = Math.max(maxX, c.x + n.w / 2);
      minY = Math.min(minY, c.y - n.h / 2);
      maxY = Math.max(maxY, c.y + n.h / 2);
    }
    return { centers, minX, minY, w: maxX - minX, h: maxY - minY };
  });
  const offs = packBlocks(trees, o.nodeSpacing * 2);
  const res = new Map<string, Vec>();
  trees.forEach((t, i) => {
    for (const [id, c] of t.centers) {
      const n = byId.get(id)!;
      res.set(id, { x: c.x - n.w / 2 - t.minX + offs[i].x, y: c.y - n.h / 2 - t.minY + offs[i].y });
    }
  });
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'tree-radial',
  label: 'Radial Tree',
  description: 'Root at the center, levels on concentric rings, wedges sized by subtree leaf count.',
  run: makeRun(place),
};
