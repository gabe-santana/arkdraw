/**
 * Extra drawing helpers shared by the library modules in this folder.
 *
 * This file is auto-discovered by the registry like any other lib module, but
 * it exports no `shapes` / `libraries`, so it contributes nothing on its own.
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { PALETTE } from '@/model/defaults';
import { fillOf, strokeAttrs } from '../kit';
import { TextLines } from '../TextLines';
import type { LibraryItem, ShapeDef, ShapeRenderContext } from '../types';

// ---------------------------------------------------------------------------
// Numbers & paths
// ---------------------------------------------------------------------------

export type Pt = readonly [number, number];

/** Rounds to 2 decimals so path strings stay short. */
export const f = (v: number) => Math.round(v * 100) / 100;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const RAD = Math.PI / 180;

/** Polyline (open) or polygon (closed) path through `pts`. */
export const pathOf = (pts: readonly Pt[], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])},${f(p[1])}`).join(' ') + (close ? ' Z' : '');

/** Scales normalized (0..1) points to w×h. */
export const scalePts = (w: number, h: number, pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [x * w, y * h] as const);

/** Polygon from normalized points. */
export const normPath = (w: number, h: number, pts: readonly Pt[], close = true) => pathOf(scalePts(w, h, pts), close);

/** Vertices of a regular polygon inscribed in an ellipse (first vertex at `rot` degrees; -90 = top). */
export function regularPts(cx: number, cy: number, rx: number, ry: number, n: number, rot = -90): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (rot + (360 / n) * i) * RAD;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });
}

/** Vertices of an n-pointed star; `inner` is the inner/outer radius ratio. */
export function starPts(cx: number, cy: number, rx: number, ry: number, n: number, inner = 0.5, rot = -90): Pt[] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = (rot + (180 / n) * i) * RAD;
    const k = i % 2 ? inner : 1;
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)] as const;
  });
}

/** Maps points so their bounding box fills (0,0)-(w,h). */
export function fitPts(pts: readonly Pt[], w: number, h: number): Pt[] {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const sx = w / Math.max(1e-6, Math.max(...xs) - x0);
  const sy = h / Math.max(1e-6, Math.max(...ys) - y0);
  return pts.map(([x, y]) => [(x - x0) * sx, (y - y0) * sy] as const);
}

/** Point on an ellipse at `deg` (0 = east, 90 = south — screen coordinates). */
export const polar = (cx: number, cy: number, rx: number, ry: number, deg: number): Pt => [
  cx + rx * Math.cos(deg * RAD),
  cy + ry * Math.sin(deg * RAD),
];

/** Closed circle as a path (two arcs), handy for compound paths. */
export const circleD = (cx: number, cy: number, r: number) => ellipseD(cx, cy, r, r);
export const ellipseD = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)},${f(cy)} A${f(rx)},${f(ry)} 0 1 0 ${f(cx + rx)},${f(cy)} A${f(rx)},${f(ry)} 0 1 0 ${f(cx - rx)},${f(cy)} Z`;

/** Open elliptical arc from `a0` to `a1` degrees, clockwise on screen. */
export function arcD(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, move = true) {
  const [x0, y0] = polar(cx, cy, rx, ry, a0);
  const [x1, y1] = polar(cx, cy, rx, ry, a1);
  const large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `${move ? `M${f(x0)},${f(y0)} ` : `L${f(x0)},${f(y0)} `}A${f(rx)},${f(ry)} 0 ${large} ${sweep} ${f(x1)},${f(y1)}`;
}

/** Pie slice / sector from `a0` to `a1` degrees. */
export const sectorD = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) =>
  `M${f(cx)},${f(cy)} ${arcD(cx, cy, rx, ry, a0, a1, false)} Z`;

/** Ring segment (donut slice) between radii r0 < r1. */
export function ringD(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, ky = 1) {
  const outer = arcD(cx, cy, r1, r1 * ky, a0, a1);
  const [ix, iy] = polar(cx, cy, r0, r0 * ky, a1);
  const [ex, ey] = polar(cx, cy, r0, r0 * ky, a0);
  const large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
  return `${outer} L${f(ix)},${f(iy)} A${f(r0)},${f(r0 * ky)} 0 ${large} 0 ${f(ex)},${f(ey)} Z`;
}

