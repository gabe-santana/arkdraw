/**
 * Orthogonal connector routing.
 *
 * Builds a sparse "visibility grid" from the coordinates that matter (the
 * stub points just outside each endpoint, the margins around the source and
 * target shapes, and the channels between them), then runs A* over it with a
 * penalty per bend. The result is the short, tidy elbow route you'd draw by
 * hand, and it naturally steers around the connected shapes instead of
 * cutting through them. The grid is tiny (a few dozen nodes), so routing a
 * connector costs microseconds and can run on every frame of a drag.
 */
import type { Rect, Vec } from '@/model/types';
import { add, inflate, mul } from './geometry';

export interface RouteEnd {
  point: Vec;
  /** Unit direction the connector leaves this end in (outward normal of the anchor). */
  dir: Vec;
  /** Bounds of the attached shape, or null for a free endpoint. */
  rect: Rect | null;
}

/** Distance the route keeps from the shapes it connects. */
export const ROUTE_MARGIN = 20;
const BEND_PENALTY = 28;

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const dirIndex = (d: Vec) => DIRS.findIndex((v) => v.x === Math.sign(d.x) && v.y === Math.sign(d.y));

const strictlyInside = (r: Rect, p: Vec) =>
  p.x > r.x + 1e-6 && p.x < r.x + r.w - 1e-6 && p.y > r.y + 1e-6 && p.y < r.y + r.h - 1e-6;

/** Clearance kept around third-party shapes the route steers around. */
const OBSTACLE_MARGIN = 12;

/**
 * @param others Other shapes to avoid (besides the two endpoints). Callers pass
 *   only shapes near the connection, so the grid stays small.
 */
/**
 * How far a shape's bounds extend beyond its anchor along `dir` (non-zero for
 * rotated shapes, whose axis-aligned bounds stick out past the anchor point).
 */
function overhang(e: RouteEnd): number {
  const r = e.rect;
  if (!r) return 0;
  const { x, y } = e.point;
  const d = e.dir.x > 0 ? r.x + r.w - x : e.dir.x < 0 ? x - r.x : e.dir.y > 0 ? r.y + r.h - y : y - r.y;
  return Math.max(0, d);
}

export function routeOrthogonal(a: RouteEnd, b: RouteEnd, others: Rect[] = []): Vec[] {
  const a1 = a.rect ? add(a.point, mul(a.dir, ROUTE_MARGIN + overhang(a))) : a.point;
  const b1 = b.rect ? add(b.point, mul(b.dir, ROUTE_MARGIN + overhang(b))) : b.point;
  const path = (others.length ? aStar(a, b, a1, b1, others) : null) ?? aStar(a, b, a1, b1, []) ?? fallbackRoute(a, a1, b1);
  return simplify([a.point, ...path, b.point]);
}

function aStar(a: RouteEnd, b: RouteEnd, a1: Vec, b1: Vec, others: Rect[]): Vec[] | null {
  const shapes = [a.rect, b.rect].filter((r): r is Rect => !!r);
  // Slightly smaller than the margin so the stub points sit just outside.
  const obstacles = shapes.map((r) => inflate(r, ROUTE_MARGIN - 1));
  for (const r of others) {
    const o = inflate(r, OBSTACLE_MARGIN);
    // An obstacle swallowing a stub point would make the route impossible; skip it.
    if (strictlyInside(o, a1) || strictlyInside(o, b1)) continue;
    obstacles.push(o);
  }

  const xs = new Set<number>([a1.x, b1.x, (a1.x + b1.x) / 2]);
  const ys = new Set<number>([a1.y, b1.y, (a1.y + b1.y) / 2]);
  for (const o of obstacles) {
    xs.add(o.x).add(o.x + o.w);
    ys.add(o.y).add(o.y + o.h);
  }
  if (shapes.length === 2) {
    // Channels running midway between the two shapes.
    const [r1, r2] = shapes;
    xs.add((r1.x + r1.w + r2.x) / 2).add((r2.x + r2.w + r1.x) / 2);
    ys.add((r1.y + r1.h + r2.y) / 2).add((r2.y + r2.h + r1.y) / 2);
  }
  const X = [...xs].sort((p, q) => p - q);
  const Y = [...ys].sort((p, q) => p - q);
  const nx = X.length;
  const node = (i: number, j: number) => j * nx + i;
  const blocked = (p: Vec) => obstacles.some((o) => strictlyInside(o, p));

  const start = node(X.indexOf(a1.x), Y.indexOf(a1.y));
  const goal = node(X.indexOf(b1.x), Y.indexOf(b1.y));
  const startDir = a.rect ? dirIndex(a.dir) : -1;
  // The final hop into the target travels opposite to its outward normal.
  const goalDir = b.rect ? dirIndex(mul(b.dir, -1)) : -1;

  // State = node * 5 + arrival direction (4 = "no direction yet").
  const stateCount = X.length * Y.length * 5;
  const g = new Float64Array(stateCount).fill(Infinity);
  const parent = new Int32Array(stateCount).fill(-1);
  const closed = new Uint8Array(stateCount);
  const pos = (n: number): Vec => ({ x: X[n % nx], y: Y[Math.floor(n / nx)] });
  const h = (n: number) => {
    const p = pos(n);
    return Math.abs(p.x - b1.x) + Math.abs(p.y - b1.y);
  };

  const s0 = start * 5 + (startDir < 0 ? 4 : startDir);
  g[s0] = 0;
  const open = new MinHeap();
  open.push(s0, h(start));

  let best = -1;
  let bestCost = Infinity;
  while (open.size) {
    const s = open.pop();
    if (closed[s]) continue;
    closed[s] = 1;
    const n = Math.floor(s / 5);
    const d = s % 5;

    if (n === goal) {
      const finalBend = goalDir >= 0 && d !== goalDir ? (d === (goalDir + 2) % 4 ? 4 : 1) * BEND_PENALTY : 0;
      if (g[s] + finalBend < bestCost) {
        bestCost = g[s] + finalBend;
        best = s;
      }
      continue;
    }
    if (g[s] >= bestCost) continue;

    const i = n % nx;
    const j = Math.floor(n / nx);
    for (let k = 0; k < 4; k++) {
      if (d < 4 && k === (d + 2) % 4) continue; // no U-turns
      const ni = i + DIRS[k].x;
      const nj = j + DIRS[k].y;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= Y.length) continue;
      const m = node(ni, nj);
      const pm = pos(m);
      const pn = pos(n);
      if (m !== goal && blocked(pm)) continue;
      if (blocked({ x: (pm.x + pn.x) / 2, y: (pm.y + pn.y) / 2 })) continue;
      const cost = g[s] + Math.abs(pm.x - pn.x) + Math.abs(pm.y - pn.y) + (d < 4 && d !== k ? BEND_PENALTY : 0);
      const ns = m * 5 + k;
      if (cost < g[ns]) {
        g[ns] = cost;
        parent[ns] = s;
        open.push(ns, cost + h(m));
      }
    }
  }
  if (best < 0) return null;

  const out: Vec[] = [];
  for (let s = best; s >= 0; s = parent[s]) out.push(pos(Math.floor(s / 5)));
  return out.reverse();
}

