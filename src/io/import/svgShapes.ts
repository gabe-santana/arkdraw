/**
 * SVG → editable ArkDraw shapes ("Convert to shapes" when an SVG is dropped,
 * pasted or picked, and Arrange › Insert › SVG as shapes…)
 * "Edit Image › Convert" or Inkscape's import.
 *
 * Pure: SVG text in, `DiagramElement[]` out (back-to-front). Transforms are
 * flattened (nested groups, `use`, nested `svg`, the root viewBox), then:
 *
 *   rect                → rectangle (rx → radius, rotation kept)
 *   circle / ellipse    → ellipse
 *   line / polyline     → straight connector (free endpoints, waypoints)
 *   polygon / path      → `stencil` shape (mxGraph stencil XML, fully editable)
 *   text / tspan        → text shape (size, family, weight, colour, anchor)
 *   image               → image shape (data: and http(s) hrefs)
 *
 * Paint comes from presentation attributes, simple `<style>` rules (tag,
 * .class, #id) and inline styles, with inheritance. Gradients become their
 * first stop colour; clip paths, masks, filters and patterns are ignored and
 * reported in `warnings`. Every result element shares a group (plus nested
 * groups for `<g>`s with several children) so the import moves as one unit.
 *
 * This module deliberately exports no `importer`, so the plugin index skips it.
 */
import type { ConnectorElement, DiagramElement, ElementStyle, FontFamily, ShapeElement, Vec } from '@/model/types';
import { createConnector, createShape, DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import { buildStencilXml } from '@/stencils/convert';
import { measureText } from '@/lib/text';
import { uid } from '@/lib/id';

export interface SvgToShapesOptions {
  /** `path` (default): one stencil shape per path. `group`: sibling paths of each `<g>` merge into one stencil. */
  mode?: 'path' | 'group';
  /** Scales the drawing down (never up) so its larger side fits this many px. */
  fit?: number;
  /** World point the content's bounding-box centre is moved to (default: SVG user space). */
  center?: Vec;
  /** Unfilled `<line>` / `<polyline>` become connectors (default true); otherwise stencil paths. */
  linesAsConnectors?: boolean;
}

export interface SvgToShapesResult {
  elements: DiagramElement[];
  /** Approximations made (gradients, clip paths, …), for a toast. */
  warnings: string[];
  /** Viewport size after `fit`. */
  width: number;
  height: number;
}

/** User-facing messages (English; kept together for i18n). */
export const SVG_IMPORT_MESSAGES = {
  invalid: 'This file is not a valid SVG image.',
  empty: 'The SVG has nothing that can be converted to shapes.',
  gradient: 'Gradients were replaced by their first colour.',
  pattern: 'Pattern fills were replaced by a flat colour.',
  clip: 'Clipping paths and masks were ignored.',
  filter: 'Filters (blur, shadows) were ignored.',
  marker: 'Path markers were ignored (lines keep simple arrowheads).',
  skewText: 'Skewed text and images were approximated by their rotated box.',
  foreign: 'Embedded HTML (foreignObject) was converted to plain text.',
  relativeImage: 'Images with relative links were skipped.',
} as const;

// ---------------------------------------------------------------------------
// Affine matrices: [a, b, c, d, e, f] maps (x, y) → (a·x + c·y + e, b·x + d·y + f)
// ---------------------------------------------------------------------------

export type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 · m2 (m2 applies first). */
export function mul(m1: Matrix, m2: Matrix): Matrix {
  const [a, b, c, d, e, f] = m1;
  const [A, B, C, D, E, F] = m2;
  return [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
}

export const apply = (m: Matrix, p: Vec): Vec => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const scaleM = (sx: number, sy = sx): Matrix => [sx, 0, 0, sy, 0, 0];
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Parses an SVG / CSS transform list (`translate(…) rotate(…) …`). Units such as px/deg are ignored. */
export function parseTransform(src: string | null | undefined): Matrix {
  let m = IDENTITY;
  if (!src) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(src))) {
    const n = (hit[2].match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    let t: Matrix = IDENTITY;
    switch (hit[1].toLowerCase()) {
      case 'matrix':
        if (n.length >= 6) t = [n[0], n[1], n[2], n[3], n[4], n[5]];
        break;
      case 'translate':
        t = translate(n[0] ?? 0, n[1] ?? 0);
        break;
      case 'scale':
        t = scaleM(n[0] ?? 1, n[1] ?? n[0] ?? 1);
        break;
      case 'rotate': {
        const a = rad(n[0] ?? 0);
        const r: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        t = n.length >= 3 ? mul(mul(translate(n[1], n[2]), r), translate(-n[1], -n[2])) : r;
        break;
      }
      case 'skewx':
        t = [1, 0, Math.tan(rad(n[0] ?? 0)), 1, 0, 0];
        break;
      case 'skewy':
        t = [1, Math.tan(rad(n[0] ?? 0)), 0, 1, 0, 0];
        break;
    }
    m = mul(m, t);
  }
  return m;
}

/** Scale / rotation of a matrix, and whether it keeps right angles (no skew). */
function decompose(m: Matrix) {
  const [a, b, c, d] = m;
  const sx = Math.hypot(a, b);
  const sy = Math.hypot(c, d);
  const det = a * d - b * c;
  const ortho = Math.abs(a * c + b * d) <= 1e-6 * Math.max(1e-9, sx * sy);
  let rot = (Math.atan2(b, a) * 180) / Math.PI;
  if (Math.abs(rot) < 0.01) rot = 0;
  return { sx, sy, det, ortho, rot, scale: Math.sqrt(Math.abs(det)) };
}

// ---------------------------------------------------------------------------
// Path data → absolute segments (M, L, C, Z); arcs and quadratics become cubics
// ---------------------------------------------------------------------------

export type Seg = { t: 'M' | 'L'; p: Vec } | { t: 'C'; c1: Vec; c2: Vec; p: Vec } | { t: 'Z' };

/** SVG arc (endpoint parameterisation) → cubic Bézier segments. */
export function arcToCubics(p0: Vec, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, p: Vec): Seg[] {
  if (p0.x === p.x && p0.y === p.y) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry) return [{ t: 'L', p }];
  const phi = rad(phiDeg);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0.x - p.x) / 2;
  const dy = (p0.y - p.y) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (p0.x + p.x) / 2;
  const cy = sin * cxp + cos * cyp + (p0.y + p.y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dth > 0) dth -= 2 * Math.PI;
  if (sweep && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9));
  const delta = dth / n;
  const k = (4 / 3) * Math.tan(delta / 4);
  const at = (a: number): Vec => ({ x: cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin, y: cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos });
  const tan = (a: number): Vec => ({ x: -rx * Math.sin(a) * cos - ry * Math.cos(a) * sin, y: -rx * Math.sin(a) * sin + ry * Math.cos(a) * cos });
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = th1 + i * delta;
    const a2 = a1 + delta;
    const s = at(a1);
    const e = i === n - 1 ? p : at(a2);
    const t1 = tan(a1);
    const t2 = tan(a2);
    out.push({ t: 'C', c1: { x: s.x + k * t1.x, y: s.y + k * t1.y }, c2: { x: e.x - k * t2.x, y: e.y - k * t2.y }, p: e });
  }
  return out;
}

