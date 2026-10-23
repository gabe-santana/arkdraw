/**
 * Bridge to the native shell. In the desktop app this calls the Rust backend
 * (src-tauri/src/lib.rs) and native dialogs; in a plain browser (`npm run dev`)
 * it falls back to file inputs and downloads, so the UI is fully usable there too.
 */
import { isTauri } from '@/lib/platform';

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
  const { invoke } = await tauriCore();
  return invoke<OpenedFile>('read_text_file', { path });
}

function browserPick(filters: FileFilter[]): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
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
  opts: { path?: string | null; defaultName: string; filters: FileFilter[]; mime: string },
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
      await invoke('write_text_file', { path, contents: data });
    } else {
      await invoke('write_binary_file', data, { headers: { 'x-path': encodeURIComponent(path) } });
    }
    return { path, name: baseName(path) };
  }
  return browserSave(data, opts.defaultName, opts.mime, opts.filters);
}

async function browserSave(data: string | Uint8Array, name: string, mime: string, filters: FileFilter[]) {
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
  if (!isTauri()) return [];
  const { invoke } = await tauriCore();
  return invoke<RecentFile[]>('get_recent_files');
}

export async function addRecentFile(path: string): Promise<RecentFile[]> {
  if (!isTauri()) return [];
  const { invoke } = await tauriCore();
  return invoke<RecentFile[]>('add_recent_file', { path });
}

export async function clearRecentFiles(): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await tauriCore();
  await invoke('clear_recent_files');
}

export async function takeLaunchFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { invoke } = await tauriCore();
  return invoke<string | null>('take_launch_file');
}

/** macOS "Open with…" while the app is running. */
export async function onOpenFileRequest(cb: (path: string) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen<string>('opendraw://open-file', (e) => cb(e.payload));
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
