# draw.io parity status

Every item in [`DRAWIO_FEATURES.md`](../DRAWIO_FEATURES.md), checked against the code. Each note says where the feature lives: a menu path, a shortcut, or a source file. Statuses were verified by reading the source, not by running the app, so where behaviour couldn't be confirmed from code the item is marked 🟡.

| Status | Meaning |
| --- | --- |
| ✅ | Implemented. Small deviations from draw.io are noted. |
| 🟡 | Partial. Part of the feature exists; the note says what's missing. |
| ❌ | Missing. Not implemented yet, and nothing rules it out. |
| ⛔ | Out of scope, by design. The note says why and what OpenDraw offers instead. |

## Summary

| | Count |
| --- | --- |
| ✅ Implemented | 234 |
| 🟡 Partial | 62 |
| ❌ Missing | 37 |
| ⛔ Out of scope | 21 |
| **Total** | **354** |

Most of the gaps fall into three groups:

- **Shape engine depth.** There are no parametric "yellow diamond" handles, no custom connection points (only 4 side anchors), no mxGraph stencil XML, and no connector-to-connector attachment.
- **Vendor libraries.** Cisco, Citrix, Veeam, Office/M365, Bootstrap, OpenStack, UML 2.5 and threat-modelling libraries are absent.
- **Customisation.** There are no runtime plugins, no JSON configuration, no UI languages and no custom link actions.

Cloud storage and real-time collaboration are out of scope. OpenDraw is local-first: diagrams are files on your disk (pretty-printed JSON that diffs well in git), and sharing works through `#R` share links, a read-only viewer, the embed protocol, self-contained HTML export, in-file comments and local revision history.

### Bugs found during the audit (all fixed)

- The **View** menu referenced a missing `view.left` action, and "Shapes panel" reused the `view.adapt` id of "Adapt diagram colors". Fixed: the action is now `view.left`.
- The Format panel's Arrange section showed wrong shortcut hints. Fixed: Ungroup shows `Mod+Shift+U`, Lock shows `Mod+L`.
- The canvas tip said Alt-drag duplicates. Fixed: it now says Ctrl/⌘-drag.

---

## 1. Canvas & Navigation

| Feature | Status | Notes |
| --- | --- | --- |
| Infinite canvas | ✅ | Unbounded camera (`src/store/editor.ts`, `src/canvas/Canvas.tsx`). |
| Page view | ✅ | *View → Page view*, or the Page section of the Format panel (`PageSection` in `src/panels/PropertiesExtras.tsx`). |
| Paper size & orientation | 🟡 | A3, A4, A5, Letter, Legal, Tabloid, 16:9, 16:10, 4:3 and Custom, in portrait or landscape (`src/canvas/paper.ts`). A0–A2, A6, B4/B5 and Ledger are missing. |
| Background colour | ✅ | Per page, in the Format panel's Page section. Exports use it (`backgroundFor` in `src/io/export/index.ts`). |
| Background image | 🟡 | Upload only, per page (Page section → Image). Setting it by URL isn't supported. |
| Grid (toggle, size, colour) | 🟡 | Toggle with `Mod+Shift+G`; size is set under Canvas → Grid size. The grid colour can't be changed. |
| Alt bypasses snapping | ✅ | `snapOptions(e.altKey)` in `src/canvas/useCanvasInteractions.ts`. |
| Rulers | ✅ | *View → Rulers* (`Mod+Shift+R`), in `src/chrome/Rulers.tsx`. |
| Units | ✅ | px, pt, in, mm or m, set in *View → Units* or the Page section. They apply to the rulers and geometry fields. |
| Smart guides | ✅ | Edge, centre and equal-spacing guides (`src/canvas/snapping.ts`). Toggle with *View → Guides*. |
| Zoom (wheel, keys, pinch, fit, 100%) | ✅ | Ctrl/⌘+wheel, trackpad pinch, `Mod+=`/`Mod+-`, `Mod+H` (or `Shift+1`) to fit, `Mod+0` for 100%. Zoom ranges from 10% to 400%. |
| Zoom presets dropdown | ✅ | Click the zoom % (`ZoomControls`): 25–400% presets, Fit window, Fit page width, One page, Two pages, Zoom to selection. Double-click for 100%. |
| Panning | ✅ | Wheel or Shift+wheel, Space+drag, middle- or right-drag, the hand tool (`H`), and arrow keys when nothing is selected. |
| Scrollbars toggle | ❌ | The canvas has no scrollbars. Use the Outline or panning instead. |
| Outline / minimap | ✅ | `Mod+Shift+O`, in `src/chrome/Outline.tsx`. |
| Page tabs | ✅ | `src/chrome/PageTabs.tsx`. |
| Fullscreen | ✅ | `F11`. Uses the native window under Tauri and the Fullscreen API on the web. |
| Connection points display | ✅ | *View → Connection points*. |
| Diagram-wide shadow | ✅ | Page section → "Shadow on all shapes" (`PageSettings.shadow`). |
| Lightbox / viewer mode | ✅ | `?viewer=1` / `?lightbox=1` (`src/viewer/`) gives page tabs, layer toggles, zoom and pan. The HTML export includes the same features. |

## 2. Shapes & Shape Libraries

Built-in libraries are in `src/shapes/libraries.ts` and are auto-discovered from `src/shapes/libs/*.tsx`. Vendor icon packs come from `src/icons/iconPacks.ts`; you populate them with `npm run icons:fetch`.

