#!/usr/bin/env node
/**
 * Records the AI assistant at work in the real app and turns it into README
 * GIFs (docs/media/ai/<name>.gif): the prompt being typed, the assistant's
 * progress, the diagram popping in and its animations playing. The wait for
 * the model is sped up so each GIF stays short.
 *
 *   npm run dev -- --port 1422            # in another terminal
 *   node --experimental-websocket scripts/media/record-ai-demo.mjs [name…]
 *   node --experimental-websocket scripts/media/record-ai-demo.mjs --video [name…]
 *
 * `--video` records in 4K (a 1280×720 window at 3× density) and writes MP4s
 * for the landing page: <name>-4k.mp4, <name>-1080p.mp4 and a <name>-poster.webp. A
 * 4K screenshot takes ~130 ms, so the page's animations run at quarter speed
 * while it is recorded and the video is assembled on that clock: smooth
 * 30 fps at full speed.
 *
 * Credentials come from `.secrets` (Endpoint=, Key=, Model= for Azure AI
 * Foundry; git-ignored) or OPENDRAW_AI_ENDPOINT / _KEY / _MODEL. They are
 * only handed to the page under test and are never printed.
 *
 * Uses the installed Chrome (or Edge) through the DevTools protocol and
 * ffmpeg; no extra packages.
 */
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const APP = process.env.OPENDRAW_DEMO_URL ?? 'http://localhost:1422';
const VIDEO = process.argv.includes('--video');
const OUT = join(ROOT, VIDEO ? 'site/public/media' : 'docs/media/ai');
/** GIFs: 1280×760 at 1×. Videos: 4K, i.e. 1280×720 at 3×. */
const VIEW = VIDEO ? { width: 1280, height: 720, scale: 3 } : { width: 1280, height: 760, scale: 1 };
const FPS = VIDEO ? 30 : 12;
/** Page clock speed while recording (1 = real time). */
const SLOWMO = VIDEO ? 0.25 : 1;
const GIF_WIDTH = 1280;

/** The demos: a prompt typed into the AI tab, optionally after a first prompt that sets the scene. */
const DEMOS = {
  'aws-serverless': {
    prompts: ['Serverless image upload on AWS: CloudFront → API Gateway → Lambda, saving images to S3 and metadata to DynamoDB. One arrow per hop. Animate the request flow.'],
  },
  'azure-web-app': {
    prompts: ['Azure web app: Front Door → App Service inside a VNet, talking to Azure SQL and Key Vault. Keep it compact and animate the traffic.'],
  },
  'edit-add-cache': {
    setup: 'Simple web app on AWS: users → Application Load Balancer → two EC2 instances → RDS PostgreSQL.',
    prompts: ['Add an ElastiCache Redis cache between the instances and the database, and animate the data flow.'],
  },
  'gcp-pipeline': {
    prompts: ['Streaming analytics on Google Cloud: Pub/Sub → Dataflow → BigQuery, with a Looker dashboard. Show the events moving as dots.'],
  },
  flowchart: {
    prompts: ['Flowchart for a password reset: request reset, email exists?, send link, link valid?, set new password, done. Build it step by step.'],
  },
};

// ---------------------------------------------------------------------------
// Credentials (never printed)
// ---------------------------------------------------------------------------

function credentials() {
  const env = {
    Endpoint: process.env.OPENDRAW_AI_ENDPOINT,
    Key: process.env.OPENDRAW_AI_KEY,
    Model: process.env.OPENDRAW_AI_MODEL,
  };
  const file = join(ROOT, '.secrets');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0) env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim();
    }
  }
  for (const k of ['Endpoint', 'Key', 'Model']) if (!env[k]) throw new Error(`Missing ${k} in .secrets (or OPENDRAW_AI_${k.toUpperCase()})`);
  return env;
}

// ---------------------------------------------------------------------------
// Minimal DevTools protocol client
// ---------------------------------------------------------------------------

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error('Chrome not found; set CHROME_PATH');
  return hit;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => process.env.DEBUG && console.log(new Date().toISOString().slice(11, 19), ...a);

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'opendraw-demo-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(findBrowser(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${VIEW.width},${VIEW.height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: 'ignore' });
  let pages;
  for (let i = 0; i < 50 && !pages; i++) {
    await sleep(200);
    pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => undefined);
  }
  const page = pages?.find((p) => p.type === 'page');
  if (!page) throw new Error('Could not connect to the browser');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method) listeners.get(msg.method)?.(msg.params);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    }
  };
  // Every call gets an answer or an error: a lost reply must not hang the recording.
  const send = (method, params = {}) =>
    new Promise((ok, fail) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        fail(new Error(`${method} timed out`));
      }, 60000);
      pending.set(id, { ok: (v) => (clearTimeout(timer), ok(v)), fail: (e) => (clearTimeout(timer), fail(e)) });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const close = () => {
    ws.close();
    proc.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500);
  };
  const on = (method, fn) => listeners.set(method, fn);
  return { send, on, close };
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

