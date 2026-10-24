/**
 * Turns a connector + its attached shapes into concrete drawable geometry:
 * the route, the SVG path, arrowhead placement and the label position.
 * Pure function — used by the canvas, hit-testing and all exporters.
 *
 * Supports rotated shapes, manual waypoints, several routing styles
 * (orthogonal A*, straight, curved, elbow, entity-relation, isometric) and
 * line jumps where connectors cross.
 */
import type { AnchorSide, ArrowHead, ConnectorElement, DiagramElement, Endpoint, Rect, ShapeElement, Vec } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import {
  anchorPoint, axisDirection, center, dist, normalize, pointAlongPolyline, rotatePoint, rotateVec, rotatedBounds,
  segmentIntersection, SIDE_NORMALS, sideFacing, snapToAxis, sub,
} from './geometry';
import { routeOrthogonal, simplify, type RouteEnd } from './routing';

export type Lookup = (id: string) => DiagramElement | undefined;

export interface ConnectorGeometry {
  /** Route points (polyline). For curves: the sampled curve. */
  points: Vec[];
  path: string;
  start: Vec;
  end: Vec;
  /** Direction of travel arriving at each end (unit vectors pointing *into* the tip). */
  startDir: Vec;
  endDir: Vec;
  label: Vec;
  /** Samples along the path, used for hit-testing, jumps and animation. */
  samples: Vec[];
  /** Whether the route is a polyline (segment handles make sense). */
  polyline: boolean;
}

/** Unrotated bounds of a shape. */
export const rectOf = (s: ShapeElement): Rect => ({ x: s.x, y: s.y, w: s.w, h: s.h });
/** Visual bounds (rotation-aware), used for obstacles and hit regions. */
export const boundsOf = (s: ShapeElement): Rect => rotatedBounds(s);

/** Point on a shape's outline in the direction of `toward` (for straight "auto" connectors). */
export function perimeterPoint(s: ShapeElement, toward: Vec): Vec {
  const c = center(rectOf(s));
  const local = rotatePoint(toward, c, -(s.rotation ?? 0));
  const d = sub(local, c);
  if (Math.abs(d.x) < 1e-6 && Math.abs(d.y) < 1e-6) return c;
  const rx = s.w / 2;
  const ry = s.h / 2;
  const kind = getShapeDef(s.kind).perimeter ?? 'rect';
  let t: number;
  if (kind === 'ellipse') {
    t = 1 / Math.sqrt((d.x * d.x) / (rx * rx) + (d.y * d.y) / (ry * ry));
  } else if (kind === 'diamond') {
    t = 1 / (Math.abs(d.x) / rx + Math.abs(d.y) / ry);
  } else {
    t = Math.min(Math.abs(d.x) > 1e-6 ? rx / Math.abs(d.x) : Infinity, Math.abs(d.y) > 1e-6 ? ry / Math.abs(d.y) : Infinity);
  }
  return rotatePoint({ x: c.x + d.x * t, y: c.y + d.y * t }, c, s.rotation ?? 0);
}

function shapeAt(e: Endpoint, lookup: Lookup): ShapeElement | undefined {
  if (!e.elementId) return undefined;
  const el = lookup(e.elementId);
  return el?.type === 'shape' ? el : undefined;
}

type EndMode = 'perimeter' | 'side' | 'horizontal';

/** Connector-to-connector attachments resolve recursively; this caps the chain (and breaks cycles). */
const MAX_EDGE_DEPTH = 4;
let edgeDepth = 0;

/** The connector an endpoint is attached to (connect-to-edge), if any. */
function edgeAt(e: Endpoint, lookup: Lookup, self: string): ConnectorElement | undefined {
  if (!e.elementId || e.elementId === self) return undefined;
  const el = lookup(e.elementId);
  return el?.type === 'connector' ? el : undefined;
}

/** Point `edgeT` along another connector's path. */
function edgeEnd(e: Endpoint, edge: ConnectorElement, lookup: Lookup, otherRef: Vec): RouteEnd {
  const fallback = { x: e.x, y: e.y };
  let point = fallback;
  if (edgeDepth < MAX_EDGE_DEPTH) {
    edgeDepth++;
    try {
      point = pointAlongPolyline(connectorGeometry(edge, lookup).samples, Math.min(1, Math.max(0, e.edgeT ?? 0.5)));
    } finally {
      edgeDepth--;
    }
  }
  return { point, dir: axisDirection(point, otherRef), rect: null };
}

