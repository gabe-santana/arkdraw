/**
 * Dragging one segment of an orthogonal connector sideways, like mxGraph:
 * hover a segment (the cursor turns into a resize cursor), drag it, and it
 * snaps to positions that remove bends. An end attached to a shape never
 * moves: the connector still leaves it at the same point, by a short stub,
 * and turns to reach the dragged segment (so a straight connector becomes a
 * detour, and an L or Z can be shaped from it). A free end follows the segment.
 * A middle segment dragged across a shape at either end (level with it, or
 * under it) makes the connector enter that shape from the side the segment
 * comes from, at that spot, and drops the rest of the detour: the route stays
 * the natural one instead of crossing the shape to reach its old side. And after
 * any drag, a last straight stretch that would run through its end's own shape
 * moves that end to the side facing it, at the same height.
 */
import type { ConnectorElement, DiagramElement, Endpoint, ShapeElement, Vec } from '@/model/types';
import { endpointAtFraction, fractionToWorld, worldToFraction } from '@/lib/connectionPoints';
import type { Guide } from '@/store/editor';

export interface SegmentHit {
  index: number;
  /** The segment runs horizontally (so it moves up and down). */
  horizontal: boolean;
}

type EndKind = { kind: 'free' } | { kind: 'shape'; shape: ShapeElement } | { kind: 'locked' };

function endKind(e: Endpoint, elements: Record<string, DiagramElement>): EndKind {
  if (!e.elementId) return { kind: 'free' };
  const el = elements[e.elementId];
  // Rotated shapes and connector-to-connector ends keep their attachment as it is.
  if (!el || el.type !== 'shape' || el.rotation) return { kind: 'locked' };
  return { kind: 'shape', shape: el };
}

const axisOf = (horizontal: boolean): 'x' | 'y' => (horizontal ? 'y' : 'x');

/** The axis-aligned segment of `points` under `p`, within `tolerance` (world units). */
export function segmentAt(points: Vec[], p: Vec, tolerance: number): SegmentHit | null {
  let best: SegmentHit | null = null;
  let bestD = tolerance;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const horizontal = Math.abs(a.y - b.y) < 0.5;
    const vertical = Math.abs(a.x - b.x) < 0.5;
    if (horizontal === vertical) continue; // diagonal or zero-length
    const d = horizontal
      ? p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) ? Math.abs(p.y - a.y) : Infinity
      : p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y) ? Math.abs(p.x - a.x) : Infinity;
    if (d <= bestD) {
      bestD = d;
      best = { index: i, horizontal };
    }
  }
  return best;
}

/** Whether segment `index` of the connector's route can be dragged sideways. */
export function canDragSegment(conn: ConnectorElement, points: Vec[], index: number, _elements?: Record<string, DiagramElement>): boolean {
  return conn.routing === 'orthogonal' && index >= 0 && index < points.length - 1;
}

/** How far an attached end's stub reaches before the route turns towards the dragged segment. */
const STUB = 20;

/** The point `STUB` along the segment from `end` towards `next` (or a third of the way when shorter). */
function stubFrom(end: Vec, next: Vec): Vec {
  const len = Math.hypot(next.x - end.x, next.y - end.y) || 1;
  const d = Math.min(STUB, len / 3);
  return { x: end.x + ((next.x - end.x) / len) * d, y: end.y + ((next.y - end.y) / len) * d };
}

/**
 * Moves segment `index` of `base` (the route when the drag started) to the
 * coordinate `c` across it. Attached ends stay where they are (the route
 * leaves them by a stub, then turns); free ends follow. Returns the patch.
 */
