#!/usr/bin/env node
/**
 * Packages the Windows build as an MSIX for the Microsoft Store.
 *
 *   node scripts/msix/build-msix.mjs --exe src-tauri/target/release/arkdraw.exe --out ArkDraw.msix
 *
 * Package identity comes from Partner Center (Apps → OpenDraw → Product identity)
 * through environment variables, or placeholders for a local test build:
 *   MSIX_IDENTITY_NAME            Package/Identity/Name           (e.g. 12345GabrielSantana.ArkDraw)
 *   MSIX_PUBLISHER                Package/Identity/Publisher      (e.g. CN=ABCD1234-…)
 *   MSIX_PUBLISHER_DISPLAY_NAME   Package/Properties/PublisherDisplayName
 *
 * The package is left unsigned: the Store signs it on ingestion. Needs
 * makeappx.exe from the Windows 10/11 SDK (preinstalled on GitHub's windows runners).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};

const exe = resolve(arg('exe', join(ROOT, 'src-tauri/target/release/arkdraw.exe')));
const out = resolve(arg('out', join(ROOT, 'src-tauri/target/msix/ArkDraw.msix')));
const pkg = JSON.parse(readFileSync(join(ROOT, 'src-tauri/tauri.conf.json'), 'utf8'));
// MSIX versions are four numeric parts; the Store requires the last one to be 0.
const [major, minor, patch] = pkg.version.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
const version = `${major}.${minor}.${patch}.0`;

const identity = {
  IDENTITY_NAME: process.env.MSIX_IDENTITY_NAME || 'ArkDraw.Local',
  PUBLISHER: process.env.MSIX_PUBLISHER || 'CN=ArkDraw Local Build',
  PUBLISHER_DISPLAY_NAME: process.env.MSIX_PUBLISHER_DISPLAY_NAME || 'Gabriel Santana',
  VERSION: version,
};

function findMakeAppx() {
  const kits = 'C:/Program Files (x86)/Windows Kits/10/bin';
  if (!existsSync(kits)) throw new Error('Windows SDK not found (makeappx.exe).');
  const versions = readdirSync(kits).filter((v) => /^10\./.test(v)).sort().reverse();
  for (const v of versions) {
    const p = join(kits, v, 'x64', 'makeappx.exe');
    if (existsSync(p)) return p;
  }
  throw new Error('makeappx.exe not found in the Windows SDK.');
}

if (!existsSync(exe)) throw new Error(`Build the app first: ${exe} not found.`);

const stage = join(dirname(out), 'msix-stage');
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'assets'), { recursive: true });
cpSync(exe, join(stage, 'ArkDraw.exe'));
cpSync(join(ROOT, 'LICENSE'), join(stage, 'LICENSE.txt'));

// Visual assets from the app icon, at the scales the Store expects.
const icon = readFileSync(join(ROOT, 'app-icon.svg'));
const square = async (file, size, pad = 0) => {
  const inner = Math.round(size * (1 - pad * 2));
  const img = await sharp(icon, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: img, gravity: 'center' }])
    .png()
    .toFile(join(stage, 'assets', file));
};
const wide = async (file, w, h) => {
  const inner = Math.round(h * 0.7);
  const img = await sharp(icon, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: img, gravity: 'center' }])
    .png()
    .toFile(join(stage, 'assets', file));
};
await square('StoreLogo.png', 50);
await square('Square44x44Logo.png', 44);
await square('Square150x150Logo.png', 150, 0.12);
await wide('Wide310x150Logo.png', 310, 150);
// Unplated taskbar/start icons at common sizes.
for (const s of [16, 24, 32, 48, 256]) {
  await square(`Square44x44Logo.targetsize-${s}_altform-unplated.png`, s);
}
// The .arkdraw document icon, at the sizes Explorer asks for.
const fileIcon = readFileSync(join(ROOT, 'file-icon.svg'));
const fileLogo = (file, size) => sharp(fileIcon, { density: 512 }).resize(size, size).png().toFile(join(stage, 'assets', file));
await fileLogo('FileLogo.png', 44);
for (const s of [16, 24, 32, 48, 256]) {
  await fileLogo(`FileLogo.targetsize-${s}.png`, s);
  await fileLogo(`FileLogo.targetsize-${s}_altform-unplated.png`, s);
}

let manifest = readFileSync(join(ROOT, 'src-tauri/msix/AppxManifest.xml'), 'utf8');
for (const [k, v] of Object.entries(identity)) manifest = manifest.replaceAll(`{{${k}}}`, v.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
writeFileSync(join(stage, 'AppxManifest.xml'), manifest);

mkdirSync(dirname(out), { recursive: true });
rmSync(out, { force: true });
execFileSync(findMakeAppx(), ['pack', '/o', '/h', 'SHA256', '/d', stage, '/p', out], { stdio: 'inherit' });
console.log(`MSIX ${version} → ${out}`);