/** The side whose edge is nearest to a point given as box fractions. */
function nearestSide(fx: number, fy: number): AnchorSide {
  const d: Array<[AnchorSide, number]> = [['top', fy], ['right', 1 - fx], ['bottom', 1 - fy], ['left', fx]];
  return d.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
}

/** Fixed connection point (mxGraph exitX/exitY + exitDx/exitDy) → world point + outward direction. */
function fixedEnd(e: Endpoint, shape: ShapeElement, mode: EndMode): { point: Vec; dir: Vec } {
  const f = e.fixed!;
  const fx = shape.flipH ? 1 - f.x : f.x;
  const fy = shape.flipV ? 1 - f.y : f.y;
  const rect = rectOf(shape);
  const c = center(rect);
  const deg = shape.rotation ?? 0;
  const local = { x: rect.x + fx * rect.w + (e.fixedOffset?.x ?? 0), y: rect.y + fy * rect.h + (e.fixedOffset?.y ?? 0) };
  const point = rotatePoint(local, c, deg);
  let side = nearestSide(fx, fy);
  if (mode === 'horizontal' && (side === 'top' || side === 'bottom')) side = fx >= 0.5 ? 'right' : 'left';
  const normal = rotateVec(SIDE_NORMALS[side], deg);
  // Fixed points leave perpendicular to their side.
  return { point, dir: mode === 'perimeter' ? normalize(normal) : snapToAxis(normal) };
}

function resolveEnd(e: Endpoint, shape: ShapeElement | undefined, otherRef: Vec, mode: EndMode, spacing = 0): RouteEnd {
  const end = resolveEndRaw(e, shape, otherRef, mode);
  // Perimeter spacing: keep a gap between the shape and the connector end.
  if (!spacing || !end.rect) return end;
  return { ...end, point: { x: end.point.x + end.dir.x * spacing, y: end.point.y + end.dir.y * spacing } };
}

function resolveEndRaw(e: Endpoint, shape: ShapeElement | undefined, otherRef: Vec, mode: EndMode): RouteEnd {
  if (!shape) return { point: { x: e.x, y: e.y }, dir: axisDirection({ x: e.x, y: e.y }, otherRef), rect: null };
  const rect = rectOf(shape);
  const c = center(rect);
  const deg = shape.rotation ?? 0;
  const bounds = rotatedBounds(shape);
  if (e.fixed) return { ...fixedEnd(e, shape, mode), rect: bounds };
  if (mode === 'perimeter' && (!e.side || e.side === 'auto')) {
    const p = perimeterPoint(shape, otherRef);
    return { point: p, dir: normalize(sub(otherRef, c)), rect: bounds };
  }
  const localOther = rotatePoint(otherRef, c, -deg);
  let side = !e.side || e.side === 'auto' ? sideFacing(rect, localOther) : e.side;
  if (mode === 'horizontal' && (side === 'top' || side === 'bottom')) side = localOther.x >= c.x ? 'right' : 'left';
  const point = rotatePoint(anchorPoint(rect, side), c, deg);
  const normal = rotateVec(SIDE_NORMALS[side], deg);
  return { point, dir: mode === 'perimeter' ? normalize(normal) : snapToAxis(normal), rect: bounds };
}

const modeFor = (conn: ConnectorElement): EndMode =>
  conn.routing === 'straight' || conn.routing === 'curved' ? 'perimeter' : conn.routing === 'entity' ? 'horizontal' : 'side';

