/**
 * Turns shared content (inline `#R` data, a fetched URL, a postMessage
 * payload) into pages. Accepts OpenDraw JSON, draw.io XML, and PNG/SVG/PDF
 * exports that carry an embedded diagram.
 */
import type { Page } from '@/model/types';
import { parsePages } from '@/io/fileFormat';
import { importDrawioPages } from '@/io/drawio';
import { importEmbedded } from '@/io/import/embedded';
import { newPage } from '@/store/editor';
import { decodeShareHash } from './shareLink';
import type { DiagramSource } from './launch';

/** Largest diagram we'll download (bytes). */
export const MAX_FETCH_BYTES = 30 * 1024 * 1024;

export interface LoadedDiagram {
  pages: Page[];
  name: string;
}

const isPng = (b: Uint8Array) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isPdf = (b: Uint8Array) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;

async function fromEmbedded(content: string | Uint8Array, name?: string): Promise<Page[]> {
  const res = await importEmbedded(content, name);
  return res.pages.map((p) => newPage(p.name, p.doc));
}

/** Parses diagram content of any supported kind. */
export async function pagesFromContent(content: string | Uint8Array, fileName?: string): Promise<Page[]> {
  if (typeof content !== 'string') {
    if (isPng(content) || isPdf(content)) return fromEmbedded(content, fileName);
    content = new TextDecoder().decode(content);
  }
  const text = content.replace(/^﻿/, '').trimStart();
  if (!text) throw new Error('The diagram is empty.');
  if (text.startsWith('{')) return parsePages(text);
  if (text.startsWith('<')) {
    // draw.io SVG exports carry the diagram in a `content` attribute.
    if (/<svg[\s>]/i.test(text.slice(0, 4096)) && !/<mxfile|<mxGraphModel/i.test(text.slice(0, 512))) return fromEmbedded(text, fileName ?? 'diagram.svg');
    const pages = await importDrawioPages(text);
    if (!pages.length) throw new Error('No diagram pages were found.');
    return pages.map((p) => newPage(p.name, p.doc));
  }
  throw new Error('Unrecognized diagram format.');
}

/** "https://x/y/Network%20Map.drawio" → "Network Map". */
export function nameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    const name = decodeURIComponent(last).replace(/(\.drawio)?\.(opendraw|drawio|xml|json|png|svg|pdf)$/i, '');
    return name || 'Shared diagram';
  } catch {
    return 'Shared diagram';
  }
}

/** Downloads a diagram (CORS permitting) with a size cap. */
export async function fetchDiagram(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(url, { signal, credentials: 'omit', redirect: 'follow', mode: 'cors' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error('Could not download the diagram. The server may not allow cross-origin requests (CORS).');
  }
  if (!res.ok) throw new Error(`Could not download the diagram (HTTP ${res.status}).`);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_FETCH_BYTES) throw new Error('The diagram is too large to open.');
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_FETCH_BYTES) {
      reader.cancel().catch(() => {});
      throw new Error('The diagram is too large to open.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Loads the diagram a launch URL points at. */
export async function resolveSource(source: DiagramSource, title?: string | null, signal?: AbortSignal): Promise<LoadedDiagram> {
  if (source.kind === 'inline') {
    const pages = await pagesFromContent(decodeShareHash(source.hash));
    return { pages, name: title || 'Shared diagram' };
  }
  const bytes = await fetchDiagram(source.url, signal);
  const name = nameFromUrl(source.url);
  const pages = await pagesFromContent(bytes, new URL(source.url).pathname.split('/').pop() || undefined);
  return { pages, name: title || name };
}
