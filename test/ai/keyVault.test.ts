import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vaultPut } from '@/ai/keyVault';

// Minimal fake IndexedDB: enough for vaultPut's master-key lookup (a read that
// succeeds) and its write, which the fake aborts without setting tx.error,
// the way a quota abort behaves.
function fakeIndexedDB(store: Map<string, unknown>) {
  const makeTx = (mode: IDBTransactionMode) => {
    const tx: Record<string, unknown> = { error: null, mode };
    tx.objectStore = () => ({
      get(key: string) {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => {
          req.result = store.get(key);
          (req.onsuccess as (() => void) | undefined)?.();
          (tx.oncomplete as (() => void) | undefined)?.();
        });
        return req;
      },
      put() {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => (tx.onabort as (() => void) | undefined)?.());
        return req;
      },
    });
    return tx;
  };
  const db = {
    transaction: (_name: string, mode: IDBTransactionMode) => makeTx(mode),
    close() {},
  };
  return {
    open() {
      const req: Record<string, unknown> = { result: db };
      queueMicrotask(() => (req.onsuccess as (() => void) | undefined)?.());
      return req;
    },
  };
}

describe('key vault writes', () => {
  beforeEach(async () => {
    // Pre-seed a real non-extractable master key so vaultPut skips key generation.
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const store = new Map<string, unknown>([['\u0000master', key]]);
    (globalThis as { indexedDB?: unknown }).indexedDB = fakeIndexedDB(store);
  });

  afterEach(() => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
  });

  it('rejects when the write transaction aborts without an error', async () => {
    const outcome = await Promise.race([
      vaultPut('openai', 'sk-test').then(
        () => 'resolved',
        (e: Error) => `rejected: ${e.message}`,
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve('still pending'), 500)),
    ]);
    expect(outcome).toBe('rejected: aborted');
  });
});