/** Where each end currently sits (cheap — no routing). */
export function endpointPositions(conn: ConnectorElement, lookup: Lookup) {
  const sShape = shapeAt(conn.source, lookup);
  const tShape = shapeAt(conn.target, lookup);
  const wps = conn.waypoints ?? [];
  // Each end aims at the nearest waypoint (or the other end).
  const sRef = wps[0] ?? (tShape ? center(rectOf(tShape)) : conn.target);
  const tRef = wps[wps.length - 1] ?? (sShape ? center(rectOf(sShape)) : conn.source);
  const mode = modeFor(conn);
  const sEdge = sShape ? undefined : edgeAt(conn.source, lookup, conn.id);
  const tEdge = tShape ? undefined : edgeAt(conn.target, lookup, conn.id);
  const spacing = conn.perimeterSpacing ?? 0;
  return {
    a: sEdge ? edgeEnd(conn.source, sEdge, lookup, sRef) : resolveEnd(conn.source, sShape, sRef, mode, spacing),
    b: tEdge ? edgeEnd(conn.target, tEdge, lookup, tRef) : resolveEnd(conn.target, tShape, tRef, mode, spacing),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const STUB = 20;

/** Whether `q` lies straight out of an attached end, along its exit direction. */
function straightAhead(end: RouteEnd, q: Vec | undefined): boolean {
  if (!q) return false;
  const aligned = end.dir.x !== 0 ? Math.abs(q.y - end.point.y) < 0.5 : Math.abs(q.x - end.point.x) < 0.5;
  return aligned && (q.x - end.point.x) * end.dir.x + (q.y - end.point.y) * end.dir.y > 0;
}

/**
 * Orthogonal path through waypoints: each hop is an L. Attached ends first
 * leave their shape by a short stub, unless the next point already lies
 * straight ahead (then the route goes there directly, without overshooting).
 */
function orthoThrough(a: RouteEnd, b: RouteEnd, wps: Vec[]): Vec[] {
  const a1 = a.rect && !straightAhead(a, wps[0]) ? { x: a.point.x + a.dir.x * STUB, y: a.point.y + a.dir.y * STUB } : a.point;
  const b1 = b.rect && !straightAhead(b, wps[wps.length - 1]) ? { x: b.point.x + b.dir.x * STUB, y: b.point.y + b.dir.y * STUB } : b.point;
  const pts: Vec[] = [a.point, a1];
  let horizontal = a.dir.x !== 0;
  for (const q of [...wps, b1]) {
    const p = pts[pts.length - 1];
    if (p.x === q.x || p.y === q.y) {
      pts.push(q);
      horizontal = p.y === q.y;
      continue;
    }
    pts.push(horizontal ? { x: q.x, y: p.y } : { x: p.x, y: q.y }, q);
    horizontal = !horizontal;
  }
  pts.push(b.point);
  return simplify(pts);
}

function elbow(a: RouteEnd, b: RouteEnd, vertical: boolean, wp?: Vec): Vec[] {
  if (vertical) {
    const my = wp?.y ?? (a.point.y + b.point.y) / 2;
    return simplify([a.point, { x: a.point.x, y: my }, { x: b.point.x, y: my }, b.point]);
  }
  const mx = wp?.x ?? (a.point.x + b.point.x) / 2;
  return simplify([a.point, { x: mx, y: a.point.y }, { x: mx, y: b.point.y }, b.point]);
}

function entityRoute(a: RouteEnd, b: RouteEnd): Vec[] {
  const seg = 30;
  const a1 = { x: a.point.x + a.dir.x * seg, y: a.point.y };
  const b1 = { x: b.point.x + b.dir.x * seg, y: b.point.y };
  const mx = (a1.x + b1.x) / 2;
  return simplify([a.point, a1, { x: mx, y: a1.y }, { x: mx, y: b1.y }, b1, b.point]);
}

function isometricRoute(a: RouteEnd, b: RouteEnd): Vec[] {
  const tan30 = Math.tan(Math.PI / 6);
  const dx = b.point.x - a.point.x;
  const dy = b.point.y - a.point.y;
  const p1 = { x: b.point.x, y: a.point.y + Math.abs(dx) * tan30 * (Math.sign(dy) || 1) };
  return simplify([a.point, p1, b.point]);
}

function sampleCubic(p0: Vec, p1: Vec, p2: Vec, p3: Vec, n = 24): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

/** Catmull-Rom spline through points → cubic Bézier path + samples. */
function splineThrough(pts: Vec[]): { d: string; samples: Vec[]; c1: Vec; c2: Vec } {
  let d = `M${pts[0].x},${pts[0].y}`;
  const samples: Vec[] = [pts[0]];
  let firstC = pts[1];
  let lastC = pts[pts.length - 2];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    if (i === 0) firstC = c1;
    if (i === pts.length - 2) lastC = c2;
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
    samples.push(...sampleCubic(p1, c1, c2, p2, 12).slice(1));
  }
  return { d, samples, c1: firstC, c2: lastC };
}

/**
 * SVG path for a polyline with softly rounded corners and optional line jumps
 * (small arcs where other connectors cross underneath).
 */
export function polylinePath(points: Vec[], radius: number, jumps: Vec[] = [], jumpStyle: 'arc' | 'gap' | 'sharp' = 'arc', jumpSize = 6): string {
  if (points.length < 2) return '';
  const J = Math.max(1, jumpSize);
  let d = `M${points[0].x},${points[0].y}`;
  // A straight run from `from` to `to`, inserting the jumps that lie on it.
  const run = (from: Vec, to: Vec) => {
    const len = dist(from, to);
    if (!jumps.length || len < J * 3) {
      d += ` L${to.x},${to.y}`;
      return;
    }
    const dir = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
    const onSeg = jumps
      .map((j) => ({ j, t: (j.x - from.x) * dir.x + (j.y - from.y) * dir.y }))
      .filter(({ j, t }) => t > J && t < len - J && Math.abs((j.x - from.x) * dir.y - (j.y - from.y) * dir.x) < 0.5)
      .sort((p, q) => p.t - q.t);
    for (const { t } of onSeg) {
      const s = { x: from.x + dir.x * (t - J), y: from.y + dir.y * (t - J) };
      const e = { x: from.x + dir.x * (t + J), y: from.y + dir.y * (t + J) };
      d += ` L${s.x},${s.y}`;
      if (jumpStyle === 'gap') d += ` M${e.x},${e.y}`;
      else if (jumpStyle === 'sharp') {
        const n = { x: dir.y, y: -dir.x };
        d += ` L${(s.x + e.x) / 2 + n.x * J},${(s.y + e.y) / 2 + n.y * J} L${e.x},${e.y}`;
      } else d += ` A${J},${J} 0 0 1 ${e.x},${e.y}`;
    }
    d += ` L${to.x},${to.y}`;
  };
  let cur = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p = points[i];
    const p1 = points[i + 1];
    const r = Math.min(radius, dist(p0, p) / 2, dist(p, p1) / 2);
    const inDir = normalize(sub(p, p0));
    const outDir = normalize(sub(p1, p));
    run(cur, { x: p.x - inDir.x * r, y: p.y - inDir.y * r });
    const after = { x: p.x + outDir.x * r, y: p.y + outDir.y * r };
    d += r > 0 ? ` Q${p.x},${p.y} ${after.x},${after.y}` : ` L${p.x},${p.y}`;
    cur = r > 0 ? after : p;
  }
  run(cur, points[points.length - 1]);
  return d;
}

