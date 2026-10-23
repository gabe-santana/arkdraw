/**
 * draw.io's `shape=stencil(…)` payload: base64( deflateRaw( encodeURIComponent(xml) ) ),
 * the same encoding as `Graph.compress` / `Graph.decompress`.
 */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Compresses stencil XML the way draw.io stores it in styles. */
export function compressStencil(xml: string): string {
  return toBase64(deflateSync(strToU8(encodeURIComponent(xml))));
}

/** Inverse of `compressStencil`. Also accepts plain (uncompressed) XML. */
export function decompressStencil(data: string): string {
  const trimmed = data.trim();
  if (trimmed.startsWith('<')) return trimmed;
  const text = strFromU8(inflateSync(fromBase64(trimmed)));
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** `stencil(…)` style value for a draw.io `shape=` key. */
export const stencilStyleValue = (xml: string) => `stencil(${compressStencil(xml)})`;

/** Extracts the XML from a draw.io `shape` value such as `stencil(…)`; null for other shapes. */
export function stencilFromStyleValue(shape: string | undefined): string | null {
  if (!shape || !shape.startsWith('stencil(') || !shape.endsWith(')')) return null;
  try {
    return decompressStencil(shape.slice(8, -1));
  } catch {
    return null;
  }
}
