<div align="center">

# OpenDraw

**Open-source diagramming that runs offline: a draw.io alternative built with Tauri, React and TypeScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/gabe-santana/opendraw/actions/workflows/ci.yml/badge.svg)](https://github.com/gabe-santana/opendraw/actions/workflows/ci.yml)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-lightgrey.svg)](#web-vs-desktop)

</div>

OpenDraw is a diagram editor for flowcharts, UML, ER diagrams, cloud and network architecture, BPMN, wireframes, mind maps and more. It ships as a small native desktop app (Tauri 2 / Rust) and as a fully static web app / PWA built from the same code. Diagrams are local files: `.opendraw` is pretty-printed JSON that diffs cleanly in git. OpenDraw opens and saves draw.io files, imports Visio, Gliffy, Lucid, Mermaid, CSV and SQL, and exports to PNG, SVG, PDF, HTML, VSDX and animated GIF. Nothing goes to a server unless you configure an AI provider with your own key.

![OpenDraw editor with an AWS architecture diagram](docs/screenshots/editor.png)

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
- [Web vs desktop](#web-vs-desktop)
- [Building and releasing](#building-and-releasing)
- [Command-line export](#command-line-export)
- [AI assistant (bring your own key)](#ai-assistant-bring-your-own-key)
- [Animation and GIF export](#animation-and-gif-export)
- [Icon packs and licensing](#icon-packs-and-licensing)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## Features

[`docs/PARITY.md`](docs/PARITY.md) has the full status against draw.io's feature set, item by item.

**Editor**
- Infinite canvas with grid snapping, smart guides (alignment and equal spacing), rulers in px, pt, in, mm or m, page view with paper sizes, an outline/minimap, and focus mode.
- Multi-page documents, layers (hide, lock, reorder, move selection), tags with a tag filter, groups and collapsible containers.
- Connectors with orthogonal auto-routing that avoids shapes, plus straight, curved, elbow, entity-relation and isometric routing. Connectors support manual waypoints, line jumps, and 20 arrowheads including crow's-foot.
- Tables, images, freehand drawing, sticky notes, and formatted labels (a Markdown subset) with LaTeX math via MathJax.
- Hand-drawn "sketch" style (Rough.js), gradients, glass, shadows, and per-fill, stroke and text opacity. Dark mode can re-tint diagram colours.
- Edit Data (custom properties, tooltips, links to URLs or other pages, `%placeholder%` labels), raw Edit Style, and Edit Diagram as JSON.
- Find and replace (regex, whole word, all pages), a command palette (`Ctrl/⌘+K`), and draw.io-compatible shortcuts generated from one action registry.
- Automatic layouts: horizontal and vertical flow and tree, radial and compact tree, org chart, mind map, organic, circle and grid. Mind maps support `Tab` / `Ctrl+Enter` tree editing.
- Comment threads (replies, resolve) stored in the file, plus local revision history and crash recovery.

**Shapes**
- 300+ built-in shapes in 25+ libraries, including General, Basic, Arrows, Flowchart, UML, ER, C4, BPMN 2.0, ArchiMate 3, SysML, Network, Rack, Electrical, P&ID, Floorplan, Lean/VSM, Mockups, Android, iOS, Mind map, Infographic, Kanban, org chart, timeline/Gantt and Venn.
- Optional vendor icon packs: AWS, Azure, Google Cloud, Oracle OCI, Alibaba Cloud, IBM Cloud, Kubernetes, and about 2,000 tech logos. See [Icon packs and licensing](#icon-packs-and-licensing).
- Fuzzy shape and icon search that handles typos, acronyms and cross-cloud synonyms.
- A Scratchpad and custom libraries (`.opendrawlib`); draw.io `<mxlibrary>` files can be imported too.
- A template gallery of 15 categories, with live previews and "insert into current diagram".

**Import**
- draw.io / diagrams.net (`.drawio`, `.xml`, compressed or plain), plus editable PNG, SVG and PDF files with an embedded draw.io or OpenDraw diagram.
- Best-effort import of Visio (`.vsdx`, `.vssx`), Gliffy and Lucid (Standard Import format).
- Mermaid (flowchart, sequence, class, ER, state, mindmap), converted to native editable shapes.
- draw.io-style CSV, SQL `CREATE TABLE` DDL (converted to an ER diagram), and indented lists or `a -> b` text.

**Export**
- PNG, JPEG, WebP, SVG, PDF (vector, multi-page), self-contained interactive HTML, draw.io, Visio `.vsdx`, animated GIF, and a compressed share link.
- Options include scale, border, transparent background, selection only, page range, grid, light/dark/auto appearance, and "include a copy of the diagram" so a PNG, SVG or PDF can be reopened for editing.
- Print, copy as PNG or SVG, and headless [command-line export](#command-line-export) on desktop.

**Web edition**
- Share links: the diagram is compressed into the URL fragment and never reaches a server.
- A read-only viewer (lightbox) for iframes.
- A `postMessage` embed API modelled on draw.io's.
- Offline PWA, and a Docker image served by nginx.

Out of scope by design: cloud storage integrations (Google Drive, OneDrive, Dropbox, GitHub), real-time multi-user editing, and server-rendered PlantUML. [`docs/PARITY.md`](docs/PARITY.md) explains what OpenDraw offers instead.

## Screenshots

The image files are placeholders; add captures to `docs/screenshots/` to fill them in.

| | |
| --- | --- |
| ![Shapes panel with library search and the Format panel open on a flowchart](docs/screenshots/flowchart.png) | ![Vendor icon packs: searching AWS and Azure icons in the Icons tab](docs/screenshots/icon-packs.png) |
| ![AI assistant panel generating an architecture diagram from a prompt](docs/screenshots/ai-assistant.png) | ![Export dialog with PNG, SVG, PDF, HTML, GIF, draw.io and VSDX formats](docs/screenshots/export-dialog.png) |
| ![Template gallery with categories and a live preview](docs/screenshots/templates.png) | ![Dark theme with adaptive diagram colours](docs/screenshots/dark-mode.png) |
| ![Read-only web viewer with page tabs and layer toggles](docs/screenshots/viewer.png) | ![Animated connectors exported as a GIF](docs/screenshots/animation.gif) |

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (CI uses 22).
- [Rust](https://rustup.rs/) stable. Only the desktop app needs it; the browser build doesn't.
- Platform dependencies for Tauri:
  - **Windows**: Microsoft C++ Build Tools and WebView2. WebView2 ships with Windows 10 (1803+) and 11.
    ```powershell
    winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    ```
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
  - **Linux (Debian/Ubuntu)**: the packages CI installs:
    ```sh
    sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
    ```
  - The [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) covers other distributions.

### Run

```sh
git clone https://github.com/gabe-santana/opendraw.git
cd opendraw
npm install            # .npmrc sets legacy-peer-deps
npm run icons:fetch    # optional: download vendor icon packs into public/icons (not committed)
npm run dev            # browser edition at http://localhost:1420
npm run tauri dev      # desktop app (starts the dev server for you)
```

`icons:fetch` downloads each vendor's official archive, sanitises the SVGs and writes manifests to `public/icons/`. It's optional: without it the app works normally, but the Icons tab shows a hint instead of the vendor packs. Set `GITHUB_TOKEN` if you hit GitHub API rate limits.

## Web vs desktop

The desktop app and the website come from the same Vite build. At runtime `isTauri()` (`src/lib/platform.ts`) picks the shell. In a plain browser, `src/web/boot.tsx` adds the web-only pieces.

| | Desktop (Tauri) | Web / PWA |
| --- | --- | --- |
| Files | Native open/save dialogs, atomic writes, recent files, `.opendraw` file association | File picker / `showSaveFilePicker`, downloads |
| Offline | Always | Installable PWA; the app shell is precached, and icon packs are cached on first use |
| AI keys | OS keychain; requests sent by Rust | Held in memory for the tab only |
| CLI export | `opendraw --export …` | — |
| Share links, viewer, embed API | Export as link | `#R…` links, `?viewer=1`, `?embed=1`, `?url=` |
| Deploy | Installers | Static `dist/`, Docker + nginx, Netlify, Cloudflare Pages, Vercel, GitHub Pages |

[`docs/web.md`](docs/web.md) is the full reference for the web edition: URL parameters, share-link format, viewer, embed protocol and its security model, PWA behaviour, the Docker image and CSP, and static hosting.

```sh
npm run build:web && npm run preview:web    # http://localhost:4173, service worker active
npm run docker:build && npm run docker:run  # http://localhost:8080
```

## Building and releasing

```sh
npm run tauri build                 # installers for the current OS
npm run app:build:mac-universal     # macOS universal (Apple Silicon + Intel)
```

Bundles are written to `src-tauri/target/release/bundle/`. The universal macOS build goes to `src-tauri/target/universal-apple-darwin/release/bundle/`.

| OS | Formats | Config |
| --- | --- | --- |
| Windows | MSI (WiX) and NSIS `.exe` (per-user install, WebView2 bootstrapper) | `src-tauri/tauri.windows.conf.json` |
| macOS | `.app` and `.dmg` (universal in CI, macOS 11+) | `src-tauri/tauri.macos.conf.json` |
| Linux | AppImage and `.deb` | `src-tauri/tauri.linux.conf.json` |

**Releases are driven by tags.** Pushing a tag that matches `v*` runs `.github/workflows/release.yml` (it can also be started manually). The workflow:

1. Builds on `windows-latest`, `macos-latest` (`--target universal-apple-darwin`) and `ubuntu-22.04`.
2. Runs `npm ci` and `npm run icons:fetch`. The fetch step is `continue-on-error`, so a vendor download failure doesn't block the release.
3. Uses `tauri-apps/tauri-action` to attach the installers to a **draft** GitHub release named `OpenDraw <tag>`.

```sh
# bump "version" in package.json, src-tauri/tauri.conf.json and src-tauri/Cargo.toml, then:
git tag v0.1.0 && git push origin v0.1.0
```

The workflow doesn't configure code signing or notarisation, so the installers are unsigned unless you add the Tauri signing secrets. `.github/workflows/ci.yml` runs typecheck, tests and the web build on every push and PR, plus `cargo clippy -D warnings`.

## Command-line export

The desktop binary can export without showing a window, for CI and docs pipelines:

```sh
opendraw --export architecture.opendraw --format png --output architecture.png --scale 2
opendraw -x flows.drawio -f pdf --all-pages --embed -o flows.pdf
```

Supported formats are PNG, SVG, PDF, JPG, WebP, HTML, VSDX, draw.io and URL. Rendering runs in the hidden WebView, so the output is identical to the Export dialog. [`docs/cli-export.md`](docs/cli-export.md) lists every option, the exit codes and Windows notes.

## AI assistant (bring your own key)

*Extras → Generate with AI…* (`Ctrl/⌘+I`) opens a panel with two modes:

- **Generate** creates a diagram from a prompt. You can insert it or replace the current diagram.
- **Edit** changes the existing diagram ("add a CDN in front of the load balancer").

The model works in a tool-calling loop. It searches the installed icon packs (`search_icons`), then submits a diagram spec or a list of edit operations. OpenDraw validates the result, lays it out and turns it into native shapes (`src/ai/generate/`).

| Provider | Notes |
| --- | --- |
| Anthropic | Claude models |
| OpenAI | |
| Google Gemini | |
| Ollama | Local, no key needed; configurable endpoint |
| Custom endpoint | OpenAI-compatible; bearer or `api-key` auth (Azure OpenAI) |

Set the provider and key in *Extras → AI provider & API key…*.

- **Desktop:** keys are stored in the OS keychain. Every request is sent by Rust (`src-tauri/src/ai.rs`), which adds the auth header itself, talks only to the provider's own host (or the endpoint the key was saved for), and doesn't follow redirects. The key is never handed back to the WebView.
- **Browser:** keys stay in memory for the current tab only, and the UI shows a warning.

Provider adapters live in `src/ai/providers/`.

## Animation and GIF export

Any connector can animate:

- **Flow:** marching dashes.
- **Dots:** dots travelling along the path.
- **Pulse:** the stroke glows and fades.

Shapes can pulse, glow or bounce. Elements can also be given a build-sequence step, so they reveal one after another. Set all of this in the Format panel's **Animation** section, and preview it on the canvas with `Alt+P`.

*File → Export → GIF* renders the frames with the same SVG renderer as the canvas and encodes them in a Web Worker (`gifenc`), so the GIF matches the preview. `flow` survives a draw.io export as `flowAnimation=1`. [`docs/specs/animation.md`](docs/specs/animation.md) has the spec.

## Icon packs and licensing

| Pack | Icons | Pack | Icons |
| --- | --- | --- | --- |
| AWS | 810 | Alibaba Cloud | 270 |
| Microsoft Azure | 627 | IBM Cloud | 211 |
| Google Cloud | 261 | Kubernetes | 39 |
| Oracle OCI | 180 | Tech logos (Iconify `logos`) | 2,016 |

Counts are from the last `icons:fetch`, in `public/icons/providers.json`.

**The vendor icons are not MIT-licensed.** They're third-party trademarks, used under each vendor's own terms for drawing architecture diagrams. That's why they aren't committed to the repo: `.gitignore` excludes them, `npm run icons:fetch` downloads them, and the release workflow bundles them into installers. [`public/icons/LICENSES.md`](public/icons/LICENSES.md) has the source, version and terms of every pack; read it before you redistribute a build. The one-line icon descriptions (`public/icons/*/descriptions.json`) are OpenDraw's own and are tracked.

## Project structure

```
.
├── src/                  React + TypeScript front end (shared by desktop and web)
│   ├── app/              action/shortcut registry, commands, file lifecycle, clipboard, print, revisions
│   ├── canvas/           SVG canvas, pointer/keyboard interactions, snapping, text editor, shape picker
│   ├── chrome/           title bar and menus, toolbar, dialogs (export, templates, edit data), page tabs, outline, rulers
│   ├── panels/           shapes/icons/layers panel and the Format (properties) panel
│   ├── model/            document model types and defaults
│   ├── store/            Zustand stores (editor document + history, UI state)
│   ├── shapes/           shape registry, built-in libraries, rich-text and sketch renderers
│   ├── icons/            vendor icon pack loading and descriptions
│   ├── search/           fuzzy search engine for shapes, icons and templates
│   ├── layout/           auto-layout algorithms (auto-discovered)
│   ├── templates/        template gallery content and thumbnails
│   ├── io/               .opendraw format, draw.io interop, importers, exporters, VSDX writer
│   ├── ai/               AI assistant: provider adapters, agent loop, spec → diagram
│   ├── animation/        animation timeline
│   ├── viewer/           read-only viewer / lightbox
│   ├── web/              web-only boot, share links, embed API, PWA, crash-recovery guard
│   ├── lib/              geometry, connector routing, text measurement, platform detection
│   └── ui/               shared UI primitives (buttons, menus, dialogs, controls)
├── src-tauri/            Tauri 2 shell (Rust): file I/O, recent files, CLI export, AI keychain + HTTP
├── public/               static assets, PWA manifest and icons, vendor icon packs (fetched)
├── scripts/              icon pack builder, PWA icon generator, CSP generator
├── test/                 Vitest suites (import, export, layout, AI, web, shapes, templates, search)
├── docs/                 web edition, CLI export, animation spec, draw.io parity
├── deploy/               nginx config for the Docker image
├── .github/workflows/    CI and tag-driven releases
├── Dockerfile            web edition image (Node build stage, nginx runtime)
└── DRAWIO_FEATURES.md    draw.io feature inventory used for parity tracking
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:1420 (browser edition, no service worker) |
| `npm run build` | Typecheck and production build to `dist/`; Tauri uses this one |
| `npm run preview` | Serve `dist/` with Vite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest suites once |
| `npm run tauri <cmd>` | Tauri CLI, e.g. `npm run tauri dev`, `npm run tauri build` |
| `npm run app:dev` / `app:build` | Shorthands for `tauri dev` / `tauri build` |
| `npm run app:build:mac-universal` | `tauri build --target universal-apple-darwin` |
| `npm run app:icons` | Regenerate desktop app icons from `app-icon.svg` |
| `npm run icons:fetch` | Download and sanitise vendor icon packs into `public/icons/` |
| `npm run icons:check-descriptions` | Check icon description coverage |
| `npm run build:web` | Web build, then write `dist/_headers` (CSP, caching) |
| `npm run preview:web` | Serve `dist/` on http://localhost:4173 with the service worker active |
| `npm run pwa:icons` | Regenerate PWA icons from `app-icon.svg` |
| `npm run docker:build` / `docker:run` | Build and run the nginx image on port 8080 |

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first so the design can be discussed.

Before you open a PR, run the same checks as CI:

```sh
npm run typecheck && npm test && npm run build
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings   # if you touched Rust
```

Several parts of the code are built to be extended:

- **Importers:** add a module to `src/io/import/` that exports `importer`. See `src/io/import/types.ts`.
- **Layouts:** add a module to `src/layout/` that exports `layout`.
- **Shape libraries:** add a module to `src/shapes/libs/`; the registry discovers it.
- **Commands and shortcuts:** add an entry to `src/app/actions.tsx`. Menus, the context menu, shortcuts and the command palette are all generated from it.

[`docs/PARITY.md`](docs/PARITY.md) lists the draw.io features that are partial or missing, which is a good place to find work.

## License

[MIT](LICENSE) © 2026 Gabriel Santana.

Vendor icon packs fetched into `public/icons/` are **not** covered by the MIT license; see [`public/icons/LICENSES.md`](public/icons/LICENSES.md).
