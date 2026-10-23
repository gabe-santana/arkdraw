/**
 * Arrows: draw.io-style block arrows (single, double, chevrons, U-turn, bent,
 * curved, callouts, quad, striped, circular).
 */
import type { Rect } from '@/model/types';
import { Body } from '../kit';
import type { ShapeDef, ShapeLibrary } from '../types';
import { TONE, arcD, f, item, pathOf, polar, shape, type Pt } from './_kit2';

type Dir = 'right' | 'left' | 'up' | 'down';

/**
 * Draws a right-pointing design in a canonical WÃ—H frame and maps it into the
 * wÃ—h bounds for the requested direction.
 */
function oriented(dir: Dir, w: number, h: number, gen: (W: number, H: number) => Pt[]): Pt[] {
  if (dir === 'right') return gen(w, h);
  if (dir === 'left') return gen(w, h).map(([x, y]) => [w - x, y] as const);
  if (dir === 'down') return gen(h, w).map(([x, y]) => [y, x] as const);
  return gen(h, w).map(([x, y]) => [y, h - x] as const);
}

/** Maps a canonical-frame rect (right-pointing) to the oriented bounds. */
function orientedBox(dir: Dir, w: number, h: number, box: (W: number, H: number) => Rect): Rect {
  if (dir === 'right') return box(w, h);
  if (dir === 'left') {
    const b = box(w, h);
    return { ...b, x: w - b.x - b.w };
  }
  const b = box(h, w);
  if (dir === 'down') return { x: b.y, y: b.x, w: b.h, h: b.w };
  return { x: b.y, y: h - b.x - b.w, w: b.h, h: b.w };
}

const headLen = (W: number, H: number) => Math.min(W * 0.4, H * 0.8);

const single = (W: number, H: number): Pt[] => {
  const hl = headLen(W, H);
  return [[0, H * 0.25], [W - hl, H * 0.25], [W - hl, 0], [W, H / 2], [W - hl, H], [W - hl, H * 0.75], [0, H * 0.75]];
};

const double = (W: number, H: number): Pt[] => {
  const hl = Math.min(W * 0.3, H * 0.8);
  return [
    [0, H / 2], [hl, 0], [hl, H * 0.25], [W - hl, H * 0.25], [W - hl, 0], [W, H / 2],
    [W - hl, H], [W - hl, H * 0.75], [hl, H * 0.75], [hl, H],
  ];
};

const notched = (W: number, H: number): Pt[] => {
  return [...single(W, H), [Math.min(H * 0.3, W * 0.15), H / 2]];
};

const chevron = (W: number, H: number): Pt[] => {
  const s = Math.min(W * 0.35, H * 0.5);
  return [[0, 0], [W - s, 0], [W, H / 2], [W - s, H], [0, H], [s, H / 2]];
};

const pentagon = (W: number, H: number): Pt[] => {
  const s = Math.min(W * 0.35, H * 0.5);
  return [[0, 0], [W - s, 0], [W, H / 2], [W - s, H], [0, H]];
};

const shaftBox = (W: number, H: number): Rect => ({ x: 6, y: H * 0.25, w: Math.max(1, W - headLen(W, H) - 8), h: H * 0.5 });

function polyArrow(kind: string, label: string, dir: Dir, gen: (W: number, H: number) => Pt[], drawio: string, box: (W: number, H: number) => Rect): ShapeDef {
  return shape(kind, label, drawio, ({ w, h, style }) => <Body d={pathOf(oriented(dir, w, h, gen))} s={style} />, {
    textBox: (w, h) => orientedBox(dir, w, h, box),
  });
}

const DIR_STYLE: Record<Dir, string> = { right: '', left: 'flipH=1;', up: 'direction=north;', down: 'direction=south;' };

const singles = (['right', 'left', 'up', 'down'] as const).map((d) =>
  polyArrow(`arrows.${d}`, `Arrow ${d}`, d, single, `shape=singleArrow;arrowWidth=0.5;arrowSize=0.4;whiteSpace=wrap;${DIR_STYLE[d]}`, shaftBox),
);

const doubleBox = (W: number, H: number): Rect => {
  const hl = Math.min(W * 0.3, H * 0.8);
  return { x: hl, y: H * 0.25, w: Math.max(1, W - hl * 2), h: H * 0.5 };
};

