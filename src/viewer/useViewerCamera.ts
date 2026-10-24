/**
 * Camera state and pointer gestures for the viewer: drag to pan, wheel to
 * pan, Ctrl/⌘+wheel or pinch (touch / trackpad / Safari gestures) to zoom,
 * double-click to zoom in, tap to activate links.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { clampZoom, type Camera } from './model';

export interface CameraApi {
  camera: Camera;
  ref: RefObject<Camera>;
  set: (c: Camera) => void;
  animateTo: (c: Camera, ms?: number) => void;
  /** Zoom by `factor` around a point in container coordinates (default: center). */
  zoomBy: (factor: number, at?: { x: number; y: number }, animate?: boolean) => void;
}

export function useCameraState(size: { w: number; h: number }): CameraApi {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const ref = useRef<Camera>(camera);
  const anim = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const set = useCallback((c: Camera) => {
    cancelAnimationFrame(anim.current);
    ref.current = c;
    setCamera(c);
  }, []);

  const animateTo = useCallback((target: Camera, ms = 240) => {
    cancelAnimationFrame(anim.current);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ref.current = target;
      setCamera(target);
      return;
    }
    const from = ref.current;
    // Timed on the frame clock alone (see the editor's animateCamera).
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      const k = 1 - Math.pow(1 - t, 3);
      // Interpolate zoom geometrically so it feels uniform.
      const z = from.z * Math.pow(target.z / from.z, k);
      const c = { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, z };
      ref.current = c;
      setCamera(c);
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }, animate = false) => {
      const c = ref.current;
      const p = at ?? { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 };
      const z = clampZoom(c.z * factor);
      const k = z / c.z;
      const next = { z, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k };
      if (animate) animateTo(next, 180);
      else set(next);
    },
    [animateTo, set],
  );

  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  return { camera, ref, set, animateTo, zoomBy };
}

export interface GestureCallbacks {
  /** A click/tap that didn't move. */
  onTap: (target: Element) => void;
  /** Mouse hover (null when a gesture starts). */
  onHover: (target: Element | null, clientX: number, clientY: number) => void;
  /** The user moved the camera themselves. */
  onInteract: () => void;
}

const TAP_SLOP = 4;

export function useViewerGestures(el: RefObject<HTMLElement | null>, cam: CameraApi, callbacks: GestureCallbacks) {
  const cb = useRef(callbacks);
  cb.current = callbacks;
  const camRef = useRef(cam);
  camRef.current = cam;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const cam = {
      ref: camRef.current.ref,
      set: (c: Camera) => camRef.current.set(c),
      zoomBy: (...a: Parameters<CameraApi['zoomBy']>) => camRef.current.zoomBy(...a),
    };
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let downTarget: Element | null = null;
    let pinch: { dist: number; mid: { x: number; y: number } } | null = null;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = node.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
      if ((e.target as Element).closest?.('[data-viewer-ui]')) return;
      const target = e.target as Element;
      node.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) {
        moved = 0;
        downTarget = target;
      } else {
        downTarget = null;
        pinch = null;
      }
      cb.current.onHover(null, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      const prev = pts.get(e.pointerId);
      if (!prev) {
        if (e.pointerType === 'mouse') cb.current.onHover(e.target as Element, e.clientX, e.clientY);
        return;
      }
      pts.set(e.pointerId, p);
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch) {
          const c = cam.ref.current;
          const z = clampZoom(c.z * (dist / pinch.dist));
          const k = z / c.z;
          cam.set({ z, x: mid.x - (pinch.mid.x - c.x) * k, y: mid.y - (pinch.mid.y - c.y) * k });
          cb.current.onInteract();
        }
        pinch = { dist, mid };
        moved = Infinity;
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > TAP_SLOP) {
        const c = cam.ref.current;
        cam.set({ ...c, x: c.x + dx, y: c.y + dy });
        node.dataset.panning = '';
        cb.current.onInteract();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      pinch = null;
      if (pts.size > 0) return;
      delete node.dataset.panning;
      if (e.type === 'pointerup' && moved <= TAP_SLOP && downTarget) cb.current.onTap(downTarget);
      downTarget = null;
    };

    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.('[data-viewer-ui]')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? node.clientHeight : 1;
      if (e.ctrlKey || e.metaKey) {
        const d = Math.max(-60, Math.min(60, e.deltaY * unit));
        cam.zoomBy(Math.exp(-d * 0.01), local(e));
      } else {
        const horizontal = e.shiftKey && !e.deltaX;
        const dx = (horizontal ? e.deltaY : e.deltaX) * unit;
        const dy = (horizontal ? 0 : e.deltaY) * unit;
        const c = cam.ref.current;
        cam.set({ ...c, x: c.x - dx, y: c.y - dy });
      }
      cb.current.onHover(null, 0, 0);
      cb.current.onInteract();
    };

    const onDblClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('[data-viewer-ui]')) return;
      cam.zoomBy(2, local(e), true);
      cb.current.onInteract();
    };

    // Safari trackpad pinch.
    let lastScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      lastScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      cam.zoomBy(g.scale / lastScale, local(g));
      lastScale = g.scale;
      cb.current.onInteract();
    };

    const onLeave = () => cb.current.onHover(null, 0, 0);

    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
    node.addEventListener('pointerleave', onLeave);
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('dblclick', onDblClick);
    node.addEventListener('gesturestart', onGestureStart);
    node.addEventListener('gesturechange', onGestureChange);
    return () => {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.removeEventListener('pointerleave', onLeave);
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('dblclick', onDblClick);
      node.removeEventListener('gesturestart', onGestureStart);
      node.removeEventListener('gesturechange', onGestureChange);
    };
  }, [el]);
}
