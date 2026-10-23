/**
 * Text measurement & wrapping.
 *
 * Diagram text is rendered as native SVG <text>/<tspan> (not <foreignObject>)
 * so exports to SVG, PNG and PDF are faithful everywhere. SVG has no automatic
 * wrapping, so we wrap ourselves using canvas text metrics.
 */
import type { ElementStyle } from '@/model/types';
import { fontStack, isMonoFamily } from '@/text/fonts';

type TextStyle = Pick<ElementStyle, 'fontFamily' | 'fontSize' | 'bold' | 'italic'>;

let ctx: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();

export const LINE_HEIGHT = 1.3;
export const lineHeight = (fontSize: number) => fontSize * LINE_HEIGHT;

export function cssFont(s: TextStyle): string {
  return `${s.italic ? 'italic ' : ''}${s.bold ? 700 : 400} ${s.fontSize}px ${fontStack(s.fontFamily)}`;
}

export function measureText(text: string, s: TextStyle): number {
  const font = cssFont(s);
  const key = font + '\u0000' + text;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  if (ctx === undefined) {
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch {
      ctx = null;
    }
  }
  let w: number;
  if (ctx) {
    ctx.font = font;
    w = ctx.measureText(text).width;
  } else {
    // Headless fallback (tests): average glyph width estimate.
    w = text.length * s.fontSize * (isMonoFamily(s.fontFamily) ? 0.6 : 0.55);
  }
  if (widthCache.size > 20000) widthCache.clear();
  widthCache.set(key, w);
  return w;
}

/** Invalidate metrics, e.g. once web fonts finish loading. */
export function clearTextCache() {
  widthCache.clear();
}

/** Greedy word wrap. Honors explicit newlines; breaks overlong words by character. */
export function wrapText(text: string, maxWidth: number, s: TextStyle): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (maxWidth <= 0 || measureText(para, s) <= maxWidth) {
      out.push(para);
      continue;
    }
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const candidate = line + word;
      if (measureText(candidate, s) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = /^\s+$/.test(word) ? '' : word;
      // Break words wider than the box.
      while (measureText(line, s) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && measureText(line.slice(0, cut), s) > maxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/**
 * Baseline offset of a line inside its line box, matching how the browser
 * lays out the same text in the HTML editor overlay (so text doesn't jump
 * when you start editing).
 */
export const baselineOffset = (fontSize: number) => lineHeight(fontSize) / 2 + fontSize * 0.36;
