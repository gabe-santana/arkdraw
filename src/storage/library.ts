/**
 * Browser file library (web build): whole documents kept in IndexedDB, with
 * File → Save to browser / Open from browser. Each entry stores the
 * `.opendraw` JSON plus a small SVG thumbnail of its first page.
 */
import { create } from 'zustand';
import type { Page } from '@/model/types';
import { uid } from '@/lib/id';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { parseMeta, parsePages, serializePages } from '@/io/fileFormat';
import { renderSvg } from '@/io/export/svg';
import { commitSavedMeta, metaForSave } from '@/automation/fileProperties';
import { idbAll, idbDelete, idbGet, idbPut } from './idb';
import { docOrigin, offerOrigin, setOrigin } from './origin';
import { t } from '@/i18n';

export interface LibraryDoc {
  id: string;
  name: string;
  data: string;
  created: number;
  modified: number;
  size: number;
  pages: number;
  elements: number;
  /** SVG data URI of the first page (omitted when too large). */
  thumb?: string;
}

const MAX_THUMB = 160_000;

/** First non-empty page as a small SVG data URI. */
export function pageThumb(pages: Page[]): string | undefined {
  const page = pages.find((p) => p.doc.order.length);
  if (!page) return undefined;
  try {
    const { svg } = renderSvg(page.doc, { background: '#ffffff', padding: 24, embedFont: false });
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return uri.length <= MAX_THUMB ? uri : undefined;
  } catch {
    return undefined;
  }
}

interface LibraryState {
  docs: LibraryDoc[];
  loaded: boolean;
  refresh: () => Promise<void>;
}

export const useBrowserLibrary = create<LibraryState>((set) => ({
  docs: [],
  loaded: false,
  refresh: async () => {
    try {
      const docs = await idbAll<LibraryDoc>('documents');
      set({ docs: docs.sort((a, b) => b.modified - a.modified), loaded: true });
    } catch {
      set({ docs: [], loaded: true });
    }
  },
}));

const refresh = () => useBrowserLibrary.getState().refresh();
const stripExt = (n: string) => n.replace(/\.opendraw$/i, '');

/** Builds a library entry from serialized data. */
export function makeEntry(name: string, data: string, id = uid(), created = Date.now()): LibraryDoc {
  let pages: Page[] = [];
  try {
    pages = parsePages(data);
  } catch {
    /* keep empty */
  }
  return {
    id,
    name: stripExt(name) || 'Untitled',
    data,
    created,
    modified: Date.now(),
    size: data.length,
    pages: pages.length,
    elements: pages.reduce((n, p) => n + p.doc.order.length, 0),
    thumb: pageThumb(pages),
  };
}

/**
 * Saves the open document into the library: back into its own entry when it
 * was opened from (or saved to) the library, else as a new entry named `name`.
 */
export async function saveCurrentToLibrary(opts: { name?: string; asNew?: boolean } = {}): Promise<LibraryDoc | null> {
  const s = useEditor.getState();
  const origin = docOrigin();
  const existing = !opts.asNew && origin?.kind === 'library' ? await idbGet<LibraryDoc>('documents', origin.id).catch(() => undefined) : undefined;
  const meta = metaForSave();
  const name = opts.name ?? existing?.name ?? stripExt(s.file.name);
  const entry = makeEntry(name, serializePages(s.allPages(), meta), existing?.id, existing?.created);
  try {
    await idbPut('documents', entry);
  } catch (e) {
    useUi.getState().toast(t('storage.saveFailed', { error: (e as Error)?.message ?? String(e) }), 'error');
    return null;
  }
  commitSavedMeta(meta);
  useEditor.getState().markSaved(null, entry.name);
  setOrigin({ kind: 'library', id: entry.id });
  void refresh();
  void import('./recent').then((r) => r.noteCurrentDocument());
  return entry;
}

/** Loads a library entry into the editor (the caller has already confirmed discarding changes). */
export async function openLibraryDoc(id: string): Promise<boolean> {
  const entry = await idbGet<LibraryDoc>('documents', id).catch(() => undefined);
  if (!entry) {
    useUi.getState().toast(t('storage.docGone'), 'error');
    return false;
  }
  offerOrigin({ kind: 'library', id });
  useEditor.getState().loadPages(parsePages(entry.data), { path: null, name: entry.name, meta: parseMeta(entry.data) });
  requestAnimationFrame(() => useEditor.getState().zoomToFit());
  void import('./recent').then((r) => r.noteCurrentDocument());
  return true;
}

export async function renameLibraryDoc(id: string, name: string) {
  const entry = await idbGet<LibraryDoc>('documents', id);
  if (!entry || !name.trim()) return;
  await idbPut('documents', { ...entry, name: stripExt(name.trim()) });
  const o = docOrigin();
  if (o?.kind === 'library' && o.id === id) {
    const f = useEditor.getState().file;
    useEditor.setState({ file: { ...f, name: stripExt(name.trim()) } });
  }
  await refresh();
}

export async function duplicateLibraryDoc(id: string) {
  const entry = await idbGet<LibraryDoc>('documents', id);
  if (!entry) return;
  await idbPut('documents', { ...entry, id: uid(), name: `${entry.name} copy`, created: Date.now(), modified: Date.now() });
  await refresh();
}

export async function deleteLibraryDoc(id: string) {
  await idbDelete('documents', id);
  const o = docOrigin();
  if (o?.kind === 'library' && o.id === id) setOrigin(null);
  await refresh();
}

/** Adds a file's contents (e.g. an uploaded .opendraw) to the library. */
export async function addToLibrary(name: string, data: string) {
  parsePages(data); // validates
  await idbPut('documents', makeEntry(name, data));
  await refresh();
}
