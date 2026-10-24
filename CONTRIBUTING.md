# Contributing to ArkDraw

Thanks for helping make ArkDraw better. This guide covers how to set up the project, how the code is organised, and what we look for in a pull request.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** or **request a feature** with the [issue templates](https://github.com/gabe-santana/arkdraw/issues/new/choose).
- **Pick up an issue.** Issues labelled [`good first issue`](https://github.com/gabe-santana/arkdraw/labels/good%20first%20issue) are small and well scoped; [`help wanted`](https://github.com/gabe-santana/arkdraw/labels/help%20wanted) ones are bigger.
- **Add shapes, templates, importers or translations.** Most of these are self-contained modules (see [Extending ArkDraw](#extending-opendraw)).
- **Improve the docs.**

For larger changes, please open an issue first so we can agree on the approach before you invest time in it.

## Development setup

Requirements: [Node.js](https://nodejs.org/) 20+ and, for the desktop app only, [Rust](https://rustup.rs/) stable plus the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS (on Windows: the MSVC Build Tools and WebView2).

```sh
git clone https://github.com/gabe-santana/arkdraw.git && cd arkdraw
npm install
npm run icons:fetch   # optional: official cloud icon packs into public/icons
npm run dev           # web app at http://localhost:1420
npm run tauri dev     # desktop app
```

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suites (`test/`) |
| `npm run build` | Production build |
| `npm run tauri build` | Desktop installers for the current OS |
| `npm run media:gifs` | Regenerates the animated diagrams in the README |
| `npm run media:ai` | Records the AI demos (README GIFs; `--video` for the landing page) |
| `npm run site:dev` | Landing page at http://localhost:8788 |
| `npm run smoke:prod` | Checks the live site and editor in a real browser |

## Project layout

```
src/
  app/         commands, the action/shortcut registry, file lifecycle, clipboard
  canvas/      SVG canvas, interactions, text editor, overlays
  chrome/      menus, toolbar, dialogs
  panels/      shape library and Format panel
  model/ store document model and Zustand stores (history lives here)
  shapes/      shape registry and libraries (src/shapes/libs/*, auto-discovered)
  io/          .opendraw format, importers (src/io/import/*, auto-discovered), exporters
  ai/          provider adapters and the diagram-generation agent
  i18n/        UI translations
src-tauri/     desktop shell (Rust)
test/          Vitest suites, one folder per area
docs/          user and developer documentation
```

[docs/overview.md](docs/overview.md) describes features, formats and editions in more detail.

## Extending ArkDraw

- **Shape library:** add `src/shapes/libs/<name>.tsx` (see an existing library for the pattern). Give every shape search keywords and a one-line description in `src/shapes/descriptions.ts`; `npm run icons:check-descriptions` checks coverage.
- **Importer:** add `src/io/import/<format>.ts` exporting an `importer` (see `src/io/import/types.ts`).
- **Layout:** add `src/layout/<name>.ts` exporting a `layout`.
- **Command or shortcut:** add an entry to `src/app/actions.tsx`. Menus, the context menu, the command palette and keyboard shortcuts are generated from it.
- **Template:** add it to the right file in `src/templates/library/`.
- **Translation:** add or update a locale in `src/i18n/`. English is the source of truth.
- **Plugins and custom shapes:** see [docs/extensibility.md](docs/extensibility.md).

## Pull requests

1. Fork the repo and create a branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep the change focused. Unrelated refactors make reviews slow.
3. Add or update tests for behaviour you change.
4. Run the same checks as CI:
   ```sh
   npm run typecheck && npm test && npm run build
   cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings   # only if you touched Rust
   ```
5. Fill in the pull request template, including screenshots or a short GIF for UI changes.

### Code style

- TypeScript strict mode; match the style of the surrounding code.
- New data-model fields are optional, so older files keep opening.
- Every user-facing action is undoable as one step (`beginInteraction` / `endInteraction`).
- UI text goes through the i18n layer.
- Keep dependencies to a minimum; discuss new ones in the issue first.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Write the subject in the imperative ("add", not "added").

## Reporting security issues

Please don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
