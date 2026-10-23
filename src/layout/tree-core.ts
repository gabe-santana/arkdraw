/**
 * Tree helpers shared by the tree, org-chart and mind-map layouts:
 * spanning-forest extraction and a size-aware tidy-tree packer.
 */
import type { LGraph, LNode } from './engine';

export interface Forest {
  roots: string[];
  children: Map<string, string[]>;
  parent: Map<string, string>;
  depth: Map<string, number>;
}

/**
 * Spanning forest following edge direction. Roots are the first selected shape
 * (if any) and nodes with in-degree 0; nodes only reachable through cycles get
 * the least-constrained node as an extra root. Non-tree edges are ignored.
 * Siblings (and roots) are ordered by their current position along `axis`.
 */
export function buildForest(g: LGraph, axis: 'x' | 'y'): Forest {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const out = new Map<string, string[]>(g.nodes.map((n) => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) {
    if (e.from === e.to || !byId.has(e.from) || !byId.has(e.to)) continue;
    out.get(e.from)!.push(e.to);
    indeg.set(e.to, indeg.get(e.to)! + 1);
  }
  const ordered = [...g.nodes].sort((a, b) => a.index - b.index);
  const parent = new Map<string, string>();
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const roots: string[] = [];

  const grow = (r: string) => {
    roots.push(r);
    visited.add(r);
    depth.set(r, 0);
    const queue = [r];
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      const next = [...out.get(u)!].sort((a, b) => byId.get(a)!.index - byId.get(b)!.index);
      for (const v of next) {
        if (visited.has(v)) continue;
        visited.add(v);
        parent.set(v, u);
        depth.set(v, depth.get(u)! + 1);
        queue.push(v);
      }
    }
  };

  if (g.rootHint && byId.has(g.rootHint)) grow(g.rootHint);
  for (const n of ordered) if (!visited.has(n.id) && indeg.get(n.id) === 0) grow(n.id);
  while (visited.size < g.nodes.length) {
    // Pick the unvisited node with the fewest unvisited predecessors.
    const pred = new Map<string, number>();
    for (const e of g.edges) {
      if (e.from !== e.to && !visited.has(e.from) && !visited.has(e.to)) pred.set(e.to, (pred.get(e.to) ?? 0) + 1);
    }
    let best: LNode | undefined;
    for (const n of ordered) {
      if (visited.has(n.id)) continue;
      if (!best || (pred.get(n.id) ?? 0) < (pred.get(best.id) ?? 0)) best = n;
    }
    grow(best!.id);
  }

  const center = (id: string) => {
    const n = byId.get(id)!;
    return axis === 'x' ? n.x + n.w / 2 : n.y + n.h / 2;
  };
  const cmp = (a: string, b: string) => center(a) - center(b) || byId.get(a)!.index - byId.get(b)!.index;
  const children = new Map<string, string[]>(g.nodes.map((n) => [n.id, []]));
  for (const [c, p] of parent) children.get(p)!.push(c);
  for (const list of children.values()) list.sort(cmp);
  roots.sort(cmp);
  return { roots, children, parent, depth };
}

/** Number of leaves under each node. */
export function leafCounts(f: Forest): Map<string, number> {
  const res = new Map<string, number>();
  const visit = (id: string): number => {
    const kids = f.children.get(id) ?? [];
    const n = kids.length === 0 ? 1 : kids.reduce((s, k) => s + visit(k), 0);
    res.set(id, n);
    return n;
  };
  for (const r of f.roots) visit(r);
  return res;
}

/** Number of nodes in each subtree. */
export function subtreeSizes(f: Forest): Map<string, number> {
  const res = new Map<string, number>();
  const visit = (id: string): number => {
    const n = 1 + (f.children.get(id) ?? []).reduce((s, k) => s + visit(k), 0);
    res.set(id, n);
    return n;
  };
  for (const r of f.roots) visit(r);
  return res;
}

// ---- Tidy tree ----------------------------------------------------------------

/** Geometry of one tree node in breadth (sibling axis) / depth (level axis) terms. */
export interface TidyNode {
  /** Size along the breadth axis. */
  bs: number;
  /** Anchor offset from the leading edge along breadth (parents center on it). */
  ba: number;
  /** Size along the depth axis. */
  ds: number;
  /** Depth position (leading edge). */
  d: number;
}

interface Band {
  d0: number;
  d1: number;
  l: number;
  r: number;
}

/**
 * Size-aware tidy tree (Reingold–Tilford with per-level contours). Each
 * subtree is packed against its left siblings, then against its right
 * siblings; averaging both placements centers small subtrees between big
 * ones (as Walker's algorithm does) while keeping every contour separated by
 * `spacing`. Parents are centered over their first and last child.
 *
 * Returns the breadth leading-edge coordinate of every node.
 */