| Feature | Status | Notes |
| --- | --- | --- |
| General | ✅ | Split across General, Basic and Misc: rectangle, ellipse, diamond, triangle, hexagon, parallelogram, trapezoid, cylinder, cloud, callout, document, cube, step, tape, card, sticky note, actor, text, heading, text box, container, lines and arrows. |
| Misc | ✅ | "Misc / Advanced" library (`src/shapes/libs/basic.tsx`): link, image placeholder, partial rectangles, lines, braces. |
| Advanced (parametric geometry) | 🟡 | The shapes exist, but none expose extra geometry parameters (see "Shape-specific parameter handles" in §3). |
| Basic | ✅ | Stars, polygons, wave, heart, donut, pie, arc, frame and more (`basic.tsx`). |
| Arrows | ✅ | 17 block arrows: bent, U-turn, callout, quad, striped, circular and others (`arrows.tsx`). |
| Flowchart | ✅ | 14 standard symbols (Flowchart library in `libraries.ts`). |
| Entity Relation | ✅ | Table/entity, weak entity, Chen relationship, attribute and multivalued shapes, plus crow's-foot arrowheads. |
| UML | 🟡 | Class, interface, actor, use case, package, component, note, state, initial/final, node, lifeline and fragment. There's no activation-bar shape. |
| UML 2.5 | ❌ | No extended library. |
| Containers / Swimlanes / Tables | ✅ | Pools and lanes (horizontal and vertical), list, card, collapsible and titled frames (`containers.tsx`), and a native table (§3). |
| BPMN 2.0 | ✅ | Events (every position × trigger), activities, gateways, data, pools and lanes (`bpmn.tsx`). |
| Mockups / Wireframes | ✅ | 31 controls, plus browser and device frames (`mockups.tsx`). |
| Android | ✅ | Material 3 frame and controls (`mobile.tsx`). |
| iOS | ✅ | iPhone frame and controls (`mobile.tsx`). |
| Bootstrap | ❌ | Only the Bootstrap *logo*, in the Tech Logos pack. |
| Sitemap | ✅ | `sitemap.tsx`. |
| Network | ✅ | 20 generic network shapes (Network library). |
| Cisco / Cisco19 | ❌ | Not available. |
| Citrix | ❌ | Not available. |
| Rack | 🟡 | Generic 19" cabinet and equipment (`rack.tsx`). No vendor-specific equipment from APC, Dell, HP and so on. |
| Veeam | ❌ | Not available. |
| AWS | ✅ | 810 official AWS Architecture Icons (icon pack `aws`). |
| Azure | ✅ | 627 official icons (`azure`). |
| GCP | ✅ | 261 official icons (`gcp`). |
| IBM | ✅ | 211 IBM Cloud icons (`ibm`). |
| Alibaba Cloud | ✅ | 270 icons (`alibaba`). Oracle OCI (180 icons) is also included. |
| OpenStack | ❌ | Not available. |
| Kubernetes | ✅ | 39 resource icons (`kubernetes`). |
| Office / Microsoft 365 | ❌ | Not available. |
| Electrical | ✅ | 42 symbols: passives, sources, semiconductors, logic gates, op-amp, IC (`electrical.tsx`). PLC ladder and waveforms are missing. |
| Mind map | ✅ | `mindmap.tsx`, plus a Mind Map layout and tree editing. |
| Infographic | ✅ | `infographic.tsx`. |
| Lean / VSM | ✅ | `lean.tsx`. |
| Floorplan | ✅ | `floorplan.tsx`. |
| P&ID / Process engineering | ✅ | Valves, pumps, vessels, exchangers, instruments (`pid.tsx`). |
| Signs | ✅ | "Signs & Clipart" pictogram tiles (`signs.tsx`). |
| Clipart | 🟡 | Covered by the pictogram tiles in `signs.tsx`. No clipart images. |
| Atlassian | 🟡 | Atlassian, Jira and Confluence *logos* only, in the Tech Logos pack. |
| ArchiMate 3 | ✅ | `archimate.tsx`. |
| SysML | ✅ | `sysml.tsx`. |
| Threat modelling / STRIDE | ❌ | Not available. |
| C4 model | ✅ | C4 library in `libraries.ts`. |
| Salesforce, Fluent UI, Material, Font Awesome, EIP, AD, isometric… | 🟡 | The Tech Logos pack has 2,016 brand logos, including Salesforce. Fluent UI, Material icons, Font Awesome, EIP, Active Directory and isometric libraries are missing. |
| Shape search | ✅ | Fuzzy search with typo tolerance, acronyms and synonyms, across libraries and icon packs (`src/search/`). `/` doesn't focus the search box. |
| Scratchpad | ✅ | Stored locally (`src/panels/userLibraries.ts`). |
| Custom libraries | ✅ | New library, Open library, and export to `.opendrawlib`. Imports draw.io `<mxlibrary>` files. Loading from a URL (`clibs`) isn't supported. |
| Favourites / recently used shapes | ✅ | Favorites (star on hover or right-click a tile) and Recent (last 12 inserted, shapes and icons) at the top of the Shapes tab (`src/panels/libraryHistory.ts`). |
| Shape hover preview | ✅ | Hover cards with a description (`ShapePreview.tsx`, `src/shapes/descriptions.ts`). |
| Click-to-insert / drag-to-insert / Shift-drop replace | ✅ | Drag shows a ghost preview. Click inserts at the view centre, or — with one shape selected — beside it and connected (Alt-click: unconnected). Shift-drop on a shape replaces it (`libraryDrag.ts`). |

## 3. Creating & Editing Shapes

