/**
 * Embed mode (`?embed=1`): the editor runs inside an <iframe> and is driven
 * by the parent page over postMessage, in the spirit of mxGraph's embed API.
 *
 * Parent → editor (actions)
 *   { action: 'load', json? | xml?, title?, autosave? }   open a diagram (empty = blank)
 *   { action: 'export', format: 'svg'|'png'|'json'|'drawio', page?, scale?, background? }
 *   { action: 'status', modified: false }                  host saved it; clear the dirty flag
 *   { action: 'exit' }                                     ask the editor to close
 *
 * Editor → parent (events)
 *   { event: 'init' }                       ready for `load`
 *   { event: 'load', pages, title }         diagram loaded
 *   { event: 'save', json, title, exit }    Ctrl/⌘+S or the Save button
 *   { event: 'autosave', json, title }      debounced changes (with ?autosave=1)
 *   { event: 'export', format, data, mime } data URI for svg/png, text for json/drawio
 *   { event: 'exit', modified }             Exit button or `exit` action
 *   { event: 'error', action, message }
 *
 * Any request may carry an `id`; replies echo it. Messages may be objects or
 * JSON strings (mxGraph style); once the parent sends a string — or with
 * `?proto=json` — replies are JSON strings too.
 *
 * Security: only messages whose `source` is `window.parent` are accepted.
 * With `?origin=https://host` only that origin is accepted and targeted;
 * otherwise the first origin to talk to us is pinned for the session.
 */
import type { Page } from '@/model/types';
import { isDirtyState, newPage, useEditor } from '@/store/editor';
import { serializePages } from '@/io/fileFormat';
import { exportDrawioPages } from '@/io/drawio';
import { renderSvgStandalone } from '@/io/export/svg';
import { exportPng } from '@/io/export/raster';
import { pagesFromContent } from './loadDiagram';
import { parseLaunchParams, resolvePageParam, type LaunchParams } from './launch';
import { setSaveTarget } from '@/app/saveTarget';

export type EmbedAction =
  | { action: 'load'; json?: unknown; xml?: string; title?: string; autosave?: boolean | number; id?: unknown }
  | { action: 'export'; format?: string; page?: string | number; scale?: number; background?: string | null; id?: unknown }
  | { action: 'status'; modified?: boolean; id?: unknown }
  | { action: 'exit'; id?: unknown };

export interface EmbedEvent {
  event: 'init' | 'load' | 'save' | 'autosave' | 'export' | 'exit' | 'error';
  [key: string]: unknown;
}

export interface EmbedHost {
  /** Where messages arrive and keys are pressed. */
  self: Window;
  /** Who we talk to. */
  parent: { postMessage: (message: unknown, targetOrigin: string) => void };
}

export interface EmbedOptions extends Partial<Pick<LaunchParams, 'autosave' | 'parentOrigin' | 'jsonProtocol' | 'saveButton' | 'exitButton'>> {
  host?: EmbedHost;
  /** Mount the floating Save / Exit buttons (default true). */
  ui?: boolean;
  /** Autosave debounce in ms (default 1000). */
  autosaveDelay?: number;
}

let active = false;

/** True while the editor is running embedded in another page. */
export const isEmbedded = () => active;

function inferParentOrigin(self: Window): string | null {
  try {
    const ancestors = self.location.ancestorOrigins;
    if (ancestors?.length) return ancestors[0];
  } catch {
    /* not supported */
  }
  try {
    if (self.document.referrer) return new URL(self.document.referrer).origin;
  } catch {
    /* no referrer */
  }
  return null;
}

const toBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

const fileTitle = () => useEditor.getState().file.name.replace(/\.arkdraw$/i, '');

function samePages(a: Page[], b: Page[]): boolean {
  return a.length === b.length && a.every((p, i) => p.id === b[i].id && p.doc === b[i].doc && p.name === b[i].name && p.settings === b[i].settings);
}

/** Exports the current diagram in one of the embed formats. */
export async function exportForEmbed(req: Extract<EmbedAction, { action: 'export' }>): Promise<Record<string, unknown>> {
  const format = String(req.format ?? 'json').toLowerCase();
  const s = useEditor.getState();
  const pages = s.allPages();
  const page = (req.page !== undefined && resolvePageParam(pages, String(req.page))) || pages.find((p) => p.id === s.activePageId) || pages[0];
  switch (format) {
    case 'json':
    case 'arkdraw':
      return { format: 'json', mime: 'application/json', data: serializePages(pages) };
    case 'drawio':
    case 'xml': {
      return { format: 'drawio', mime: 'application/vnd.jgraph.mxfile', data: await exportDrawioPages(pages.map((p) => ({ name: p.name, doc: p.doc }))) };
    }
    case 'svg': {
      const background = req.background !== undefined ? req.background : page.settings.background;
      const r = await renderSvgStandalone(page.doc, { background });
      const data = `data:image/svg+xml;base64,${toBase64(new TextEncoder().encode(r.svg))}`;
      return { format: 'svg', mime: 'image/svg+xml', data, width: r.width, height: r.height, page: page.id };
    }
    case 'png': {
      const background = req.background !== undefined ? req.background : (page.settings.background ?? '#ffffff');
      const scale = Math.min(8, Math.max(0.1, Number(req.scale) || 2));
      const bytes = await exportPng(page.doc, { background, scale });
      return { format: 'png', mime: 'image/png', data: `data:image/png;base64,${toBase64(bytes)}`, page: page.id };
    }
    default:
      throw new Error(`Unsupported export format "${format}". Use svg, png, json or drawio.`);
  }
}

/**
 * Starts embed mode. Call once at startup (main.tsx does, for `?embed=1`).
 * Returns a cleanup function (used by tests).
 */
