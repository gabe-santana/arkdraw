# Spec: Diagram animation & GIF export

Status: **Accepted** · Owner: core editor · Target: v0.1

## Why

Architecture and flow diagrams explain *movement*: requests flowing through
services, data moving through a pipeline, steps happening in order. Static
images hide that. ArkDraw lets authors animate a diagram and share it as an
animated **GIF** that plays anywhere: READMEs, Slack, Confluence, slides, PRs.

## Principles

1. **Deterministic.** Every animated property is a pure function of time
   `t` (seconds) and the element: `frame = render(doc, t)`. The canvas preview,
   the presentation mode and each exported GIF frame use the same renderer,
   so the export matches the preview exactly.
2. **Non-destructive and optional.** Animation data is optional fields on
   elements. Files without them open unchanged, and old app versions ignore them.
3. **60 fps editing.** Preview animation runs on a single `requestAnimationFrame`
   clock and only re-renders animated elements; it pauses while the user is
   dragging/resizing, and when the window is hidden.
4. **Accessible.** Preview respects `prefers-reduced-motion` (paused by default,
   user can play explicitly).

## Features

### 1. Connector animations

`ConnectorElement.animation?: ConnectorAnimation`

| kind    | Effect                                                         |
|---------|----------------------------------------------------------------|
| `none`  | Default.                                                       |
| `flow`  | Dashes march from source to target ("marching ants").          |
| `dots`  | 1–3 tokens travel along the path, evenly spaced.               |
| `pulse` | The stroke glows and fades.                                    |

Options: `speed` (1 = default; 0.25–4), `reverse` (travel target → source).
Movement is measured along the routed path, so orthogonal, straight and
curved connectors all animate correctly and follow re-routing live.
Loop period: `flow` = dash pattern length / speed; `dots` = path length /
(120 px/s · speed); `pulse` = 1.6 s / speed.

### 2. Shape emphasis

`ShapeElement.animation?: { kind: 'none' | 'pulse' | 'glow' | 'bounce'; speed }`.
Used to draw attention to a component (e.g. the failing service).

### 3. Build sequence (step-by-step reveal)

`element.reveal?: number`: the step (1, 2, 3…) at which the element appears.
Elements without `reveal` are always visible. A connector cannot appear before
the shapes it attaches to (it is clamped to the later of its ends' steps).

- Shapes **fade + scale in** (180 ms, ease-out).
- Connectors **draw** themselves from source to target (stroke-dashoffset, 400 ms).
- Each step has a duration (default 0.8 s), and the sequence holds on the final
  frame for 1.5 s before looping.

`element.hide?: number`: the step at which the element **fades out** (180 ms).
Elements without `hide` stay. A connector leaves no later than the first of its
ends. Appearing and leaving at the same step swaps two elements cleanly, which
is how a scene changes something in place: a highlight moves to another option,
a row gets crossed out, a counter shows its next value.

Editing UI: an **Animation** section in the properties panel (effect, speed,
reverse, reveal step, leaving step), plus "Number steps by selection order" for
multi-select.

### 4. Preview & presentation

- Toolbar **Play/Pause** toggles live preview on the canvas (shortcut `Alt+P`).
- Preview never mutates the document, and undo history is unaffected.

### 5. GIF export

In the Export dialog, choose format **GIF (animated)**:

| Option     | Default         | Notes                                           |
|------------|-----------------|-------------------------------------------------|
| Duration   | Auto            | One full loop: the LCM of the element loop periods (capped at 6 s), or the full build sequence. Manual 1–30 s. |
| FPS        | 20              | 10 / 15 / 20 / 25 / 30                           |
| Scale      | 1×              | 0.5× – 2×                                       |
| Background | Canvas color    | GIF only has 1-bit alpha, so a solid background is recommended. "Transparent" uses a keyed color. |
| Loop       | Forever         | Or play once.                                    |
| Area       | Whole diagram   | Or the current selection.                        |

Pipeline:
1. For each frame `i`, render the export SVG at `t = i / fps` (fonts and
   vendor icons inlined as data URIs, same as PNG export).
2. Rasterize SVG → `OffscreenCanvas`/canvas → RGBA.
3. Encode in a **Web Worker** with `gifenc` (MIT): one global palette
   quantized from sampled frames (stable colors, no flicker), then per-frame
   index + LZW. Frames identical to the previous one are merged by extending
   the delay.
4. Stream progress to a progress bar, which the user can cancel; save via the native dialog.

Size estimate shown before export (`frames × area` heuristic); warn above 15 MB.

### 6. Video export (MP4) and scenes

In the Export dialog, choose **MP4** (shown where the browser can encode video
with WebCodecs: Chrome, Edge, Safari 16.4+, Firefox 130+). Every page in scope
is a **scene**: scenes play in page order, each for its build sequence (or one
loop of its animations, at least 3 s), and each one fades out over the first
0.4 s of the next.

| Option       | Default | Notes                                              |
|--------------|---------|----------------------------------------------------|
| Pages        | Current | Or all pages, or a range: one video, one scene per page. |
| Resolution   | 1080p   | 720p / 1080p / 4K, on the frame's short side.       |
| Aspect ratio | Auto    | Auto fits the scenes; 16:9, 9:16 (Shorts, Reels, TikTok) or 1:1. |
| Frame rate   | 30 fps  | 24 / 30 / 60                                        |
| Background   | Page    | Or white; video has no transparency.               |
| Grid         | Off     | The editor grid behind every scene.                |

Every scene shows the same world-space size, widened to the frame's shape and
centered on its own content: text keeps its size from scene to scene, and the
background and grid fill the whole frame. Frames are rendered with the same
renderer as the canvas and the GIF export, encoded as H.264 by the browser and
muxed into MP4 with Mediabunny (MPL-2.0), loaded only when exporting.

### 7. Interop

- `.arkdraw` stores the animation fields as-is.
- `.drawio` export maps `flow` → `flowAnimation=1` (supported by mxGraph);
  other effects are dropped.
- SVG export stays static by default; an **"Animated SVG"** toggle embeds
  CSS keyframes for `flow`/`dots`/`pulse` (no build sequence).

## Acceptance criteria

- [ ] A `flow` connector previews on canvas and exports as a seamlessly looping GIF.
- [ ] Moving a shape while preview runs keeps animations attached to re-routed paths.
- [ ] Build sequence of 5 steps exports as a GIF in step order and loops.
- [ ] A 1200×800 diagram, 20 fps, 3 s exports in < 5 s on a mid-range laptop
      without freezing the UI.
- [ ] Exported GIF frame at `t` is pixel-identical to the canvas render at `t`
      (same renderer), except for color quantization.
- [ ] Files saved with animations open in a build without animation support
      (fields ignored) and round-trip unchanged.
