/**
 * Printing: every page is rendered to SVG and laid out on sheets in a hidden
 * iframe, then the system print dialog opens (WebView2 / WebKit / browsers
 * all support it). Options (File → Print…, src/automation/PrintDialog.tsx):
 * page range, paper and orientation, background, and scaling — fit each page
 * to one sheet, fit it across N × M sheets, or print at a fixed scale (pages
 * larger than a sheet are tiled).
 */
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { t } from '@/i18n';
import { inlineIcons, renderSvg } from '@/io/export/svg';
import { PAPER_SIZES, paperSize } from '@/canvas/paper';
import type { Page, PaperSize } from '@/model/types';

export interface PrintOptions {
  /** Which pages: all, the current one, or a 1-based inclusive range. */
  pages: 'all' | 'current' | { from: number; to: number };
  /** `fit` = one sheet per page; `sheets` = fit across cols × rows sheets; `scale` = fixed scale (percent). */
  scaling: { mode: 'fit' } | { mode: 'sheets'; cols: number; rows: number } | { mode: 'scale'; percent: number };
  /** Paper; default = the first printed page's paper setting. */
  paper?: Exclude<PaperSize, 'Custom'>;
  landscape?: boolean;
  background: boolean;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = { pages: 'all', scaling: { mode: 'fit' }, background: true };

const MARGIN_MM = 10;
const MM_PER_PX = 25.4 / 96;

export interface SheetTile {
  /** Offset of the content inside the sheet, in mm (negative = scrolled). */
  left: number;
  top: number;
}

/**
 * Lays one page's content (w × h px) out on sheets of printable size sw × sh
 * mm. Returns the content size in mm and one tile per sheet, row by row.
 */
export function layoutSheets(w: number, h: number, sw: number, sh: number, scaling: PrintOptions['scaling']): { cw: number; ch: number; tiles: SheetTile[] } {
  let k: number;
  if (scaling.mode === 'fit') k = Math.min(sw / w, sh / h);
  else if (scaling.mode === 'sheets') k = Math.min((Math.max(1, scaling.cols) * sw) / w, (Math.max(1, scaling.rows) * sh) / h);
  else k = MM_PER_PX * (Math.max(1, scaling.percent) / 100);
  const cw = w * k;
  const ch = h * k;
  const cols = Math.max(1, Math.ceil(cw / sw - 1e-6));
  const rows = Math.max(1, Math.ceil(ch / sh - 1e-6));
  const tiles: SheetTile[] = [];
  // A single sheet centres the content; tiles start at the top-left.
  if (cols === 1 && rows === 1) tiles.push({ left: (sw - cw) / 2, top: (sh - ch) / 2 });
  else for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ left: -c * sw, top: -r * sh });
  return { cw, ch, tiles };
}

/** Pages selected by the options. */
export function pagesToPrint(all: Page[], activePageId: string, pages: PrintOptions['pages']): Page[] {
  const list = pages === 'all' ? all : pages === 'current' ? all.filter((p) => p.id === activePageId) : all.slice(Math.max(0, pages.from - 1), Math.max(0, pages.to));
  return list.filter((p) => p.doc.order.length);
}

/** Paper size in mm (portrait unless landscape). */
export function paperMm(paper: Exclude<PaperSize, 'Custom'>, landscape: boolean): { w: number; h: number } {
  const p = PAPER_SIZES[paper] ?? PAPER_SIZES.A4;
  const w = Math.round(p.w * MM_PER_PX);
  const h = Math.round(p.h * MM_PER_PX);
  return landscape ? { w: h, h: w } : { w, h };
}

/** Builds the printable HTML document. */
export async function buildPrintHtml(opts: PrintOptions, title: string): Promise<{ html: string; sheets: number } | null> {
  const s = useEditor.getState();
  const pages = pagesToPrint(s.allPages(), s.activePageId, opts.pages);
  if (!pages.length) return null;
  const firstPaper = pages[0].settings.paper === 'Custom' ? 'A4' : pages[0].settings.paper;
  const paper = opts.paper ?? firstPaper;
  const landscape = opts.landscape ?? (() => {
    const ps = paperSize(pages[0].settings);
    return ps.w > ps.h;
  })();
  const sheet = paperMm(paper, landscape);
  const sw = sheet.w - 2 * MARGIN_MM;
  const sh = sheet.h - 2 * MARGIN_MM;
  const out: string[] = [];
  for (const page of pages) {
    const resolver = await inlineIcons(page.doc.order.map((id) => page.doc.elements[id]));
    const r = renderSvg(page.doc, { background: opts.background ? (page.settings.background ?? null) : null, padding: 16 }, resolver);
    const svg = r.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1 width="100%"').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1 height="100%"');
    const { cw, ch, tiles } = layoutSheets(r.width, r.height, sw, sh, opts.scaling);
    for (const t of tiles) {
      out.push(
        `<div class="sheet"><div class="content" style="left:${t.left.toFixed(2)}mm;top:${t.top.toFixed(2)}mm;width:${cw.toFixed(2)}mm;height:${ch.toFixed(2)}mm">${svg}</div></div>`,
      );
    }
  }
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: ${sheet.w}mm ${sheet.h}mm; margin: ${MARGIN_MM}mm; }
    html, body { margin: 0; }
    ${opts.background ? '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' : ''}
    .sheet { position: relative; overflow: hidden; width: ${sw}mm; height: ${sh}mm; page-break-after: always; break-after: page; }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .content { position: absolute; }
    .content svg { display: block; width: 100%; height: 100%; }
  </style></head><body>${out.join('')}</body></html>`;
  return { html, sheets: out.length };
}

export async function printWithOptions(opts: PrintOptions) {
  const s = useEditor.getState();
  const built = await buildPrintHtml(opts, s.file.name);
  if (!built) {
    useUi.getState().toast(t('app.print.nothing'));
    return;
  }
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(built.html);
  doc.close();
  await new Promise((r) => setTimeout(r, 250));
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 60_000);
}

/** Prints the given pages (default: all), one page per sheet, scaled to fit. */
export async function printDiagram(pageIds?: string[]) {
  if (!pageIds) return printWithOptions(DEFAULT_PRINT_OPTIONS);
  const s = useEditor.getState();
  const all = s.allPages();
  const idx = all.map((p, i) => (pageIds.includes(p.id) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return useUi.getState().toast(t('app.print.nothing'));
  return printWithOptions({ ...DEFAULT_PRINT_OPTIONS, pages: { from: idx[0] + 1, to: idx[idx.length - 1] + 1 } });
}