export function connectorGeometry(conn: ConnectorElement, lookup: Lookup, obstacles: Rect[] = [], jumps: Vec[] = []): ConnectorGeometry {
  const { a, b } = endpointPositions(conn, lookup);
  const startInset = arrowInset(conn.startArrow, conn.style.strokeWidth, conn.startSize);
  const endInset = arrowInset(conn.endArrow, conn.style.strokeWidth, conn.endSize);
  const wps = conn.waypoints ?? [];

  if (conn.routing === 'curved') {
    let samples: Vec[];
    let d: string;
    let c1: Vec;
    let c2: Vec;
    if (wps.length) {
      ({ samples, d, c1, c2 } = splineThrough([a.point, ...wps, b.point]));
    } else {
      const k = Math.max(40, dist(a.point, b.point) * 0.4);
      c1 = { x: a.point.x + a.dir.x * k, y: a.point.y + a.dir.y * k };
      c2 = { x: b.point.x + b.dir.x * k, y: b.point.y + b.dir.y * k };
      samples = sampleCubic(a.point, c1, c2, b.point);
      d = '';
    }
    const startDir = normalize(sub(a.point, c1));
    const endDir = normalize(sub(b.point, c2));
    if (!wps.length) {
      const s = shorten(a.point, startDir, startInset);
      const e = shorten(b.point, endDir, endInset);
      d = `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`;
    }
    return { points: samples, path: d, start: a.point, end: b.point, startDir, endDir, label: labelPoint(conn, samples), samples, polyline: false };
  }

  let points: Vec[];
  switch (conn.routing) {
    case 'straight':
      points = [a.point, ...wps, b.point];
      break;
    case 'elbow-h':
    case 'elbow-v':
      points = elbow(a, b, conn.routing === 'elbow-v', wps[0]);
      break;
    case 'entity':
      points = entityRoute(a, b);
      break;
    case 'isometric':
      points = isometricRoute(a, b);
      break;
    default:
      points = wps.length ? orthoThrough(a, b, wps) : routeOrthogonal(a, b, obstacles);
  }
  const n = points.length;
  const startDir = normalize(sub(points[0], points[1]));
  const endDir = normalize(sub(points[n - 1], points[n - 2]));
  const drawn = points.slice();
  drawn[0] = shorten(points[0], startDir, startInset);
  drawn[n - 1] = shorten(points[n - 1], endDir, endInset);
  const jumpStyle = conn.lineJumps && conn.lineJumps !== 'none' ? conn.lineJumps : 'arc';
  return {
    points,
    path: polylinePath(drawn, conn.routing === 'straight' ? 0 : (conn.style.radius ?? 10), jumps, jumpStyle, conn.jumpSize),
    start: points[0],
    end: points[n - 1],
    startDir,
    endDir,
    label: labelPoint(conn, points),
    samples: points,
    polyline: true,
  };
}

