import type { Doc } from '@/model/types';
import { renderSvgStandalone, type SvgExportOptions, type RenderedSvg } from './svg';
import { makePngChunk, readPngChunks } from '@/io/import/_shared';

export type RasterFormat = 'png' | 'jpeg' | 'webp';

export const RASTER_MIME: Record<RasterFormat, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

/** Rasterizes an SVG string onto a canvas. */
export async function svgToCanvas(r: RenderedSvg, scale: number, canvas?: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.decoding = 'async';
  const url = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' }));
  try {
    img.src = url;
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  const c = canvas ?? document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.width * scale));
  c.height = Math.max(1, Math.round(r.height * scale));
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Encodes a canvas. JPEG has no alpha, so it is flattened onto `matte` first. */
export async function encodeCanvas(canvas: HTMLCanvasElement, format: RasterFormat, quality = 0.92, matte = '#ffffff'): Promise<Uint8Array> {
  let src = canvas;
  if (format === 'jpeg') {
    src = document.createElement('canvas');
    src.width = canvas.width;
    src.height = canvas.height;
    const ctx = src.getContext('2d')!;
    ctx.fillStyle = matte;
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.drawImage(canvas, 0, 0);
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    src.toBlob((b) => (b ? resolve(b) : reject(new Error(`${format.toUpperCase()} encoding failed`))), RASTER_MIME[format], format === 'png' ? undefined : quality),
  );
  if (blob.type && blob.type !== RASTER_MIME[format]) throw new Error(`This system cannot encode ${format.toUpperCase()} images.`);
  return new Uint8Array(await blob.arrayBuffer());
}

/** Sets the PNG's physical pixel density (pHYs), so 2× exports open at the right print size. */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const chunks = readPngChunks(png);
  if (chunks[0]?.type !== 'IHDR') return png;
  const ppm = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  const v = new DataView(data.buffer);
  v.setUint32(0, ppm);
  v.setUint32(4, ppm);
  data[8] = 1; // unit: metre
  const phys = makePngChunk('pHYs', data);
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  for (const c of chunks) {
    if (c.type === 'pHYs') continue;
    parts.push(png.subarray(c.offset, c.offset + 12 + c.data.length));
    if (c.type === 'IHDR') parts.push(phys);
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

export interface RasterOptions extends SvgExportOptions {
  scale: number;
  format?: RasterFormat;
  /** 0..1 for JPEG / WebP. */
  quality?: number;
}

export async function exportRaster(doc: Doc, opts: RasterOptions): Promise<Uint8Array> {
  const format = opts.format ?? 'png';
  const rendered = await renderSvgStandalone(doc, opts);
  const canvas = await svgToCanvas(rendered, opts.scale);
  const bytes = await encodeCanvas(canvas, format, opts.quality ?? 0.92, opts.background ?? '#ffffff');
  return format === 'png' ? setPngDpi(bytes, 96 * opts.scale) : bytes;
}

export async function exportPng(doc: Doc, opts: SvgExportOptions & { scale: number }): Promise<Uint8Array> {
  return exportRaster(doc, { ...opts, format: 'png' });
}

/** Vector PDF via jsPDF + svg2pdf (loaded lazily — they're large). Single page; see ./pdf.ts for multi-page. */
export async function exportPdf(doc: Doc, opts: SvgExportOptions): Promise<Uint8Array> {
  const { exportPdfPages } = await import('./pdf');
  return exportPdfPages([{ doc, svg: opts }], {});
}