// ----- Curved & composite arrows ---------------------------------------------

function uTurnD(w: number, h: number) {
  const t = Math.min(w * 0.2, h * 0.2);
  const hw = t * 2.2;
  const hl = Math.min(h * 0.3, t * 1.6);
  const c = w - hw / 2;
  const ro = c + t / 2;
  const R = ro / 2;
  const Ry = Math.max(t + 2, Math.min(R, (h - hl) * 0.6));
  return (
    `M0,${f(h)} V${f(Ry)} A${f(R)},${f(Ry)} 0 0 1 ${f(ro)},${f(Ry)} V${f(h - hl)} H${f(w)} L${f(c)},${f(h)} ` +
    `L${f(w - hw)},${f(h - hl)} H${f(ro - t)} V${f(Ry)} A${f(R - t)},${f(Ry - t)} 0 0 0 ${f(t)},${f(Ry)} V${f(h)} Z`
  );
}

function bentD(w: number, h: number) {
  const t = Math.min(w * 0.22, h * 0.22);
  const hw = t * 2.2;
  const hl = Math.min(w * 0.3, t * 1.7);
  const c = hw / 2;
  const top = c - t / 2;
  const ro = Math.min(t * 1.5, (w - hl) * 0.5, (h - top) * 0.5);
  const ri = Math.max(0, ro - t);
  return (
    `M0,${f(h)} V${f(top + ro)} A${f(ro)},${f(ro)} 0 0 1 ${f(ro)},${f(top)} H${f(w - hl)} V0 L${f(w)},${f(c)} ` +
    `L${f(w - hl)},${f(hw)} V${f(c + t / 2)} H${f(t + ri)} ` +
    (ri > 0 ? `A${f(ri)},${f(ri)} 0 0 0 ${f(t)},${f(c + t / 2 + ri)} ` : '') +
    `V${f(h)} Z`
  );
}

function curvedD(w: number, h: number) {
  const t = Math.min(w * 0.2, h * 0.24);
  const hw = t * 2.2;
  const hl = Math.min(w * 0.28, t * 1.7);
  const rx = w - hl - t / 2;
  const ry = h - hw / 2;
  return (
    `M0,${f(h)} A${f(rx + t / 2)},${f(ry + t / 2)} 0 0 1 ${f(w - hl)},${f(hw / 2 - t / 2)} V0 L${f(w)},${f(hw / 2)} ` +
    `L${f(w - hl)},${f(hw)} V${f(hw / 2 + t / 2)} A${f(Math.max(1, rx - t / 2))},${f(Math.max(1, ry - t / 2))} 0 0 0 ${f(t)},${f(h)} Z`
  );
}

function circularD(w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  const t = R * 0.26;
  const a = t * 1.15;
  const rc = R - a;
  const a0 = 150;
  const a1 = 395;
  const dl = ((t * 1.6) / rc) * (180 / Math.PI);
  const [p1x, p1y] = polar(cx, cy, rc + a, rc + a, a1);
  const [tx, ty] = polar(cx, cy, rc, rc, a1 + dl);
  const [p2x, p2y] = polar(cx, cy, rc - a, rc - a, a1);
  return (
    `${arcD(cx, cy, rc + t / 2, rc + t / 2, a0, a1)} L${f(p1x)},${f(p1y)} L${f(tx)},${f(ty)} L${f(p2x)},${f(p2y)} ` +
    `${arcD(cx, cy, rc - t / 2, rc - t / 2, a1, a0, false)} Z`
  );
}

const callout = (W: number, H: number): Pt[] => {
  const bw = W * 0.58;
  const t = H * 0.12;
  const a = H * 0.26;
  const hl = Math.min((W - bw) * 0.5, H * 0.35);
  return [
    [0, 0], [bw, 0], [bw, H / 2 - t], [W - hl, H / 2 - t], [W - hl, H / 2 - a], [W, H / 2],
    [W - hl, H / 2 + a], [W - hl, H / 2 + t], [bw, H / 2 + t], [bw, H], [0, H],
  ];
};

