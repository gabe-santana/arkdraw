# Extending ArkDraw

ArkDraw can be extended in four ways, from least to most powerful:

1. **Custom shapes** written in mxGraph stencil XML, the format mxGraph uses.
2. **Shape configs**: JSON files that package stencils with default styles, sizes and connection points into a library.
3. **Style strings**: mxGraph `key=value;` styles, edited with *Edit → Edit style…*.
4. **Plugins**: JavaScript that adds commands, menus, shape libraries and file formats.

The code lives in `src/stencils/` (shapes) and `src/extensibility/` (style strings, plugins, UI modes).

---

## 1. Custom shapes (stencil XML)

A custom shape is a shape of kind `stencil` that carries its own stencil XML (`ShapeElement.stencil`). It renders through the same pipeline as built-in shapes, so it looks the same on the canvas, in library thumbnails, in sketch mode and in every export format.

- **Arrange → Insert → Shape from stencil XML…** opens an editor with a live preview. **Insert** places the shape; **Add to Scratchpad** saves it to the Scratchpad library.
- **Edit → Edit shape…** opens the XML of the selected custom shape, and **Apply** updates it as one undo step. For a built-in shape, the dialog offers **Convert & apply** when the shape's geometry is plain SVG (rectangles, ellipses, diamonds, cylinders, documents, notes…). Shapes that draw their own text or images, such as UML classes and icons, can't be converted, and the dialog explains why. You can still replace them with a stencil written from scratch.
- **mxGraph files**: cells styled `shape=stencil(…)` import as custom shapes and export back the same way. The payload is base64(deflateRaw(encodeURIComponent(xml))) `Graph.compress`.

### Format

```xml
<shape name="Tag" w="120" h="60" aspect="variable" strokewidth="inherit">
  <connections>
    <constraint x="0" y="0.5" perimeter="1" name="W"/>
    <constraint x="1" y="0.5" perimeter="1" name="E"/>
  </connections>
  <background>
    <path>
      <move x="0" y="0"/><line x="92" y="0"/><line x="120" y="30"/>
      <line x="92" y="60"/><line x="0" y="60"/><close/>
    </path>
  </background>
  <foreground>
    <fillstroke/>
    <save/>
    <fillcolor color="#ffffff"/>
    <ellipse x="94" y="25" w="10" h="10"/>
    <fillstroke/>
    <restore/>
  </foreground>
</shape>
```

- Coordinates are in stencil units, from `0,0` to `w,h`. `aspect="variable"` stretches the drawing to the shape bounds; `aspect="fixed"` scales it uniformly and centres it.
- `strokewidth="inherit"` uses the shape's stroke width. A number is scaled with the shape.
- `background` and `foreground` are lists of drawing ops. Geometry ops set the current path, and paint ops draw it. By convention, the foreground starts with `<fillstroke/>` to paint the background outline.

| Ops | Supported |
| --- | --- |
| Geometry | `path` (`move`, `line`, `quad`, `curve`, `arc`, `close`), `rect`, `roundrect` (`arcsize`), `ellipse` |
| Paint | `fill`, `stroke`, `fillstroke` |
| State | `save`, `restore`, `strokecolor`, `fillcolor`, `fontcolor`, `strokewidth` (`fixed`), `dashed`, `dashpattern`, `linejoin`, `linecap`, `miterlimit`, `alpha`, `fillalpha`, `strokealpha`, `fontsize`, `fontstyle`, `fontfamily` |
| Content | `text` (`str`, `align`, `valign`, `rotation`, `vertical`), `image` (`src` data/http URL, `aspect`, `flipH`, `flipV`) |
| Composition | `include-shape name=…`, which resolves against stencils that a plugin registered by name |
| Connections | `<constraint x y perimeter name/>` become the shape's connection points |

The shape's fill, stroke, stroke width, dash, opacity and font set the initial state, so the Format panel works on custom shapes. Unknown tags are ignored and listed under the preview.

---

## 2. Custom libraries and shape configs

*Shapes panel → Open library…* accepts these formats:

| File | Becomes |
| --- | --- |
| `.opendrawlib` | An ArkDraw library. |
| mxGraph `<mxlibrary>` `.xml` | One item per entry. Entries built from `shape=stencil(…)` cells become custom shapes. |
| Stencil set `.xml`: `<shapes name="…"><shape …/>…</shapes>` or a single `<shape>` | One custom shape per `<shape>`. |
| Shape config `.json` (see below) | One custom shape per entry, with its defaults. |

