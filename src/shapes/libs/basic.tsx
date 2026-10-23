/**
 * Basic geometric primitives and the Misc / Advanced grab-bag
 * (draw.io "Basic", "Misc" and "Advanced" palettes).
 */
import { Image as ImageIcon, Link2 } from 'lucide-react';
import { Body, Detail, HorizontalCylinder, RoundRect, hCylRx, inset } from '../kit';
import type { ParamValues, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { handle, param, pn } from '../params';
import { tapeD } from '../paramGeometry';
import {
  BodyEO, FillOnly, Glyph, Line, Oval, Shade, Tint, arcD, ellipseD, f, fitPts, fracBox, item, normPath, pathOf,
  regularPts, ringD, roundRectD, roundedPolyD, sectorD, shape, solid, starPts, waveD, type Pt,
} from './_kit2';

const m = (w: number, h: number) => Math.min(w, h);

/** A star whose points fill the bounds. */
const star = (n: number, inner: number) => (w: number, h: number) => pathOf(fitPts(starPts(0, 0, 1, 1, n, inner), w, h));
/** A regular polygon whose vertices fill the bounds. */
const regular = (n: number, rot = -90) => (w: number, h: number) => pathOf(fitPts(regularPts(0, 0, 1, 1, n, rot), w, h));

/** Number of sides of a regular polygon (not a draw.io key; kept for our own round-trip). */
const SIDES = (n: number) => param.count('sides', 'Sides', n, 3, 24, { drawio: 'polySides' });

/** Inner-radius handle on the first inner vertex of a star fitted to the bounds. */
function starHandle(w: number, h: number, p: ParamValues) {
  const raw = starPts(0, 0, 1, 1, pn(p, 'points'), pn(p, 'inner'));
  const span = (i: 0 | 1) => Math.max(1e-6, Math.max(...raw.map((q) => q[i])) - Math.min(...raw.map((q) => q[i])));
  // The centre rides along through the fit (as the last point) so we can measure from it.
  const pts = fitPts([...raw, [0, 0]], w, h);
  const [cx, cy] = pts[pts.length - 1];
  const sx = w / span(0);
  const sy = h / span(1);
  return handle(pts[1][0], pts[1][1], (pt) => ({ params: { inner: Math.hypot((pt.x - cx) / sx, (pt.y - cy) / sy) } }));
}

const STARS: Array<[string, string, number, number, string]> = [
  ['basic.star4', '4-point star', 4, 0.38, 'shape=mxgraph.basic.4_point_star_2;dx=0.8;'],
  ['basic.star5', '5-point star', 5, 0.42, 'shape=mxgraph.basic.star;'],
  ['basic.star6', '6-point star', 6, 0.55, 'shape=mxgraph.basic.6_point_star;'],
  ['basic.star8', '8-point star', 8, 0.62, 'shape=mxgraph.basic.8_point_star;'],
];

const heart = (w: number, h: number) =>
  `M${w / 2},${h * 0.26} C${w / 2},${h * 0.1} ${w * 0.38},0 ${w * 0.24},0 C${w * 0.09},0 0,${h * 0.13} 0,${h * 0.3} ` +
  `C0,${h * 0.56} ${w * 0.26},${h * 0.76} ${w / 2},${h} C${w * 0.74},${h * 0.76} ${w},${h * 0.56} ${w},${h * 0.3} ` +
  `C${w},${h * 0.13} ${w * 0.91},0 ${w * 0.76},0 C${w * 0.62},0 ${w / 2},${h * 0.1} ${w / 2},${h * 0.26} Z`;

const moon = (w: number, h: number) =>
  `M${w * 0.7},${h * 0.04} A${w / 2},${h / 2} 0 1 0 ${w * 0.7},${h * 0.96} A${w * 0.38},${h / 2} 0 0 1 ${w * 0.7},${h * 0.04} Z`;

const teardrop = (w: number, h: number) =>
  `M${w / 2},0 C${w * 0.62},${h * 0.18} ${w},${h * 0.42} ${w},${h * 0.66} C${w},${h * 0.85} ${w * 0.78},${h} ${w / 2},${h} ` +
  `C${w * 0.22},${h} 0,${h * 0.85} 0,${h * 0.66} C0,${h * 0.42} ${w * 0.38},${h * 0.18} ${w / 2},0 Z`;

/** Plus sign with equal arm thickness. */
function plus(w: number, h: number, size: number) {
  const t = m(w, h) * size;
  const x0 = (w - t) / 2;
  const y0 = (h - t) / 2;
  return pathOf([
    [x0, 0], [x0 + t, 0], [x0 + t, y0], [w, y0], [w, y0 + t], [x0 + t, y0 + t],
    [x0 + t, h], [x0, h], [x0, y0 + t], [0, y0 + t], [0, y0], [x0, y0],
  ]);
}

/** Diagonal cross (X). */
function xcross(w: number, h: number) {
  const a = 0.17;
  const pts: Pt[] = [
    [0, a], [a, 0], [0.5, 0.5 - a], [1 - a, 0], [1, a], [0.5 + a, 0.5],
    [1, 1 - a], [1 - a, 1], [0.5, 0.5 + a], [a, 1], [0, 1 - a], [0.5 - a, 0.5],
  ];
  return normPath(w, h, pts);
}

/** Wavy band: wavy top and bottom edges in phase. */
function wavyBand(w: number, h: number, amp: number, n: number) {
  return `${waveD(0, w, amp, amp, n)} L${w},${h - amp}${waveD(w, 0, h - amp, -amp, n, false)} Z`;
}

const cutCorners = (w: number, h: number, c: number, corners: [boolean, boolean, boolean, boolean]) => {
  const [tl, tr, br, bl] = corners;
  return pathOf([
    ...(tl ? ([[0, c], [c, 0]] as Pt[]) : ([[0, 0]] as Pt[])),
    ...(tr ? ([[w - c, 0], [w, c]] as Pt[]) : ([[w, 0]] as Pt[])),
    ...(br ? ([[w, h - c], [w - c, h]] as Pt[]) : ([[w, h]] as Pt[])),
    ...(bl ? ([[c, h], [0, h - c]] as Pt[]) : ([[0, h]] as Pt[])),
  ]);
};

/** Rect with independently rounded corners [tl, tr, br, bl]. */
function cornerRect(w: number, h: number, r: number, [tl, tr, br, bl]: [number, number, number, number]) {
  const k = (v: number) => Math.min(v, w / 2, h / 2);
  const [a, b, c, d] = [k(tl * r), k(tr * r), k(br * r), k(bl * r)];
  return (
    `M${a},0 H${w - b} ${b ? `A${b},${b} 0 0 1 ${w},${b}` : ''} V${h - c} ${c ? `A${c},${c} 0 0 1 ${w - c},${h}` : ''} ` +
    `H${d} ${d ? `A${d},${d} 0 0 1 0,${h - d}` : ''} V${a} ${a ? `A${a},${a} 0 0 1 ${a},0` : ''} Z`
  );
}

/** draw.io partialRectangle: which sides get an outline. */
export const PARTIAL_SIDES = (top: number, right: number, bottom: number, left: number) => [
  param.bool('top', 'Top', !!top, { drawioDefault: 1 }),
  param.bool('right', 'Right', !!right, { drawioDefault: 1 }),
  param.bool('bottom', 'Bottom', !!bottom, { drawioDefault: 1 }),
  param.bool('left', 'Left', !!left, { drawioDefault: 1 }),
];

function renderPartial({ w, h, style, params }: ShapeRenderContext) {
  const on = (k: string) => pn(params, k) !== 0;
  const d = [on('top') && `M0,0 H${w}`, on('right') && `M${w},0 V${h}`, on('bottom') && `M0,${h} H${w}`, on('left') && `M0,0 V${h}`].filter(Boolean).join(' ');
  return (
    <>
      <FillOnly d={roundRectD(0, 0, w, h, 0)} s={style} />
      {d && <Detail d={d} s={style} />}
    </>
  );
}

const shapes: ShapeDef[] = [
  // ----- Stars & polygons ---------------------------------------------------
  ...STARS.map(([kind, label, n, inner, drawio]) =>
    shape(kind, label, drawio, ({ w, h, style, params }) => <Body d={star(pn(params, 'points'), pn(params, 'inner'))(w, h)} s={style} />, {
      params: [
        param.count('points', 'Points', n, 3, 24, { drawio: 'starPoints' }),
        param.pct('inner', 'Inner radius', inner, { min: 0.05, max: 0.95, drawio: 'innerRadius' }),
      ],
      handles: ({ w, h, p }) => [starHandle(w, h, p)],
      textBox: (w, h) => fracBox(w, h, 0.18, 0.34, 0.82, 0.74),
    }),
  ),
  shape('basic.pentagon', 'Pentagon', 'shape=mxgraph.basic.pentagon;', ({ w, h, style, params }) => <Body d={regular(pn(params, 'sides'))(w, h)} s={style} />, {
    params: [SIDES(5)],
    textBox: (w, h) => fracBox(w, h, 0.2, 0.3, 0.8, 0.85),
  }),
  shape('basic.heptagon', 'Heptagon', 'shape=mxgraph.basic.polygon;polyCoords=[[0.5,0],[0.89,0.19],[1,0.61],[0.72,1],[0.28,1],[0,0.61],[0.11,0.19]];', ({ w, h, style, params }) => <Body d={regular(pn(params, 'sides'))(w, h)} s={style} />, {
    params: [SIDES(7)],
    textBox: (w, h) => fracBox(w, h, 0.16, 0.2, 0.84, 0.85),
  }),
  shape('basic.octagon', 'Octagon', 'shape=mxgraph.basic.octagon2;dx=15;', ({ w, h, style }) => {
    const c = m(w, h) * 0.29;
    return <Body d={cutCorners(w, h, c, [true, true, true, true])} s={style} />;
  }, { textBox: (w, h) => inset(w, h, m(w, h) * 0.14, m(w, h) * 0.1) }),
  shape('basic.polygon', 'Polygon', 'shape=mxgraph.basic.polygon;polyCoords=[[0.25,0],[0.75,0],[1,0.45],[0.8,1],[0.2,1],[0,0.45]];', ({ w, h, style }) => (
    <Body d={normPath(w, h, [[0.12, 0.12], [0.62, 0], [1, 0.38], [0.86, 1], [0.24, 0.9], [0, 0.48]])} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.18, 0.2, 0.84, 0.82) }),
  shape('basic.rightTriangle', 'Right triangle', 'shape=mxgraph.basic.orthogonal_triangle;', ({ w, h, style }) => (
    <Body d={pathOf([[0, 0], [w, h], [0, h]])} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.05, 0.5, 0.55, 0.95) }),
  shape('basic.halfCircle', 'Half circle', 'shape=mxgraph.basic.half_circle;', ({ w, h, style }) => (
    <Body d={`M0,${h} A${w / 2},${h} 0 0 1 ${w},${h} Z`} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.18, 0.35, 0.82, 0.95) }),

  // ----- Symbols --------------------------------------------------------------
  shape('basic.plus', 'Cross', 'shape=cross;size=0.34;', ({ w, h, style, params }) => <Body d={plus(w, h, pn(params, 'size'))} s={style} />, {
    params: [param.pct('size', 'Thickness', 0.34, { drawioDefault: 0.2 })],
    // draw.io: the handle sits at the centre minus half the arm thickness.
    handles: ({ w, h, p }) => {
      const t = (m(w, h) * pn(p, 'size')) / 2;
      return [handle(w / 2 - t, h / 2 - t, (pt) => ({ params: { size: (Math.min(h / 2 - pt.y, w / 2 - pt.x) * 2) / m(w, h) } }))];
    },
    textBox: (w, h, p) => {
      const t = m(w, h) * pn(p, 'size');
      return { x: 4, y: (h - t) / 2, w: Math.max(1, w - 8), h: t };
    },
  }),
  shape('basic.x', 'Diagonal cross', 'shape=mxgraph.basic.x;', ({ w, h, style }) => <Body d={xcross(w, h)} s={style} />, {
    textBox: (w, h) => fracBox(w, h, 0.18, 0.36, 0.82, 0.64),
  }),
  shape('basic.heart', 'Heart', 'shape=mxgraph.basic.heart;', ({ w, h, style }) => <Body d={heart(w, h)} s={style} />, {
    textBox: (w, h) => fracBox(w, h, 0.18, 0.2, 0.82, 0.66),
  }),
  shape('basic.moon', 'Moon', 'shape=mxgraph.basic.moon;', ({ w, h, style }) => <Body d={moon(w, h)} s={style} />, {
    textPlacement: 'below',
  }),
  shape('basic.sun', 'Sun', 'shape=mxgraph.basic.sun;', ({ w, h, style }) => {
    const cx = w / 2;
    const cy = h / 2;
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 * Math.PI) / 180;
      const da = 0.2;
      const p = (k: number, d: number): Pt => [cx + (w / 2) * k * Math.cos(a + d), cy + (h / 2) * k * Math.sin(a + d)];
      return pathOf([p(0.66, -da), p(1, 0), p(0.66, da)]);
    });
    return (
      <>
        {rays.map((d, i) => <Body key={i} d={d} s={style} />)}
        <Oval cx={cx} cy={cy} rx={w * 0.29} ry={h * 0.29} s={style} />
      </>
    );
  }, { textBox: (w, h) => fracBox(w, h, 0.22, 0.3, 0.78, 0.7) }),
  shape('basic.lightning', 'Lightning', 'shape=mxgraph.basic.flash;', ({ w, h, style }) => (
    <Body d={roundedPolyD(fitPts([[0.36, 0], [0.8, 0], [0.56, 0.38], [0.88, 0.38], [0.2, 1], [0.4, 0.54], [0.1, 0.54]], w, h), 1.5)} s={style} />
  ), { textPlacement: 'below' }),
  shape('basic.teardrop', 'Teardrop', 'shape=mxgraph.basic.drop;', ({ w, h, style }) => <Body d={teardrop(w, h)} s={style} />, {
    textBox: (w, h) => fracBox(w, h, 0.18, 0.45, 0.82, 0.9),
  }),
  shape('basic.smiley', 'Smiley', 'shape=mxgraph.basic.smiley;', ({ w, h, style }) => (
    <>
      <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />
      <Oval cx={w * 0.35} cy={h * 0.38} rx={w * 0.05} ry={h * 0.07} s={{ ...solid(style), fill: solid(style).stroke }} />
      <Oval cx={w * 0.65} cy={h * 0.38} rx={w * 0.05} ry={h * 0.07} s={{ ...solid(style), fill: solid(style).stroke }} />
      <Line d={`M${w * 0.28},${h * 0.6} Q${w / 2},${h * 0.84} ${w * 0.72},${h * 0.6}`} s={style} />
    </>
  ), { textPlacement: 'below' }),

  // ----- Rings, pies and frames -------------------------------------------
  shape('basic.donut', 'Donut', 'shape=mxgraph.basic.donut;dx=25;', ({ w, h, style, params }) => {
    const t = Math.min(pn(params, 'dx'), m(w, h) / 2);
    return <BodyEO d={`${ellipseD(w / 2, h / 2, w / 2, h / 2)} ${ellipseD(w / 2, h / 2, Math.max(0, w / 2 - t), Math.max(0, h / 2 - t))}`} s={style} />;
  }, {
    params: [param.px('dx', 'Thickness', 25)],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'dx'), m(w, h) / 2), h / 2, (pt) => ({ params: { dx: Math.round(pt.x) } }))],
    textBox: (w, h) => fracBox(w, h, 0.24, 0.32, 0.76, 0.68),
  }),
  shape('basic.pie', 'Pie', 'shape=mxgraph.basic.pie;startAngle=0.25;endAngle=1;', ({ w, h, style }) => (
    <Body d={sectorD(w / 2, h / 2, w / 2, h / 2, 0, 270)} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.15, 0.5, 0.5, 0.85) }),
  shape('basic.arc', 'Block arc', 'shape=mxgraph.basic.partConcEllipse;startAngle=0.75;endAngle=0.25;arcWidth=0.4;', ({ w, h, style }) => (
    <Body d={ringD(w / 2, h, (w / 2) * 0.6, w / 2, 180, 360, (2 * h) / w)} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.3, 0.55, 0.7, 1) }),
  shape('basic.arcLine', 'Arc', 'shape=mxgraph.basic.arc;startAngle=0.3;endAngle=0.1;', ({ w, h, style }) => (
    <Detail d={arcD(w / 2, h / 2, w / 2, h / 2, 200, 340)} s={style} />
  ), { boxHit: true, textPlacement: 'below' }),
  shape('basic.frame', 'Frame', 'shape=mxgraph.basic.frame;dx=10;', ({ w, h, style, params }) => {
    const t = Math.min(pn(params, 'dx'), m(w, h) / 2);
    return <BodyEO d={`${roundRectD(0, 0, w, h, 0)} ${roundRectD(t, t, w - t * 2, h - t * 2, 0)}`} s={style} />;
  }, {
    params: [param.px('dx', 'Thickness', 14, { drawioDefault: 10 })],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'dx'), m(w, h) / 2), h / 2, (pt) => ({ params: { dx: Math.round(pt.x) } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(pn(p, 'dx'), m(w, h) / 2) + 6),
  }),
  shape('basic.roundedFrame', 'Rounded frame', 'shape=mxgraph.basic.rounded_frame;dx=10;', ({ w, h, style }) => {
    const t = Math.min(14, m(w, h) * 0.18);
    const r = Math.min(style.radius + t, m(w, h) / 2);
    return <BodyEO d={`${roundRectD(0, 0, w, h, r)} ${roundRectD(t, t, w - t * 2, h - t * 2, Math.max(0, r - t))}`} s={style} />;
  }, { rounded: true, textBox: (w, h) => inset(w, h, Math.min(14, m(w, h) * 0.18) + 6) }),

  // ----- Partial rectangles -------------------------------------------------
  shape('basic.partialTB', 'Partial rectangle (top & bottom)', 'shape=partialRectangle;left=0;right=0;whiteSpace=wrap;', renderPartial, {
    boxHit: true,
    params: PARTIAL_SIDES(1, 0, 1, 0),
  }),
  shape('basic.partialLR', 'Partial rectangle (sides)', 'shape=partialRectangle;top=0;bottom=0;whiteSpace=wrap;', renderPartial, {
    boxHit: true,
    params: PARTIAL_SIDES(0, 1, 0, 1),
  }),
  shape('basic.partialOpenRight', 'Partial rectangle (open right)', 'shape=partialRectangle;right=0;whiteSpace=wrap;', renderPartial, {
    boxHit: true,
    params: PARTIAL_SIDES(1, 0, 1, 1),
  }),
  shape('basic.partialBottom', 'Underline box', 'shape=partialRectangle;top=0;left=0;right=0;whiteSpace=wrap;', renderPartial, {
    boxHit: true,
    params: PARTIAL_SIDES(0, 0, 1, 0),
  }),

  // ----- Corner variants ----------------------------------------------------
  shape('basic.oneRound', 'One round corner', 'shape=mxgraph.basic.corner_round_rect;dx=12;', ({ w, h, style }) => (
    <Body d={cornerRect(w, h, Math.max(style.radius, 4) * 2, [0, 1, 0, 0])} s={style} />
  ), { rounded: true }),
  shape('basic.diagRound', 'Diagonal round corners', 'shape=mxgraph.basic.diag_round_rect;dx=12;', ({ w, h, style }) => (
    <Body d={cornerRect(w, h, Math.max(style.radius, 4) * 2, [1, 0, 1, 0])} s={style} />
  ), { rounded: true }),
  shape('basic.topRound', 'Top round corners', 'shape=mxgraph.basic.rect;fillColor2=none;strokeWidth=1;size=20;indent=5;rounded=1;', ({ w, h, style }) => (
    <Body d={cornerRect(w, h, Math.max(style.radius, 4) * 1.5, [1, 1, 0, 0])} s={style} />
  ), { rounded: true }),
  shape('basic.snip', 'Snipped corner', 'shape=mxgraph.basic.corner_snip_rect;dx=12;', ({ w, h, style, params }) => (
    <Body d={cutCorners(w, h, Math.min(pn(params, 'dx'), m(w, h) / 2), [false, true, false, false])} s={style} />
  ), {
    params: [param.px('dx', 'Corner', 16, { drawioDefault: 6 })],
    handles: ({ w, h, p }) => [handle(w - Math.min(pn(p, 'dx'), m(w, h) / 2), 0, (pt) => ({ params: { dx: Math.round(w - pt.x) } }))],
  }),
  shape('basic.diagSnip', 'Diagonal snipped corners', 'shape=mxgraph.basic.diag_snip_rect;dx=12;', ({ w, h, style, params }) => (
    <Body d={cutCorners(w, h, Math.min(pn(params, 'dx'), m(w, h) / 2), [true, false, true, false])} s={style} />
  ), {
    params: [param.px('dx', 'Corner', 16, { drawioDefault: 6 })],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'dx'), m(w, h) / 2), 0, (pt) => ({ params: { dx: Math.round(pt.x) } }))],
  }),
  shape('basic.plaque', 'Plaque', 'shape=plaque;size=10;', ({ w, h, style, params }) => {
    const c = Math.min(pn(params, 'size'), m(w, h) / 2);
    return (
      <Body
        d={`M${c},0 H${w - c} A${c},${c} 0 0 0 ${w},${c} V${h - c} A${c},${c} 0 0 0 ${w - c},${h} H${c} A${c},${c} 0 0 0 0,${h - c} V${c} A${c},${c} 0 0 0 ${c},0 Z`}
        s={style}
      />
    );
  }, {
    params: [param.px('size', 'Corner', 12, { drawioDefault: 16 })],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'size'), m(w, h) / 2), 0, (pt) => ({ params: { size: Math.round(pt.x) } }))],
  }),

  // ----- Classic draw.io general extras ---------------------------------------
  shape('basic.cube', 'Cube', 'shape=cube;size=16;', ({ w, h, style, params }) => {
    const d = Math.min(pn(params, 'size'), m(w, h));
    return (
      <>
        <Body d={pathOf([[d, d], [w, d], [w, h], [d, h]])} s={style} />
        <Body d={pathOf([[0, 0], [w - d, 0], [w, d], [d, d]])} s={style} />
        <Body d={pathOf([[0, 0], [d, d], [d, h], [0, h - d]])} s={style} />
        <Shade d={pathOf([[0, 0], [d, d], [d, h], [0, h - d]])} k={0.08} />
        <Shade d={pathOf([[0, 0], [w - d, 0], [w, d], [d, d]])} k={0.03} />
      </>
    );
  }, {
    params: [param.px('size', 'Depth', 16, { drawioDefault: 20 })],
    handles: ({ w, h, p }) => {
      const d = Math.min(pn(p, 'size'), m(w, h));
      return [handle(d, d, (pt) => ({ params: { size: Math.round(Math.max(0, (pt.x + pt.y) / 2)) } }))];
    },
    textBox: (w, h, p) => {
      const d = Math.min(pn(p, 'size'), m(w, h));
      return { x: d + 6, y: d + 4, w: Math.max(1, w - d - 12), h: Math.max(1, h - d - 8) };
    },
  }),
  shape('basic.step', 'Step', 'shape=step;perimeter=stepPerimeter;size=0.2;', ({ w, h, style, params }) => {
    const s = w * pn(params, 'size');
    return <Body d={pathOf([[0, 0], [w - s, 0], [w, h / 2], [w - s, h], [0, h], [s, h / 2]])} s={style} />;
  }, {
    params: [param.pct('size', 'Notch', 0.2, { max: 0.5, fixedSizeOf: 'w' })],
    handles: ({ w, h, p }) => [handle(w * pn(p, 'size'), h / 2, (pt) => ({ params: { size: pt.x / w } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(w * 0.45, w * pn(p, 'size') + 2), 6),
  }),
  shape('basic.tape', 'Tape', 'shape=tape;size=0.2;whiteSpace=wrap;', ({ w, h, style, params }) => (
    <Body d={tapeD(w, h, pn(params, 'size'))} s={style} />
  ), {
    params: [param.pct('size', 'Wave', 0.2, { max: 0.6, drawioDefault: 0.4 })],
    handles: ({ w, h, p }) => [handle(w / 2, (h * pn(p, 'size')) / 2, (pt) => ({ params: { size: (pt.y * 2) / h } }))],
    textBox: (w, h, p) => fracBox(w, h, 0.06, Math.min(0.45, pn(p, 'size')), 0.94, Math.max(0.55, 1 - pn(p, 'size'))),
  }),
  shape('basic.wave', 'Wave', 'shape=mxgraph.basic.wave2;dy=0.25;', ({ w, h, style }) => (
    <Body d={wavyBand(w, h, h * 0.16, 4)} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.06, 0.3, 0.94, 0.7) }),
  shape('basic.card', 'Card', 'shape=card;size=18;whiteSpace=wrap;', ({ w, h, style, params }) => (
    <Body d={cutCorners(w, h, Math.min(pn(params, 'size'), m(w, h)), [true, false, false, false])} s={style} />
  ), {
    params: [param.px('size', 'Corner', 18, { drawioDefault: 30 })],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'size'), m(w, h)), 0, (pt) => ({ params: { size: Math.round(pt.x) } }))],
    textBox: (w, h) => inset(w, h, 10, 8),
  }),
  shape('basic.multiDocument', 'Multi-document', 'shape=mxgraph.flowchart.multi-document;whiteSpace=wrap;', ({ w, h, style }) => {
    const o = Math.min(8, w * 0.08, h * 0.1);
    const doc = (x: number, y: number, dw: number, dh: number) => {
      const a = dh * 0.1;
      return `M${x},${y} H${x + dw} V${y + dh - a} Q${x + dw * 0.75},${y + dh - a * 2.5} ${x + dw / 2},${y + dh - a} T${x},${y + dh - a} Z`;
    };
    const dw = w - o * 2;
    const dh = h - o * 2;
    return (
      <>
        <Body d={doc(o * 2, 0, dw, dh)} s={style} />
        <Body d={doc(o, o, dw, dh)} s={style} />
        <Body d={doc(0, o * 2, dw, dh)} s={style} />
      </>
    );
  }, {
    textBox: (w, h) => {
      const o = Math.min(8, w * 0.08, h * 0.1);
      return { x: 8, y: o * 2 + 4, w: Math.max(1, w - o * 2 - 16), h: Math.max(1, (h - o * 2) * 0.8 - 8) };
    },
  }),
  shape('basic.documentFold', 'Folded document', 'shape=note;size=16;whiteSpace=wrap;backgroundOutline=1;', ({ w, h, style, params }) => {
    const c = Math.min(pn(params, 'size'), m(w, h));
    return (
      <>
        <Body d={pathOf([[0, 0], [w - c, 0], [w, c], [w, h], [0, h]])} s={style} />
        <Body d={pathOf([[w - c, 0], [w - c, c], [w, c]])} s={style} />
        <Shade d={pathOf([[w - c, 0], [w - c, c], [w, c]])} k={0.06} />
      </>
    );
  }, {
    params: [param.px('size', 'Fold', 18, { drawioDefault: 30 })],
    handles: ({ w, h, p }) => [handle(w - Math.min(pn(p, 'size'), m(w, h)), 0, (pt) => ({ params: { size: Math.round(w - pt.x) } }))],
    textBox: (w, h, p) => inset(w, h, 10, Math.min(pn(p, 'size'), m(w, h)) * 0.6 + 6),
  }),

  // ----- Misc / Advanced --------------------------------------------------------
  shape('misc.dataStorage', 'Data storage', 'shape=dataStorage;fixedSize=1;size=12;whiteSpace=wrap;', ({ w, h, style, params }) => {
    const s = Math.min(pn(params, 'size'), w / 2);
    return <Body d={`M${s},0 H${w} A${s},${h / 2} 0 0 0 ${w},${h} H${s} A${s},${h / 2} 0 0 1 ${s},0 Z`} s={style} />;
  }, {
    params: [param.px('size', 'Curve', 14, { fixedSizeOf: 'w', drawioDefault: 0.1 })],
    handles: ({ w, p }) => [handle(Math.min(pn(p, 'size'), w / 2), 0, (pt) => ({ params: { size: Math.round(pt.x) } }))],
    textBox: (w, h, p) => ({ x: Math.min(pn(p, 'size'), w / 2), y: 6, w: Math.max(1, w - Math.min(pn(p, 'size'), w / 2) * 2 - 2), h: Math.max(1, h - 12) }),
  }),
  shape('misc.hCylinder', 'Horizontal cylinder', 'shape=cylinder3;direction=south;size=15;boundedLbl=1;whiteSpace=wrap;', HorizontalCylinder, {
    params: [param.px('size', 'Depth', 15, { max: 500 })],
    handles: ({ w, h, p }) => [handle(w - hCylRx(w, h, p.size), h / 2, (pt) => ({ params: { size: Math.round(Math.min(w / 2, w - pt.x)) } }))],
    textBox: (w, h, p) => {
      const rx = hCylRx(w, h, p?.size);
      return { x: rx + 4, y: 6, w: Math.max(1, w - rx * 3 - 8), h: Math.max(1, h - 12) };
    },
  }),
  shape('misc.loopLimit', 'Loop limit', 'shape=loopLimit;size=14;whiteSpace=wrap;', ({ w, h, style, params }) => (
    <Body d={cutCorners(w, h, Math.min(pn(params, 'size'), w / 2, h), [true, true, false, false])} s={style} />
  ), {
    params: [param.px('size', 'Corner', 16, { drawioDefault: 20 })],
    handles: ({ w, h, p }) => [handle(Math.min(pn(p, 'size'), w / 2, h), 0, (pt) => ({ params: { size: Math.round(pt.x) } }))],
  }),
  shape('misc.display', 'Display', 'shape=display;whiteSpace=wrap;', ({ w, h, style }) => {
    const s = Math.min(w * 0.18, h * 0.6);
    return <Body d={`M0,${h / 2} L${s},0 H${w - s} A${s},${h / 2} 0 0 1 ${w - s},${h} H${s} Z`} s={style} />;
  }, { textBox: (w, h) => inset(w, h, Math.min(w * 0.18, h * 0.6), 6) }),
  shape('misc.collate', 'Collate', 'shape=collate;whiteSpace=wrap;', ({ w, h, style }) => (
    <Body d={pathOf([[0, 0], [w, 0], [0, h], [w, h]])} s={style} />
  ), { textPlacement: 'below' }),
  shape('misc.sort', 'Sort', 'shape=sortShape;perimeter=rhombusPerimeter;whiteSpace=wrap;', ({ w, h, style }) => (
    <>
      <Body d={`M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`} s={style} />
      <Detail d={`M0,${h / 2} H${w}`} s={style} />
    </>
  ), { perimeter: 'diamond', textBox: (w, h) => fracBox(w, h, 0.25, 0.22, 0.75, 0.48) }),
  shape('misc.merge', 'Merge', 'triangle;direction=south;whiteSpace=wrap;', ({ w, h, style }) => (
    <Body d={pathOf([[0, 0], [w, 0], [w / 2, h]])} s={style} />
  ), { textBox: (w, h) => fracBox(w, h, 0.25, 0.05, 0.75, 0.5) }),
  shape('misc.or', 'Or junction', 'shape=mxgraph.flowchart.or;', ({ w, h, style }) => {
    const k = Math.SQRT1_2;
    const [x0, x1, y0, y1] = [w / 2 - (w / 2) * k, w / 2 + (w / 2) * k, h / 2 - (h / 2) * k, h / 2 + (h / 2) * k];
    return (
      <>
        <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />
        <Detail d={`M${x0},${y0} L${x1},${y1} M${x1},${y0} L${x0},${y1}`} s={{ ...style, strokeStyle: 'solid' }} />
      </>
    );
  }, { perimeter: 'ellipse', textPlacement: 'below' }),
  shape('misc.summing', 'Summing junction', 'shape=mxgraph.flowchart.summing_function;', ({ w, h, style }) => (
    <>
      <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />
      <Detail d={`M0,${h / 2} H${w} M${w / 2},0 V${h}`} s={{ ...style, strokeStyle: 'solid' }} />
    </>
  ), { perimeter: 'ellipse', textPlacement: 'below' }),
  shape('misc.table', 'Table', 'shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;', ({ w, h, style }) => {
    const rows = 4;
    const cols = 3;
    const rh = h / rows;
    const thin = { ...style, strokeStyle: 'solid' as const, strokeWidth: Math.max(1, style.strokeWidth * 0.66) };
    let d = '';
    for (let r = 1; r < rows; r++) d += `M0,${f(rh * r)} H${w} `;
    for (let c = 1; c < cols; c++) d += `M${f((w / cols) * c)},0 V${h} `;
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, 6)} />
        <Tint d={cornerRect(w, rh, Math.min(style.radius, 6), [1, 1, 0, 0])} s={style} k={0.1} />
        <Detail d={d} s={thin} />
      </>
    );
  }, { rounded: true, textBox: (w, h) => ({ x: 6, y: 0, w: Math.max(1, w - 12), h: h / 4 }) }),
  shape('misc.image', 'Image placeholder', 'shape=mxgraph.mockup.graphics.simpleIcon;', ({ w, h, style }) => {
    const s = m(w, h);
    const ink = solid(style).stroke;
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        <path
          d={`M${w * 0.12},${h * 0.82} L${w * 0.38},${h * 0.48} L${w * 0.55},${h * 0.66} L${w * 0.68},${h * 0.54} L${w * 0.88},${h * 0.82} Z`}
          fill={ink}
          fillOpacity={0.22}
          stroke="none"
        />
        <circle cx={w * 0.7} cy={h * 0.3} r={s * 0.09} fill={ink} fillOpacity={0.3} />
      </>
    );
  }, { rounded: true }),
  shape('misc.imageIcon', 'Image', 'shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;', ({ w, h, style }) => (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Glyph Icon={ImageIcon} cx={w / 2} cy={h / 2} size={m(w, h) * 0.5} s={style} />
    </>
  ), { rounded: true, textPlacement: 'below' }),
  shape('misc.link', 'Link', 'text;html=1;fontColor=#2563EB;fontStyle=4;align=left;spacingLeft=24;', ({ h, style }) => (
    <Glyph Icon={Link2} cx={Math.min(h, 24) / 2 + 2} cy={h / 2} size={Math.min(h * 0.7, 18)} s={style} color={style.textColor} />
  ), { boxHit: true, textBox: (w, h) => ({ x: Math.min(h, 24) + 4, y: 0, w: Math.max(1, w - Math.min(h, 24) - 4), h }) }),
  shape('misc.curlyLeft', 'Curly brace (left)', 'shape=curlyBracket;rounded=1;size=0.5;', ({ w, h, style, params }) => {
    const x = w * pn(params, 'size');
    const r = Math.min(w * 0.5, h * 0.1);
    return (
      <Detail
        d={`M${w},0 Q${x},0 ${x},${r} V${h / 2 - r} Q${x},${h / 2} 0,${h / 2} Q${x},${h / 2} ${x},${h / 2 + r} V${h - r} Q${x},${h} ${w},${h}`}
        s={style}
      />
    );
  }, {
    boxHit: true,
    params: [param.pct('size', 'Spine', 0.5)],
    handles: ({ w, h, p }) => [handle(w * pn(p, 'size'), h / 4, (pt) => ({ params: { size: pt.x / w } }))],
  }),
  // Drawn mirrored natively; exported as draw.io's flipped curlyBracket, so `size` is measured from the right.
  shape('misc.curlyRight', 'Curly brace (right)', 'shape=curlyBracket;rounded=1;size=0.5;flipH=1;', ({ w, h, style, params }) => {
    const x = w * (1 - pn(params, 'size'));
    const r = Math.min(w * 0.5, h * 0.1);
    return (
      <Detail
        d={`M0,0 Q${x},0 ${x},${r} V${h / 2 - r} Q${x},${h / 2} ${w},${h / 2} Q${x},${h / 2} ${x},${h / 2 + r} V${h - r} Q${x},${h} 0,${h}`}
        s={style}
      />
    );
  }, {
    boxHit: true,
    params: [param.pct('size', 'Spine', 0.5)],
    handles: ({ w, h, p }) => [handle(w * (1 - pn(p, 'size')), h / 4, (pt) => ({ params: { size: 1 - pt.x / w } }))],
  }),
  shape('misc.bracketLeft', 'Square bracket', 'shape=partialRectangle;right=0;fillColor=none;', renderPartial, {
    boxHit: true,
    params: PARTIAL_SIDES(1, 0, 1, 1),
  }),
  shape('misc.hline', 'Horizontal line', 'line;strokeWidth=2;html=1;', ({ w, h, style }) => (
    <Detail d={`M0,${h / 2} H${w}`} s={style} />
  ), { boxHit: true, textBox: (w, h) => ({ x: 0, y: 0, w, h: h / 2 }) }),
  shape('misc.vline', 'Vertical line', 'line;strokeWidth=2;direction=south;html=1;', ({ w, h, style }) => (
    <Detail d={`M${w / 2},0 V${h}`} s={style} />
  ), { boxHit: true, textPlacement: 'below' }),
];