function doubleCalloutPts(w: number, h: number): Pt[] {
  const bw = w * 0.5;
  const x0 = (w - bw) / 2;
  const t = h * 0.12;
  const a = h * 0.26;
  const hl = Math.min(x0 * 0.55, h * 0.35);
  return [
    [x0, 0], [x0 + bw, 0], [x0 + bw, h / 2 - t], [w - hl, h / 2 - t], [w - hl, h / 2 - a], [w, h / 2],
    [w - hl, h / 2 + a], [w - hl, h / 2 + t], [x0 + bw, h / 2 + t], [x0 + bw, h], [x0, h],
    [x0, h / 2 + t], [hl, h / 2 + t], [hl, h / 2 + a], [0, h / 2], [hl, h / 2 - a], [hl, h / 2 - t], [x0, h / 2 - t],
  ];
}

/** Four-way arrow; with `body > 0` a central callout box of that fraction. */
function quadPts(w: number, h: number, body = 0): Pt[] {
  const m = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const t = m * 0.09;
  const a = m * 0.19;
  const hl = m * 0.19;
  const bx = (w * body) / 2;
  const by = (h * body) / 2;
  const pts: Pt[] = [
    [cx, 0], [cx + a, hl], [cx + t, hl],
    ...(body ? ([[cx + t, cy - by], [cx + bx, cy - by], [cx + bx, cy - t]] as Pt[]) : ([[cx + t, cy - t]] as Pt[])),
    [w - hl, cy - t], [w - hl, cy - a], [w, cy], [w - hl, cy + a], [w - hl, cy + t],
    ...(body ? ([[cx + bx, cy + t], [cx + bx, cy + by], [cx + t, cy + by]] as Pt[]) : ([[cx + t, cy + t]] as Pt[])),
    [cx + t, h - hl], [cx + a, h - hl], [cx, h], [cx - a, h - hl], [cx - t, h - hl],
    ...(body ? ([[cx - t, cy + by], [cx - bx, cy + by], [cx - bx, cy + t]] as Pt[]) : ([[cx - t, cy + t]] as Pt[])),
    [hl, cy + t], [hl, cy + a], [0, cy], [hl, cy - a], [hl, cy - t],
    ...(body ? ([[cx - bx, cy - t], [cx - bx, cy - by], [cx - t, cy - by]] as Pt[]) : ([[cx - t, cy - t]] as Pt[])),
    [cx - t, hl], [cx - a, hl],
  ];
  return pts;
}

function stripedD(w: number, h: number) {
  const s1 = Math.min(w * 0.05, 8);
  const gap = s1 * 0.8;
  const x0 = s1 * 2 + gap * 2;
  const hl = headLen(w - x0, h);
  const y0 = h * 0.25;
  const y1 = h * 0.75;
  return (
    `M0,${f(y0)} H${f(s1)} V${f(y1)} H0 Z M${f(s1 + gap)},${f(y0)} H${f(s1 * 2 + gap)} V${f(y1)} H${f(s1 + gap)} Z ` +
    pathOf([[x0, y0], [w - hl, y0], [w - hl, 0], [w, h / 2], [w - hl, h], [w - hl, y1], [x0, y1]])
  );
}

