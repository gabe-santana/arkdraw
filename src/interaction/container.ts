/**
 * Containers: any shape can carry children (draw.io's "Container" checkbox).
 * A shape is a container when its kind says so (`ShapeDef.container`) unless
 * the element overrides it with `container: true | false`.
 */
import type { Doc, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { useEditor } from '@/store/editor';

/** Effective container flag of a shape. */
export function isContainerShape(el: ShapeElement | undefined): boolean {
  if (!el) return false;
  return el.container ?? !!getShapeDef(el.kind).container;
}

/** Shapes fully inside `c` that sit above it, aren't parented yet and aren't `c` itself. */
export function shapesInside(doc: Doc, c: ShapeElement): string[] {
  const at = doc.order.indexOf(c.id);
  return doc.order.filter((id, i) => {
    const el = doc.elements[id];
    if (!isShape(el) || el.id === c.id || el.containerId || i < at) return false;
    return el.x >= c.x && el.y >= c.y && el.x + el.w <= c.x + c.w && el.y + el.h <= c.y + c.h;
  });
}

/**
 * Turns shapes into containers (adopting shapes already sitting on them) or
 * back into plain shapes (releasing their children). One undo step.
 */
export function setContainer(ids: string[], on: boolean) {
  const s = useEditor.getState();
  s.beginInteraction();
  // Expand collapsed shapes that stop being containers so their children reappear.
  if (!on) for (const id of ids) if ((s.doc.elements[id] as ShapeElement | undefined)?.collapsed) s.toggleCollapse(id);
  const doc = useEditor.getState().doc;
  const patches: Record<string, Partial<ShapeElement>> = {};
  for (const id of ids) {
    const el = doc.elements[id];
    if (!isShape(el)) continue;
    const byKind = !!getShapeDef(el.kind).container;
    patches[id] = { container: on === byKind ? undefined : on };
    if (on) {
      for (const child of shapesInside(doc, el)) if (!ids.includes(child)) patches[child] = { ...patches[child], containerId: id };
    } else {
      for (const cid of doc.order) {
        const child = doc.elements[cid];
        if (isShape(child) && child.containerId === id) patches[cid] = { ...patches[cid], containerId: undefined };
      }
    }
  }
  s.updateElements(patches);
  s.endInteraction();
}
