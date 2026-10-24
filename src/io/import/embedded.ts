/**
 * Editable images: opens PNG / SVG / PDF files that carry a diagram.
 *
 * mxGraph embeddings (delegated to `importDrawio`):
 *  - PNG: `tEXt` / `zTXt` / `iTXt` chunk with keyword `mxfile`; the text is the
 *    mxfile XML, usually URI-encoded.
 *  - SVG: `content` attribute on the root `<svg>` holding the mxfile XML (plain,
 *    base64, or base64 of raw-deflated URI-encoded XML).
 *  - PDF (best effort): mxfile XML found as a (possibly URI-encoded) PDF string
 *    such as `/Subject (...)`, or inside a FlateDecode stream.
 *  Every `<diagram>` of the mxfile becomes its own page.
 *
 * ArkDraw's own convention (written by `embedDiagramInPng` /
 * `embedDiagramInSvg` in ./_shared.ts; the payload is exactly the
 * `.opendraw` JSON produced by `serializeDoc`):
 *  - PNG: an `iTXt` chunk with keyword `opendraw`, empty language tag and
 *    translated keyword, compression flag 1 (zlib) or 0 (plain UTF-8),
 *    placed right after `IHDR`.
 *  - SVG: attribute `data-opendraw` on the root `<svg>` element whose value is
 *    the base64 encoding of the UTF-8 JSON.
 *  If both an ArkDraw and a mxGraph payload are present, ArkDraw wins.
 */
import { inflateSync, unzlibSync } from 'fflate';
import { importDrawio } from '@/io/drawio';
import { parseDoc } from '@/io/fileFormat';
import type { ImportResult, ImportedPage, Importer } from './types';
import {
  OPENDRAW_PNG_KEYWORD, OPENDRAW_SVG_ATTRIBUTE, base64Decode, decodeEntities, isPng, latin1Decode, parseXml, readPngText, toBytes, utf8Decode,
} from './_shared';

type Payload = { kind: 'opendraw'; json: string } | { kind: 'drawio'; xml: string };

const looksXml = (s: string) => /^\s*</.test(s);

/** Decodes the many ways mxGraph stores mxfile text. */
function decodeMx(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (/^%3C/i.test(s)) {
    try {
      s = decodeURIComponent(s);
    } catch {
      /* keep */
    }
  }
  if (looksXml(s)) return s;
  try {
    const bytes = base64Decode(s);
    const text = utf8Decode(bytes);
    if (looksXml(text)) return text;
    const inflated = latin1Decode(inflateSync(bytes));
    const decoded = /^%3C/i.test(inflated) ? decodeURIComponent(inflated) : inflated;
    if (looksXml(decoded)) return decoded;
  } catch {
    /* not base64 / deflate */
  }
  return null;
}

function fromPng(bytes: Uint8Array): Payload | null {
  const texts = readPngText(bytes);
  const own = texts.find((t) => t.keyword === OPENDRAW_PNG_KEYWORD);
  if (own) return { kind: 'opendraw', json: own.text };
  const mx = texts.find((t) => t.keyword === 'mxfile' || t.keyword === 'mxGraphModel');
  const xml = mx ? decodeMx(mx.text) : null;
  return xml ? { kind: 'drawio', xml } : null;
}

function svgRootAttr(svg: string, name: string): string | null {
  try {
    const root = parseXml(svg).documentElement;
    if (root && /svg$/i.test(root.tagName)) return root.getAttribute(name);
  } catch {
    /* fall back to a regex on the root tag */
  }
  const tag = /<svg\b[^>]*>/i.exec(svg)?.[0];
  const m = tag && new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? decodeEntities(m[2] ?? m[3] ?? '') : null;
}

function fromSvg(svg: string): Payload | null {
  const own = svgRootAttr(svg, OPENDRAW_SVG_ATTRIBUTE);
  if (own) return { kind: 'opendraw', json: utf8Decode(base64Decode(own)) };
  const content = svgRootAttr(svg, 'content');
  const xml = content ? decodeMx(content) : null;
  return xml ? { kind: 'drawio', xml } : null;
}

/** Unescapes a PDF literal string body. */
const pdfUnescape = (s: string) =>
  s.replace(/\\(\r?\n|[nrtbf()\\]|[0-7]{1,3})/g, (_, e: string) => {
    if (/^\r?\n$/.test(e)) return '';
    if (/^[0-7]+$/.test(e)) return String.fromCharCode(parseInt(e, 8));
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[e] ?? e;
  });