/** Label anchor: `labelT` along the path, offset perpendicular by `labelOffset`. */
function labelPoint(conn: ConnectorElement, pts: Vec[]): Vec {
  return labelAt(pts, conn.labelT ?? 0.5, conn.labelOffset);
}

/** Point `t` (0..1) along a path, pushed `offset` px perpendicular to it (main and extra labels). */
export function labelAt(pts: Vec[], t: number, offset?: number): Vec {
  const p = pointAlongPolyline(pts, t);
  if (!offset) return p;
  const q = pointAlongPolyline(pts, Math.min(1, t + 0.01));
  const r = pointAlongPolyline(pts, Math.max(0, t - 0.01));
  const dir = normalize(sub(q, r));
  return { x: p.x - dir.y * offset, y: p.y + dir.x * offset };
}

/** Crossing points per connector (line jumps): a connector jumps over those drawn beneath it. */
export function computeJumps(order: string[], elements: Record<string, DiagramElement>): Map<string, Vec[]> {
  const out = new Map<string, Vec[]>();
  const conns = order.map((id) => elements[id]).filter((e): e is ConnectorElement => e?.type === 'connector');
  if (!conns.some((c) => c.lineJumps && c.lineJumps !== 'none')) return out;
  const geos = new Map(conns.map((c) => [c.id, connectorGeometryInDoc(c, elements).samples]));
  conns.forEach((c, i) => {
    if (!c.lineJumps || c.lineJumps === 'none') return;
    const mine = geos.get(c.id)!;
    const hits: Vec[] = [];
    for (let k = 0; k < i; k++) {
      const other = geos.get(conns[k].id)!;
      for (let s = 1; s < mine.length; s++) {
        for (let o = 1; o < other.length; o++) {
          const x = segmentIntersection(mine[s - 1], mine[s], other[o - 1], other[o]);
          if (x) hits.push(x);
        }
      }
    }
    if (hits.length) out.set(c.id, hits);
  });
  return out;
}

/**
 * Shapes an orthogonal connector should steer around: those near the straight
 * span between its ends, excluding its own endpoints, containers (routes are
 * meant to cross those) and anything that contains an endpoint.
 */
