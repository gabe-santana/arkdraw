#!/usr/bin/env node
/**
 * Production smoke tests: checks what visitors actually get from
 * https://arkdraw.com (landing), https://www.arkdraw.com and
 * https://app.arkdraw.com (editor).
 *
 *   npm run smoke:prod                  # HTTP + real browser
 *   npm run smoke:prod -- --http        # HTTP checks only (no browser)
 *
 * HTTP: pages, security headers, every asset the pages reference, video
 * range requests, 404 / SPA fallback, links, PWA manifest, icon packs.
 * Browser (installed Chrome, headless, over the DevTools protocol): no
 * console errors or CSP violations, the hero video plays, no horizontal
 * scroll on a phone, and the editor works: start screen, drawing and undo,
 * the AI tab and its settings, icon search, languages, service worker.
 *
 * Override the targets with SMOKE_SITE / SMOKE_APP. Exits non-zero on any
 * failure. Uses no credentials.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = (process.env.SMOKE_SITE ?? 'https://arkdraw.com').replace(/\/$/, '');
const WWW = SITE.replace('://', '://www.');
const APP = (process.env.SMOKE_APP ?? 'https://app.arkdraw.com').replace(/\/$/, '');
const HTTP_ONLY = process.argv.includes('--http');

// ---------------------------------------------------------------------------
// Tiny harness
// ---------------------------------------------------------------------------

const results = [];
let group = '';
function section(name) {
  group = name;
  console.log(`\n${name}`);
}
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ group, name, ok: true });
    console.log(`  ✓ ${name} \x1b[2m(${Date.now() - t0} ms)\x1b[0m`);
  } catch (e) {
    results.push({ group, name, ok: false, error: e.message });
    console.log(`  ✗ ${name}\n      \x1b[31m${e.message}\x1b[0m`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, init = {}) {
  const res = await fetch(url, { redirect: 'manual', ...init, headers: { 'user-agent': 'arkdraw-smoke/1', ...init.headers } });
  return res;
}

/** Same-origin URLs a page references: scripts, styles, icons, images, media, preloads, manifest. */
function referencedAssets(html, base) {
  const urls = new Set();
  // <meta content="…"> only counts for og:image (viewport and friends aren't URLs).
  const attr = /\b(?:src|href|poster|data-src)="([^"]+)"|property="og:image" content="([^"]+)"/g;
  for (const m of html.matchAll(attr)) {
    const v = m[1] ?? m[2];
    if (/^(#|mailto:|data:|javascript:)/.test(v)) continue;
    let u;
    try {
      u = new URL(v, base);
    } catch {
      continue;
    }
    if (u.origin === new URL(base).origin && u.pathname !== '/' && /\.[a-z0-9]+$/i.test(u.pathname)) urls.add(u.href);
  }
  return [...urls];
}

const EXPECTED_TYPE = { js: 'javascript', mjs: 'javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2', mp4: 'video/mp4', webmanifest: 'manifest+json', json: 'json', xml: 'xml', txt: 'text/plain' };

async function checkAssets(html, base) {
  const assets = referencedAssets(html, base);
  assert(assets.length > 0, 'no assets found in the page');
  const bad = [];
  await Promise.all(
    assets.map(async (u) => {
      const res = await get(u);
      const ext = new URL(u).pathname.split('.').pop().toLowerCase();
      const type = res.headers.get('content-type') ?? '';
      if (res.status !== 200) bad.push(`${u} → ${res.status}`);
      else if (EXPECTED_TYPE[ext] && !type.includes(EXPECTED_TYPE[ext])) bad.push(`${u} → content-type ${type}`);
      await res.arrayBuffer().catch(() => {});
    }),
  );
  assert(!bad.length, `broken assets:\n        ${bad.join('\n        ')}`);
  return assets.length;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function httpTests() {
  let landing = '';
  let app = '';

  section(`Landing (${SITE})`);
  await test('serves the page over HTTPS', async () => {
    const res = await get(`${SITE}/`);
    assert(res.status === 200, `status ${res.status}`);
    assert((res.headers.get('content-type') ?? '').includes('text/html'), 'not HTML');
    landing = await res.text();
    assert(/<title>[^<]*ArkDraw/.test(landing), 'title does not mention ArkDraw');
  });
  await test('www serves the landing too', async () => {
    const res = await get(`${WWW}/`);
    assert(res.status === 200, `status ${res.status}`);
    assert((await res.text()).includes('Watch it being drawn'), 'unexpected content');
  });
  await test('plain HTTP upgrades to HTTPS', async () => {
    const res = await get(SITE.replace('https://', 'http://') + '/');
    assert([301, 302, 307, 308].includes(res.status), `status ${res.status}`);
    assert((res.headers.get('location') ?? '').startsWith('https://'), `location ${res.headers.get('location')}`);
  });
  await test('security headers (strict CSP, nosniff, HSTS, referrer policy)', async () => {
    const h = (await get(`${SITE}/`)).headers;
    const csp = h.get('content-security-policy') ?? '';
    assert(csp.includes("default-src 'self'"), `CSP: ${csp || 'missing'}`);
    assert(csp.includes("frame-ancestors 'none'"), 'CSP allows framing');
    assert(h.get('x-content-type-options') === 'nosniff', 'no nosniff');
    assert((h.get('strict-transport-security') ?? '').includes('max-age'), 'no HSTS');
    assert(h.get('referrer-policy'), 'no referrer policy');
  });
  await test('every referenced asset loads with the right type', async () => {
    const n = await checkAssets(landing, `${SITE}/`);
    assert(n >= 10, `only ${n} assets referenced`);
  });
  await test('videos support range requests (Safari, seeking)', async () => {
    const videos = [...landing.matchAll(/(?:src|data-src)="(\/media\/[^"]+\.mp4)"/g)].map((m) => m[1]);
    assert(videos.length >= 3, `only ${videos.length} videos`);
    for (const v of videos) {
      const res = await get(`${SITE}${v}`, { headers: { range: 'bytes=0-1023' } });
      assert(res.status === 206, `${v} → ${res.status} for a range request`);
      assert(/^bytes 0-1023\//.test(res.headers.get('content-range') ?? ''), `${v}: content-range ${res.headers.get('content-range')}`);
      await res.arrayBuffer();
    }
  });
  await test('Open Graph image, robots.txt and sitemap', async () => {
    for (const p of ['/og.png', '/robots.txt', '/sitemap.xml', '/favicon.svg']) {
      const res = await get(`${SITE}${p}`);
      assert(res.status === 200, `${p} → ${res.status}`);
    }
    assert(/og:image" content="https:\/\/arkdraw\.com\/og\.png"/.test(landing) || landing.includes('og:image'), 'no og:image');
  });
  await test('unknown pages return a real 404 page', async () => {
    const res = await get(`${SITE}/this-page-does-not-exist`);
    assert(res.status === 404, `status ${res.status}`);
    assert((await res.text()).includes('Open the editor'), '404 page without a way back');
  });
  await test('outbound links work', async () => {
    const links = [...new Set([...landing.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]))].filter((u) => !u.startsWith(SITE));
    const bad = [];
    for (const u of links) {
      const res = await get(u, { redirect: 'follow' }).catch((e) => ({ status: e.message }));
      if (!(typeof res.status === 'number' && res.status < 400)) bad.push(`${u} → ${res.status}`);
    }
    assert(!bad.length, `broken links:\n        ${bad.join('\n        ')}`);
  });

  section(`Editor (${APP})`);
  await test('serves the app', async () => {
    const res = await get(`${APP}/`);
    assert(res.status === 200, `status ${res.status}`);
    app = await res.text();
    assert(app.includes('<div id="root"') || app.includes('id="root"'), 'no app root');
  });
  await test('CSP allows AI providers and keeps the rest locked down', async () => {
    const csp = (await get(`${APP}/`)).headers.get('content-security-policy') ?? '';
    assert(csp.includes("default-src 'self'"), `CSP: ${csp || 'missing'}`);
    assert(/connect-src[^;]*https:/.test(csp), 'connect-src does not allow https: (AI providers)');
    assert(csp.includes("object-src 'none'"), 'object-src not none');
  });
  await test('every referenced asset loads with the right type', async () => {
    await checkAssets(app, `${APP}/`);
  });
  await test('deep links fall back to the app (SPA)', async () => {
    const res = await get(`${APP}/some/deep/link`);
    assert(res.status === 200, `status ${res.status}`);
    assert((await res.text()).includes('id="root"'), 'not the app');
  });
  await test('PWA: manifest and its icons, service worker never cached', async () => {
    const m = await (await get(`${APP}/manifest.webmanifest`)).json();
    assert(m.name && m.start_url && m.icons?.length, 'incomplete manifest');
    for (const icon of m.icons) {
      const res = await get(new URL(icon.src, `${APP}/`).href);
      assert(res.status === 200, `${icon.src} → ${res.status}`);
    }
    const sw = await get(`${APP}/sw.js`);
    assert(sw.status === 200, `sw.js → ${sw.status}`);
    assert((sw.headers.get('cache-control') ?? '').includes('no-cache'), `sw.js cache-control: ${sw.headers.get('cache-control')}`);
  });
  await test('hashed assets are cached for a year', async () => {
    const js = referencedAssets(app, `${APP}/`).find((u) => u.includes('/assets/'));
    assert(js, 'no /assets/ file referenced');
    const cc = (await get(js)).headers.get('cache-control') ?? '';
    assert(cc.includes('immutable') && cc.includes('max-age=31536000'), `cache-control: ${cc}`);
  });
  await test('icon packs are deployed (AWS, Azure, Google Cloud)', async () => {
    const providers = await (await get(`${APP}/icons/providers.json`)).json();
    const ids = providers.map((p) => p.id);
    for (const id of ['aws', 'azure', 'gcp']) assert(ids.includes(id), `${id} pack missing`);
    for (const id of ['aws', 'azure', 'gcp']) {
      const index = await (await get(`${APP}/icons/${id}/index.json`)).json();
      const icons = Array.isArray(index) ? index : index.icons;
      assert(icons?.length > 50, `${id}: ${icons?.length} icons`);
      const sample = icons[Math.floor(icons.length / 2)];
      const res = await get(`${APP}/icons/${id}/${sample.file}`);
      assert(res.status === 200 && (res.headers.get('content-type') ?? '').includes('svg'), `${id}/${sample.file} → ${res.status}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Browser (DevTools protocol)
// ---------------------------------------------------------------------------

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

/** A fresh browser profile with one page; collects console errors, exceptions and CSP violations. */
async function openBrowser({ width = 1280, height = 800, mobile = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'arkdraw-smoke-'));
  const port = 9800 + Math.floor(Math.random() * 150);
  const proc = spawn(findBrowser(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let pages;
  for (let i = 0; i < 60 && !pages; i++) {
    await sleep(200);
    pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => undefined);
  }
  const page = pages?.find((p) => p.type === 'page');
  if (!page) throw new Error('could not start the browser');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  let seq = 0;
  const pending = new Map();
  const problems = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { ok, fail, timer } = pending.get(m.id);
      clearTimeout(timer);
      pending.delete(m.id);
      m.error ? fail(new Error(m.error.message)) : ok(m.result);
    }
    if (m.method === 'Runtime.exceptionThrown') problems.push(`exception: ${m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push(`${m.params.entry.source}: ${m.params.entry.text.slice(0, 200)}${m.params.entry.url ? ` (${m.params.entry.url})` : ''}`);
  };
  const send = (method, params = {}) =>
    new Promise((ok, fail) => {
      const id = ++seq;
      const timer = setTimeout(() => (pending.delete(id), fail(new Error(`${method} timed out`))), 30000);
      pending.set(id, { ok, fail, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 3 : 1, mobile });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 20000, what = expression) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression).catch(() => false)) return;
      await sleep(150);
    }
    throw new Error(`timed out waiting for ${what}`);
  };
  const goto = async (url) => {
    await send('Page.navigate', { url });
    await waitFor(`document.readyState === 'complete'`, 30000, `${url} to load`);
  };
  const center = (selector) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const mouse = async (type, x, y, buttons = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1 });
  const click = async (selector) => {
    const c = await center(selector);
    assert(c, `${selector} not found`);
    await mouse('mousePressed', c.x, c.y, 1);
    await mouse('mouseReleased', c.x, c.y);
  };
  const key = async (key, code, keyCode, modifiers = 0, text) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
  };
  const close = () => {
    ws.close();
    proc.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500);
  };
  return { send, evaluate, waitFor, goto, click, mouse, key, problems, close };
}

/** Text of the clickable element (button/link) containing `text`, as a selector-free click. */
const clickByText = (b, text, scope = 'document') =>
  b.evaluate(`(() => {
    const el = [...${scope}.querySelectorAll('button, a, [role=tab]')].find((e) => e.textContent.trim().includes(${JSON.stringify(text)}));
    if (!el) return false;
    el.click();
    return true;
  })()`);

async function browserTests() {
  const browser = findBrowser();
  if (!browser) {
    console.log('\n(no Chrome/Edge found: browser tests skipped; set CHROME_PATH)');
    return;
  }

  section('Landing in a real browser');
  {
    const b = await openBrowser();
    try {
      await test('loads without console errors or CSP violations', async () => {
        await b.goto(`${SITE}/`);
        await sleep(2500);
        assert(!b.problems.length, b.problems.join('\n        '));
      });
      await test('the hero video plays', async () => {
        await b.waitFor(`(() => { const v = document.querySelector('.hero-window video'); return v && v.readyState >= 2 && !v.paused && v.currentTime > 0; })()`, 15000, 'the hero video to play');
      });
      await test('videos below the fold start when scrolled into view', async () => {
        await b.evaluate(`document.querySelector('#ai .show video').scrollIntoView(); true`);
        await b.waitFor(`(() => { const v = document.querySelector('#ai .show video'); return v && v.currentSrc && v.readyState >= 2; })()`, 15000, 'the first showcase video to load');
      });
      await test('self-hosted font is used (no third-party requests)', async () => {
        assert(await b.evaluate(`document.fonts.ready.then(() => document.fonts.check('700 16px Inter'))`), 'Inter not loaded');
        const external = await b.evaluate(`performance.getEntriesByType('resource').map((e) => e.name).filter((u) => !u.startsWith(location.origin))`);
        assert(!external.length, `third-party requests: ${external.join(', ')}`);
      });
      await test('"Open the editor" goes to the app', async () => {
        const href = await b.evaluate(`document.querySelector('.hero .btn-primary').href`);
        assert(href.startsWith(APP), `hero CTA → ${href}`);
      });
    } finally {
      b.close();
    }
  }
  {
    const b = await openBrowser({ width: 390, height: 844, mobile: true });
    try {
      await test('phone: no horizontal scroll, readable headline', async () => {
        await b.goto(`${SITE}/`);
        await sleep(1000);
        const m = await b.evaluate(`({ sw: document.documentElement.scrollWidth, w: innerWidth, h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize) })`);
        assert(m.sw <= m.w + 1, `page is ${m.sw}px wide on a ${m.w}px screen`);
        assert(m.h1 >= 36, `headline ${m.h1}px`);
      });
    } finally {
      b.close();
    }
  }

  section('Editor in a real browser');
  {
    const b = await openBrowser({ width: 1440, height: 900 });
    try {
      await test('loads without console errors', async () => {
        await b.goto(`${APP}/?lang=en`);
        await b.waitFor(`!!document.querySelector('[data-canvas]')`, 30000, 'the canvas');
        await sleep(2000);
        assert(!b.problems.length, b.problems.join('\n        '));
      });
      await test('start screen offers a blank diagram', async () => {
        await b.waitFor(`document.body.innerText.includes('Blank diagram')`, 10000, 'the start screen');
        assert(await clickByText(b, 'Blank diagram'), 'no Blank diagram button');
        await b.waitFor(`!document.body.innerText.includes('Blank diagram')`, 5000, 'the start screen to close');
      });
      await test('draws a rectangle, then undo removes it', async () => {
        const count = `document.querySelectorAll('[data-canvas] [data-el]').length`;
        const before = await b.evaluate(count);
        await b.click('[data-canvas]');
        await b.key('r', 'KeyR', 82, 0, 'r');
        await b.mouse('mousePressed', 500, 350, 1);
        await b.mouse('mouseMoved', 600, 420, 1);
        await b.mouse('mouseMoved', 680, 470, 1);
        await b.mouse('mouseReleased', 680, 470);
        await b.waitFor(`${count} > ${before}`, 5000, 'the rectangle');
        await b.key('z', 'KeyZ', 90, 2 /* Ctrl */);
        await b.waitFor(`${count} === ${before}`, 5000, 'undo');
      });
      await test('icon search finds AWS Lambda', async () => {
        await b.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((e) => e.placeholder.startsWith('Search shapes and icons')); i.focus(); return true; })()`);
        await b.send('Input.insertText', { text: 'lambda' });
        await b.waitFor(`[...document.querySelectorAll('button[aria-label]')].some((e) => /lambda/i.test(e.getAttribute('aria-label')))`, 20000, 'a Lambda icon in the results');
      });
      await test('AI tab opens with its settings (all providers listed)', async () => {
        assert(await clickByText(b, 'AI', `document.querySelector('[role=tablist]')`), 'no AI tab');
        await b.waitFor(`!!document.querySelector('[role=tabpanel] textarea')`, 15000, 'the AI panel');
        await b.click('[role=tabpanel] button[aria-label="AI settings"]');
        await b.waitFor(`document.body.innerText.includes('Anthropic') && document.body.innerText.includes('Azure AI Foundry')`, 10000, 'the provider list');
        await b.key('Escape', 'Escape', 27);
      });
      await test('service worker is registered (works offline)', async () => {
        await b.waitFor(`navigator.serviceWorker.getRegistration().then((r) => !!r)`, 20000, 'a service worker registration');
      });
      await test('no errors after using it', async () => {
        assert(!b.problems.length, b.problems.join('\n        '));
      });
      await test('Portuguese UI with ?lang=pt-BR', async () => {
        await b.goto(`${APP}/?lang=pt-BR`);
        await b.waitFor(`document.body.innerText.includes('Arquivo')`, 20000, 'the Portuguese menu');
      });
    } finally {
      b.close();
    }
  }
}

// ---------------------------------------------------------------------------

console.log(`ArkDraw production smoke tests\n  landing ${SITE}\n  editor  ${APP}`);
await httpTests();
if (!HTTP_ONLY) await browserTests();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} failed` : ''}`);
process.exit(failed.length ? 1 : 0);
