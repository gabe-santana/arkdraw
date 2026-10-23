/**
 * draw.io interop for text & label styles: fonts (incl. Google Fonts via
 * fontSource), label position (labelPosition × verticalLabelPosition),
 * per-side spacing, text direction, label border/background colour,
 * underline/strike font-style bits, and `html=1` formatted labels.
 */
import type { ElementStyle, FontFamily, LabelPosition } from '@/model/types';
import { cleanFontName, isFontKey, isGoogleFont } from './fonts';
import { htmlToRich, inlineFromBase, richToDrawioHtml } from './richDom';
import { serializeRuns, stripFormatting, type BaseStyle } from './richFormat';

type StyleMap = Map<string, string>;

const FONT_TO_DRAWIO: Record<string, string> = { sans: 'Helvetica', serif: 'Georgia', mono: 'Courier New', hand: 'Architects Daughter' };

export function fontToDrawio(f: FontFamily): string {
  return isFontKey(f) ? FONT_TO_DRAWIO[f] : cleanFontName(f) || 'Helvetica';
}

/** draw.io font name → built-in key where it is one of ours, else the name itself. */
export function fontFromDrawio(name: string | undefined): FontFamily {
  const raw = cleanFontName((name ?? '').split(',')[0]);
  const f = raw.toLowerCase();
  if (!f || /^(helvetica|arial|sans-serif|default|inter|system-ui)$/.test(f)) return 'sans';
  if (/^(georgia|serif)$/.test(f)) return 'serif';
  if (/^(courier new|courier|monospace|consolas)$/.test(f)) return 'mono';
  if (/^(architects daughter|caveat)$/.test(f)) return 'hand';
  return raw;
}

const base = (s: ElementStyle): BaseStyle => ({ bold: s.bold, italic: s.italic, underline: !!s.underline, strike: !!s.strike, size: s.fontSize, color: s.textColor });

/** Label value for draw.io (always html=1). */
export function labelToDrawio(text: string, s: ElementStyle): string {
  if (s.richText) return richToDrawioHtml(text, base(s));
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

/**
 * Formatted text for an `html=1` draw.io label, or null when the label has no
 * formatting worth keeping (the caller then uses its plain-text conversion).
 * Everything outside the whitelist is dropped, so this is also the sanitizer.
 */
export function richLabelFromDrawio(value: string, isHtml: boolean, s: ElementStyle): string | null {
  if (!value || (!isHtml && !/<[a-z][\s\S]*>/i.test(value))) return null;
  const b = base(s);
  const rich = htmlToRich(value, b);
  const plain = serializeRuns([{ ...inlineFromBase(b), text: stripFormatting(rich) }], b);
  return rich === plain ? null : rich;
}

// ---------------------------------------------------------------------------
// Style keys
// ---------------------------------------------------------------------------

const H: Record<string, 'left' | 'center' | 'right'> = { left: 'left', right: 'right' };
const V: Record<string, 'top' | 'middle' | 'bottom'> = { top: 'top', bottom: 'bottom' };

/** Our position → [labelPosition, verticalLabelPosition]. */
function splitPosition(p: LabelPosition): ['left' | 'center' | 'right', 'top' | 'middle' | 'bottom'] {
  if (p === 'inside') return ['center', 'middle'];
  if (p === 'top' || p === 'bottom') return ['center', p];
  if (p === 'left' || p === 'right') return [p, 'middle'];
  const [v, h] = p.split('-');
  return [H[h] ?? 'center', V[v] ?? 'middle'];
}

export function labelPositionToDrawio(m: StyleMap, s: ElementStyle) {
  const p = s.labelPosition;
  if (!p || p === 'inside') return;
  const [lp, vlp] = splitPosition(p);
  m.set('labelPosition', lp);
  m.set('verticalLabelPosition', vlp);
  // Inside the outside box, text hugs the shape.
  m.set('align', lp === 'left' ? 'right' : lp === 'right' ? 'left' : 'center');
  m.set('verticalAlign', vlp === 'top' ? 'bottom' : vlp === 'bottom' ? 'top' : s.verticalAlign);
}

/** Font, spacing, direction and label-box keys (shapes and edges). */
export function textStyleToDrawio(m: StyleMap, s: ElementStyle) {
  m.set('fontFamily', fontToDrawio(s.fontFamily));
  if (!isFontKey(s.fontFamily) && isGoogleFont(s.fontFamily)) m.set('fontSource', encodeURIComponent(`https://fonts.googleapis.com/css?family=${cleanFontName(s.fontFamily).replace(/ /g, '+')}`));
  const bits = (s.bold ? 1 : 0) | (s.italic ? 2 : 0) | (s.underline ? 4 : 0) | (s.strike ? 8 : 0);
  m.set('fontStyle', String(bits));
  if (s.spacing) m.set('spacing', String(s.spacing));
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const v = s[`spacing${side}`];
    if (v) m.set(`spacing${side}`, String(v));
  }
  if (s.textDirection) m.set('textDirection', s.textDirection);
  if (s.labelBorderColor) m.set('labelBorderColor', s.labelBorderColor);
  if (s.labelBackground && s.labelBackground !== 'none' && !m.has('labelBackgroundColor')) m.set('labelBackgroundColor', s.labelBackground);
  if (s.textOpacity !== undefined && s.textOpacity < 1 && !m.has('textOpacity')) m.set('textOpacity', String(Math.round(s.textOpacity * 100)));
}

const num = (v: string | undefined) => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n !== 0 ? n : undefined;
};

/** Reads the text-related keys into `style` (returns it). */
export function textStyleFromDrawio(m: StyleMap, style: ElementStyle): ElementStyle {
  const out: ElementStyle = { ...style };
  if (m.has('fontFamily')) out.fontFamily = fontFromDrawio(m.get('fontFamily'));
  const bits = Number(m.get('fontStyle') ?? 0) || 0;
  if (bits & 4) out.underline = true;
  if (bits & 8) out.strike = true;
  const lp = m.get('labelPosition');
  const vlp = m.get('verticalLabelPosition');
  const h = lp === 'left' || lp === 'right' ? lp : null;
  const v = vlp === 'top' || vlp === 'bottom' ? vlp : null;
  // The inner alignment of outside labels is implied by the position.
  if (h || v) out.labelPosition = (h && v ? `${v}-${h}` : (h ?? v)) as LabelPosition;
  const spacing = num(m.get('spacing'));
  if (spacing !== undefined && spacing > 0) out.spacing = spacing;
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const n = num(m.get(`spacing${side}`));
    if (n !== undefined) out[`spacing${side}`] = n;
  }
  const dir = m.get('textDirection');
  if (dir === 'rtl' || dir === 'auto') out.textDirection = dir;
  const border = m.get('labelBorderColor');
  if (border && border !== 'none' && border !== 'default') out.labelBorderColor = border;
  const bg = m.get('labelBackgroundColor');
  if (bg && bg !== 'none' && bg !== 'default' && !out.labelBackground) out.labelBackground = bg;
  const to = num(m.get('textOpacity'));
  if (to !== undefined && to < 100 && out.textOpacity === undefined) out.textOpacity = Math.max(0.1, to / 100);
  return out;
}
