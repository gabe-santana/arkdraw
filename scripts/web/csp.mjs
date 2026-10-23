#!/usr/bin/env node
/**
 * Builds the Content-Security-Policy for the web build. index.html carries a
 * small inline script (theme before first paint), so script-src needs its
 * hash — computed from the *built* file so it can never drift.
 *
 *   node scripts/web/csp.mjs dist                         print the CSP
 *   node scripts/web/csp.mjs dist --nginx <tpl> <out>     fill __SCRIPT_HASHES__ in an nginx template
 *   node scripts/web/csp.mjs dist --headers               write dist/_headers (Netlify / Cloudflare Pages)
 *
 * FRAME_ANCESTORS (env) controls who may embed the app (default `*`, needed
 * for ?embed=1 and ?lightbox=1 iframes). Use e.g. "'self' https://wiki.example.com".
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [dist = 'dist', mode, ...rest] = process.argv.slice(2);
const html = await readFile(path.join(dist, 'index.html'), 'utf8');

const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((body) => body.trim())
  .map((body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
const scriptHashes = hashes.join(' ');

export function csp(frameAncestors = process.env.FRAME_ANCESTORS || '*') {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    // Image shapes and backgrounds may point at remote images.
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    // ?url= diagrams, AI providers (cloud + local Ollama on localhost).
    "connect-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

if (mode === '--nginx') {
  const [tpl, out] = rest;
  if (!tpl || !out) throw new Error('usage: csp.mjs <dist> --nginx <template> <out>');
  const conf = (await readFile(tpl, 'utf8')).replaceAll('__SCRIPT_HASHES__', scriptHashes);
  await writeFile(out, conf);
  console.log(`nginx config → ${out} (${hashes.length} inline script hash${hashes.length === 1 ? '' : 'es'})`);
} else if (mode === '--headers') {
  const headers = `/*
  Content-Security-Policy: ${csp()}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
  await writeFile(path.join(dist, '_headers'), headers);
  console.log(`${path.join(dist, '_headers')} written`);
} else {
  console.log(csp());
}
