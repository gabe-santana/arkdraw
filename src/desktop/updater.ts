/**
 * Desktop auto-update (tauri-plugin-updater, GitHub Releases `latest.json`;
 * see docs/release.md). A quiet check runs on launch at most once a day
 * (main window only, opt out with `"checkForUpdates": false` in config.json);
 * Help → Check for updates… runs one on demand. When an update is found,
 * DesktopUpdatePrompt offers "Restart to update", which downloads, installs
 * and relaunches.
 */
import { create } from 'zustand';
import type { Update } from '@tauri-apps/plugin-updater';
import { t } from '@/i18n';
import { isTauri } from '@/lib/platform';
import { useUi } from '@/store/ui';

const LAST_CHECK_KEY = 'arkdraw:update-last-check';
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';

interface UpdaterState {
  status: UpdateStatus;
  version: string | null;
  notes: string | null;
  /** Download progress 0..1, or null when the size is unknown. */
  progress: number | null;
  error: string | null;
  dismissed: boolean;
  dismiss: () => void;
}

export const useUpdater = create<UpdaterState>((set) => ({
  status: 'idle',
  version: null,
  notes: null,
  progress: null,
  error: null,
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));

let pending: Update | null = null;

/** Whether a quiet launch check is due (none yet, or the last one is a day old). */
export function shouldAutoCheck(lastCheck: number | null, now = Date.now()): boolean {
  return lastCheck == null || !Number.isFinite(lastCheck) || now - lastCheck >= CHECK_INTERVAL_MS || now < lastCheck;
}

function readLastCheck(): number | null {
  try {
    const v = localStorage.getItem(LAST_CHECK_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeLastCheck(t: number) {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(t));
  } catch {
    /* ignore */
  }
}

/**
 * Checks the update endpoint. `quiet` (launch check): no toasts for "up to
 * date" or errors. Resolves to the new version, or null.
 */
export async function checkForUpdates({ quiet = false } = {}): Promise<string | null> {
  const toast = useUi.getState().toast;
  if (!isTauri()) {
    if (!quiet) toast(t('desktop.update.webAuto'), 'info');
    return null;
  }
  const st = useUpdater.getState();
  if (st.status === 'checking' || st.status === 'downloading' || st.status === 'installing') return st.version;
  useUpdater.setState({ status: 'checking', error: null });
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check({ timeout: 20_000 });
    writeLastCheck(Date.now());
    if (!update) {
      useUpdater.setState({ status: 'idle' });
      if (!quiet) toast(t('desktop.update.upToDate'), 'success');
      return null;
    }
    void pending?.close().catch(() => {});
    pending = update;
    useUpdater.setState({ status: 'available', version: update.version, notes: update.body ?? null, dismissed: false });
    return update.version;
  } catch (e) {
    const message = String((e as Error)?.message ?? e);
    useUpdater.setState({ status: quiet ? 'idle' : 'error', error: message });
    if (!quiet) toast(t('desktop.update.checkFailed', { error: message }), 'error');
    return null;
  }
}

/** Launch check: at most once a day, when enabled and not in a headless run. */
export async function autoCheckForUpdates(enabled: boolean): Promise<void> {
  if (!enabled || !isTauri() || import.meta.env.DEV) return;
  if (!shouldAutoCheck(readLastCheck())) return;
  await checkForUpdates({ quiet: true });
}

/**
 * Downloads and installs the pending update, then relaunches. On Windows the
 * installer closes the app itself and restarts it when done.
 */
export async function installUpdate(): Promise<void> {
  if (!pending) return;
  const update = pending;
  let total = 0;
  let received = 0;
  useUpdater.setState({ status: 'downloading', progress: null, error: null });
  try {
    await update.downloadAndInstall((ev) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0;
      else if (ev.event === 'Progress') {
        received += ev.data.chunkLength;
        useUpdater.setState({ progress: total ? Math.min(1, received / total) : null });
      } else useUpdater.setState({ status: 'installing', progress: 1 });
    });
    useUpdater.setState({ status: 'installing' });
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('restart_app');
  } catch (e) {
    const message = String((e as Error)?.message ?? e);
    useUpdater.setState({ status: 'available', error: message });
    useUi.getState().toast(t('desktop.update.failed', { error: message }), 'error');
  }
}