function pageApi(send) {
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed');
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 30000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression).catch(() => false)) return;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  const center = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const click = async (selector) => {
    const { x, y } = await center(selector);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  };
  const type = async (text, delay = 28) => {
    for (const ch of text) {
      await send('Input.insertText', { text: ch });
      await sleep(delay);
    }
  };
  const key = async (key, code, keyCode, modifiers = 0) => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, modifiers });
  };
  return { evaluate, waitFor, click, type, key };
}

/**
 * Captures frames until stopped, straight to disk; returns [{ t, file }] with
 * t in ms on the page clock (real time × SLOWMO). Screenshots, not the
 * screencast: only screenshots honor the device scale factor (true 4K).
 */
function recorder(send) {
  const dir = mkdtempSync(join(tmpdir(), 'opendraw-frames-'));
  const frames = [];
  let running = true;
  const start = Date.now();
  const now = () => (Date.now() - start) * SLOWMO;
  const loop = (async () => {
    while (running) {
      const t0 = Date.now();
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: VIDEO ? 93 : 88 });
      const file = join(dir, `r${String(frames.length).padStart(6, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ t: (t0 - start) * SLOWMO, file });
      if (!VIDEO) await sleep(Math.max(0, 1000 / FPS - (Date.now() - t0)));
    }
  })();
  return {
    dir,
    now,
    stop: async () => {
      running = false;
      await loop;
      return frames;
    },
  };
}

/**
 * Slow motion without touching the page's code: the document's animation
 * timeline runs at `k` (DevTools), which drives CSS and Web Animations and
 * the frame timestamps the diagram animations are timed on.
 */
async function slowMotion(send, k) {
  if (k === 1) return;
  await send('Animation.enable');
  await send('Animation.setPlaybackRate', { playbackRate: k });
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const PROMPT_BOX = '[role="tabpanel"] textarea';
const RUNNING = `!!document.querySelector('[role="tabpanel"] button[aria-label="Stop"]')`;

async function runPrompt(page, prompt, marks, rec) {
  // Focus directly: a synthetic click can miss while 4K screenshots are being taken.
  await page.evaluate(`document.querySelector(${JSON.stringify(PROMPT_BOX)}).focus()`);
  marks.push({ at: rec?.now(), what: "type" });
  log("typing");
  await page.type(prompt, rec ? 22 / SLOWMO : 0);
  await sleep(rec ? 500 / SLOWMO : 0);
  await page.key('Enter', 'Enter', 13, 2 /* Ctrl */);
  marks.push({ at: rec?.now(), what: 'sent' });
  log("sent");
  await page.waitFor(RUNNING, 15000).catch(async (e) => {
    log('panel:', await page.evaluate(`document.querySelector('[role="tabpanel"]')?.innerText.slice(0, 600)`));
    log('textarea:', await page.evaluate(`document.querySelector(${JSON.stringify(PROMPT_BOX)})?.value.slice(0, 80)`));
    throw e;
  });
  log("running");
  await page.waitFor(`!(${RUNNING})`, 300000);
  marks.push({ at: rec?.now(), what: 'applied' });
  const failed = await page.evaluate(`[...document.querySelectorAll('[role="tabpanel"] button')].some((b) => b.textContent.includes('Try again'))`);
  if (failed) throw new Error(`The assistant reported an error for: ${prompt}`);
}

async function record(name, demo, creds) {
  const { send, on, close } = await launch();
  const page = pageApi(send);
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.scale, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    // Settings first (same origin), then the key into the encrypted vault, then a clean load.
    log('open');
    await send('Page.navigate', { url: `${APP}/?lang=en` });
    await page.waitFor(`document.readyState === 'complete'`);
    log('settings');
    await page.evaluate(`(() => {
      localStorage.setItem('opendraw:theme', JSON.stringify({ theme: 'dark' }));
      localStorage.setItem('opendraw:locale', 'en');
      localStorage.setItem('opendraw:preferences', JSON.stringify({ startScreen: false }));
      localStorage.setItem('opendraw:panels', JSON.stringify({ leftOpen: false, rightOpen: true, aiOpen: true, aiWidth: 360, leftWidth: 264, rightWidth: 268, layersOpen: true, layersHeight: 300, dock: { left: ['shapes'], right: ['format', 'layers'] } }));
      localStorage.setItem('opendraw.ai.settings.v1', JSON.stringify({ provider: 'azure', models: { azure: ${JSON.stringify(creds.Model)} }, baseUrls: { azure: ${JSON.stringify(creds.Endpoint)} }, customAuth: 'bearer', azureAuth: 'api-key', params: {}, authorizedBaseUrls: { azure: ${JSON.stringify(creds.Endpoint)} }, rememberKeys: true }));
      return true;
    })()`);
    await page.evaluate(`import('/src/ai/keyVault.ts').then((v) => v.vaultPut('azure', { key: ${JSON.stringify(creds.Key)}, origin: new URL(${JSON.stringify(creds.Endpoint)}).origin, auth: 'api-key' })).then(() => true)`);
    log('key stored, reloading');
    await send('Page.navigate', { url: `${APP}/?lang=en` });
    await page.waitFor(`!!document.querySelector('[data-canvas]') && !!document.querySelector(${JSON.stringify(PROMPT_BOX)})`);
    await sleep(1500);

    const marks = [];
    if (demo.setup) {
      await runPrompt(page, demo.setup, [], null);
      await sleep(2500);
    }
    await slowMotion(send, SLOWMO);
    const rec = recorder(send);
    await sleep(900 / SLOWMO);
    for (const prompt of demo.prompts) {
      await runPrompt(page, prompt, marks, rec);
      await sleep(7000 / SLOWMO); // the reveal, then the animations playing
    }
    marks.push({ at: rec.now(), what: 'end' });
    const frames = await rec.stop();
    return { frames, marks, dir: rec.dir };
  } finally {
    close();
  }
}

// ---------------------------------------------------------------------------
// GIF
// ---------------------------------------------------------------------------

/** Real time → GIF time: the wait between "sent" and "applied" is squeezed into ~4 s. */
function timeline(marks) {
  const segs = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].what !== 'sent') continue;
    const applied = marks.slice(i).find((m) => m.what === 'applied');
    const from = marks[i].at + 1800;
    const to = applied.at - 400;
    if (to - from > 4000) segs.push({ from, to, factor: (to - from) / 4000 });
  }
  return (t) => {
    let out = t;
    for (const s of segs) {
      if (t > s.to) out -= (s.to - s.from) - (s.to - s.from) / s.factor;
      else if (t > s.from) out -= (t - s.from) - (t - s.from) / s.factor;
    }
    return out;
  };
}

/** Resamples the recorded frames to FPS on the squeezed timeline, as f00000.jpg… in `dir`. */
function resample(frames, marks, dir) {
  const map = timeline(marks);
  const step = 1000 / FPS;
  let next = 0;
  let n = 0;
  for (let i = 0; i < frames.length; i++) {
    // A frame lasts until the next one is painted.
    const until = map(frames[i + 1]?.t ?? frames[i].t + 1000);
    while (next < until) {
      copyFileSync(frames[i].file, join(dir, `f${String(n++).padStart(5, '0')}.jpg`));
      next += step;
    }
  }
  return n;
}

function writeGif(name, frames, marks, dir) {
  const n = resample(frames, marks, dir);
  mkdirSync(OUT, { recursive: true });
  const gif = join(OUT, `${name}.gif`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'),
    '-vf', `scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
    '-loop', '0', gif,
  ]);
  return { out: gif, frames: n };
}

