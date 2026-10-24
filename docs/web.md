# ArkDraw on the web

The desktop app (Tauri) and the website are the same build. At runtime
`isTauri()` (`src/lib/platform.ts`) decides which shell we are in; in a plain
browser `src/main.tsx` hands off to `bootWeb()` (`src/web/boot.tsx`), which
adds everything in this document. None of it runs in the desktop app.

| Piece | Where |
| --- | --- |
| Startup / mode switch | `src/web/boot.tsx`, `src/web/launch.ts` |
| Share links | `src/web/shareLink.ts` |
| Loading URLs / payloads | `src/web/loadDiagram.ts` |
| Read-only viewer (lightbox) | `src/viewer/` |
| Embed API | `src/web/embed.ts`, `src/web/EmbedBar.tsx` |
| PWA (service worker, update toast) | `src/web/pwa.ts`, `src/web/PwaUpdatePrompt.tsx`, `public/manifest.webmanifest`, `public/pwa/` |
| Docker / nginx | `Dockerfile`, `.dockerignore`, `deploy/nginx.conf`, `scripts/web/csp.mjs` |

## Running and building

```sh
npm install --legacy-peer-deps
npm run dev            # http://localhost:1420 (no service worker in dev)
npm run build:web      # → dist/ (+ dist/_headers for Netlify/Cloudflare Pages)
npm run preview:web    # serve dist/ on http://localhost:4173 (service worker active)
```

`npm run build` (used by `tauri build`) produces the same bundle; under
`tauri build` the PWA plugin is disabled (`TAURI_ENV_PLATFORM` is set), so no
`sw.js` is emitted, and `registerPwa()` refuses to run under Tauri anyway.

## URL reference

| Parameter | Meaning |
| --- | --- |
| `#R<data>` | Diagram compressed into the fragment (share link). |
| `#U<url>` | Fetch the diagram from a URL (URI-encoded). |
| `?url=<url>` | Same as `#U`. Relative URLs resolve against the app; GitHub `blob/` links are rewritten to `raw.githubusercontent.com`. Only `http(s)` is accepted. |
| `?viewer=1` / `?lightbox=1` | Read-only viewer instead of the editor. |
| `?embed=1` | Editor driven by a parent window over `postMessage`. |
| `?title=` | Document title. |
| `?page=` | Initial page: 1-based index, page id or page name. |
| `?theme=dark\|light` (or `?dark=1`) | Theme for this session only (not saved). |
| `?toolbar=0` | Viewer: hide all chrome (tiny embeds). |
| `?autosave=1` | Embed: post `autosave` events. |
| `?origin=https://host` | Embed: the only parent origin we accept and post to. |
| `?proto=json` | Embed: send JSON strings instead of objects. |
| `?saveBtn=0`, `?exitBtn=0` (or `noSaveBtn=1`, `noExitBtn=1`) | Embed: hide the floating Save / Exit buttons. |

Supported content everywhere (share links, URLs, `load` messages, drag & drop
into the viewer): ArkDraw JSON (`.opendraw`), mxGraph XML (`.drawio`, plain
or compressed), and PNG/SVG/PDF exports carrying an embedded mxGraph or
ArkDraw diagram.

## Share links

```
https://draw.example.com/#R<base64url(deflate-raw(utf8(json)))>
https://draw.example.com/?viewer=1#R…
```

The fragment never reaches the server, so a shared diagram is visible only to
people who have the link. mxGraph `#R` links (standard base64 of a
URI-encoded XML) decode too.

```ts
import { encodeShareHash, decodeShareHash, buildShareUrl } from '@/web/shareLink';

encodeShareHash(json)            // '#R…' (leading '#' included)
decodeShareHash('#R…')           // diagram text; also accepts 'R…' or a full URL
buildShareUrl(json, { viewer: true, params: { title: 'Network' } })
```

Opening a link in the editor loads the diagram as an **unsaved** document and
removes the fragment from the address bar, so a reload restores the edited
copy (via crash recovery) instead of re-opening the link. If the user had
unsaved work from an earlier session, they are asked whether to open the shared
diagram or keep their work.

Inflating is capped at 64 MB (zip-bomb guard); downloads via `?url=` are capped
at 30 MB. Browsers handle URLs up to ~2 MB, which fits very large diagrams
after compression; for bigger files host them and use `?url=`.

## Viewer / lightbox

