/**
 * Freehand tool glue: records pen pressure while drawing and turns the trace
 * into a smoothed `freehand` shape using the current brush settings.
 */
import type { Vec } from '@/model/types';
import { createShape } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { buildStroke, type StrokePoint } from './freehandPath';
import { useInteraction } from './store';

/** A world point tagged with pen pressure (pens only; mice report a constant 0.5). */
export function strokePoint(p: Vec, e: { pointerType?: string; pressure?: number }): StrokePoint {
  return e.pointerType === 'pen' && e.pressure !== undefined && e.pressure > 0 ? { ...p, p: e.pressure } : p;
}

/** Commits a drawn stroke as one shape (one undo step via addElements). */
export function finishFreehandStroke(raw: StrokePoint[]) {
  const { brush } = useInteraction.getState();
  const stroke = buildStroke(raw, brush.smoothing, brush.pressure);
  if (!stroke) return;
  const el = createShape('freehand', { x: stroke.x, y: stroke.y, w: stroke.w, h: stroke.h }, { fill: 'none', strokeWidth: brush.width, stroke: brush.color });
  el.points = stroke.points;
  useEditor.getState().addElements([el]);
}
