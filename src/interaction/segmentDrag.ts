/**
 * Dragging one segment of an orthogonal connector sideways, like mxGraph:
 * hover a segment (the cursor turns into a resize cursor), drag it, and it
 * snaps to positions that remove bends. An end attached to a shape never
 * moves: the connector still leaves it at the same point, by a short stub,
 * and turns to reach the dragged segment (so a straight connector becomes a
 * detour, and an L or Z can be shaped from it). A free end follows the segment.
 * The segment next to an end's last turn, dragged over the shape (say under
 * it), makes the connector enter that shape from the side it now faces, at
 * that spot: one bend less, an L instead of a hook.
 */
import type { ConnectorElement, DiagramElement, Endpoint, ShapeElement, Vec } from '@/model/types';
import { endpointAtFraction, worldToFraction } from '@/lib/connectionPoints';
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
  // Over the shape at the far end: enter it from the side the segment now comes from.
  const enterTarget = index === last - 1 && last > 0 ? entry(endKind(conn.target, elements), pts[i], axis, c) : null;
  if (enterTarget) {
    patch.target = enterTarget;
    to = i + 1;
  }
  const enterSource = index === 1 && last > 1 ? entry(endKind(conn.source, elements), pts[i + 1], axis, c) : null;
  if (enterSource) {
    patch.source = enterSource;
    from = i + 1;
  }
  patch.waypoints = pts.slice(from, to);
  if (freeStart) patch.source = { ...conn.source, [axis]: c };
  if (freeEnd) patch.target = { ...conn.target, [axis]: c };
  // Ends not touched are written back as they were, undoing an entry made earlier in the same drag.
  patch.source ??= conn.source;
  patch.target ??= conn.target;
  return { patch, at: c };
}

/**
 * The end a connector gets when the segment beside its last turn moves to `c`
 * (on `axis`) over the shape, coming from `far`: a point on the side facing
 * `far`, at `c`. Null when `c` is off the shape or `far` doesn't face a side.
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
  return endpointAtFraction(s, worldToFraction(s, at));
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
