#!/usr/bin/env node
/**
 * Reports icons and shape kinds that have no hover-card description.
 *
 *   npm run icons:check-descriptions
 *
 * - Icons: every id in public/icons/<provider>/index.json must have an entry in
 *   public/icons/<provider>/descriptions.json (run after `npm run icons:fetch`).
 * - Shapes: every kind registered in SHAPES (src/shapes/registry.tsx + libs) must
 *   have an entry in SHAPE_DESCRIPTIONS (src/shapes/descriptions.ts). The registry
 *   is loaded through Vite's SSR loader so generated and auto-discovered kinds count.
 *
 * Also lists stale entries (descriptions for ids/kinds that no longer exist).
 * Exits 1 when anything is missing or a file is unreadable.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ICONS = join(ROOT, 'public/icons');
const MAX_LIST = 50;

let failed = false;
const list = (label, items) => {
  if (!items.length) return;
  console.log(`  ${label} (${items.length}):`);
  for (const id of items.slice(0, MAX_LIST)) console.log(`    ${id}`);
  if (items.length > MAX_LIST) console.log(`    ... and ${items.length - MAX_LIST} more`);
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

// ----- Vendor icons ----------------------------------------------------------
console.log('Icon descriptions');
const providers = readdirSync(ICONS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ICONS, d.name, 'index.json')))
  .map((d) => d.name)
  .sort();
for (const p of providers) {
  let ids;
  let desc = {};
  try {
    ids = readJson(join(ICONS, p, 'index.json')).icons.map((i) => i.id);
  } catch (e) {
    console.log(`  ${p}: cannot read index.json (${e.message})`);
    failed = true;
    continue;
  }
  const descFile = join(ICONS, p, 'descriptions.json');
  if (existsSync(descFile)) {
    try {
      desc = readJson(descFile);
    } catch (e) {
      console.log(`  ${p}: invalid descriptions.json (${e.message})`);
      failed = true;
      continue;
    }
  }
  const known = new Set(ids);
  const missing = ids.filter((id) => typeof desc[id] !== 'string' || !desc[id].trim());
  const stale = Object.keys(desc).filter((id) => !known.has(id));
  console.log(`  ${p}: ${ids.length - missing.length}/${ids.length} described${stale.length ? `, ${stale.length} stale` : ''}`);
  list(`missing in ${p}/descriptions.json`, missing);
  list(`stale in ${p}/descriptions.json`, stale);
  if (missing.length) failed = true;
}

// ----- Shape kinds -----------------------------------------------------------
console.log('Shape descriptions');
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
try {
  const { SHAPES } = await server.ssrLoadModule('/src/shapes/registry.tsx');
  const { SHAPE_DESCRIPTIONS } = await server.ssrLoadModule('/src/shapes/descriptions.ts');
  const kinds = Object.keys(SHAPES);
  const missing = kinds.filter((k) => typeof SHAPE_DESCRIPTIONS[k] !== 'string' || !SHAPE_DESCRIPTIONS[k].trim());
  const stale = Object.keys(SHAPE_DESCRIPTIONS).filter((k) => !(k in SHAPES));
  console.log(`  shapes: ${kinds.length - missing.length}/${kinds.length} described${stale.length ? `, ${stale.length} stale` : ''}`);
  list('missing in src/shapes/descriptions.ts', missing);
  list('stale in src/shapes/descriptions.ts', stale);
  if (missing.length) failed = true;
} catch (e) {
  console.log(`  cannot load shape registry: ${e.message}`);
  failed = true;
} finally {
  await server.close();
}

console.log(failed ? '\nMissing descriptions found.' : '\nAll icons and shapes have descriptions.');
process.exit(failed ? 1 : 0);
