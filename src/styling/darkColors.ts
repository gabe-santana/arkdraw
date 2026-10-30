/**
 * User-defined dark-mode colors (mxGraph `light-dark(light, dark)` colors).
 *
 * With "Adapt diagram colors in dark mode" on, the canvas re-tints the whole
 * diagram layer with a CSS filter (`.diagram-adapt` in index.css):
 * `invert(0.92) hue-rotate(180deg) saturate(1.15)`. An element that defines
 * `darkFill` / `darkStroke` / `darkText` should show exactly those colors, so
 * we render it with the color that the filter maps onto the wanted one — the
 * inverse of the filter. Exports always use the light colors.
 */
import { useMemo } from 'react';
import type { DiagramElement, ElementStyle } from '@/model/types';
import { hasCustomShadow, shadowParams } from './shadow';

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

const INVERT = 0.92;
const SATURATE = 1.15;

// CSS Filter Effects matrices (sRGB).
const HUE_180: Mat3 = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856],
];
const sat = (s: number): Mat3 => [
  [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
];
const SAT = sat(SATURATE);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mul = (m: Mat3, v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
function inverse(m: Mat3): Mat3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
const HUE_INV = inverse(HUE_180);
const SAT_INV = inverse(SAT);

export function parseHex(c: string): Vec3 | null {
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Vec3;
}
export const toHex = (v: Vec3) => '#' + v.map((x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0')).join('');

/** What the adapt filter shows for `c` (for tests and previews). */
export function adaptFilter(c: string): string {
  const v = parseHex(c);
  if (!v) return c;
  const inv = v.map((x) => clamp01(INVERT + x * (1 - 2 * INVERT))) as Vec3;
  const hue = mul(HUE_180, inv).map(clamp01) as Vec3;
  return toHex(mul(SAT, hue));
}

/** The color to draw so that, after the adapt filter, it shows as `wanted`. */
export function preAdapt(wanted: string): string {
  const v = parseHex(wanted);
  if (!v) return wanted;
  const hue = mul(SAT_INV, v).map(clamp01) as Vec3;
  const inv = mul(HUE_INV, hue).map(clamp01) as Vec3;
  return toHex(inv.map((x) => (INVERT - x) / (2 * INVERT - 1)) as Vec3);
}

/** A page on its own dark background (relative luminance under 0.35). */
export function pageIsDark(background: string | null | undefined): boolean {
  const c = background ? parseHex(background) : null;
  return !!c && 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.35;
}

export const hasDarkColors = (s: ElementStyle) => !!(s.darkFill || s.darkStroke || s.darkText);

/**
 * Style with the user's dark colors swapped in (pre-compensated for the adapt filter).
 * The shadow color is pre-compensated too, so shadows stay shadows instead of turning into glows.
 */
export function darkStyle(s: ElementStyle): ElementStyle {
  const shadow = s.shadow || hasCustomShadow(s);
  if (!hasDarkColors(s) && !shadow) return s;
  const out = { ...s };
  if (s.darkFill && s.fill !== 'none') out.fill = preAdapt(s.darkFill);
  if (s.darkStroke && s.stroke !== 'none') out.stroke = preAdapt(s.darkStroke);
  if (s.darkText) out.textColor = preAdapt(s.darkText);
  if (shadow) out.shadowColor = preAdapt(shadowParams(s).color);
  return out;
}

/** The element as the adapted (dark) canvas should draw it; stable identity when unchanged. */
export function useDarkElement<T extends DiagramElement | undefined>(el: T, on: boolean): T {
  return useMemo(() => {
    if (!on || !el) return el;
    const style = darkStyle(el.style);
    return style === el.style ? el : ({ ...el, style } as T);
  }, [el, on]);
}