const NUM_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

/** Parses path data into absolute M/L/C/Z segments. Stops at the first error (like browsers). */
export function parsePathData(d: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  const n = d.length;
  const skip = () => {
    while (i < n && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\r' || d[i] === '\t')) i++;
  };
  const num = (): number => {
    skip();
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(d);
    if (!m) throw new Error('path');
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = (): boolean => {
    skip();
    const ch = d[i];
    if (ch !== '0' && ch !== '1') throw new Error('path');
    i++;
    return ch === '1';
  };
  let cmd = '';
  let cur: Vec = { x: 0, y: 0 };
  let start: Vec = { x: 0, y: 0 };
  let lastC: Vec | null = null; // reflected by S
  let lastQ: Vec | null = null; // reflected by T
  const quad = (q: Vec, p: Vec) => {
    out.push({ t: 'C', c1: { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) }, c2: { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) }, p });
  };
  try {
    while (true) {
      skip();
      if (i >= n) break;
      if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
      else if (!cmd || cmd === 'z' || cmd === 'Z') break;
      const rel = cmd === cmd.toLowerCase();
      const P = (x: number, y: number): Vec => (rel ? { x: cur.x + x, y: cur.y + y } : { x, y });
      let nc: Vec | null = null;
      let nq: Vec | null = null;
      switch (cmd.toUpperCase()) {
        case 'M': {
          const x = num();
          const p = P(x, num());
          out.push({ t: 'M', p });
          cur = start = p;
          cmd = rel ? 'l' : 'L';
          break;
        }
        case 'L': {
          const x = num();
          cur = P(x, num());
          out.push({ t: 'L', p: cur });
          break;
        }
        case 'H':
          cur = { x: (rel ? cur.x : 0) + num(), y: cur.y };
          out.push({ t: 'L', p: cur });
          break;
        case 'V':
          cur = { x: cur.x, y: (rel ? cur.y : 0) + num() };
          out.push({ t: 'L', p: cur });
          break;
        case 'C': {
          const c1 = P(num(), num());
          const c2 = P(num(), num());
          const p = P(num(), num());
          out.push({ t: 'C', c1, c2, p });
          cur = p;
          nc = c2;
          break;
        }
        case 'S': {
          const c1: Vec = lastC ? { x: 2 * cur.x - lastC.x, y: 2 * cur.y - lastC.y } : cur;
          const c2 = P(num(), num());
          const p = P(num(), num());
          out.push({ t: 'C', c1, c2, p });
          cur = p;
          nc = c2;
          break;
        }
        case 'Q': {
          const q = P(num(), num());
          const p = P(num(), num());
          quad(q, p);
          cur = p;
          nq = q;
          break;
        }
        case 'T': {
          const q: Vec = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur;
          const p = P(num(), num());
          quad(q, p);
          cur = p;
          nq = q;
          break;
        }
        case 'A': {
          const rx = num();
          const ry = num();
          const rot = num();
          const large = flag();
          const sweep = flag();
          const p = P(num(), num());
          out.push(...arcToCubics(cur, rx, ry, rot, large, sweep, p));
          cur = p;
          break;
        }
        case 'Z':
          out.push({ t: 'Z' });
          cur = start;
          break;
        default:
          throw new Error('path');
      }
      lastC = nc;
      lastQ = nq;
    }
  } catch {
    // Render what parsed before the error.
  }
  // A drawing command before any moveto is invalid; a lone moveto draws nothing.
  return out.some((s) => s.t !== 'M' && s.t !== 'Z') ? out : [];
}

const mapSegs = (segs: Seg[], m: Matrix): Seg[] =>
  segs.map((s) => (s.t === 'Z' ? s : s.t === 'C' ? { t: 'C', c1: apply(m, s.c1), c2: apply(m, s.c2), p: apply(m, s.p) } : { t: s.t, p: apply(m, s.p) }));

/** Tight bounds of segments (cubic extrema included). */
export function segBounds(segs: Seg[]): { x: number; y: number; w: number; h: number } {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const add = (p: Vec) => {
    if (p.x < x1) x1 = p.x;
    if (p.x > x2) x2 = p.x;
    if (p.y < y1) y1 = p.y;
    if (p.y > y2) y2 = p.y;
  };
  let cur: Vec = { x: 0, y: 0 };
  let start: Vec = cur;
  for (const s of segs) {
    if (s.t === 'Z') {
      cur = start;
      continue;
    }
    if (s.t === 'M') start = s.p;
    if (s.t === 'C') {
      for (const t of cubicExtrema(cur, s.c1, s.c2, s.p)) add(cubicAt(cur, s.c1, s.c2, s.p, t));
    }
    add(s.p);
    if (s.t !== 'M') add(cur);
    cur = s.p;
  }
  return Number.isFinite(x1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : { x: 0, y: 0, w: 0, h: 0 };
}

function cubicAt(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

function cubicExtrema(p0: Vec, p1: Vec, p2: Vec, p3: Vec): number[] {
  const ts: number[] = [];
  for (const k of ['x', 'y'] as const) {
    const a = -p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k];
    const b = 2 * (p0[k] - 2 * p1[k] + p2[k]);
    const c = p1[k] - p0[k];
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) > 1e-12) ts.push(-c / b);
      continue;
    }
    const disc = b * b - 4 * a * c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc);
    ts.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
  }
  return ts.filter((t) => t > 0 && t < 1);
}

// ---------------------------------------------------------------------------
// Even-odd fill → nonzero: reverse nested contours so holes stay holes
// (stencils have no fill-rule; their paths fill with SVG's default nonzero).
// ---------------------------------------------------------------------------

function splitSubpaths(segs: Seg[]): Seg[][] {
  const subs: Seg[][] = [];
  for (const s of segs) {
    if (s.t === 'M' || !subs.length) subs.push([]);
    subs[subs.length - 1].push(s);
  }
  return subs;
}

function flatten(sub: Seg[]): Vec[] {
  const pts: Vec[] = [];
  let cur: Vec = { x: 0, y: 0 };
  for (const s of sub) {
    if (s.t === 'Z') continue;
    if (s.t === 'C') for (let k = 1; k < 8; k++) pts.push(cubicAt(cur, s.c1, s.c2, s.p, k / 8));
    pts.push(s.p);
    cur = s.p;
  }
  return pts;
}

