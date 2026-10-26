# ArkDraw overview

The details that used to live in the README: features, editions, formats, icon packs, CLI, AI, animation, project layout and scripts.

## Features: draw

- **Infinite canvas** with grid snapping, smart alignment and equal-spacing guides, rulers (px, pt, in, mm, m), page view with paper sizes, an outline/minimap, and focus mode.
- **Connectors** with orthogonal auto-routing that avoids shapes, plus straight, curved, elbow, entity-relation and isometric styles, waypoints, line jumps, 28 arrowheads including crow's-foot, fixed and custom connection points, multiple labels and connector-to-connector glue.
- **1,200+ shapes in 40+ libraries**: General, Flowchart, UML and UML 2.5, ER, C4, BPMN 2.0, ArchiMate 3, SysML, Cisco-style network, Rack, Citrix, Veeam, OpenStack, Office/M365, Active Directory, STRIDE, Bootstrap, Electrical, P&amp;ID, Floorplan, Lean/VSM, Mockups, isometric, clipart, EIP and more. Parametric shapes have yellow handles.
- **Template gallery** with 15 categories, live previews and "insert into current diagram".
- **Automatic layouts**: flow, tree, radial, org chart, mind map (with `Tab` / `Ctrl+Enter` tree editing), organic, circle and grid.

## Features: style and annotate

- Hand-drawn **sketch** style (Rough.js), gradients, glass, shadows, per-fill/stroke/text opacity.
- Formatted labels (a Markdown subset) with **LaTeX math** via MathJax, tables, images, freehand drawing and sticky notes.
- **Animated diagrams**: flow, dots and pulse connectors, shape emphasis, step-by-step build sequences, previewed on the canvas with `Alt+P` and exported as GIF.
- **Dark mode** for the UI that can also re-tint diagram colours.

## Features: organise

- Multi-page documents, layers (hide, lock, reorder), tags with a tag filter, groups and collapsible containers.
- Edit Data (custom properties, tooltips, links, `%placeholder%` labels), raw Edit Style, and Edit Diagram as JSON.
- Find and replace (regex, all pages), a **command palette** (`Ctrl/⌘+K`), and familiar shortcuts generated from one action registry.
- Comment threads stored in the file, local revision history, a Scratchpad, and custom libraries (`.arkdrawlib`; mxGraph `<mxlibrary>` files import too).

## Web vs desktop

Both editions come from the same Vite build. At runtime `isTauri()` (`src/lib/platform.ts`) picks the shell; in a plain browser, `src/web/boot.tsx` adds the web-only pieces.

| | Desktop (Tauri) | Web / PWA |
| --- | --- | --- |
| **Files** | Native open/save dialogs, atomic writes, recent files, `.arkdraw` file association | File picker / `showSaveFilePicker`, downloads |
| **Offline** | Always | Installable PWA; the app shell is precached, icon packs are cached on first use |
| **AI keys** | OS keychain; requests are sent by Rust | Held in memory for the tab only |
| **CLI export** | `arkdraw --export …` | — |
| **Sharing** | Export as link | `#R…` share links, `?viewer=1` read-only viewer, `?embed=1` postMessage embed API, `?url=` |
| **Deploy** | Installers | Static `dist/`, Docker + nginx, Netlify, Cloudflare Pages, Vercel, GitHub Pages |

```sh
npm run build:web && npm run preview:web    # http://localhost:4173, service worker active
npm run docker:build && npm run docker:run  # http://localhost:8080
```

[`docs/web.md`](docs/web.md) is the full reference for self-hosting the web edition: URL parameters, the share-link format, the viewer, the embed protocol and its security model, PWA behaviour, the Docker image and CSP, and static hosting.

## Import and export

| Format | Import | Export | Notes |
| --- | :---: | :---: | --- |
| ArkDraw `.arkdraw` | ✓ | ✓ | Pretty-printed JSON, git-friendly; keeps the AI conversation (never exported) |
| mxGraph XML `.drawio`, `.xml` | ✓ | ✓ | Compressed or plain; `flow` animation survives as `flowAnimation=1` |
| PNG / SVG / PDF with an embedded diagram | ✓ | ✓ | "Include a copy of the diagram" makes the image re-editable |
| PNG, JPEG, WebP | | ✓ | Scale, border, transparent background, selection only |
| SVG | | ✓ | Same renderer as the canvas |
| PDF | | ✓ | Vector, multi-page, page ranges |
| HTML | | ✓ | Self-contained and interactive |
| Visio `.vsdx` | ✓ | ✓ | Import is best-effort (also `.vssx` stencils) |
| Gliffy | ✓ | | Best-effort |
| Lucid | ✓ | | Standard Import format |
| Mermaid | ✓ | | Flowchart, sequence, class, ER, state, mindmap, converted to native shapes |
| CSV | ✓ | | CSV |
| SQL | ✓ | | `CREATE TABLE` DDL becomes an ER diagram |
| Text | ✓ | | Indented lists or `a -> b` edges |
| Animated GIF | | ✓ | Encoded in a Web Worker, matches the canvas preview |
| Share link | ✓ | ✓ | Diagram compressed into the URL fragment |

Exports can use light, dark or automatic appearance, include the grid, and be printed or copied to the clipboard as PNG or SVG.

## Cloud icon packs and licensing

| Pack | Icons | Pack | Icons |
| --- | ---: | --- | ---: |
| AWS | 810 | Alibaba Cloud | 270 |
| Microsoft Azure | 627 | IBM Cloud | 211 |
| Google Cloud | 261 | Kubernetes | 39 |
| Oracle OCI | 180 | Tech logos (Iconify `logos`) | 2,016 |
| Material Symbols (Apache-2.0) | 3,928 | Fluent UI (MIT) | 2,444 |
| Bootstrap Icons (MIT) | 2,076 | Font Awesome Free (CC BY 4.0) | 1,565 |

