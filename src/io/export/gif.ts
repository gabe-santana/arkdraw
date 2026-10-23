/**
 * Animated GIF export (docs/specs/animation.md §5): renders each frame with
 * the same SVG renderer used everywhere else, rasterizes it, and streams the
 * pixels to a worker that quantizes and encodes.
 */
import type { Doc } from '@/model/types';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { loopDuration, polylineLength, sequenceDuration } from '@/animation/timeline';
import { exportSubset, inlineIcons, renderSvg, type SvgExportOptions } from './svg';
import { svgToCanvas } from './raster';

export interface GifOptions extends SvgExportOptions {
  scale: number;
  fps: number;
  /** Seconds, or 'auto' for one seamless loop. */
  duration: number | 'auto';
  loop: boolean;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export function autoGifDuration(doc: Doc): number {
  return loopDuration(doc, (c) => polylineLength(connectorGeometryInDoc(c, doc.elements).samples));
}

/** Rough output size, for the warning in the export dialog. */
export function estimateGifBytes(width: number, height: number, frames: number): number {
  // Flat vector art compresses well; ~0.12 bytes/pixel per changed frame is typical.
  return Math.round(width * height * 0.12 * Math.max(1, frames * 0.6) + 2000);
}

export async function exportGif(doc: Doc, opts: GifOptions): Promise<Uint8Array> {
  const duration = opts.duration === 'auto' ? autoGifDuration(doc) : opts.duration;
  const frameCount = Math.max(1, Math.round(duration * opts.fps));
  const delay = Math.round(1000 / opts.fps);
  const seq = sequenceDuration(doc);
  const resolver = await inlineIcons(exportSubset(doc, opts.ids));
  const transparent = !opts.background;

  const canvas = document.createElement('canvas');
  const ctx = () => canvas.getContext('2d', { willReadFrequently: true })!;
  const frameAt = async (i: number) => {
    const rendered = renderSvg(doc, { ...opts, frame: { t: i / opts.fps, seq } }, resolver);
    await svgToCanvas(rendered, opts.scale, canvas);
    return ctx().getImageData(0, 0, canvas.width, canvas.height).data;
  };

  // Palette sample: a few evenly spaced frames, subsampled.
  const samples: Uint8ClampedArray[] = [];
  for (const k of [0, 0.25, 0.5, 0.75]) samples.push(await frameAt(Math.floor(k * frameCount)));
  const sample = new Uint8ClampedArray(samples.reduce((n, s) => n + s.length, 0));
  let off = 0;
  for (const s of samples) {
    sample.set(s, off);
    off += s.length;
  }

  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });
  const done = new Promise<Uint8Array>((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.type === 'done') resolve(e.data.bytes);
      else if (e.data.type === 'error') reject(new Error(e.data.message));
    };
    worker.onerror = (e) => reject(new Error(e.message));
  });

  try {
    worker.postMessage({ type: 'start', width: canvas.width, height: canvas.height, sample, transparent, loop: opts.loop }, [sample.buffer]);
    for (let i = 0; i < frameCount; i++) {
      if (opts.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const rgba = await frameAt(i);
      worker.postMessage({ type: 'frame', rgba, delay }, [rgba.buffer]);
      opts.onProgress?.((i + 1) / frameCount);
      // Yield so the progress bar paints.
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    worker.postMessage({ type: 'finish' });
    return await done;
  } finally {
    setTimeout(() => worker.terminate(), 0);
  }
}
