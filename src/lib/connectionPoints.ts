/**
 * Connection points and endpoint attachment (draw.io parity).
 *
 * - Every shape has a set of connection points, as fractions of its unrotated
 *   box: shape-defined (`ShapeDef.connectionPoints`), per-element overrides
 *   (`ShapeElement.connectionPoints`) or defaults derived from the outline.
 * - Dropping an endpoint near a point attaches it there ("fixed"); the four
 *   side midpoints keep the classic `side` attachment. Holding Shift attaches
 *   at the exact spot on the outline; elsewhere the end floats (`auto`).
 * - Endpoints can also attach to another connector at a fraction `edgeT`
 *   along its path (connect-to-edge).
 */
import type { AnchorSide, ConnectorElement, DiagramElement, Doc, Endpoint, ShapeElement, Vec } from '@/model/types';
import { isConnector } from '@/model/types';
import { center, dist, rotatePoint } from './geometry';
import { connectorGeometryInDoc } from './connectorGeometry';
import { getShapeDef } from '@/shapes/registry';

const SIDE_FRACTIONS: Record<AnchorSide, Vec> = { top: { x: 0.5, y: 0 }, right: { x: 1, y: 0.5 }, bottom: { x: 0.5, y: 1 }, left: { x: 0, y: 0.5 } };

const RECT_POINTS: Vec[] = [
  { x: 0, y: 0 }, { x: 0.25, y: 0 }, { x: 0.5, y: 0 }, { x: 0.75, y: 0 },
  { x: 1, y: 0 }, { x: 1, y: 0.25 }, { x: 1, y: 0.5 }, { x: 1, y: 0.75 },
  { x: 1, y: 1 }, { x: 0.75, y: 1 }, { x: 0.5, y: 1 }, { x: 0.25, y: 1 },
  { x: 0, y: 1 }, { x: 0, y: 0.75 }, { x: 0, y: 0.5 }, { x: 0, y: 0.25 },
];

const ELLIPSE_POINTS: Vec[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  return { x: round4(0.5 + 0.5 * Math.cos(a)), y: round4(0.5 + 0.5 * Math.sin(a)) };
});

const DIAMOND_POINTS: Vec[] = [
  { x: 0.5, y: 0 }, { x: 0.75, y: 0.25 }, { x: 1, y: 0.5 }, { x: 0.75, y: 0.75 },
  { x: 0.5, y: 1 }, { x: 0.25, y: 0.75 }, { x: 0, y: 0.5 }, { x: 0.25, y: 0.25 },
];

function round4(n: number) {
  return Math.round(n * 1e4) / 1e4;
}

/** The default connection points for a shape kind (ignores per-element overrides). */
export function defaultConnectionPoints(kind: string): Vec[] {
  const def = getShapeDef(kind);
  if (def.connectionPoints?.length) return def.connectionPoints;
  if (def.perimeter === 'ellipse') return ELLIPSE_POINTS;
  if (def.perimeter === 'diamond') return DIAMOND_POINTS;
  return RECT_POINTS;
}

/** All connection points of a shape, as fractions of its unrotated box. */
export const connectionPointsOf = (s: ShapeElement): Vec[] => s.connectionPoints ?? defaultConnectionPoints(s.kind);

/** World position of a fractional point on a shape (rotation and flips applied). */
export function fractionToWorld(s: ShapeElement, f: Vec): Vec {
  const fx = s.flipH ? 1 - f.x : f.x;
  const fy = s.flipV ? 1 - f.y : f.y;
  return rotatePoint({ x: s.x + fx * s.w, y: s.y + fy * s.h }, center(s), s.rotation ?? 0);
}

/** Inverse of `fractionToWorld`. */
export function worldToFraction(s: ShapeElement, p: Vec): Vec {
  const local = rotatePoint(p, center(s), -(s.rotation ?? 0));
  let fx = s.w ? (local.x - s.x) / s.w : 0.5;
  let fy = s.h ? (local.y - s.y) / s.h : 0.5;
  if (s.flipH) fx = 1 - fx;
  if (s.flipV) fy = 1 - fy;
  return { x: fx, y: fy };
}

/** The side a fraction coincides with when it is one of the four midpoints. */
export function sideOfFraction(f: Vec): AnchorSide | null {
  for (const side of Object.keys(SIDE_FRACTIONS) as AnchorSide[]) {
    const m = SIDE_FRACTIONS[side];
    if (Math.abs(m.x - f.x) < 1e-3 && Math.abs(m.y - f.y) < 1e-3) return side;
  }
  return null;
}