`?viewer=1` (or `?lightbox=1`) plus any source above. It renders with the
editor's own element renderers, so it matches the canvas and exports exactly.

- Page tabs, layer visibility toggles (pages with more than one layer).
- Pan: drag, wheel/trackpad scroll. Zoom: Ctrl/⌘ + wheel, pinch (touch and
  trackpad, including Safari gestures), double-click, the zoom buttons.
- Keys: `+` / `-` zoom, `0` 100 %, `F` or `Shift+1` fit, `←` / `→` pages.
- Hover cards for tooltips and links; clicking a linked shape follows it
  (`page:` links switch page; web/mail/phone links open in a new tab; anything
  else is refused).
- Dark/light toggle (diagram colors adapt like the editor's default).
- **Edit in ArkDraw** opens the editor with the same diagram (a `#R` link,
  or the same `?url=`). Inside an iframe it opens a new tab.
- Without a source it shows a drop zone / file picker; nothing is uploaded.

Embedding a read-only diagram in a wiki or blog:

```html
<iframe
  src="https://draw.example.com/?lightbox=1&url=https%3A%2F%2Fexample.com%2Farch.drawio"
  style="width:100%;height:480px;border:0" loading="lazy"></iframe>
```

The fetched file must be served with CORS (`Access-Control-Allow-Origin`) —
GitHub raw files, S3/GCS public buckets and most CDNs do.

## Embed mode (`?embed=1`)

The full editor in an iframe, controlled by the parent page — modelled on
mxGraph's embed protocol.

```html
<iframe id="od" src="https://draw.example.com/?embed=1&autosave=1&origin=https://app.example.com"></iframe>
<script>
  const od = document.getElementById('od');
  window.addEventListener('message', (e) => {
    if (e.source !== od.contentWindow || e.origin !== 'https://draw.example.com') return;
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.event === 'init') od.contentWindow.postMessage({ action: 'load', json: savedJson, title: 'Design' }, 'https://draw.example.com');
    if (msg.event === 'save' || msg.event === 'autosave') persist(msg.json);
    if (msg.event === 'exit') od.remove();
  });
</script>
```

**Parent → editor**

| Message | Effect |
| --- | --- |
| `{ action: 'load', json?, xml?, title?, autosave? }` | Open a diagram. `json` may be a string or object; `xml` may be mxGraph XML or ArkDraw JSON. Empty = blank document. |
| `{ action: 'export', format, page?, scale?, background? }` | `format`: `svg`, `png`, `json`, `drawio`. `page`: index (1-based), id or name (default: current). `scale`: PNG scale (default 2). `background`: CSS color or `null` for transparent (default: page background; white for PNG). |
| `{ action: 'status', modified: false }` | The host has saved; clears the dirty marker. |
| `{ action: 'exit' }` | Asks the editor to close; it answers with an `exit` event. |

**Editor → parent**

| Event | Payload |
| --- | --- |
| `init` | Ready for `load`. |
| `load` | `{ pages, title }` |
| `save` | `{ json, title, modified, exit }` — Ctrl/⌘+S or the Save button. The document is marked saved when the event is sent. |
| `autosave` | `{ json, title }` — debounced (1 s), only with `?autosave=1` (or `load` with `autosave: true`), only when the diagram changed. |
| `export` | `{ format, mime, data, title, page?, width?, height? }` — `data` is a data URI for `svg`/`png`, text for `json`/`drawio`. |
| `exit` | `{ modified }` — Exit button or `exit` action. |
| `error` | `{ action, message }` |

Every request may carry an `id`; replies echo it. If the parent sends JSON
strings (mxGraph style), or with `?proto=json`, replies are JSON strings.

A manual test host lives at `test/web/embed-host.html`
(`http://localhost:1420/test/web/embed-host.html` with the dev server).

### Security considerations

- **Who can drive the editor.** Only messages whose `event.source` is
  `window.parent` are processed — other frames, popups, or the page itself are
  ignored.
- **Origins.** With `?origin=https://host` the editor accepts messages only
  from that origin and posts only to it. Without it, the editor infers the
  parent origin (`location.ancestorOrigins` / `document.referrer`) for the
  `init` event and **pins the first origin that sends a valid action** for
  the rest of the session; later messages from other origins are dropped.
  Production integrations should always pass `?origin=`.
- **Hosts must check too.** Diagram data is posted to the parent; the host
  should verify `e.source === iframe.contentWindow` and `e.origin` before
  trusting `save`/`export` payloads.
- **Clickjacking / framing.** Embedding requires the app to be frameable.
  The bundled nginx config sends `frame-ancestors ${FRAME_ANCESTORS}`
  (default `*`). Restrict it to your hosts, e.g.
  `FRAME_ANCESTORS="'self' https://app.example.com"`. Nothing in ArkDraw is
  authenticated, so the residual risk of framing is low, but restricting it is
  good hygiene.
- **The user's own drafts stay private.** In embed mode the editor's
  crash-recovery draft is hidden from the embedded session (so a host cannot
  `export` a user's unrelated work) and the embedded document is never written
  into it.
- **Content.** Loaded diagrams are parsed, not executed. Links only open
  `http(s)`, `mailto:` and `tel:` URLs. `?url=` only fetches `http(s)` URLs,
  without credentials.
- **Known gap.** The menu's *File → Save* still downloads a file in embed mode
  (only Ctrl/⌘+S and the Save button are routed to the host). Core code can
  check `isEmbedded()` from `src/web/embed.ts` to route it.

## Offline / PWA

The web build is an installable PWA (`vite-plugin-pwa`, Workbox `generateSW`):

- **Precached** (available offline after the first visit): the app shell —
  `index.html`, all JS/CSS chunks, fonts, the manifest and icons (~5 MB).
- **Runtime-cached** on first use: the vendor icon packs under `/icons/**`
  (~12 MB in total, cache-first, 90 days). Icons you have used work offline;
  others need a connection the first time.
- **Updates** use a prompt: when a new version is installed the
  `<PwaUpdatePrompt />` toast offers *Reload* (unsaved work is restored by
  crash recovery). Long-lived tabs check for updates hourly.
- **File handling.** Installed on Chromium, the app registers for `.opendraw`
  and `.drawio` files (`file_handlers` + `launchQueue`).
- **Never in the desktop app**: the plugin is disabled for `tauri build`, and
  `registerPwa()` returns early (and unregisters any stray worker) under Tauri.

Regenerate the PWA icons after changing `app-icon.svg`:

```sh
npm run pwa:icons
```

To drop the offline cache while debugging: DevTools → Application → Storage →
*Clear site data*.

## Deploying

### Docker

```sh
docker build -t opendraw .
docker run --rm -p 8080:8080 opendraw                 # http://localhost:8080

# restrict who may iframe the app (embed/lightbox)
docker run --rm -p 8080:8080 -e FRAME_ANCESTORS="'self' https://wiki.example.com" opendraw
# different port inside the container
docker run --rm -p 80:3000 -e PORT=3000 opendraw
```

Multi-stage: `node:22-alpine` builds (`npm ci`, `npm run build:web`), then
`nginx:1.27-alpine` serves `dist/`. The nginx config (`deploy/nginx.conf`):

- SPA fallback to `index.html`; `/assets/` and `/icons/` never fall back
  (a missing chunk is a 404, not HTML).
- `Cache-Control`: hashed `/assets/*` and `workbox-*.js` are
  `immutable` for a year; `index.html`, `sw.js`, `registerSW.js` and the
  manifest are `no-cache` so updates are picked up immediately; icons a week.
- gzip with pre-compressed `.gz` files (`gzip_static`) built into the image.
  For brotli, terminate at a CDN that compresses, or use an nginx build with
  `ngx_brotli` and uncomment the `brotli_*` lines.
- MIME types for `.webmanifest`, `.opendraw` (`application/x-opendraw+json`)
  and `.drawio`.
- CSP: `script-src 'self'` plus the hash of the inline theme script (computed
  from the built `index.html` by `scripts/web/csp.mjs`, so it can't drift);
  `connect-src` allows `https:` (for `?url=` and AI providers) and
  `localhost` (Ollama); `img-src` allows remote images used by image shapes;
  `style-src` / `font-src` allow `fonts.googleapis.com` / `fonts.gstatic.com`
  for Google Fonts picked in Text → Font (only requested when a diagram uses one);
  `frame-ancestors` from `FRAME_ANCESTORS`.
- `/healthz` for health checks (also used by the image's `HEALTHCHECK`).

Sub-path deployments behind a prefix-stripping reverse proxy:
`docker build --build-arg BASE_PATH=/opendraw/ -t opendraw .`

### Static hosts

The output in `dist/` is fully static. All app modes use query strings and
fragments on the root path, so no rewrite rules are required (an SPA fallback
to `index.html` is harmless). Get the CSP for your host with:

```sh
node scripts/web/csp.mjs dist                     # prints the policy
FRAME_ANCESTORS="'self'" node scripts/web/csp.mjs dist
```

**Netlify / Cloudflare Pages.** Build command `npm run build:web`, publish
directory `dist`. `build:web` writes `dist/_headers` (CSP, caching, security
headers), which both hosts read.

### Cloudflare Workers

The editor at https://app.arkdraw.com is an assets-only Worker
([`wrangler.jsonc`](../wrangler.jsonc)), and the landing page at
https://arkdraw.com / https://www.arkdraw.com is another one
([`site/`](../site), static files plus a small [`worker.js`](../site/worker.js)
that answers range requests for `/media/*`, which Safari needs to play the
videos). Both fit the free plan (static requests are free; up to 20,000 files
and 25 MiB per file per deployment, and the build is about 14,600 files with
the icon packs). Preview the landing locally with `npm run site:dev`
(http://localhost:8788).

The [Deploy web](../.github/workflows/deploy-web.yml) workflow deploys both.
A push to `main` only runs CI; nothing reaches the site until you ask for it:

| You want to ship | Do this |
| --- | --- |
| A web-only fix | Push to `main`, wait for CI, then *Actions → Deploy web → Run workflow* |
| A version (web and desktop) | Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, push, wait for CI, then push the tag: `git tag v1.2.3 && git push origin v1.2.3` |

A stable tag (`v1.2.3`) also starts the [release](release.md) workflow, which
publishes the desktop installers as a GitHub Release. After every deploy, and
daily, the [Smoke](../.github/workflows/smoke.yml) workflow checks production;
run the same checks locally with `npm run smoke:prod`.

One-time setup (maintainers). Nothing secret goes in the repository:

1. The domain's zone (`arkdraw.com`) must be active in the Cloudflare account.
   If it has `A`/`AAAA`/`CNAME` records for `arkdraw.com`, `www` or `app`,
   delete them: the first deploy creates the records and certificates.
2. Cloudflare dashboard → *My Profile* → *API Tokens* → *Create Token* →
   template **Edit Cloudflare Workers**. Account resources: your account; zone
   resources: `arkdraw.com`. Create it and copy it once.
3. Copy the **Account ID** (Workers & Pages overview, right-hand column).
4. Store both as repository secrets: *Settings → Secrets and variables →
   Actions → New repository secret*, named `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`. (`gh secret set NAME` works too, but it saves an
   empty value if the paste doesn't reach its prompt; the secret then exists
   and the workflow still reports it as not set.)
5. *SSL/TLS → Edge Certificates → Always Use HTTPS*: on, so `http://` links
   redirect.

Deploy by hand from a clone (uses your own `wrangler login`):

```sh
npm run icons:fetch && npm run build:web
npx wrangler@4 deploy                # editor → app.arkdraw.com
cd site && npx wrangler@4 deploy     # landing → arkdraw.com, www.arkdraw.com
```

Forks without the secrets still build in the workflow; the upload step is
skipped.

**Vercel.** Framework preset *Vite*, build command `npm run build:web`, output
`dist`. Vercel ignores `_headers`; add a `vercel.json`:

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Content-Security-Policy", "value": "<output of scripts/web/csp.mjs dist>" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" } ] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/(sw.js|index.html|manifest.webmanifest)", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

**GitHub Pages** (project site at `https://<user>.github.io/<repo>/`): build
with the repo name as base path; everything (assets, manifest, service worker
scope, icon packs) follows it.

```sh
npm run build:web -- --base=/<repo>/
```

```yaml
# .github/workflows/pages.yml (excerpt)
- run: npm ci --legacy-peer-deps
- run: npm run build:web -- --base=/${{ github.event.repository.name }}/
- uses: actions/upload-pages-artifact@v3
  with: { path: dist }
- uses: actions/deploy-pages@v4
```

GitHub Pages cannot set response headers, so there is no CSP there (use a
`<meta http-equiv="Content-Security-Policy">` only if you need one; note that
`frame-ancestors` is ignored in meta tags). User/organisation sites and custom
domains use the default base `/`.
