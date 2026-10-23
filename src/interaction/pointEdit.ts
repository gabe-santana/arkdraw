/**
 * Freehand "Edit points": a stroke's points stay editable after drawing.
 * Points are stored normalized to the shape box; edits work in the shape's
 * unrotated frame and refit the box so the untouched points don't move on
 * screen (rotation is around the box center, so a refit also shifts it).
 */
import type { ShapeElement, Vec } from '@/model/types';
import { rotatePoint } from '@/lib/geometry';
import { useEditor } from '@/store/editor';
import { useInteraction } from './store';
import type { StrokePoint } from './freehandPath';

export const isFreehand = (el: unknown): el is ShapeElement =>
  !!el && (el as ShapeElement).type === 'shape' && (el as ShapeElement).kind === 'freehand' && ((el as ShapeElement).points?.length ?? 0) >= 2;

const centerOf = (el: ShapeElement) => ({ x: el.x + el.w / 2, y: el.y + el.h / 2 });

/** Points in the unrotated frame (absolute coordinates, flips applied). */
export function framePoints(el: ShapeElement): StrokePoint[] {
  return (el.points ?? []).map((q: StrokePoint) => ({
    x: el.x + (el.flipH ? 1 - q.x : q.x) * el.w,
    y: el.y + (el.flipV ? 1 - q.y : q.y) * el.h,
    ...(q.p !== undefined ? { p: q.p } : {}),
  }));
}

/** Points as they appear on the canvas (rotation applied). */
export function worldPoints(el: ShapeElement): Vec[] {
  const c = centerOf(el);
  return framePoints(el).map((q) => rotatePoint(q, c, el.rotation ?? 0));
}

/** A world point mapped into the shape's unrotated frame. */
export function toFrame(el: ShapeElement, p: Vec): Vec {
  return rotatePoint(p, centerOf(el), -(el.rotation ?? 0));
}

/** Refits the box around new frame points (keeps rotation/flip; on-screen positions preserved). */
export function refit(el: ShapeElement, pts: StrokePoint[]): Partial<ShapeElement> {
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  let x = Math.min(...xs);
  let y = Math.min(...ys);
  const w = Math.max(4, Math.max(...xs) - x);
  const h = Math.max(4, Math.max(...ys) - y);
  const rot = el.rotation ?? 0;
  if (rot) {
    // Shift the new box so rotating around its center keeps points in place: t = (I − R)(c_old − c_new).
    const cOld = centerOf(el);
    const cNew = { x: x + w / 2, y: y + h / 2 };
    const d = { x: cOld.x - cNew.x, y: cOld.y - cNew.y };
    const rd = rotatePoint(d, { x: 0, y: 0 }, rot);
    x += d.x - rd.x;
    y += d.y - rd.y;
  }
  const points = pts.map((q) => {
    const fx = (q.x - Math.min(...xs)) / w;
    const fy = (q.y - Math.min(...ys)) / h;
    const n: StrokePoint = { x: el.flipH ? 1 - fx : fx, y: el.flipV ? 1 - fy : fy };
    if (q.p !== undefined) n.p = q.p;
    return n;
  });
  return { x, y, w, h, points };
}

export function movePoint(el: ShapeElement, index: number, world: Vec): Partial<ShapeElement> {
  const pts = framePoints(el);
  const q = toFrame(el, world);
  pts[index] = { ...pts[index], x: q.x, y: q.y };
  return refit(el, pts);
}

/** Inserts a point after `index` (on the segment index → index+1). */
export function insertPoint(el: ShapeElement, index: number, world: Vec): Partial<ShapeElement> {
  const pts = framePoints(el);
  const q = toFrame(el, world);
  const a = pts[index];
  const b = pts[index + 1] ?? a;
  const p: StrokePoint = { x: q.x, y: q.y };
  if (a.p !== undefined || b.p !== undefined) p.p = ((a.p ?? 0.5) + (b.p ?? 0.5)) / 2;
  pts.splice(index + 1, 0, p);
  return refit(el, pts);
}

export function deletePoint(el: ShapeElement, index: number): Partial<ShapeElement> | null {
  const pts = framePoints(el);
  if (pts.length <= 2) return null;
  pts.splice(index, 1);
  return refit(el, pts);
}

/** Enters point editing for a freehand shape. */
export function startEditPoints(id?: string) {
  const s = useEditor.getState();
  const target = id ?? s.selection[0];
  const el = s.doc.elements[target];
  if (!isFreehand(el)) return;
  if (s.selection.length !== 1 || s.selection[0] !== target) s.select([target]);
  useInteraction.getState().set({ editPointsId: target, activePoint: null });
}

export const stopEditPoints = () => useInteraction.getState().set({ editPointsId: null, activePoint: null });

export const canEditPoints = () => {
  const s = useEditor.getState();
  return s.selection.length === 1 && isFreehand(s.doc.elements[s.selection[0]]);
};

/** Deletes the active vertex (Del in point-edit mode). */
export function deleteActivePoint(): boolean {
  const { editPointsId, activePoint } = useInteraction.getState();
  if (!editPointsId || activePoint === null) return false;
  const s = useEditor.getState();
  const el = s.doc.elements[editPointsId];
  if (!isFreehand(el)) return false;
  const patch = deletePoint(el, activePoint);
  if (patch) s.updateElements({ [el.id]: patch });
  useInteraction.getState().set({ activePoint: patch ? Math.max(0, Math.min(activePoint, (patch.points?.length ?? 1) - 1)) : activePoint });
  return true;
}
