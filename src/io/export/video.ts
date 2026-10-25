/**
 * MP4 video export (docs/specs/animation.md §6): every page in scope is a
 * scene, played in order with a short crossfade. Frames come from the same
 * SVG renderer and timeline as the canvas and the GIF export, so the video
 * matches the preview; the browser encodes them (WebCodecs, H.264).
 */
import { BufferTarget, CanvasSource, canEncodeVideo, Mp4OutputFormat, Output, QUALITY_HIGH } from 'mediabunny';
import type { Doc } from '@/model/types';
import { sequenceDuration } from '@/animation/timeline';
import { drawable, exportSubset, inlineIcons, renderSvg, visualBounds, type SvgExportOptions } from './svg';
import { svgToCanvas } from './raster';
import { SCENE_FADE, sceneDuration, videoFrameSize, videoSupported, type VideoAspect } from './videoPlan';

export type { VideoAspect };

export interface VideoScene {
  doc: Doc;
  svg: SvgExportOptions;
}

export interface VideoOptions {
  /** Short side of the frame in px (720, 1080, 2160). */
  resolution: number;
  aspect: VideoAspect;
  fps: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export async function exportVideo(scenes: VideoScene[], o: VideoOptions): Promise<Uint8Array> {
  if (!scenes.length) throw new Error('There are no pages to export.');
  if (!videoSupported()) throw new Error('This browser can’t encode video. Try Chrome, Edge or Safari, or export a GIF.');

  const prepared = await Promise.all(
    scenes.map(async (s) => {
      const els = exportSubset(s.doc, s.svg.ids);
      const resolve = await inlineIcons(els);
      const bounds = s.svg.area ?? visualBounds(s.doc, drawable(s.doc, els, s.svg.hiddenLayers ?? 'omit')) ?? { x: 0, y: 0, w: 100, h: 100 };
      return { ...s, resolve, bounds, pad: s.svg.padding ?? 24, seq: sequenceDuration(s.doc), duration: sceneDuration(s.doc) };
    }),
  );
  // Every scene shows the same world-space size, widened to the frame's shape and
  // centered on its own content: text keeps its size from scene to scene, and the
  // background and grid fill the whole frame.
  const content = { width: Math.max(...prepared.map((s) => s.bounds.w + s.pad * 2)), height: Math.max(...prepared.map((s) => s.bounds.h + s.pad * 2)) };
  const size = videoFrameSize([content], o);
  const ratio = size.width / size.height;
  const view = content.width / content.height < ratio ? { w: content.height * ratio, h: content.height } : { w: content.width, h: content.width / ratio };
  const scale = size.width / view.w;
  const areaOf = (s: (typeof prepared)[number]) => ({
    x: s.bounds.x + s.bounds.w / 2 - view.w / 2 + s.pad,
    y: s.bounds.y + s.bounds.h / 2 - view.h / 2 + s.pad,
    w: view.w - s.pad * 2,
    h: view.h - s.pad * 2,
  });
  if (!(await canEncodeVideo('avc', { width: size.width, height: size.height, frameRate: o.fps }))) {
    throw new Error(`This browser can’t encode ${size.width} × ${size.height} video. Try a lower resolution.`);
  }

  const frame = Object.assign(document.createElement('canvas'), size);
  const ctx = frame.getContext('2d')!;
  const scene = document.createElement('canvas');
  const previous = Object.assign(document.createElement('canvas'), size);

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(frame, { codec: 'avc', bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: o.fps });
  await output.start();

  const total = prepared.reduce((n, s) => n + Math.max(1, Math.round(s.duration * o.fps)), 0);
  let index = 0;
  try {
    for (const [k, s] of prepared.entries()) {
      const frames = Math.max(1, Math.round(s.duration * o.fps));
      const bg = s.svg.background ?? '#ffffff';
      for (let i = 0; i < frames; i++) {
        if (o.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
        const t = i / o.fps;
        const rendered = renderSvg(s.doc, { ...s.svg, area: areaOf(s), frame: { t, seq: s.seq } }, s.resolve);
        await svgToCanvas(rendered, scale, scene);
        ctx.globalAlpha = 1;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.drawImage(scene, Math.round((size.width - scene.width) / 2), Math.round((size.height - scene.height) / 2));
        // The previous scene fades out over the start of this one.
        if (k > 0 && t < SCENE_FADE) {
          ctx.globalAlpha = 1 - t / SCENE_FADE;
          ctx.drawImage(previous, 0, 0);
          ctx.globalAlpha = 1;
        }
        await source.add(index / o.fps, 1 / o.fps);
        index++;
        o.onProgress?.(index / total);
        if (i === frames - 1) previous.getContext('2d')!.drawImage(frame, 0, 0);
        // Yield so the progress bar paints.
        if (index % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    }
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  }
  return new Uint8Array(target.buffer!);
}
