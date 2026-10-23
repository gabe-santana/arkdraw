/**
 * Multiple editor windows (desktop). Each window is a separate copy of the
 * editor with its own document; the Rust side (src-tauri/src/editor_windows.rs)
 * creates them as `editor-<n>` next to the original `main` window.
 */
import { isTauri } from '@/lib/platform';
import { useUi } from '@/store/ui';
import { baseName } from '@/io/native';
import { t } from '@/i18n';

type TauriInternals = { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } };

/** This window's label ("main" in the browser and in the first desktop window). Synchronous. */
export function currentWindowLabel(): string {
  if (typeof window === 'undefined') return 'main';
  return (window as unknown as TauriInternals).__TAURI_INTERNALS__?.metadata?.currentWindow?.label || 'main';
}

export const isMainWindow = () => currentWindowLabel() === 'main';

/** localStorage key scoped to this window, so two windows never overwrite each other's drafts. */
export const windowScopedKey = (key: string, label = currentWindowLabel()) => (label === 'main' ? key : `${key}:${label}`);

/** Opens a new editor window (desktop), optionally loading `path` in it. */
export async function openNewWindow(path?: string): Promise<void> {
  if (!isTauri()) {
    // The web build: a new tab is the closest equivalent.
    window.open(window.location.pathname, '_blank', 'noopener');
    return;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<string>('open_new_window', { path: path ?? null });
  } catch (e) {
    useUi.getState().toast(String((e as Error)?.message ?? e), 'error');
  }
}

/**
 * Asked before opening `path` over a document with unsaved changes: open it in
 * a new window (desktop), replace the current diagram, or cancel.
 */
export async function askOpenWhere(path: string, currentName: string): Promise<'window' | 'replace' | 'cancel'> {
  const choice = await useUi.getState().ask({
    title: t('desktop.openWhere.title', { name: baseName(path) }),
    message: t('desktop.openWhere.message', { name: currentName }),
    confirmLabel: t('desktop.openWhere.confirm'),
    denyLabel: t('desktop.openWhere.deny'),
  });
  return choice === 'confirm' ? 'window' : choice === 'deny' ? 'replace' : 'cancel';
}
