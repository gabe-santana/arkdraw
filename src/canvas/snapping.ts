/**
 * Smart guides & grid snapping.
 *
 * While dragging, the moving bounds' left/center/right (and top/middle/bottom)
 * are compared against the same lines of every other shape. The closest match
 * within a few screen pixels wins and produces a visible guide; otherwise we
 * fall back to the grid.
 */
import type { Rect } from '@/model/types';
import type { Guide } from '@/store/editor';

export interface SnapLine {
  value: number;
  rect: Rect;
}

export interface SnapTargets {
  xs: SnapLine[];
  ys: SnapLine[];
  /** The rects themselves (for equal-spacing snapping). */
  rects?: Rect[];
}

export function buildSnapTargets(rects: Rect[]): SnapTargets {
  const xs: SnapLine[] = [];
  const ys: SnapLine[] = [];
  for (const r of rects) {
    xs.push({ value: r.x, rect: r }, { value: r.x + r.w / 2, rect: r }, { value: r.x + r.w, rect: r });
    ys.push({ value: r.y, rect: r }, { value: r.y + r.h / 2, rect: r }, { value: r.y + r.h, rect: r });
  }
  return { xs, ys, rects };
}

interface AxisSnap {
  delta: number;
  guides: Guide[];
}

/** Best snap for a set of candidate coordinates on one axis. */
function snapAxis(candidates: number[], lines: SnapLine[], threshold: number, axis: 'x' | 'y', moving: Rect): AxisSnap | null {
  let best: { delta: number; value: number } | null = null;
  for (const c of candidates) {
    for (const l of lines) {
      const d = l.value - c;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, value: l.value };
    }
  }
  if (!best) return null;
  // Guides: every line at the snapped value, spanning from the moving box to each match.
  const guides: Guide[] = [];
  const m = { ...moving, x: moving.x + (axis === 'x' ? best.delta : 0), y: moving.y + (axis === 'y' ? best.delta : 0) };
  for (const l of lines) {
    if (Math.abs(l.value - best.value) > 0.5) continue;
    const r = l.rect;
    if (axis === 'x') guides.push({ axis, at: best.value, from: Math.min(m.y, r.y), to: Math.max(m.y + m.h, r.y + r.h) });
    else guides.push({ axis, at: best.value, from: Math.min(m.x, r.x), to: Math.max(m.x + m.w, r.x + r.w) });
  }
  return { delta: best.delta, guides };
}

export interface SnapOptions {
  guides: boolean;
  grid: number | null;
  /** In world units (screen px / zoom). */
  threshold: number;
}

/** Snaps a moving rect; returns the adjustment and guides to display. */
export function snapRect(r: Rect, targets: SnapTargets, o: SnapOptions): { dx: number; dy: number; guides: Guide[] } {
  let dx = 0;
  let dy = 0;
  const guides: Guide[] = [];
  const sx = o.guides ? snapAxis([r.x, r.x + r.w / 2, r.x + r.w], targets.xs, o.threshold, 'x', r) : null;
  const sy = o.guides ? snapAxis([r.y, r.y + r.h / 2, r.y + r.h], targets.ys, o.threshold, 'y', r) : null;
  const gx = !sx && o.guides && targets.rects ? equalSpacing(r, targets.rects, 'x', o.threshold) : null;
  const gy = !sy && o.guides && targets.rects ? equalSpacing(r, targets.rects, 'y', o.threshold) : null;
  if (sx) {
    dx = sx.delta;
    guides.push(...sx.guides);
  } else if (gx) {
    dx = gx.delta;
    guides.push(...gx.guides);
  } else if (o.grid) dx = Math.round(r.x / o.grid) * o.grid - r.x;
  if (sy) {
    dy = sy.delta;
    guides.push(...sy.guides);
  } else if (gy) {
    dy = gy.delta;
    guides.push(...gy.guides);
  } else if (o.grid) dy = Math.round(r.y / o.grid) * o.grid - r.y;
  return { dx, dy, guides };
}

/**
 * Equal-spacing snap (like Figma / mxGraph): centers the moving box between
 * its nearest neighbours on an axis, or repeats an existing gap next to it.
 * Returns gap guides to draw as distance markers.
 */
function equalSpacing(r: Rect, rects: Rect[], axis: 'x' | 'y', threshold: number): AxisSnap | null {
  const pos = (b: Rect) => (axis === 'x' ? b.x : b.y);
  const size = (b: Rect) => (axis === 'x' ? b.w : b.h);
  const crossOverlap = (b: Rect) =>
    axis === 'x' ? b.y < r.y + r.h && b.y + b.h > r.y : b.x < r.x + r.w && b.x + b.w > r.x;
  const row = rects.filter(crossOverlap);
  const before = row.filter((b) => pos(b) + size(b) <= pos(r) + threshold).sort((a, b) => pos(b) + size(b) - (pos(a) + size(a)));
  const after = row.filter((b) => pos(b) >= pos(r) + size(r) - threshold).sort((a, b) => pos(a) - pos(b));
  const L = before[0];
  const R = after[0];
  const candidates: Array<{ delta: number; gaps: Array<[Rect, Rect]> }> = [];
  if (L && R) {
    const target = (pos(L) + size(L) + pos(R) - size(r)) / 2;
    candidates.push({ delta: target - pos(r), gaps: [[L, r], [r, R]] });
  }
  if (L && before[1]) {
    const LL = before[1];
    const gap = pos(L) - (pos(LL) + size(LL));
    if (gap > 0) candidates.push({ delta: pos(L) + size(L) + gap - pos(r), gaps: [[LL, L], [L, r]] });
  }
  if (R && after[1]) {
    const RR = after[1];
    const gap = pos(RR) - (pos(R) + size(R));
    if (gap > 0) candidates.push({ delta: pos(R) - gap - size(r) - pos(r), gaps: [[r, R], [R, RR]] });
  }
  const best = candidates.filter((c) => Math.abs(c.delta) <= threshold).sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  if (!best) return null;
  const moved: Rect = axis === 'x' ? { ...r, x: r.x + best.delta } : { ...r, y: r.y + best.delta };
  const guides: Guide[] = best.gaps.map(([a0, b0]) => {
    const a = a0 === r ? moved : a0;
    const b = b0 === r ? moved : b0;
    const crossA = axis === 'x' ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
    const crossB = axis === 'x' ? Math.min(a.y + a.h, b.y + b.h) : Math.min(a.x + a.w, b.x + b.w);
    return { axis: axis === 'x' ? 'y' : 'x', at: (crossA + crossB) / 2, from: pos(a) + size(a), to: pos(b), kind: 'gap' } as Guide;
  });
  return { delta: best.delta, guides };
}

/** Snaps a single coordinate (a resize edge or a new shape's corner). */
export function snapValue(v: number, axis: 'x' | 'y', targets: SnapTargets, o: SnapOptions, span: [number, number]): { v: number; guide?: Guide } {
  if (o.guides) {
    let best: SnapLine | null = null;
    for (const l of axis === 'x' ? targets.xs : targets.ys) {
      if (Math.abs(l.value - v) <= o.threshold && (!best || Math.abs(l.value - v) < Math.abs(best.value - v))) best = l;
    }
    if (best) {
      const r = best.rect;
      const [a, b] = axis === 'x' ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
      return { v: best.value, guide: { axis, at: best.value, from: Math.min(a, span[0]), to: Math.max(b, span[1]) } };
    }
  }
  return { v: o.grid ? Math.round(v / o.grid) * o.grid : v };
}
