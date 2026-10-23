/**
 * mxGraph round-trip for the styling extras: shadow options, user-defined
 * dark colors (`light-dark(light,dark)` color values) and sketch options
 * (fillStyle, jiggle). Wired into src/io/drawio.ts with one call each way.
 */
import type { ElementStyle } from '@/model/types';
import { hasCustomShadow } from './shadow';

type StyleMap = Map<string, string>;

const SKETCH_FILLS = ['hachure', 'solid', 'zigzag', 'cross-hatch', 'dots', 'dashed', 'zigzag-line'] as const;
const LIGHT_DARK = /^light-dark\(\s*([^,()]+(?:\([^)]*\))?)\s*,\s*([^,()]+(?:\([^)]*\))?)\s*\)$/i;

/** Splits `light-dark(a,b)` into [a, b]; plain colors give [c, undefined]. */
export function splitLightDark(v: string | undefined): [string | undefined, string | undefined] {
  if (!v) return [undefined, undefined];
  const m = v.trim().match(LIGHT_DARK);
  return m ? [m[1].trim(), m[2].trim()] : [v, undefined];
}

const isColor = (c: string | undefined): c is string => !!c && (c.startsWith('#') || c.startsWith('rgb'));
const num = (v: string | undefined) => (v !== undefined && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** Adds the extras to an export style map (after the common keys are set). */
export function styleExtrasToDrawio(m: StyleMap, s: ElementStyle, isEdge: boolean) {
  if (s.shadow && hasCustomShadow(s)) {
    if (s.shadowColor) m.set('shadowColor', s.shadowColor);
    if (s.shadowBlur !== undefined) m.set('shadowBlur', String(s.shadowBlur));
    if (s.shadowOffsetX !== undefined) m.set('shadowOffsetX', String(s.shadowOffsetX));
    if (s.shadowOffsetY !== undefined) m.set('shadowOffsetY', String(s.shadowOffsetY));
    if (s.shadowOpacity !== undefined) m.set('shadowOpacity', String(Math.round(s.shadowOpacity * 100)));
  }
  const pair = (key: string, dark: string | undefined) => {
    const light = m.get(key);
    if (dark && isColor(light)) m.set(key, `light-dark(${light},${dark})`);
  };
  if (!isEdge) pair('fillColor', s.darkFill);
  pair('strokeColor', s.darkStroke);
  pair('fontColor', s.darkText);
  if (s.sketch) {
    m.set('sketch', '1');
    m.set('curveFitting', '1');
    if (s.sketchFill && s.sketchFill !== 'hachure') m.set('fillStyle', s.sketchFill);
    if (s.sketchRoughness !== undefined) m.set('jiggle', String(s.sketchRoughness));
  }
}

/** Style fields to merge over the base import (light colors replace unparsed light-dark values). */
export function styleExtrasFromDrawio(m: StyleMap, isEdge: boolean): Partial<ElementStyle> {
  const out: Partial<ElementStyle> = {};
  const colors: Array<[string, 'fill' | 'stroke' | 'textColor', 'darkFill' | 'darkStroke' | 'darkText']> = [
    ['fillColor', 'fill', 'darkFill'],
    ['strokeColor', 'stroke', 'darkStroke'],
    ['fontColor', 'textColor', 'darkText'],
  ];
  for (const [key, light, dark] of colors) {
    if (isEdge && key === 'fillColor') continue;
    const [l, d] = splitLightDark(m.get(key));
    if (d === undefined) continue;
    if (isColor(l)) out[light] = l;
    if (isColor(d)) out[dark] = d;
  }
  if (m.get('shadow') === '1') {
    const color = m.get('shadowColor');
    if (isColor(color)) out.shadowColor = color;
    const blur = num(m.get('shadowBlur'));
    if (blur !== undefined) out.shadowBlur = blur;
    const dx = num(m.get('shadowOffsetX'));
    if (dx !== undefined) out.shadowOffsetX = dx;
    const dy = num(m.get('shadowOffsetY'));
    if (dy !== undefined) out.shadowOffsetY = dy;
    const op = num(m.get('shadowOpacity'));
    if (op !== undefined) out.shadowOpacity = Math.min(1, Math.max(0, op / 100));
  }
  if (m.get('sketch') === '1') {
    out.sketch = true;
    const fs = m.get('fillStyle') as ElementStyle['sketchFill'] | undefined;
    if (fs && (SKETCH_FILLS as readonly string[]).includes(fs)) out.sketchFill = fs;
    const jiggle = num(m.get('jiggle'));
    if (jiggle !== undefined) out.sketchRoughness = jiggle;
  }
  return out;
}
