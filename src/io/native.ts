/**
 * Bridge to the native shell. In the desktop app this calls the Rust backend
 * (src-tauri/src/lib.rs) and native dialogs; in a plain browser (`npm run dev`)
 * it falls back to file inputs and downloads, so the UI is fully usable there too.
 */
import { isTauri } from '@/lib/platform';
import { adoptSavedHandle, pickWithHandle, saveToCurrentHandle } from '@/storage/webFiles';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenedFile {
  path: string | null;
  name: string;
  contents: string;
}

export interface RecentFile {
  path: string;
  name: string;
}

const tauriCore = () => import('@tauri-apps/api/core');
const tauriDialog = () => import('@tauri-apps/plugin-dialog');
const tauriWindow = () => import('@tauri-apps/api/window');

export const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

// ---------------------------------------------------------------------------
// Open
// ---------------------------------------------------------------------------

export async function pickAndOpenFile(filters: FileFilter[]): Promise<OpenedFile | null> {
  if (isTauri()) {
    const { open } = await tauriDialog();
    const path = await open({ multiple: false, directory: false, filters });
    if (!path || Array.isArray(path)) return null;
    return readFile(path);
  }
  return browserPick(filters);
}

export async function readFile(path: string): Promise<OpenedFile> {
  // Web recent documents (src/storage/recent.ts) are listed as `web-recent:<id>` paths.
  if (!isTauri() && path.startsWith('web-recent:')) {
    const { readRecentDoc } = await import('@/storage/recent');
    const r = await readRecentDoc(path.slice('web-recent:'.length));
    return { path: null, name: r.name, contents: r.contents };
  }
  const { invoke } = await tauriCore();
  return invoke<OpenedFile>('read_text_file', { path });
}

/** Formats that must be read as bytes (zip containers, images, PDF). */
export const BINARY_EXTENSIONS = ['vsdx', 'vssx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'];

export const isBinaryName = (name: string) => BINARY_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? '');

/** A text file (keeps its path) or a binary one (imported, so no path). */
export type AnyOpenedFile = OpenedFile | { path: null; name: string; bytes: Uint8Array };

/** Reads any diagram file by path: binary formats as bytes, the rest as text (desktop only). */
export async function readAnyFile(path: string): Promise<AnyOpenedFile> {
  if (!isBinaryName(path)) return readFile(path);
  const { invoke } = await tauriCore();
  const buf = await invoke<ArrayBuffer>('read_binary_file', { path });
  return { path: null, name: baseName(path), bytes: new Uint8Array(buf) };
}

/** Desktop: shows the Open dialog and returns the chosen path (null if cancelled). */
export async function pickOpenPath(filters: FileFilter[]): Promise<string | null> {
  const { open } = await tauriDialog();
  const path = await open({ multiple: false, directory: false, filters });
  return !path || Array.isArray(path) ? null : path;
}

/** Like pickAndOpenFile, but binary formats (.vsdx, .png…) arrive as bytes instead of mangled text. */
export async function pickAndOpenAnyFile(filters: FileFilter[]): Promise<AnyOpenedFile | null> {
  if (isTauri()) {
    const { open } = await tauriDialog();
    const path = await open({ multiple: false, directory: false, filters });
    if (!path || Array.isArray(path)) return null;
    return readAnyFile(path);
  }
  return browserPick(filters, true);
}

function browserPick(filters: FileFilter[]): Promise<OpenedFile | null>;
function browserPick(filters: FileFilter[], binary: true): Promise<AnyOpenedFile | null>;
function browserPick(filters: FileFilter[], binary = false): Promise<AnyOpenedFile | null> {
  // File System Access API first: keeps a handle so Save / autosave write back (src/storage/webFiles.ts).
  return pickWithHandle(filters, (name) => binary && isBinaryName(name)).then((r) => (r !== undefined ? r : inputPick(filters, binary)));
}