/** Nearest point on the shape's outline to `p`, as a box fraction (clamped to 0..1). */
export function outlineFraction(s: ShapeElement, p: Vec): Vec {
  const f = worldToFraction(s, p);
  const perimeter = getShapeDef(s.kind).perimeter ?? 'rect';
  const dx = f.x - 0.5;
  const dy = f.y - 0.5;
  if (perimeter === 'rect' || (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)) {
    const x = Math.min(1, Math.max(0, f.x));
    const y = Math.min(1, Math.max(0, f.y));
    // Snap to whichever edge is closest (in px, so thin shapes behave).
    const d: Array<[number, Vec]> = [
      [Math.abs(y) * s.h, { x, y: 0 }],
      [Math.abs(1 - x) * s.w, { x: 1, y }],
      [Math.abs(1 - y) * s.h, { x, y: 1 }],
      [Math.abs(x) * s.w, { x: 0, y }],
    ];
    return roundF(d.reduce((a, b) => (b[0] < a[0] ? b : a))[1]);
  }
  // Ellipse / diamond: ray from the center through the point.
  const nx = dx * s.w;
  const ny = dy * s.h;
  const rx = s.w / 2;
  const ry = s.h / 2;
  const t = perimeter === 'ellipse' ? 1 / Math.sqrt((nx * nx) / (rx * rx) + (ny * ny) / (ry * ry)) : 1 / (Math.abs(nx) / rx + Math.abs(ny) / ry);
  return roundF({ x: 0.5 + (nx * t) / s.w, y: 0.5 + (ny * t) / s.h });
}

const roundF = (f: Vec): Vec => ({ x: round4(f.x), y: round4(f.y) });

/** An endpoint attached at a fraction: side midpoints use `side`, anything else is fixed. */
export function endpointAtFraction(s: ShapeElement, f: Vec): Endpoint {
  const p = fractionToWorld(s, f);
  const side = sideOfFraction(f);
  return side ? { elementId: s.id, side, x: p.x, y: p.y } : { elementId: s.id, side: 'auto', fixed: roundF(f), x: p.x, y: p.y };
}

/**
 * Endpoint for a drop at `p` on `shape`: the nearest connection point within
 * `snap` px, else floating. With `exact` (Shift) it fixes the nearest outline point instead.
 */
export function attachToShape(shape: ShapeElement, p: Vec, snap: number, exact = false): Endpoint {
  if (exact) return endpointAtFraction(shape, outlineFraction(shape, p));
  let best: Vec | null = null;
  let bestD = snap;
  for (const f of connectionPointsOf(shape)) {
    const d = dist(fractionToWorld(shape, f), p);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best) return endpointAtFraction(shape, best);
  return { elementId: shape.id, side: 'auto', x: p.x, y: p.y };
}

/** Where an attached endpoint visibly sits on its shape (for previews). */
export function endpointPreview(shape: ShapeElement, ep: Endpoint, fallback: Vec): Vec {
  if (ep.fixed) return fractionToWorld(shape, ep.fixed);
  if (ep.side && ep.side !== 'auto') return fractionToWorld(shape, SIDE_FRACTIONS[ep.side]);
  return fallback;
}

// ---------------------------------------------------------------------------
// Connect to edges
// ---------------------------------------------------------------------------

/** Closest point on a polyline: fraction along its length, the point and its distance. */
export function projectOnPolyline(pts: Vec[], p: Vec): { t: number; point: Vec; d: number } {
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    lens.push(dist(pts[i - 1], pts[i]));
    total += lens[i - 1];
  }
  let best = { d: Infinity, along: 0, point: pts[0] ?? p };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = lens[i - 1];
    const k = l ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l * l))) : 0;
    const q = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    const d = dist(p, q);
    if (d < best.d) best = { d, along: acc + k * l, point: q };
    acc += l;
  }
  return { t: total ? best.along / total : 0.5, point: best.point, d: best.d };
}

/** Connectors that (directly or through other connectors) attach to `id` — attaching `id` to them would loop. */
export function dependentConnectors(doc: Doc, id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const oid of doc.order) {
      const el = doc.elements[oid];
      if (!isConnector(el) || out.has(oid)) continue;
      if ((el.source.elementId && out.has(el.source.elementId)) || (el.target.elementId && out.has(el.target.elementId))) {
        out.add(oid);
        grew = true;
      }
    }
  }
  return out;
}

/** Topmost connector passing within `tolerance` of `p` (excluding `exclude`), with the fraction along it. */
export function connectorAtPoint(
  doc: Doc,
  p: Vec,
  tolerance: number,
  exclude: Set<string> = new Set(),
  usable: (el: DiagramElement) => boolean = () => true,
): { conn: ConnectorElement; t: number; point: Vec } | null {
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const el = doc.elements[doc.order[i]];
    if (!isConnector(el) || exclude.has(el.id) || !usable(el)) continue;
    const g = connectorGeometryInDoc(el, doc.elements);
    const hit = projectOnPolyline(g.samples, p);
    if (hit.d <= tolerance) return { conn: el, t: Math.round(hit.t * 1e4) / 1e4, point: hit.point };
  }
  return null;
}

/** Endpoint attached to a connector at fraction `t`. */
export const endpointOnEdge = (conn: ConnectorElement, t: number, at: Vec): Endpoint => ({ elementId: conn.id, edgeT: t, x: at.x, y: at.y });
