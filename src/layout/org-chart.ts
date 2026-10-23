/**
 * Org chart: a top-down tidy tree where a manager whose reports are all
 * leaves (two or more) gets them stacked in a single column below it, offset
 * to the right of the manager's center line (mxGraph org-chart style). This
 * keeps wide organisations compact; connectors drop down the free lane on the
 * column's left side.
 */
import type { Vec } from '@/model/types';
import { makeRun, type LGraph } from './engine';
import { buildForest, layeredDepths, tidyLayout, type TidyNode } from './tree-core';
import type { LayoutAlgorithm, LayoutOptions } from './types';

const BLOCK = '\u0000block:';

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const f = buildForest(g, 'x');
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const stackGap = Math.max(10, Math.round(o.nodeSpacing / 2));
  const lane = Math.max(30, Math.round(o.nodeSpacing));

  // Replace all-leaf report groups with one column "block" node.
  const children = new Map<string, string[]>();
  const depth = new Map<string, number>(f.depth);
  const blocks = new Map<string, string[]>(); // block id -> leaves
  const size = new Map<string, { w: number; h: number }>();
  for (const n of g.nodes) size.set(n.id, { w: n.w, h: n.h });
  for (const [id, kids] of f.children) {
    const leafGroup = kids.length >= 2 && kids.every((k) => (f.children.get(k) ?? []).length === 0);
    if (!leafGroup) {
      children.set(id, kids);
      continue;
    }
    const bid = BLOCK + id;
    blocks.set(bid, kids);
    children.set(id, [bid]);
    children.set(bid, []);
    depth.set(bid, (f.depth.get(id) ?? 0) + 1);
    const w = lane + Math.max(...kids.map((k) => byId.get(k)!.w));
    const h = kids.reduce((s, k) => s + byId.get(k)!.h, 0) + stackGap * (kids.length - 1);
    size.set(bid, { w, h });
  }

  const stacked = new Set([...blocks.values()].flat());
  const visible = [...size.keys()].filter((id) => !stacked.has(id));
  // Blocks only widen their level by their first entry's height.
  const levelH = (id: string) => (blocks.has(id) ? byId.get(blocks.get(id)![0])!.h : size.get(id)!.h);
  const depths = layeredDepths(visible, depth, levelH, o.levelSpacing);
  const info = new Map<string, TidyNode>();
  for (const id of visible) {
    const s = size.get(id)!;
    info.set(id, { bs: s.w, ba: blocks.has(id) ? lane / 2 : s.w / 2, ds: s.h, d: depths.get(id)! });
  }
  const xs = tidyLayout(f.roots, children, info, o.nodeSpacing, o.nodeSpacing * 1.5);

  const res = new Map<string, Vec>();
  for (const id of visible) {
    const x = xs.get(id) ?? 0;
    const y = depths.get(id)!;
    const leaves = blocks.get(id);
    if (!leaves) {
      res.set(id, { x, y });
      continue;
    }
    let cy = y;
    for (const k of leaves) {
      res.set(k, { x: x + lane, y: cy });
      cy += byId.get(k)!.h + stackGap;
    }
  }
  return res;
}

export const layout: LayoutAlgorithm = {
  id: 'org-chart',
  label: 'Org Chart',
  description: 'Top-down hierarchy; leaf reports are stacked in a column under their manager.',
  run: makeRun(place),
};
