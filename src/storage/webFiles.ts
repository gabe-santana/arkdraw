/**
 * File System Access API integration for the web build (Chromium): opening
 * through `showOpenFilePicker` keeps a handle, so File → Save and autosave can
 * write back to the same file without a dialog. Browsers without the API keep
 * the `<input type=file>` / download fallbacks in src/io/native.ts.
 */
import type { AnyOpenedFile, FileFilter } from '@/io/native';
import { docOrigin, isNativeHandle, offerOrigin, setOrigin, writeHandle } from './origin';

type OpenPicker = (o: unknown) => Promise<FileSystemFileHandle[]>;

const validExt = (e: string) => /^[a-z0-9]{1,15}$/i.test(e);

/**
 * Picks a file with a handle. Resolves `undefined` when the API is missing or
 * refuses the request (the caller falls back to a file input), `null` on cancel.
 */
export async function pickWithHandle(filters: FileFilter[], asBytes: (name: string) => boolean): Promise<AnyOpenedFile | null | undefined> {
  const picker = (window as unknown as { showOpenFilePicker?: OpenPicker }).showOpenFilePicker;
  if (!picker) return undefined;
  let handle: FileSystemFileHandle | undefined;
  try {
    const types = filters
      .map((f) => ({ description: f.name, accept: { 'application/octet-stream': f.extensions.filter(validExt).map((e) => `.${e}`) } }))
      .filter((t) => t.accept['application/octet-stream'].length);
    [handle] = await picker({ multiple: false, types });
  } catch (e) {
    return (e as Error)?.name === 'AbortError' ? null : undefined;
  }
  if (!handle) return null;
  const file = await handle.getFile();
  offerOrigin({ kind: 'handle', handle });
  if (asBytes(file.name)) return { path: null, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
  return { path: null, name: file.name, contents: await file.text() };
}

/** The handle Save should write to without asking, if any. */
export function currentSaveHandle(): FileSystemFileHandle | null {
  const o = docOrigin();
  return o?.kind === 'handle' ? o.handle : null;
}

/** Writes the document to its handle (Save). Returns false if there's none or access was refused. */
export async function saveToCurrentHandle(data: string): Promise<{ path: null; name: string } | null> {
  const handle = currentSaveHandle();
  if (!handle) return null;
  try {
    return (await writeHandle(handle, data)) ? { path: null, name: handle.name } : null;
  } catch {
    return null;
  }
}

/** After Save as… through the picker: the document now lives in this file. */
export function adoptSavedHandle(handle: FileSystemFileHandle) {
  setOrigin(isNativeHandle(handle) ? { kind: 'handle', handle } : null);
}
