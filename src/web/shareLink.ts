/**
 * Share links: a whole diagram compressed into the URL fragment.
 *
 *   https://host/#R<base64url(deflate-raw(utf8(json)))>
 *
 * The fragment never reaches the server, so shared diagrams stay private to
 * whoever has the link. Decoding is lenient so draw.io `#R` links (standard
 * base64, URI-encoded XML) open too.
 */
import { deflateSync, Inflate, strFromU8, strToU8 } from 'fflate';

export class ShareLinkError extends Error {}

/** Hard cap on the inflated payload (protects against zip bombs). */
const MAX_INFLATED_BYTES = 64 * 1024 * 1024;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(data: string): Uint8Array {
  let b64 = data.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Raw inflate that refuses to grow past MAX_INFLATED_BYTES (zip-bomb guard). */
function inflateCapped(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inf = new Inflate((chunk) => {
    total += chunk.length;
    if (total > MAX_INFLATED_BYTES) throw new ShareLinkError('This share link is too large.');
    chunks.push(chunk);
  });
  inf.push(bytes, true);
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Compresses a diagram (OpenDraw JSON or draw.io XML) into a `#R…` URL fragment (leading `#` included). */
export function encodeShareHash(json: string): string {
  return `#R${bytesToBase64Url(deflateSync(strToU8(json), { level: 9 }))}`;
}

/**
 * Decodes a `#R…` fragment back to the diagram text. Accepts the fragment with
 * or without `#`, or a full URL containing one.
 */
export function decodeShareHash(hash: string): string {
  let h = hash.trim();
  const at = h.indexOf('#');
  if (at >= 0) h = h.slice(at + 1);
  if (!h.startsWith('R') || h.length < 2) throw new ShareLinkError('This is not a share link.');
  let data = h.slice(1);
  if (/%[0-9a-f]{2}/i.test(data)) {
    try {
      data = decodeURIComponent(data);
    } catch {
      /* keep as-is */
    }
  }
  let text: string;
  try {
    text = strFromU8(inflateCapped(base64ToBytes(data)));
  } catch (e) {
    if (e instanceof ShareLinkError) throw e;
    throw new ShareLinkError('This share link is damaged or incomplete.');
  }
  // draw.io compresses encodeURIComponent(xml).
  if (/^%3C|^%7B/i.test(text)) {
    try {
      text = decodeURIComponent(text);
    } catch {
      /* not URI-encoded after all */
    }
  }
  return text;
}

export interface ShareUrlOptions {
  /** Open in the read-only viewer instead of the editor. */
  viewer?: boolean;
  /** Base URL of the deployed app (default: the current page without query/hash). */
  base?: string;
  /** Extra query parameters (e.g. `{ title: 'Network', page: '2' }`). */
  params?: Record<string, string>;
}

/** Full shareable URL for a diagram. */
export function buildShareUrl(json: string, opts: ShareUrlOptions = {}): string {
  const base = opts.base ?? `${location.origin}${location.pathname}`;
  const url = new URL(base);
  url.search = '';
  if (opts.viewer) url.searchParams.set('viewer', '1');
  for (const [k, v] of Object.entries(opts.params ?? {})) url.searchParams.set(k, v);
  return `${url.toString().replace(/#.*$/, '')}${encodeShareHash(json)}`;
}