export function initEmbedMode(opts: EmbedOptions = {}): () => void {
  const params = typeof location !== 'undefined' ? parseLaunchParams(location.href) : null;
  const o = {
    autosave: opts.autosave ?? params?.autosave ?? false,
    parentOrigin: opts.parentOrigin ?? params?.parentOrigin ?? null,
    jsonProtocol: opts.jsonProtocol ?? params?.jsonProtocol ?? false,
    saveButton: opts.saveButton ?? params?.saveButton ?? true,
    exitButton: opts.exitButton ?? params?.exitButton ?? true,
  };
  const host: EmbedHost = opts.host ?? { self: window, parent: window.parent };
  if (!opts.host && window.parent === window) {
    console.warn('[ArkDraw] embed=1 but the editor is not inside an iframe; embed messages are disabled.');
  }

  active = true;
  let autosave = o.autosave;
  let jsonProto = o.jsonProtocol;
  /** Origin pinned on first contact when none was configured. */
  let pinnedOrigin: string | null = o.parentOrigin;
  const inferredOrigin = o.parentOrigin ?? inferParentOrigin(host.self);
  let lastPosted: Page[] = useEditor.getState().allPages();
  const cleanups: Array<() => void> = [];

  const post = (msg: EmbedEvent, replyTo?: unknown) => {
    const body = replyTo !== undefined ? { ...msg, id: replyTo } : msg;
    host.parent.postMessage(jsonProto ? JSON.stringify(body) : body, pinnedOrigin ?? inferredOrigin ?? '*');
  };

  const emitSave = (exit = false) => {
    const s = useEditor.getState();
    const pages = s.allPages();
    post({ event: 'save', json: serializePages(pages), title: fileTitle(), modified: isDirtyState(s), exit });
    lastPosted = pages;
    // The host owns persistence; treat the hand-off as a save.
    s.markSaved(null, s.file.name);
  };

  const emitExit = () => post({ event: 'exit', modified: isDirtyState(useEditor.getState()) });
  // File → Save / Save as… (menus, palette) go to the host too.
  const clearSaveTarget = setSaveTarget(() => emitSave(false));

  async function handle(msg: EmbedAction) {
    const id = msg.id;
    try {
      switch (msg.action) {
        case 'load': {
          const content = msg.json !== undefined ? (typeof msg.json === 'string' ? msg.json : JSON.stringify(msg.json)) : (msg.xml ?? '');
          const pages = content.trim() ? await pagesFromContent(content) : [newPage('Page 1')];
          const title = typeof msg.title === 'string' && msg.title.trim() ? msg.title.trim() : 'Untitled';
          useEditor.getState().loadPages(pages, { path: null, name: title });
          if (msg.autosave !== undefined) autosave = !!msg.autosave;
          lastPosted = useEditor.getState().allPages();
          requestAnimationFrame(() => useEditor.getState().zoomToFit());
          post({ event: 'load', pages: pages.length, title }, id);
          return;
        }
        case 'export':
          post({ event: 'export', ...(await exportForEmbed(msg)), title: fileTitle() }, id);
          return;
        case 'status':
          if (msg.modified === false) {
            const s = useEditor.getState();
            s.markSaved(null, s.file.name);
          }
          return;
        case 'exit':
          emitExit();
          return;
        default:
          post({ event: 'error', action: (msg as { action: string }).action, message: `Unknown action "${(msg as { action: string }).action}".` }, id);
      }
    } catch (e) {
      post({ event: 'error', action: msg.action, message: (e as Error)?.message ?? String(e) }, id);
    }
  }

  const onMessage = (e: MessageEvent) => {
    // Only our embedder may drive us.
    if (e.source !== (host.parent as unknown) || host.parent === (host.self as unknown)) return;
    if (pinnedOrigin && e.origin !== pinnedOrigin) return;
    let data = e.data as unknown;
    if (typeof data === 'string') {
      if (!data.trimStart().startsWith('{')) return;
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
      jsonProto = true;
    }
    if (!data || typeof data !== 'object' || typeof (data as { action?: unknown }).action !== 'string') return;
    if (!pinnedOrigin && e.origin && e.origin !== 'null') pinnedOrigin = e.origin;
    void handle(data as EmbedAction);
  };
  host.self.addEventListener('message', onMessage);
  cleanups.push(() => host.self.removeEventListener('message', onMessage));

  // Ctrl/⌘+S hands the diagram to the host instead of downloading a file.
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) emitSave(false);
    }
  };
  host.self.addEventListener('keydown', onKey, true);
  cleanups.push(() => host.self.removeEventListener('keydown', onKey, true));

  // Debounced autosave.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useEditor.subscribe((s, prev) => {
    if (s.doc === prev.doc && s.pages === prev.pages) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!autosave) return;
      const pages = useEditor.getState().allPages();
      if (samePages(pages, lastPosted)) return;
      lastPosted = pages;
      post({ event: 'autosave', json: serializePages(pages), title: fileTitle() });
    }, opts.autosaveDelay ?? 1000);
  });
  cleanups.push(() => {
    unsub();
    clearTimeout(timer);
  });

  if (opts.ui !== false && (o.saveButton || o.exitButton)) {
    void import('./EmbedBar').then(({ mountEmbedBar }) => {
      if (!active) return;
      cleanups.push(mountEmbedBar({ save: o.saveButton ? () => emitSave(false) : null, exit: o.exitButton ? emitExit : null }));
    });
  }

  // Announce readiness once the editor has painted.
  let cancelled = false;
  const announce = () => !cancelled && post({ event: 'init' });
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(announce));
  else setTimeout(announce, 0);

  return () => {
    cancelled = true;
    active = false;
    cleanups.splice(0).forEach((fn) => fn());
    clearSaveTarget();
  };
}
