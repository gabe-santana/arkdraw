/**
 * Clipboard interop with draw.io. Copying puts draw.io mxGraphModel XML on the
 * clipboard as `text/html` next to our tagged JSON (`text/plain`), so a copy
 * from OpenDraw pastes as cells in draw.io; pasting draw.io XML / mxfile
 * (plain, URL-encoded or HTML-escaped) imports its cells here.
 */
import type { DiagramElement, Doc, Vec } from '@/model/types';
import { exportDrawio, importDrawioPages } from '@/io/drawio';

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');

/** draw.io XML found in clipboard text or HTML, decoded, or null. */
export function extractDrawioXml(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (/%3C(mxGraphModel|mxfile)/i.test(s) && !/<(mxGraphModel|mxfile)/.test(s)) {
    const m = s.match(/%3C(mxGraphModel|mxfile)[\s\S]*?%3C%2F\1%3E/i);
    try {
      s = decodeURIComponent(m ? m[0] : s);
    } catch {
      return null;
    }
  }
  if (!/<(mxGraphModel|mxfile)/.test(s) && /&lt;(mxGraphModel|mxfile)/.test(s)) s = decodeEntities(s);
  const m = s.match(/<(mxfile|mxGraphModel)[\s>][\s\S]*?<\/\1>/);
  return m ? m[0] : null;
}

export const hasDrawioXml = (raw: string | null | undefined) => !!raw && /(<|&lt;|%3C)(mxGraphModel|mxfile)/i.test(raw);

/** Elements of the first page of draw.io XML (fresh ids are assigned when pasting). */
export async function elementsFromDrawioXml(xml: string): Promise<DiagramElement[]> {
  const pages = await importDrawioPages(xml);
  const doc = pages[0]?.doc;
  return doc ? doc.order.map((id) => doc.elements[id]).filter(Boolean) : [];
}

/** `<mxGraphModel>` XML for a set of elements (what draw.io expects on its clipboard). */
export async function drawioXmlFor(els: DiagramElement[]): Promise<string> {
  const ids = new Set(els.map((e) => e.id));
  // Connectors pointing outside the copy keep their position but lose the attachment.
  const clean = els.map((e) =>
    e.type === 'connector'
      ? {
          ...e,
          source: e.source.elementId && !ids.has(e.source.elementId) ? { x: e.source.x, y: e.source.y } : e.source,
          target: e.target.elementId && !ids.has(e.target.elementId) ? { x: e.target.x, y: e.target.y } : e.target,
        }
      : e.type === 'shape' && e.containerId && !ids.has(e.containerId)
        ? { ...e, containerId: undefined }
        : e,
  );
  const doc: Doc = { elements: Object.fromEntries(clean.map((e) => [e.id, e])), order: clean.map((e) => e.id) };
  const mxfile = await exportDrawio(doc);
  return mxfile.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/)?.[0] ?? mxfile;
}

/** Writes our JSON as text plus draw.io XML as HTML; falls back to text only. */
export async function writeClipboard(json: string, els: DiagramElement[]): Promise<void> {
  const Item = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (Item && navigator.clipboard?.write) {
    try {
      const html = drawioXmlFor(els).then((xml) => new Blob([xml], { type: 'text/html' }));
      await navigator.clipboard.write([new Item({ 'text/plain': new Blob([json], { type: 'text/plain' }), 'text/html': html })]);
      return;
    } catch {
      /* fall through */
    }
  }
  await navigator.clipboard?.writeText(json).catch(() => {});
}

/** Pastes draw.io XML if `text` holds some. Returns true when it did. */
export async function pasteDrawioXml(text: string, paste: (els: DiagramElement[], at?: Vec) => void, at?: Vec): Promise<boolean> {
  const xml = extractDrawioXml(text);
  if (!xml) return false;
  try {
    const els = await elementsFromDrawioXml(xml);
    if (!els.length) return false;
    paste(els, at);
    return true;
  } catch {
    return false;
  }
}