export const shapes: ShapeDef[] = [
  ...singles,
  polyArrow('arrows.doubleH', 'Double arrow', 'right', double, 'shape=doubleArrow;arrowWidth=0.5;arrowSize=0.3;whiteSpace=wrap;', doubleBox),
  polyArrow('arrows.doubleV', 'Double arrow vertical', 'up', double, 'shape=doubleArrow;direction=south;arrowWidth=0.5;arrowSize=0.3;whiteSpace=wrap;', doubleBox),
  polyArrow('arrows.notched', 'Notched arrow', 'right', notched, 'shape=mxgraph.arrows2.notchedArrow;dy1=0.25;dx1=40;notch=20;whiteSpace=wrap;', (W, H) => ({
    x: Math.min(H * 0.3, W * 0.15) + 4, y: H * 0.25, w: Math.max(1, W - headLen(W, H) - Math.min(H * 0.3, W * 0.15) - 8), h: H * 0.5,
  })),
  polyArrow('arrows.chevron', 'Chevron', 'right', chevron, 'shape=step;perimeter=stepPerimeter;fixedSize=1;size=20;whiteSpace=wrap;', (W, H) => {
    const s = Math.min(W * 0.35, H * 0.5);
    return { x: s + 2, y: 4, w: Math.max(1, W - s * 2 - 4), h: H - 8 };
  }),
  polyArrow('arrows.pentagon', 'Pentagon arrow', 'right', pentagon, 'shape=mxgraph.arrows2.arrow;dy=0;dx=20;notch=0;whiteSpace=wrap;', (W, H) => {
    const s = Math.min(W * 0.35, H * 0.5);
    return { x: 8, y: 4, w: Math.max(1, W - s - 10), h: H - 8 };
  }),
  polyArrow('arrows.signal', 'Notched signal', 'right', (W, H) => {
    const s = Math.min(W * 0.3, H * 0.5);
    return [[0, 0], [W - s, 0], [W, H / 2], [W - s, H], [0, H], [s * 0.7, H / 2]];
  }, 'shape=mxgraph.arrows2.notchedSignalArrow;dx=20;notch=14;whiteSpace=wrap;', (W, H) => {
    const s = Math.min(W * 0.3, H * 0.5);
    return { x: s * 0.7 + 2, y: 4, w: Math.max(1, W - s * 1.7 - 4), h: H - 8 };
  }),
  shape('arrows.striped', 'Striped arrow', 'shape=mxgraph.arrows2.stripedArrow;dy=0.5;dx=40;notch=25;whiteSpace=wrap;', ({ w, h, style }) => <Body d={stripedD(w, h)} s={style} />, {
    textBox: (w, h) => {
      const x0 = Math.min(w * 0.05, 8) * 3.6;
      return { x: x0 + 4, y: h * 0.25, w: Math.max(1, w - x0 - headLen(w - x0, h) - 6), h: h * 0.5 };
    },
  }),
  shape('arrows.uTurn', 'U-turn arrow', 'shape=mxgraph.arrows2.uTurnArrow;dy=11;arrowHead=43;dx2=25;whiteSpace=wrap;', ({ w, h, style }) => <Body d={uTurnD(w, h)} s={style} />, {
    textBox: (w, h) => ({ x: Math.min(w * 0.2, h * 0.2) + 6, y: h * 0.4, w: Math.max(1, w * 0.45), h: h * 0.5 }),
  }),
  shape('arrows.bent', 'Bent arrow', 'shape=mxgraph.arrows2.bendArrow;dy=15;dx=38;notch=0;arrowHead=55;rounded=0;whiteSpace=wrap;', ({ w, h, style }) => <Body d={bentD(w, h)} s={style} />, {
    textBox: (w, h) => {
      const t = Math.min(w * 0.22, h * 0.22);
      return { x: t + 6, y: t * 2.4, w: Math.max(1, w - t - 12), h: Math.max(1, h - t * 2.4 - 6) };
    },
  }),
  shape('arrows.curved', 'Curved arrow', 'shape=mxgraph.arrows2.jumpInArrow;dy=15;dx=38;arrowHead=55;whiteSpace=wrap;', ({ w, h, style }) => <Body d={curvedD(w, h)} s={style} />, {
    textBox: (w, h) => ({ x: w * 0.35, y: h * 0.45, w: w * 0.6, h: h * 0.5 }),
  }),
  shape('arrows.circular', 'Circular arrow', 'shape=mxgraph.arrows2.uTurnArrow;dy=8;arrowHead=30;dx2=20;flipH=1;whiteSpace=wrap;', ({ w, h, style }) => <Body d={circularD(w, h)} s={style} />, {
    textBox: (w, h) => {
      const r = Math.min(w, h) * 0.24;
      return { x: w / 2 - r, y: h / 2 - r, w: r * 2, h: r * 2 };
    },
  }),
  polyArrow('arrows.callout', 'Callout arrow', 'right', callout, 'shape=mxgraph.arrows2.calloutArrow;dy=10;dx=20;notch=60;arrowHead=10;whiteSpace=wrap;', (W, H) => ({ x: 6, y: 6, w: W * 0.58 - 12, h: H - 12 })),
  shape('arrows.calloutDouble', 'Double callout arrow', 'shape=mxgraph.arrows2.calloutDoubleArrow;dy=10;dx=20;notch=24;arrowHead=10;whiteSpace=wrap;', ({ w, h, style }) => <Body d={pathOf(doubleCalloutPts(w, h))} s={style} />, {
    textBox: (w, h) => ({ x: w * 0.25 + 4, y: 6, w: w * 0.5 - 8, h: h - 12 }),
  }),
  shape('arrows.calloutQuad', 'Quad callout arrow', 'shape=mxgraph.arrows2.calloutQuadArrow;dy=10;dx=20;notch=24;arrowHead=10;whiteSpace=wrap;', ({ w, h, style }) => <Body d={pathOf(quadPts(w, h, 0.46))} s={style} />, {
    textBox: (w, h) => ({ x: w * 0.27 + 2, y: h * 0.27 + 2, w: w * 0.46 - 4, h: h * 0.46 - 4 }),
  }),
  shape('arrows.quad', 'Quad arrow', 'shape=mxgraph.arrows2.quadArrow;dy=10;arrowHead=10;whiteSpace=wrap;', ({ w, h, style }) => <Body d={pathOf(quadPts(w, h))} s={style} />, {
    textBox: (w, h) => ({ x: w * 0.3, y: h * 0.42, w: w * 0.4, h: h * 0.16 }),
  }),
  polyArrow('arrows.chevronDown', 'Chevron down', 'down', chevron, 'shape=step;perimeter=stepPerimeter;fixedSize=1;size=20;direction=south;whiteSpace=wrap;', (W, H) => {
    const s = Math.min(W * 0.35, H * 0.5);
    return { x: s + 2, y: 4, w: Math.max(1, W - s * 2 - 4), h: H - 8 };
  }),
];

