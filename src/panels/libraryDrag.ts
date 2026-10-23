/**
 * Drag from a library tile onto the canvas. A ghost preview follows the
 * pointer at the canvas' current zoom, so you see the real size before
 * dropping. A simple click inserts at the center of the view instead.
 *
 * draw.io parity:
 * - Click with exactly one unlocked shape selected: the new item goes to the
 *   right of it, connected, and becomes the selection (Alt-click skips this).
 * - Shift-drop onto a shape replaces that shape (keeps text, geometry and
 *   connections) when the source provides `replaceWith`.
 */
import type { DiagramElement, ShapeElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';
import { createConnector } from '@/model/defaults';
import { isHidden, isLocked, shapeRect, useEditor } from '@/store/editor';
import { clientToWorld, isOverCanvas, viewportCenter, worldToClient } from '@/canvas/viewport';
import { getShapeDef } from '@/shapes/registry';
import { containsPoint } from '@/lib/geometry';
import { replaceShapes, type ShapeTemplate } from '@/app/commands';
import { placeBeside } from './libraryPlacement';

export interface LibraryDragSource {
  /** Builds the elements to insert, centered on `at` (world coords). */
  create: (at: Vec) => DiagramElement[];
  /** World-space size, used to scale the ghost. */
  size: { w: number; h: number };
  /** Shift-drop onto a shape turns that shape into this. */
  replaceWith?: ShapeTemplate;
  /** Called after the item was inserted (click or drop) or used to replace a shape. */
  onUse?: () => void;
}

let clickCascade = 0;
let lastClickAt = 0;

export function startLibraryDrag(e: React.PointerEvent<HTMLElement>, src: LibraryDragSource) {
  if (e.button !== 0) return;
  const tile = e.currentTarget;
  const start = { x: e.clientX, y: e.clientY };
  let ghost: HTMLDivElement | null = null;
  let outline: HTMLDivElement | null = null;
  let last = start;

  // Shift held over a shape: outline it as the replace target.
  const updateReplace = (x: number, y: number, shift: boolean) => {
    const id = src.replaceWith && shift && isOverCanvas(x, y) ? replaceTargetAt(x, y) : null;
    const el = id ? (useEditor.getState().doc.elements[id] as ShapeElement) : null;
    if (ghost) ghost.style.opacity = el ? '0.4' : isOverCanvas(x, y) ? '0.9' : '0.45';
    if (!el) {
      outline?.remove();
      outline = null;
      return;
    }
    if (!outline) {
      outline = document.createElement('div');
      const tag = document.createElement('div');
      tag.textContent = 'Replace';
      tag.style.cssText =
        'position:absolute;left:-1.5px;top:-22px;padding:2px 6px;border-radius:6px;background:var(--accent);color:#fff;font-size:11px;font-weight:500;line-height:16px;white-space:nowrap;';
      outline.appendChild(tag);
      document.body.appendChild(outline);
    }
    const z = useEditor.getState().camera.z;
    const a = worldToClient({ x: el.x, y: el.y });
    outline.style.cssText = `position:fixed;z-index:199;pointer-events:none;left:${a.x - 3}px;top:${a.y - 3}px;width:${el.w * z + 6}px;height:${el.h * z + 6}px;border:1.5px dashed var(--accent);border-radius:8px;background:color-mix(in srgb, var(--accent) 7%, transparent);transform:rotate(${el.rotation ?? 0}deg);`;
  };
  const key = (ev: KeyboardEvent) => {
    if (ghost && ev.key === 'Shift') updateReplace(last.x, last.y, ev.type === 'keydown');
  };

  const move = (ev: PointerEvent) => {
    last = { x: ev.clientX, y: ev.clientY };
    if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
    if (!ghost) {
      ghost = document.createElement('div');
      const art = tile.querySelector('svg, img')?.cloneNode(true) as HTMLElement | null;
      const z = useEditor.getState().camera.z;
      ghost.style.cssText = `position:fixed;left:0;top:0;z-index:200;pointer-events:none;width:${src.size.w * z}px;height:${src.size.h * z}px;opacity:.85;transition:opacity .12s, transform .05s;filter:drop-shadow(0 8px 18px rgb(0 0 0 / .18));`;
      if (art) {
        art.removeAttribute('class');
        art.style.cssText = 'width:100%;height:100%;display:block;overflow:visible';
        ghost.appendChild(art);
      }
      document.body.appendChild(ghost);
      document.body.style.cursor = 'grabbing';
    }
    updateReplace(ev.clientX, ev.clientY, ev.shiftKey);
    ghost.style.transform = `translate(${ev.clientX - (src.size.w * useEditor.getState().camera.z) / 2}px, ${ev.clientY - (src.size.h * useEditor.getState().camera.z) / 2}px)`;
  };

  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
    document.body.style.cursor = '';
    if (ghost) {
      ghost.remove();
      outline?.remove();
      if (!isOverCanvas(ev.clientX, ev.clientY)) return;
      const target = src.replaceWith && ev.shiftKey ? replaceTargetAt(ev.clientX, ev.clientY) : null;
      if (target && src.replaceWith) {
        const s = useEditor.getState();
        s.setTool('select');
        replaceShapes([target], src.replaceWith);
        s.select([target]);
      } else insert(src.create(clientToWorld(ev.clientX, ev.clientY)));
      src.onUse?.();
      return;
    }
    // Click with one shape selected: add next to it, connected (Alt skips).
    const anchor = ev.altKey ? null : connectableSelection();
    if (anchor && insertConnected(anchor, src)) {
      src.onUse?.();
      return;
    }
    // Click: insert at the center of the view, cascading repeated clicks.
    const now = performance.now();
    clickCascade = now - lastClickAt < 4000 ? (clickCascade + 1) % 8 : 0;
    lastClickAt = now;
    const c = viewportCenter();
    insert(src.create({ x: c.x + clickCascade * 24, y: c.y + clickCascade * 24 }));
    src.onUse?.();
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);
}

