#!/usr/bin/env node
/**
 * Generates the PWA icons in public/pwa/ from app-icon.svg.
 *
 *   npm run pwa:icons
 *
 * - icon-{192,512}.png      "any" purpose (the rounded app icon, transparent corners)
 * - maskable-512.png        full-bleed background, glyph inside the 80% safe zone
 * - apple-touch-icon.png    180×180, full-bleed (iOS rounds the corners itself)
 */
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'public/pwa');
const svg = await readFile(path.join(root, 'app-icon.svg'), 'utf8');

/** Full-bleed variant: square background, glyph scaled into the safe zone. */
function fullBleed(scale) {
  const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';
  const glyph = svg.match(/<g filter="url\(#soft\)">[\s\S]*?<\/g>/)?.[0] ?? '';
  const t = `translate(${512 * (1 - scale)} ${512 * (1 - scale)}) scale(${scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#shine)"/>
  <g transform="${t}">${glyph}</g></svg>`;
}

await mkdir(out, { recursive: true });
const render = (src, size, file) =>
  sharp(Buffer.from(src), { density: Math.ceil((72 * size) / 1024) * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file))
    .then(() => console.log(`  public/pwa/${file}`));

await Promise.all([
  render(svg, 192, 'icon-192.png'),
  render(svg, 512, 'icon-512.png'),
  render(fullBleed(0.8), 512, 'maskable-512.png'),
  render(fullBleed(0.86), 180, 'apple-touch-icon.png'),
]);
