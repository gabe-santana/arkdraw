/**
 * Desktop bridge (src/desktop/*, src/io/native.ts additions) with the Tauri
 * APIs mocked: windows, config.json, updater, binary reads and .bkp saves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  invoke: vi.fn<(cmd: string, args?: unknown, opts?: unknown) => Promise<unknown>>(),
  check: vi.fn(),
  listen: vi.fn(async () => () => {}),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: h.invoke }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: h.check }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ listen: h.listen }) }));

import { currentWindowLabel, openNewWindow, windowScopedKey } from '@/desktop/windows';
import {
  _resetAppConfig, appConfig, backupsEnabled, enabledPluginPaths, loadAppConfig, normalizeConfigInfo, saveAppConfig,
  spellCheckEnabled, spellCheckLanguage,
} from '@/desktop/config';
import { CHECK_INTERVAL_MS, checkForUpdates, installUpdate, shouldAutoCheck, useUpdater } from '@/desktop/updater';
import { isBinaryName, onOpenFileRequest, readAnyFile, saveFile, writeTextFile } from '@/io/native';
import { useUi } from '@/store/ui';

type W = { __TAURI_INTERNALS__?: unknown };
const setDesktop = (label: string | null) => {
  if (label) (window as unknown as W).__TAURI_INTERNALS__ = { metadata: { currentWindow: { label } } };
  else delete (window as unknown as W).__TAURI_INTERNALS__;
};

beforeEach(() => {
  h.invoke.mockReset();
  h.check.mockReset();
  h.listen.mockClear();
  _resetAppConfig();
  useUpdater.setState({ status: 'idle', version: null, notes: null, progress: null, error: null, dismissed: false });
  useUi.setState({ toasts: [] });
});
afterEach(() => setDesktop(null));

describe('windows', () => {
  it('reads the window label synchronously and scopes keys per window', () => {
    expect(currentWindowLabel()).toBe('main');
    expect(windowScopedKey('arkdraw:recovery')).toBe('arkdraw:recovery');
    setDesktop('editor-3');
    expect(currentWindowLabel()).toBe('editor-3');
    expect(windowScopedKey('arkdraw:recovery')).toBe('arkdraw:recovery:editor-3');
  });

  it('asks the backend for a new window, optionally with a file', async () => {
    setDesktop('main');
    h.invoke.mockResolvedValue('editor-2');
    await openNewWindow('/d/a.drawio');
    expect(h.invoke).toHaveBeenCalledWith('open_new_window', { path: '/d/a.drawio' });
    await openNewWindow();
    expect(h.invoke).toHaveBeenLastCalledWith('open_new_window', { path: null });
  });

  it('listens for OS open requests on the current window only', async () => {
    setDesktop('main');
    const cb = vi.fn();
    await onOpenFileRequest(cb);
    expect(h.listen).toHaveBeenCalledWith('arkdraw://open-file', expect.any(Function));
  });
});

describe('config.json', () => {
  it('normalizes hand-edited values', () => {
    const info = normalizeConfigInfo({
      config: { plugins: ['/a.js', 3 as unknown as string, ' '], enablePlugins: 1 as unknown as boolean, spellCheckLanguage: '  de-DE ', custom: true },
      path: '/cfg/config.json',
      pluginsEnabled: true,
    });
    expect(info.config.plugins).toEqual(['/a.js']);
    expect(info.config.enablePlugins).toBe(true);
    expect(info.config.spellCheckLanguage).toBe('de-DE');
    expect(info.config.custom).toBe(true);
    expect(info.headless).toBe(false);
  });

  it('stays at the defaults in the browser', async () => {
    const info = await loadAppConfig();
    expect(h.invoke).not.toHaveBeenCalled();
    expect(info.config.plugins).toEqual([]);
    expect(spellCheckEnabled()).toBe(true);
    expect(spellCheckLanguage()).toBeUndefined();
    expect(backupsEnabled()).toBe(true);
  });

  it('loads once, gates plugins on the flag and exposes the spell-check language', async () => {
    setDesktop('main');
    h.invoke.mockResolvedValue({
      config: { plugins: ['/p/one.js'], enablePlugins: false, spellCheck: false, spellCheckLanguage: 'fr', createBackups: false },
      path: '/cfg/config.json',
      exists: true,
      pluginsEnabled: false,
      headless: false,
    });
    await Promise.all([loadAppConfig(), loadAppConfig()]);
    expect(h.invoke).toHaveBeenCalledTimes(1);
    expect(h.invoke).toHaveBeenCalledWith('get_app_config');
    expect(enabledPluginPaths()).toEqual([]);
    expect(spellCheckEnabled()).toBe(false);
    expect(spellCheckLanguage()).toBe('fr');
    expect(backupsEnabled()).toBe(false);

    _resetAppConfig(normalizeConfigInfo({ ...appConfig(), pluginsEnabled: true }));
    expect(enabledPluginPaths()).toEqual(['/p/one.js']);
    _resetAppConfig(normalizeConfigInfo({ ...appConfig(), pluginsEnabled: true, headless: true }));
    expect(enabledPluginPaths()).toEqual([]);
  });

  it('merges and writes changes', async () => {
    setDesktop('main');
    h.invoke.mockImplementation(async (cmd) =>
      cmd === 'get_app_config' ? { config: { plugins: [], enablePlugins: false, keep: 1 }, path: '/c.json', pluginsEnabled: false, headless: false } : undefined,
    );
    await saveAppConfig({ spellCheckLanguage: 'pt-BR' });
    expect(h.invoke).toHaveBeenCalledWith('set_app_config', { config: { plugins: [], enablePlugins: false, keep: 1, spellCheckLanguage: 'pt-BR' } });
    expect(spellCheckLanguage()).toBe('pt-BR');
  });
});

describe('updater', () => {
  it('checks at most once a day', () => {
    const now = 1_000_000_000_000;
    expect(shouldAutoCheck(null, now)).toBe(true);
    expect(shouldAutoCheck(now - 1000, now)).toBe(false);
    expect(shouldAutoCheck(now - CHECK_INTERVAL_MS, now)).toBe(true);
    expect(shouldAutoCheck(now + 60_000, now)).toBe(true); // clock went backwards
    expect(shouldAutoCheck(Number.NaN, now)).toBe(true);
  });

  it('reports "up to date" only for manual checks', async () => {
    setDesktop('main');
    h.check.mockResolvedValue(null);
    expect(await checkForUpdates({ quiet: true })).toBeNull();
    expect(useUi.getState().toasts).toHaveLength(0);
    await checkForUpdates();
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/up to date/);
  });

  it('swallows errors in quiet checks', async () => {
    setDesktop('main');
    h.check.mockRejectedValue(new Error('offline'));
    await checkForUpdates({ quiet: true });
    expect(useUpdater.getState().status).toBe('idle');
    expect(useUi.getState().toasts).toHaveLength(0);
    await checkForUpdates();
    expect(useUpdater.getState().status).toBe('error');
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/offline/);
  });

  it('downloads, installs and restarts', async () => {
    setDesktop('main');
    const downloadAndInstall = vi.fn(async (cb: (e: unknown) => void) => {
      cb({ event: 'Started', data: { contentLength: 100 } });
      cb({ event: 'Progress', data: { chunkLength: 40 } });
      expect(useUpdater.getState().progress).toBeCloseTo(0.4);
      cb({ event: 'Finished' });
    });
    h.check.mockResolvedValue({ version: '9.9.9', body: 'Notes', downloadAndInstall, close: vi.fn(async () => {}) });
    expect(await checkForUpdates({ quiet: true })).toBe('9.9.9');
    expect(useUpdater.getState()).toMatchObject({ status: 'available', version: '9.9.9', notes: 'Notes' });
    await installUpdate();
    expect(downloadAndInstall).toHaveBeenCalled();
    expect(h.invoke).toHaveBeenCalledWith('restart_app');
    expect(useUpdater.getState().status).toBe('installing');
  });
});

describe('native files', () => {
  it('reads binary formats as bytes and the rest as text', async () => {
    setDesktop('main');
    expect(isBinaryName('C:\\x\\Plan.VSDX')).toBe(true);
    expect(isBinaryName('a.drawio')).toBe(false);
    h.invoke.mockImplementation(async (cmd) =>
      cmd === 'read_binary_file' ? new Uint8Array([80, 75, 3, 4]).buffer : { path: '/d/a.drawio', name: 'a.drawio', contents: '<mxfile/>' },
    );
    const bin = await readAnyFile('/d/Plan.vsdx');
    expect(h.invoke).toHaveBeenCalledWith('read_binary_file', { path: '/d/Plan.vsdx' });
    expect(bin).toMatchObject({ path: null, name: 'Plan.vsdx' });
    expect('bytes' in bin && Array.from(bin.bytes)).toEqual([80, 75, 3, 4]);
    const text = await readAnyFile('/d/a.drawio');
    expect(h.invoke).toHaveBeenLastCalledWith('read_text_file', { path: '/d/a.drawio' });
    expect(text).toMatchObject({ contents: '<mxfile/>' });
  });

  it('passes the .bkp option to write_text_file (off by default)', async () => {
    setDesktop('main');
    h.invoke.mockResolvedValue(undefined);
    await writeTextFile('/d/a.arkdraw', '{}', { backup: true });
    expect(h.invoke).toHaveBeenLastCalledWith('write_text_file', { path: '/d/a.arkdraw', contents: '{}', backup: true });
    await saveFile('{}', { path: '/d/a.arkdraw', defaultName: 'a.arkdraw', filters: [], mime: 'application/json' });
    expect(h.invoke).toHaveBeenLastCalledWith('write_text_file', { path: '/d/a.arkdraw', contents: '{}', backup: false });
    await saveFile('{}', { path: '/d/a.arkdraw', defaultName: 'a.arkdraw', filters: [], mime: 'application/json', backup: true });
    expect(h.invoke).toHaveBeenLastCalledWith('write_text_file', { path: '/d/a.arkdraw', contents: '{}', backup: true });
  });
});

describe('opening files on the desktop', () => {
  it('offers a new window when the current diagram has unsaved changes', async () => {
    setDesktop('main');
    const { useEditor } = await import('@/store/editor');
    const { createShape } = await import('@/model/defaults');
    const { openPath } = await import('@/app/fileCommands');
    useEditor.getState().newDoc();
    useEditor.getState().addElements([createShape('rect', { x: 0, y: 0, w: 80, h: 40 })]);
    h.invoke.mockResolvedValue('editor-2');

    const done = openPath('/d/other.drawio');
    await vi.waitFor(() => expect(useUi.getState().confirm?.confirmLabel).toBe('Open in new window'));
    useUi.getState().confirm!.resolve('confirm');
    await done;
    expect(h.invoke).toHaveBeenCalledWith('open_new_window', { path: '/d/other.drawio' });
    expect(h.invoke).not.toHaveBeenCalledWith('read_text_file', expect.anything());
    // The current document is untouched.
    expect(useEditor.getState().doc.order).toHaveLength(1);
  });
});
