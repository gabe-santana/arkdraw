import { lazy, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@/canvas/Canvas';
import { TitleBar } from '@/chrome/TitleBar';
import { Toolbar, ZoomControls } from '@/chrome/Toolbar';
import { CommandPalette } from '@/chrome/CommandPalette';
import { ExportDialog } from '@/chrome/ExportDialog';
import { CanvasContextMenu, ConfirmDialog, ShortcutsDialog, Toasts } from '@/chrome/Overlays';
import { EditDataDialog, EditDiagramDialog, EditStyleDialog, FindPanel, ImportDialog } from '@/chrome/EditDialogs';
import { ConnectionPointsDialog } from '@/panels/ConnectionPointsDialog';
import { PageTabs } from '@/chrome/PageTabs';
import { TemplatesDialog } from '@/chrome/TemplatesDialog';
import { AutomationHost } from '@/automation/AutomationHost';
import { PwaUpdatePrompt } from '@/web/PwaUpdatePrompt';
import { DesktopUpdatePrompt } from '@/desktop/UpdatePrompt';
import { startDesktop } from '@/desktop/startup';
import { Outline } from '@/chrome/Outline';
import { Rulers } from '@/chrome/Rulers';
import { CommentsPanel, PreferencesDialog, RevisionsDialog } from '@/chrome/Collaboration';
import { startAutoRevisions } from '@/app/revisions';
import { insertImageFile } from '@/app/commands';
import { clientToWorld, isOverCanvas } from '@/canvas/viewport';
import { columnInset, DockColumn, DockDragGhost } from '@/chrome/Dock';
import { ExtensibilityHost } from '@/extensibility/Host';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { clearTextCache } from '@/lib/text';
import { onWebFontLoaded } from '@/text/fonts';
import { useShortcuts } from '@/app/useShortcuts';
import { useTheme } from '@/app/useTheme';
import { t, useLocale } from '@/i18n';
import { installPasteHandler } from '@/app/clipboard';
import { confirmDiscard, isDirty, loadOpenedFile, openPath, restoreRecovery, startRecovery } from '@/app/fileCommands';
import { onOpenFileRequest, takeLaunchFile, windowControls } from '@/io/native';
import '@/app/cliExport'; // `opendraw --export …` (desktop CLI); no-op otherwise

const AiSettingsHost = lazy(() => import('@/chrome/AiHost'));

/** Whether a dropped PNG/SVG carries a diagram (mxGraph or ArkDraw "editable" image). */
async function hasEmbeddedDiagram(bytes: Uint8Array, ext: string): Promise<boolean> {
  if (ext !== 'png' && ext !== 'svg') return false;
  const { IMPORTERS } = await import('@/io/import');
  const embedded = IMPORTERS.find((i) => i.id === 'embedded');
  return !!embedded?.detect?.(bytes, `x.${ext}`);
}

export default function App() {
  const dark = useTheme();
  const leftInset = useUi((s) => columnInset(s, 'left'));
  const rightInset = useUi((s) => columnInset(s, 'right'));
  const aiSettingsOpen = useUi((s) => s.aiSettingsOpen);
  const [fontsVersion, setFontsVersion] = useState(0);
  useShortcuts();

  useEffect(() => {
    const offs: Array<() => void> = [installPasteHandler(), startRecovery(), startAutoRevisions()];
    startDesktop(); // config.json, daily update check (desktop only)

    // Text is measured on canvas; re-measure once Inter has loaded.
    document.fonts?.ready.then(() => {
      clearTextCache();
      // Remount the canvas so text re-wraps with real metrics (the doc itself is untouched).
      setFontsVersion((n) => n + 1);
    });
    // Google Fonts picked for labels load on demand; re-measure when one arrives.
    offs.push(onWebFontLoaded(() => (clearTextCache(), setFontsVersion((n) => n + 1))));

    (async () => {
      const launch = await takeLaunchFile().catch(() => null);
      if (launch) await openPath(launch);
      else if (restoreRecovery()) {
        useUi.getState().toast(t('app.restoredUnsaved'), 'info');
        requestAnimationFrame(() => useEditor.getState().zoomToFit());
      }
      // Reveal the (initially hidden) native window after the first paint.
      requestAnimationFrame(() => windowControls.show());
    })();

    onOpenFileRequest((path) => void openPath(path)).then((off) => offs.push(off));
    windowControls.onCloseRequested(confirmDiscard, isDirty).then((off) => offs.push(off));

    return () => offs.forEach((off) => off());
  }, []);

  // Keep the window title in sync: "name — ArkDraw", with a dot when unsaved.
  const name = useEditor((s) => s.file.name);
  const dirty = useEditor((s) => s.doc !== s.file.savedDoc);
  useEffect(() => {
    windowControls.setTitle(`${dirty ? '• ' : ''}${name.replace(/\.opendraw$/i, '')} — ArkDraw`);
  }, [name, dirty]);

  // Remount the UI tree when the language changes, so every string (incl. ones
  // read outside React hooks) is re-rendered. Editor state lives in stores.
  const locale = useLocale();

  return (
    <div
      key={locale}
      className="flex h-full flex-col bg-app"
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={async (e) => {
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        e.preventDefault();
        // Plain images dropped on the canvas become image shapes; diagrams (incl. editable PNG/SVG) open.
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const bytes = new Uint8Array(await file.arrayBuffer());
        const isPlainImage = /^image\//.test(file.type) && !(await hasEmbeddedDiagram(bytes, ext));
        if (isPlainImage && isOverCanvas(e.clientX, e.clientY)) {
          await insertImageFile(file, clientToWorld(e.clientX, e.clientY));
          return;
        }
        if (await confirmDiscard()) await loadOpenedFile({ path: null, name: file.name, bytes });
      }}
    >
      <TitleBar />
      <main className="relative min-h-0 flex-1 px-1.5 pb-1.5">
        <div className="relative h-full overflow-hidden rounded-[14px] shadow-[0_0_0_1px_var(--line)]">
          <Canvas key={fontsVersion} dark={dark} />
          <Rulers />

          {/* Floating panels */}
          <div className="pointer-events-none absolute inset-0 p-2.5">
            <DockColumn side="left" />
            <DockColumn side="right" />
            <DockDragGhost />
            {/* Centered in the canvas area the side panels leave free, so it never runs into the zoom controls. */}
            <div
              data-od-toolbar
              className="absolute bottom-3.5 -translate-x-1/2 transition-[left] duration-300"
              style={{ left: `calc(${leftInset}px + (100% - ${leftInset + rightInset}px) / 2)` }}
            >
              <Toolbar />
            </div>
            <div className={cn('absolute bottom-3.5 flex flex-col items-end gap-2 transition-[right] duration-300', !rightInset && 'right-3.5')} style={rightInset ? { right: rightInset + 22 } : undefined}>
              <Outline />
              <ZoomControls />
            </div>
            <div className={cn('absolute bottom-3.5 transition-[left] duration-300', !leftInset && 'left-3.5')} style={leftInset ? { left: leftInset + 26 } : undefined}>
              <PageTabs />
            </div>
            <FindPanel />
            <CommentsPanel />
          </div>

          {aiSettingsOpen && (
            <Suspense fallback={null}>
              <AiSettingsHost />
            </Suspense>
          )}
        </div>
      </main>

      <CommandPalette />
      <ExportDialog />
      <ImportDialog />
      <EditDataDialog />
      <ConnectionPointsDialog />
      <EditStyleDialog />
      <EditDiagramDialog />
      <RevisionsDialog />
      <PreferencesDialog />
      <ExtensibilityHost />
      <ConfirmDialog />
      <ShortcutsDialog />
      <TemplatesDialog />
      <AutomationHost />
      <CanvasContextMenu />
      <Toasts />
      <PwaUpdatePrompt />
      <DesktopUpdatePrompt />
    </div>
  );
}
