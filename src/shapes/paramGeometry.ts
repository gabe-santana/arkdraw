/**
 * Parametric geometry shared by the registry and the library modules
 * (block arrows, document / tape waves), following draw.io's formulas so
 * parameter values round-trip through .drawio files unchanged.
 */
import type { Vec } from '@/model/types';
import { handle, param, pn } from './params';
import type { ParamHandle, ParamValues, ShapeParam } from './types';

type P = readonly [number, number];

const r2 = (v: number) => Math.round(v * 100) / 100;
const pathD = (pts: readonly P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${r2(p[0])},${r2(p[1])}`).join(' ') + ' Z';

// ---------------------------------------------------------------------------
// Block arrows (draw.io singleArrow / doubleArrow)
// ---------------------------------------------------------------------------

/** `arrowWidth`: shaft thickness as a fraction of the height; `arrowSize`: head length as a fraction of the width. */
export const ARROW_PARAMS = (width: number, size: number, maxSize = 1): ShapeParam[] => [
  param.pct('arrowWidth', 'Shaft', width, { drawioDefault: 0.3 }),
  param.pct('arrowSize', 'Head', size, { max: maxSize, drawioDefault: 0.2 }),
];

/** Right-pointing single arrow in a W×H frame. */
export function singleArrowPts(W: number, H: number, p: ParamValues | undefined): P[] {
  const hl = Math.min(W, W * pn(p, 'arrowSize'));
  const at = (H * (1 - pn(p, 'arrowWidth'))) / 2;
  return [[0, at], [W - hl, at], [W - hl, 0], [W, H / 2], [W - hl, H], [W - hl, H - at], [0, H - at]];
}

/** Left-right double arrow in a W×H frame. */
export function doubleArrowPts(W: number, H: number, p: ParamValues | undefined): P[] {
  const hl = Math.min(W / 2, W * pn(p, 'arrowSize'));
  const at = (H * (1 - pn(p, 'arrowWidth'))) / 2;
  return [
    [0, H / 2], [hl, 0], [hl, at], [W - hl, at], [W - hl, 0], [W, H / 2],
    [W - hl, H], [W - hl, H - at], [hl, H - at], [hl, H],
  ];
}

export const singleArrowD = (w: number, h: number, p: ParamValues | undefined) => pathD(singleArrowPts(w, h, p));

/** One handle at the head/shaft corner drives both values (as in draw.io). */
export function arrowHandle(W: number, H: number, p: ParamValues, map: (q: Vec) => Vec = (q) => q, unmap: (q: Vec) => Vec = (q) => q): ParamHandle {
  const hl = Math.min(W, W * pn(p, 'arrowSize'));
  const at = (H * (1 - pn(p, 'arrowWidth'))) / 2;
  const at2 = map({ x: W - hl, y: at });
  return handle(at2.x, at2.y, (pt) => {
    const q = unmap(pt);
    return { params: { arrowSize: (W - q.x) / W, arrowWidth: 1 - (2 * q.y) / H } };
  }, 'arrowWidth');
}

export const singleArrowHandle = (w: number, h: number, p: ParamValues) => arrowHandle(w, h, p);

// ---------------------------------------------------------------------------
// Waves (draw.io document / tape)
// ---------------------------------------------------------------------------

const FY = 1.4;

/** draw.io `document`: `size` = wave height as a fraction of the height. */
export function documentD(w: number, h: number, size: number) {
  const dy = h * size;
  const b = h - dy / 2;
  return `M0,0 H${r2(w)} V${r2(b)} Q${r2(w * 0.75)},${r2(h - dy * FY)} ${r2(w / 2)},${r2(b)} Q${r2(w / 4)},${r2(h - dy * (1 - FY))} 0,${r2(b)} Z`;
}

/** draw.io `tape`: wavy top and bottom; `size` = wave height as a fraction of the height. */
export function tapeD(w: number, h: number, size: number) {
  const dy = h * size;
  const t = dy / 2;
  const b = h - dy / 2;
  return (
    `M0,${r2(t)} Q${r2(w / 4)},${r2(dy * FY)} ${r2(w / 2)},${r2(t)} Q${r2(w * 0.75)},${r2(dy * (1 - FY))} ${r2(w)},${r2(t)} ` +
    `L${r2(w)},${r2(b)} Q${r2(w * 0.75)},${r2(h - dy * FY)} ${r2(w / 2)},${r2(b)} Q${r2(w / 4)},${r2(h - dy * (1 - FY))} 0,${r2(b)} Z`
  );
}
