# Command-line export (desktop)

The desktop app can export diagrams without opening the editor, which is handy
for CI, docs pipelines and batch conversions.

```sh
arkdraw --export <input.arkdraw|input.drawio> --format <fmt> --output <path> [options]
```

| Option | Description |
| --- | --- |
| `-x, --export <input>` | Diagram to export (`.arkdraw`, `.drawio`, `.xml`, or an editable `.svg`). |
| `-f, --format <fmt>` | `png`, `svg`, `pdf`, `jpg`, `webp`, `html`, `vsdx`, `drawio`, `url`. Defaults to the output extension, else `png`. |
| `-o, --output <path>` | Output file. Defaults to the input name with the format's extension. |
| `-p, --page <n>` | Page to export (1-based, default 1). |
| `-a, --all-pages` | Every page. PDF / HTML / VSDX / mxGraph produce one multi-page file; images produce one file per page (`out-1.png`, `out-2.png`…, or into `<path>` when it ends with `/` or `\`). |
| `-s, --scale <k>` | Raster scale (`2` = 192 dpi). Default 1. |
| `-b, --border <px>` | Border around the drawing. Default 0. |
| `-t, --transparent` | Transparent background (PNG, WebP, SVG, HTML). |
| `-e, --embed` | Embed the diagram so the PNG / SVG / PDF can be reopened for editing. |
| `-q, --quality <0-100>` | JPEG / WebP quality. Default 90. |
| `-h, --help` | Usage. |

`--flag=value` works too, and `-x` with a positional input
(`arkdraw -x -f pdf diagram.drawio`) is accepted.

Each written path is printed to stdout (for `--format url`, the link follows on
the next line); errors go to stderr. Exit codes: `0` success, `1` export failed,
`2` invalid arguments / missing input, `3` timed out (5 minutes).

## Examples

```sh
arkdraw --export architecture.arkdraw --format png --output architecture.png --scale 2 --border 10
arkdraw --export flows.drawio --format pdf --all-pages --output flows.pdf --embed
arkdraw --export flows.drawio --format svg --all-pages --output out/      # out/flows-<page>.svg
arkdraw -x system.arkdraw -f html -o system.html                          # interactive offline viewer
```

On Windows the app is a GUI program, so shells do not wait for it by default.
Use `start /wait arkdraw …` (cmd) or `Start-Process arkdraw -ArgumentList … -Wait`
(PowerShell) when a script needs the exit code; output is written to the
calling console.

## How it works

1. `src-tauri/src/cli.rs` parses the arguments before Tauri starts. Without
   `--export` nothing changes. With it, the window stays hidden, the job is
   stored in managed state and a watchdog bounds the run time.
2. The front end (`src/app/cliExport.ts`, imported by `App.tsx`) calls
   `take_export_job`, reads the input with the regular readers (`readFile`,
   `parsePages`, `importDrawioPages`), renders with the regular exporters
   (`src/io/export`), writes through `saveFile`, reports with `cli_log` and ends
   the process with `cli_exit(code)`.

Rendering happens in the (hidden) webview, so output is identical to exporting
from the Export dialog.
