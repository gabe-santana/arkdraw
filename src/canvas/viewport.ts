import type { Vec } from '@/model/types';
import { useEditor } from '@/store/editor';

/** The canvas DOM element, registered by <Canvas>. Used to map client → world coordinates. */
let canvasEl: HTMLElement | null = null;

export const registerCanvasElement = (el: HTMLElement | null) => {
  canvasEl = el;
};

export const getCanvasElement = () => canvasEl;

export function clientToWorld(clientX: number, clientY: number): Vec {
  const r = canvasEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
  const { x, y, z } = useEditor.getState().camera;
  return { x: (clientX - r.left - x) / z, y: (clientY - r.top - y) / z };
}

export function worldToClient(p: Vec): Vec {
  const r = canvasEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
  const { x, y, z } = useEditor.getState().camera;
  return { x: p.x * z + x + r.left, y: p.y * z + y + r.top };
}

/** True if the client point is over the canvas (not a floating panel). */
export function isOverCanvas(clientX: number, clientY: number): boolean {
  const hit = document.elementFromPoint(clientX, clientY);
  return !!hit && !!canvasEl?.contains(hit);
}

/** World point at the visible center of the canvas, offset for floating panels. */
export function viewportCenter(): Vec {
  const { camera, viewport } = useEditor.getState();
  return { x: (viewport.w / 2 - camera.x) / camera.z, y: (viewport.h / 2 - camera.y) / camera.z };
}
