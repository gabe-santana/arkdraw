/**
 * Formatted-label text: a Markdown subset plus a small, sanitized inline HTML
 * subset for what Markdown can't express (colour, highlight, size, font,
 * sub/superscript, images, simple tables). Markdown allows inline HTML, so
 * stored labels stay readable Markdown.
 *
 * Inline Markdown: **bold**  *italic*  __underline__  ~~strike~~  `code`  [link](url)
 *                  \* \_ \~ \` \[ \] \\ \< \& escape a literal character.
 * Inline HTML:     <b> <strong> <i> <em> <u> <s> <strike> <del> <sub> <sup> <code>
 *                  <a href> <font color size face> <mark> <span style="…"> <img src width height>
 * Blocks (per line): # / ## / ### headings, - / * / • bullets, 1. numbered,
 *                  and a whole line `<table>…</table>`.
 *
 * Nothing here ever reaches the DOM as raw HTML: the renderer emits SVG from
 * parsed runs, and the WYSIWYG editor's HTML is generated from runs with every
 * text and attribute escaped.
 */
import { cleanFontName } from './fonts';

export interface InlineStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  href?: string;
  /** Font size in px (document units). */
  size: number;
  color?: string;
  highlight?: string;
  font?: string;
  script?: 'sub' | 'sup';
}

export interface InlineImage {
  src: string;
  w: number;
  h: number;
}

export interface InlineRun extends InlineStyle {
  text: string;
  img?: InlineImage;
}

export interface RichTableCell {
  /** Inline-formatted cell content (same syntax as a label line). */
  text: string;
  header: boolean;
}

export interface RichTable {
  rows: RichTableCell[][];
  border: boolean;
}

// ---------------------------------------------------------------------------
// Escapes & entities
// ---------------------------------------------------------------------------

