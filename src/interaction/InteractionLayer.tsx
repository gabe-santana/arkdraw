/**
 * Everything the editing & interaction features draw on top of the canvas,
 * plus their lifecycle wiring (keyboard layer, touch gestures, and resetting
 * transient modes when the selection, page or document changes underneath).
 * Mounted once inside <Canvas>.
 */
import { useEffect, useRef } from 'react';
import { useEditor } from '@/store/editor';
import { GroupIsolation } from '@/canvas/GroupIsolation';
import { useInteraction } from './store';
import { installKeyboardNavigation, describeSelection } from './navigation';
import { installTouchGestures } from './touch';
import { PointEditor } from './PointEditor';
import { TableCellEditor, TableCellOverlay } from './TableCellLayer';
import { BrushPopover } from './BrushPopover';

/** Drops modes whose target went away (selection change, undo, page switch). */
function installWatchers(): () => void {
  let page = useEditor.getState().activePageId;
  return useEditor.subscribe((s) => {
    const st = useInteraction.getState();
    const patch: Parameters<typeof st.set>[0] = {};
    if (s.activePageId !== page) {
      page = s.activePageId;
      Object.assign(patch, { isolation: [], editPointsId: null, activePoint: null, cell: null, editingCell: null });
    }
    if (st.isolation.length) {
      // Leave groups that no longer exist (ungrouped, deleted, undone).
      let keep = st.isolation.length;
      while (keep > 0 && !s.doc.order.some((id) => s.doc.elements[id]?.groupIds.includes(st.isolation[keep - 1]))) keep--;
      if (keep !== st.isolation.length) patch.isolation = st.isolation.slice(0, keep);
    }
    if (st.editPointsId && (s.selection.length !== 1 || s.selection[0] !== st.editPointsId || !s.doc.elements[st.editPointsId])) {
      Object.assign(patch, { editPointsId: null, activePoint: null });
    }
    if (st.cell && (s.selection.length !== 1 || s.selection[0] !== st.cell.id || !s.doc.elements[st.cell.id])) patch.cell = null;
    if (st.editingCell && !s.doc.elements[st.editingCell.id]) patch.editingCell = null;
    if (Object.keys(patch).length) st.set(patch);
  });
}

/** Polite announcements of selection changes for screen readers. */
function LiveRegion() {
  const text = useEditor((s) => describeSelection(s.doc, s.selection));
  return (
    <div aria-live="polite" role="status" className="sr-only">
      {text}
    </div>
  );
}

export function InteractionLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = ref.current?.closest<HTMLElement>('[data-canvas]');
    const offs = [installKeyboardNavigation(), installWatchers(), canvas ? installTouchGestures(canvas) : () => {}];
    return () => offs.forEach((off) => off());
  }, []);
  return (
    <div ref={ref} className="contents">
      <TableCellOverlay />
      <PointEditor />
      <TableCellEditor />
      <GroupIsolation />
      <BrushPopover />
      <LiveRegion />
    </div>
  );
}
