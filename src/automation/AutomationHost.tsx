/**
 * Mounts everything in src/automation and src/storage that needs to live in
 * the editor tree: their dialogs, the link-action highlight overlay, Explore
 * mode's dimming, the start screen trigger, autosave and startup config.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '@/store/editor';
import { usePreferences } from '@/app/preferences';
import { worldToClient, getCanvasElement } from '@/canvas/viewport';
import { saveTarget } from '@/app/saveTarget';
import { Dialog } from '@/ui/Dialog';
import { isPristine, StartScreenBody } from '@/chrome/StartScreen';
import { useAutomationUi, openAutomationDialog } from './ui';
import { useHighlights } from './editorBridge';
import { exploreFrom } from './plugins';
import { mermaidGroupOf } from './mermaidRegen';
import { startAutosave } from './autosave';
import { applyConfig, loadConfig } from './configuration';
import { DataBody, PropertiesBody } from './DataDialogs';
import { SaveTemplateBody } from './TemplateTools';

const Dialogs = lazy(() => import('./Dialogs').then((m) => ({ default: m.LazyDialogs })));
const LibraryBody = lazy(() => import('@/storage/LibraryDialog').then((m) => ({ default: m.LibraryBody })));

const WIDTH: Record<string, string> = {
  data: 'w-[520px]',
  properties: 'w-[520px]',
  configuration: 'w-[640px]',
  layoutJson: 'w-[600px]',
  saveTemplate: 'w-[480px]',
  library: 'w-[760px] max-w-[94vw]',
  start: 'w-[820px] max-w-[94vw]',
  print: 'w-[480px]',
  embed: 'w-[640px] max-w-[94vw]',
  mermaid: 'w-[620px]',
  replay: 'w-[760px] max-w-[94vw]',
};

function DialogSwitch() {
  const dialog = useAutomationUi((s) => s.dialog);
  const close = useAutomationUi((s) => s.close);
  const body = (() => {
    switch (dialog?.kind) {
      case 'data':
        return <DataBody target={dialog.target} close={close} />;
      case 'properties':
        return <PropertiesBody close={close} />;
      case 'saveTemplate':
        return <SaveTemplateBody close={close} />;
      case 'start':
        return <StartScreenBody close={close} />;
      case 'library':
        return <LibraryBody close={close} />;
      case undefined:
        return null;
      default:
        return dialog ? <Dialogs dialog={dialog} close={close} /> : null;
    }
  })();
  return (
    <Dialog open={!!dialog} onClose={close} className={dialog ? WIDTH[dialog.kind] : undefined}>
      <Suspense fallback={<div className="h-40" />}>{body}</Suspense>
    </Dialog>
  );
}

/** Link-action highlights, drawn over the canvas in screen space. */
function HighlightOverlay() {
  const items = useHighlights((s) => s.items);
  useEditor((s) => s.camera); // follow pan / zoom
  if (!items.length) return null;
  const z = useEditor.getState().camera.z;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[40]">
      {items.flatMap((h) =>
        h.rects.map((r, i) => {
          const p = worldToClient({ x: r.x, y: r.y });
          return (
            <div
              key={`${h.key}-${i}`}
              className="animate-fade absolute rounded-lg"
              style={{ left: p.x - 6, top: p.y - 6, width: r.w * z + 12, height: r.h * z + 12, border: `2.5px solid ${h.color}`, background: `color-mix(in srgb, ${h.color} 14%, transparent)`, boxShadow: `0 0 0 4px color-mix(in srgb, ${h.color} 20%, transparent)` }}
            />
          );
        }),
      )}
    </div>,
    document.body,
  );
}

/** Explore mode: dims everything outside the focus neighbourhood; follows the selection. */
function ExploreController() {
  const explore = useHighlights((s) => s.explore);
  useEffect(() => {
    if (!explore) return;
    const off = useEditor.subscribe((s, prev) => {
      if (s.selection === prev.selection) return;
      const id = s.selection[0];
      if (s.selection.length === 1 && id !== explore.focus) exploreFrom(id);
    });
    const offPage = useEditor.subscribe((s, prev) => {
      if (s.activePageId !== prev.activePageId) useHighlights.setState({ explore: null });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useHighlights.setState({ explore: null });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      off();
      offPage();
      window.removeEventListener('keydown', onKey);
    };
  }, [explore]);
  if (!explore) return null;
  const keep = explore.ids.map((id) => `:not([data-el="${CSS.escape(id)}"])`).join('');
  return <style>{`[data-od-canvas] [data-el]${keep} { opacity: 0.12; transition: opacity .2s; }`}</style>;
}

export function AutomationHost() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const offs: Array<() => void> = [startAutosave()];
    void applyConfig(loadConfig(), { startup: true });

    // Mark the canvas so Explore's dimming is scoped to it.
    const tag = window.setInterval(() => {
      const el = getCanvasElement();
      if (el) {
        el.setAttribute('data-od-canvas', '');
        window.clearInterval(tag);
      }
    }, 200);
    offs.push(() => window.clearInterval(tag));

    // Double-clicking a selected Mermaid group reopens its source.
    const onDbl = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const canvas = getCanvasElement();
      if (!target || !canvas?.contains(target)) return;
      const id = target.closest?.('[data-el]')?.getAttribute('data-el');
      if (!id) return;
      const s = useEditor.getState();
      const g = mermaidGroupOf(s.doc, id);
      if (!g || !g.members.every((m) => s.selection.includes(m))) return;
      e.preventDefault();
      e.stopPropagation();
      openAutomationDialog({ kind: 'mermaid', groupId: id });
    };
    window.addEventListener('dblclick', onDbl, true);
    offs.push(() => window.removeEventListener('dblclick', onDbl, true));

    // Start screen: only when nothing was opened (launch file, recovery, share link, embed host…).
    const start = window.setTimeout(() => {
      const embedded = new URLSearchParams(location.search).has('embed') || !!saveTarget();
      if (!embedded && usePreferences.getState().startScreen !== false && isPristine() && !useAutomationUi.getState().dialog) openAutomationDialog({ kind: 'start' });
    }, 700);
    offs.push(() => window.clearTimeout(start));
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <>
      <DialogSwitch />
      {mounted && <HighlightOverlay />}
      <ExploreController />
    </>
  );
}
