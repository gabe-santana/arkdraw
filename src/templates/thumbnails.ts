/**
 * Live template thumbnails: the template's pages rendered with the real SVG
 * exporter into `<img>`-ready data URIs. Built lazily, memoized per
 * template/page, and generated one at a time off the critical path so a
 * scrolling gallery never stalls the UI.
 */
import type { Page } from '@/model/types';
import { exportSubset, inlineIcons, renderSvg } from '@/io/export/svg';
import type { Template } from './types';

export interface Thumb {
  src: string;
  width: number;
  height: number;
}

const pagesCache = new Map<string, Page[]>();
const thumbCache = new Map<string, Promise<Thumb | null>>();
const ready = new Map<string, Thumb | null>();

/** Pages used for previews (built once per session; never handed to the editor). */
export function previewPages(t: Template): Page[] {
  let pages = pagesCache.get(t.id);
  if (!pages) {
    pages = t.build();
    pagesCache.set(t.id, pages);
  }
  return pages;
}

// Serial queue: each render yields to the event loop first.
let chain: Promise<unknown> = Promise.resolve();
const idle = () =>
  new Promise<void>((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 120 });
    else setTimeout(resolve, 0);
  });

async function render(t: Template, pageIndex: number, embedFont: boolean): Promise<Thumb | null> {
  await idle();
  const page = previewPages(t)[pageIndex];
  if (!page || page.doc.order.length === 0) return null;
  const resolve = await inlineIcons(exportSubset(page.doc));
  const r = renderSvg(page.doc, { background: '#ffffff', padding: 32, embedFont }, resolve);
  return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}`, width: r.width, height: r.height };
}

const keyOf = (t: Template, pageIndex: number, large: boolean) => `${t.id}:${pageIndex}:${large ? 'L' : 'S'}`;

/** Synchronously available thumbnail, if it has been generated already. */
export function cachedThumb(t: Template, pageIndex = 0, large = false): Thumb | null | undefined {
  return ready.get(keyOf(t, pageIndex, large));
}

/**
 * Thumbnail for a template page. `large` embeds the Inter font (for the
 * preview pane); grid thumbnails rely on system fallbacks to stay small.
 */
export function thumbnail(t: Template, pageIndex = 0, large = false): Promise<Thumb | null> {
  const key = keyOf(t, pageIndex, large);
  let p = thumbCache.get(key);
  if (!p) {
    // The focused preview jumps the queue; grid thumbnails render one by one.
    if (large) p = render(t, pageIndex, true).catch(() => null);
    else {
      p = chain.then(() => render(t, pageIndex, false)).catch(() => null);
      chain = p;
    }
    p.then((v) => ready.set(key, v));
    thumbCache.set(key, p);
  }
  return p;
}
