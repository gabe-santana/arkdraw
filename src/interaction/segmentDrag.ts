/**
 * Dragging one segment of an orthogonal connector sideways, the way people
 * straighten diagrams: hover a segment (the cursor turns into a resize
 * cursor), drag it, and it snaps to positions that remove bends. The first
 * and last segments slide their end along the attached shape's side, so a
 * connector between two offset shapes can be pulled into a straight line.
 */
import type { ConnectorElement, DiagramElement, Endpoint, ShapeElement, Vec } from '@/model/types';
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
export function canDragSegment(conn: ConnectorElement, points: Vec[], index: number, elements: Record<string, DiagramElement>): boolean {
  if (conn.routing !== 'orthogonal' || index < 0 || index >= points.length - 1) return false;
  if (index === 0 && endKind(conn.source, elements).kind === 'locked') return false;
  if (index === points.length - 2 && endKind(conn.target, elements).kind === 'locked') return false;
  return true;
}

/** Range an end segment can slide to while its end stays on the shape's side. */
function endRange(kind: EndKind, horizontal: boolean): [number, number] {
  if (kind.kind !== 'shape') return [-Infinity, Infinity];
  const r = kind.shape;
  return horizontal ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
}

/** The endpoint after its segment moved to `c`: attached ends become a fixed point on the same side. */
function movedEnd(e: Endpoint, kind: EndKind, at: Vec, horizontal: boolean, c: number): Endpoint {
  if (kind.kind === 'free') return horizontal ? { ...e, y: c } : { ...e, x: c };
  if (kind.kind !== 'shape') return e;
  const s = kind.shape;
  const fx = horizontal ? (at.x <= s.x + s.w / 2 ? 0 : 1) : (c - s.x) / s.w;
  const fy = horizontal ? (c - s.y) / s.h : at.y <= s.y + s.h / 2 ? 0 : 1;
  const point = { x: s.x + fx * s.w, y: s.y + fy * s.h };
  return { ...e, side: undefined, fixed: { x: s.flipH ? 1 - fx : fx, y: s.flipV ? 1 - fy : fy }, fixedOffset: undefined, ...point };
}

/**
 * Moves segment `index` of `base` (the route when the drag started) to the
 * coordinate `c` across it. Returns the connector patch, or null when the
 * segment can't go there (an end segment between shapes that don't overlap).
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
  const source = endKind(conn.source, elements);
  const target = endKind(conn.target, elements);
  let [lo, hi] = [-Infinity, Infinity];
  if (index === 0) [lo, hi] = endRange(source, horizontal);
  if (index === last) {
    const [l, h] = endRange(target, horizontal);
    lo = Math.max(lo, l);
    hi = Math.min(hi, h);
  }
  if (lo > hi) return null;
  const at = Math.min(hi, Math.max(lo, c));
  const pts = base.map((v) => ({ ...v }));
  pts[index][axis] = at;
  pts[index + 1][axis] = at;
  const patch: Partial<ConnectorElement> = { waypoints: pts.slice(1, -1) };
  if (index === 0) patch.source = movedEnd(conn.source, source, base[0], horizontal, at);
  if (index === last) patch.target = movedEnd(conn.target, target, base[base.length - 1], horizontal, at);
  return { patch, at };
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
