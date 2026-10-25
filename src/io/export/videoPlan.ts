/**
 * The light half of the MP4 export: scene timing and frame size, for the
 * export dialog. The encoder itself (./video) loads only when exporting.
 */
import type { Doc } from '@/model/types';
import { sequenceDuration } from '@/animation/timeline';
import { autoGifDuration } from './gif';

export type VideoAspect = 'auto' | '16:9' | '9:16' | '1:1';

/** Crossfade between scenes, seconds. */
export const SCENE_FADE = 0.4;
/** H.264 encoders top out around 4K on the long side. */
const MAX_SIDE = 3840;
const RATIOS: Record<Exclude<VideoAspect, 'auto'>, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };

/** Whether this browser can encode video at all (WebCodecs). */
export const videoSupported = () => typeof VideoEncoder !== 'undefined';

/** Seconds a scene plays: its build sequence, or one loop of its animations (at least 3 s). */
export function sceneDuration(doc: Doc): number {
  return sequenceDuration(doc) || Math.max(3, autoGifDuration(doc));
}

export const videoDuration = (docs: Doc[]) => docs.reduce((n, d) => n + sceneDuration(d), 0);

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Frame size for scenes of these sizes: `aspect` (or theirs), `resolution` px on the short side. */
export function videoFrameSize(scenes: Array<{ width: number; height: number }>, o: { resolution: number; aspect: VideoAspect }) {
  const w = Math.max(1, ...scenes.map((s) => s.width));
  const h = Math.max(1, ...scenes.map((s) => s.height));
  const ratio = o.aspect === 'auto' ? w / h : RATIOS[o.aspect];
  let width = ratio >= 1 ? o.resolution * ratio : o.resolution;
  let height = ratio >= 1 ? o.resolution : o.resolution / ratio;
  const over = Math.max(width, height) / MAX_SIDE;
  if (over > 1) {
    width /= over;
    height /= over;
  }
  return { width: even(width), height: even(height) };
}

/** Rough MP4 size, for the export dialog (flat diagrams compress far better than footage). */
export const estimateVideoBytes = (width: number, height: number, fps: number, seconds: number) => Math.round((width * height * fps * seconds * 0.03) / 8);
