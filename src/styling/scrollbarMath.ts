/**
 * Geometry for the canvas overlay scrollbars (View → Scrollbars).
 *
 * The scrollable area is the diagram's bounds padded by half a viewport (so
 * any shape can be scrolled to the middle of the screen), unioned with the
 * current view so the thumb always sits inside its track.
 */
import type { Rect } from '@/model/types';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface AxisMetrics {
  /** World range covered by the whole track. */
  min: number;
  max: number;
  /** Visible world range. */
  viewMin: number;
  viewSize: number;
  /** Thumb position and length in track pixels. */
  thumbStart: number;
  thumbSize: number;
  /** False when everything is already visible (the bar can hide). */
  scrollable: boolean;
}

const MIN_THUMB = 28;

export function axisMetrics(contentMin: number | null, contentMax: number | null, viewMin: number, viewSize: number, track: number): AxisMetrics {
  const pad = viewSize / 2;
  const min = Math.min(viewMin, contentMin === null ? viewMin : contentMin - pad);
  const max = Math.max(viewMin + viewSize, contentMax === null ? viewMin + viewSize : contentMax + pad);
  const total = Math.max(1e-6, max - min);
  const size = Math.max(MIN_THUMB, Math.min(track, (viewSize / total) * track));
  // Leftover track space maps to the scrollable world range.
  const free = Math.max(0, track - size);
  const scrollRange = Math.max(1e-6, total - viewSize);
  const start = free * ((viewMin - min) / scrollRange);
  return {
    min,
    max,
    viewMin,
    viewSize,
    thumbStart: Math.max(0, Math.min(free, start)),
    thumbSize: size,
    scrollable: total - viewSize > 0.5,
  };
}

export function scrollMetrics(content: Rect | null, camera: Camera, viewport: { w: number; h: number }, track: { w: number; h: number }) {
  const view = { x: -camera.x / camera.z, y: -camera.y / camera.z, w: viewport.w / camera.z, h: viewport.h / camera.z };
  return {
    x: axisMetrics(content ? content.x : null, content ? content.x + content.w : null, view.x, view.w, track.w),
    y: axisMetrics(content ? content.y : null, content ? content.y + content.h : null, view.y, view.h, track.h),
  };
}

/** New visible-range start after dragging the thumb `dpx` track pixels from `start` metrics. */
export function dragTo(start: AxisMetrics, track: number, dpx: number): number {
  const free = Math.max(1e-6, track - start.thumbSize);
  const scrollRange = start.max - start.min - start.viewSize;
  const next = start.viewMin + (dpx / free) * scrollRange;
  return Math.max(start.min, Math.min(start.max - start.viewSize, next));
}