/** Rounded rectangle as a path (for compound paths / cut-outs). */
export function roundRectD(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!k) return `M${f(x)},${f(y)} H${f(x + w)} V${f(y + h)} H${f(x)} Z`;
  return (
    `M${f(x + k)},${f(y)} H${f(x + w - k)} A${f(k)},${f(k)} 0 0 1 ${f(x + w)},${f(y + k)} ` +
    `V${f(y + h - k)} A${f(k)},${f(k)} 0 0 1 ${f(x + w - k)},${f(y + h)} ` +
    `H${f(x + k)} A${f(k)},${f(k)} 0 0 1 ${f(x)},${f(y + h - k)} V${f(y + k)} A${f(k)},${f(k)} 0 0 1 ${f(x + k)},${f(y)} Z`
  );
}

/** Polygon with rounded corners (quadratic fillets of radius `r`). */
export function roundedPolyD(pts: readonly Pt[], r: number) {
  const n = pts.length;
  if (n < 3 || r <= 0) return pathOf(pts);
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const k = Math.min(r, la / 2, lb / 2);
    const p0: Pt = [p[0] + ((a[0] - p[0]) / la) * k, p[1] + ((a[1] - p[1]) / la) * k];
    const p1: Pt = [p[0] + ((b[0] - p[0]) / lb) * k, p[1] + ((b[1] - p[1]) / lb) * k];
    d += `${i ? 'L' : 'M'}${f(p0[0])},${f(p0[1])} Q${f(p[0])},${f(p[1])} ${f(p1[0])},${f(p1[1])} `;
  }
  return d + 'Z';
}

/** Zig-zag polyline between two x positions (resistors, springs, walls). */
export function zigzagD(x0: number, x1: number, y: number, amp: number, n: number) {
  const step = (x1 - x0) / (n * 2);
  let d = `M${f(x0)},${f(y)}`;
  for (let i = 0; i < n * 2; i++) d += ` L${f(x0 + step * (i + 0.5))},${f(y + (i % 2 ? amp : -amp))}`;
  return d + ` L${f(x1)},${f(y)}`;
}

