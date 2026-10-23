/**
 * "Editable" exports: a copy of the diagram travels inside the image/PDF so it
 * can be reopened later (File → Import / drag-and-drop, see
 * src/io/import/embedded.ts which reads every convention written here).
 *
 *  - PNG: iTXt chunk, keyword `opendraw`, zlib-compressed `.opendraw` JSON.
 *  - SVG: `data-opendraw` attribute on the root `<svg>` = base64 of the JSON.
 *  - PDF: jsPDF has no file-attachment API, so the document info dictionary is
 *    used: `/Subject` = URI-encoded draw.io mxfile XML (what draw.io desktop
 *    writes, and what the embedded importer reads), `/Keywords` =
 *    `opendraw:<base64 JSON>` (lossless OpenDraw copy).
 */
import { base64Decode, base64Encode, embedDiagramInPng, embedDiagramInSvg, utf8Decode, utf8Encode } from '@/io/import/_shared';

export { embedDiagramInPng, embedDiagramInSvg };

export const PDF_KEYWORDS_PREFIX = 'opendraw:';

export interface PdfEmbedProps {
  subject?: string;
  keywords?: string;
}

/** Info-dictionary fields that carry the diagram inside a PDF. */
export function pdfEmbedProps(json: string, mxfile?: string): PdfEmbedProps {
  return {
    ...(mxfile ? { subject: encodeURIComponent(mxfile) } : {}),
    keywords: PDF_KEYWORDS_PREFIX + base64Encode(utf8Encode(json)),
  };
}

/** Reads the OpenDraw JSON back out of a PDF written with `pdfEmbedProps` (best effort, uncompressed info dict). */
export function extractJsonFromPdf(pdf: Uint8Array): string | null {
  let text = '';
  for (let i = 0; i < pdf.length; i += 0x8000) text += String.fromCharCode(...pdf.subarray(i, i + 0x8000));
  const m = /\/Keywords\s*\(opendraw:([A-Za-z0-9+/=\s\\]+)\)/.exec(text);
  if (!m) return null;
  try {
    return utf8Decode(base64Decode(m[1].replace(/\\(\r?\n)?/g, '')));
  } catch {
    return null;
  }
}