Counts come from the last `icons:fetch` (`public/icons/providers.json`). Search is fuzzy: it handles typos ("lamda"), acronyms and cross-cloud synonyms ("vnet"), and icons come with one-line descriptions shown in a hover card.

> [!IMPORTANT]
> **The vendor icons are not MIT-licensed.** They're third-party trademarks, used under each vendor's own terms for drawing architecture diagrams, so they aren't committed to this repo: `.gitignore` excludes them, `npm run icons:fetch` downloads them, and the release workflow bundles them into installers. [`public/icons/LICENSES.md`](public/icons/LICENSES.md) lists the source, version and terms of every pack; read it before you redistribute a build. The icon descriptions (`public/icons/*/descriptions.json`) are ArkDraw's own.

## Command-line export

The desktop binary exports without opening a window, for CI and docs pipelines:

```sh
arkdraw --export architecture.arkdraw --format png --output architecture.png --scale 2
arkdraw -x flows.drawio -f pdf --all-pages --embed -o flows.pdf
```

Formats: PNG, SVG, PDF, JPG, WebP, HTML, VSDX, .drawio and URL. Rendering runs in the hidden WebView, so the output matches the Export dialog. See [`docs/cli-export.md`](docs/cli-export.md) for every option, exit codes and Windows notes.

## AI assistant (bring your own key)


*Extras → Generate with AI…* (`Ctrl/⌘+I`) opens a panel with two modes:

- **Generate** creates a diagram from a prompt; insert it or replace the current diagram.
- **Edit** changes the existing diagram ("add a CDN in front of the load balancer").

The model works in a tool-calling loop: it searches the installed icon packs (`search_icons`), then submits a diagram spec or a list of edit operations, which ArkDraw validates, lays out and turns into native shapes (`src/ai/generate/`).

| Provider | Notes |
| --- | --- |
| Anthropic | Claude models |
| OpenAI | |
| Google Gemini | |
| Ollama | Local, no key needed; configurable endpoint |
| Custom endpoint | OpenAI-compatible; bearer or `api-key` auth (Azure OpenAI) |

Configure it in *Extras → AI provider & API key…*.

- **Desktop:** keys are stored in the OS keychain. Requests are sent by Rust (`src-tauri/src/ai.rs`), which adds the auth header itself, talks only to the provider's host (or the endpoint the key was saved for), doesn't follow redirects, and never hands the key back to the WebView.
- **Browser:** keys stay in memory for the current tab only, and the UI shows a warning.


## Animation and GIF export


- Connectors can animate as **flow** (marching dashes), **dots** (travelling along the path) or **pulse** (the stroke glows and fades).
- Shapes can pulse, glow or bounce, and elements can get a **build-sequence step** so they reveal one after another.
- Set it up in the Format panel's **Animation** section and preview on the canvas with `Alt+P`.

*File → Export → GIF* renders frames with the same SVG renderer as the canvas and encodes them in a Web Worker (`gifenc`), so the GIF matches the preview. See [`docs/specs/animation.md`](docs/specs/animation.md).


## Project structure


```
.
├── src/                  React + TypeScript front end (shared by desktop and web)
│   ├── app/              action/shortcut registry, commands, file lifecycle, clipboard, print, revisions
│   ├── canvas/           SVG canvas, interactions, snapping, text editor, shape picker
│   ├── chrome/           title bar and menus, toolbar, dialogs (export, templates, …), page tabs, outline
│   ├── panels/           shapes/icons/layers panel and the Format panel
│   ├── model/ store/     document model, Zustand stores (document + history, UI state)
│   ├── shapes/           shape registry, built-in libraries, rich-text and sketch renderers
│   ├── icons/ search/    vendor icon packs, fuzzy search for shapes, icons and templates
│   ├── layout/           auto-layout algorithms (auto-discovered)
│   ├── templates/        template gallery
│   ├── io/               .arkdraw format, mxGraph interop, importers, exporters, VSDX writer
│   ├── ai/               provider adapters, agent loop, spec → diagram
│   ├── animation/        animation timeline
│   ├── viewer/ web/      read-only viewer, web boot, share links, embed API, PWA
│   └── lib/ ui/          geometry, connector routing, platform detection, UI primitives
├── src-tauri/            Tauri 2 shell (Rust): file I/O, recent files, CLI export, AI keychain + HTTP
├── public/               static assets, PWA manifest, vendor icon packs (fetched)
├── scripts/              icon pack builder, PWA icon generator, CSP generator
├── test/                 Vitest suites
├── docs/                 web edition, CLI export, animation spec
└── deploy/, Dockerfile   nginx image for the web edition
```


## npm scripts


| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:1420 (web edition, no service worker) |
| `npm run build` | Typecheck and production build to `dist/` (used by Tauri) |
| `npm run typecheck` / `npm test` | `tsc --noEmit` / Vitest suites |
| `npm run tauri <cmd>` | Tauri CLI, e.g. `npm run tauri dev`, `npm run tauri build` |
| `npm run app:build:mac-universal` | `tauri build --target universal-apple-darwin` |
| `npm run app:icons` / `pwa:icons` | Regenerate desktop / PWA icons from `app-icon.svg` |
| `npm run app:file-icons` | Regenerate the `.arkdraw` document icon from `file-icon.svg` |
| `npm run icons:fetch` | Download and sanitise vendor icon packs into `public/icons/` |
| `npm run icons:check-descriptions` | Check icon description coverage |
| `npm run build:web` / `preview:web` | Web build with `dist/_headers` (CSP, caching) / serve it on :4173 with the service worker |
| `npm run docker:build` / `docker:run` | Build and run the nginx image on port 8080 |

