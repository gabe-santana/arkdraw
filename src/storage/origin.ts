/**
 * Where the open document lives in the web build, beyond a desktop path:
 * a File System Access handle (so Save and autosave write back without a
 * dialog) or an entry of the browser library (File → Save to browser).
 *
 * Opening code "offers" an origin just before it loads the document; the next
 * load adopts it. Any other load (new, import, template…) clears it.
 */
import { useEditor } from '@/store/editor';
import { FILE_EXTENSION } from '@/io/fileFormat';

export type DocOrigin = { kind: 'handle'; handle: FileSystemFileHandle } | { kind: 'library'; id: string } | null;

let current: DocOrigin = null;
let pending: { origin: DocOrigin; at: number } | null = null;

export const docOrigin = (): DocOrigin => current;

/** The next document load adopts this origin. */
export function offerOrigin(o: DocOrigin) {
  pending = { origin: o, at: Date.now() };
}

/** Sets the origin of the document that's already open (after Save as…). */
export function setOrigin(o: DocOrigin) {
  current = o;
  pending = null;
}

export const isNativeHandle = (h: FileSystemFileHandle) => h.name.toLowerCase().endsWith(`.${FILE_EXTENSION}`);

let installed = false;
let suppressed = 0;

/** Runs a state update that replaces pages and saved snapshots without counting as a document load. */
export function withoutOriginTracking(fn: () => void) {
  suppressed++;
  try {
    fn();
  } finally {
    suppressed--;
  }
}

/** Watches document loads (loadPages replaces pages and the saved snapshot together). */
export function installOriginTracking() {
  if (installed) return () => {};
  installed = true;
  const off = useEditor.subscribe((s, prev) => {
    if (suppressed || s.pages === prev.pages || s.file.savedDocs === prev.file.savedDocs) return;
    // Only OpenDraw files can be written back; imported formats become new documents.
    // An offer only counts for the load that follows it (a cancelled open must not leak into a later New).
    const o = pending && Date.now() - pending.at < 10_000 ? pending.origin : null;
    pending = null;
    current = o && (o.kind === 'library' || isNativeHandle(o.handle)) ? o : null;
  });
  return () => {
    installed = false;
    off();
  };
}

type PermissionHandle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  createWritable?: () => Promise<{ write: (d: Blob | string) => Promise<void>; close: () => Promise<void> }>;
};

/** Asks for (or confirms) access to a handle. `prompt` = may show a browser permission prompt (needs a user gesture). */
export async function ensurePermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite', prompt = true): Promise<boolean> {
  const h = handle as PermissionHandle;
  if (!h.queryPermission) return true;
  if ((await h.queryPermission({ mode })) === 'granted') return true;
  if (!prompt || !h.requestPermission) return false;
  return (await h.requestPermission({ mode })) === 'granted';
}

export async function writeHandle(handle: FileSystemFileHandle, data: string, prompt = true): Promise<boolean> {
  if (!(await ensurePermission(handle, 'readwrite', prompt))) return false;
  const w = await (handle as PermissionHandle).createWritable!();
  await w.write(new Blob([data], { type: 'application/json' }));
  await w.close();
  return true;
}

// Track from startup so the very first open is seen.
installOriginTracking();