const signedArea = (pts: Vec[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
};

function inside(p: Vec, poly: Vec[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function reverseSubpath(sub: Seg[]): Seg[] {
  const closed = sub[sub.length - 1]?.t === 'Z';
  const draw = sub.filter((s) => s.t !== 'Z');
  if (!draw.length || draw[0].t !== 'M') return sub;
  const p0 = draw[0].p;
  const last = (draw[draw.length - 1] as { p: Vec }).p;
  if (closed && (last.x !== p0.x || last.y !== p0.y)) draw.push({ t: 'L', p: p0 });
  const out: Seg[] = [{ t: 'M', p: (draw[draw.length - 1] as { p: Vec }).p }];
  for (let i = draw.length - 1; i >= 1; i--) {
    const s = draw[i];
    const prev = (draw[i - 1] as { p: Vec }).p;
    out.push(s.t === 'C' ? { t: 'C', c1: s.c2, c2: s.c1, p: prev } : { t: 'L', p: prev });
  }
  if (closed) out.push({ t: 'Z' });
  return out;
}

/** Rewrites contours so that nonzero filling gives the even-odd result (for non-overlapping nesting). */
export function evenOddToNonzero(segs: Seg[]): Seg[] {
  const subs = splitSubpaths(segs);
  if (subs.length < 2) return segs;
  const polys = subs.map(flatten);
  return subs.flatMap((sub, i) => {
    const poly = polys[i];
    const area = signedArea(poly);
    if (!poly.length || Math.abs(area) < 1e-9) return sub;
    let depth = 0;
    polys.forEach((other, j) => {
      if (j !== i && other.length > 2 && inside(poly[0], other)) depth++;
    });
    const want = depth % 2 === 0 ? 1 : -1;
    return Math.sign(area) === want ? sub : reverseSubpath(sub);
  });
}

// ---------------------------------------------------------------------------
// Basic geometry → segments
// ---------------------------------------------------------------------------

function rectSegs(x: number, y: number, w: number, h: number, rx: number, ry: number): Seg[] {
  if (!(rx > 0 && ry > 0)) {
    return [{ t: 'M', p: { x, y } }, { t: 'L', p: { x: x + w, y } }, { t: 'L', p: { x: x + w, y: y + h } }, { t: 'L', p: { x, y: y + h } }, { t: 'Z' }];
  }
  const segs: Seg[] = [{ t: 'M', p: { x: x + rx, y } }, { t: 'L', p: { x: x + w - rx, y } }];
  const arc = (from: Vec, to: Vec) => segs.push(...arcToCubics(from, rx, ry, 0, false, true, to));
  arc({ x: x + w - rx, y }, { x: x + w, y: y + ry });
  segs.push({ t: 'L', p: { x: x + w, y: y + h - ry } });
  arc({ x: x + w, y: y + h - ry }, { x: x + w - rx, y: y + h });
  segs.push({ t: 'L', p: { x: x + rx, y: y + h } });
  arc({ x: x + rx, y: y + h }, { x, y: y + h - ry });
  segs.push({ t: 'L', p: { x, y: y + ry } });
  arc({ x, y: y + ry }, { x: x + rx, y });
  segs.push({ t: 'Z' });
  return segs;
}

function ellipseSegs(cx: number, cy: number, rx: number, ry: number): Seg[] {
  const a = { x: cx + rx, y: cy };
  const b = { x: cx - rx, y: cy };
  return [{ t: 'M', p: a }, ...arcToCubics(a, rx, ry, 0, false, true, b), ...arcToCubics(b, rx, ry, 0, false, true, a), { t: 'Z' }];
}

const polySegs = (pts: Vec[], close: boolean): Seg[] => [
  ...pts.map((p, i): Seg => ({ t: i ? 'L' : 'M', p })),
  ...(close ? [{ t: 'Z' } as Seg] : []),
];

function parsePoints(src: string | null): Vec[] {
  const n = (src ?? '').match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
  const pts: Vec[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  return pts;
}

// ---------------------------------------------------------------------------
// Colours, lengths, CSS
// ---------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
  orange: '#ffa500', purple: '#800080', gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000',
  navy: '#000080', teal: '#008080', olive: '#808000', lime: '#00ff00', aqua: '#00ffff', cyan: '#00ffff',
  fuchsia: '#ff00ff', magenta: '#ff00ff', pink: '#ffc0cb', brown: '#a52a2a', gold: '#ffd700', darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9', lightgray: '#d3d3d3', lightgrey: '#d3d3d3', dimgray: '#696969', dimgrey: '#696969',
  darkblue: '#00008b', darkgreen: '#006400', darkred: '#8b0000', steelblue: '#4682b4', royalblue: '#4169e1',
  skyblue: '#87ceeb', tomato: '#ff6347', coral: '#ff7f50', crimson: '#dc143c', indigo: '#4b0082', violet: '#ee82ee',
  whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc', slategray: '#708090', slategrey: '#708090',
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** Normalises a CSS colour to `#rrggbb` + alpha where possible; unknown names pass through. */
export function parseColor(v: string): { color: string; alpha: number } | null {
  const s = v.trim().toLowerCase();
  if (!s || s === 'none' || s === 'transparent') return null;
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (/^[0-9a-f]{3,4}$/.test(h)) return { color: `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`, alpha: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1 };
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) return { color: `#${h.slice(0, 6)}`, alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
    return { color: '#000000', alpha: 1 };
  }
  const fn = s.match(/^rgba?\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    const ch = (p: string | undefined) => (p === undefined ? 0 : p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p));
    const a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    return { color: `#${hex2(ch(parts[0]))}${hex2(ch(parts[1]))}${hex2(ch(parts[2]))}`, alpha: Number.isFinite(a) ? a : 1 };
  }
  return { color: NAMED[s] ?? s, alpha: 1 };
}

const UNITS: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, q: 96 / 101.6 };

/** A length in px; `%` resolves against `ref`, `em` against `fontSize`. Null when missing or invalid. */
export function parseLength(v: string | null | undefined, ref = 0, fontSize = 16): number | null {
  if (v === null || v === undefined) return null;
  const m = v.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (!u) return n;
  if (u === '%') return (n / 100) * ref;
  if (u === 'em') return n * fontSize;
  if (u === 'ex') return (n * fontSize) / 2;
  return u in UNITS ? n * UNITS[u] : n;
}

interface CssRule {
  tag?: string;
  ids: string[];
  classes: string[];
  spec: number;
  order: number;
  decls: Record<string, string>;
}

function parseDecls(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of src.split(';')) {
    const k = part.indexOf(':');
    if (k < 0) continue;
    const name = part.slice(0, k).trim().toLowerCase();
    const value = part.slice(k + 1).replace(/!important/i, '').trim();
    if (name && value) out[name] = value;
  }
  return out;
}