/** Sine-like wave across [x0, x1] at baseline y (cubic segments). */
export function waveD(x0: number, x1: number, y: number, amp: number, n: number, move = true) {
  const seg = (x1 - x0) / n;
  let d = move ? `M${f(x0)},${f(y)}` : '';
  for (let i = 0; i < n; i++) {
    const a = x0 + seg * i;
    const s = i % 2 ? 1 : -1;
    d += ` C${f(a + seg * 0.35)},${f(y + amp * s * 1.3)} ${f(a + seg * 0.65)},${f(y + amp * s * 1.3)} ${f(a + seg)},${f(y)}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/** The "ink" colour for markers & glyphs: the stroke, or the text colour when stroke-less. */
export const ink = (s: ElementStyle) => (s.stroke === 'none' ? s.textColor : s.stroke);

/** Solid-stroke variant (markers stay solid on dashed shapes), stroke width scaled by `k`. */
export const solid = (s: ElementStyle, k = 1): ElementStyle => ({
  ...s,
  stroke: ink(s),
  strokeStyle: 'solid',
  strokeWidth: Math.max(0.75, (s.strokeWidth || 1.5) * k),
});

/** Same style with a different fill. */
export const withFill = (s: ElementStyle, fill: string): ElementStyle => ({ ...s, fill });

/** The fill, or white when the shape is unfilled (for opaque overlays such as tabs). */
export const paper = (s: ElementStyle) => (s.fill === 'none' ? '#ffffff' : s.fill);

/** Filled & stroked path using the even-odd rule (frames, donuts, cut-outs). */
export const BodyEO = ({ d, s }: { d: string; s: ElementStyle }) => (
  <path d={d} fill={fillOf(s)} fillRule="evenodd" {...strokeAttrs(s)} />
);

/** Fill only, no outline (backgrounds under partial outlines). */
export const FillOnly = ({ d, s }: { d: string; s: ElementStyle }) => <path d={d} fill={fillOf(s)} stroke="none" />;

/** Ink-filled path (glyphs, solid markers). */
export const Ink = ({ d, s, opacity }: { d: string; s: ElementStyle; opacity?: number }) => (
  <path d={d} fill={ink(s)} fillOpacity={opacity} stroke="none" />
);

/** Translucent ink overlay (shading, header bands). */
export const Tint = ({ d, s, k = 0.08 }: { d: string; s: ElementStyle; k?: number }) => (
  <path d={d} fill={ink(s)} fillOpacity={k} stroke="none" />
);

/** Black overlay for side faces of 3D-ish shapes. */
export const Shade = ({ d, k = 0.07 }: { d: string; k?: number }) => <path d={d} fill="#000" fillOpacity={k} stroke="none" />;

/** Filled & stroked ellipse. */
export const Oval = ({ cx, cy, rx, ry = rx, s }: { cx: number; cy: number; rx: number; ry?: number; s: ElementStyle }) => (
  <ellipse cx={cx} cy={cy} rx={Math.max(0, rx)} ry={Math.max(0, ry)} fill={fillOf(s)} {...strokeAttrs(s)} />
);

/** Unfilled stroke line in ink colour, solid, with round caps. */
export const Line = ({ d, s, k = 1, cap = 'round' }: { d: string; s: ElementStyle; k?: number; cap?: 'round' | 'butt' | 'square' }) => {
  const st = solid(s, k);
  return <path d={d} fill="none" {...strokeAttrs(st)} strokeLinecap={cap} />;
};

/** Lucide glyph centred at (cx, cy), drawn in the ink colour. */
export function Glyph({
  Icon, cx, cy, size, s, color, sw = 1.75,
}: { Icon: ComponentType<LucideProps>; cx: number; cy: number; size: number; s: ElementStyle; color?: string; sw?: number }) {
  if (size <= 0) return null;
  return <Icon x={cx - size / 2} y={cy - size / 2} size={size} color={color ?? ink(s)} strokeWidth={sw} absoluteStrokeWidth />;
}

/** One line of text drawn by the shape itself (stereotypes, mock labels). */
export function Label({
  x, y, text, s, size = s.fontSize, anchor = 'middle', bold, italic, color, opacity,
}: {
  x: number; y: number; text: string; s: ElementStyle; size?: number; anchor?: 'start' | 'middle' | 'end';
  bold?: boolean; italic?: boolean; color?: string; opacity?: number;
}) {
  if (!text) return null;
  const st: ElementStyle = { ...s, fontSize: size, italic: italic ?? s.italic, textColor: color ?? s.textColor };
  return (
    <g opacity={opacity}>
      <TextLines lines={[text]} x={x} y={y - size * 0.65} anchor={anchor} style={st} bold={bold} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Soft fill + saturated stroke pairs from the editor palette. */
const P = PALETTE;
export const TONE = {
  white: { fill: P.fills[0], stroke: P.strokes[0] },
  slate: { fill: P.fills[1], stroke: P.strokes[1] },
  red: { fill: P.fills[2], stroke: P.strokes[2] },
  orange: { fill: P.fills[3], stroke: P.strokes[3] },
  amber: { fill: P.fills[4], stroke: P.strokes[4] },
  green: { fill: P.fills[5], stroke: P.strokes[5] },
  teal: { fill: P.fills[6], stroke: P.strokes[6] },
  blue: { fill: P.fills[7], stroke: P.strokes[7] },
  indigo: { fill: P.fills[8], stroke: P.strokes[8] },
  violet: { fill: P.fills[9], stroke: P.strokes[9] },
  fuchsia: { fill: P.fills[10], stroke: P.strokes[10] },
  pink: { fill: P.fills[11], stroke: P.strokes[11] },
} satisfies Record<string, Partial<ElementStyle>>;

/** Saturated solid fill with white text (badges, buttons, banners). */
export const solidTone = (k: keyof typeof TONE): Partial<ElementStyle> => ({
  fill: TONE[k].stroke,
  stroke: TONE[k].stroke,
  textColor: '#ffffff',
});

// ---------------------------------------------------------------------------
// Definition helpers
// ---------------------------------------------------------------------------

type Render = (ctx: ShapeRenderContext) => ReturnType<ShapeDef['render']>;

/** Shape definition shorthand: `shape(kind, label, drawio, render, extra)`. */
export const shape = (kind: string, label: string, drawio: string, render: Render, extra: Partial<ShapeDef> = {}): ShapeDef => ({
  kind,
  label,
  drawio,
  render,
  ...extra,
});

/** Library item shorthand. */
export const item = (kind: string, label: string, w: number, h: number, extra: Partial<LibraryItem> = {}): LibraryItem => ({
  kind,
  label,
  w,
  h,
  ...extra,
});

/** Text box helper: fractions of the bounds. */
export const fracBox = (w: number, h: number, x0: number, y0: number, x1: number, y1: number): Rect => ({
  x: w * x0,
  y: h * y0,
  w: Math.max(1, w * (x1 - x0)),
  h: Math.max(1, h * (y1 - y0)),
});

/** Largest centred square of side min(w, h) * k: returns its origin and side. */
export const square = (w: number, h: number, k = 1) => {
  const side = Math.min(w, h) * k;
  return { x: (w - side) / 2, y: (h - side) / 2, side };
};
