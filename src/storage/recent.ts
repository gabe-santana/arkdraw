/**
 * Recent documents for the web build (the desktop app keeps its own list in
 * Rust). Entries remember a File System Access handle when the browser has
 * one, a browser-library id, or else a copy of the document as last opened.
 * Surfaced through `getRecentFiles` (src/io/native.ts) as `web-recent:<id>`
 * paths, so File → Open recent and the start screen work unchanged.
 */
import { uid } from '@/lib/id';
import { useEditor } from '@/store/editor';
import { serializePages } from '@/io/fileFormat';
import { idbAll, idbClear, idbDelete, idbGet, idbPut } from './idb';
import { docOrigin, ensurePermission, offerOrigin } from './origin';
import { t } from '@/i18n';

export const WEB_RECENT_PREFIX = 'web-recent:';
const KEEP = 12;
/** Last-opened copies bigger than this aren't kept (handles and library entries always are). */
const MAX_COPY = 2_000_000;

export interface RecentDoc {
  id: string;
  name: string;
  openedAt: number;
  handle?: FileSystemFileHandle;
  libraryId?: string;
  /** Copy of the document when there's no handle or library entry to reopen. */
  data?: string;
}

export async function listRecentDocs(): Promise<RecentDoc[]> {
  try {
    return (await idbAll<RecentDoc>('recent')).sort((a, b) => b.openedAt - a.openedAt);
  } catch {
    return [];
  }
}

async function sameEntry(a: RecentDoc, handle?: FileSystemFileHandle, libraryId?: string, name?: string): Promise<boolean> {
  if (libraryId) return a.libraryId === libraryId;
  if (handle && a.handle) {
    try {
      return await (a.handle as FileSystemFileHandle & { isSameEntry: (o: FileSystemHandle) => Promise<boolean> }).isSameEntry(handle);
    } catch {
      return false;
    }
  }
  return !handle && !a.handle && !a.libraryId && a.name === name;
}

/** Records the open document (call after opening or saving). No-op on desktop paths. */
export async function noteCurrentDocument() {
  const s = useEditor.getState();
  if (s.file.path) return;
  const origin = docOrigin();
  const handle = origin?.kind === 'handle' ? origin.handle : undefined;
  const libraryId = origin?.kind === 'library' ? origin.id : undefined;
  const name = s.file.name.replace(/\.opendraw$/i, '');
  let data: string | undefined;
  if (!handle && !libraryId) {
    data = serializePages(s.allPages(), s.docMeta);
    if (data.length > MAX_COPY) return;
  }
  try {
    const list = await listRecentDocs();
    for (const r of list) if (await sameEntry(r, handle, libraryId, name)) await idbDelete('recent', r.id);
    await idbPut<RecentDoc>('recent', { id: uid(), name, openedAt: Date.now(), ...(handle ? { handle } : {}), ...(libraryId ? { libraryId } : {}), ...(data ? { data } : {}) });
    const all = await listRecentDocs();
    for (const old of all.slice(KEEP)) await idbDelete('recent', old.id);
  } catch {
    /* storage unavailable (private mode) — recent files are best effort */
  }
}

export const clearRecentDocs = () => idbClear('recent').catch(() => {});
export const forgetRecentDoc = (id: string) => idbDelete('recent', id).catch(() => {});

/**
 * Reads a recent entry for opening. Handles ask for permission again (needs a
 * user gesture); library entries are re-read from the library.
 */
export async function readRecentDoc(id: string): Promise<{ name: string; contents: string }> {
  const r = await idbGet<RecentDoc>('recent', id);
  if (!r) throw new Error(t('storage.recentGone'));
  if (r.handle) {
    if (!(await ensurePermission(r.handle, 'read'))) throw new Error(t('storage.recentPermission', { name: r.name }));
    const file = await r.handle.getFile();
    offerOrigin({ kind: 'handle', handle: r.handle });
    return { name: file.name, contents: await file.text() };
  }
  if (r.libraryId) {
    const doc = await idbGet<{ name: string; data: string }>('documents', r.libraryId);
    if (!doc) throw new Error(t('storage.recentRemoved', { name: r.name }));
    offerOrigin({ kind: 'library', id: r.libraryId });
    return { name: `${doc.name}.opendraw`, contents: doc.data };
  }
  if (r.data) return { name: `${r.name}.opendraw`, contents: r.data };
  throw new Error(t('storage.recentGone'));
}
