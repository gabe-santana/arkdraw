/**
 * Shared driver for the layout algorithms in this folder.
 *
 * An algorithm ("placer") only sees an abstract graph of sibling nodes with
 * sizes and edges and returns top-left positions in any coordinate frame.
 * The driver takes care of everything document-specific:
 *
 * - scope: the selection (grouped by parent container) or all top-level shapes;
 * - containers: each container's children are laid out recursively bottom-up
 *   as an independent graph, the container is resized to fit (keeping its
 *   header), and it then takes part in its parent's layout as one node;
 * - edges crossing container borders are lifted to the siblings that contain
 *   their endpoints, so related groups still end up next to each other;
 * - locked shapes never move: they (and containers holding them) are left out
 *   of the layout and the result is shifted so it doesn't overlap them;
 * - the group's top-left stays where it was, positions snap to whole pixels.
 *
 * Pure: never mutates `doc`.
 */
import type { Doc, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import type { LayoutOptions } from './types';

export interface LNode {
  id: string;
  w: number;
  h: number;
  /** Current top-left (for order hints / warm starts). */
  x: number;
  y: number;
  /** Stable index (document z-order) for deterministic tie-breaks. */
  index: number;
}

export interface LEdge {
  from: string;
  to: string;
}

export interface LGraph {
  nodes: LNode[];
  /** Directed edges between distinct nodes, deduplicated. */
  edges: LEdge[];
  /** Preferred root (first selected shape), when it's part of this graph. */
  rootHint?: string;
}

/** Returns top-left positions for every node, in any frame. */
export type Placer = (g: LGraph, opts: LayoutOptions) => Map<string, Vec>;

export interface EngineConfig {
  /** Snap unit for final positions (1 = whole pixels). */
  snap?: number;
}

export type LayoutPatch = Record<string, Partial<Pick<ShapeElement, 'x' | 'y' | 'w' | 'h'>>>;

const ROOT = '\u0000root';
/** Padding between a container's border and its laid-out children. */
export const CONTAINER_PAD = 20;
const MIN_CONTAINER_W = 100;

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const isContainerShape = (s: ShapeElement) => !!getShapeDef(s.kind).container;

/** Header + padding around a container's content area. */
export function containerInsets(s: ShapeElement, snap = 1): Insets {
  const def = getShapeDef(s.kind);
  let top = 0;
  let bottom = 0;
  if (s.kind === 'c4.boundary') bottom = 36; // label sits at the bottom
  else if (def.textBox) {
    const tb = def.textBox(s.w, s.h);
    if (tb.y <= 1 && tb.h < s.h * 0.75) top = tb.y + tb.h;
  }
  const up = (v: number) => Math.ceil(v / snap) * snap;
  return { top: up(top + CONTAINER_PAD), right: up(CONTAINER_PAD), bottom: up(bottom + CONTAINER_PAD), left: up(CONTAINER_PAD) };
}

export function normalizedOptions(o: Partial<LayoutOptions> | undefined): LayoutOptions {
  const ns = Number.isFinite(o?.nodeSpacing) ? (o!.nodeSpacing as number) : 40;
  const ls = Number.isFinite(o?.levelSpacing) ? (o!.levelSpacing as number) : 60;
  return { nodeSpacing: Math.max(4, ns), levelSpacing: Math.max(8, ls) };
}

const overlaps = (a: Rect4, b: Rect4, gap = 0) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

interface Rect4 {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function runLayout(
  doc: Doc,
  ids: string[],
  rawOptions: LayoutOptions,
  placer: Placer,
  config: EngineConfig = {},
): LayoutPatch {
  const opts = normalizedOptions(rawOptions);
  const snap = config.snap ?? 1;
  const snapTo = (v: number) => Math.round(v / snap) * snap;
  const ceilTo = (v: number) => Math.ceil(v / snap) * snap;

  // ---- Index the document ------------------------------------------------
  const shapes = new Map<string, ShapeElement>();
  const orderIndex = new Map<string, number>();
  doc.order.forEach((id, i) => orderIndex.set(id, i));
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (isShape(el)) shapes.set(id, el);
  }
  for (const [id, el] of Object.entries(doc.elements)) {
    if (isShape(el) && !shapes.has(id)) {
      shapes.set(id, el);
      orderIndex.set(id, orderIndex.size + 1e6);
    }
  }
  const parentOf = (id: string): string => {
    const c = shapes.get(id)?.containerId;
    return c && c !== id && shapes.has(c) ? c : ROOT;
  };
  const children = new Map<string, string[]>();
  for (const id of shapes.keys()) {
    const p = parentOf(id);
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(id);
  }
  for (const list of children.values()) list.sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);

  /** Ancestor chain guard against containment cycles. */
  const isAncestor = (anc: string, id: string): boolean => {
    let cur = parentOf(id);
    for (let guard = 0; cur !== ROOT && guard < 1000; guard++) {
      if (cur === anc) return true;
      cur = parentOf(cur);
    }
    return false;
  };
  /** The ancestor of `id` (or `id` itself) whose parent is `level`. */
  const liftTo = (id: string, level: string): string | undefined => {
    let cur = id;
    for (let guard = 0; guard < 1000; guard++) {
      const p = parentOf(cur);
      if (p === level) return cur;
      if (p === ROOT) return undefined;
      cur = p;
    }
    return undefined;
  };

  const pinnedMemo = new Map<string, boolean>();
  /** Locked, or a container holding something locked: never moved/resized. */
  const pinned = (id: string, depth = 0): boolean => {
    const memo = pinnedMemo.get(id);
    if (memo !== undefined) return memo;
    pinnedMemo.set(id, false); // cycle guard
    const s = shapes.get(id)!;
    let res = !!s.locked;
    if (!res && depth < 100) for (const c of children.get(id) ?? []) if (pinned(c, depth + 1)) res = true;
    pinnedMemo.set(id, res);
    return res;
  };

  const connectors: { a: string; b: string }[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (!isConnector(el)) continue;
    const a = el.source.elementId;
    const b = el.target.elementId;
    if (a && b && shapes.has(a) && shapes.has(b)) connectors.push({ a, b });
  }

  // ---- Bottom-up relative layout -----------------------------------------
  const size = new Map<string, { w: number; h: number }>();
  const rel = new Map<string, Vec>();
  /** Containers whose content we laid out (children positioned via `rel`). */
  const laidOut = new Set<string>();
  const insetsOf = new Map<string, Insets>();
  const rootHint = ids.find((id) => shapes.has(id));

  function prepare(id: string, depth: number) {
    const s = shapes.get(id)!;
    const kids = children.get(id) ?? [];
    if (isContainerShape(s) && !pinned(id) && kids.length > 0 && depth < 100) {
      const inner = arrange(kids, id, depth + 1);
      const ins = containerInsets(s, snap);
      insetsOf.set(id, ins);
      laidOut.add(id);
      size.set(id, {
        w: ceilTo(Math.max(MIN_CONTAINER_W, inner.w + ins.left + ins.right)),
        h: ceilTo(inner.h + ins.top + ins.bottom),
      });
    } else {
      size.set(id, { w: s.w, h: s.h });
    }
  }

  /** Lays out `members` (siblings under `level`); fills `rel` with positions normalized to (0,0). */
  function arrange(members: string[], level: string, depth: number): { w: number; h: number } {
    const movable = members.filter((id) => !pinned(id));
    for (const id of movable) prepare(id, depth);
    if (movable.length === 0) return { w: 0, h: 0 };
    const set = new Set(movable);
    const seen = new Set<string>();
    const edges: LEdge[] = [];
    for (const c of connectors) {
      const a = liftTo(c.a, level);
      const b = liftTo(c.b, level);
      if (!a || !b || a === b || !set.has(a) || !set.has(b)) continue;
      const key = `${a}\u0000${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: a, to: b });
    }
    const nodes: LNode[] = movable.map((id) => {
      const s = shapes.get(id)!;
      const sz = size.get(id)!;
      return { id, w: sz.w, h: sz.h, x: s.x, y: s.y, index: orderIndex.get(id)! };
    });
    let hint: string | undefined;
    if (rootHint) {
      const lifted = liftTo(rootHint, level);
      if (lifted && set.has(lifted)) hint = lifted;
    }
    const pos = movable.length === 1 ? new Map([[movable[0], { x: 0, y: 0 }]]) : placer({ nodes, edges, rootHint: hint }, opts);
    let minX = Infinity;
    let minY = Infinity;
    for (const id of movable) {
      const p = pos.get(id) ?? { x: 0, y: 0 };
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }
    let w = 0;
    let h = 0;
    for (const id of movable) {
      const p = pos.get(id) ?? { x: 0, y: 0 };
      const r = { x: snapTo(p.x - minX), y: snapTo(p.y - minY) };
      rel.set(id, r);
      const sz = size.get(id)!;
      w = Math.max(w, r.x + sz.w);
      h = Math.max(h, r.y + sz.h);
    }
    return { w, h };
  }

  // ---- Scope ----------------------------------------------------------------
  const groups = new Map<string, string[]>();
  if (ids.length === 0) {
    groups.set(ROOT, children.get(ROOT) ?? []);
  } else {
    const sel = new Set(ids.filter((id) => shapes.has(id)));
    for (const id of [...sel].sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!)) {
      if ([...sel].some((o) => o !== id && isAncestor(o, id))) continue; // laid out with its container
      const p = parentOf(id);
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p)!.push(id);
    }
  }

  const out: LayoutPatch = {};
  const finalRect = new Map<string, Rect4>();
  const rectOf = (id: string): Rect4 => finalRect.get(id) ?? shapes.get(id)!;

  function place(id: string, x: number, y: number) {
    const s = shapes.get(id)!;
    const sz = size.get(id)!;
    const patch: Partial<Pick<ShapeElement, 'x' | 'y' | 'w' | 'h'>> = {};
    if (x !== s.x) patch.x = x;
    if (y !== s.y) patch.y = y;
    if (sz.w !== s.w) patch.w = sz.w;
    if (sz.h !== s.h) patch.h = sz.h;
    if (Object.keys(patch).length) out[id] = patch;
    finalRect.set(id, { x, y, w: sz.w, h: sz.h });
    if (laidOut.has(id)) {
      const ins = insetsOf.get(id)!;
      const kids = (children.get(id) ?? []).filter((k) => rel.has(k));
      let innerW = 0;
      for (const k of kids) innerW = Math.max(innerW, rel.get(k)!.x + size.get(k)!.w);
      const slack = Math.max(0, sz.w - ins.left - ins.right - innerW);
      const ox = x + ins.left + snapTo(slack / 2);
      const oy = y + ins.top;
      for (const k of kids) place(k, ox + rel.get(k)!.x, oy + rel.get(k)!.y);
    }
  }

  for (const [level, members] of groups) {
    const movable = members.filter((id) => !pinned(id));
    if (movable.length === 0) continue;
    // Anchor: current top-left of the group.
    let ax = Infinity;
    let ay = Infinity;
    for (const id of movable) {
      const s = shapes.get(id)!;
      ax = Math.min(ax, s.x);
      ay = Math.min(ay, s.y);
    }
    arrange(movable, level, 0);
    // Avoid fixed (locked) siblings by shifting the whole block.
    const obstacles = (children.get(level) ?? []).filter((id) => pinned(id)).map((id) => shapes.get(id)!);
    const gap = opts.nodeSpacing / 2;
    const rectAt = (id: string, dx: number, dy: number): Rect4 => ({
      x: ax + dx + rel.get(id)!.x,
      y: ay + dy + rel.get(id)!.y,
      ...size.get(id)!,
    });
    let dx = 0;
    let dy = 0;
    let clear = false;
    for (let iter = 0; iter < 200 && obstacles.length; iter++) {
      let best: { dx: number; dy: number } | null = null;
      for (const id of movable) {
        const r = rectAt(id, dx, dy);
        for (const o of obstacles) {
          if (!overlaps(r, o, gap)) continue;
          const mx = o.x + o.w + gap - r.x;
          const my = o.y + o.h + gap - r.y;
          const cand = mx <= my ? { dx: mx, dy: 0 } : { dx: 0, dy: my };
          if (!best || Math.abs(cand.dx) + Math.abs(cand.dy) < Math.abs(best.dx) + Math.abs(best.dy)) best = cand;
        }
      }
      if (!best) {
        clear = true;
        break;
      }
      dx += best.dx;
      dy += best.dy;
    }
    if (obstacles.length && !clear) {
      // Fall back to placing the block below every obstacle.
      dx = 0;
      dy = Math.max(...obstacles.map((o) => o.y + o.h)) + gap - ay;
    }
    const bx = snapTo(ax + dx);
    const by = snapTo(ay + dy);
    for (const id of movable) place(id, bx + rel.get(id)!.x, by + rel.get(id)!.y);

    // A selection inside a container: grow the container chain to enclose it.
    let cur = level;
    for (let guard = 0; cur !== ROOT && guard < 100; guard++) {
      const c = shapes.get(cur)!;
      if (c.locked) break;
      const ins = containerInsets(c, snap);
      const r = rectOf(cur);
      let x0 = r.x;
      let y0 = r.y;
      let x1 = r.x + r.w;
      let y1 = r.y + r.h;
      for (const k of children.get(cur) ?? []) {
        const kr = rectOf(k);
        x0 = Math.min(x0, kr.x - ins.left);
        y0 = Math.min(y0, kr.y - ins.top);
        x1 = Math.max(x1, kr.x + kr.w + ins.right);
        y1 = Math.max(y1, kr.y + kr.h + ins.bottom);
      }
      const nr = { x: x0, y: y0, w: ceilTo(x1 - x0), h: ceilTo(y1 - y0) };
      if (nr.x !== r.x || nr.y !== r.y || nr.w !== r.w || nr.h !== r.h) {
        finalRect.set(cur, nr);
        const patch = (out[cur] ??= {});
        if (nr.x !== c.x) patch.x = nr.x;
        if (nr.y !== c.y) patch.y = nr.y;
        if (nr.w !== c.w) patch.w = nr.w;
        if (nr.h !== c.h) patch.h = nr.h;
        if (!Object.keys(patch).length) delete out[cur];
      }
      cur = parentOf(cur);
    }
  }
  return out;
}

/** Builds a `LayoutAlgorithm.run` from a placer. */
export const makeRun =
  (placer: Placer, config?: EngineConfig) =>
  (doc: Doc, ids: string[], options: LayoutOptions): LayoutPatch =>
    runLayout(doc, ids, options, placer, config);

// ---- Small shared helpers ---------------------------------------------------

/** Deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Shelf-packs independent blocks (e.g. separate trees) into rows of roughly
 * square overall shape. Returns each block's top-left offset.
 */
export function packBlocks(blocks: { w: number; h: number }[], gap: number): Vec[] {
  if (blocks.length === 0) return [];
  const area = blocks.reduce((s, b) => s + (b.w + gap) * (b.h + gap), 0);
  const rowW = Math.max(Math.max(...blocks.map((b) => b.w)), Math.sqrt(area) * 1.4);
  const res: Vec[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const b of blocks) {
    if (x > 0 && x + b.w > rowW) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    res.push({ x, y });
    x += b.w + gap;
    rowH = Math.max(rowH, b.h);
  }
  return res;
}

/** Undirected adjacency (neighbors sorted by node index). */
export function undirectedAdjacency(g: LGraph): Map<string, string[]> {
  const idx = new Map(g.nodes.map((n) => [n.id, n.index]));
  const adj = new Map<string, Set<string>>(g.nodes.map((n) => [n.id, new Set()]));
  for (const e of g.edges) {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }
  return new Map([...adj].map(([k, v]) => [k, [...v].sort((a, b) => idx.get(a)! - idx.get(b)!)]));
}
