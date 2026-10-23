#!/usr/bin/env node
/**
 * Renders the animated diagram GIFs used in the README (docs/media/animated/).
 *
 *   npm run media:gifs
 *
 * Each template is built, given a left-to-right (or top-to-bottom) build-up
 * sequence plus flowing dots on every connector, and rendered frame by frame
 * with the app's own SVG renderer and animation timeline (loaded through
 * Vite's SSR loader — no browser). Frames are rasterized with sharp and
 * encoded with ffmpeg (must be on PATH).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'docs/media/animated');
const ICONS = join(ROOT, 'public/icons');
const FPS = 15;
const WIDTH = 1100;
const HOLD = 3.5; // seconds of data flow after the build-up

const DIAGRAMS = [
  ['aws-serverless', 'x'],
  ['aws-3-tier', 'x'],
  ['gcp-data-pipeline', 'x'],
  ['azure-web-app', 'x'],
  ['kubernetes-app', 'y'],
  ['c4-container', 'y'],
];
const only = process.argv.slice(2);

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const iconCache = new Map();
/** Icons inlined straight from public/icons (no fetch). */
const resolveIcon = (path) => {
  if (/^(data:|https?:)/.test(path)) return path;
  if (!iconCache.has(path)) {
    const file = join(ICONS, path);
    iconCache.set(path, existsSync(file) ? `data:${MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}` : '');
  }
  return iconCache.get(path);
};

const { createServer } = await import('vite');
const server = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': join(ROOT, 'src') } },
  optimizeDeps: { noDiscovery: true, include: [] },
});

/** Steps: title text always visible, containers first, then shapes by column/row, connectors once both ends are in. */
function animate(doc, axis, STEP) {
  const els = doc.order.map((id) => doc.elements[id]);
  const shapes = els.filter((e) => e.type === 'shape');
  const isTitle = (e) => e.kind === 'text';
  const isContainer = (e) => !!(e.container || /container|lane|pool|boundary|group|frame/.test(e.kind) || shapes.some((o) => o !== e && o.containerId === e.id));
  const step = new Map();
  for (const e of shapes) if (isTitle(e)) step.set(e.id, 0);
  for (const e of shapes) if (!step.has(e.id) && isContainer(e)) step.set(e.id, 1);
  const rest = shapes.filter((e) => !step.has(e.id));
  const key = (e) => (axis === 'x' ? e.x + e.w / 2 : e.y + e.h / 2);
  const sorted = [...rest].sort((a, b) => key(a) - key(b));
  let s = 1;
  let last = -Infinity;
  for (const e of sorted) {
    if (key(e) - last > 70) {
      s++;
      last = key(e);
    }
    step.set(e.id, s);
  }
  const elements = { ...doc.elements };
  for (const e of shapes) elements[e.id] = { ...e, reveal: step.get(e.id) || undefined };
  for (const e of els) {
    if (e.type !== 'connector') continue;
    const ends = [e.source.elementId, e.target.elementId].map((id) => step.get(id) ?? 1);
    elements[e.id] = { ...e, reveal: Math.max(...ends, 1), animation: { kind: 'dots', speed: 1 } };
  }
  const steps = Math.max(1, ...[...step.values()]);
  return { doc: { ...doc, elements }, seq: steps * STEP + HOLD };
}

try {
  const { TEMPLATES } = await server.ssrLoadModule('/src/templates/index.ts');
  const { renderSvg } = await server.ssrLoadModule('/src/io/export/svg.tsx');
  const { STEP_DURATION } = await server.ssrLoadModule('/src/animation/timeline.ts');
  mkdirSync(OUT, { recursive: true });

  for (const [id, axis] of DIAGRAMS) {
    if (only.length && !only.includes(id)) continue;
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) throw new Error(`No template ${id}`);
    const { doc, seq } = animate(t.build()[0].doc, axis, STEP_DURATION);
    const frames = Math.round(seq * FPS);
    const dir = join(tmpdir(), `od-frames-${id}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < frames; i++) {
      const r = renderSvg(doc, { background: '#ffffff', padding: 28, embedFont: false, appearance: 'light', frame: { t: i / FPS, seq } }, resolveIcon);
      const png = await sharp(Buffer.from(r.svg), { density: 144 }).resize({ width: WIDTH }).flatten({ background: '#ffffff' }).png().toBuffer();
      writeFileSync(join(dir, `f${String(i).padStart(4, '0')}.png`), png);
    }
    const gif = join(OUT, `${id}.gif`);
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'),
      '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
      '-loop', '0', gif,
    ]);
    rmSync(dir, { recursive: true, force: true });
    console.log(`${id}: ${frames} frames, ${(readFileSync(gif).length / 1024 / 1024).toFixed(2)} MB`);
  }
} finally {
  await server.close();
}