### Shape config (JSON)

```json
{
  "format": "opendraw-shapes",
  "version": 1,
  "name": "Release shapes",
  "shapes": [
    {
      "name": "Release tag",
      "stencil": "<shape name=\"Tag\" w=\"120\" h=\"60\" …>…</shape>",
      "w": 140,
      "h": 60,
      "style": { "fill": "#fef3c7", "stroke": "#b45309", "fontSize": 13 },
      "text": "v1.0",
      "connectionPoints": [{ "x": 0, "y": 0.5 }, { "x": 1, "y": 0.5 }],
      "params": { "notch": 0.25 },
      "keywords": "version milestone"
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | Library item title, and the shape's name. |
| `stencil` | yes | Stencil XML. |
| `w`, `h` | no | Default size. Defaults to the stencil's `w` and `h`. |
| `style` | no | Default style, as either ArkDraw `ElementStyle` keys or a string (`"fillColor=#fef3c7;dashed=1;"`). |
| `text` | no | Default label. |
| `connectionPoints` | no | Fractions of the box. Defaults to the stencil's `<constraint>`s. |
| `params` | no | Values stored in `ShapeElement.params`. |
| `keywords` | no | Search keywords. |

A bare JSON array of entries is also accepted. Plugins pass the same entries to `ctx.shapes.registerLibrary`.

---

## 3. Style strings

**Edit → Edit style…** (`Mod+E`) shows the selection's style as a string, with one `key=value;` per line. A toggle switches to ArkDraw's own style keys.

- The string comes from the `.drawio` exporter (`drawioStyleOf` in `src/io/drawio.ts`), and edits are read back by the importer (`elementFromDrawioStyle`). The dialog therefore speaks exactly the dialect that `.drawio` files use.
- Applying a style is a diff. Only the fields whose keys you changed are written, so ArkDraw-only properties that a style string can't express (underline, label position, custom shadow…) are left alone. The change applies to the whole selection as one undo step. Shape-only fields, such as the shape kind, apply only to elements of the same type.
- Keys ArkDraw doesn't understand (`myPluginFlag=1`, newer mxGraph keys…) are kept in the element's hidden data (`data.__drawioStyle`). They show up again in the dialog and are written back into the cell style on `.drawio` export.

---

## 4. Plugins

**Extras → Plugins…** manages plugins:

- **Add**: enter a URL (web) or a file path (desktop).
- **Add from file…**: in the browser, a copy of the code is stored; on the desktop, the file path is kept.
- **Enable, disable and remove** plugins from the list.

The list is saved, and enabled plugins load at startup.

### Trust model

Plugins work plugins: they run in the page, with full access to the editor, your diagrams and anything the page can reach. There is no sandbox. **Only load plugins you trust.** ArkDraw asks for confirmation before it enables a plugin, either when you add one or when you re-enable one.

Content Security Policy:

- The shipped web build and the desktop app use `script-src 'self'`. Under that policy, only plugins served from the app's own origin load, for example `/plugins/my-plugin.js` on a self-hosted instance.
- Remote URLs need their origin added to `script-src`.
- File-based plugins need `blob:` in `script-src`. They are loaded as Blob module URLs.

The dev server (`npm run dev`) has no CSP.

### Writing a plugin

A plugin is a script that calls `window.ArkDraw.registerPlugin` (`window.OpenDraw`, the project's former name, is the same API and keeps older plugins working). It can also be an ES module whose default export is the plugin object:

```js
window.ArkDraw.registerPlugin({
  id: 'hello',            // letters, digits, . _ -
  name: 'Hello',
  version: '1.0.0',
  activate(ctx) {
    ctx.actions.register({
      id: 'greet',                 // becomes plugin.hello.greet
      label: 'Say hello',
      menu: 'Extras',              // also add it to a menu
      shortcut: 'Mod+Alt+H',
      run: () => ctx.ui.toast(`Hello! ${ctx.editor.getSelection().length} selected`),
    });
    // Optionally return a cleanup function (or use ctx.onDispose).
  },
  deactivate() {},
});
```

Everything a plugin registers through `ctx` is removed when the plugin is disabled.

| `ctx.` | API |
| --- | --- |
| `id`, `app` | The plugin id, plus `{ version, platform: 'desktop' \| 'web' }`. |
| `actions.register(spec)` | Registers `{ id, label, run, group?, shortcut?, keywords?, enabled?, menu? }`. The action appears in the command palette, the shortcuts dialog and, with `menu`, in a title-bar menu. Errors thrown by `run` are caught and shown as a toast. |
| `actions.run(id)` | Runs an action. A short id is resolved to your own action; a dotted id is treated as a built-in action. |
| `menus.add(menu, actionId)` | Adds an action to `File`, `Edit`, `View`, `Arrange`, `Extras` or `Help`. |
| `shapes.registerLibrary({ id, name, shapes })` | Adds a library to the Shapes panel. `shapes` are shape-config entries (§2). |
| `shapes.registerStencil(name, xml)` | Makes a stencil available to `<include-shape name>`. |
| `formats.registerImporter(importer)` | Registers an importer, using the `Importer` contract in `src/io/import/types.ts`. It appears in *File → Open* (by extension) and, with `acceptsText`, in *Import from text*. |
| `formats.registerExporter({ id, label, extension, mime?, export })` | Adds *File → Export as \<label\>…*. `export({ pages, activePage, fileName })` returns a string or `Uint8Array`, possibly through a promise. |
| `editor.getDoc()`, `getPages()`, `getActivePageId()`, `getSelection()`, `getElement(id)` | Read the editor state. Treat the results as read-only. |
| `editor.subscribe(listener)` | Calls `listener` with `{ doc, selection }` when either changes. |
| `editor.transact(fn)` | Groups the changes made inside `fn` into one undo step. |
| `editor.addShape({ kind?, x?, y?, w?, h?, text?, style?, stencil?, select? })` | Adds a shape and returns its id. The default is a rectangle at the viewport centre; passing `stencil` creates a custom shape. |
| `editor.connect(sourceId, targetId, opts?)` | Adds a connector and returns its id. |
| `editor.update(id, patch)`, `setStyle(ids, style)`, `remove(ids)`, `select(ids)` | Mutations, each undoable. `id` and `type` can't be changed. |
| `ui.toast(message, kind?)`, `ui.confirm(title, message, confirmLabel?)` | Feedback to the user. |
| `onDispose(fn)` | Runs `fn` when the plugin is disabled. |

`window.ArkDraw` also exposes:

- `version`
- `registerPlugin`
- `loadPluginsFrom(urlsOrPaths)`
- `plugins()`
- `stencils.{ parse, compress, decompress, register }`

Scripts that load before ArkDraw can push plugin objects to `window.ArkDrawPlugins = [...]`; they're registered once the app starts.

### Loading from the host (desktop config)

```js
await window.ArkDraw.loadPluginsFrom(['C:\\plugins\\word-count.js', 'https://intranet/plugins/x.js']);
// → [{ source, ids: ['word-count'] }, { source, error: '…' }]
```

On the desktop, the shell passes the plugins listed in its configuration file to `loadPluginsFrom`. Paths are read through the Rust `read_text_file` command and loaded as Blob modules. Sources load one after another, and a failing source doesn't stop the others. These plugins appear in the dialog under *Loaded by the app or its configuration*.

### Examples

There are two example plugins in `docs/plugins/examples/`:

- `word-count.js`: *Extras → Word count* (`Mod+Alt+Shift+W`) counts the words in the labels of the page or the selection. A second command, *Select shapes without a label*, selects the shapes that have no label yet.
- `export-json-lines.js`: adds *File → Export as JSON Lines…*, which writes one JSON object per element, and an importer for `.jsonl` files.

With the dev server running, add `/docs/plugins/examples/word-count.js` in *Extras → Plugins…* to try one.

---

## 5. Editor UI modes

**Extras → Appearance** switches the UI mode. It is also available in the palette as "… UI", and the choice is saved per browser.

| Mode | Effect |
| --- | --- |
| Default | Floating panels. |
| Minimal | The side panels tuck away to a thin sliver and slide in on hover or keyboard focus. The toolbar is smaller and translucent. |
| Sketch | A quiet hand-drawn look: irregular panel corners, offset ink shadows, Caveat for menu and dialog headings, and a paper-tinted canvas. |
| Compact | Denser panels and toolbar, and a shorter title bar. |

Modes are set with a `data-ui-mode` attribute on `<html>`. They are styled in the clearly marked *Editor UI modes* block at the end of `src/index.css`, through the `data-od-panel` and `data-od-toolbar` hooks in `App.tsx`.