/** Simple `<style>` rules: selectors made of a tag, `.class`es and `#id`s (no combinators). */
export function parseCss(css: string): CssRule[] {
  const rules: CssRule[] = [];
  let text = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!\[CDATA\[|\]\]>/g, '');
  // Drop at-rules (with or without a nested block).
  text = text.replace(/@[^{;]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/@[^{;]+;/g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = re.exec(text))) {
    const decls = parseDecls(m[2]);
    for (const raw of m[1].split(',')) {
      const sel = raw.trim();
      const parts = sel.match(/^([a-zA-Z][\w-]*|\*)?((?:[.#][\w-]+)*)$/);
      if (!sel || !parts) continue;
      const ids = [...parts[2].matchAll(/#([\w-]+)/g)].map((x) => x[1]);
      const classes = [...parts[2].matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
      const tag = parts[1] && parts[1] !== '*' ? parts[1].toLowerCase() : undefined;
      rules.push({ tag, ids, classes, spec: ids.length * 100 + classes.length * 10 + (tag ? 1 : 0), order: order++, decls });
    }
  }
  return rules.sort((a, b) => a.spec - b.spec || a.order - b.order);
}

// ---------------------------------------------------------------------------
// Style resolution
// ---------------------------------------------------------------------------

const INHERITED = [
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap',
  'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'text-decoration',
  'visibility', 'color', 'marker-start', 'marker-end',
] as const;
const PRESENTATION = [...INHERITED, 'marker', 'opacity', 'display', 'clip-path', 'mask', 'filter', 'stop-color', 'stop-opacity'];

type Computed = Record<string, string>;

const ROOT_STYLE: Computed = {
  fill: '#000000', stroke: 'none', 'stroke-width': '1', 'font-size': '16', 'font-family': 'sans-serif', color: '#000000',
  'text-anchor': 'start', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter',
};

interface Paint {
  fill: string;
  fillAlpha: number;
  stroke: string;
  strokeAlpha: number;
  /** Stroke width in local units. */
  strokeWidth: number;
  opacity: number;
  dash?: number[];
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  evenOdd: boolean;
  markerStart: boolean;
  markerEnd: boolean;
}

interface Ctx {
  m: Matrix;
  style: Computed;
  opacity: number;
  /** Group ids, innermost first. */
  groups: string[];
  vw: number;
  vh: number;
}

interface Base {
  groups: string[];
  name?: string;
  /** Parent element: group-mode merges consecutive siblings. */
  parent: Element | null;
}
type Item = Base &
  (
    | { k: 'path'; segs: Seg[]; m: Matrix; paint: Paint }
    | { k: 'rect'; x: number; y: number; w: number; h: number; rx: number; ry: number; m: Matrix; paint: Paint }
    | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number; m: Matrix; paint: Paint }
    | { k: 'line'; pts: Vec[]; m: Matrix; paint: Paint }
    | { k: 'text'; lines: string[]; x: number; y: number; m: Matrix; style: Computed; color: string; alpha: number; opacity: number }
    | { k: 'image'; href: string; x: number; y: number; w: number; h: number; m: Matrix; opacity: number }
  );

const SKIP = new Set([
  'defs', 'symbol', 'clippath', 'mask', 'marker', 'pattern', 'lineargradient', 'radialgradient', 'filter', 'style', 'script',
  'title', 'desc', 'metadata', 'font', 'font-face', 'namedview', 'cursor', 'view', 'animate', 'animatetransform', 'set',
]);
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

class Converter {
  private ids = new Map<string, Element>();
  private rules: CssRule[] = [];
  private warn = new Set<string>();
  readonly items: Item[] = [];
  private useStack: Element[] = [];

  constructor(doc: Document) {
    doc.querySelectorAll('[id]').forEach((el) => {
      const id = el.getAttribute('id');
      if (id && !this.ids.has(id)) this.ids.set(id, el);
    });
    const css = Array.from(doc.getElementsByTagName('style')).map((s) => s.textContent ?? '').join('\n');
    this.rules = parseCss(css);
  }

  get warnings() {
    return [...this.warn];
  }

  private declared(el: Element): Record<string, string> {
    const out: Record<string, string> = {};
    for (const p of PRESENTATION) {
      const v = el.getAttribute(p);
      if (v !== null && v.trim() !== '') out[p] = v.trim();
    }
    if (this.rules.length) {
      const tag = el.localName.toLowerCase();
      const id = el.getAttribute('id');
      const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      for (const r of this.rules) {
        if (r.tag && r.tag !== tag) continue;
        if (r.ids.some((x) => x !== id)) continue;
        if (r.classes.some((c) => !cls.includes(c))) continue;
        Object.assign(out, r.decls);
      }
    }
    const inline = el.getAttribute('style');
    if (inline) Object.assign(out, parseDecls(inline));
    return out;
  }

  /** Resolves inherited properties for `el`; returns its declarations too (for non-inherited ones). */
  compute(el: Element, parent: Computed): { style: Computed; d: Record<string, string> } {
    const d = this.declared(el);
    const style: Computed = { ...parent };
    for (const k of INHERITED) {
      const v = d[k];
      if (v === undefined || v === 'inherit') continue;
      style[k] = v;
    }
    if (d.marker && d.marker !== 'inherit') style['marker-start'] = style['marker-end'] = d.marker;
    if (d['font-size'] && d['font-size'] !== 'inherit') {
      const pfs = Number(parent['font-size']) || 16;
      const named: Record<string, number> = { 'xx-small': 9, 'x-small': 10, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32 };
      const fs = named[d['font-size']] ?? parseLength(d['font-size'], pfs, pfs);
      style['font-size'] = String(fs && fs > 0 ? fs : pfs);
    }
    return { style, d };
  }

  /** Paint value → colour + alpha ('none' when not painted). */
  private paintValue(v: string | undefined, style: Computed): { color: string; alpha: number } {
    if (!v || v === 'none') return { color: 'none', alpha: 1 };
    const url = v.match(/^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)\s*(.*)$/);
    if (url) {
      const ref = this.ids.get(url[1]);
      const tag = ref?.localName.toLowerCase();
      if (ref && (tag === 'lineargradient' || tag === 'radialgradient')) {
        this.warn.add(SVG_IMPORT_MESSAGES.gradient);
        const stop = this.firstStop(ref);
        if (stop) return stop;
      } else if (tag === 'pattern') this.warn.add(SVG_IMPORT_MESSAGES.pattern);
      if (url[2]) return this.paintValue(url[2], style);
      return tag === 'pattern' ? { color: '#808080', alpha: 1 } : { color: 'none', alpha: 1 };
    }
    if (v.toLowerCase() === 'currentcolor') v = style.color ?? '#000000';
    const c = parseColor(v);
    return c ?? { color: 'none', alpha: 1 };
  }

  private firstStop(grad: Element, depth = 0): { color: string; alpha: number } | null {
    const stop = Array.from(grad.children).find((c) => c.localName.toLowerCase() === 'stop');
    if (stop) {
      const d = this.declared(stop);
      const c = parseColor(d['stop-color'] ?? '#000000') ?? { color: 'none', alpha: 1 };
      const o = d['stop-opacity'] === undefined ? 1 : Number(d['stop-opacity']);
      return { color: c.color, alpha: c.alpha * (Number.isFinite(o) ? o : 1) };
    }
    const href = this.href(grad);
    const next = href?.startsWith('#') ? this.ids.get(href.slice(1)) : undefined;
    return next && depth < 8 ? this.firstStop(next, depth + 1) : null;
  }

  private href(el: Element): string | null {
    return el.getAttribute('href') ?? el.getAttributeNS(XLINK_NS, 'href') ?? el.getAttribute('xlink:href');
  }

  private paint(style: Computed, d: Record<string, string>, ctx: Ctx): Paint {
    const fill = this.paintValue(style.fill, style);
    const stroke = this.paintValue(style.stroke, style);
    const num = (v: string | undefined, f: number) => {
      const n = v === undefined ? NaN : parseFloat(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : f;
    };
    const sw = parseLength(style['stroke-width'], Math.hypot(ctx.vw, ctx.vh) / Math.SQRT2, Number(style['font-size']) || 16) ?? 1;
    const dashSrc = style['stroke-dasharray'];
    let dash: number[] | undefined;
    if (dashSrc && dashSrc !== 'none') {
      const parts = dashSrc.split(/[\s,]+/).map((x) => parseLength(x) ?? NaN);
      if (parts.length && parts.every((x) => Number.isFinite(x) && x >= 0) && parts.some((x) => x > 0)) dash = parts.length % 2 ? [...parts, ...parts] : parts;
    }
    const cap = style['stroke-linecap'];
    const join = style['stroke-linejoin'];
    const marker = (v: string | undefined) => !!v && v !== 'none';
    if (d['clip-path'] && d['clip-path'] !== 'none') this.warn.add(SVG_IMPORT_MESSAGES.clip);
    if (d.mask && d.mask !== 'none') this.warn.add(SVG_IMPORT_MESSAGES.clip);
    if (d.filter && d.filter !== 'none') this.warn.add(SVG_IMPORT_MESSAGES.filter);
    return {
      fill: fill.color,
      fillAlpha: fill.alpha * num(style['fill-opacity'], 1),
      stroke: sw > 0 ? stroke.color : 'none',
      strokeAlpha: stroke.alpha * num(style['stroke-opacity'], 1),
      strokeWidth: sw,
      opacity: ctx.opacity * num(d.opacity, 1),
      dash,
      cap: cap === 'round' || cap === 'square' ? cap : 'butt',
      join: join === 'round' || join === 'bevel' ? join : 'miter',
      evenOdd: style['fill-rule'] === 'evenodd',
      markerStart: marker(style['marker-start']),
      markerEnd: marker(style['marker-end']),
    };
  }

  private len(el: Element, name: string, ref: number, style: Computed, fallback = 0): number {
    return parseLength(el.getAttribute(name), ref, Number(style['font-size']) || 16) ?? fallback;
  }

  /** Walks `parent`'s children. */
  walkChildren(parent: Element, ctx: Ctx) {
    for (const child of Array.from(parent.children)) this.walk(child, ctx);
  }

  walk(el: Element, ctx: Ctx, parentOverride?: Element) {
    if (el.namespaceURI && el.namespaceURI !== SVG_NS) return; // Inkscape/Sodipodi metadata, etc.
    const tag = el.localName.toLowerCase();
    if (SKIP.has(tag)) return;
    const { style, d } = this.compute(el, ctx.style);
    if (d.display === 'none') return;
    const cssTransform = d.transform && d.transform !== 'none' ? d.transform : null;
    const m = mul(ctx.m, parseTransform(cssTransform ?? el.getAttribute('transform')));
    const base: Base = { groups: ctx.groups, name: el.getAttribute('id') ?? undefined, parent: parentOverride ?? el.parentElement };
    const hidden = style.visibility === 'hidden' || style.visibility === 'collapse';
    const { vw, vh } = ctx;
    const L = (name: string, ref: number, f = 0) => this.len(el, name, ref, style, f);

    switch (tag) {
      case 'g':
      case 'a':
      case 'switch': {
        const inner: Ctx = { ...ctx, m, style, opacity: ctx.opacity * clamp01(d.opacity), groups: [uid(), ...ctx.groups] };
        if (tag === 'switch') {
          // mxGraph / Office exports: <switch><foreignObject/><text>fallback</text></switch>.
          const pick = Array.from(el.children).find((c) => c.localName.toLowerCase() !== 'foreignobject') ?? el.children[0];
          if (pick) this.walk(pick, inner, el);
        } else this.walkChildren(el, inner);
        return;
      }
      case 'svg': {
        const w = L('width', vw, vw);
        const h = L('height', vh, vh);
        const vm = mul(translate(L('x', vw), L('y', vh)), viewBoxMatrix(el, w, h));
        const vb = parseViewBox(el.getAttribute('viewBox'));
        const inner: Ctx = { ...ctx, m: mul(m, vm), style, opacity: ctx.opacity * clamp01(d.opacity), groups: [uid(), ...ctx.groups], vw: vb?.w ?? w, vh: vb?.h ?? h };
        this.walkChildren(el, inner);
        return;
      }
      case 'use': {
        const href = this.href(el);
        const target = href?.startsWith('#') ? this.ids.get(href.slice(1)) : undefined;
        if (!target || this.useStack.includes(target) || this.useStack.length > 16) return;
        const um = mul(m, translate(L('x', vw), L('y', vh)));
        const inner: Ctx = { ...ctx, m: um, style, opacity: ctx.opacity * clamp01(d.opacity), groups: [uid(), ...ctx.groups] };
        this.useStack.push(target);
        if (target.localName.toLowerCase() === 'symbol') {
          const w = L('width', vw, vw);
          const h = L('height', vh, vh);
          const sym = this.compute(target, style);
          const vb = parseViewBox(target.getAttribute('viewBox'));
          this.walkChildren(target, { ...inner, m: mul(um, viewBoxMatrix(target, w, h)), style: sym.style, vw: vb?.w ?? w, vh: vb?.h ?? h });
        } else this.walk(target, inner, el);
        this.useStack.pop();
        return;
      }
      case 'path': {
        if (hidden) return;
        const segs = parsePathData(el.getAttribute('d') ?? '');
        if (segs.length) this.items.push({ ...base, k: 'path', segs, m, paint: this.paint(style, d, ctx) });
        return;
      }
      case 'rect': {
        const w = L('width', vw);
        const h = L('height', vh);
        if (hidden || !(w > 0 && h > 0)) return;
        let rx = parseLength(el.getAttribute('rx') ?? d.rx, vw);
        let ry = parseLength(el.getAttribute('ry') ?? d.ry, vh);
        if (rx === null) rx = ry ?? 0;
        if (ry === null) ry = rx;
        this.items.push({ ...base, k: 'rect', x: L('x', vw), y: L('y', vh), w, h, rx: Math.min(Math.max(rx, 0), w / 2), ry: Math.min(Math.max(ry, 0), h / 2), m, paint: this.paint(style, d, ctx) });
        return;
      }
      case 'circle':
      case 'ellipse': {
        const diag = Math.hypot(vw, vh) / Math.SQRT2;
        const rx = tag === 'circle' ? L('r', diag) : L('rx', vw, NaN);
        const ry = tag === 'circle' ? rx : L('ry', vh, NaN);
        const RX = Number.isNaN(rx) ? ry : rx;
        const RY = Number.isNaN(ry) ? rx : ry;
        if (hidden || !(RX > 0 && RY > 0)) return;
        this.items.push({ ...base, k: 'ellipse', cx: L('cx', vw), cy: L('cy', vh), rx: RX, ry: RY, m, paint: this.paint(style, d, ctx) });
        return;
      }
      case 'line': {
        if (hidden) return;
        const pts = [{ x: L('x1', vw), y: L('y1', vh) }, { x: L('x2', vw), y: L('y2', vh) }];
        this.items.push({ ...base, k: 'line', pts, m, paint: { ...this.paint(style, d, ctx), fill: 'none' } });
        return;
      }
      case 'polyline':
      case 'polygon': {
        const pts = parsePoints(el.getAttribute('points'));
        if (hidden || pts.length < 2) return;
        const paint = this.paint(style, d, ctx);
        if (tag === 'polygon') this.items.push({ ...base, k: 'path', segs: polySegs(pts, true), m, paint });
        else this.items.push({ ...base, k: 'line', pts, m, paint });
        return;
      }
      case 'text': {
        if (hidden) return;
        this.text(el, style, d, m, ctx, base);
        return;
      }
      case 'image': {
        const href = this.href(el)?.trim();
        const w = L('width', vw);
        const h = L('height', vh);
        if (hidden || !href || !(w > 0 && h > 0)) return;
        if (!/^(data:image\/|https?:)/i.test(href)) {
          this.warn.add(SVG_IMPORT_MESSAGES.relativeImage);
          return;
        }
        this.items.push({ ...base, k: 'image', href, x: L('x', vw), y: L('y', vh), w, h, m, opacity: ctx.opacity * clamp01(d.opacity) });
        return;
      }
      case 'foreignobject': {
        const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (hidden || !txt) return;
        this.warn.add(SVG_IMPORT_MESSAGES.foreign);
        const fs = Number(style['font-size']) || 12;
        const color = this.paintValue(style.color, style);
        this.items.push({
          ...base, k: 'text', lines: [txt], x: L('x', vw) + L('width', vw) / 2, y: L('y', vh) + L('height', vh) / 2 + fs * 0.35, m,
          style: { ...style, 'text-anchor': 'middle' }, color: color.color === 'none' ? '#000000' : color.color, alpha: color.alpha, opacity: ctx.opacity * clamp01(d.opacity),
        });
        return;
      }
      default:
        return;
    }
  }

  private text(el: Element, style: Computed, d: Record<string, string>, m: Matrix, ctx: Ctx, base: Base) {
    const lines: string[] = [''];
    const found: { first: Element | null } = { first: null };
    let lastY: number | null = null;
    const visit = (node: Element, depth: number) => {
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeType === 3) lines[lines.length - 1] += c.textContent ?? '';
        else if (c.nodeType === 1 && depth < 8) {
          const e = c as Element;
          const t = e.localName.toLowerCase();
          if (t !== 'tspan' && t !== 'textpath' && t !== 'a') continue;
          found.first ??= e;
          const y = parseLength(e.getAttribute('y'));
          const dy = parseLength(e.getAttribute('dy')?.split(/[\s,]+/)[0]);
          const breaks = (y !== null && lastY !== null && Math.abs(y - lastY) > 0.01) || (dy !== null && Math.abs(dy) > 0.01);
          if (breaks && lines[lines.length - 1].trim()) lines.push('');
          if (y !== null) lastY = y;
          visit(e, depth + 1);
        }
      }
    };
    lastY = parseLength(el.getAttribute('y')?.split(/[\s,]+/)[0]);
    visit(el, 0);
    const clean = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!clean.length) return;
    // Position: the <text>'s own x/y, else its first tspan's.
    const pos = (name: string) =>
      parseLength(el.getAttribute(name)?.split(/[\s,]+/)[0], name === 'x' ? ctx.vw : ctx.vh) ??
      parseLength(found.first?.getAttribute(name)?.split(/[\s,]+/)[0], name === 'x' ? ctx.vw : ctx.vh) ??
      0;
    // Font properties often live on the first tspan.
    const fstyle = found.first ? this.compute(found.first, style).style : style;
    let fill = this.paintValue(fstyle.fill, fstyle);
    if (fill.color === 'none') fill = this.paintValue(fstyle.stroke, fstyle);
    this.items.push({
      ...base, k: 'text', lines: clean, x: pos('x'), y: pos('y'), m, style: fstyle,
      color: fill.color === 'none' ? '#000000' : fill.color, alpha: fill.alpha * clamp01(fstyle['fill-opacity']), opacity: ctx.opacity * clamp01(d.opacity),
    });
  }
}

const clamp01 = (v: string | undefined) => {
  const n = v === undefined ? NaN : parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
};

function parseViewBox(v: string | null): { x: number; y: number; w: number; h: number } | null {
  const n = (v ?? '').trim().split(/[\s,]+/).map(Number);
  return n.length === 4 && n.every(Number.isFinite) && n[2] > 0 && n[3] > 0 ? { x: n[0], y: n[1], w: n[2], h: n[3] } : null;
}

/** viewBox → viewport mapping (preserveAspectRatio, default xMidYMid meet). */
function viewBoxMatrix(el: Element, w: number, h: number): Matrix {
  const vb = parseViewBox(el.getAttribute('viewBox'));
  if (!vb) return IDENTITY;
  const par = (el.getAttribute('preserveAspectRatio') ?? '').trim().split(/\s+/);
  const align = par[0] || 'xMidYMid';
  let sx = w / vb.w;
  let sy = h / vb.h;
  if (align !== 'none') {
    const s = par[1] === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy);
    sx = sy = s;
  }
  let tx = -vb.x * sx;
  let ty = -vb.y * sy;
  if (align !== 'none') {
    const fx = /xMid/.test(align) ? 0.5 : /xMax/.test(align) ? 1 : 0;
    const fy = /YMid/.test(align) ? 0.5 : /YMax/.test(align) ? 1 : 0;
    tx += (w - vb.w * sx) * fx;
    ty += (h - vb.h * sy) * fy;
  }
  return [sx, 0, 0, sy, tx, ty];
}

// ---------------------------------------------------------------------------
// Items → elements
// ---------------------------------------------------------------------------

function stencilOps(segs: Seg[], ox: number, oy: number): string {
  const P = (p: Vec) => `x="${r2(p.x - ox)}" y="${r2(p.y - oy)}"`;
  let out = '';
  for (const s of segs) {
    if (s.t === 'M') out += `<move ${P(s.p)}/>`;
    else if (s.t === 'L') out += `<line ${P(s.p)}/>`;
    else if (s.t === 'C') out += `<curve x1="${r2(s.c1.x - ox)}" y1="${r2(s.c1.y - oy)}" x2="${r2(s.c2.x - ox)}" y2="${r2(s.c2.y - oy)}" x3="${r2(s.p.x - ox)}" y3="${r2(s.p.y - oy)}"/>`;
    else out += '<close/>';
  }
  return `<path>${out}</path>`;
}

function baseStyle(p: Paint, scale: number): Partial<ElementStyle> {
  const st: Partial<ElementStyle> = {
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: r2(p.strokeWidth * scale),
    strokeStyle: p.dash ? 'dashed' : 'solid',
    opacity: r2(p.opacity),
    radius: 0,
    shadow: false,
  };
  if (p.fill !== 'none' && p.fillAlpha < 1) st.fillOpacity = r2(p.fillAlpha);
  if (p.stroke !== 'none' && p.strokeAlpha < 1) st.strokeOpacity = r2(p.strokeAlpha);
  if (p.dash) st.dashPattern = p.dash.map((n) => r2(n * scale)).join(' ');
  return st;
}

/** Stroke details a stencil can carry but ElementStyle can't (SVG defaults differ from the stencil renderer's). */
function strokeDetailOps(p: Paint): string[] {
  if (p.stroke === 'none') return [];
  const ops: string[] = [];
  if (p.join !== 'round') ops.push(`<linejoin join="${p.join}"/>`);
  if (p.cap !== 'butt') ops.push(`<linecap cap="${p.cap}"/>`);
  return ops;
}

/** Paint ops for one path inside a merged (group-mode) stencil. */
function paintOps(p: Paint, scale: number): string[] {
  const ops = [`<fillcolor color="${esc(p.fill)}"/>`, `<strokecolor color="${esc(p.stroke)}"/>`, `<strokewidth width="${r2(p.strokeWidth * scale)}" fixed="0"/>`];
  if (p.fillAlpha < 1) ops.push(`<fillalpha alpha="${r2(p.fillAlpha)}"/>`);
  if (p.strokeAlpha < 1) ops.push(`<strokealpha alpha="${r2(p.strokeAlpha)}"/>`);
  if (p.opacity < 1) ops.push(`<alpha alpha="${r2(p.opacity)}"/>`);
  if (p.dash) ops.push('<dashed dashed="1"/>', `<dashpattern pattern="${p.dash.map((n) => r2(n / Math.max(p.strokeWidth, 0.5))).join(' ')}"/>`);
  else ops.push('<dashed dashed="0"/>');
  return [...ops, ...strokeDetailOps(p)];
}

/** World-space segments for any geometric item. */
function itemSegs(it: Item): Seg[] {
  switch (it.k) {
    case 'path':
      return mapSegs(it.segs, it.m);
    case 'rect':
      return mapSegs(rectSegs(it.x, it.y, it.w, it.h, it.rx, it.ry), it.m);
    case 'ellipse':
      return mapSegs(ellipseSegs(it.cx, it.cy, it.rx, it.ry), it.m);
    case 'line':
      return mapSegs(polySegs(it.pts, false), it.m);
    default:
      return [];
  }
}

const isGeometry = (it: Item): it is Extract<Item, { paint: Paint }> => it.k === 'path' || it.k === 'rect' || it.k === 'ellipse' || it.k === 'line';

function stencilShape(name: string, parts: Array<{ segs: Seg[]; paint: Paint; scale: number }>, merged: boolean): ShapeElement | null {
  const all = parts.flatMap((p) => p.segs);
  const bb = segBounds(all);
  if (!all.length || !Number.isFinite(bb.x)) return null;
  const w = Math.max(bb.w, 1);
  const h = Math.max(bb.h, 1);
  const ops: string[] = [];
  for (const part of parts) {
    const segs = part.paint.evenOdd ? evenOddToNonzero(part.segs) : part.segs;
    const geo = stencilOps(segs, bb.x, bb.y);
    if (merged) ops.push('<save/>', ...paintOps(part.paint, part.scale), geo, '<fillstroke/>', '<restore/>');
    else ops.push(...strokeDetailOps(part.paint), geo, '<fillstroke/>');
  }
  const first = parts[0];
  const el = createShape('stencil', { x: r2(bb.x), y: r2(bb.y), w: r2(w), h: r2(h) }, baseStyle(first.paint, first.scale));
  el.stencil = buildStencilXml(name, r2(w), r2(h), ops);
  return el;
}

/** Native box shape (rectangle / ellipse / text / image) for a local box under `m`; null when `m` skews. */
function placeBox(m: Matrix, x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number; rotation: number; flip: boolean } | null {
  const dm = decompose(m);
  if (!dm.ortho) return null;
  const c = apply(m, { x: x + w / 2, y: y + h / 2 });
  const W = w * dm.sx;
  const H = h * dm.sy;
  return { x: r2(c.x - W / 2), y: r2(c.y - H / 2), w: r2(W), h: r2(H), rotation: r2(dm.rot), flip: dm.det < 0 };
}

function fontFamilyOf(src: string | undefined): FontFamily {
  const fams = (src ?? '').split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const firstFam = fams[0]?.toLowerCase() ?? '';
  if (!firstFam || /^(sans-serif|system-ui|-apple-system|arial|helvetica|helvetica neue|inter|segoe ui)$/.test(firstFam)) return 'sans';
  if (/^(serif|times|times new roman|georgia)$/.test(firstFam)) return 'serif';
  if (/^(monospace|courier|courier new|consolas|menlo|monaco)$/.test(firstFam) || /mono/.test(firstFam)) return 'mono';
  if (/comic|hand|script/.test(firstFam)) return 'hand';
  return fams[0];
}

function textShape(it: Extract<Item, { k: 'text' }>, warn: Set<string>): ShapeElement {
  const s = it.style;
  const fs = Number(s['font-size']) || 16;
  const weight = s['font-weight'] ?? '';
  const bold = weight === 'bold' || weight === 'bolder' || Number(weight) >= 600;
  const italic = s['font-style'] === 'italic' || s['font-style'] === 'oblique';
  const fontFamily = fontFamilyOf(s['font-family']);
  const lh = fs * 1.3;
  const tw = Math.max(...it.lines.map((l) => measureText(l, { fontFamily, fontSize: fs, bold, italic } as ElementStyle))) + fs * 0.3;
  const th = it.lines.length * lh;
  const anchor = s['text-anchor'];
  const lx = anchor === 'middle' ? it.x - tw / 2 : anchor === 'end' ? it.x - tw : it.x;
  const ly = it.y - fs * 1.0; // baseline → top of the first line box
  let box = placeBox(it.m, lx, ly, tw, th);
  const dm = decompose(it.m);
  if (!box) {
    warn.add(SVG_IMPORT_MESSAGES.skewText);
    const c = apply(it.m, { x: lx + tw / 2, y: ly + th / 2 });
    const W = tw * dm.sx;
    const H = th * dm.sy;
    box = { x: r2(c.x - W / 2), y: r2(c.y - H / 2), w: r2(W), h: r2(H), rotation: r2(dm.rot), flip: false };
  }
  const style: Partial<ElementStyle> = {
    fill: 'none',
    stroke: 'none',
    fontSize: r2(fs * Math.sqrt(dm.sx * dm.sy)),
    fontFamily,
    bold,
    italic,
    underline: /underline/.test(s['text-decoration'] ?? '') || undefined,
    textColor: it.color,
    textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
    verticalAlign: 'top',
    wrap: false,
    spacing: 0,
    opacity: r2(it.opacity),
  };
  if (it.alpha < 1) style.textOpacity = r2(it.alpha);
  if (!style.underline) delete style.underline;
  const el = createShape('text', { x: box.x, y: box.y, w: box.w, h: box.h }, style, it.lines.join('\n'));
  if (box.rotation) el.rotation = box.rotation;
  return el;
}

function lineConnector(pts: Vec[], paint: Paint, scale: number): ConnectorElement {
  const P = (p: Vec) => ({ x: r2(p.x), y: r2(p.y) });
  const c = createConnector(P(pts[0]), P(pts[pts.length - 1]), {
    routing: 'straight',
    connectorShape: 'line',
    lineJumps: 'none',
    startArrow: paint.markerStart ? 'triangle' : 'none',
    endArrow: paint.markerEnd ? 'triangle' : 'none',
    style: { ...DEFAULT_CONNECTOR_STYLE, ...baseStyle(paint, scale), fill: 'none', radius: 0 },
  });
  if (pts.length > 2) c.waypoints = pts.slice(1, -1).map(P);
  else delete c.waypoints;
  return c;
}

/** Moves elements by (dx, dy). */
export function offsetElements(els: DiagramElement[], dx: number, dy: number): void {
  for (const el of els) {
    if (el.type === 'shape') {
      el.x = r2(el.x + dx);
      el.y = r2(el.y + dy);
    } else {
      for (const p of [el.source, el.target, ...(el.waypoints ?? [])]) {
        p.x = r2(p.x + dx);
        p.y = r2(p.y + dy);
      }
    }
  }
}

function boundsOf(els: DiagramElement[]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const add = (x: number, y: number) => {
    x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  };
  for (const el of els) {
    if (el.type === 'shape') {
      add(el.x, el.y);
      add(el.x + el.w, el.y + el.h);
    } else for (const p of [el.source, el.target, ...(el.waypoints ?? [])]) add(p.x, p.y);
  }
  return Number.isFinite(x1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : { x: 0, y: 0, w: 0, h: 0 };
}

/** Drops groups with a single member and groups identical to their outer group. */
function pruneGroups(els: DiagramElement[]) {
  const count = new Map<string, number>();
  for (const el of els) for (const g of el.groupIds) count.set(g, (count.get(g) ?? 0) + 1);
  for (const el of els) {
    el.groupIds = el.groupIds.filter((g, i, arr) => {
      const n = count.get(g) ?? 0;
      if (n < 2) return false;
      const outer = arr.slice(i + 1).find((o) => (count.get(o) ?? 0) >= 2);
      return !(outer && count.get(outer) === n);
    });
  }
}

/** Converts SVG markup to editable elements (back-to-front), with the warnings collected. */
export function convertSvg(svg: string, opts: SvgToShapesOptions = {}): SvgToShapesResult {
  const doc = new DOMParser().parseFromString(svg.replace(/^﻿/, ''), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error(SVG_IMPORT_MESSAGES.invalid);
  const vb = parseViewBox(root.getAttribute('viewBox'));
  let width = parseLength(root.getAttribute('width'), vb?.w ?? 300) ?? vb?.w ?? 300;
  let height = parseLength(root.getAttribute('height'), vb?.h ?? 150) ?? vb?.h ?? 150;
  if (!(width > 0)) width = vb?.w ?? 300;
  if (!(height > 0)) height = vb?.h ?? 150;
  let m = viewBoxMatrix(root, width, height);
  if (opts.fit && Math.max(width, height) > opts.fit) {
    const s = opts.fit / Math.max(width, height);
    m = mul(scaleM(s), m);
    width *= s;
    height *= s;
  }

  const conv = new Converter(doc);
  const rootStyle = conv.compute(root, ROOT_STYLE).style;
  const rootGroup = uid();
  conv.walkChildren(root, { m, style: rootStyle, opacity: 1, groups: [rootGroup], vw: vb?.w ?? width, vh: vb?.h ?? height });

  const warn = new Set(conv.warnings);
  const els: DiagramElement[] = [];
  const mode = opts.mode ?? 'path';
  const linesAsConnectors = opts.linesAsConnectors ?? true;
  const items = conv.items;
  const tag = (el: DiagramElement | null, it: Item) => {
    if (!el) return;
    el.groupIds = [...it.groups];
    if (it.name && !el.name) el.name = it.name;
    els.push(el);
  };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.k === 'text') {
      tag(textShape(it, warn), it);
      continue;
    }
    if (it.k === 'image') {
      let box = placeBox(it.m, it.x, it.y, it.w, it.h);
      if (!box) {
        warn.add(SVG_IMPORT_MESSAGES.skewText);
        const bb = segBounds(mapSegs(rectSegs(it.x, it.y, it.w, it.h, 0, 0), it.m));
        box = { ...bb, rotation: 0, flip: false };
      }
      const el = createShape('image', { x: box.x, y: box.y, w: box.w, h: box.h }, { fill: 'none', stroke: 'none', radius: 0, opacity: r2(it.opacity) });
      el.icon = it.href;
      if (box.rotation) el.rotation = box.rotation;
      if (box.flip) el.flipV = true;
      tag(el, it);
      continue;
    }
    const scale = decompose(it.m).scale;
    if (mode === 'group') {
      // Merge this run of geometry siblings into one stencil.
      const run: Item[] = [it];
      while (i + 1 < items.length && isGeometry(items[i + 1]) && items[i + 1].parent === it.parent && items[i + 1].groups[0] === it.groups[0]) run.push(items[++i]);
      const parts = run.filter(isGeometry).map((r) => ({ segs: itemSegs(r), paint: r.paint, scale: decompose(r.m).scale }));
      const el = run.length === 1 ? stencilShape(it.name ?? 'Path', parts, false) : stencilShape(it.parent?.getAttribute('id') ?? 'Group', parts, true);
      if (el) {
        el.groupIds = [...it.groups];
        if (run.length === 1 && it.name) el.name = it.name;
        else if (run.length > 1 && it.parent?.getAttribute('id')) el.name = it.parent.getAttribute('id')!;
        els.push(el);
      }
      continue;
    }
    if (!isGeometry(it)) continue;
    if (it.k === 'rect' || it.k === 'ellipse') {
      const box = it.k === 'rect' ? placeBox(it.m, it.x, it.y, it.w, it.h) : placeBox(it.m, it.cx - it.rx, it.cy - it.ry, it.rx * 2, it.ry * 2);
      if (box) {
        const style = baseStyle(it.paint, scale);
        if (it.k === 'rect') {
          const dm = decompose(it.m);
          style.radius = r2(Math.min(it.rx * dm.sx, it.ry * dm.sy));
        }
        const el = createShape(it.k === 'rect' ? 'rectangle' : 'ellipse', { x: box.x, y: box.y, w: box.w, h: box.h }, style);
        if (box.rotation) el.rotation = box.rotation;
        tag(el, it);
        continue;
      }
    }
    if (it.k === 'line' && linesAsConnectors && (it.pts.length === 2 || it.paint.fill === 'none')) {
      const pts = it.pts.map((p) => apply(it.m, p));
      if (it.paint.stroke !== 'none') tag(lineConnector(pts, it.paint, scale), it);
      continue;
    }
    if ((it.paint.markerStart || it.paint.markerEnd) && it.k === 'path') warn.add(SVG_IMPORT_MESSAGES.marker);
    tag(stencilShape(it.name ?? 'Path', [{ segs: itemSegs(it), paint: it.paint, scale }], false), it);
  }

  pruneGroups(els);
  if (opts.center && els.length) {
    const bb = boundsOf(els);
    offsetElements(els, opts.center.x - (bb.x + bb.w / 2), opts.center.y - (bb.y + bb.h / 2));
  }
  return { elements: els, warnings: [...warn], width: r2(width), height: r2(height) };
}

/** SVG markup → editable elements (back-to-front). Throws on invalid SVG. */
export function svgToElements(svg: string, opts?: SvgToShapesOptions): DiagramElement[] {
  return convertSvg(svg, opts).elements;
}

/** Whether text looks like SVG markup (for paste). */
export const looksLikeSvg = (text: string): boolean => /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text);