function findMxfile(text: string): string | null {
  const enc = /%3Cmxfile[\s\S]*?%3C%2Fmxfile%3E/i.exec(text);
  if (enc) {
    try {
      return decodeURIComponent(pdfUnescape(enc[0]));
    } catch {
      /* fall through */
    }
  }
  const plain = /<mxfile[\s\S]*?<\/mxfile>/.exec(text);
  return plain ? pdfUnescape(plain[0]) : null;
}

function fromPdf(bytes: Uint8Array): Payload | null {
  const text = latin1Decode(bytes);
  const direct = findMxfile(text);
  if (direct) return { kind: 'drawio', xml: direct };
  const re = /\/FlateDecode[\s\S]{0,400}?>>\s*stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) break;
    try {
      const inner = latin1Decode(unzlibSync(bytes.subarray(start, end)));
      const found = findMxfile(inner) ?? findMxfile(utf8Decode(unzlibSync(bytes.subarray(start, end))));
      if (found) return { kind: 'drawio', xml: found };
    } catch {
      /* not a zlib stream we can read */
    }
  }
  return null;
}

function extract(content: string | Uint8Array, fileName?: string): Payload | null {
  const bytes = toBytes(content);
  if (isPng(bytes)) return fromPng(bytes);
  if (latin1Decode(bytes.subarray(0, 5)) === '%PDF-') return fromPdf(bytes);
  const text = typeof content === 'string' ? content : utf8Decode(bytes);
  if (/<svg\b/i.test(text) || /\.svg$/i.test(fileName ?? '')) return fromSvg(text);
  return null;
}

/** Splits a (multi-page) mxfile into one importDrawio call per diagram. */
async function drawioPages(xml: string): Promise<ImportedPage[]> {
  let diagrams: Element[] = [];
  try {
    diagrams = Array.from(parseXml(xml).getElementsByTagName('diagram'));
  } catch {
    /* let importDrawio report the error */
  }
  if (diagrams.length <= 1) {
    return [{ name: diagrams[0]?.getAttribute('name') || 'Page-1', doc: await importDrawio(xml) }];
  }
  const serializer = new XMLSerializer();
  const pages: ImportedPage[] = [];
  for (const [i, d] of diagrams.entries()) {
    const one = `<mxfile>${serializer.serializeToString(d)}</mxfile>`;
    pages.push({ name: d.getAttribute('name') || `Page-${i + 1}`, doc: await importDrawio(one) });
  }
  return pages;
}

export async function importEmbedded(content: string | Uint8Array, fileName?: string): Promise<ImportResult> {
  const payload = extract(content, fileName);
  // Plain SVG (no embedded diagram): open its vector content as editable shapes.
  if (!payload && /\.svg$/i.test(fileName ?? '')) {
    const { convertSvg } = await import('./svgShapes');
    const r = convertSvg(typeof content === 'string' ? content : utf8Decode(toBytes(content)));
    if (r.elements.length) {
      const doc = { elements: Object.fromEntries(r.elements.map((e) => [e.id, e])), order: r.elements.map((e) => e.id) };
      return { pages: [{ name: (fileName ?? 'SVG').replace(/^.*[\\/]/, '').replace(/\.svg$/i, ''), doc }], warnings: r.warnings };
    }
  }
  if (!payload) throw new Error('This image does not contain an editable diagram (no diagram data found).');
  if (payload.kind === 'opendraw') {
    const name = (fileName ?? 'Diagram').replace(/^.*[\\/]/, '').replace(/(\.drawio)?\.(png|svg|pdf)$/i, '') || 'Diagram';
    return { pages: [{ name, doc: parseDoc(payload.json) }] };
  }
  return { pages: await drawioPages(payload.xml) };
}

export const importer: Importer = {
  id: 'embedded',
  label: 'Editable image (PNG / SVG / PDF)…',
  description: 'Opens PNG, SVG and PDF exports that carry an embedded diagram.',
  extensions: ['png', 'svg', 'pdf'],
  acceptsText: false,
  detect: (content, fileName) => {
    try {
      return extract(content, fileName) !== null;
    } catch {
      return false;
    }
  },
  run: importEmbedded,
};