| Feature | Status | Notes |
| --- | --- | --- |
| Drag & drop from libraries | ✅ | `src/panels/libraryDrag.ts`. |
| Hover quick-connect arrows | ✅ | Click an arrow to clone and connect. Drag one to draw a connector; dropping it on empty space opens the shape picker. There's no picker preview on hover (`useCanvasInteractions.ts`, `OverlayLayer.tsx`). |
| Shape picker (double-click / Ctrl+Enter) | ✅ | `src/canvas/ShapePicker.tsx`. |
| Resize handles (Shift ratio, Alt from centre) | ✅ | `resizeTo` in `useCanvasInteractions.ts`. Works on rotated shapes too. |
| Rotation handle (Shift = 15°, Ctrl+R) | ✅ | Rotation handle, an angle field in the Transform section, `Mod+R` / `Mod+Alt+R`. |
| Flip horizontal / vertical | ✅ | *Arrange → Rotate & flip*, or the Transform section. |
| Geometry fields | 🟡 | X, Y, W and H in the chosen units, plus angle. There's no "constrain proportions" toggle; Shift-drag keeps the ratio instead. |
| Parametric handles (yellow diamonds) | ❌ | `ShapeDef` (`src/shapes/types.ts`) has no adjustable parameters. |
| Replace / change shape | ✅ | *Edit → Replace shape…* or the context menu opens the shape picker in replace mode; Shift-drop from the library does the same. Text, geometry, style and connections are kept (`replaceShapes` in `src/app/commands.ts`). |
| Edit Style (`Mod+E`) | ✅ | Raw `key=value;` editor for OpenDraw style keys, not draw.io style strings (`EditDialogs.tsx`). |
| Edit Shape (stencil XML) | ❌ | Shapes are React renderers. There's no stencil format. |
| Custom shape (stencil XML) | ❌ | Same as above. |
| Freehand drawing | 🟡 | Freehand tool (`P`) with point thinning. There are no smoothing or brush options, and no pressure sensitivity. |
| Freehand → editable shape | 🟡 | A stroke becomes a shape you can move, resize and style. Its points can't be edited. |
| Images (insert, crop, aspect) | ✅ | *Arrange → Insert image…*, *Insert image from URL…* (embedded as data URI when CORS allows, linked otherwise), drag a file onto the canvas, or paste from the clipboard (image data or an image URL). The Image section of the Format panel crops (per side, %), resets crop and restores original size. |
| Text shape / text box | ✅ | Text tool (`T`), plus the Text, Heading and Text box items. |
| Tables | 🟡 | *Arrange → Insert table*, with add/delete row and column and a header row (`editTable` in `src/app/commands.ts`). Rows and columns are added and removed only at the end, and cells can't be styled individually. |
| Containers | 🟡 | Container shapes carry their children (`ShapeDef.container`). You can't turn an arbitrary shape into a container, because there's no "Container" checkbox. |
| Collapse / expand | ✅ | *Arrange → Collapse / expand*, and a toggle on the container header. |
| Edit Data (`Mod+M`) | ✅ | Name, tooltip, link, tags and key/value properties. The ID is shown read-only. |
| Tooltips | ✅ | Edit Data and the Data section. Shown on hover in the editor, the viewer and the HTML export. |
| Links (URL / page) | ✅ | Edit Link (`Alt+Shift+L`). Ctrl/⌘-click follows a link in the editor; a plain click follows it in the viewer (`src/canvas/links.ts`). Custom actions aren't supported (§7). |
| Copy / paste style | ✅ | `Mod+Alt+C` / `Mod+Alt+V`. |
| Set as default style | ✅ | `Mod+Shift+D`, plus *Edit → Style → Clear default style*. |
| Edit geometry | ✅ | Through the Position section's geometry fields. |
| Autosize (`Mod+Shift+Y`) | ✅ | `autosizeSelection` in `commands.ts`. |
| Behaviour flags (movable, resizable…) | 🟡 | `Behavior` is enforced throughout the canvas. Nothing in the UI sets it, and draw.io's `movable=0`-style keys aren't mapped on import. |

## 4. Connectors / Edges

| Feature | Status | Notes |
| --- | --- | --- |
| Create connectors | ✅ | From anchor dots, hover arrows, or the connector tool (`L`/`C`, also from blank space). *Arrange → Connector → Connect selected shapes* joins two selected shapes. |
| Waypoint styles | ✅ | Orthogonal (A* routing), straight, curved, horizontal and vertical elbow, entity relation, isometric. Manual waypoints work on every style (`src/lib/routing.ts`, `connectorGeometry.ts`). |
| Connector types | 🟡 | Line, pipe/wire and block arrow (Route → Shape). Link, wide arrow and flex arrow are missing. |
| Waypoints (add, delete, clear) | ✅ | Drag a segment to add a waypoint, double-click one to remove it, `Alt+Shift+C` to clear all. |
| Automatic rerouting | ✅ | The orthogonal router avoids other shapes. |
| Line jumps | 🟡 | Arc, gap or sharp (Route → Jumps). The jump size can't be changed. |
| Rounded corners / curved | ✅ | Corner radius comes from the style; curved is a routing option. |
| Floating vs fixed connections | 🟡 | `side: 'auto'` acts as a floating connection. Fixed connections can only attach to the 4 side midpoints. |
| Connection points per shape | 🟡 | 4 midpoints per shape (`AnchorSide`). Custom connection points can't be added or edited. |
| Anchor offsets (exitX / entryX, perimeter spacing) | ❌ | Not in the model. |
| Arrowheads | 🟡 | The model has 20 heads, including the ER notations. The Format panel offers 14; dash, cross, half arrow, box and async are only reachable through draw.io import or JSON. Head size can't be set. |
| Line pattern | ✅ | Solid, dashed or dotted, plus a custom `dashPattern` through Edit Style. |
| Line width & colour | ✅ | Stroke section. |
| Edge labels | 🟡 | One label per connector, which you can drag along the path or offset from it. Multiple labels aren't supported. |
| Label background | ✅ | Opaque by default. Change it under Label → Highlight. |
| Flow animation | ✅ | Flow, travelling dots and pulse, with speed and reverse (Format panel → Animation). |
| Connect to edges | ❌ | An endpoint can only attach to a shape. |
| Reverse | ✅ | *Arrange → Connector → Reverse connector*, plus "Swap direction" in the Format panel. |
| Straighten | ✅ | Set Route → Style to Straight; this clears the waypoints. |
| Edge style presets | 🟡 | New connectors reuse the last-used routing and arrowheads (`rememberConnectorStyle`). There are no preset buttons. |
| Dangling / free edges | ✅ | Free endpoints are supported. When a shape is deleted, its connectors keep their last position. |
| Sketch edges | ❌ | Sketch rendering (`roughen`) applies only to shapes. The Sketch toggle isn't shown for connectors. |

## 5. Text & Formatting