const tone = { fill: TONE.blue.fill, stroke: TONE.blue.stroke };

export const libraries: ShapeLibrary[] = [
  {
    id: 'arrows',
    name: 'Arrows',
    items: [
      ...(['right', 'left', 'up', 'down'] as const).map((d) =>
        item(`arrows.${d}`, `Arrow ${d}`, d === 'up' || d === 'down' ? 70 : 140, d === 'up' || d === 'down' ? 140 : 70, {
          style: tone,
          keywords: `block arrow single ${d} direction`,
        }),
      ),
      item('arrows.doubleH', 'Double arrow', 160, 70, { style: tone, keywords: 'block arrow left right bidirectional' }),
      item('arrows.doubleV', 'Double arrow vertical', 70, 160, { style: tone, keywords: 'block arrow up down bidirectional' }),
      item('arrows.chevron', 'Chevron', 140, 70, { style: tone, keywords: 'step process arrow' }),
      item('arrows.chevronDown', 'Chevron down', 70, 120, { style: tone, keywords: 'step process arrow vertical' }),
      item('arrows.pentagon', 'Pentagon arrow', 150, 70, { style: tone, keywords: 'home plate step tag' }),
      item('arrows.signal', 'Notched signal', 150, 70, { style: tone, keywords: 'signal step chevron' }),
      item('arrows.notched', 'Notched arrow', 150, 70, { style: tone, keywords: 'block arrow notch tail' }),
      item('arrows.striped', 'Striped arrow', 150, 70, { style: tone, keywords: 'block arrow stripes' }),
      item('arrows.uTurn', 'U-turn arrow', 120, 120, { style: tone, keywords: 'u turn return back loop' }),
      item('arrows.bent', 'Bent arrow', 120, 120, { style: tone, keywords: 'bend corner turn l arrow' }),
      item('arrows.curved', 'Curved arrow', 140, 110, { style: tone, keywords: 'curve jump in arc' }),
      item('arrows.circular', 'Circular arrow', 110, 110, { style: tone, keywords: 'cycle refresh loop rotate' }),
      item('arrows.callout', 'Callout arrow', 170, 80, { style: tone, keywords: 'callout box arrow' }),
      item('arrows.calloutDouble', 'Double callout arrow', 200, 80, { style: tone, keywords: 'callout box arrow left right' }),
      item('arrows.calloutQuad', 'Quad callout arrow', 160, 160, { style: tone, keywords: 'callout box four way' }),
      item('arrows.quad', 'Quad arrow', 130, 130, { style: tone, keywords: 'four way cross move directions' }),
    ],
  },
];

