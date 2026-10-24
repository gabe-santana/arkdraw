#!/usr/bin/env node
/**
 * Records the AI assistant at work in the real app and turns it into README
 * GIFs (docs/media/ai/<name>.gif): the prompt being typed, the assistant's
 * progress, the diagram popping in and its animations playing. The wait for
 * the model is sped up so each GIF stays short.
 *
 *   npm run dev -- --port 1422            # in another terminal
 *   node --experimental-websocket scripts/media/record-ai-demo.mjs [name…]
 *
 * Credentials come from `.secrets` (Endpoint=, Key=, Model= for Azure AI
 * Foundry; git-ignored) or OPENDRAW_AI_ENDPOINT / _KEY / _MODEL. They are
 * only handed to the page under test and are never printed.
 *
 * Uses the installed Chrome (or Edge) through the DevTools protocol and
 * ffmpeg; no extra packages.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const APP = process.env.OPENDRAW_DEMO_URL ?? 'http://localhost:1422';
const OUT = join(ROOT, 'docs/media/ai');
const VIEW = { width: 1280, height: 760 };
const FPS = 12;
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
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
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
  return { send, close };
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

/** Captures frames until stopped; returns [{ t, data }] with t in ms. */
function recorder(send) {
  const frames = [];
  let running = true;
  const start = Date.now();
  const loop = (async () => {
    while (running) {
      const t0 = Date.now();
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      frames.push({ t: t0 - start, data });
      await sleep(Math.max(0, 1000 / FPS - (Date.now() - t0)));
    }
  })();
  return {
    now: () => Date.now() - start,
    stop: async () => {
      running = false;
      await loop;
      return frames;
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const PROMPT_BOX = '[role="tabpanel"] textarea';
const RUNNING = `!!document.querySelector('[role="tabpanel"] button[aria-label="Stop"]')`;

async function runPrompt(page, prompt, marks, rec) {
  await page.click(PROMPT_BOX);
  marks.push({ at: rec?.now(), what: "type" });
  log("typing");
  await page.type(prompt, rec ? 22 : 0);
  await sleep(rec ? 500 : 0);
  await page.key('Enter', 'Enter', 13, 2 /* Ctrl */);
  marks.push({ at: rec?.now(), what: 'sent' });
  log("sent");
  await page.waitFor(RUNNING, 15000);
  log("running");
  await page.waitFor(`!(${RUNNING})`, 300000);
  marks.push({ at: rec?.now(), what: 'applied' });
  const failed = await page.evaluate(`[...document.querySelectorAll('[role="tabpanel"] button')].some((b) => b.textContent.includes('Try again'))`);
  if (failed) throw new Error(`The assistant reported an error for: ${prompt}`);
}

async function record(name, demo, creds) {
  const { send, close } = await launch();
  const page = pageApi(send);
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    // Settings first (same origin), then the key into the encrypted vault, then a clean load.
    log('open');
    await send('Page.navigate', { url: `${APP}/?lang=en` });
    await page.waitFor(`document.readyState === 'complete'`);
    log('settings');
    await page.evaluate(`(() => {
      localStorage.setItem('opendraw:theme', JSON.stringify({ theme: 'dark' }));
      localStorage.setItem('opendraw:locale', 'en');
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
    const rec = recorder(send);
    await sleep(900);
    for (const prompt of demo.prompts) {
      await runPrompt(page, prompt, marks, rec);
      await sleep(7000); // the reveal, then the animations playing
    }
    marks.push({ at: rec.now(), what: 'end' });
    const frames = await rec.stop();
    return { frames, marks };
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

function writeGif(name, frames, marks) {
  const dir = mkdtempSync(join(tmpdir(), `opendraw-gif-${name}-`));
  const map = timeline(marks);
  const step = 1000 / FPS;
  // Resample to a fixed frame rate on the squeezed timeline.
  const out = [];
  let next = 0;
  for (const f of frames) {
    const t = map(f.t);
    while (t >= next) {
      out.push(f);
      next += step;
    }
  }
  out.forEach((f, i) => writeFileSync(join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64')));
  mkdirSync(OUT, { recursive: true });
  const gif = join(OUT, `${name}.gif`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'),
    '-vf', `scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
    '-loop', '0', gif,
  ]);
  rmSync(dir, { recursive: true, force: true });
  return { gif, frames: out.length };
}

// ---------------------------------------------------------------------------

const creds = credentials();
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DEMOS);
for (const name of names) {
  const demo = DEMOS[name];
  if (!demo) throw new Error(`Unknown demo ${name}; one of ${Object.keys(DEMOS).join(', ')}`);
  process.stdout.write(`${name}: recording… `);
  const { frames, marks } = await record(name, demo, creds);
  const { gif, frames: n } = writeGif(name, frames, marks);
  console.log(`${n} frames → ${gif}`);
}
