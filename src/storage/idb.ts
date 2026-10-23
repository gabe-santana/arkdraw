/**
 * Tiny IndexedDB wrapper for the web build's local storage: the browser file
 * library, recent documents (with File System Access handles) and user
 * templates. A separate database from revisions (src/app/revisions.ts) so the
 * two never fight over schema versions.
 */

const DB = 'opendraw-storage';
const VERSION = 1;
export type StoreName = 'documents' | 'recent' | 'templates';
const STORES: StoreName[] = ['documents', 'recent', 'templates'];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available.'));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idbAll = async <T>(store: StoreName): Promise<T[]> => (await run<T[]>(store, 'readonly', (s) => s.getAll())) ?? [];
export const idbGet = <T>(store: StoreName, id: string): Promise<T | undefined> => run<T>(store, 'readonly', (s) => s.get(id));
export const idbPut = async <T>(store: StoreName, value: T): Promise<void> => {
  await run(store, 'readwrite', (s) => s.put(value));
};
export const idbDelete = async (store: StoreName, id: string): Promise<void> => {
  await run(store, 'readwrite', (s) => s.delete(id));
};
export const idbClear = async (store: StoreName): Promise<void> => {
  await run(store, 'readwrite', (s) => s.clear());
};
