/**
 * Embed snippets (Export → Embed): HTML for an interactive iframe that opens
 * the read-only viewer with the diagram in the URL fragment (nothing is
 * uploaded), an image tag with an SVG data URI, and Markdown variants.
 */
import type { Page } from '@/model/types';
import { SHARE_BASE_URL } from '@/io/export/config';
import { encodeShareUrl } from '@/io/export/share';

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export interface ViewerUrlOptions {
  base?: string;
  /** Hide the viewer toolbar (tiny embeds). */
  toolbar?: boolean;
  /** 1-based page to open first. */
  page?: number;
  theme?: 'light' | 'dark';
}

/** Read-only viewer URL with the diagram in the `#R…` fragment. */
export function viewerUrl(pages: Page[], opts: ViewerUrlOptions = {}): string {
  const q = new URLSearchParams({ viewer: '1' });
  if (opts.toolbar === false) q.set('toolbar', '0');
  if (opts.page && opts.page > 1) q.set('page', String(opts.page));
  if (opts.theme) q.set('theme', opts.theme);
  const base = (opts.base ?? SHARE_BASE_URL).replace(/[?#].*$/, '');
  return encodeShareUrl(pages, `${base}?${q.toString()}`);
}

export function iframeSnippet(url: string, opts: { width: string; height: string; title: string }): string {
  return `<iframe src="${attr(url)}" width="${attr(opts.width)}" height="${attr(opts.height)}" title="${attr(opts.title)}" style="border:1px solid #e4e4e7;border-radius:12px" loading="lazy" allowfullscreen></iframe>`;
}

export function imageSnippet(src: string, opts: { alt: string; link?: string; width?: number }): string {
  const img = `<img src="${attr(src)}" alt="${attr(opts.alt)}"${opts.width ? ` width="${opts.width}"` : ''} style="max-width:100%;height:auto">`;
  return opts.link ? `<a href="${attr(opts.link)}" target="_blank" rel="noopener">${img}</a>` : img;
}

export function markdownImage(src: string, opts: { alt: string; link?: string }): string {
  const img = `![${opts.alt.replace(/[[\]]/g, '')}](${src})`;
  return opts.link ? `[${img}](${opts.link})` : img;
}

export const markdownLink = (url: string, text: string) => `[${text.replace(/[[\]]/g, '')}](${url})`;

export const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
