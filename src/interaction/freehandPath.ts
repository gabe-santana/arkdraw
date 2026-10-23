/**
 * Pure geometry for freehand strokes: point simplification (Ramer–Douglas–
 * Peucker), Catmull-Rom → cubic Bézier fitting for a smooth path, and a
 * variable-width outline for pressure-sensitive strokes. No store or React
 * imports, so the shape registry can use it directly.
 */
import type { Vec } from '@/model/types';

/** A stroke point; `p` is pen pressure 0..1 when it was recorded. */
export type StrokePoint = Vec & { p?: number };

const sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: Vec) => Math.hypot(v.x, v.y);

function perpDist(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l = len(ab);
  if (!l) return len(sub(p, a));
  return Math.abs(ab.x * (a.y - p.y) - ab.y * (a.x - p.x)) / l;
}

/** Ramer–Douglas–Peucker: drops points closer than `epsilon` to the simplified line. */
export function simplify<T extends Vec>(pts: T[], epsilon: number): T[] {
  if (pts.length < 3 || epsilon <= 0) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let bestD = epsilon;
    for (let i = a + 1; i < b; i++) {
      const d = perpDist(pts[i], pts[a], pts[b]);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplification tolerance (px) for a 0..1 smoothing amount. */
export const smoothingTolerance = (smoothing: number) => 0.25 + Math.max(0, Math.min(1, smoothing)) * 3.75;

/** Catmull-Rom control points for the segment P[i] → P[i+1] (tension 0.5, uniform). */
function controls(P: Vec[], i: number): [Vec, Vec] {
  const p0 = P[i - 1] ?? P[i];
  const p1 = P[i];
  const p2 = P[i + 1];
  const p3 = P[i + 2] ?? p2;
  return [
    { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  ];
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Smooth SVG path through every point. */
export function smoothPath(P: Vec[]): string {
  if (!P.length) return '';
  let d = `M${f(P[0].x)},${f(P[0].y)}`;
  if (P.length === 2) return `${d} L${f(P[1].x)},${f(P[1].y)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const [c1, c2] = controls(P, i);
    d += ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(P[i + 1].x)},${f(P[i + 1].y)}`;
  }
  return d;
}

/** Points along the smooth curve (with interpolated pressure), `steps` per segment. */
export function sampleCurve(P: StrokePoint[], steps = 8): StrokePoint[] {
  if (P.length < 3) return P.slice();
  const out: StrokePoint[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [c1, c2] = controls(P, i);
    const a = P[i];
    const b = P[i + 1];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push({
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
        p: (a.p ?? 0.5) * u + (b.p ?? 0.5) * t,
      });
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

/** Stroke width at a given pressure (0.5 = nominal width). */
export const pressureWidth = (width: number, p = 0.5) => width * (0.3 + 1.4 * Math.max(0, Math.min(1, p)));

/** True when the points carry pressure that actually varies. */
export function hasPressure(P: StrokePoint[]): boolean {
  let lo = 1;
  let hi = 0;
  for (const q of P) {
    if (q.p === undefined) return false;
    lo = Math.min(lo, q.p);
    hi = Math.max(hi, q.p);
  }
  return P.length > 1 && hi - lo > 0.04;
}

/** Filled outline of a variable-width stroke (round caps). */
export function pressureOutline(P: StrokePoint[], width: number): string {
  const S = sampleCurve(P);
  if (S.length < 2) return '';
  const left: Vec[] = [];
  const right: Vec[] = [];
  const radii: number[] = [];
  for (let i = 0; i < S.length; i++) {
    const a = S[Math.max(0, i - 1)];
    const b = S[Math.min(S.length - 1, i + 1)];
    const t = sub(b, a);
    const l = len(t) || 1;
    const n = { x: -t.y / l, y: t.x / l };
    const r = pressureWidth(width, S[i].p) / 2;
    radii.push(r);
    left.push({ x: S[i].x + n.x * r, y: S[i].y + n.y * r });
    right.push({ x: S[i].x - n.x * r, y: S[i].y - n.y * r });
  }
  const last = S.length - 1;
  let d = `M${f(left[0].x)},${f(left[0].y)}`;
  for (let i = 1; i <= last; i++) d += ` L${f(left[i].x)},${f(left[i].y)}`;
  d += ` A${f(radii[last])},${f(radii[last])} 0 0 0 ${f(right[last].x)},${f(right[last].y)}`;
  for (let i = last - 1; i >= 0; i--) d += ` L${f(right[i].x)},${f(right[i].y)}`;
  d += ` A${f(radii[0])},${f(radii[0])} 0 0 0 ${f(left[0].x)},${f(left[0].y)} Z`;
  return d;
}

/** Render geometry of a freehand shape (points normalized to its w × h box). */
export function freehandGeometry(points: StrokePoint[] | undefined, w: number, h: number, strokeWidth: number): { path: string; outline: string | null } | null {
  if (!points || points.length < 2) return null;
  const P = points.map((q) => ({ x: q.x * w, y: q.y * h, p: q.p }));
  return { path: smoothPath(P), outline: hasPressure(P) ? pressureOutline(P, strokeWidth) : null };
}

/**
 * Turns a raw pointer trace (world coordinates) into a freehand stroke:
 * thins duplicate samples, simplifies by the smoothing amount, and
 * normalizes into the stroke's bounding box.
 */
export function buildStroke(raw: StrokePoint[], smoothing: number, keepPressure: boolean): { x: number; y: number; w: number; h: number; points: StrokePoint[] } | null {
  if (raw.length < 2) return null;
  const thin: StrokePoint[] = [raw[0]];
  for (const q of raw.slice(1)) if (len(sub(q, thin[thin.length - 1])) >= 1.5) thin.push(q);
  if (thin[thin.length - 1] !== raw[raw.length - 1]) thin.push(raw[raw.length - 1]);
  if (thin.length < 2) return null;
  const pressure = keepPressure && hasPressure(thin);
  const kept = simplify(thin, smoothingTolerance(smoothing));
  const xs = kept.map((q) => q.x);
  const ys = kept.map((q) => q.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(4, Math.max(...xs) - x);
  const h = Math.max(4, Math.max(...ys) - y);
  const points = kept.map((q) => {
    const n: StrokePoint = { x: (q.x - x) / w, y: (q.y - y) / h };
    if (pressure) n.p = Math.round((q.p ?? 0.5) * 100) / 100;
    return n;
  });
  return { x, y, w, h, points };
}
