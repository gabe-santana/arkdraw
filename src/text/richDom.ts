/**
 * Bridges formatted label text and HTML DOM:
 *  - `domToRich` reads a DOM tree (the WYSIWYG editor, or a mxGraph `html=1`
 *    label parsed with DOMParser) into formatted text, keeping only the
 *    whitelisted formatting — so it doubles as the sanitizer for imports.
 *  - `richToEditorHtml` builds the editor's HTML from parsed runs (every text
 *    and attribute escaped; never raw stored HTML).
 *  - `richToDrawioHtml` writes mxGraph `html=1` label markup.
 */
import {
  applyCss, escapeHtml, isTableLine, parseCssStyle, parseInline, parseTable, safeColor, safeHref, safeImageSrc, serializeRuns, splitLines,
  type BaseStyle, type InlineRun, type InlineStyle,
} from './richFormat';
import { cleanFontName } from './fonts';

const FONT_SIZES = [0, 10, 13, 16, 18, 24, 32, 48];
const BLOCK = new Set(['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'section', 'article', 'header', 'footer', 'center', 'dl', 'dt', 'dd']);
const SKIP = new Set(['script', 'style', 'head', 'title', 'meta', 'link', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'math', 'button', 'input', 'select', 'textarea']);

export interface DomToRichOptions {
  /** HTML whitespace semantics (imports); the editor keeps whitespace as typed. */
  collapseWhitespace?: boolean;
}

type Seg = InlineRun | { raw: string };

function styleOf(el: Element, st: InlineStyle): InlineStyle {
  const tag = el.tagName.toLowerCase();
  let out: InlineStyle = { ...st };
  switch (tag) {
    case 'b': case 'strong': out.bold = true; break;
    case 'i': case 'em': out.italic = true; break;
    case 'u': case 'ins': out.underline = true; break;
    case 's': case 'strike': case 'del': out.strike = true; break;
    case 'sub': out.script = 'sub'; break;
    case 'sup': out.script = 'sup'; break;
    case 'code': case 'kbd': case 'tt': out.code = true; break;
    case 'mark': out.highlight = '#fef08a'; break;
    case 'h1': out = { ...out, bold: true, size: st.size * 1.6 }; break;
    case 'h2': out = { ...out, bold: true, size: st.size * 1.3 }; break;
    case 'h3': out = { ...out, bold: true, size: st.size * 1.12 }; break;
    case 'h4': case 'h5': case 'h6': case 'th': out.bold = true; break;
    case 'a': {
      const href = safeHref(el.getAttribute('href'));
      if (href) out.href = href;
      break;
    }
    case 'font': {
      const color = safeColor(el.getAttribute('color'));
      if (color) out.color = color;
      const n = Number(el.getAttribute('size'));
      if (n >= 1 && n <= 7) out.size = FONT_SIZES[n];
      const face = el.getAttribute('face');
      if (face) out.font = cleanFontName(face.split(',')[0]) || out.font;
      break;
    }
  }
  const css = el.getAttribute('style');
  if (css) out = applyCss(out, css);
  // The editor stores sizes in document px (the editor itself is zoomed).
  const size = Number(el.getAttribute('data-size'));
  if (size > 0) out.size = size;
  if (out.code) out = { ...out, href: undefined };
  return out;
}

function walk(node: Node, st: InlineStyle, out: Seg[], opts: DomToRichOptions, listIndex: { n: number } | null) {
  if (node.nodeType === 3) {
    let text = (node as Text).data;
    if (opts.collapseWhitespace) text = text.replace(/[ \t\r\n]+/g, ' ');
    if (text) out.push({ ...st, text: text.replace(/ /g, ' ') });
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (SKIP.has(tag)) return;
  const newline = () => {
    const last = out[out.length - 1];
    if (last && ('raw' in last || !last.text.endsWith('\n'))) out.push({ ...st, text: '\n' });
  };
  if (tag === 'br') {
    out.push({ ...st, text: '\n' });
    return;
  }
  if (tag === 'hr') {
    newline();
    return;
  }
  if (tag === 'img') {
    const src = safeImageSrc(el.getAttribute('src'));
    if (!src) return;
    const css = parseCssStyle(el.getAttribute('style') ?? '');
    const w = Number.parseFloat(el.getAttribute('width') ?? css.get('width') ?? '') || st.size * 2;
    const h = Number.parseFloat(el.getAttribute('height') ?? css.get('height') ?? '') || w;
    out.push({ ...st, text: '', img: { src, w, h } });
    return;
  }
  if (tag === 'table') {
    newline();
    out.push({ raw: tableToRich(el, st, opts) });
    return;
  }
  const block = BLOCK.has(tag);
  if (block) newline();
  const inner = styleOf(el, st);
  if (tag === 'li') {
    const prefix = listIndex ? `${++listIndex.n}. ` : '- ';
    out.push({ ...st, bold: false, italic: false, underline: false, strike: false, text: prefix });
  } else if (/^h[1-3]$/.test(tag) && opts.collapseWhitespace) {
    out.push({ ...st, text: '#'.repeat(Number(tag[1])) + ' ' });
  }
  const counter = tag === 'ol' ? { n: Number(el.getAttribute('start') ?? 1) - 1 } : tag === 'ul' ? null : listIndex;
  for (const child of Array.from(el.childNodes)) walk(child, /^h[1-3]$/.test(tag) && opts.collapseWhitespace ? st : inner, out, opts, counter);
  if (block) newline();
}

function tableToRich(table: Element, st: InlineStyle, opts: DomToRichOptions): string {
  const base = baseFromInline(st);
  const rows = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.closest('table') === table);
  const body = rows
    .map((tr) => {
      const cells = Array.from(tr.children).filter((c) => /^t[dh]$/i.test(c.tagName));
      return `<tr>${cells
        .map((c) => {
          const tag = c.tagName.toLowerCase();
          const segs: Seg[] = [];
          for (const child of Array.from(c.childNodes)) walk(child, styleOf(c, st), segs, { ...opts, collapseWhitespace: true }, null);
          const runs = segs.filter((s): s is InlineRun => !('raw' in s)).map((r) => ({ ...r, text: r.text.replace(/\n/g, ' ') }));
          return `<${tag}>${serializeRuns(runs, tag === 'th' ? { ...base, bold: true } : base).trim()}</${tag}>`;
        })
        .join('')}</tr>`;
    })
    .join('');
  const border = table.getAttribute('border');
  const bordered = (border !== null && border !== '0') || /border/i.test(table.getAttribute('style') ?? '');
  return `<table${bordered ? ' border="1"' : ''}>${body}</table>`;
}

const baseFromInline = (st: InlineStyle): BaseStyle => ({ bold: st.bold, italic: st.italic, underline: st.underline, strike: st.strike, size: st.size, color: st.color, font: st.font });

export const inlineFromBase = (b: BaseStyle): InlineStyle => ({
  bold: b.bold, italic: b.italic, underline: b.underline, strike: b.strike, code: false, size: b.size, color: b.color, font: b.font,
});

/** Reads a DOM subtree into formatted text relative to `base`. */
export function domToRich(root: Node, base: BaseStyle, opts: DomToRichOptions = {}): string {
  const segs: Seg[] = [];
  for (const child of Array.from(root.childNodes)) walk(child, inlineFromBase(base), segs, opts, null);
  const parts: string[] = [];
  let runs: InlineRun[] = [];
  const flush = () => {
    if (runs.length) parts.push(serializeRuns(runs, base));
    runs = [];
  };
  for (const s of segs) {
    if ('raw' in s) {
      flush();
      parts.push(s.raw);
    } else runs.push(s);
  }
  flush();
  // Tables sit on their own line; serializeRuns already kept newlines between runs.
  let text = '';
  for (const p of parts) text += text && !text.endsWith('\n') && !p.startsWith('\n') && (isTableLine(p) || isTableLine(text.split('\n').pop()!)) ? `\n${p}` : p;
  return opts.collapseWhitespace ? text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : text;
}

// ---------------------------------------------------------------------------
// Runs → HTML
// ---------------------------------------------------------------------------

/** HTML for one run. `sizeCss` maps a document px size to a CSS font-size. */
function runHtml(r: InlineRun, base: BaseStyle, sizeCss: (px: number) => string, sizeAttr: boolean): string {
  if (r.img) return `<img src="${escapeHtml(r.img.src)}" width="${r.img.w}" height="${r.img.h}">`;
  let t = escapeHtml(r.text);
  if (r.code) t = `<code>${t}</code>`;
  if (r.script) t = `<${r.script}>${t}</${r.script}>`;
  if (r.strike && !base.strike) t = `<strike>${t}</strike>`;
  if (r.underline && !base.underline && !r.href) t = `<u>${t}</u>`;
  if (r.italic && !base.italic) t = `<i>${t}</i>`;
  if (r.bold && !base.bold) t = `<b>${t}</b>`;
  if (r.href) t = `<a href="${escapeHtml(r.href)}">${t}</a>`;
  const css: string[] = [];
  const attrs: string[] = [];
  if (!r.bold && base.bold) css.push('font-weight:normal');
  if (!r.italic && base.italic) css.push('font-style:normal');
  if (r.color && r.color.toLowerCase() !== base.color?.toLowerCase()) css.push(`color:${r.color}`);
  if (r.highlight) css.push(`background-color:${r.highlight}`);
  if (Math.abs(r.size - base.size) >= 0.01) {
    css.push(`font-size:${sizeCss(r.size)}`);
    if (sizeAttr) attrs.push(`data-size="${Math.round(r.size * 100) / 100}"`);
  }
  if (r.font && r.font !== base.font) css.push(`font-family:&quot;${escapeHtml(r.font)}&quot;`);
  if (css.length || attrs.length) t = `<span${attrs.length ? ' ' + attrs.join(' ') : ''} style="${css.join(';')}">${t}</span>`;
  return t;
}

function tableHtml(line: string, base: BaseStyle, sizeCss: (px: number) => string, sizeAttr: boolean, cellCss: string): string {
  const table = parseTable(line);
  if (!table) return escapeHtml(line);
  const rows = table.rows
    .map((row) => `<tr>${row.map((c) => {
      const tag = c.header ? 'th' : 'td';
      const b = c.header ? { ...base, bold: true } : base;
      const html = parseInline(c.text, inlineFromBase(b)).map((r) => runHtml(r, b, sizeCss, sizeAttr)).join('');
      return `<${tag}${cellCss ? ` style="${cellCss}${table.border ? ';border:1px solid currentColor' : ''}"` : ''}>${html || '<br>'}</${tag}>`;
    }).join('')}</tr>`)
    .join('');
  // inline-table follows the label's text alignment in the editor (mxGraph ignores it).
  return `<table${table.border ? ' border="1"' : ''} style="border-collapse:collapse;display:inline-table">${rows}</table>`;
}

/** HTML for the WYSIWYG editor. `zoom` scales run font sizes (the base size is set on the editor). */
export function richToEditorHtml(text: string, base: BaseStyle, zoom: number): string {
  const sizeCss = (px: number) => `${Math.round(px * zoom * 100) / 100}px`;
  return splitLines(text)
    .map((line) => (isTableLine(line) ? tableHtml(line, base, sizeCss, true, 'padding:2px 6px') : parseInline(line, inlineFromBase(base)).map((r) => runHtml(r, base, sizeCss, true)).join('')))
    .join('<br>');
}

/** mxGraph `html=1` label markup. */
export function richToDrawioHtml(text: string, base: BaseStyle): string {
  const sizeCss = (px: number) => `${Math.round(px * 100) / 100}px`;
  return splitLines(text)
    .map((line) => {
      if (isTableLine(line)) return tableHtml(line, base, sizeCss, false, 'padding:2px 6px');
      const h = /^(#{1,3})\s+(.*)$/.exec(line);
      if (h) {
        const size = base.size * [1.6, 1.3, 1.12][h[1].length - 1];
        const html = parseInline(h[2], { ...inlineFromBase(base), bold: true, size }).map((r) => runHtml(r, base, sizeCss, false)).join('');
        return html;
      }
      const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
      const body = bullet ? bullet[1] : line;
      const html = parseInline(body, inlineFromBase(base)).map((r) => runHtml(r, base, sizeCss, false)).join('');
      return bullet ? `•&nbsp;${html}` : html;
    })
    .join('<br>');
}

/** Parses an HTML string (import) into formatted text; DOMParser never runs scripts. */
export function htmlToRich(html: string, base: BaseStyle): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return domToRich(doc.body, base, { collapseWhitespace: true });
}