export function dragSegment(
  conn: ConnectorElement,
  base: Vec[],
  index: number,
  horizontal: boolean,
  c: number,
  elements: Record<string, DiagramElement>,
): { patch: Partial<ConnectorElement>; at: number } | null {
  const axis = axisOf(horizontal);
  const last = base.length - 2;
  const freeStart = index === 0 && endKind(conn.source, elements).kind === 'free';
  const freeEnd = index === last && endKind(conn.target, elements).kind === 'free';
  const pts = base.map((v) => ({ ...v }));
  let i = index;
  // An attached start: keep it, add its stub (stays on the line) and the turn (moves with the segment).
  if (index === 0 && !freeStart) {
    const s = stubFrom(pts[0], pts[1]);
    pts.splice(1, 0, { ...s }, { ...s });
    i += 2;
  }
  if (index === last && !freeEnd) {
    const n = pts.length;
    const s = stubFrom(pts[n - 1], pts[n - 2]);
    pts.splice(n - 1, 0, { ...s }, { ...s });
  }
  pts[i][axis] = c;
  pts[i + 1][axis] = c;
  const patch: Partial<ConnectorElement> = {};
  let from = 1;
  let to = pts.length - 1;
  // Across the shape at an end: enter it from the side the segment comes from (middle segments only,
  // a segment on an end keeps that end where it is).
  const middle = index > 0 && index < last;
  const enterTarget = middle ? entry(endKind(conn.target, elements), pts[i], axis, c) : null;
  if (enterTarget) {
    patch.target = enterTarget;
    to = i + 1;
    // Level with where the point really sits (stored as a rounded fraction), so no tiny step shows.
    pts[i][axis] = pts[i + 1][axis] = enterTarget[axis];
  }
  const enterSource = middle ? entry(endKind(conn.source, elements), pts[i + 1], axis, c) : null;
  if (enterSource) {
    patch.source = enterSource;
    from = i + 1;
    pts[i][axis] = pts[i + 1][axis] = enterSource[axis];
  }
  patch.waypoints = pts.slice(from, to);
  // Whatever was dragged: the last straight stretch into an end never runs through that end's shape.
  let full = [enterSource ?? pts[0], ...patch.waypoints, enterTarget ?? pts[pts.length - 1]];
  const target = freeEnd ? null : uncross(endKind(conn.target, elements), full);
  if (target) {
    patch.target = target.end;
    full = target.route;
  }
  const source = freeStart ? null : uncross(endKind(conn.source, elements), [...full].reverse());
  if (source) {
    patch.source = source.end;
    full = source.route.reverse();
  }
  patch.waypoints = dropDoublings(full).slice(1, -1);
  if (freeStart) patch.source = { ...conn.source, [axis]: c };
  if (freeEnd) patch.target = { ...conn.target, [axis]: c };
  // Ends not touched are written back as they were, undoing an entry made earlier in the same drag.
  patch.source ??= conn.source;
  patch.target ??= conn.target;
  return { patch, at: c };
}

/**
 * Removes the places where the route doubles back on itself: out one way, a
 * short side step, back the other way over the same stretch, then a turn. The
 * route turns where it comes back to instead (one bend instead of three).
 */
function dropDoublings(route: Vec[]): Vec[] {
  const pts = route.map((p) => ({ ...p }));
  for (let i = 0; i + 4 < pts.length; i++) {
    const [p0, p1, p2, p3, p4] = pts.slice(i, i + 5);
    const horizontal = Math.abs(p0.y - p1.y) < 0.5 && Math.abs(p2.y - p3.y) < 0.5 && Math.abs(p1.x - p2.x) < 0.5 && Math.abs(p3.x - p4.x) < 0.5;
    const vertical = Math.abs(p0.x - p1.x) < 0.5 && Math.abs(p2.x - p3.x) < 0.5 && Math.abs(p1.y - p2.y) < 0.5 && Math.abs(p3.y - p4.y) < 0.5;
    if (!horizontal && !vertical) continue;
    const along: 'x' | 'y' = horizontal ? 'x' : 'y';
    const across: 'x' | 'y' = horizontal ? 'y' : 'x';
    const out = p1[along] - p0[along];
    const back = p3[along] - p2[along];
    // Back the other way, over the outgoing stretch (not past where it started), after a side step
    // shorter than the way back: a fold, not a deliberate U around something.
    const side = Math.abs(p2[across] - p1[across]);
    if (out * back >= 0 || Math.abs(back) > Math.abs(out) || side >= Math.abs(back)) continue;
    // Turn at p3's spot on the outgoing stretch, then go on to p4 as before.
    const turn = { [along]: p3[along], [across]: p0[across] } as unknown as Vec;
    pts.splice(i + 1, 3, turn);
    i = Math.max(-1, i - 2);
  }
  return pts;
}

/**
 * `route` runs from the far end to the end on `kind`'s shape (its last point).
 * When its last straight stretch reaches that end through the shape (the end
 * sits on the far side), returns the end moved to the side the stretch comes
 * from, at the same height, and the route without the points past it.
 */
