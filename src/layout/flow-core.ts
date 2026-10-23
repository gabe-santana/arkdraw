/** Layered (Sugiyama) flow layout via dagre; shared by the horizontal/vertical flow modules. */
import dagre from '@dagrejs/dagre';
import type { Vec } from '@/model/types';
import type { LGraph } from './engine';
import type { LayoutOptions } from './types';

export function flowPlace(g: LGraph, o: LayoutOptions, rankdir: 'LR' | 'TB'): Map<string, Vec> {
  const dg = new dagre.graphlib.Graph({ multigraph: true });
  dg.setGraph({ rankdir, nodesep: o.nodeSpacing, ranksep: o.levelSpacing, edgesep: 16, marginx: 0, marginy: 0, acyclicer: 'greedy' });
  dg.setDefaultEdgeLabel(() => ({}));
  const nodes = [...g.nodes].sort((a, b) => a.index - b.index);
  for (const n of nodes) dg.setNode(n.id, { width: n.w, height: n.h });
  g.edges.forEach((e, i) => dg.setEdge(e.from, e.to, { minlen: 1, weight: 1 }, `e${i}`));
  dagre.layout(dg);
  const res = new Map<string, Vec>();
  for (const n of nodes) {
    const p = dg.node(n.id) as { x: number; y: number };
    res.set(n.id, { x: p.x - n.w / 2, y: p.y - n.h / 2 });
  }
  return res;
}