const kw = (k: string) => ({ keywords: k });

const libraries: ShapeLibrary[] = [
  {
    id: 'basic',
    name: 'Basic',
    items: [
      item('basic.star5', 'Star', 100, 95, kw('5 point favourite rating')),
      item('basic.star4', '4-point star', 90, 90, kw('sparkle twinkle')),
      item('basic.star6', '6-point star', 100, 100, kw('hexagram')),
      item('basic.star8', '8-point star', 100, 100, kw('burst seal')),
      item('basic.pentagon', 'Pentagon', 100, 95),
      item('hexagon', 'Hexagon', 110, 95),
      item('basic.heptagon', 'Heptagon', 100, 98),
      item('basic.octagon', 'Octagon', 100, 100, kw('stop sign')),
      item('basic.polygon', 'Polygon', 110, 90, kw('irregular freeform')),
      item('triangle', 'Triangle', 100, 88),
      item('basic.rightTriangle', 'Right triangle', 100, 90, kw('orthogonal')),
      item('basic.halfCircle', 'Half circle', 120, 60, kw('semicircle dome')),
      item('basic.plus', 'Cross', 90, 90, kw('plus add')),
      item('basic.x', 'Diagonal cross', 90, 90, kw('x close multiply')),
      item('basic.heart', 'Heart', 100, 90, kw('love like')),
      item('basic.moon', 'Moon', 80, 100, kw('crescent night')),
      item('basic.sun', 'Sun', 100, 100, kw('day weather')),
      item('basic.lightning', 'Lightning', 70, 100, kw('flash bolt power')),
      item('basic.teardrop', 'Teardrop', 70, 100, kw('drop water')),
      item('basic.smiley', 'Smiley', 90, 90, { keywords: 'face emoji happy', style: { fill: '#fef3c7', stroke: '#d97706' } }),
      item('basic.donut', 'Donut', 100, 100, kw('ring torus')),
      item('basic.pie', 'Pie', 100, 100, kw('sector slice pacman chart')),
      item('basic.arc', 'Block arc', 120, 60, kw('arch rainbow')),
      item('basic.arcLine', 'Arc', 100, 100, { keywords: 'curve', style: { fill: 'none' } }),
      item('basic.frame', 'Frame', 120, 90, kw('border picture')),
      item('basic.roundedFrame', 'Rounded frame', 120, 90, kw('border')),
      item('basic.cube', 'Cube', 110, 100, kw('box 3d')),
      item('basic.step', 'Step', 130, 60, kw('chevron process')),
      item('basic.tape', 'Tape', 130, 80, kw('punched paper tape')),
      item('basic.wave', 'Wave', 140, 60, kw('flag banner')),
      item('basic.card', 'Card', 110, 80, kw('punch card')),
      item('basic.plaque', 'Plaque', 130, 70, kw('badge')),
      item('basic.multiDocument', 'Multi-document', 140, 90, kw('documents pages stack')),
      item('basic.documentFold', 'Folded document', 110, 130, kw('page note dog ear')),
      item('flow.document', 'Document', 130, 80),
      item('flow.predefined', 'Process (side bars)', 140, 70, kw('predefined subroutine')),
    ],
  },
  {
    id: 'misc',
    name: 'Misc / Advanced',
    items: [
      item('text', 'Heading', 220, 40, { text: 'Heading', style: { fill: 'none', stroke: 'none', fontSize: 24, bold: true, textAlign: 'left' }, keywords: 'title h1' }),
      item('text', 'Text box', 200, 90, {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        style: { fill: 'none', stroke: 'none', fontSize: 13, textAlign: 'left', verticalAlign: 'top' },
        keywords: 'paragraph',
      }),
      item('misc.link', 'Link', 140, 26, { text: 'Link', style: { fill: 'none', stroke: 'none', textColor: '#2563eb', textAlign: 'left' }, keywords: 'url hyperlink anchor' }),
      item('misc.table', 'Table', 240, 120, { style: { radius: 4, fontSize: 13, bold: true }, keywords: 'grid rows columns' }),
      item('misc.image', 'Image placeholder', 140, 100, { style: { fill: '#f1f5f9', stroke: '#94a3b8', radius: 6 }, keywords: 'picture photo' }),
      item('misc.imageIcon', 'Image', 70, 70, { style: { fill: '#f8fafc', stroke: '#64748b', radius: 10 }, keywords: 'picture photo icon' }),
      item('misc.dataStorage', 'Data storage', 130, 70, kw('stored data')),
      item('misc.hCylinder', 'Direct access storage', 140, 70, kw('horizontal cylinder disk drum')),
      item('cylinder', 'Database', 80, 100, kw('storage')),
      item('misc.loopLimit', 'Loop limit', 130, 60),
      item('misc.display', 'Display', 140, 70, kw('screen output')),
      item('misc.collate', 'Collate', 70, 80, kw('hourglass')),
      item('misc.sort', 'Sort', 90, 90),
      item('misc.merge', 'Merge', 90, 70, kw('inverted triangle storage')),
      item('misc.or', 'Or', 50, 50, kw('junction')),
      item('misc.summing', 'Summing junction', 50, 50, kw('plus junction')),
      item('basic.plus', 'Cross', 80, 80, kw('plus')),
      item('basic.partialTB', 'Partial rectangle', 140, 70, kw('top bottom border')),
      item('basic.partialLR', 'Partial rectangle (sides)', 140, 70, kw('left right border')),
      item('basic.partialOpenRight', 'Partial rectangle (open)', 140, 70, kw('bracket')),
      item('basic.partialBottom', 'Underlined', 140, 40, kw('underline border bottom')),
      item('basic.oneRound', 'One round corner', 140, 80, kw('corner rounded')),
      item('basic.topRound', 'Top round corners', 140, 80, kw('corner rounded tab')),
      item('basic.diagRound', 'Diagonal round corners', 140, 80, kw('corner rounded leaf')),
      item('basic.snip', 'Snipped corner', 140, 80, kw('corner cut')),
      item('basic.diagSnip', 'Diagonal snipped corners', 140, 80, kw('corner cut')),
      item('misc.curlyLeft', 'Curly brace', 30, 120, { style: { fill: 'none' }, keywords: 'bracket brace' }),
      item('misc.curlyRight', 'Curly brace (right)', 30, 120, { style: { fill: 'none' }, keywords: 'bracket brace' }),
      item('misc.bracketLeft', 'Square bracket', 20, 120, { style: { fill: 'none' }, keywords: 'bracket annotation' }),
      item('misc.hline', 'Horizontal line', 160, 20, { style: { fill: 'none' }, keywords: 'divider separator rule' }),
      item('misc.vline', 'Vertical line', 20, 160, { style: { fill: 'none' }, keywords: 'divider separator rule' }),
    ],
  },
];

export { shapes, libraries };
