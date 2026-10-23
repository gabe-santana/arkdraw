/**
 * Local revision history (mxGraph's File → Revision History, but offline):
 * a snapshot is stored on every save and every few minutes while there are
 * unsaved changes. Snapshots live in IndexedDB, keyed by document.
 */
import { useEditor } from '@/store/editor';
import { serializePages } from '@/io/fileFormat';
import { isDirty } from './fileCommands';

export interface Revision {
  id: string;
  doc: string;
  createdAt: number;
  kind: 'save' | 'auto';
  data: string;
  elements: number;
}

const DB = 'opendraw';
const STORE = 'revisions';
const KEEP = 40;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('doc', 'doc');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Document key: the file path when saved, else its name. */
export const docKey = () => {
  const f = useEditor.getState().file;
  return f.path ?? `untitled:${f.name}`;
};

export async function addRevision(kind: Revision['kind']) {
  try {
    const s = useEditor.getState();
    const pages = s.allPages();
    const rev: Revision = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      doc: docKey(),
      createdAt: Date.now(),
      kind,
      data: serializePages(pages),
      elements: pages.reduce((n, p) => n + p.doc.order.length, 0),
    };
    await tx('readwrite', (st) => st.put(rev));
    // Prune old revisions for this document.
    const all = await listRevisions(rev.doc);
    for (const old of all.slice(KEEP)) await tx('readwrite', (st) => st.delete(old.id));
  } catch {
    /* IndexedDB unavailable (private mode) — history is best effort */
  }
}

export async function listRevisions(doc = docKey()): Promise<Revision[]> {
  try {
    const all = (await tx<Revision[]>('readonly', (st) => st.index('doc').getAll(doc))) ?? [];
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteRevision(id: string) {
  await tx('readwrite', (st) => st.delete(id));
}

/** Periodic snapshots while editing (every 5 minutes of unsaved work). */
export function startAutoRevisions() {
  const timer = window.setInterval(() => {
    if (isDirty()) void addRevision('auto');
  }, 5 * 60_000);
  return () => window.clearInterval(timer);
}