/** The single selected, unlocked shape that a clicked library item would connect to. */
export function connectableSelection(): ShapeElement | null {
  const s = useEditor.getState();
  if (s.selection.length !== 1) return null;
  const el = s.doc.elements[s.selection[0]];
  return isShape(el) && !isLocked(s.doc, el) ? el : null;
}

/** Topmost unlocked shape under a client point (connectors and chrome block it). */
function replaceTargetAt(x: number, y: number): string | null {
  for (const node of document.elementsFromPoint(x, y)) {
    const id = node.closest('[data-el]')?.getAttribute('data-el');
    if (!id) continue;
    const s = useEditor.getState();
    const el = s.doc.elements[id];
    return isShape(el) && !isLocked(s.doc, el) ? id : null;
  }
  return null;
}

/** Places a single-shape item right of `anchor` and connects them. False if the item isn't a single shape. */
function insertConnected(anchor: ShapeElement, src: LibraryDragSource): boolean {
  const s = useEditor.getState();
  const obstacles = s.doc.order
    .map((id) => s.doc.elements[id])
    .filter(isShape)
    .filter((e) => e.id !== anchor.id && !isHidden(s.doc, e))
    .map(shapeRect);
  const spot = placeBeside(shapeRect(anchor), src.size, obstacles);
  const els = src.create({ x: spot.x + spot.w / 2, y: spot.y + spot.h / 2 });
  const el = els[0];
  if (els.length !== 1 || !isShape(el)) return false;
  const conn = createConnector({ elementId: anchor.id, side: 'right', x: 0, y: 0 }, { elementId: el.id, side: 'left', x: 0, y: 0 });
  adoptContainers([el]);
  s.setTool('select');
  s.beginInteraction();
  s.addElements([el, conn]);
  s.select([el.id]);
  s.endInteraction();
  return true;
}

/** Inserts elements, adopting the container under their center. */
function insert(els: DiagramElement[]) {
  const s = useEditor.getState();
  adoptContainers(els);
  s.setTool('select');
  s.addElements(els);
}

function adoptContainers(els: DiagramElement[]) {
  const s = useEditor.getState();
  const shapes = els.filter(isShape);
  for (const el of shapes) {
    if (el.containerId) continue;
    const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
    for (let i = s.doc.order.length - 1; i >= 0; i--) {
      const target = s.doc.elements[s.doc.order[i]] as ShapeElement;
      if (isShape(target) && getShapeDef(target.kind).container && containsPoint(target, c)) {
        el.containerId = target.id;
        break;
      }
    }
  }
}
