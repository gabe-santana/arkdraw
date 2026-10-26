#!/usr/bin/env node
/**
 * Renders the .arkdraw document icon (file-icon.svg) for every desktop
 * installer, into src-tauri/icons/file/:
 *
 *   arkdraw-file.ico    Windows (NSIS/MSI registry DefaultIcon)
 *   arkdraw-file.icns   macOS (CFBundleTypeIconFile / UTTypeIconFile in Info.plist)
 *   <size>.png          Linux (hicolor mimetypes icons, see tauri.linux.conf.json)
 *
 * and public/pwa/file-256.png for the web app's file handler (manifest.webmanifest).
 *
 *   npm run app:file-icons
 *
 * The MSIX assets are rendered from the same SVG by scripts/msix/build-msix.mjs.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'src-tauri/icons/file');
const svg = readFileSync(join(ROOT, 'file-icon.svg'));

const png = (size) => sharp(svg, { density: Math.max(72, (size / 1024) * 72 * 4) }).resize(size, size).png().toBuffer();

/** ICO with PNG-compressed entries (Windows Vista and later). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // color planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

/** ICNS with PNG entries (macOS 10.7 and later). */
function icns(entries) {
  const chunks = entries.map(({ type, data }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([head, data]);
  });
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + chunks.reduce((n, c) => n + c.length, 0), 4);
  return Buffer.concat([head, ...chunks]);
}

mkdirSync(OUT, { recursive: true });
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const r = Object.fromEntries(await Promise.all(sizes.map(async (s) => [s, await png(s)])));

writeFileSync(join(OUT, 'arkdraw-file.ico'), ico([16, 24, 32, 48, 64, 256].map((size) => ({ size, data: r[size] }))));
writeFileSync(
  join(OUT, 'arkdraw-file.icns'),
  icns([
    { type: 'icp4', data: r[16] },
    { type: 'icp5', data: r[32] },
    { type: 'ic11', data: r[32] }, // 16@2x
    { type: 'icp6', data: r[64] },
    { type: 'ic12', data: r[64] }, // 32@2x
    { type: 'ic07', data: r[128] },
    { type: 'ic08', data: r[256] },
    { type: 'ic13', data: r[256] }, // 128@2x
    { type: 'ic09', data: r[512] },
    { type: 'ic14', data: r[512] }, // 256@2x
    { type: 'ic10', data: r[1024] }, // 512@2x
  ]),
);
for (const s of [16, 24, 32, 48, 64, 128, 256, 512]) writeFileSync(join(OUT, `${s}.png`), r[s]);
writeFileSync(join(ROOT, 'public/pwa/file-256.png'), r[256]);
console.log(`File icons → ${OUT}`);