export function routeObstacles(conn: ConnectorElement, shapes: Iterable<ShapeElement>, lookup: Lookup): ShapeElement[] {
  if (conn.routing !== 'orthogonal') return [];
  const src = shapeAt(conn.source, lookup);
  const tgt = shapeAt(conn.target, lookup);
  const pts = [src ? rectOf(src) : { x: conn.source.x, y: conn.source.y, w: 0, h: 0 }, tgt ? rectOf(tgt) : { x: conn.target.x, y: conn.target.y, w: 0, h: 0 }];
  const pad = 60;
  const x1 = Math.min(pts[0].x, pts[1].x) - pad;
  const y1 = Math.min(pts[0].y, pts[1].y) - pad;
  const x2 = Math.max(pts[0].x + pts[0].w, pts[1].x + pts[1].w) + pad;
  const y2 = Math.max(pts[0].y + pts[0].h, pts[1].y + pts[1].h) + pad;
  const out: ShapeElement[] = [];
  for (const s of shapes) {
    if (s.id === src?.id || s.id === tgt?.id || s.kind === 'text') continue;
    const sb = rotatedBounds(s);
    if (sb.x > x2 || sb.x + sb.w < x1 || sb.y > y2 || sb.y + sb.h < y1) continue;
    const def = getShapeDef(s.kind);
    if (def.container) continue;
    const contains = (e?: ShapeElement) => !!e && e.x >= s.x && e.y >= s.y && e.x + e.w <= s.x + s.w && e.y + e.h <= s.y + s.h;
    if (contains(src) || contains(tgt)) continue;
    out.push(s);
    if (out.length >= 24) break;
  }
  return out;
}

/** Geometry using the whole document for obstacle avoidance (exports, overlays, bounds). */
export function connectorGeometryInDoc(conn: ConnectorElement, elements: Record<string, DiagramElement>): ConnectorGeometry {
  const lookup: Lookup = (id) => elements[id];
  const shapes = Object.values(elements).filter((e): e is ShapeElement => e.type === 'shape');
  return connectorGeometry(conn, lookup, routeObstacles(conn, shapes, lookup).map(boundsOf));
}

/** Pull a path end back from the tip so filled/hollow arrowheads aren't overdrawn. */
const shorten = (tip: Vec, dirIntoTip: Vec, by: number): Vec => ({ x: tip.x - dirIntoTip.x * by, y: tip.y - dirIntoTip.y * by });

// ---------------------------------------------------------------------------
// Arrowheads
// ---------------------------------------------------------------------------

/** Arrowhead length in px. `size` is mxGraph's startSize/endSize (default 6). */
export const arrowSize = (strokeWidth: number, size?: number) => (size ?? 6) * 1.5 + strokeWidth * 2;

/** Heads with a closed outline, which can be drawn filled or hollow. */
const FILLABLE = new Set<ArrowHead>([
  'triangle', 'triangleOpen', 'diamond', 'diamondOpen', 'circle', 'circleOpen', 'box', 'boxOpen', 'async',
  'classic', 'classicThin', 'blockThin', 'diamondThin', 'doubleBlock',
]);
const HOLLOW_BY_DEFAULT = new Set<ArrowHead>(['triangleOpen', 'diamondOpen', 'circleOpen', 'boxOpen']);

export const arrowFillable = (kind: ArrowHead) => FILLABLE.has(kind);
/** Whether a head is drawn filled, honoring the per-end override. */
export const arrowFilled = (kind: ArrowHead, override?: boolean) => FILLABLE.has(kind) && (override ?? !HOLLOW_BY_DEFAULT.has(kind));

export function arrowInset(kind: ArrowHead, strokeWidth: number, size?: number): number {
  const s = arrowSize(strokeWidth, size);
  switch (kind) {
    case 'triangle':
    case 'triangleOpen':
    case 'blockThin':
    case 'async':
    case 'circlePlus':
      return s;
    case 'classic':
    case 'classicThin':
      return s * 0.7;
    case 'diamond':
    case 'diamondOpen':
    case 'diamondThin':
      return s * 1.6;
    case 'circle':
    case 'circleOpen':
      return s * 0.8;
    case 'box':
    case 'boxOpen':
      return s * 0.7;
    case 'halfCircle':
      return s * 0.5;
    case 'doubleBlock':
      return s * 2;
    default:
      return 0;
  }
}

