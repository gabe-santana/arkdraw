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

const host: AiHostApi = {
  getDoc: () => useEditor.getState().doc,
  getSelection: () => useEditor.getState().selection,
  insertElements: (elements) => {
    const s = useEditor.getState();
    const before = s.doc;
    s.addElements(elements);
    animateChanges(before, useEditor.getState().doc);
    requestAnimationFrame(() => useEditor.getState().zoomToFit(elements.map((e) => e.id)));
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
    requestAnimationFrame(() => useEditor.getState().zoomToFit());
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