| Feature | Status | Notes |
| --- | --- | --- |
| Labels on any shape (double-click, F2, Enter) | ✅ | Double-click, F2 and Enter start editing; typing with one element selected starts editing and replaces the label (tool letters apply with nothing selected). |
| Rich text labels | 🟡 | "Formatted" uses a Markdown subset: bold, italic, underline, strikethrough, code, links, headings and lists (`src/shapes/RichText.tsx`). Per-run font, size and colour, sub/superscript, tables and images in labels are missing. |
| Plain text mode | ✅ | Default when Formatted is off. |
| Word wrap | ✅ | Label → Wrap. |
| Label position | 🟡 | Inside, top, bottom, left or right, with separate horizontal and vertical alignment. Corner positions are missing. |
| Text direction | 🟡 | Vertical text is supported, and labels rotate with their shape. Writing direction (RTL / LTR / auto) can't be set. |
| Spacing | 🟡 | One spacing value for all sides; per-side spacing isn't supported. |
| Fonts | 🟡 | Four families: Inter, Serif, Mono and Hand-drawn (`FONT_LABELS`). Google Fonts and custom font URLs aren't supported. |
| Label font / background / border colours | 🟡 | Text colour and label background are supported; label border colour isn't. |
| Text opacity | ✅ | Label → Text α. |
| Edit HTML source of label | ⛔ | Labels are stored as Markdown and rendered to plain SVG so every export looks the same; there's no HTML to edit. Edit the label text directly. |
| Clear formatting | 🟡 | No command. Turning off "Formatted" shows the label as plain text. |
| Mathematical typesetting | ✅ | Label → Math; LaTeX in `$$…$$` and `\(…\)` via MathJax. AsciiMath isn't supported. |
| Placeholders in labels | ✅ | `%page%`, `%pagenumber%`, `%pagecount%`, `%filename%`, `%date%`, `%time%`, `%timestamp%`, `%id%`, `%label%`, plus custom data keys (`expandPlaceholders` in `src/canvas/ElementBodies.tsx`). |
| Spell check | ✅ | `spellCheck` in `src/canvas/TextEditor.tsx`, using the WebView's checker. |
| Find & Replace | ✅ | `Mod+F` searches labels, names, tooltips and data, with match case, whole word, regex and all-pages options. Replace only changes labels on the current page. |
| Translated labels | ❌ | Not implemented. |
| Auto-created connected shapes in trees | ✅ | Tree editing (§17). |

## 6. Styling

| Feature | Status | Notes |
| --- | --- | --- |
| Fill (solid / none / gradient) | ✅ | Gradients run in five directions: down, up, right, left or radial (Effects section). |
| Sketch fill styles | ✅ | Hachure, solid, zigzag, cross-hatch, dots, dashed, zigzag-line. |
| Stroke | ✅ | Colour, width, pattern, none. |
| Opacity (shape / fill / line) | ✅ | Plus separate text opacity. |
| Shadow | 🟡 | On/off per shape. Colour, blur, offset and opacity can't be set. |
| Glass effect | ✅ | Effects → Glass. |
| Rounded corners | ✅ | Corner radius field. |
| Sketch / hand-drawn | 🟡 | Per shape, with Rough.js (`src/shapes/sketch.tsx`); switches the font to Hand-drawn. There's no diagram-wide switch (select everything and toggle instead), and connectors aren't sketched. |
| Comic style (legacy) | ⛔ | A legacy draw.io style. Sketch covers it. |
| Colour palette | ✅ | Swatches, native picker, hex input, and custom and recent colours (`ColorField` in `src/ui/controls.tsx`, *Extras → Preferences*). |
| Style presets in Format panel | ❌ | No preset thumbnails. |
| Themes / diagram style | ❌ | No one-click recolouring of the whole diagram. |
| Dark mode adaptive colours | 🟡 | *View → Theme → Adapt diagram colors*. User-defined dark colours aren't supported. |
| Image styles | ✅ | Opacity, flip, border, fill, and crop (Format panel → Image). |
| Shape-specific styles (cylinder depth, arrow width…) | ❌ | No parametric geometry (§3). |
| Copy / paste style | ✅ | See §3. |
| Default style editing | ✅ | See §3. |
| Swimlane styles | 🟡 | Horizontal and vertical pools and lanes exist (`containers.tsx`). Header size and a separate header fill can't be set. |

## 7. Layers, Tags & Visibility

| Feature | Status | Notes |
| --- | --- | --- |
| Layers panel (`Mod+Shift+L`) | ✅ | Docked on the right under Format (`src/panels/LayersPanel.tsx`): document layers, tag filter and the element list. Collapsible and resizable. The default layer is "Background". |
| Add / rename / delete layers | ✅ | Store actions in `src/store/editor.ts`. |
| Duplicate layer | ✅ | Layers dock → layer "…" menu (or right-click) → Duplicate; elements and their connections are copied onto the new layer. |
| Current layer | ✅ | `activeLayerId`; new elements go into it. |
| Move selection to layer | ✅ | From the Layers panel or the context menu (*Move to layer*). |
| Reorder layers | ✅ | Drag to reorder. Layer order sets render order. |
| Hide / show | ✅ | Eye toggle. |
| Lock | ✅ | Locks every element on the layer. |
| Select all in layer | ✅ | Layer "…" menu → Select all in layer (visible, unlocked elements). |
| Layer metadata | ❌ | `Layer` holds only id, name, visible and locked. |
| Layers in viewer / export | ✅ | The viewer and HTML export have layer toggles. Hidden layers are left out of exports (`src/io/export/svg.tsx`). |
| Tags (assign + filter) | ✅ | Assign tags in Edit Data; filter by tag in the Layers panel (`tagFilter`). |
| Custom link actions (`data:action/json`) | ❌ | Links can only be URLs or `page:<id>`. |

## 8. Grouping, Alignment, Distribution, Ordering