export function tidyLayout(
  roots: string[],
  children: Map<string, string[]>,
  info: Map<string, TidyNode>,
  spacing: number,
  rootSpacing = spacing,
): Map<string, number> {
  const offset = new Map<string, number>(); // anchor offset relative to parent anchor

  const depthOverlap = (a: Band, b: Band) => a.d0 < b.d1 && b.d0 < a.d1;

  /** Min offset for `next` so it sits right of all `placed` bands. */
  const minRight = (placed: Map<number, Band>, next: Map<number, Band>, sp: number) => {
    let req = -Infinity;
    for (const p of placed.values()) for (const q of next.values()) if (depthOverlap(p, q)) req = Math.max(req, p.r + sp - q.l);
    return req;
  };
  /** Max offset for `next` so it sits left of all `placed` bands. */
  const maxLeft = (placed: Map<number, Band>, next: Map<number, Band>, sp: number) => {
    let req = Infinity;
    for (const p of placed.values()) for (const q of next.values()) if (depthOverlap(p, q)) req = Math.min(req, p.l - sp - q.r);
    return req;
  };
  const mergeInto = (into: Map<number, Band>, from: Map<number, Band>, shift: number) => {
    for (const [lvl, b] of from) {
      const cur = into.get(lvl);
      if (!cur) into.set(lvl, { d0: b.d0, d1: b.d1, l: b.l + shift, r: b.r + shift });
      else {
        cur.d0 = Math.min(cur.d0, b.d0);
        cur.d1 = Math.max(cur.d1, b.d1);
        cur.l = Math.min(cur.l, b.l + shift);
        cur.r = Math.max(cur.r, b.r + shift);
      }
    }
  };

  /** Packs a row of subtrees; returns anchor offsets (centered on first/last). */
  const pack = (contours: Map<number, Band>[], sp: number): number[] => {
    const n = contours.length;
    if (n === 1) return [0];
    const left: number[] = [0];
    let acc = new Map<number, Band>();
    mergeInto(acc, contours[0], 0);
    for (let j = 1; j < n; j++) {
      let o = minRight(acc, contours[j], sp);
      if (!Number.isFinite(o)) o = left[j - 1];
      left.push(o);
      mergeInto(acc, contours[j], o);
    }
    const right: number[] = new Array(n).fill(0);
    acc = new Map();
    mergeInto(acc, contours[n - 1], 0);
    for (let j = n - 2; j >= 0; j--) {
      let o = maxLeft(acc, contours[j], sp);
      if (!Number.isFinite(o)) o = right[j + 1];
      right[j] = o;
      mergeInto(acc, contours[j], o);
    }
    const lc = (left[0] + left[n - 1]) / 2;
    const rc = (right[0] + right[n - 1]) / 2;
    return left.map((v, i) => (v - lc + (right[i] - rc)) / 2);
  };

  const visit = (id: string, level: number, guard: number): Map<number, Band> => {
    const t = info.get(id)!;
    const kids = guard < 10000 ? children.get(id) ?? [] : [];
    const own: Band = { d0: t.d, d1: t.d + t.ds, l: -t.ba, r: t.bs - t.ba };
    const contour = new Map<number, Band>();
    if (kids.length) {
      const cs = kids.map((k) => visit(k, level + 1, guard + 1));
      const offs = pack(cs, spacing);
      kids.forEach((k, i) => {
        offset.set(k, offs[i]);
        mergeInto(contour, cs[i], offs[i]);
      });
    }
    mergeInto(contour, new Map([[level, own]]), 0);
    return contour;
  };

  const rootContours = roots.map((r) => visit(r, 0, 0));
  const rootOffs = rootContours.length ? pack(rootContours, rootSpacing) : [];
  const pos = new Map<string, number>();
  const assign = (id: string, anchor: number) => {
    pos.set(id, anchor - info.get(id)!.ba);
    for (const k of children.get(id) ?? []) assign(k, anchor + offset.get(k)!);
  };
  roots.forEach((r, i) => assign(r, rootOffs[i]));
  return pos;
}

/**
 * Layered depth positions: every level starts after the deepest node of the
 * previous one. Nodes in `ignore` don't widen their level.
 */
export function layeredDepths(
  ids: string[],
  depthOf: Map<string, number>,
  depthSize: (id: string) => number,
  levelSpacing: number,
  ignore?: Set<string>,
): Map<string, number> {
  const levelSize: number[] = [];
  for (const id of ids) {
    const l = depthOf.get(id) ?? 0;
    const s = ignore?.has(id) ? 0 : depthSize(id);
    levelSize[l] = Math.max(levelSize[l] ?? 0, s);
  }
  const start: number[] = [];
  let acc = 0;
  for (let l = 0; l < levelSize.length; l++) {
    start[l] = acc;
    acc += (levelSize[l] ?? 0) + levelSpacing;
  }
  return new Map(ids.map((id) => [id, start[depthOf.get(id) ?? 0]]));
}

/** Horizontal (left→right) or vertical (top→down) tidy tree of a forest. */
export function tidyTree(
  f: Forest,
  nodes: Map<string, { w: number; h: number }>,
  horizontal: boolean,
  nodeSpacing: number,
  levelSpacing: number,
): Map<string, { x: number; y: number }> {
  const ids = [...nodes.keys()];
  const ds = (id: string) => (horizontal ? nodes.get(id)!.w : nodes.get(id)!.h);
  const depths = layeredDepths(ids, f.depth, ds, levelSpacing);
  const info = new Map<string, TidyNode>();
  for (const id of ids) {
    const n = nodes.get(id)!;
    const bs = horizontal ? n.h : n.w;
    info.set(id, { bs, ba: bs / 2, ds: ds(id), d: depths.get(id)! });
  }
  const breadth = tidyLayout(f.roots, f.children, info, nodeSpacing, nodeSpacing * 1.5);
  const res = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const b = breadth.get(id) ?? 0;
    const d = depths.get(id)!;
    res.set(id, horizontal ? { x: d, y: b } : { x: b, y: d });
  }
  return res;
}