function uncross(kind: EndKind, route: Vec[]): { end: Endpoint; route: Vec[] } | null {
  if (kind.kind !== 'shape' || route.length < 2) return null;
  const s = kind.shape;
  const n = route.length;
  const end = route[n - 1];
  // The stretch: back from the end while the points stay on its line.
  const horizontal = Math.abs(route[n - 2].y - end.y) < 0.5;
  if (!horizontal && Math.abs(route[n - 2].x - end.x) >= 0.5) return null;
  const along: 'x' | 'y' = horizontal ? 'x' : 'y';
  const across: 'x' | 'y' = horizontal ? 'y' : 'x';
  let k = n - 2;
  while (k > 0 && Math.abs(route[k - 1][across] - end[across]) < 0.5) k--;
  const from = route[k];
  const [lo, size] = along === 'x' ? [s.x, s.w] : [s.y, s.h];
  let to: number | null = null;
  if (Math.abs(end[along] - (lo + size)) < 0.5 && from[along] < lo) to = lo;
  else if (Math.abs(end[along] - lo) < 0.5 && from[along] > lo + size) to = lo + size;
  if (to === null) return null;
  const ep = endpointAtFraction(s, worldToFraction(s, { ...end, [along]: to }));
  // Where the point is drawn (from its rounded fraction): the stretch lines up with it exactly.
  const at = ep.fixed ? fractionToWorld(s, ep.fixed) : { x: ep.x, y: ep.y };
  const kept = route.slice(0, k + 1).map((p) => ({ ...p }));
  if (k > 0) kept[k][across] = at[across];
  return { end: { ...ep, ...at }, route: [...kept, at] };
}

/**
 * The end a connector gets when a segment moves to `c` (on `axis`) across the
 * shape, coming from `far`: a point on the side facing `far`, at `c`. Null
 * when `c` is off the shape or `far` doesn't face a side.
 */
function entry(kind: EndKind, far: Vec, axis: 'x' | 'y', c: number): Endpoint | null {
  if (kind.kind !== 'shape') return null;
  const s = kind.shape;
  const [lo, size] = axis === 'x' ? [s.x, s.w] : [s.y, s.h];
  if (!(c > lo && c < lo + size)) return null;
  const f = (c - lo) / size;
  let at: Vec | null = null;
  if (axis === 'x') {
    if (far.y >= s.y + s.h) at = { x: c, y: s.y + s.h };
    else if (far.y <= s.y) at = { x: c, y: s.y };
  } else if (far.x >= s.x + s.w) at = { x: s.x + s.w, y: c };
  else if (far.x <= s.x) at = { x: s.x, y: c };
  if (!at || !Number.isFinite(f)) return null;
  const ep = endpointAtFraction(s, worldToFraction(s, at));
  // Where the point is drawn: from its stored (rounded) fraction.
  return ep.fixed ? { ...ep, ...fractionToWorld(s, ep.fixed) } : ep;
}

/**
 * Smart snapping for a dragged segment: line it up with the other end, the
 * attached shapes' centers or a parallel segment, which removes bends.
 */
export function snapSegment(
  conn: ConnectorElement,
  base: Vec[],
  index: number,
  horizontal: boolean,
  c: number,
  elements: Record<string, DiagramElement>,
  threshold: number,
): { at: number; guide?: Guide } {
  const axis = axisOf(horizontal);
  const across = horizontal ? 'x' : 'y';
  const last = base.length - 2;
  const seg = [base[index][across], base[index + 1][across]];
  const candidates: Array<{ at: number; span: number[] }> = [];
  const shapeCenter = (e: Endpoint) => {
    const k = endKind(e, elements);
    if (k.kind !== 'shape') return;
    const s = k.shape;
    candidates.push({ at: horizontal ? s.y + s.h / 2 : s.x + s.w / 2, span: horizontal ? [s.x, s.x + s.w] : [s.y, s.y + s.h] });
  };
  shapeCenter(conn.source);
  shapeCenter(conn.target);
  // The route's own ends and parallel segments (aligning with them removes two bends).
  if (index !== 0) candidates.push({ at: base[0][axis], span: [base[0][across]] });
  if (index !== last) candidates.push({ at: base[base.length - 1][axis], span: [base[base.length - 1][across]] });
  for (let j = 0; j < base.length - 1; j++) {
    if (j === index || Math.abs(base[j][axis] - base[j + 1][axis]) > 0.5) continue;
    candidates.push({ at: base[j][axis], span: [base[j][across], base[j + 1][across]] });
  }
  let best: { at: number; span: number[] } | null = null;
  for (const cand of candidates) {
    const d = Math.abs(cand.at - c);
    if (d <= threshold && (!best || d < Math.abs(best.at - c))) best = cand;
  }
  if (!best) return { at: c };
  const ends = [...seg, ...best.span];
  return { at: best.at, guide: { axis, at: best.at, from: Math.min(...ends), to: Math.max(...ends) } };
}

/** CSS cursor for hovering a segment: it moves across its own direction. */
export const segmentCursor = (horizontal: boolean) => (horizontal ? 'row-resize' : 'col-resize');
