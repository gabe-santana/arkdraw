/**
 * Mounts the AI assistant (src/ai) and wires it to the editor store: the
 * right column's AI tab and the provider settings dialog. Loaded lazily, so
 * the AI code costs nothing until first opened.
 */
import { AiPanel, AiSettingsDialog, type AiHostApi } from '@/ai';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { viewportCenter } from '@/canvas/viewport';
import { AgentGlow, animateChanges, useAiActivity } from './AiActivity';
import { columnInset } from './Dock';
import { recordElementsUse } from '@/panels/libraryHistory';
import { startPlayback, stopPlayback } from '@/app/playback';
import { hasAnimation } from '@/animation/timeline';
import type { DiagramElement } from '@/model/types';

const hasMotion = (els: DiagramElement[]) => els.some((e) => (e.animation && e.animation.kind !== 'none') || !!e.reveal);

/**
 * When the assistant added or changed animations or build steps, play them on
 * the canvas right away (after its change reveal), so the user sees them.
 */
function playIfAnimated(changed: DiagramElement[]) {
  if (!hasMotion(changed)) {
    if (!hasAnimation(useEditor.getState().doc)) stopPlayback();
    return;
  }
  if (!useAiActivity.getState().applying) {
    startPlayback();
    return;
  }
  const unsubscribe = useAiActivity.subscribe((st) => {
    if (st.applying) return;
    unsubscribe();
    startPlayback();
  });
}

/** Fit the result in the canvas area the docked panels leave free. */
function fitInsets() {
  const ui = useUi.getState();
  return { left: columnInset(ui, 'left') + 48, right: columnInset(ui, 'right') + 48, top: 64, bottom: 96 };
}

const host: AiHostApi = {
  getDoc: () => useEditor.getState().doc,
  getSelection: () => useEditor.getState().selection,
  insertElements: (elements) => {
    const s = useEditor.getState();
    const before = s.doc;
    // Not selected: the new diagram is shown clean, without handles all over it.
    s.addElements(elements, { select: false });
    animateChanges(before, useEditor.getState().doc);
    void recordElementsUse(elements);
    playIfAnimated(elements);
    requestAnimationFrame(() => useEditor.getState().zoomToFit(elements.map((e) => e.id), fitInsets()));
  },
  replaceDoc: (elements) => {
    const s = useEditor.getState();
    const before = s.doc;
    // One undoable step: wipe + insert inside a single interaction.
    s.beginInteraction();
    s.setDoc({ elements: {}, order: [] });
    s.addElements(elements, { select: false });
    s.endInteraction();
    animateChanges(before, useEditor.getState().doc);
    void recordElementsUse(elements.filter((e) => !before.elements[e.id]));
    playIfAnimated(elements.filter((e) => JSON.stringify(e) !== JSON.stringify(before.elements[e.id])));
    requestAnimationFrame(() => useEditor.getState().zoomToFit(undefined, fitInsets()));
  },
  getViewportCenter: viewportCenter,
  undo: () => useEditor.getState().undo(),
  setActivity: (run) => useAiActivity.setState({ run }),
};

/** The AI tab of the right column. Stays mounted while hidden, so the conversation survives tab switches. */
export function AiTab() {
  // Re-render on canvas and selection changes: the panel adapts its hints to them.
  useEditor((s) => s.doc.order.length);
  useEditor((s) => s.selection.length);
  const set = useUi((s) => s.set);
  return (
    <>
      <AiPanel host={host} onOpenSettings={() => set({ aiSettingsOpen: true })} />
      <AgentGlow />
    </>
  );
}

export default function AiSettingsHost() {
  const open = useUi((s) => s.aiSettingsOpen);
  const set = useUi((s) => s.set);
  return <AiSettingsDialog open={open} onClose={() => set({ aiSettingsOpen: false })} />;
}
