/**
 * Touchscreen gestures on the editor canvas: two-finger pinch-zoom and pan,
 * and long-press for the context menu. Runs as native capture listeners on
 * the canvas element so it can take over a gesture before the canvas'
 * pointer state machine sees it (the first finger's drag is cancelled with a
 * synthetic pointercancel when the second finger lands).
 */
import { useEditor } from '@/store/editor';

const LONG_PRESS_MS = 550;
const MOVE_SLOP = 8;

export function installTouchGestures(canvas: HTMLElement): () => void {
  const touches = new Map<number, { x: number; y: number; x0: number; y0: number; target: EventTarget | null }>();
  /** Pointers that belong to a pinch (or a fired long-press); the canvas never sees them. */
  const swallowed = new Set<number>();
  let pinch: { dist: number; mid: { x: number; y: number } } | null = null;
  let pressTimer = 0;
  let nativeMenu = false;

  const local = (x: number, y: number) => {
    const r = canvas.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };
  const pair = () => {
    const [a, b] = [...touches.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const cancelPress = () => {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
  };
  const cancelCanvasPointer = (id: number, t: { x: number; y: number }) => {
    canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', clientX: t.x, clientY: t.y, bubbles: true }));
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, target: e.target });
    if (touches.size === 2) {
      cancelPress();
      // Second finger: end whatever the first finger started and pinch instead.
      for (const [id, t] of touches) {
        if (id !== e.pointerId && !swallowed.has(id)) cancelCanvasPointer(id, t);
        swallowed.add(id);
      }
      const s = useEditor.getState();
      if (s.interactionBase) s.endInteraction();
      pinch = pair();
      e.stopPropagation();
      return;
    }
    if (touches.size > 2) {
      swallowed.add(e.pointerId);
      e.stopPropagation();
      return;
    }
    nativeMenu = false;
    cancelPress();
    const id = e.pointerId;
    pressTimer = window.setTimeout(() => {
      pressTimer = 0;
      const t = touches.get(id);
      if (!t || nativeMenu || touches.size !== 1) return;
      cancelCanvasPointer(id, t);
      swallowed.add(id);
      // Re-use the canvas' own right-click handling (selects what's under the finger).
      (t.target as Element | null)?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: t.x, clientY: t.y, button: 2 }));
    }, LONG_PRESS_MS);
  };

  const move = (e: PointerEvent) => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    t.x = e.clientX;
    t.y = e.clientY;
    if (pressTimer && Math.hypot(t.x - t.x0, t.y - t.y0) > MOVE_SLOP) cancelPress();
    if (pinch && touches.size >= 2) {
      const next = pair();
      const s = useEditor.getState();
      const m = local(next.mid.x, next.mid.y);
      s.panBy(next.mid.x - pinch.mid.x, next.mid.y - pinch.mid.y);
      if (pinch.dist > 0) s.zoomAt(m, useEditor.getState().camera.z * (next.dist / pinch.dist));
      pinch = next;
    }
    if (swallowed.has(e.pointerId)) e.stopPropagation();
  };

  const up = (e: PointerEvent) => {
    // Our own synthetic pointercancel is meant for the canvas, not for gesture tracking.
    if (!e.isTrusted || !touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    cancelPress();
    if (touches.size < 2) pinch = null;
    if (swallowed.has(e.pointerId)) {
      swallowed.delete(e.pointerId);
      e.stopPropagation();
    }
  };

  // Mobile browsers fire their own contextmenu on long-press; don't open a second one.
  const onNativeMenu = (e: Event) => {
    if (e.isTrusted && touches.size) {
      nativeMenu = true;
      cancelPress();
    }
  };

  canvas.addEventListener('pointerdown', down, true);
  canvas.addEventListener('pointermove', move, true);
  canvas.addEventListener('pointerup', up, true);
  canvas.addEventListener('pointercancel', up, true);
  canvas.addEventListener('contextmenu', onNativeMenu, true);
  return () => {
    cancelPress();
    canvas.removeEventListener('pointerdown', down, true);
    canvas.removeEventListener('pointermove', move, true);
    canvas.removeEventListener('pointerup', up, true);
    canvas.removeEventListener('pointercancel', up, true);
    canvas.removeEventListener('contextmenu', onNativeMenu, true);
  };
}