| Feature | Status | Notes |
| --- | --- | --- |
| Group / Ungroup | ✅ | `Mod+G` / `Mod+Shift+U`, with nested groups. |
| Remove from group | ✅ | *Arrange → Remove from group*. Also takes the shape out of its container. |
| Align | ✅ | Six modes (`Alt+A`, `Alt+H`, `Alt+D`, `Alt+W`, `Alt+V`, `Alt+S`), in *Arrange → Align* or the Format panel. |
| Distribute | ✅ | `Alt+Shift+H` / `Alt+Shift+V`. |
| Ordering | ✅ | To front `Mod+Shift+F`, to back `Mod+Shift+B`, forward `Mod+]`, backward `Mod+[`. |
| Arrange → Layout | ✅ | See §17. |
| Align to grid | ✅ | *Arrange → Align → Align to grid* (snaps both position and size). |
| Equal size | ✅ | Equal size, width or height (*Arrange → Size*). |
| Enter group | 🟡 | Double-clicking a selected group selects the single member under the cursor. There's no isolated group-editing mode and no Exit Group. |
| Home / Up navigation | 🟡 | *Edit → Select → Select parent* (`Alt+Shift+P`) moves up one level for containers. There's no Home command. |

## 9. Selection & Manipulation

| Feature | Status | Notes |
| --- | --- | --- |
| Click / Shift-click / rubber-band (Alt+drag) | ✅ | The rubber band selects shapes that are fully inside it. Alt+drag starts one even on top of a shape. |
| Select all / shapes / connectors / none | ✅ | `Mod+A`, `Mod+Shift+I`, `Mod+Shift+E`, `Mod+Shift+A`. |
| Select children / parent / siblings / descendants | 🟡 | Children, parent and siblings work (`Alt+Shift+X`, `P`, `S`) and follow container nesting. Select descendants is missing. |
| Copy / cut / paste / paste here | ✅ | Copies go to the system clipboard as tagged OpenDraw JSON, so you can paste between windows (`src/app/clipboard.ts`). Paste Here is in the canvas context menu. Plain text pastes as a text box. |
| Duplicate / Ctrl-drag clone | ✅ | `Mod+D`, or Ctrl/⌘-drag. |
| Copy as image / SVG | ✅ | *Edit → Copy as → Image* or *SVG*. |
| Delete / delete with connections | ✅ | `Delete` / `Mod+Delete`. |
| Arrow keys (1px, Shift = grid, Alt+Shift clones and connects) | ✅ | `src/app/useShortcuts.ts`. `Mod+Shift+arrow` resizes by the grid size. |
| Lock / Unlock | ✅ | `Mod+L`. |
| Undo / Redo | ✅ | `Mod+Z`, `Mod+Shift+Z` or `Mod+Y`. History is per page, capped at 200 steps. |
| Edit tooltip | ✅ | *Edit → Edit tooltip…*, or the Data section. |
| Edit / open link | ✅ | See §3. |
| Turn into / replace shape | ✅ | See §3. |
| Boolean / merge operations | ⛔ | draw.io doesn't have these either. |
| Clear default style | ✅ | *Edit → Style → Clear default style*. |

## 10. Pages

| Feature | Status | Notes |
| --- | --- | --- |
| Multi-page diagrams | ✅ | `pages` in `src/store/editor.ts`. |
| Insert / duplicate / rename / delete / reorder | ✅ | From the page tab context menu, by double-clicking a tab to rename it, or by dragging tabs to reorder (`PageTabs.tsx`). |
| Page links | ✅ | `page:<id>` links, set in Edit Data. Exported to draw.io as `data:page/id,…`. |
| Per-page settings | 🟡 | Background, background image, paper, page view and shadow are per page, and each page keeps its own camera and undo history. Grid and snap settings apply to all pages. |
| Page navigation in viewer | ✅ | Viewer and HTML export tabs, `←`/`→`, and `?page=`. |
| Export selected pages | ✅ | Current, all or selection; PDF also supports a page range (`pagesInScope` in `src/io/export/index.ts`). |

## 11. Templates & Examples

| Feature | Status | Notes |
| --- | --- | --- |
| Template gallery | ✅ | 15 categories (`src/templates/types.ts`), with live thumbnails (`src/chrome/TemplatesDialog.tsx`). |
| Template search | ✅ | `searchTemplates` in `src/templates/index.ts`. |
| Template preview | ✅ | Large preview with page navigation. |
| Insert template into existing diagram | ✅ | "Insert into current diagram" (`Shift+Enter`). |
| Custom templates | ❌ | Templates are compiled in. User libraries are the closest alternative. |
| Example diagrams | ✅ | The bundled templates double as examples. |
| Start screen / recent files | 🟡 | There's no start screen; use *File → New*, *New from template…* or *Open recent*. Open recent is desktop-only, because `getRecentFiles` returns `[]` on the web. |

## 12. Import

Importers are discovered automatically from `src/io/import/*.ts`. Open them with *File → Open…*, drag and drop, or *File → Import from text…*.