/** Simple three-segment elbow, used when shapes overlap so tightly A* has no room. */
function fallbackRoute(a: RouteEnd, a1: Vec, b1: Vec): Vec[] {
  if (a.dir.x !== 0) {
    const mx = (a1.x + b1.x) / 2;
    return [a1, { x: mx, y: a1.y }, { x: mx, y: b1.y }, b1];
  }
  const my = (a1.y + b1.y) / 2;
  return [a1, { x: a1.x, y: my }, { x: b1.x, y: my }, b1];
}

/** Drops duplicate and collinear points. */
export function simplify(points: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    if (out.length >= 2) {
      const prev = out[out.length - 2];
      const collinear =
        (Math.abs(prev.x - last.x) < 0.01 && Math.abs(last.x - p.x) < 0.01) ||
        (Math.abs(prev.y - last.y) < 0.01 && Math.abs(last.y - p.y) < 0.01);
      if (collinear) out.pop();
    }
    out.push(p);
  }
  return out;
}

/** SVG path for a polyline with softly rounded corners. */
export function roundedPolylinePath(points: Vec[], radius = 8): string {
  if (points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p = points[i];
    const p1 = points[i + 1];
    const r = Math.min(radius, Math.hypot(p.x - p0.x, p.y - p0.y) / 2, Math.hypot(p1.x - p.x, p1.y - p.y) / 2);
    const inDir = { x: Math.sign(p.x - p0.x), y: Math.sign(p.y - p0.y) };
    const outDir = { x: Math.sign(p1.x - p.x), y: Math.sign(p1.y - p.y) };
    d += ` L${p.x - inDir.x * r},${p.y - inDir.y * r} Q${p.x},${p.y} ${p.x + outDir.x * r},${p.y + outDir.y * r}`;
  }
  const last = points[points.length - 1];
  return d + ` L${last.x},${last.y}`;
}

/** Minimal binary heap keyed by priority, for A*'s open set. */
class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, priority: number) {
    const it = this.items;
    const pr = this.prio;
    let i = it.length;
    it.push(item);
    pr.push(priority);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (pr[p] <= pr[i]) break;
      [it[p], it[i]] = [it[i], it[p]];
      [pr[p], pr[i]] = [pr[i], pr[p]];
      i = p;
    }
  }
  pop(): number {
    const it = this.items;
    const pr = this.prio;
    const top = it[0];
    const lastI = it.pop()!;
    const lastP = pr.pop()!;
    if (it.length) {
      it[0] = lastI;
      pr[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < it.length && pr[l] < pr[m]) m = l;
        if (r < it.length && pr[r] < pr[m]) m = r;
        if (m === i) break;
        [it[m], it[i]] = [it[i], it[m]];
        [pr[m], pr[i]] = [pr[i], pr[m]];
        i = m;
      }
    }
    return top;
  }
}
