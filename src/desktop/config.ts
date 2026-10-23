/**
 * Desktop configuration file (`config.json` in the app config directory, or
 * `--config <path>`), read once at startup through `get_app_config`
 * (src-tauri/src/config.rs). In the browser everything stays at the defaults.
 *
 *   plugins            JS plugin files, loaded only with `--enable-plugins`
 *                      (or `enablePlugins: true`) — see enabledPluginPaths()
 *   spellCheck         spell checking in the text editor (default true)
 *   spellCheckLanguage BCP 47 tag for the text editor's `lang`, e.g. "de-DE"
 *   checkForUpdates    quiet update check on launch (default true)
 *   createBackups      write `<file>.bkp` with the previous contents on save (default true)
 */
import { isTauri } from '@/lib/platform';

export interface AppConfig {
  plugins: string[];
  enablePlugins: boolean;
  spellCheck?: boolean;
  spellCheckLanguage?: string;
  checkForUpdates?: boolean;
  /** Keep the previous contents as `<file>.bkp` on every save (default true). */
  createBackups?: boolean;
  /** Unknown keys are preserved. */
  [key: string]: unknown;
}

export interface AppConfigInfo {
  config: AppConfig;
  /** The config file in use (it may not exist yet). */
  path: string | null;
  /** Whether the config file exists. */
  exists?: boolean;
  /** `--enable-plugins` was given or `enablePlugins` is set. */
  pluginsEnabled: boolean;
  /** Headless `opendraw --export` run. */
  headless: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfigInfo = {
  config: { plugins: [], enablePlugins: false },
  path: null,
  pluginsEnabled: false,
  headless: false,
};

let current: AppConfigInfo = DEFAULT_APP_CONFIG;
let loading: Promise<AppConfigInfo> | null = null;

/** Normalizes whatever the backend (or a hand-edited file) returned. */
export function normalizeConfigInfo(raw: Partial<AppConfigInfo> | null | undefined): AppConfigInfo {
  const cfg = (raw?.config ?? {}) as Partial<AppConfig>;
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins.filter((p): p is string => typeof p === 'string' && !!p.trim()) : [];
  const lang = typeof cfg.spellCheckLanguage === 'string' ? cfg.spellCheckLanguage.trim() : '';
  return {
    config: { ...cfg, plugins, enablePlugins: !!cfg.enablePlugins, spellCheckLanguage: lang || undefined },
    path: raw?.path ?? null,
    exists: !!raw?.exists,
    pluginsEnabled: !!raw?.pluginsEnabled,
    headless: !!raw?.headless,
  };
}

/** Loads the config (once; later calls share the result). Never rejects. */
export function loadAppConfig(): Promise<AppConfigInfo> {
  if (!loading) {
    loading = (async () => {
      if (!isTauri()) return current;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        current = normalizeConfigInfo(await invoke<AppConfigInfo>('get_app_config'));
      } catch {
        /* keep defaults */
      }
      return current;
    })();
  }
  return loading;
}

/** The loaded config (defaults until loadAppConfig() resolves). */
export const appConfig = () => current;

/** Merges `patch` into the config file. */
export async function saveAppConfig(patch: Partial<AppConfig>): Promise<void> {
  await loadAppConfig();
  const config = { ...current.config, ...patch };
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_app_config', { config });
  }
  current = normalizeConfigInfo({ ...current, config, exists: current.exists || isTauri() });
}

export const spellCheckEnabled = () => current.config.spellCheck !== false;

/** `lang` for the text editor, so the WebView spell-checks in that language where it supports it. */
export const spellCheckLanguage = (): string | undefined => current.config.spellCheckLanguage;

/**
 * Plugin script paths the plugin runtime should load: the configured list,
 * but only when plugins are enabled (and never in a headless export).
 */
export const enabledPluginPaths = (): string[] => (current.pluginsEnabled && !current.headless ? current.config.plugins : []);

/** Pass as `backup` to saveFile / writeTextFile (src/io/native.ts). */
export const backupsEnabled = () => current.config.createBackups !== false;

export const autoUpdateCheckEnabled = () => current.config.checkForUpdates !== false && !current.headless;

/** Test hook. */
export function _resetAppConfig(info: AppConfigInfo = DEFAULT_APP_CONFIG) {
  current = info;
  loading = null;
}
