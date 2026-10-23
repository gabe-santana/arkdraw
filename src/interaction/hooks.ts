/**
 * Entry points the canvas calls into (kept to single-line hook-ins in
 * useCanvasInteractions.ts).
 */
import type { DiagramElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';
import { useEditor } from '@/store/editor';
import { enterGroup, pickMembers } from './groups';
import { isFreehand, startEditPoints } from './pointEdit';
import { cellAtWorld, startCellEdit } from './tableCells';

/**
 * Double-click on an element: edit a freehand stroke's points, type into a
 * table cell, or enter a selected group. Returns true when handled.
 */
export function handleDoubleClick(el: DiagramElement, p: Vec): boolean {
  const s = useEditor.getState();
  if (isFreehand(el) && el.behavior?.editable !== false) {
    startEditPoints(el.id);
    return true;
  }
  if (isShape(el) && el.table) {
    const cell = cellAtWorld(el, p);
    if (!cell) return false;
    s.select([el.id]);
    startCellEdit(el.id, cell.r, cell.c);
    return true;
  }
  // Double-clicking a member of the selected group enters it.
  if (el.groupIds.length && s.selection.includes(el.id) && pickMembers(s.doc, el.id).length > 1) {
    enterGroup(el.id);
    return true;
  }
  return false;
}
