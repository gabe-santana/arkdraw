import type { AnchorSide, Rect, Vec } from '@/model/types';

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const normalize = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const center = (r: Rect): Vec => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Normalizes a rect spanned by two arbitrary corner points. */
export function rectFromPoints(a: Vec, b: Vec): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function boundsOfPoints(points: Vec[]): Rect {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of points) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x);
    y2 = Math.max(y2, p.y);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + d * 2, h: r.h + d * 2 });

export const containsPoint = (r: Rect, p: Vec): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** True if `inner` lies entirely within `outer`. */
export const containsRect = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const SIDE_NORMALS: Record<AnchorSide, Vec> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export const SIDES: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

/** Midpoint of a rect's side. */
export function anchorPoint(r: Rect, side: AnchorSide): Vec {
  switch (side) {
    case 'top':
      return { x: r.x + r.w / 2, y: r.y };
    case 'right':
      return { x: r.x + r.w, y: r.y + r.h / 2 };
    case 'bottom':
      return { x: r.x + r.w / 2, y: r.y + r.h };
    case 'left':
      return { x: r.x, y: r.y + r.h / 2 };
  }
}

/** The side of `r` that best faces point `p`, normalized by the rect's aspect ratio. */
export function sideFacing(r: Rect, p: Vec): AnchorSide {
  const c = center(r);
  const dx = (p.x - c.x) / Math.max(r.w, 1);
  const dy = (p.y - c.y) / Math.max(r.h, 1);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

/** Dominant axis direction from `from` toward `to`. */
export function axisDirection(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx) || 1, y: 0 };
  return { x: 0, y: Math.sign(dy) || 1 };
}

/** Distance from point `p` to segment `a`-`b`. */
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2, 0, 1);
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

/** Total length of a polyline. */
export function polylineLength(pts: Vec[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

/** Point at fraction `t` (0..1) of a polyline's length. */
export function pointAlongPolyline(pts: Vec[], t: number): Vec {
  const target = polylineLength(pts) * t;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= target && seg > 0) {
      const k = (target - acc) / seg;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k,
      };
    }
    acc += seg;
  }
  return pts[pts.length - 1];
}

export const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

export function rotatePoint(p: Vec, c: Vec, deg: number): Vec {
  if (!deg) return p;
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

export const rotateVec = (v: Vec, deg: number): Vec => rotatePoint(v, { x: 0, y: 0 }, deg);

type Box = Rect & { rotation?: number };

/** The four corners of a (possibly rotated) box, clockwise from top-left. */
export function boxCorners(b: Box): Vec[] {
  const c = center(b);
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ].map((p) => rotatePoint(p, c, b.rotation ?? 0));
}

/** Axis-aligned bounds of a (possibly rotated) box. */
export function rotatedBounds(b: Box): Rect {
  if (!b.rotation) return { x: b.x, y: b.y, w: b.w, h: b.h };
  return boundsOfPoints(boxCorners(b));
}

/** Snaps a direction to the nearest axis (for orthogonal routing off rotated shapes). */
export function snapToAxis(v: Vec): Vec {
  return Math.abs(v.x) >= Math.abs(v.y) ? { x: Math.sign(v.x) || 1, y: 0 } : { x: 0, y: Math.sign(v.y) || 1 };
}

/** Segment intersection point (proper crossings only). */
export function segmentIntersection(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}
