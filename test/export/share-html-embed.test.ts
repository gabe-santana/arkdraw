import { describe, expect, it } from 'vitest';
import { importEmbedded } from '@/io/import/embedded';
import { importDrawioPages } from '@/io/drawio';
import { readPngChunks, readPngText } from '@/io/import/_shared';
import { serializePages } from '@/io/fileFormat';
import { decodeShareUrl, encodeShareUrl } from '@/io/export/share';
import { SHARE_BASE_URL } from '@/io/export/config';
import { embedDiagramInPng, embedDiagramInSvg, extractJsonFromPdf, pdfEmbedProps } from '@/io/export/embed';
import { setPngDpi } from '@/io/export/raster';
import { renderSvg } from '@/io/export/svg';
import { exportHtml } from '@/io/export/html';
import { compressDrawio, DEFAULT_EXPORT_SETTINGS, exportFiles, pagesInScope, type ExportSource } from '@/io/export';
import { samplePages, sampleDoc, texts, tinyPng } from './fixtures';

const source = (n = 3): ExportSource => {
  const pages = samplePages(n);
  return { pages, activePageId: pages[0].id, selection: [], fileName: 'My diagram' };
};

describe('share URL', () => {
  it('round-trips every page', () => {
    const pages = samplePages(3);
    const url = encodeShareUrl(pages);
    expect(url.startsWith(`${SHARE_BASE_URL}#R`)).toBe(true);
    expect(url).toMatch(/^[^#]+#R[A-Za-z0-9_-]+$/); // base64url, no padding
    const back = decodeShareUrl(url);
    expect(back.map((p) => p.name)).toEqual(pages.map((p) => p.name));
    for (const [i, p] of back.entries()) {
      expect(p.doc.order).toEqual(pages[i].doc.order);
      expect(p.doc.elements).toEqual(pages[i].doc.elements);
    }
  });

  it('is produced by the pipeline (format "url")', async () => {
    const [file] = await exportFiles(source(2), { ...DEFAULT_EXPORT_SETTINGS, format: 'url', scope: 'all' });
    expect(decodeShareUrl(file.data as string)).toHaveLength(2);
  });
});

describe('HTML export', () => {
  it('contains every page and is self-contained', async () => {
    const src = source(3);
    src.pages[1].doc.layers = [
      { id: 'l1', name: 'Base', visible: true, locked: false },
      { id: 'l2', name: 'Annotations', visible: false, locked: false },
    ];
    const first = src.pages[1].doc.order[0];
    src.pages[1].doc.elements[first] = { ...src.pages[1].doc.elements[first], layerId: 'l2', tooltip: 'Hover me', link: 'page:page-3' };
    const [file] = await exportFiles(src, { ...DEFAULT_EXPORT_SETTINGS, format: 'html', scope: 'all' });
    const html = file.data as string;
    expect(file.name).toBe('My diagram.html');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    // Every page: a section with an inline SVG and its name in the page metadata.
    expect(html.match(/<section class="page"/g)).toHaveLength(3);
    expect(html.match(/<svg /g)!.length).toBeGreaterThanOrEqual(3);
    for (const p of src.pages) expect(html).toContain(JSON.stringify(p.name).slice(1, -1));
    for (const p of src.pages) expect(html).toContain(texts(p.doc)[0]);
    // Self-contained: no network references of any kind.
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<link\b|<script[^>]+src=|@import|url\((?!["']?(data:|#))/i);
    // Fonts embedded, viewer present, layers/tooltips/links wired.
    expect(html).toMatch(/@font-face\{font-family:"Inter Variable"[^}]*url\(data:font\/woff2;base64,/);
    expect(html).toContain('data-layer="l2"');
    expect(html).toContain('data-layer-name="Annotations"');
    expect(html).toContain('data-link="page:page-3"');
    expect(html).toContain('<title>Hover me</title>');
    // Ids are unique across pages.
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders the auto appearance with a prefers-color-scheme rule', async () => {
    const html = await exportHtml([{ page: samplePages(1)[0], svg: { background: '#ffffff' } }], { title: 'T', appearance: 'auto' });
    expect(html).toContain('@media (prefers-color-scheme: dark){.od-art{filter:invert(');
  });
});

describe('editable exports (embed / extract)', () => {
  it('PNG: embedded document survives DPI tagging and re-imports', async () => {
    const pages = samplePages(1);
    const json = serializePages(pages);
    const png = setPngDpi(embedDiagramInPng(tinyPng(), json), 192);
    const chunks = readPngChunks(png).map((c) => c.type);
    expect(chunks).toEqual(['IHDR', 'pHYs', 'iTXt', 'IDAT', 'IEND']);
    expect(readPngText(png).find((t) => t.keyword === 'arkdraw')?.text).toBe(json);
    const res = await importEmbedded(png, 'x.png');
    expect(texts(res.pages[0].doc)).toEqual(texts(pages[0].doc));
    expect(res.pages[0].doc.elements).toEqual(pages[0].doc.elements);
  });

  it('SVG: pipeline output carries the document and re-imports', async () => {
    const src = source(2);
    const [file] = await exportFiles(src, { ...DEFAULT_EXPORT_SETTINGS, format: 'svg', embedDiagram: true, embedFonts: false });
    const svg = file.data as string;
    expect(svg).toMatch(/<svg [^>]*data-arkdraw="[A-Za-z0-9+/=]+"/);
    const res = await importEmbedded(svg, 'x.svg');
    expect(res.pages[0].doc.elements).toEqual(src.pages[0].doc.elements);
  });

  it('SVG: embedDiagramInSvg on a rendered page round-trips', async () => {
    const doc = sampleDoc('Round trip');
    const { svg } = renderSvg(doc, { background: null, embedFont: false });
    const json = serializePages([{ id: 'p', name: 'P', doc, settings: { background: null, paper: 'A4', landscape: false, pageView: false } }]);
    const res = await importEmbedded(embedDiagramInSvg(svg, json), 'x.svg');
    expect(texts(res.pages[0].doc)).toEqual(texts(doc));
  });

  it('PDF: info-dictionary payload is recoverable', () => {
    const json = serializePages(samplePages(1));
    const props = pdfEmbedProps(json, '<mxfile><diagram name="A"></diagram></mxfile>');
    expect(props.subject).toBe(encodeURIComponent('<mxfile><diagram name="A"></diagram></mxfile>'));
    const fake = new TextEncoder().encode(`%PDF-1.3\n1 0 obj\n<< /Keywords (${props.keywords}) >>\nendobj\n`);
    expect(extractJsonFromPdf(fake)).toBe(json);
  });
});

describe('pipeline', () => {
  it('scopes pages: current, all, range, selection', () => {
    const src = source(3);
    expect(pagesInScope(src, { scope: 'current', rangeFrom: 1, rangeTo: 1 }).map((p) => p.id)).toEqual(['page-1']);
    expect(pagesInScope(src, { scope: 'all', rangeFrom: 1, rangeTo: 1 })).toHaveLength(3);
    expect(pagesInScope(src, { scope: 'range', rangeFrom: 3, rangeTo: 2 }).map((p) => p.id)).toEqual(['page-2', 'page-3']);
    const [a, b] = src.pages[0].doc.order;
    const sel = pagesInScope({ ...src, selection: [a, b] }, { scope: 'selection', rangeFrom: 1, rangeTo: 1 });
    // Both shapes plus the connector between them.
    expect(sel[0].doc.order).toHaveLength(3);
  });

  it('exports all pages to mxGraph, optionally compressed', async () => {
    const src = source(2);
    const [plain] = await exportFiles(src, { ...DEFAULT_EXPORT_SETTINGS, format: 'drawio', scope: 'all' });
    expect((plain.data as string).match(/<diagram /g)).toHaveLength(2);
    const compressed = compressDrawio(plain.data as string);
    expect(compressed).not.toContain('<mxGraphModel');
    const pages = await importDrawioPages(compressed);
    expect(pages).toHaveLength(2);
    expect(Object.values(pages[1].doc.elements).map((e) => e.text)).toContain('Box on page 2');
  });

  it('exports every page to VSDX', async () => {
    const [file] = await exportFiles(source(3), { ...DEFAULT_EXPORT_SETTINGS, format: 'vsdx', scope: 'all' });
    expect(file.name).toBe('My diagram.vsdx');
    expect((file.data as Uint8Array)[0]).toBe(0x50); // PK
  });
});
