/**
 * Share URLs: the whole `.opendraw` document, deflate-raw compressed and
 * base64url encoded into the fragment of a link (`https://opendraw.app/#R…`).
 * Uses the same codec as the web app's link loader (src/web/shareLink.ts).
 */
import type { Page } from '@/model/types';
import { parsePages, serializePages } from '@/io/fileFormat';
import { decodeShareHash, encodeShareHash } from '@/web/shareLink';
import { SHARE_BASE_URL, SHARE_URL_WARN_LENGTH } from './config';

/** Compact JSON (no pretty-printing, no timestamp) — every byte counts in a URL. */
export function compactJson(pages: Page[]): string {
  const file = JSON.parse(serializePages(pages)) as Record<string, unknown>;
  delete file.savedAt;
  return JSON.stringify(file);
}

export function encodeShareUrl(pages: Page[], base = SHARE_BASE_URL): string {
  return `${base.replace(/#.*$/, '')}${encodeShareHash(compactJson(pages))}`;
}

/** Inverse of `encodeShareUrl` (accepts a full URL or just the `#R…` fragment). */
export function decodeShareUrl(url: string): Page[] {
  return parsePages(decodeShareHash(url));
}

export const shareUrlTooLong = (url: string) => url.length > SHARE_URL_WARN_LENGTH;
