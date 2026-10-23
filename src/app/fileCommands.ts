/**
 * Document lifecycle: new / open / save / save as, unsaved-changes prompts,
 * recent files and crash recovery (the working file is mirrored to
 * localStorage so an unexpected exit never loses work).
 */
import type { Page } from '@/model/types';
import { saveTarget } from './saveTarget';
import { isDirtyState, newPage, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { FILE_EXTENSION, FileFormatError, parsePages, serializePages } from '@/io/fileFormat';
import { importDrawioPages } from '@/io/drawio';
import { IMPORTERS, importerFor } from '@/io/import';
import { addRecentFile, baseName, pickAndOpenFile, readFile, saveFile, type OpenedFile } from '@/io/native';

const FILTERS = [{ name: 'OpenDraw Diagram', extensions: [FILE_EXTENSION] }];

function openFilters() {
  const extra = IMPORTERS.flatMap((i) => i.extensions);
  return [
    { name: 'All diagrams', extensions: [...new Set([FILE_EXTENSION, 'drawio', 'xml', ...extra])] },
    { name: 'OpenDraw Diagram', extensions: [FILE_EXTENSION] },
    { name: 'draw.io Diagram', extensions: ['drawio', 'xml'] },
    ...IMPORTERS.filter((i) => i.extensions.length).map((i) => ({ name: i.label.replace(/…$/, ''), extensions: i.extensions })),
  ];
}

export const isDirty = () => {
  const s = useEditor.getState();
  // An untitled, empty single-page canvas has nothing worth saving.
  if (!s.file.path && s.pages.length === 1 && s.doc.order.length === 0) return false;
  return isDirtyState(s);
};

/** Marks the current file as never saved (imports, recovered work). */
export function markUnsaved() {
  const f = useEditor.getState().file;
  useEditor.setState({ file: { ...f, savedDocs: {}, savedMeta: '' } });
}

/** Asks to save unsaved changes. Resolves false if the user cancels. */
export async function confirmDiscard(): Promise<boolean> {
  if (!isDirty()) return true;
  const name = useEditor.getState().file.name;
  const choice = await useUi.getState().ask({
    title: `Save changes to “${name}”?`,
    message: 'Your changes will be lost if you don’t save them.',
    confirmLabel: 'Save',
    denyLabel: 'Don’t save',
  });
  if (choice === 'cancel') return false;
  if (choice === 'deny') return true;
  return saveDocument();
}

export async function newDocument() {
  if (!(await confirmDiscard())) return;
  useEditor.getState().newDoc();
  clearRecovery();
}

type IncomingFile = OpenedFile | { name: string; bytes: Uint8Array; path: null };

/** Turns any supported file into pages. `native` = an OpenDraw file (keeps its path). */
async function pagesFromFile(f: IncomingFile): Promise<{ pages: Page[]; native: boolean; warnings?: string[] }> {
  const lower = f.name.toLowerCase();
  const ext = lower.split('.').pop() ?? '';
  const text = 'contents' in f ? f.contents : null;
  const asText = () => text ?? new TextDecoder().decode((f as { bytes: Uint8Array }).bytes);
  if (ext === FILE_EXTENSION) return { pages: parsePages(asText()), native: true };
  const importer = importerFor(lower);
  if (importer) {
    const res = await importer.run('bytes' in f ? f.bytes : asText(), f.name);
    return { pages: res.pages.map((p) => newPage(p.name, p.doc)), native: false, warnings: res.warnings };
  }
  const body = asText();
  if (ext === 'drawio' || ext === 'xml' || body.trimStart().startsWith('<')) {
    return { pages: (await importDrawioPages(body)).map((p) => newPage(p.name, p.doc)), native: false };
  }
  return { pages: parsePages(body), native: true };
}

export async function loadOpenedFile(f: IncomingFile) {
  const ui = useUi.getState();
  try {
    const { pages, native, warnings } = await pagesFromFile(f);
    const s = useEditor.getState();
    if (native) {
      s.loadPages(pages, { path: f.path, name: f.name });
      if (f.path) addRecentFile(f.path).catch(() => {});
    } else {
      // Imported files become a new, unsaved OpenDraw document.
      s.loadPages(pages, { path: null, name: f.name.replace(/\.[^.]+$/, '') });
      markUnsaved();
      const count = pages.reduce((n, p) => n + p.doc.order.length, 0);
      ui.toast(`Imported ${count} elements${pages.length > 1 ? ` on ${pages.length} pages` : ''}`, 'success');
      warnings?.slice(0, 2).forEach((w) => ui.toast(w, 'info'));
    }
    requestAnimationFrame(() => useEditor.getState().zoomToFit());
  } catch (e) {
    ui.toast(e instanceof FileFormatError || e instanceof Error ? e.message : 'Could not open this file.', 'error');
  }
}

export async function openDocument() {
  if (!(await confirmDiscard())) return;
  try {
    const f = await pickAndOpenFile(openFilters());
    if (f) await loadOpenedFile(f);
  } catch (e) {
    useUi.getState().toast(String((e as Error).message ?? e), 'error');
  }
}

export async function openPath(path: string) {
  if (!(await confirmDiscard())) return;
  try {
    await loadOpenedFile(await readFile(path));
  } catch (e) {
    useUi.getState().toast(String(e), 'error');
  }
}

export async function saveDocument(saveAs = false): Promise<boolean> {
  // Embedded: the host page owns persistence (Save and Save as… both hand off).
  const target = saveTarget();
  if (target) {
    target();
    return true;
  }
  const s = useEditor.getState();
  const contents = serializePages(s.allPages());
  const name = s.file.name.endsWith(`.${FILE_EXTENSION}`) ? s.file.name : `${s.file.name}.${FILE_EXTENSION}`;
  try {
    const res = await saveFile(contents, {
      path: saveAs ? null : s.file.path,
      defaultName: name,
      filters: FILTERS,
      mime: 'application/json',
    });
    if (!res) return false;
    useEditor.getState().markSaved(res.path, res.path ? baseName(res.path) : res.name);
    if (res.path) addRecentFile(res.path).catch(() => {});
    useUi.getState().toast('Saved', 'success');
    clearRecovery();
    void import('./revisions').then((r) => r.addRevision('save'));
    return true;
  } catch (e) {
    useUi.getState().toast(`Save failed: ${String((e as Error).message ?? e)}`, 'error');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Crash recovery
// ---------------------------------------------------------------------------

const RECOVERY_KEY = 'opendraw:recovery';

export function startRecovery() {
  let timer = 0;
  return useEditor.subscribe((s, prev) => {
    if (s.doc === prev.doc && s.pages === prev.pages) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!isDirty()) return clearRecovery();
      const cur = useEditor.getState();
      try {
        localStorage.setItem(RECOVERY_KEY, JSON.stringify({ name: cur.file.name, path: cur.file.path, data: serializePages(cur.allPages()) }));
      } catch {
        /* quota exceeded — ignore */
      }
    }, 800);
  });
}

export function clearRecovery() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}

/** Restores an unsaved session, if any. Returns true when something was restored. */
export function restoreRecovery(): boolean {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return false;
    const { name, path, data } = JSON.parse(raw) as { name: string; path: string | null; data: string };
    const pages = parsePages(data);
    if (!pages.some((p) => p.doc.order.length)) return false;
    useEditor.getState().loadPages(pages, { path, name });
    markUnsaved();
    return true;
  } catch {
    return false;
  }
}