| Feature | Status | Notes |
| --- | --- | --- |
| draw.io XML (`.drawio`, `.xml`, compressed or plain) | ✅ | `src/io/drawio.ts`. Unknown stencils become labelled rectangles. |
| Editable PNG / SVG / PDF | ✅ | Reads both draw.io and OpenDraw payloads (`src/io/import/embedded.ts`). |
| Editable HTML | ❌ | Not read. |
| Visio `.vsdx` / `.vssx` | 🟡 | Best effort (`src/io/import/vsdx.ts`). Legacy `.vsd`, themes and background pages aren't read. |
| Gliffy | ✅ | Best effort (`gliffy.ts`). |
| Lucidchart | 🟡 | Only Lucid's public Standard Import format (`.lucid` / `document.json`). Lucid's proprietary editor JSON isn't supported (`lucid.ts`). |
| Mermaid | ✅ | Converts to native, editable shapes for flowchart, sequence, class, ER, state and mindmap diagrams (`mermaid.ts`). Other Mermaid types aren't supported. |
| PlantUML | ⛔ | draw.io renders PlantUML on a server, and OpenDraw is offline-first. Use Mermaid import, which produces native shapes. |
| CSV | ✅ | draw.io's `#` directive syntax (`csv.ts`); see §16. |
| SQL | ✅ | MySQL, PostgreSQL, SQL Server and SQLite DDL become ER entities (`sql.ts`). |
| From text / lists | ✅ | Indented lists and `a -> b` notation (`text.ts`). |
| Graphviz / DOT | ❌ | Not implemented (draw.io doesn't support it natively either). |
| Images (drag & drop) | 🟡 | Dropping a PNG, JPEG, SVG or other image creates an image shape. SVGs aren't converted into editable shapes. |
| draw.io library (`.xml`) | ✅ | Shapes panel → *Open library…* (`parseLibrary` in `src/panels/userLibraries.ts`). |
| URL import | ✅ | Web only: `#U<url>` and `?url=` (`src/web/loadDiagram.ts`). |
| Drag & drop file import | ✅ | `App.tsx`. |
| AI generation | ✅ | Bring your own key: *Extras → Generate with AI…* (`Mod+I`), in `src/ai/`. |

## 13. Export & Publishing

All exports go through *File → Export…* (`Mod+Alt+E`), `src/chrome/ExportDialog.tsx` and `src/io/export/`.

| Feature | Status | Notes |
| --- | --- | --- |
| PNG | ✅ | Scale, border, transparent background, selection, crop to content or page area, grid, embedded diagram. |
| JPEG | ✅ | With a quality option. |
| WebP | ✅ | With a quality option. |
| SVG | ✅ | Embedded fonts and images, embedded diagram, light, dark or auto appearance. Text is always native SVG text. |
| PDF | ✅ | All pages or a range, sized to content or to the paper, embedded diagram (draw.io- and OpenDraw-readable), selection, grid (`pdf.ts`). |
| HTML | ✅ | Self-contained viewer with pages, zoom, layers, tooltips and links. It needs no external JS, unlike draw.io (`html.ts`). |
| draw.io XML | ✅ | Native draw.io styles; compressed option. |
| VSDX | ✅ | `src/io/vsdx/export.ts`. Shapes don't use masters, so they come out as rectangles, ellipses or diamonds. |
| URL | ✅ | `#R` share link (deflate + base64url) pointing at `SHARE_BASE_URL` (`src/io/export/config.ts`). |
| Embed snippets (HTML / iframe / image) | 🟡 | No snippet generator. [`docs/web.md`](web.md) documents a lightbox `<iframe>`; the HTML export is another option. |
| Publish link | ✅ | Share link plus `?viewer=1`. The diagram travels in the URL fragment, so nothing is uploaded. |
| Print | 🟡 | `Mod+P` prints one page per sheet, scaled to fit (`src/app/print.ts`). Fit-to-N-pages and custom scale are missing. |
| Selection / crop / border / scale | ✅ | Export dialog. |
| Transparent background | ✅ | PNG, WebP, SVG, HTML and GIF. |
| "Include a copy of my diagram" | ✅ | PNG, SVG and PDF (`embed.ts`). |
| JSON | ✅ | `.opendraw` is pretty-printed JSON. The embed API can also export `json`. |
| Command-line export | ✅ | `opendraw --export …` ([`docs/cli-export.md`](cli-export.md), `src-tauri/src/cli.rs`). |

OpenDraw also exports **animated GIF**, which draw.io doesn't (`gif.ts`, [`docs/specs/animation.md`](specs/animation.md)).

## 14. Storage & Integrations

| Feature | Status | Notes |
| --- | --- | --- |
| Device (local files) | ✅ | The desktop app uses native dialogs and atomic writes (`src-tauri/src/lib.rs`). The web build uses `showSaveFilePicker` where the browser supports it, and falls back to downloads (`src/io/native.ts`). |
| Browser storage | 🟡 | The crash-recovery draft lives in `localStorage` and revisions in IndexedDB. There's no browser-side file library. |
| Google Drive | ⛔ | Local-first by design: no OAuth and no server. Save `.opendraw` files to a synced folder, or share a link. |
| OneDrive / SharePoint | ⛔ | Same as Google Drive. |
| Dropbox | ⛔ | Same as Google Drive. |
| GitHub | ⛔ | No commit-per-save integration. `.opendraw` is pretty-printed JSON, so it diffs well in plain git, and the web build opens GitHub `blob/` links through `?url=`. |
| GitLab | ⛔ | Same as GitHub. |
| Confluence | ⛔ | No marketplace plugin. Embed the lightbox in an `<iframe>`, or attach an HTML or editable PNG/SVG export. |
| Jira | ⛔ | Same as Confluence. |
| MS Teams / Office add-in | ⛔ | Same as Confluence. |
| Google Workspace add-on | ⛔ | Same as Confluence. |
| Notion | ⛔ | No extension. The lightbox iframe works wherever iframe embeds are allowed. |
| Nextcloud / ownCloud | ⛔ | No integration. Self-host the Docker image. |
| VS Code extension | ⛔ | Not provided. |
| Docker image | ✅ | `Dockerfile` (Node build stage, nginx serving), `deploy/nginx.conf`, [`docs/web.md`](web.md). |
| Embed mode API | ✅ | `?embed=1` postMessage protocol modelled on draw.io's: load, export, status, exit and autosave (`src/web/embed.ts`). *File → Save* / *Save as…* also hand the diagram to the host. |
| Other integrations (GitBook, Docusaurus, MediaWiki…) | ⛔ | No dedicated plugins. Use the lightbox iframe, HTML export, or the CLI in docs pipelines. |

## 15. Collaboration & Sharing

| Feature | Status | Notes |
| --- | --- | --- |
| Real-time collaboration / shared cursors | ⛔ | This would need a sync server and accounts, and OpenDraw has no backend. Share links, embedding, and file-based comments and revisions cover asynchronous collaboration. |
| Comments | ✅ | Threads on elements, with replies and resolve. They're stored in the file (`Comment` in `src/model/types.ts`); open the panel with *View → Comments* (`Mod+Alt+M`). The author name is set in Preferences. |
| Share dialog | ⛔ | There are no permissions to manage. Anyone with a share link can see the diagram. |
| Revision history | ✅ | *File → Revision history…* (`Mod+Alt+Shift+H`) restores local snapshots, taken on every save and periodically while there are unsaved changes. They're kept in IndexedDB, 40 per document (`src/app/revisions.ts`). |
| Conflict resolution / merge | ⛔ | Without concurrent editing there's nothing to merge. JSON files can be merged with git. |
| Publish / link sharing | ✅ | Share links, the viewer, HTML export and the embed API. |
| Notifications | ⛔ | Specific to Confluence. |

## 16. Advanced & Automation

| Feature | Status | Notes |
| --- | --- | --- |
| CSV import syntax | ✅ | Supports label, style, stylename/styles, vars, parentstyle, identity, parent, namespace, connect, width, height, padding, left, top, ignore, link, collapsed, nodespacing, levelspacing and layout. `edgespacing` is accepted but ignored, and JSON layouts fall back to `auto` with a warning (`csv.ts`). |
| Edit Diagram | ✅ | *Extras → Edit diagram source…* edits the current page as OpenDraw JSON, not XML. Changes can be undone. |
| Edit Style (raw) | ✅ | `Mod+E`. |
| Edit Data on shapes / edges / layers / pages | 🟡 | Shapes and connectors only; layers and pages have no metadata. |
| Placeholders (`%key%` with parent lookup) | 🟡 | Looks up the element's own data and the built-in variables. It doesn't walk up through containers to the page or diagram. |
| Custom links & actions | ❌ | See §7. |
| Plugins | ❌ | No runtime plugin loading. Importers, layouts and shape libraries are build-time plugins, auto-discovered from their folders. |
| Configuration | 🟡 | *Extras → Preferences* sets the author, custom colours and default font (`src/app/preferences.ts`). There's no JSON configuration for libraries, styles, templates or CSS. |
| URL parameters | 🟡 | Web only: `url`, `viewer`/`lightbox`, `embed`, `title`, `page`, `theme`/`dark`, `toolbar`, `autosave`, `origin`, `proto`, `saveBtn`/`exitBtn` (`src/web/launch.ts`). `lang`, `libs`, `clibs`, `grid`, `math` and `ui` aren't supported. |
| Extended shape config (stencil / shape JSON) | ❌ | See §3. |
| Mermaid / PlantUML regeneration | ❌ | Mermaid imports become plain shapes, and the source isn't kept for re-editing. |
| Mathematical typesetting | ✅ | See §5. |
| Explore / Anonymize / Replay / Voice plugins | ❌ | Not implemented. |
| Scratchpad | ✅ | See §2. |
| Autosave & draft recovery | 🟡 | The working document is mirrored to a crash-recovery draft and snapshotted into revisions periodically (`src/app/fileCommands.ts`). Nothing is autosaved to the file itself. The embed API has `?autosave=1`. |
| Stencil XML | ❌ | See §3. |
| JS viewer & lightbox URL | ✅ | Lightbox URL plus the self-contained HTML export. There's no separate `viewer-static.min.js`. |
| Offline mode | ✅ | The desktop app is fully offline, and the web build is an installable PWA. |
| Clipboard XML interop | 🟡 | Copies paste between OpenDraw instances as tagged JSON. Pasting draw.io XML isn't supported. |

## 17. Layout Algorithms

Layouts are in *Arrange → Layout* and the command palette, auto-discovered from `src/layout/*.ts`.

| Feature | Status | Notes |
| --- | --- | --- |
| Horizontal / Vertical Flow | ✅ | `flow-horizontal.ts`, `flow-vertical.ts`. |
| Horizontal / Vertical Tree | ✅ | `tree-horizontal.ts`, `tree-vertical.ts`. |
| Radial Tree | ✅ | `tree-radial.ts`. |
| Organic (force-directed) | ✅ | `organic.ts`. |
| Circle | ✅ | `circle.ts`. |
| Compact Tree | ✅ | `tree-compact.ts`. |
| Org Chart | ✅ | `org-chart.ts`. There are no layout options. |
| Parallel Edges | ❌ | Not implemented. |
| Apply layout from JSON | ❌ | Not implemented. |
| Tree editing (add child / sibling) | ✅ | `Tab` adds a child, `Mod+Enter` a sibling, `Mod+Shift+Enter` a sibling before. Plain Enter edits the label, so these shortcuts differ from draw.io's. Grid and Mind Map layouts are also available. |

## 18. UI & App Features

| Feature | Status | Notes |
| --- | --- | --- |
| Editor UI modes (Sketch / Simple / Classic…) | 🟡 | There's one floating-panel UI, plus Focus mode (`Mod+\`) to hide the panels. |
| Dark mode | ✅ | Light, dark or system theme. Diagram colours adapt in dark mode. |
| UI languages | ❌ | English only; there's no i18n. |
| Format panel | ✅ | `Mod+Shift+P`. Its sections change with the selection rather than using tabs (`src/panels/PropertiesPanel.tsx`). |
| Shapes panel | ✅ | `Mod+Shift+K`, with Shapes and Cloud tabs. |
| Toolbar | ✅ | Tools, zoom pill, undo/redo, Generate, Export (`Toolbar.tsx`, `TitleBar.tsx`). |
| Menus (File, Edit, View, Arrange, Extras, Help) | ✅ | All six menus (`TitleBar.tsx`). |
| Context menu | ✅ | Context-sensitive (`src/chrome/Overlays.tsx`). |
| Outline panel | ✅ | See §1. |
| Find / Replace | ✅ | See §5. |
| Keyboard navigation & accessibility | 🟡 | Controls have ARIA labels, and the keyboard covers most commands. There's no Tab traversal between shapes and no `Shift+F10` context menu. |
| Shortcuts dialog | ✅ | *Help → Keyboard shortcuts* (`Mod+/`). |
| Autosave & draft recovery | 🟡 | See §16. |
| Revision history | ✅ | See §15. |
| Offline / PWA | ✅ | `src/web/pwa.ts`, `vite.config.ts`. |
| Recent files | 🟡 | Desktop only (*File → Open recent*). |
| Multiple windows | ❌ | The desktop app has a single window. |
| File properties | 🟡 | No Properties dialog. The draw.io export has a compressed option. |
| Compressed XML option | ✅ | Export dialog, for the draw.io format. |
| Pages & zoom controls in footer | ✅ | Page tabs and the zoom pill. |
| Touch / pen | 🟡 | Pointer events cover pen input, and trackpad pinch works in the editor. Touchscreen pinch-zoom works only in the viewer. Pen pressure isn't used. |
| Tooltips on shapes | ✅ | Native SVG `<title>` in the editor, and hover cards in the viewer. |
| Search shapes / help search | ✅ | Shape search, plus the command palette (`Mod+K`). |
| Spell checking | ✅ | See §5. |
| Units / grid / guides / page view toggles | ✅ | *View* menu. |
| Fullscreen | ✅ | See §1. |
| Update notifications (desktop) | ❌ | The Tauri updater plugin isn't set up (`src-tauri/Cargo.toml`). |

## 19. Keyboard & Mouse Shortcuts

All shortcuts are defined in one registry, `src/app/actions.tsx`; canvas gestures are in `src/canvas/useCanvasInteractions.ts`.

| Feature | Status | Notes |
| --- | --- | --- |
| File (new, open, save, save as, print) | ✅ | `Mod+N`, `Mod+O`, `Mod+S`, `Mod+Shift+S`, `Mod+P`. |
| Edit (copy, paste, duplicate, undo) | ✅ | See §9. |
| Selection | ✅ | See §9. |
| Zoom / view | ✅ | See §1; also `Mod+Shift+G` for the grid. |
| Arrange (group, order, align) | ✅ | See §8. Align uses `Alt`+letter. |
| Text formatting (`Mod+B` / `I` / `U`, font size) | ✅ | `Mod+B`/`I`/`U`, `Mod+Shift+.`/`,` to step the font size; on the selection or while editing a label (*Edit → Text*). |
| Connection (`Alt+Shift+arrows`) | ✅ | Clone and connect. |
| Tree editing | ✅ | See §17. |
| Modifiers (Ctrl-drag clone, Alt no-snap, Shift constrain, Alt rubber band) | ✅ | See §3 and §9. |

## 20. Diagram-Type-Specific Features

| Feature | Status | Notes |
| --- | --- | --- |
| Flowcharts | ✅ | Library, flow layouts, quick-connect, 40+ templates. |
| UML | 🟡 | Class shapes with compartments, and lifelines. Pressing Enter doesn't add an attribute row, there's no activation shape, and PlantUML is out of scope (Mermaid class and sequence import work instead). |
| ER diagrams | ✅ | Table and entity shapes, SQL import, crow's-foot ends, Mermaid erDiagram import. |
| BPMN | ✅ | Event and gateway variants are separate library items rather than shape properties. |
| Mind maps | ✅ | Library, Mind Map layout, Tab and Mod+Enter tree editing, templates. |
| Org charts | ✅ | Org Chart layout, CSV `layout: orgchart`, templates, org-chart shapes (`planning.tsx`). |
| Floorplans | ✅ | See §2. |
| Network / cloud architecture | ✅ | Vendor icon packs, rack, network library, Cloud and Network templates. |
| Gantt / timelines | ✅ | Task-bar, milestone and timeline shapes (`planning.tsx`), plus templates. Like draw.io, there's no scheduling engine. |
| Kanban | ✅ | Kanban shapes plus Agile templates. |
| Wireframes / mockups | ✅ | See §2. |
| Venn / infographics / charts | ✅ | Shapes and templates. Like draw.io, there's no live data-driven charting. |
| Electrical / P&ID | ✅ | See §2. |
| C4 / ArchiMate / SysML | ✅ | See §2. |
| Swimlanes that grow with lanes | 🟡 | Pools and lanes are containers. A pool doesn't resize when you add a lane. |
| Tables / lists | ✅ | Native table with row and column add/remove, plus a list container. |

## 21. Desktop App Specifics

| Feature | Status | Notes |
| --- | --- | --- |
| Native app for Windows, macOS and Linux | 🟡 | Tauri 2 builds MSI and NSIS installers, a universal DMG and `.app`, and AppImage and deb packages (`src-tauri/tauri.*.conf.json`). rpm, snap and portable builds aren't configured. |
| Local files, autosave, backups | 🟡 | Atomic writes, a crash-recovery draft and local revisions. There's no `.bkp` file and no autosave to the file. |
| CLI export | ✅ | See §13. |
| Auto-update | ❌ | See §18. |
| No external network by default | ✅ | The only outbound calls are to the AI provider you configure, sent through Rust (`src-tauri/src/ai.rs`). The CSP is in `tauri.conf.json`. |
| Open `.vsdx` / `.drawio` / `.png` / `.svg`, file association | 🟡 | *File → Open* handles all of these. Only `.opendraw` is registered as a file association. |
| Plugins flag, config file, spell-check language | ❌ | Not implemented. Spell check uses the OS WebView defaults. |

## 22. File Format Internals

| Feature | Status | Notes |
| --- | --- | --- |
| `<mxfile>` / `<diagram>` / `<mxGraphModel>` / `UserObject`, compressed or plain | ✅ | Read and write (`src/io/drawio.ts`). Layers, tooltips, links, tags and data round-trip. |
| Style strings and stencil XML | 🟡 | draw.io style strings are mapped to and from OpenDraw's typed `ElementStyle`. mxGraph stencils aren't supported. OpenDraw's own format is `.opendraw` JSON (`src/io/fileFormat.ts`). |

## 23. Security & Privacy

| Feature | Status | Notes |
| --- | --- | --- |
| Client-side data, no server storage, CSP, Docker self-hosting | ✅ | No backend. Share links keep the diagram in the URL fragment. CSP is set for both Tauri and nginx (`scripts/web/csp.mjs`). AI keys live in the OS keychain on desktop and are never handed to the WebView. |
