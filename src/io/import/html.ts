/**
 * Editable HTML: reopens diagrams from HTML pages that carry one.
 *
 *  - ArkDraw's HTML export: `<script type="application/vnd.opendraw+json"
 *    id="opendraw-diagram">` holding base64 `.opendraw` JSON (lossless).
 *  - mxGraph's "Export as HTML" / embed snippets: `<div class="mxgraph"
 *    data-mxgraph="{…&quot;xml&quot;:&quot;&lt;mxfile…&quot;}">` — the JSON's
 *    `xml` field is the mxfile (possibly compressed).
 *  - Any HTML with a literal or escaped `<mxfile>` / `<mxGraphModel>` in it.
 */
import { importDrawioPages } from '@/io/drawio';
import { parsePages } from '@/io/fileFormat';
import type { ImportResult, Importer } from './types';
import { base64Decode, decodeEntities, toText, utf8Decode } from './_shared';
import { extractDrawioXml } from '@/automation/clipboardXml';

const OPENDRAW_RE = /<script[^>]*id=["']opendraw-diagram["'][^>]*>([\s\S]*?)<\/script>/i;
const MXGRAPH_RE = /data-mxgraph=(["'])([\s\S]*?)\1/i;

/** The diagram payload inside an HTML page, if any. */
export function extractFromHtml(html: string): { kind: 'opendraw'; json: string } | { kind: 'drawio'; xml: string } | null {
  const od = OPENDRAW_RE.exec(html);
  if (od) {
    try {
      return { kind: 'opendraw', json: utf8Decode(base64Decode(od[1].trim())) };
    } catch {
      /* fall through */
    }
  }
  const mx = MXGRAPH_RE.exec(html);
  if (mx) {
    try {
      const cfg = JSON.parse(decodeEntities(mx[2])) as { xml?: string };
      if (cfg.xml) return { kind: 'drawio', xml: cfg.xml };
    } catch {
      /* fall through */
    }
  }
  const xml = extractDrawioXml(html);
  return xml ? { kind: 'drawio', xml } : null;
}

export async function importHtml(html: string): Promise<ImportResult> {
  const found = extractFromHtml(html);
  if (!found) throw new Error('This HTML page has no embedded diagram. Export it as HTML with the diagram embedded to keep it editable.');
  if (found.kind === 'opendraw') return { pages: parsePages(found.json).map((p) => ({ name: p.name, doc: p.doc })) };
  return { pages: await importDrawioPages(found.xml) };
}

export const importer: Importer = {
  id: 'html',
  label: 'Editable HTML…',
  description: 'HTML exports with an embedded diagram (the diagram is reopened).',
  extensions: ['html', 'htm'],
  acceptsText: false,
  detect: (content) => {
    const t = toText(content);
    return /<html|<!doctype html/i.test(t) && (OPENDRAW_RE.test(t) || MXGRAPH_RE.test(t));
  },
  run: async (content) => importHtml(toText(content)),
};
