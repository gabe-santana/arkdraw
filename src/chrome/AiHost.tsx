/**
 * Mounts the AI assistant (src/ai) and wires it to the editor store.
 * Loaded lazily, so the AI code costs nothing until first opened.
 */
import { AiPanel, AiSettingsDialog, type AiHostApi } from '@/ai';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { viewportCenter } from '@/canvas/viewport';

const host: AiHostApi = {
  getDoc: () => useEditor.getState().doc,
  getSelection: () => useEditor.getState().selection,
  insertElements: (elements) => {
    const s = useEditor.getState();
    s.addElements(elements);
    requestAnimationFrame(() => useEditor.getState().zoomToFit(elements.map((e) => e.id)));
  },
  replaceDoc: (elements) => {
    const s = useEditor.getState();
    // One undoable step: wipe + insert inside a single interaction.
    s.beginInteraction();
    s.setDoc({ elements: {}, order: [] });
    s.addElements(elements, { select: false });
    s.endInteraction();
    requestAnimationFrame(() => useEditor.getState().zoomToFit());
  },
  getViewportCenter: viewportCenter,
};

export default function AiHost() {
  const aiOpen = useUi((s) => s.aiOpen);
  const settingsOpen = useUi((s) => s.aiSettingsOpen);
  const set = useUi((s) => s.set);
  return (
    <>
      {aiOpen && (
        <div className="animate-slide-up pointer-events-auto absolute bottom-2.5 right-2.5 top-2.5 z-20 w-[380px] overflow-hidden rounded-2xl bg-panel shadow-pop">
          <AiPanel host={host} onClose={() => set({ aiOpen: false })} onOpenSettings={() => set({ aiSettingsOpen: true })} />
        </div>
      )}
      <AiSettingsDialog open={settingsOpen} onClose={() => set({ aiSettingsOpen: false })} />
    </>
  );
}
