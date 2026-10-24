/**
 * Export pipeline shared by the Export dialog and the desktop CLI
 * (`arkdraw --export …`): settings → pages in scope → files.
 */
import { deflateSync as deflateRawSync, strToU8, zipSync } from 'fflate';
import type { Doc, Page, Rect, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { serializePages } from '@/io/fileFormat';
import { exportDrawioPages } from '@/io/drawio';
import { paperSize } from '@/canvas/paper';
import { iconUrl } from '@/shapes/IconImage';
import { base64Encode, utf8Encode } from '@/io/import/_shared';
import { exportSubset, inlineIcons, renderSvgStandalone, visualBounds, type Appearance, type SvgExportOptions } from './svg';
import { encodeCanvas, exportRaster, type RasterFormat } from './raster';
import { embedDiagramInPng, embedDiagramInSvg, pdfEmbedProps } from './embed';
import { encodeShareUrl } from './share';
import { placeholderLookup } from '@/automation/placeholders';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'html' | 'gif' | 'drawio' | 'vsdx' | 'url';
export type PageScope = 'current' | 'all' | 'selection' | 'range';
export type BackgroundMode = 'page' | 'white' | 'transparent';

export interface FormatInfo {
  label: string;
  desc: string;
  ext: string;
  mime: string;
  /** Can produce one file per page. */
  multiPage: 'native' | 'zip' | 'none';
}

export const FORMATS: Record<ExportFormat, FormatInfo> = {
  png: { label: 'PNG', desc: 'Lossless image', ext: 'png', mime: 'image/png', multiPage: 'zip' },
  jpeg: { label: 'JPEG', desc: 'Compact photo image', ext: 'jpg', mime: 'image/jpeg', multiPage: 'zip' },
  webp: { label: 'WebP', desc: 'Small web image', ext: 'webp', mime: 'image/webp', multiPage: 'zip' },
  svg: { label: 'SVG', desc: 'Scalable vector', ext: 'svg', mime: 'image/svg+xml', multiPage: 'zip' },
  pdf: { label: 'PDF', desc: 'Vector document', ext: 'pdf', mime: 'application/pdf', multiPage: 'native' },
  html: { label: 'HTML', desc: 'Interactive viewer', ext: 'html', mime: 'text/html', multiPage: 'native' },
  gif: { label: 'GIF', desc: 'Animated', ext: 'gif', mime: 'image/gif', multiPage: 'none' },
  drawio: { label: '.drawio', desc: 'Editable XML', ext: 'drawio', mime: 'application/xml', multiPage: 'native' },
  vsdx: { label: 'Visio', desc: 'VSDX drawing', ext: 'vsdx', mime: 'application/vnd.ms-visio.drawing', multiPage: 'native' },
  url: { label: 'Link', desc: 'Shareable URL', ext: 'txt', mime: 'text/plain', multiPage: 'native' },
};

export interface ExportSettings {
  format: ExportFormat;
  scope: PageScope;
  /** 1-based inclusive page range (scope = range). */
  rangeFrom: number;
  rangeTo: number;
  /** Border around the drawing, px. */
  border: number;
  /** Raster scale (1 = 96 dpi). */
  scale: number;
  /** JPEG / WebP quality, 0..1. */
  quality: number;
  background: BackgroundMode;
  /** `content` = crop to the drawing; `page` = the page-sized area(s) it occupies. */
  area: 'content' | 'page';
  grid: boolean;
  /** Include a copy of the diagram (PNG / SVG / PDF). */
  embedDiagram: boolean;
  embedFonts: boolean;
  embedImages: boolean;
  appearance: Appearance;
  /** PDF sheet size: per-page content size, or the page's paper size. */
  pdfFit: 'content' | 'paper';
  /** mxGraph: compressed diagram payloads. */
  compressed: boolean;
  // GIF
  fps: number;
  loop: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'png',
  scope: 'current',
  rangeFrom: 1,
  rangeTo: 1,
  border: 24,
  scale: 2,
  quality: 0.9,
  background: 'page',
  area: 'content',
  grid: false,
  embedDiagram: false,
  embedFonts: true,
  embedImages: true,
  appearance: 'light',
  pdfFit: 'content',
  compressed: false,
  fps: 20,
  loop: true,
};

export interface ExportSource {
  pages: Page[];
  activePageId: string;
  selection: string[];
  /** File name without extension. */
  fileName: string;
  gridSize?: number;
}

export interface ExportFile {
  name: string;
  mime: string;
  data: string | Uint8Array;
}

export interface ExportControl {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Capabilities (what each format supports) — drives the dialog and the CLI
// ---------------------------------------------------------------------------

const RASTER: ExportFormat[] = ['png', 'jpeg', 'webp'];
export const isRaster = (f: ExportFormat): f is RasterFormat => RASTER.includes(f);

export const supports = {
  scale: (f: ExportFormat) => isRaster(f) || f === 'gif',
  quality: (f: ExportFormat) => f === 'jpeg' || f === 'webp',
  transparent: (f: ExportFormat) => f === 'png' || f === 'svg' || f === 'webp' || f === 'gif' || f === 'html',
  background: (f: ExportFormat) => isRaster(f) || f === 'svg' || f === 'pdf' || f === 'html' || f === 'gif',
  border: (f: ExportFormat) => isRaster(f) || f === 'svg' || f === 'pdf' || f === 'html' || f === 'gif',
  area: (f: ExportFormat) => isRaster(f) || f === 'svg' || f === 'pdf' || f === 'html',
  grid: (f: ExportFormat) => isRaster(f) || f === 'svg' || f === 'pdf' || f === 'html',
  embed: (f: ExportFormat) => f === 'png' || f === 'svg' || f === 'pdf',
  appearance: (f: ExportFormat) => f === 'svg' || f === 'html',
  fonts: (f: ExportFormat) => f === 'svg' || f === 'html',
  images: (f: ExportFormat) => f === 'svg',
  scopes: (f: ExportFormat): PageScope[] =>
    f === 'gif' ? ['current', 'selection'] : f === 'pdf' ? ['current', 'all', 'selection', 'range'] : ['current', 'all', 'selection'],
};

// ---------------------------------------------------------------------------
// Pages in scope
// ---------------------------------------------------------------------------

/** A copy of `doc` containing only `ids` (plus container contents and connectors between them). */
export function subsetDoc(doc: Doc, ids: string[]): Doc {
  const els = exportSubset(doc, ids);
  const elements: Doc['elements'] = {};
  for (const el of els) elements[el.id] = el;
  return { elements, order: els.map((e) => e.id), ...(doc.layers ? { layers: doc.layers } : {}) };
}

export function pagesInScope(src: ExportSource, s: Pick<ExportSettings, 'scope' | 'rangeFrom' | 'rangeTo'>): Page[] {
  const active = src.pages.find((p) => p.id === src.activePageId) ?? src.pages[0];
  switch (s.scope) {
    case 'all':
      return src.pages;
    case 'range': {
      const a = Math.max(1, Math.min(s.rangeFrom, s.rangeTo));
      const b = Math.min(src.pages.length, Math.max(s.rangeFrom, s.rangeTo));
      return src.pages.slice(a - 1, b);
    }
    case 'selection':
      return active && src.selection.length ? [{ ...active, doc: subsetDoc(active.doc, src.selection) }] : active ? [active] : [];
    default:
      return active ? [active] : [];
  }
}

/** The page tiles (paper-sized cells) the drawing occupies — mxGraph's "whole page" export area. */
export function pageArea(page: Page): Rect | undefined {
  const els = page.doc.order.map((id) => page.doc.elements[id]).filter(Boolean);
  const b = visualBounds(page.doc, els);
  const { w: pw, h: ph } = paperSize(page.settings);
  if (!b) return { x: 0, y: 0, w: pw, h: ph };
  const x1 = Math.floor(Math.min(0, b.x) / pw) * pw;
  const y1 = Math.floor(Math.min(0, b.y) / ph) * ph;
  const x2 = Math.max(pw, Math.ceil((b.x + b.w) / pw) * pw);
  const y2 = Math.max(ph, Math.ceil((b.y + b.h) / ph) * ph);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function backgroundFor(page: Page, s: ExportSettings): string | null {
  const transparentOk = supports.transparent(s.format) || s.format === 'pdf';
  if (s.background === 'transparent' && transparentOk) return null;
  if (s.background === 'page') return page.settings.background ?? '#ffffff';
  return '#ffffff';
}

/** Render options for one page. */
export function svgOptionsFor(page: Page, src: ExportSource, s: ExportSettings): SvgExportOptions {
  const index = Math.max(0, src.pages.findIndex((p) => p.id === page.id));
  const isSelection = s.scope === 'selection' && src.selection.length > 0;
  return {
    background: backgroundFor(page, s),
    padding: supports.border(s.format) ? Math.max(0, s.border) : 24,
    area: s.area === 'page' && !isSelection && supports.area(s.format) ? pageArea(page) : undefined,
    grid: s.grid && supports.grid(s.format) ? (src.gridSize ?? 20) : false,
    appearance: supports.appearance(s.format) ? s.appearance : 'light',
    embedFont: supports.fonts(s.format) ? s.embedFonts : true,
    pageShadow: !!page.settings.shadow,
    labelVars: { pageName: page.name, pageNumber: index + 1, pageCount: src.pages.length, fileName: src.fileName, lookup: placeholderLookup(page.doc, page.data), language: page.settings.language },
  };
}

// ---------------------------------------------------------------------------
// Icon rasterizer for VSDX (browser only)
// ---------------------------------------------------------------------------

async function rasterizeIcon(shape: ShapeElement): Promise<Uint8Array | null> {
  if (!shape.icon || typeof document === 'undefined') return null;
  const resolve = await inlineIcons([shape]);
  const href = resolve(shape.icon) || iconUrl(shape.icon);
  const img = new Image();
  img.src = href;
  await img.decode();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(shape.w * scale));
  canvas.height = Math.max(1, Math.round(shape.h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const k = Math.min(canvas.width / (img.naturalWidth || canvas.width), canvas.height / (img.naturalHeight || canvas.height));
  const w = (img.naturalWidth || canvas.width) * k;
  const h = (img.naturalHeight || canvas.height) * k;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  return encodeCanvas(canvas, 'png');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim() || 'Page';

const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
};

/** Renders the export. Formats without native multi-page support return one file per page. */
export async function exportFiles(src: ExportSource, s: ExportSettings, ctl: ExportControl = {}): Promise<ExportFile[]> {
  const info = FORMATS[s.format];
  if (!supports.scopes(s.format).includes(s.scope)) s = { ...s, scope: 'current' };
  const pages = pagesInScope(src, s);
  if (!pages.length) throw new Error('There are no pages to export.');
  if (pages.every((p) => !p.doc.order.length) && s.format !== 'drawio' && s.format !== 'url') throw new Error('Nothing to export — the diagram is empty.');
  const base = src.fileName || 'Diagram';
  const progress = (f: number) => ctl.onProgress?.(Math.max(0, Math.min(1, f)));
  const embedJson = (p: Page[]) => serializePages(p);

  switch (s.format) {
    case 'png':
    case 'jpeg':
    case 'webp':
    case 'svg': {
      const out: ExportFile[] = [];
      const multi = pages.length > 1;
      const used = new Set<string>();
      for (const [i, page] of pages.entries()) {
        checkAbort(ctl.signal);
        const opts = svgOptionsFor(page, src, s);
        let data: string | Uint8Array;
        if (s.format === 'svg') {
          const r = s.embedImages ? await renderSvgStandalone(page.doc, opts) : await renderSvgNoImages(page.doc, opts);
          data = s.embedDiagram ? embedDiagramInSvg(r.svg, embedJson([page])) : r.svg;
        } else {
          data = await exportRaster(page.doc, { ...opts, scale: s.scale, format: s.format, quality: s.quality });
          if (s.format === 'png' && s.embedDiagram) data = embedDiagramInPng(data, embedJson([page]));
        }
        let name = multi ? `${base}-${safeName(page.name)}` : base;
        for (let n = 2; used.has(name); n++) name = `${base}-${safeName(page.name)}-${n}`;
        used.add(name);
        out.push({ name: `${name}.${info.ext}`, mime: info.mime, data });
        progress((i + 1) / pages.length);
      }
      return out;
    }
    case 'pdf': {
      const { exportPdfPages } = await import('./pdf');
      let embed;
      if (s.embedDiagram) embed = pdfEmbedProps(embedJson(pages), await exportDrawioPages(pages.map((p) => ({ name: p.name, doc: p.doc }))));
      const data = await exportPdfPages(
        pages.map((page) => ({
          doc: page.doc,
          svg: svgOptionsFor(page, src, s),
          paper: s.pdfFit === 'paper' ? paperSize(page.settings) : undefined,
        })),
        { title: base, embed, onProgress: progress, signal: ctl.signal },
      );
      return [{ name: `${base}.pdf`, mime: info.mime, data }];
    }
    case 'html': {
      const { exportHtml } = await import('./html');
      const activeIdx = Math.max(0, pages.findIndex((p) => p.id === src.activePageId));
      const html = await exportHtml(
        pages.map((page) => ({ page, svg: svgOptionsFor(page, src, s) })),
        { title: base, appearance: s.appearance, embedFonts: s.embedFonts, initialPage: activeIdx, diagramJson: serializePages(pages) },
      );
      progress(1);
      return [{ name: `${base}.html`, mime: info.mime, data: html }];
    }
    case 'gif': {
      const { exportGif } = await import('./gif');
      const page = pages[0];
      const opts = svgOptionsFor(page, src, s);
      const data = await exportGif(page.doc, { ...opts, scale: s.scale, fps: s.fps, duration: 'auto', loop: s.loop, onProgress: progress, signal: ctl.signal });
      return [{ name: `${base}.gif`, mime: info.mime, data }];
    }
    case 'drawio': {
      let xml = await exportDrawioPages(pages.map((p) => ({ name: p.name, doc: p.doc })));
      if (s.compressed) xml = compressDrawio(xml);
      progress(1);
      return [{ name: `${base}.drawio`, mime: info.mime, data: xml }];
    }
    case 'vsdx': {
      const { exportVsdx } = await import('@/io/vsdx/export');
      const data = await exportVsdx(pages, { title: base, rasterize: typeof document !== 'undefined' ? rasterizeIcon : undefined });
      progress(1);
      return [{ name: `${base}.vsdx`, mime: info.mime, data }];
    }
    case 'url': {
      const url = encodeShareUrl(pages);
      progress(1);
      return [{ name: `${base}.url.txt`, mime: info.mime, data: url }];
    }
  }
}

/** One file: multi-file results are bundled into a .zip. */
export async function exportBundle(src: ExportSource, s: ExportSettings, ctl: ExportControl = {}): Promise<ExportFile> {
  const files = await exportFiles(src, s, ctl);
  if (files.length === 1) return files[0];
  const zip: Record<string, Uint8Array> = {};
  for (const f of files) zip[f.name] = typeof f.data === 'string' ? strToU8(f.data) : f.data;
  return { name: `${src.fileName || 'Diagram'}.zip`, mime: 'application/zip', data: zipSync(zip, { level: s.format === 'svg' ? 6 : 0 }) };
}

/** SVG without inlined images: icons stay as (relative or remote) links. */
async function renderSvgNoImages(doc: Doc, opts: SvgExportOptions) {
  const { renderSvg, loadExportFonts } = await import('./svg');
  if (opts.embedFont !== false) await loadExportFonts(exportSubset(doc, opts.ids));
  return renderSvg(doc, opts);
}

/** mxGraph's compressed form: each <diagram> holds base64(deflateRaw(encodeURIComponent(xml))). */
export function compressDrawio(xml: string): string {
  return xml.replace(/(<diagram\b[^>]*>)\s*(<mxGraphModel[\s\S]*?<\/mxGraphModel>)\s*(<\/diagram>)/g, (_, open: string, model: string, close: string) => {
    const deflated = deflateRawSync(utf8Encode(encodeURIComponent(model)));
    return `${open}${base64Encode(deflated)}${close}`;
  });
}


// ---------------------------------------------------------------------------
// Size estimates (shown in the dialog before exporting)
// ---------------------------------------------------------------------------

export interface SizeEstimate {
  bytes: number;
  /** Output pixel size of the first page (raster formats). */
  width?: number;
  height?: number;
}

export function estimateSize(src: ExportSource, s: ExportSettings, previewSvgLength: number, previewW: number, previewH: number): SizeEstimate {
  const pages = pagesInScope(src, s);
  const n = Math.max(1, pages.length);
  const els = pages.reduce((k, p) => k + p.doc.order.length, 0);
  const icons = pages.reduce((k, p) => k + p.doc.order.filter((id) => isShape(p.doc.elements[id]) && !!(p.doc.elements[id] as ShapeElement).icon).length, 0);
  const px = previewW * previewH * s.scale * s.scale;
  const font = 48_000 * 1.34;
  const embed = s.embedDiagram && supports.embed(s.format) ? els * 260 : 0;
  let bytes: number;
  switch (s.format) {
    case 'png': bytes = n * px * 0.22 + embed; break;
    case 'jpeg': bytes = n * px * (0.05 + 0.25 * s.quality * s.quality); break;
    case 'webp': bytes = n * px * (0.02 + 0.12 * s.quality * s.quality); break;
    case 'svg': bytes = n * previewSvgLength + (s.embedFonts ? font : 0) + (s.embedImages ? icons * 3500 : 0) + embed * 1.34; break;
    case 'pdf': bytes = n * previewSvgLength * 0.45 + 12_000 + embed * 2; break;
    case 'html': bytes = n * previewSvgLength + (s.embedFonts ? font : 0) + icons * 3500 + 14_000; break;
    case 'drawio': bytes = els * (s.compressed ? 110 : 380) + 400; break;
    case 'vsdx': bytes = els * 260 + 3_500; break;
    default: bytes = 0;
  }
  return { bytes: Math.round(bytes), width: Math.round(previewW * s.scale), height: Math.round(previewH * s.scale) };
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(b < 10 * 1024 ? 1 : 0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