/** 4K H.264 for the web (plays everywhere), plus the last frame as the poster. */
function writeVideo(name, frames, marks, dir) {
  const n = resample(frames, marks, dir);
  mkdirSync(OUT, { recursive: true });
  // "-4k" in the name: a new recording must not be served from a cache of the old one.
  const mp4 = join(OUT, `${name}-4k.mp4`);
  // The JPEG frames are full range; browsers play H.264 as limited range, which would crush
  // the dark theme to black. Convert, so the video shows the app's real colors.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'),
    '-vf', `scale=${VIEW.width * VIEW.scale}:${VIEW.height * VIEW.scale}:flags=lanczos:out_range=tv`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-level', '5.1',
    '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', mp4,
  ]);
  // 1080p for phones and ordinary screens, and a light WebP poster (site/public/main.js picks).
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', mp4, '-vf', 'scale=1920:1080:flags=lanczos',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    join(OUT, `${name}-1080p.mp4`),
  ]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dir, `f${String(n - 1).padStart(5, '0')}.jpg`), '-vf', 'scale=1600:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '72', join(OUT, `${name}-poster.webp`)]);
  return { out: mp4, frames: n };
}

// ---------------------------------------------------------------------------

const creds = credentials();
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const names = args.length ? args : Object.keys(DEMOS);
for (const name of names) {
  const demo = DEMOS[name];
  if (!demo) throw new Error(`Unknown demo ${name}; one of ${Object.keys(DEMOS).join(', ')}`);
  process.stdout.write(`${name}: recording… `);
  const { frames, marks, dir } = await record(name, demo, creds);
  const { out, frames: n } = (VIDEO ? writeVideo : writeGif)(name, frames, marks, dir);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${n} frames → ${out}`);
}
