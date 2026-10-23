import { lazy, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@/canvas/Canvas';
import { TitleBar } from '@/chrome/TitleBar';
import { Toolbar, ZoomControls } from '@/chrome/Toolbar';
import { CommandPalette } from '@/chrome/CommandPalette';
import { ExportDialog } from '@/chrome/ExportDialog';
import { CanvasContextMenu, ConfirmDialog, ShortcutsDialog, Toasts } from '@/chrome/Overlays';
import { EditDataDialog, EditDiagramDialog, EditStyleDialog, FindPanel, ImportDialog } from '@/chrome/EditDialogs';
import { PageTabs } from '@/chrome/PageTabs';
import { TemplatesDialog } from '@/chrome/TemplatesDialog';
import { PwaUpdatePrompt } from '@/web/PwaUpdatePrompt';
import { Outline } from '@/chrome/Outline';
import { Rulers } from '@/chrome/Rulers';
import { CommentsPanel, PreferencesDialog, RevisionsDialog } from '@/chrome/Collaboration';
import { startAutoRevisions } from '@/app/revisions';
import { insertImageFile } from '@/app/commands';
import { clientToWorld, isOverCanvas } from '@/canvas/viewport';
import { LeftPanel } from '@/panels/LeftPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { LayersPanel } from '@/panels/LayersPanel';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { clearTextCache } from '@/lib/text';
import { useShortcuts } from '@/app/useShortcuts';
import { useTheme } from '@/app/useTheme';
import { installPasteHandler } from '@/app/clipboard';
import { confirmDiscard, isDirty, loadOpenedFile, openPath, restoreRecovery, startRecovery } from '@/app/fileCommands';
import { onOpenFileRequest, takeLaunchFile, windowControls } from '@/io/native';
import '@/app/cliExport'; // `opendraw --export …` (desktop CLI); no-op otherwise

const AiHost = lazy(() => import('@/chrome/AiHost'));

/** Whether a dropped PNG/SVG carries a diagram (draw.io or OpenDraw "editable" image). */
async function hasEmbeddedDiagram(bytes: Uint8Array, ext: string): Promise<boolean> {
  if (ext !== 'png' && ext !== 'svg') return false;
  const { IMPORTERS } = await import('@/io/import');
  const embedded = IMPORTERS.find((i) => i.id === 'embedded');
  return !!embedded?.detect?.(bytes, `x.${ext}`);
}

export default function App() {
  const dark = useTheme();
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);
  const aiOpen = useUi((s) => s.aiOpen);
  const aiSettingsOpen = useUi((s) => s.aiSettingsOpen);
  const [fontsVersion, setFontsVersion] = useState(0);
  useShortcuts();

  useEffect(() => {
    const offs: Array<() => void> = [installPasteHandler(), startRecovery(), startAutoRevisions()];

    // Text is measured on canvas; re-measure once Inter has loaded.
    document.fonts?.ready.then(() => {
      clearTextCache();
      // Remount the canvas so text re-wraps with real metrics (the doc itself is untouched).
      setFontsVersion((n) => n + 1);
    });

    (async () => {
      const launch = await takeLaunchFile().catch(() => null);
      if (launch) await openPath(launch);
      else if (restoreRecovery()) {
        useUi.getState().toast('Restored your unsaved diagram', 'info');
        requestAnimationFrame(() => useEditor.getState().zoomToFit());
      }
      // Reveal the (initially hidden) native window after the first paint.
      requestAnimationFrame(() => windowControls.show());
    })();

    onOpenFileRequest((path) => void openPath(path)).then((off) => offs.push(off));
    windowControls.onCloseRequested(confirmDiscard, isDirty).then((off) => offs.push(off));

    return () => offs.forEach((off) => off());
  }, []);

  // Keep the window title in sync: "name — OpenDraw", with a dot when unsaved.
  const name = useEditor((s) => s.file.name);
  const dirty = useEditor((s) => s.doc !== s.file.savedDoc);
  useEffect(() => {
    windowControls.setTitle(`${dirty ? '• ' : ''}${name.replace(/\.opendraw$/i, '')} — OpenDraw`);
  }, [name, dirty]);

  return (
    <div
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
            <div className={cn('absolute bottom-2.5 left-2.5 top-2.5 transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.3,1)]', !leftOpen && '-translate-x-[110%] opacity-0')}>
              {leftOpen && <LeftPanel />}
            </div>
            <div className={cn('absolute bottom-2.5 right-2.5 top-2.5 flex flex-col gap-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.3,1)]', !rightOpen && 'translate-x-[110%] opacity-0')}>
              {rightOpen && !aiOpen && (
                <>
                  <PropertiesPanel />
                  <div className="mt-auto" />
                  <LayersPanel />
                </>
              )}
            </div>
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2">
              <Toolbar />
            </div>
            <div className={cn('absolute bottom-3.5 flex flex-col items-end gap-2 transition-[right] duration-300', rightOpen || aiOpen ? (aiOpen ? 'right-[402px]' : 'right-[290px]') : 'right-3.5')}>
              <Outline />
              <ZoomControls />
            </div>
            <div className={cn('absolute bottom-3.5 transition-[left] duration-300', leftOpen ? 'left-[290px]' : 'left-3.5')}>
              <PageTabs />
            </div>
            <FindPanel />
            <CommentsPanel />
          </div>

          {(aiOpen || aiSettingsOpen) && (
            <Suspense fallback={null}>
              <AiHost />
            </Suspense>
          )}
        </div>
      </main>

      <CommandPalette />
      <ExportDialog />
      <ImportDialog />
      <EditDataDialog />
      <EditStyleDialog />
      <EditDiagramDialog />
      <RevisionsDialog />
      <PreferencesDialog />
      <ConfirmDialog />
      <ShortcutsDialog />
      <TemplatesDialog />
      <CanvasContextMenu />
      <Toasts />
      <PwaUpdatePrompt />
    </div>
  );
}
