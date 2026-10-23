/**
 * Auto-layout for a resolved diagram.
 *
 * Containers (VPCs, subnets, C4 boundaries…) are laid out bottom-up: each
 * container's children are positioned with dagre as an independent graph,
 * the container is sized to fit them (padding + header), and then it takes
 * part in its parent's layout as a single fixed-size node. Edges that cross
 * container borders are "lifted" to the pair of siblings that contain their
 * endpoints at each level, so related groups still end up next to each other.
 *
 * Compared to dagre's built-in compound mode this never fails on edges
 * attached to clusters, and guarantees children sit inside their container
 * and siblings never overlap.
 */
import dagre from '@dagrejs/dagre';
import type { Rect } from '@/model/types';
import { measureText } from '@/lib/text';
import { DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import type { Direction } from './spec';
import type { ResolvedNode } from './resolve';

export interface LayoutEdge {
  from: string;
  to: string;
  label?: string;
}

export interface LayoutOptions {
  direction: Direction;
  nodesep?: number;
  ranksep?: number;
}

export interface LayoutResult {
  /** Shape rect per node id (labels below shapes are outside these rects). */
  rects: Map<string, Rect>;
  /** Bounds of everything, including labels below shapes. Starts at (0,0). */
  width: number;
  height: number;
}

type LevelEdge = { a: string; b: string; direct: boolean; label?: string };

const ROOT = '\u0000root';
const GRID_GAP = 40;

export function layoutDiagram(nodes: ResolvedNode[], edges: LayoutEdge[], opts: LayoutOptions): LayoutResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = (id: string) => {
    const p = byId.get(id)?.parent;
    return p && byId.has(p) ? p : ROOT;
  };
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    const p = parentOf(n.id);
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(n.id);
  }

  /** The ancestor of `id` (or `id` itself) whose parent is `level`. */
  const liftTo = (id: string, level: string): string | undefined => {
    let cur: string | undefined = id;
    for (let guard = 0; cur && guard < 1000; guard++) {
      const p = parentOf(cur);
      if (p === level) return cur;
      if (p === ROOT) return undefined;
      cur = p;
    }
    return undefined;
  };

  const boxSize = new Map<string, { w: number; h: number }>();
  const rel = new Map<string, { x: number; y: number }>();
  const innerSize = new Map<string, { w: number; h: number }>();

  const nodesep = opts.nodesep ?? 48;
  const ranksep = opts.ranksep ?? 64;
  const labelStyle = DEFAULT_CONNECTOR_STYLE;

  function layoutLevel(level: string): { w: number; h: number } {
    const kids = children.get(level) ?? [];
    for (const id of kids) {
      const n = byId.get(id)!;
      if (n.container) {
        const inner = (children.get(id)?.length ?? 0) > 0 ? layoutLevel(id) : { w: 0, h: 0 };
        innerSize.set(id, inner);
        const w = Math.max(n.w, inner.w + n.padding.left + n.padding.right);
        const h = inner.h ? inner.h + n.padding.top + n.padding.bottom : Math.max(n.h, n.padding.top + n.padding.bottom + 40);
        boxSize.set(id, { w: Math.ceil(w), h: Math.ceil(h) });
      } else {
        boxSize.set(id, { w: n.boxW, h: n.h + n.labelBelow });
      }
    }
    if (kids.length === 0) return { w: 0, h: 0 };

    const levelEdges: LevelEdge[] = [];
    for (const e of edges) {
      const a = liftTo(e.from, level);
      const b = liftTo(e.to, level);
      if (!a || !b || a === b) continue;
      const direct = a === e.from && b === e.to;
      levelEdges.push({ a, b, direct, label: direct ? e.label : undefined });
    }

    if (kids.length === 1) rel.set(kids[0], { x: 0, y: 0 });
    else if (levelEdges.length === 0 && kids.length > 3) gridLayout(kids);
    else dagreLayout(kids, levelEdges);

    let maxX = 0;
    let maxY = 0;
    let minX = Infinity;
    let minY = Infinity;
    for (const id of kids) {
      const p = rel.get(id)!;
      const s = boxSize.get(id)!;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + s.w);
      maxY = Math.max(maxY, p.y + s.h);
    }
    for (const id of kids) {
      const p = rel.get(id)!;
      rel.set(id, { x: Math.round(p.x - minX), y: Math.round(p.y - minY) });
    }
    return { w: Math.ceil(maxX - minX), h: Math.ceil(maxY - minY) };
  }

  function gridLayout(kids: string[]) {
    const horizontal = opts.direction === 'TB' || opts.direction === 'BT';
    const cols = horizontal ? Math.ceil(Math.sqrt(kids.length * 1.5)) : Math.ceil(Math.sqrt(kids.length / 1.5));
    const colW: number[] = [];
    const rowH: number[] = [];
    kids.forEach((id, i) => {
      const s = boxSize.get(id)!;
      const c = i % cols;
      const r = Math.floor(i / cols);
      colW[c] = Math.max(colW[c] ?? 0, s.w);
      rowH[r] = Math.max(rowH[r] ?? 0, s.h);
    });
    kids.forEach((id, i) => {
      const s = boxSize.get(id)!;
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = colW.slice(0, c).reduce((a, b) => a + b + GRID_GAP, 0);
      const y = rowH.slice(0, r).reduce((a, b) => a + b + GRID_GAP, 0);
      rel.set(id, { x: x + (colW[c] - s.w) / 2, y: y + (rowH[r] - s.h) / 2 });
    });
  }

  function dagreLayout(kids: string[], levelEdges: LevelEdge[]) {
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({ rankdir: opts.direction, nodesep, ranksep, edgesep: 16, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const id of kids) {
      const s = boxSize.get(id)!;
      g.setNode(id, { width: s.w, height: s.h });
    }
    levelEdges.forEach((e, i) => {
      const label = e.label
        ? { width: Math.min(180, measureText(e.label, labelStyle) + 12), height: 22, labelpos: 'c' }
        : { width: 0, height: 0 };
      g.setEdge(e.a, e.b, { minlen: 1, weight: e.direct ? 2 : 1, ...label }, `e${i}`);
    });
    dagre.layout(g);
    for (const id of kids) {
      const n = g.node(id) as { x: number; y: number; width: number; height: number };
      const s = boxSize.get(id)!;
      rel.set(id, { x: n.x - s.w / 2, y: n.y - s.h / 2 });
    }
  }

  const total = layoutLevel(ROOT);

  // Resolve absolute positions top-down.
  const rects = new Map<string, Rect>();
  function place(level: string, ox: number, oy: number) {
    for (const id of children.get(level) ?? []) {
      const n = byId.get(id)!;
      const p = rel.get(id)!;
      const s = boxSize.get(id)!;
      const x = ox + p.x;
      const y = oy + p.y;
      if (n.container) {
        rects.set(id, { x, y, w: s.w, h: s.h });
        const inner = innerSize.get(id) ?? { w: 0, h: 0 };
        const slack = s.w - n.padding.left - n.padding.right - inner.w;
        place(id, x + n.padding.left + Math.max(0, slack / 2), y + n.padding.top);
      } else {
        rects.set(id, { x: x + (s.w - n.w) / 2, y, w: n.w, h: n.h });
      }
    }
  }
  place(ROOT, 0, 0);
  return { rects, width: total.w, height: total.h };
}
