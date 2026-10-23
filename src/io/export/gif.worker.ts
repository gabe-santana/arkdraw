/// <reference lib="webworker" />
/**
 * GIF encoder worker (docs/specs/animation.md §5).
 *
 * Protocol:
 *   → { type: 'start', width, height, sample: Uint8ClampedArray, transparent, loop }
 *   → { type: 'frame', rgba: Uint8ClampedArray, delay }      (repeated)
 *   → { type: 'finish' }
 *   ← { type: 'progress', frames } | { type: 'done', bytes: Uint8Array } | { type: 'error', message }
 *
 * One global palette is quantized up front from sampled frames, so colors
 * stay stable across frames (no flicker). Consecutive identical frames are
 * merged by extending the previous frame's delay.
 */
import { GIFEncoder, applyPalette, quantize } from 'gifenc';

type Palette = number[][];

let gif: ReturnType<typeof GIFEncoder> | null = null;
let palette: Palette = [];
let format: 'rgb565' | 'rgba4444' = 'rgb565';
let width = 0;
let height = 0;
let transparentIndex = -1;
let loop = true;
let pending: { index: Uint8Array; delay: number } | null = null;
let first = true;
let frames = 0;

function flush() {
  if (!pending || !gif) return;
  gif.writeFrame(pending.index, width, height, {
    palette: first ? palette : undefined,
    delay: pending.delay,
    repeat: first ? (loop ? 0 : -1) : undefined,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  });
  first = false;
  pending = null;
}

function same(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  try {
    if (msg.type === 'start') {
      width = msg.width;
      height = msg.height;
      loop = msg.loop;
      format = msg.transparent ? 'rgba4444' : 'rgb565';
      palette = quantize(msg.sample, 256, { format, oneBitAlpha: msg.transparent, clearAlpha: true });
      transparentIndex = msg.transparent ? palette.findIndex((c) => c[3] === 0) : -1;
      gif = GIFEncoder();
      first = true;
      pending = null;
      frames = 0;
    } else if (msg.type === 'frame') {
      const index = applyPalette(msg.rgba, palette, format);
      if (pending && same(pending.index, index)) pending.delay += msg.delay;
      else {
        flush();
        pending = { index, delay: msg.delay };
      }
      frames++;
      if (frames % 5 === 0) self.postMessage({ type: 'progress', frames });
    } else if (msg.type === 'finish') {
      flush();
      gif!.finish();
      const bytes = gif!.bytes();
      self.postMessage({ type: 'done', bytes }, [bytes.buffer]);
      gif = null;
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err as Error).message ?? err) });
  }
};
