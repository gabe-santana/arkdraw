/**
 * Circle layout: nodes evenly spaced on one circle (starting at the top,
 * clockwise). The order starts from a DFS over the connections and is then
 * refined with circular barycenter sweeps, keeping whichever order has the
 * fewest chord crossings. The radius is the smallest that keeps neighbours'
 * circumcircles `nodeSpacing` apart.
 */
import type { Vec } from '@/model/types';
import { makeRun, undirectedAdjacency, type LGraph } from './engine';
import type { LayoutAlgorithm, LayoutOptions } from './types';

function crossings(order: string[], edges: [string, string][]): number {
  const pos = new Map(order.map((id, i) => [id, i]));
  const chords = edges.map(([a, b]) => {
    const i = pos.get(a)!;
    const j = pos.get(b)!;
    return i < j ? [i, j] : [j, i];
  });
  let c = 0;
  for (let x = 0; x < chords.length; x++) {
    const [a, b] = chords[x];
    for (let y = x + 1; y < chords.length; y++) {
      const [p, q] = chords[y];
      if (a === p || a === q || b === p || b === q) continue;
      if ((a < p && p < b) !== (a < q && q < b)) c++;
    }
  }
  return c;
}

export function circleOrder(g: LGraph): string[] {
  const adj = undirectedAdjacency(g);
  const nodes = [...g.nodes].sort((a, b) => a.index - b.index);
  const order: string[] = [];
  const seen = new Set<string>();
  const byDegree = [...nodes].sort((a, b) => adj.get(b.id)!.length - adj.get(a.id)!.length || a.index - b.index);
  for (const start of byDegree) {
    if (seen.has(start.id)) continue;
    const stack = [start.id];
    while (stack.length) {
      const u = stack.pop()!;
      if (seen.has(u)) continue;
      seen.add(u);
      order.push(u);
      const next = adj.get(u)!.filter((v) => !seen.has(v));
      for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]);
    }
  }
  const edges: [string, string][] = [];
  const dedupe = new Set<string>();
  for (const e of g.edges) {
    const key = e.from < e.to ? `${e.from}\u0000${e.to}` : `${e.to}\u0000${e.from}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    edges.push([e.from, e.to]);
  }
  if (edges.length < 2 || edges.length > 1500) return order;

  let best = order;
  let bestC = crossings(order, edges);
  let cur = order;
  const n = order.length;
  for (let it = 0; it < 12 && bestC > 0; it++) {
    const ang = new Map(cur.map((id, i) => [id, (i / n) * Math.PI * 2]));
    const key = new Map<string, number>();
    for (const id of cur) {
      const nb = adj.get(id)!;
      if (!nb.length) {
        key.set(id, ang.get(id)!);
        continue;
      }
      let sx = Math.cos(ang.get(id)!) * 0.5;
      let sy = Math.sin(ang.get(id)!) * 0.5;
      for (const v of nb) {
        sx += Math.cos(ang.get(v)!);
        sy += Math.sin(ang.get(v)!);
      }
      let a = Math.atan2(sy, sx);
      if (a < 0) a += Math.PI * 2;
      key.set(id, a);
    }
    const idx = new Map(cur.map((id, i) => [id, i]));
    cur = [...cur].sort((a, b) => key.get(a)! - key.get(b)! || idx.get(a)! - idx.get(b)!);
    const c = crossings(cur, edges);
    if (c < bestC) {
      bestC = c;
      best = cur;
    }
  }
  return best;
}

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const order = circleOrder(g);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const n = order.length;
  const maxD = Math.max(...g.nodes.map((v) => Math.hypot(v.w, v.h)));
  const r = n < 2 ? 0 : (maxD + o.nodeSpacing) / (2 * Math.sin(Math.PI / n));
  const res = new Map<string, Vec>();
  order.forEach((id, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const v = byId.get(id)!;
    res.set(id, { x: Math.cos(a) * r - v.w / 2, y: Math.sin(a) * r - v.h / 2 });
  });
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'circle',
  label: 'Circle',
  description: 'Nodes evenly spaced on a circle, ordered to reduce crossing connections.',
  run: makeRun(place),
};
