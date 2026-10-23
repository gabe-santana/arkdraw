/**
 * Vector PDF export (jsPDF + svg2pdf, loaded lazily — they're large).
 * One PDF page per diagram page, each either sized to its content or laid out
 * on the page's paper size (scaled down to fit, centered).
 */
import type { Doc } from '@/model/types';
import { renderSvgStandalone, type SvgExportOptions } from './svg';
import type { PdfEmbedProps } from './embed';

export interface PdfPageInput {
  doc: Doc;
  svg: SvgExportOptions;
  /** Paper size in CSS px (96 dpi). When set, the drawing is fitted onto this sheet. */
  paper?: { w: number; h: number };
}

export interface PdfOptions {
  title?: string;
  embed?: PdfEmbedProps;
  /** Sheet margin in CSS px when fitting to paper. */
  margin?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

const PT_PER_PX = 0.75;

export async function exportPdfPages(pages: PdfPageInput[], opts: PdfOptions): Promise<Uint8Array> {
  if (!pages.length) throw new Error('Nothing to export.');
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  let pdf: InstanceType<typeof jsPDF> | null = null;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(host);
  try {
    for (const [i, page] of pages.entries()) {
      if (opts.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      // PDF viewers have their own font handling; the generic family fallback maps to Helvetica.
      const rendered = await renderSvgStandalone(page.doc, { ...page.svg, embedFont: false, appearance: 'light' });
      // Content-sized pages keep 1 px = 1 pt (as before); paper pages use real paper dimensions.
      const sheetW = page.paper ? page.paper.w * PT_PER_PX : rendered.width;
      const sheetH = page.paper ? page.paper.h * PT_PER_PX : rendered.height;
      const orientation = sheetW >= sheetH ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'pt', format: [sheetW, sheetH], compress: true });
      else pdf.addPage([sheetW, sheetH], orientation);

      let x = 0, y = 0, w = rendered.width, h = rendered.height;
      if (page.paper) {
        const m = (opts.margin ?? 24) * PT_PER_PX;
        const k = Math.min((sheetW - m * 2) / rendered.width, (sheetH - m * 2) / rendered.height, PT_PER_PX);
        w = rendered.width * k;
        h = rendered.height * k;
        x = (sheetW - w) / 2;
        y = (sheetH - h) / 2;
      }
      host.innerHTML = rendered.svg.replace(/^<\?xml[^>]*>\s*/, '');
      await pdf.svg(host.querySelector('svg')!, { x, y, width: w, height: h });
      opts.onProgress?.((i + 1) / pages.length);
    }
  } finally {
    host.remove();
  }
  pdf!.setProperties({ title: opts.title ?? 'Diagram', creator: 'OpenDraw', ...(opts.embed ?? {}) });
  return new Uint8Array(pdf!.output('arraybuffer'));
}
