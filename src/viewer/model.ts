/**
 * Pure helpers for the read-only viewer.
 */
import type { Doc, Page } from '@/model/types';
import { isHidden, layersOf, renderOrder } from '@/store/editor';
import { serializePages } from '@/io/fileFormat';
import { encodeShareHash } from '@/web/shareLink';
import type { LaunchParams } from '@/web/launch';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;
export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** The doc with the viewer's layer toggles applied (layer ids in `hidden` are hidden, others shown as authored). */
export function withLayerOverrides(doc: Doc, overrides: Record<string, boolean>): Doc {
  if (!doc.layers || !Object.keys(overrides).length) return doc;
  return { ...doc, layers: doc.layers.map((l) => (l.id in overrides ? { ...l, visible: overrides[l.id] } : l)) };
}

/** Visible element ids in paint order. */
export const visibleOrder = (doc: Doc): string[] => renderOrder(doc).filter((id) => !isHidden(doc, doc.elements[id]));

/** Layers worth offering toggles for (only when there's more than one). */
export const toggleableLayers = (doc: Doc) => (doc.layers && doc.layers.length > 1 ? layersOf(doc) : []);

export type LinkTarget = { kind: 'page'; pageId: string } | { kind: 'external'; url: string } | { kind: 'invalid' };

/** `page:<id>` jumps to a page; http(s)/mailto/tel open in a new tab; anything else is refused. */
export function classifyLink(link: string, pages: Pick<Page, 'id'>[]): LinkTarget {
  const l = link.trim();
  if (l.startsWith('page:')) {
    const id = l.slice(5);
    return pages.some((p) => p.id === id) ? { kind: 'page', pageId: id } : { kind: 'invalid' };
  }
  const url = /^[a-z][a-z0-9+.-]*:/i.test(l) ? l : `https://${l}`;
  return /^(https?|mailto|tel):/i.test(url) ? { kind: 'external', url } : { kind: 'invalid' };
}

/** Camera that fits `b` into a `vw`×`vh` viewport with insets, never zooming past `maxZoom`. */
export function fitCamera(
  b: { x: number; y: number; w: number; h: number },
  vw: number,
  vh: number,
  insets = { top: 24, right: 24, bottom: 24, left: 24 },
  maxZoom = 1,
): Camera {
  const aw = Math.max(40, vw - insets.left - insets.right);
  const ah = Math.max(40, vh - insets.top - insets.bottom);
  const z = clampZoom(Math.min(maxZoom, aw / Math.max(1, b.w), ah / Math.max(1, b.h)));
  return {
    z,
    x: insets.left + aw / 2 - (b.x + b.w / 2) * z,
    y: insets.top + ah / 2 - (b.y + b.h / 2) * z,
  };
}

/** URL that opens the same diagram in the editor. */
export function editorUrl(href: string, launch: Pick<LaunchParams, 'source'>, pages: Page[], pageIndex: number): string {
  const url = new URL(href);
  for (const p of ['viewer', 'lightbox', 'toolbar', 'embed']) url.searchParams.delete(p);
  if (pageIndex > 0) url.searchParams.set('page', String(pageIndex + 1));
  else url.searchParams.delete('page');
  if (launch.source?.kind === 'url') return url.toString();
  url.searchParams.delete('url');
  url.hash = encodeShareHash(serializePages(pages)).slice(1);
  return url.toString();
}
