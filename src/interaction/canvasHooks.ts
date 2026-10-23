/**
 * The single import surface useCanvasInteractions.ts uses for the editing &
 * interaction features (keeps that shared file's hook-ins to one line each).
 */
import type { ShapeElement } from '@/model/types';

export { canPick, pickMembers } from './groups';
export { isContainerShape } from './container';
export { finishFreehandStroke, strokePoint } from './freehand';
export { handleDoubleClick } from './hooks';

/** Resizing keeps proportions when any shape in the gesture has "Constrain proportions" on. */
export const keepsAspect = (shapes: Iterable<ShapeElement>) => {
  for (const s of shapes) if (s.lockAspect) return true;
  return false;
};