const ESCAPABLE = '*_~`[]\\<&';
/** Escaped characters are swapped for private-use code points while parsing. */
const PUA = 0xe000;
const hideEscapes = (s: string) => s.replace(/\\([*_~`[\]\\<&])/g, (_, c: string) => String.fromCharCode(PUA + ESCAPABLE.indexOf(c)));
const showEscapes = (s: string) => s.replace(/[-]/g, (c) => ESCAPABLE[c.charCodeAt(0) - PUA]);

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k.startsWith('#x')) return safeChar(parseInt(k.slice(2), 16)) ?? m;
    if (k.startsWith('#')) return safeChar(parseInt(k.slice(1), 10)) ?? m;
    return ENTITIES[k] ?? m;
  });
}
const safeChar = (n: number) => (Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : undefined);

/** Final text of a run: escapes restored, entities decoded, nbsp as space. */
const finishText = (s: string) => decodeEntities(showEscapes(s)).replace(/ /g, ' ');

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Sanitizing
// ---------------------------------------------------------------------------

export function safeColor(v: string | undefined | null): string | undefined {
  if (!v) return undefined;
  const c = v.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(c) || /^rgba?\([\d\s.,%/]+\)$/i.test(c) || /^hsla?\([\d\s.,%/deg]+\)$/i.test(c) || /^[a-z]{3,20}$/i.test(c)) {
    return /^(inherit|initial|unset|currentcolor|transparent|none|default)$/i.test(c) ? undefined : c;
  }
  return undefined;
}

export function safeHref(v: string | undefined | null): string | undefined {
  const h = v?.trim();
  if (!h) return undefined;
  return /^(https?:|mailto:|tel:|#|page:|data:page\/id,)/i.test(h) ? h : undefined;
}

export function safeImageSrc(v: string | undefined | null): string | undefined {
  const s = v?.trim();
  if (!s) return undefined;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp)[;,]/i.test(s)) return s;
  return /^https?:\/\//i.test(s) ? s : undefined;
}

/** Legacy <font size="1..7"> in px. */
const FONT_SIZES = [0, 10, 13, 16, 18, 24, 32, 48];

function cssSize(v: string, current: number): number | undefined {
  const m = /^([\d.]+)\s*(px|pt|em|rem|%)?$/i.exec(v.trim());
  if (!m) {
    const named: Record<string, number> = { 'xx-small': 9, 'x-small': 10, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32, smaller: current * 0.83, larger: current * 1.2 };
    return named[v.trim().toLowerCase()];
  }
  const n = Number(m[1]);
  const unit = (m[2] ?? 'px').toLowerCase();
  const px = unit === 'pt' ? (n * 4) / 3 : unit === 'em' || unit === 'rem' ? n * current : unit === '%' ? (n / 100) * current : n;
  return px > 0 && px < 1000 ? Math.round(px * 100) / 100 : undefined;
}

export function parseCssStyle(css: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i > 0) m.set(decl.slice(0, i).trim().toLowerCase(), decl.slice(i + 1).trim());
  }
  return m;
}

/** Applies a (sanitized) CSS declaration list to an inline style. */
export function applyCss(st: InlineStyle, css: string): InlineStyle {
  const d = parseCssStyle(css);
  const out = { ...st };
  const color = safeColor(d.get('color'));
  if (color) out.color = color;
  const bg = safeColor(d.get('background-color') ?? d.get('background'));
  if (bg) out.highlight = bg;
  const size = d.get('font-size') && cssSize(d.get('font-size')!, st.size);
  if (size) out.size = size;
  const fam = d.get('font-family');
  if (fam) {
    const name = cleanFontName(fam.split(',')[0]);
    if (name && !/^(inherit|initial|sans-serif|serif|monospace)$/i.test(name)) out.font = name;
  }
  const weight = d.get('font-weight');
  if (weight) out.bold = /bold|[6-9]00/.test(weight);
  const fstyle = d.get('font-style');
  if (fstyle) out.italic = /italic|oblique/.test(fstyle);
  const deco = d.get('text-decoration') ?? d.get('text-decoration-line');
  if (deco) {
    if (/underline/.test(deco)) out.underline = true;
    if (/line-through/.test(deco)) out.strike = true;
    if (/^none$/.test(deco)) out.underline = out.strike = false;
  }
  const va = d.get('vertical-align');
  if (va === 'super') out.script = 'sup';
  else if (va === 'sub') out.script = 'sub';
  return out;
}

// ---------------------------------------------------------------------------
// Inline parsing
// ---------------------------------------------------------------------------

const MD = /(\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s>=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/;
const KNOWN = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'sub', 'sup', 'code', 'a', 'font', 'mark', 'span', 'img', 'br', 'small', 'big']);

export function parseAttrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** Index of the matching close tag of `name` (balanced), or -1. */
function findClose(s: string, name: string, from: number): { start: number; end: number } | null {
  const re = new RegExp(`<(/?)${name}(?=[\\s>/])[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m[1]) depth--;
    else if (!/\/>$/.test(m[0])) depth++;
    if (depth === 0) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

function tagStyle(name: string, attrs: Record<string, string>, st: InlineStyle): InlineStyle {
  let out = { ...st };
  switch (name) {
    case 'b': case 'strong': out.bold = true; break;
    case 'i': case 'em': out.italic = true; break;
    case 'u': case 'ins': out.underline = true; break;
    case 's': case 'strike': case 'del': out.strike = true; break;
    case 'sub': out.script = 'sub'; break;
    case 'sup': out.script = 'sup'; break;
    case 'mark': out.highlight = '#fef08a'; break;
    case 'small': out.size = st.size * 0.83; break;
    case 'big': out.size = st.size * 1.2; break;
    case 'a': {
      const href = safeHref(attrs.href);
      if (href) {
        out.href = href;
        out.underline = true;
      }
      break;
    }
    case 'font': {
      const color = safeColor(attrs.color);
      if (color) out.color = color;
      const n = Number(attrs.size);
      if (n >= 1 && n <= 7) out.size = FONT_SIZES[n];
      if (attrs.face) {
        const face = cleanFontName(attrs.face.split(',')[0]);
        if (face) out.font = face;
      }
      break;
    }
  }
  if (attrs.style) out = applyCss(out, attrs.style);
  return out;
}

function imageRun(attrs: Record<string, string>, st: InlineStyle): InlineRun | null {
  const src = safeImageSrc(attrs.src);
  if (!src) return null;
  const css = parseCssStyle(attrs.style ?? '');
  const num = (v: string | undefined) => (v ? Number.parseFloat(v) : NaN);
  let w = num(attrs.width ?? css.get('width'));
  let h = num(attrs.height ?? css.get('height'));
  if (!(w > 0) && !(h > 0)) w = h = st.size * 2;
  else if (!(w > 0)) w = h;
  else if (!(h > 0)) h = w;
  return { ...st, text: '', img: { src, w: Math.min(w, 2000), h: Math.min(h, 2000) } };
}

function parseInto(text: string, st: InlineStyle, out: InlineRun[]) {
  let rest = text;
  while (rest) {
    const md = MD.exec(rest);
    const tag = TAG.exec(rest);
    const useTag = tag && (!md || tag.index < md.index);
    const m = useTag ? tag : md;
    if (!m) {
      out.push({ ...st, text: finishText(rest) });
      return;
    }
    if (m.index > 0) out.push({ ...st, text: finishText(rest.slice(0, m.index)) });
    if (useTag) {
      const [whole, close, rawName, rawAttrs] = m;
      const name = rawName.toLowerCase();
      let after = m.index + whole.length;
      if (!KNOWN.has(name)) {
        // Not ours: keep it as literal text.
        out.push({ ...st, text: finishText(whole) });
      } else if (close) {
        /* stray close tag: drop */
      } else if (name === 'br') {
        out.push({ ...st, text: ' ' });
      } else if (name === 'img') {
        const img = imageRun(parseAttrs(rawAttrs), st);
        if (img) out.push(img);
      } else {
        const attrs = parseAttrs(rawAttrs);
        const end = /\/>$/.test(whole) ? null : findClose(rest, name, after);
        const inner = end ? rest.slice(after, end.start) : /\/>$/.test(whole) ? '' : rest.slice(after);
        const nst = tagStyle(name, attrs, st);
        if (name === 'code') out.push({ ...nst, code: true, text: finishText(inner.replace(/<[^>]*>/g, '')) });
        else parseInto(inner, nst, out);
        after = end ? end.end : rest.length;
      }
      rest = rest.slice(after);
      continue;
    }
    if (m[2] !== undefined) parseInto(m[2], { ...st, bold: true }, out);
    else if (m[3] !== undefined) parseInto(m[3], { ...st, underline: true }, out);
    else if (m[4] !== undefined) parseInto(m[4], { ...st, strike: true }, out);
    else if (m[5] !== undefined) parseInto(m[5], { ...st, italic: true }, out);
    else if (m[6] !== undefined) out.push({ ...st, code: true, text: finishText(m[6]) });
    else if (m[7] !== undefined) {
      const href = safeHref(showEscapes(m[8]));
      parseInto(m[7], href ? { ...st, href, underline: true } : st, out);
    }
    rest = rest.slice(m.index + m[0].length);
  }
}

/** Parses one line of formatted text into styled runs. */
export function parseInline(text: string, base: InlineStyle): InlineRun[] {
  const out: InlineRun[] = [];
  parseInto(hideEscapes(text), base, out);
  return out.filter((r) => r.text || r.img);
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Splits formatted text into lines (`<br>` counts as a line break; tables stay on one line). */
export const splitLines = (text: string) => text.replace(/<br\s*\/?>/gi, '\n').split('\n');

const TABLE_LINE = /^\s*<table\b[\s\S]*<\/table>\s*$/i;
export const isTableLine = (line: string) => TABLE_LINE.test(line);

export function parseTable(line: string): RichTable | null {
  const m = /<table\b([^>]*)>([\s\S]*)<\/table>/i.exec(line);
  if (!m) return null;
  const attrs = parseAttrs(m[1]);
  const rows: RichTableCell[][] = [];
  for (const tr of m[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: RichTableCell[] = [];
    for (const td of tr[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      cells.push({ header: td[1].toLowerCase() === 'th', text: td[2].replace(/<\/?(p|div)\b[^>]*>/gi, ' ').trim() });
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return null;
  const css = parseCssStyle(attrs.style ?? '');
  const border = attrs.border ? attrs.border !== '0' : /border/.test([...css.keys()].join(' ')) && !/none|0px/.test(css.get('border') ?? '');
  return { rows, border };
}

/** Plain text of a formatted label (formatting removed, block prefixes kept). */
export function stripFormatting(text: string): string {
  const base: InlineStyle = { bold: false, italic: false, underline: false, strike: false, code: false, size: 12 };
  return splitLines(text)
    .map((line) => {
      const table = isTableLine(line) ? parseTable(line) : null;
      if (table) return table.rows.map((r) => r.map((c) => parseInline(c.text, base).map((x) => x.text).join('')).join('\t')).join('\n');
      return parseInline(line, base).map((r) => r.text).join('');
    })
    .join('\n');
}

/** True when the text uses anything beyond plain characters. */
export const hasMarkup = (text: string) => stripFormatting(text) !== text;

// ---------------------------------------------------------------------------
// Serializing runs back to text
// ---------------------------------------------------------------------------

/** Escapes characters the inline parser would otherwise interpret. */
export function escapeInline(s: string): string {
  return s
    .replace(/\\(?=[*_~`[\]\\<&]|$)/g, '\\\\')
    .replace(/[*_~`[\]]/g, (c) => `\\${c}`)
    .replace(/<(?=[a-zA-Z/!])/g, '\\<')
    .replace(/&(?=#?[a-zA-Z0-9]+;)/g, '\\&');
}

/** The element-level style runs are relative to. */
export interface BaseStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  size: number;
  color?: string;
  font?: string;
}

const sameStyle = (a: InlineStyle, b: InlineStyle) =>
  a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.strike === b.strike && a.code === b.code &&
  a.href === b.href && Math.abs(a.size - b.size) < 0.01 && a.color === b.color && a.highlight === b.highlight && a.font === b.font && a.script === b.script;

const fmtSize = (n: number) => String(Math.round(n * 100) / 100);

/** One run as formatted text, relative to `base`. */
export function serializeRun(r: InlineRun, base: BaseStyle): string {
  if (r.img) return `<img src="${escapeHtml(r.img.src)}" width="${fmtSize(r.img.w)}" height="${fmtSize(r.img.h)}">`;
  if (!r.text) return '';
  let t = r.code ? (r.text.includes('`') ? `<code>${escapeHtml(r.text)}</code>` : `\`${r.text}\``) : escapeInline(r.text);
  if (r.script) t = `<${r.script}>${t}</${r.script}>`;
  if (r.strike && !base.strike) t = `~~${t}~~`;
  if (r.underline && !base.underline && !r.href) t = `__${t}__`;
  const addBold = r.bold && !base.bold;
  if (r.italic && !base.italic) t = addBold ? `<i>${t}</i>` : `*${t}*`;
  if (addBold) t = `**${t}**`;
  const css: string[] = [];
  if (!r.bold && base.bold) css.push('font-weight:normal');
  if (!r.italic && base.italic) css.push('font-style:normal');
  if (r.href) t = /[\s()]/.test(r.href) ? `<a href="${escapeHtml(r.href)}">${t}</a>` : `[${t}](${r.href})`;
  if (r.color && r.color.toLowerCase() !== base.color?.toLowerCase()) css.push(`color:${r.color}`);
  if (r.highlight) css.push(`background-color:${r.highlight}`);
  if (Math.abs(r.size - base.size) >= 0.01) css.push(`font-size:${fmtSize(r.size)}px`);
  if (r.font && r.font !== base.font) css.push(`font-family:${r.font}`);
  if (css.length) t = `<span style="${escapeHtml(css.join(';'))}">${t}</span>`;
  return t;
}

/** Serializes runs (may contain '\n' in text) into formatted text lines. */
export function serializeRuns(runs: InlineRun[], base: BaseStyle): string {
  const lines: InlineRun[][] = [[]];
  for (const r of runs) {
    if (r.img || !r.text.includes('\n')) {
      lines[lines.length - 1].push(r);
      continue;
    }
    r.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ ...r, text: part });
    });
  }
  return lines
    .map((line) => {
      const merged: InlineRun[] = [];
      for (const r of line) {
        const last = merged[merged.length - 1];
        if (last && !last.img && !r.img && sameStyle(last, r)) last.text += r.text;
        else merged.push({ ...r });
      }
      // A leading "* " is a bullet, not an escaped asterisk.
      return merged.map((r) => serializeRun(r, base)).join('').replace(/^(\s*)\\\*(\s)/, '$1*$2');
    })
    .join('\n');
}