export interface ArrowPart {
  d: string;
  /** solid = stroke color, paper = white knock-out, none = outline only */
  fill: 'solid' | 'paper' | 'none';
}

/**
 * Builds arrowhead geometry at `tip`, with `dir` pointing into the tip.
 * `size` is mxGraph's marker size (default 6); `fill` overrides filled/hollow for closed heads.
 */
export function arrowParts(kind: ArrowHead, tip: Vec, dir: Vec, strokeWidth: number, size?: number, fill?: boolean): ArrowPart[] {
  const parts = arrowShape(kind, tip, dir, arrowSize(strokeWidth, size));
  if (fill === undefined || !FILLABLE.has(kind)) return parts;
  return parts.map((p) => (p.fill === 'paper' ? p : { ...p, fill: fill ? 'solid' : 'none' }));
}

function arrowShape(kind: ArrowHead, tip: Vec, dir: Vec, s: number): ArrowPart[] {
  if (kind === 'none') return [];
  const n = { x: -dir.y, y: dir.x }; // perpendicular
  const at = (back: number, side: number): Vec => ({
    x: tip.x - dir.x * back + n.x * side,
    y: tip.y - dir.y * back + n.y * side,
  });
  const P = (v: Vec) => `${v.x},${v.y}`;
  const line = (p: Vec, q: Vec) => `M${P(p)} L${P(q)}`;
  const circle = (c: Vec, r: number) => `M${c.x - r},${c.y} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
  const tri = (back: number, half: number, from = 0) => `M${P(at(from, 0))} L${P(at(from + back, half))} L${P(at(from + back, -half))} Z`;

  switch (kind) {
    case 'arrow':
      return [{ d: `M${P(at(s, s * 0.5))} L${P(tip)} L${P(at(s, -s * 0.5))}`, fill: 'none' }];
    case 'openThin':
      return [{ d: `M${P(at(s, s * 0.3))} L${P(tip)} L${P(at(s, -s * 0.3))}`, fill: 'none' }];
    case 'triangle':
    case 'triangleOpen':
      return [{ d: tri(s, s * 0.5), fill: kind === 'triangle' ? 'solid' : 'none' }];
    case 'blockThin':
      return [{ d: tri(s, s * 0.3), fill: 'solid' }];
    case 'classic':
    case 'classicThin': {
      const half = kind === 'classic' ? s * 0.5 : s * 0.3;
      return [{ d: `M${P(tip)} L${P(at(s, half))} L${P(at(s * 0.7, 0))} L${P(at(s, -half))} Z`, fill: 'solid' }];
    }
    case 'doubleBlock':
      return [
        { d: tri(s, s * 0.5), fill: 'solid' },
        { d: tri(s, s * 0.5, s), fill: 'solid' },
      ];
    case 'diamond':
    case 'diamondOpen':
    case 'diamondThin': {
      const l = s * 1.6;
      const half = kind === 'diamondThin' ? s * 0.25 : s * 0.45;
      return [
        { d: `M${P(tip)} L${P(at(l / 2, half))} L${P(at(l, 0))} L${P(at(l / 2, -half))} Z`, fill: kind === 'diamondOpen' ? 'none' : 'solid' },
      ];
    }
    case 'circle':
    case 'circleOpen':
      return [{ d: circle(at(s * 0.4, 0), s * 0.4), fill: kind === 'circle' ? 'solid' : 'none' }];
    case 'circlePlus': {
      const r = s * 0.5;
      const c = at(r, 0);
      return [
        { d: circle(c, r), fill: 'paper' },
        { d: `${line(at(r, r), at(r, -r))} ${line(at(0, 0), at(2 * r, 0))}`, fill: 'none' },
      ];
    }
    case 'halfCircle': {
      // A socket: semicircle around the tip, open away from the line.
      const r = s * 0.5;
      const pts: Vec[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 12;
        pts.push(at(r * Math.cos(a), r * Math.sin(a)));
      }
      return [{ d: `M${pts.map(P).join(' L')}`, fill: 'none' }];
    }
    case 'dash':
      return [{ d: line(at(s * 0.65, s * 0.5), at(s * 0.15, -s * 0.5)), fill: 'none' }];
    case 'cross': {
      const c = s * 0.55;
      const r = s * 0.32;
      return [{ d: `${line(at(c - r, r), at(c + r, -r))} ${line(at(c - r, -r), at(c + r, r))}`, fill: 'none' }];
    }
    case 'halfArrow':
      return [{ d: `M${P(at(s, s * 0.5))} L${P(tip)}`, fill: 'none' }];
    case 'async':
      return [{ d: `M${P(tip)} L${P(at(s, s * 0.5))} L${P(at(s, 0))} Z`, fill: 'solid' }];
    case 'box':
    case 'boxOpen': {
      const b = s * 0.7;
      return [{ d: `M${P(at(0, b / 2))} L${P(at(b, b / 2))} L${P(at(b, -b / 2))} L${P(at(0, -b / 2))} Z`, fill: kind === 'box' ? 'solid' : 'none' }];
    }
    case 'erOne':
      return [{ d: line(at(s * 0.7, s * 0.55), at(s * 0.7, -s * 0.55)), fill: 'none' }];
    case 'erOnlyOne':
      return [
        { d: line(at(s * 0.6, s * 0.55), at(s * 0.6, -s * 0.55)), fill: 'none' },
        { d: line(at(s * 1.0, s * 0.55), at(s * 1.0, -s * 0.55)), fill: 'none' },
      ];
    case 'erMany':
      return [{ d: `M${P(at(0, s * 0.6))} L${P(at(s, 0))} L${P(at(0, -s * 0.6))}`, fill: 'none' }];
    case 'erOneMany':
      return [
        { d: `M${P(at(0, s * 0.6))} L${P(at(s, 0))} L${P(at(0, -s * 0.6))}`, fill: 'none' },
        { d: line(at(s * 1.25, s * 0.55), at(s * 1.25, -s * 0.55)), fill: 'none' },
      ];
    case 'erZeroMany':
      return [
        { d: `M${P(at(0, s * 0.6))} L${P(at(s, 0))} L${P(at(0, -s * 0.6))}`, fill: 'none' },
        { d: circle(at(s * 1.5, 0), s * 0.38), fill: 'paper' },
      ];
    case 'erZeroOne':
      return [
        { d: line(at(s * 0.6, s * 0.55), at(s * 0.6, -s * 0.55)), fill: 'none' },
        { d: circle(at(s * 1.3, 0), s * 0.38), fill: 'paper' },
      ];
    default:
      return [];
  }
}

export const ARROW_LABELS: Record<ArrowHead, string> = {
  none: 'None',
  arrow: 'Open',
  openThin: 'Open thin',
  triangle: 'Block',
  triangleOpen: 'Open block',
  blockThin: 'Block thin',
  classic: 'Classic',
  classicThin: 'Classic thin',
  doubleBlock: 'Double block',
  diamond: 'Diamond',
  diamondOpen: 'Open diamond',
  diamondThin: 'Diamond thin',
  circle: 'Oval',
  circleOpen: 'Open oval',
  circlePlus: 'Circle plus',
  halfCircle: 'Half circle',
  erOne: 'ER one',
  erOnlyOne: 'ER mandatory one',
  erMany: 'ER many',
  erOneMany: 'ER one or many',
  erZeroMany: 'ER zero or many',
  erZeroOne: 'ER zero or one',
  dash: 'Dash',
  cross: 'Cross',
  halfArrow: 'Half arrow (open async)',
  async: 'Async',
  box: 'Box',
  boxOpen: 'Open box',
};

/** Picker order (mxGraph's marker menu, roughly). */
export const ARROW_ORDER: ArrowHead[] = [
  'none', 'classic', 'classicThin', 'triangle', 'blockThin', 'arrow', 'openThin', 'doubleBlock',
  'triangleOpen', 'async', 'halfArrow', 'dash', 'cross', 'circle', 'circleOpen', 'circlePlus',
  'halfCircle', 'diamond', 'diamondThin', 'diamondOpen', 'box', 'boxOpen',
  'erOne', 'erOnlyOne', 'erMany', 'erOneMany', 'erZeroOne', 'erZeroMany',
];