function inputPick(filters: FileFilter[], binary: boolean): Promise<AnyOpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && binary && isBinaryName(file.name)) {
        resolve({ path: null, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
        return;
      }
      resolve(file ? { path: null, name: file.name, contents: await file.text() } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/** Asks for a destination (unless `path` is given) and writes the data. Returns the path, or null if cancelled. */
export async function saveFile(
  data: string | Uint8Array,
  opts: {
    path?: string | null;
    defaultName: string;
    filters: FileFilter[];
    mime: string;
    /** Desktop: keep the previous contents as `<file>.bkp`. */ backup?: boolean;
    /** Web: the diagram itself — `save` writes back to its file handle when there is one, and both adopt the chosen file. */
    document?: 'save' | 'saveAs';
  },
): Promise<{ path: string | null; name: string } | null> {
  if (isTauri()) {
    let path = opts.path ?? null;
    if (!path) {
      const { save } = await tauriDialog();
      path = await save({ defaultPath: opts.defaultName, filters: opts.filters });
      if (!path) return null;
    }
    const { invoke } = await tauriCore();
    if (typeof data === 'string') {
      await invoke('write_text_file', { path, contents: data, backup: !!opts.backup });
    } else {
      await invoke('write_binary_file', data, { headers: { 'x-path': encodeURIComponent(path) } });
    }
    return { path, name: baseName(path) };
  }
  if (opts.document === 'save' && typeof data === 'string') {
    const done = await saveToCurrentHandle(data);
    if (done) return done;
  }
  return browserSave(data, opts.defaultName, opts.mime, opts.filters, !!opts.document);
}

/**
 * Writes text to a known path without any dialog (desktop only; e.g. autosave
 * to the open file). `backup: true` first copies the current contents to
 * `<file>.bkp`.
 */
export async function writeTextFile(path: string, contents: string, opts: { backup?: boolean } = {}): Promise<void> {
  if (!isTauri()) throw new Error('Writing to a path needs the desktop app');
  const { invoke } = await tauriCore();
  await invoke('write_text_file', { path, contents, backup: !!opts.backup });
}

async function browserSave(data: string | Uint8Array, name: string, mime: string, filters: FileFilter[], isDocument = false) {
  const blob = new Blob([data as BlobPart], { type: mime });
  // Prefer the File System Access API (Chromium) for a real save dialog.
  const picker = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: name,
        types: filters.map((f) => ({ description: f.name, accept: { [mime]: f.extensions.map((e) => `.${e}`) } })),
      });
      const writable = await (handle as unknown as { createWritable: () => Promise<WritableStream & { write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }).createWritable();
      await writable.write(blob);
      await writable.close();
      if (isDocument) adoptSavedHandle(handle);
      return { path: null, name: handle.name };
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { path: null, name };
}

// ---------------------------------------------------------------------------
// Recent files & launch file
// ---------------------------------------------------------------------------

export async function getRecentFiles(): Promise<RecentFile[]> {
  if (!isTauri()) {
    const { listRecentDocs } = await import('@/storage/recent');
    return (await listRecentDocs()).map((r) => ({ path: `web-recent:${r.id}`, name: r.name }));
  }
  const { invoke } = await tauriCore();
  return invoke<RecentFile[]>('get_recent_files');
}

export async function addRecentFile(path: string): Promise<RecentFile[]> {
  if (!isTauri()) return [];
  const { invoke } = await tauriCore();
  return invoke<RecentFile[]>('add_recent_file', { path });
}

export async function clearRecentFiles(): Promise<void> {
  if (!isTauri()) return void (await import('@/storage/recent')).clearRecentDocs();
  const { invoke } = await tauriCore();
  await invoke('clear_recent_files');
}

export async function takeLaunchFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { invoke } = await tauriCore();
  return invoke<string | null>('take_launch_file');
}

/** macOS "Open with…" while the app is running (sent to the focused window only). */
export async function onOpenFileRequest(cb: (path: string) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  return (await tauriWindow()).getCurrentWindow().listen<string>('opendraw://open-file', (e) => cb(e.payload));
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export const windowControls = {
  async minimize() {
    if (isTauri()) (await tauriWindow()).getCurrentWindow().minimize();
  },
  async toggleMaximize() {
    if (isTauri()) (await tauriWindow()).getCurrentWindow().toggleMaximize();
  },
  async close() {
    if (isTauri()) (await tauriWindow()).getCurrentWindow().close();
  },
  async destroy() {
    if (isTauri()) (await tauriWindow()).getCurrentWindow().destroy();
  },
  async show() {
    if (!isTauri()) return;
    const w = (await tauriWindow()).getCurrentWindow();
    await w.show();
    await w.setFocus();
  },
  async setTitle(title: string) {
    document.title = title;
    if (isTauri()) (await tauriWindow()).getCurrentWindow().setTitle(title);
  },
  async isMaximized() {
    return isTauri() ? (await tauriWindow()).getCurrentWindow().isMaximized() : false;
  },
  async onResized(cb: () => void): Promise<() => void> {
    if (!isTauri()) return () => {};
    return (await tauriWindow()).getCurrentWindow().onResized(cb);
  },
  /** Intercept window close; return true from `cb` to allow closing. */
  async onCloseRequested(cb: () => Promise<boolean>, isDirty: () => boolean): Promise<() => void> {
    if (!isTauri()) {
      // Browsers only allow the generic "leave site?" prompt.
      const handler = (e: BeforeUnloadEvent) => {
        if (isDirty()) e.preventDefault();
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
    const w = (await tauriWindow()).getCurrentWindow();
    return w.onCloseRequested(async (event) => {
      event.preventDefault();
      if (await cb()) await w.destroy();
    });
  },
};
