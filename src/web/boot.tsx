/**
 * Web-only startup: picks editor / viewer / embed mode from the URL, opens
 * shared diagrams, wires PWA file handling and registers the service worker.
 * Never called in the desktop app (main.tsx checks isTauri()).
 */
import { lazy, StrictMode, Suspense, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { confirmDiscard, loadOpenedFile, markUnsaved, restoreRecovery } from '@/app/fileCommands';
import { NON_HTTP_URL_ERROR, parseLaunchParams, resolvePageParam, urlWithoutSource, type LaunchParams } from './launch';
import { t } from '@/i18n';
import { resolveSource } from './loadDiagram';
import { draftHasContent, putBackRecoveryDraft, shieldRecoveryDraft, takeRecoveryDraft } from './recovery';
import { initEmbedMode } from './embed';
import { registerPwa } from './pwa';
import { applyLaunchOptions } from '@/automation/urlParams';

const Viewer = lazy(() => import('@/viewer/Viewer'));

export function bootWeb(root: Root, editor: ReactNode, href = location.href): LaunchParams {
  const launch = parseLaunchParams(href);
  void registerPwa();

  if (launch.mode === 'viewer') {
    root.render(
      <StrictMode>
        <Suspense fallback={null}>
          <Viewer launch={launch} />
        </Suspense>
      </StrictMode>,
    );
    return launch;
  }

  // Session-only theme override (not persisted to the user's preference).
  if (launch.theme) useUi.setState({ theme: launch.theme });
  // editor options: lang, libs, clibs, grid, math, ui.
  applyLaunchOptions(launch);

  if (launch.mode === 'embed') {
    shieldRecoveryDraft();
    root.render(editor);
    initEmbedMode({
      autosave: launch.autosave,
      parentOrigin: launch.parentOrigin,
      jsonProtocol: launch.jsonProtocol,
      saveButton: launch.saveButton,
      exitButton: launch.exitButton,
    });
    return launch;
  }

  // Editor. Keep the recovery draft away from the editor's auto-restore while a shared diagram loads.
  const draft = launch.source ? takeRecoveryDraft() : null;
  root.render(editor);
  installLaunchQueue();
  if (launch.source) void openShared(launch, draft);
  else if (launch.error) {
    const error = launch.error;
    setTimeout(() => useUi.getState().toast(error === NON_HTTP_URL_ERROR ? t('web.launch.onlyHttpUrls') : error, 'error'), 300);
  }
  return launch;
}

const fit = () => requestAnimationFrame(() => requestAnimationFrame(() => useEditor.getState().zoomToFit()));

async function openShared(launch: LaunchParams, draft: string | null) {
  const ui = useUi.getState();
  const keepDraft = () => {
    putBackRecoveryDraft(draft);
    if (draft && restoreRecovery()) {
      ui.toast(t('app.restoredUnsaved'), 'info');
      fit();
    }
  };
  let slow: ReturnType<typeof setTimeout> | undefined;
  if (launch.source!.kind === 'url') slow = setTimeout(() => ui.toast(t('viewer.loadingDiagram'), 'info'), 400);
  try {
    const { pages, name } = await resolveSource(launch.source!, launch.title);
    clearTimeout(slow);
    if (draftHasContent(draft)) {
      const choice = await ui.ask({
        title: t('web.shared.askTitle'),
        message: t('web.shared.askMessage'),
        confirmLabel: t('web.shared.confirm'),
        denyLabel: t('web.shared.deny'),
      });
      if (choice !== 'confirm') {
        history.replaceState(history.state, '', urlWithoutSource(location.href));
        keepDraft();
        return;
      }
    }
    const s = useEditor.getState();
    s.loadPages(pages, { path: null, name });
    markUnsaved();
    const start = resolvePageParam(pages, launch.page);
    if (start && start.id !== pages[0].id) useEditor.getState().switchPage(start.id);
    // A reload should restore the edited copy (via recovery), not re-open the link.
    history.replaceState(history.state, '', urlWithoutSource(location.href));
    fit();
  } catch (e) {
    clearTimeout(slow);
    keepDraft();
    ui.toast(t('web.shared.openFailed', { error: (e as Error)?.message ?? String(e) }), 'error');
  }
}

interface LaunchQueue {
  setConsumer: (cb: (params: { files?: Array<{ getFile: () => Promise<File> }> }) => void) => void;
}

/** Installed PWA: open `.opendraw` / `.drawio` files from the OS (manifest `file_handlers`). */
function installLaunchQueue() {
  const lq = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue;
  lq?.setConsumer(async ({ files }) => {
    const handle = files?.[0];
    if (!handle) return;
    const file = await handle.getFile();
    if (!(await confirmDiscard())) return;
    await loadOpenedFile({ path: null, name: file.name, contents: await file.text() });
  });
}
