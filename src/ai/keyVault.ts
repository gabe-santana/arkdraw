/**
 * Encrypted API key storage for the browser build (the desktop app uses the
 * OS keychain instead).
 *
 * A non-extractable AES-GCM key is generated once and kept in IndexedDB:
 * the page can use it to encrypt and decrypt, but its bytes can never be
 * read back. API keys are stored only as ciphertext next to it. This keeps
 * keys out of plain-text storage (synced profiles, disk, storage dumps); it
 * cannot protect them from code running inside the page itself.
 */
const DB = 'arkdraw-ai';
const STORE = 'vault';
const MASTER = '\u0000master';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export const vaultAvailable = (): boolean => typeof indexedDB !== 'undefined' && !!globalThis.crypto?.subtle;

let master: Promise<CryptoKey> | null = null;

function masterKey(): Promise<CryptoKey> {
  master ??= run<CryptoKey | undefined>('readonly', (s) => s.get(MASTER)).then(async (existing) => {
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await run('readwrite', (s) => s.put(key, MASTER));
    return key;
  });
  master.catch(() => (master = null));
  return master;
}

interface Sealed {
  iv: Uint8Array;
  data: ArrayBuffer;
}

/** Encrypts and stores `value` (any JSON) under `id`. */
export async function vaultPut(id: string, value: unknown): Promise<void> {
  const key = await masterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  await run('readwrite', (s) => s.put({ iv, data } satisfies Sealed, id));
}

/** Every stored entry, decrypted. Entries that fail to decrypt are skipped. */
export async function vaultAll(): Promise<Map<string, unknown>> {
  const out = new Map<string, unknown>();
  const key = await masterKey();
  const ids = (await run('readonly', (s) => s.getAllKeys())).filter((k): k is string => typeof k === 'string' && k !== MASTER);
  for (const id of ids) {
    try {
      const sealed = await run<Sealed | undefined>('readonly', (s) => s.get(id));
      if (!sealed) continue;
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(sealed.iv) }, key, sealed.data);
      out.set(id, JSON.parse(new TextDecoder().decode(plain)));
    } catch {
      /* unreadable entry: ignore */
    }
  }
  return out;
}

export async function vaultDelete(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/** Removes every stored key (the master key stays, it protects nothing by itself). */
export async function vaultClear(): Promise<void> {
  const ids = (await run('readonly', (s) => s.getAllKeys())).filter((k) => k !== MASTER);
  for (const id of ids) await run('readwrite', (s) => s.delete(id));
}
