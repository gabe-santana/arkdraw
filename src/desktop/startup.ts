/**
 * Desktop start-up: load config.json (spell-check language, plugin list) and
 * run the daily quiet update check from the main window. No-op in the browser.
 */
import { isTauri } from '@/lib/platform';
import { useUi } from '@/store/ui';
import { t } from '@/i18n';
import { appConfig, autoUpdateCheckEnabled, loadAppConfig, saveAppConfig } from './config';
import { isMainWindow } from './windows';
import { autoCheckForUpdates } from './updater';

export function startDesktop(): void {
  if (!isTauri()) return;
  void loadAppConfig().then(() => {
    // Let the first paint and any launch file go first.
    if (isMainWindow()) window.setTimeout(() => void autoCheckForUpdates(autoUpdateCheckEnabled()), 4000);
  });
}

/** Extras → Configuration file…: creates config.json if needed and reveals it in the file manager. */
export async function showConfigFile(): Promise<void> {
  if (!isTauri()) return;
  try {
    const info = await loadAppConfig();
    if (!info.path) throw new Error(t('desktop.config.noFolder'));
    if (!info.exists) await saveAppConfig({}); // write the defaults the first time
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
    await revealItemInDir(appConfig().path ?? info.path);
    useUi.getState().toast(t('desktop.config.editHint'), 'info');
  } catch (e) {
    useUi.getState().toast(String((e as Error)?.message ?? e), 'error');
  }
}
