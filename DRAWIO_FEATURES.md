# draw.io (diagrams.net): Complete Feature Inventory for OpenDraw Parity Planning

Sources: drawio.com/docs (features overview, manual, shortcuts, layers, CSV import, export formats), github.com/jgraph/drawio and its release notes, and long-standing documented editor behaviour. Items marked **[unverified]** are things I believe exist but couldn't confirm in current official docs. Check them in the live editor (app.diagrams.net) before you rely on them.

## Table of Contents
1. [Canvas & Navigation](#1-canvas--navigation)
2. [Shapes & Shape Libraries](#2-shapes--shape-libraries)
3. [Creating & Editing Shapes](#3-creating--editing-shapes)
4. [Connectors / Edges](#4-connectors--edges)
5. [Text & Formatting](#5-text--formatting)
6. [Styling](#6-styling)
7. [Layers, Tags & Visibility](#7-layers-tags--visibility)
8. [Grouping, Alignment, Distribution, Ordering](#8-grouping-alignment-distribution-ordering)
9. [Selection & Manipulation](#9-selection--manipulation)
10. [Pages](#10-pages)
11. [Templates & Examples](#11-templates--examples)
12. [Import](#12-import)
13. [Export & Publishing](#13-export--publishing)
14. [Storage & Integrations](#14-storage--integrations)
15. [Collaboration & Sharing](#15-collaboration--sharing)
16. [Advanced & Automation](#16-advanced--automation)
17. [Layout Algorithms](#17-layout-algorithms)
18. [UI & App Features](#18-ui--app-features)
19. [Keyboard & Mouse Shortcuts](#19-keyboard--mouse-shortcuts)
20. [Diagram-Type-Specific Features](#20-diagram-type-specific-features)
21. [Desktop App Specifics](#21-desktop-app-specifics)
22. [File Format Internals](#22-file-format-internals-relevant-for-parity)
23. [Security & Privacy](#23-security--privacy)
24. [Verification Notes](#24-verification-notes)

---

## 1. Canvas & Navigation
- **Infinite canvas**: The drawing area grows automatically in every direction as you place shapes near its edges, so there's no fixed page boundary (docs: "infinite canvas").
- **Page view**: View > Page View shows page-sized tiles with page breaks behind the diagram. Turn it off for a plain unbounded canvas.
- **Paper size & orientation**: In the Diagram tab of the Format panel you pick the paper size (A0–A6, Letter, Legal, Tabloid, Ledger, B4/B5, 16:9 and 16:10 screen sizes, or Custom) and set portrait or landscape. Page view and printing use this setting.
- **Background colour**: Sets a solid background colour for the page. Exports include it.
- **Background image**: You can set an image (by URL or upload) as the page background, for example to trace over a floor plan.
- **Grid**: A toggleable grid (Ctrl+Shift+G) with a configurable size in pixels and a configurable colour. Shapes snap to it.
- **Grid snapping bypass**: Holding Alt while dragging or resizing turns off grid snapping for that operation.
- **Rulers**: View > Ruler shows horizontal and vertical rulers. Units can be points, inches, millimetres or metres (the units setting is in the View menu).
- **Units**: Sets the measurement unit for geometry fields and rulers: points/pixels, inches, mm or metres.
- **Guides (smart guides)**: As you move a shape, dynamic alignment lines appear to snap it to the edges or centres of other shapes and show equal spacing. View > Guides toggles them.
- **Zoom**: Zoom in or out with Ctrl/Cmd + mouse wheel, Ctrl +/−, toolbar buttons, or pinch on a trackpad or touchscreen. Ctrl+H fits the window, and Ctrl+0 resets to 100% (actual size).
- **Zoom presets**: The toolbar dropdown offers fixed zoom levels plus Fit Window, Fit Page Width, One Page, Two Pages and Custom.
- **Panning**: Pan with the scrollbars, the mouse wheel (Shift+wheel scrolls horizontally), Space+drag, middle- or right-button drag, or the arrow keys when nothing is selected.
- **Scrollbars toggle**: View > Scrollbars turns the scrollbars on or off.
- **Outline panel**: View > Outline (Ctrl+Shift+O) opens a minimap of the whole diagram. You drag the viewport rectangle in it to navigate.
- **Page tabs**: Tabs at the bottom switch between pages in a multi-page diagram (see section 10).
- **Fullscreen**: Expands the editor to full screen.
- **Connection points display**: View > Connection Points shows or hides the fixed connection-point markers when you hover over a shape.
- **Shadow / page shadow for the whole diagram**: The Diagram tab's "Shadow" checkbox adds a drop shadow to all shapes at once.
- **Lightbox/viewer mode**: A read-only viewer with zoom, page and layer controls. It's used for published links and HTML exports.

## 2. Shapes & Shape Libraries
Open more libraries with "+ More Shapes" at the bottom of the Shapes panel. Built-in libraries include the following.
- **General**: Rectangle, rounded rectangle, ellipse, square, circle, process, diamond, parallelogram, hexagon, triangle, cylinder, cloud, document, internal storage, cube, step, trapezoid, tape, note, card, callout, actor, plus text, textbox, heading and container shapes, and lines and arrows.
- **Misc**: Ad-hoc shapes such as icons, chevrons, crosses, partial rectangles, "link" and image placeholders.
- **Advanced**: Shapes with extra geometry parameters: arrows, tables, flexible arrows, partial rectangles, corner rounding, data storage, and so on.
- **Basic**: Simple geometric primitives (shapes, stars, wave, polygons, etc.).
- **Arrows**: A library of block arrows: single, double, U-turn, bent, callout arrows and more.
- **Flowchart**: The standard flowchart symbols (process, decision, terminator, data, predefined process, manual input, delay, merge, off-page reference, database, etc.).
- **Entity Relation**: ER tables and attributes, Chen and Crow's-foot notation, and relationship connectors with cardinality ends.
- **UML**: Class, interface, package, component, lifeline, activation, actor, use case, state, node, frame, note and more.
- **UML 2.5**: An extended UML 2.5 library.
- **Containers / Swimlanes / Tables**: Horizontal and vertical pools and lanes, table shapes with rows and columns, list shapes.
- **BPMN (BPMN 2.0)**: Events (start, intermediate, end, with triggers), activities, gateways, data objects, pools/lanes, choreography and conversations.
- **Mockups / Wireframes**: Buttons, containers, forms, graphics, markup, navigation and misc controls for UI mockups.
- **Android**: Android device frames and UI widgets.
- **iOS / iOS7**: iPhone/iPad frames and iOS UI controls.
- **Bootstrap**: Bootstrap web UI components.
- **Sitemap**: Website-structure shapes.
- **Network**: Generic network shapes (servers, routers, firewalls, PCs, etc.).
- **Cisco / Cisco19**: The official-style Cisco network icon sets.
- **Citrix**: Citrix infrastructure shapes.
- **Rack**: Server rack units and equipment (General, APC, Cisco, Dell, F5, HP, IBM, Oracle, etc.).
- **Veeam / Veeam 2**: Veeam backup infrastructure shapes.
- **AWS (AWS 2025/AWS 4/AWS 3D, legacy AWS)**: Amazon Web Services architecture icons and groups.
- **Azure / Microsoft Azure**: Azure architecture icons.
- **GCP (Google Cloud Platform)**: GCP icons and cards.
- **IBM**: IBM Cloud architecture shapes.
- **Alibaba Cloud**: Alibaba Cloud icons.
- **OpenStack** **[unverified current name]**: OpenStack icons.
- **Kubernetes**: Kubernetes resource icons.
- **Office / Microsoft 365**: Office, Exchange, SharePoint, Teams and other Microsoft product icons.
- **Electrical**: Logic gates, resistors, capacitors, inductors, diodes, transistors, ICs, switches, sources, signal sources, waveforms, plc ladder, abstract components.
- **Mind map**: Mind-map shapes. The "mindmap" connectors and tree layouts support it.
- **Infographic**: Infographic shapes such as ribbons, number blocks and roadmaps.
- **Lean Mapping (Value Stream Mapping)**: VSM symbols.
- **Floorplan**: Walls, doors, windows, furniture, stairs and bathroom/kitchen fixtures.
- **Electrical / Engineering / Process Engineering (P&ID)**: P&ID valves, pumps, vessels, instruments, piping, heat exchangers, compressors, etc.
- **Signs**: Safety, transport, people, animals, food, tech and other signs.
- **Clipart**: Clipart-style images (computers, people, finance, etc.).
- **Atlassian**: Atlassian product icons.
- **Archimate / ArchiMate 3**: Enterprise architecture notation.
- **SysML**: SysML diagram shapes.
- **Threat Modeling / STRIDE** **[unverified]**: Threat-modelling shapes.
- **C4 Model**: C4 architecture shapes (person, software system, container, component).
- **Salesforce, Fluent UI, Material Design icons, Font Awesome, Webicons, Allied Telesis, Arista, Sitemap, Cabinets, eip (Enterprise Integration Patterns), Gmdl (Material), Active Directory, Infographic, 3D/Isometric**: Further specialised libraries listed in the More Shapes dialog.
- **Shape search**: The search box at the top of the Shapes panel finds shapes by name or tags across all libraries, including online open-source icon sets. "/" focuses it.
- **Scratchpad**: A personal library you edit by dragging shapes into it. It persists in browser or desktop storage for reuse.
- **Custom libraries**: File > New Library creates a library saved as an XML file in any storage backend. You can share it and open it via a URL or the `clibs` URL parameter.
- **Favourites / recently used shapes** **[unverified]**: The panel shows recently used shapes.
- **Shape hover preview**: Hovering over a library shape shows a larger preview with its name.
- **Click-to-insert / drag-to-insert**: Click a library shape to insert it at a sensible location (connected to the selection if there is one), or drag it onto the canvas. Dropping a shape onto an existing shape replaces it while keeping its connections (Shift-drop).

## 3. Creating & Editing Shapes
- **Drag & drop from libraries**: Drag shapes from the Shapes panel onto the canvas.
- **Hover icons (blue arrows / quick connect)**: Hovering over a shape shows four blue arrows. Clicking one clones the shape and connects it in that direction. Dragging one creates a connector, and hovering over an arrow shows a shape picker so you can insert a different connected shape.
- **Shape picker (double-click blank canvas)**: Double-clicking an empty area opens a quick shape-picker popup. Ctrl/Cmd+Enter with nothing selected opens it too.
- **Resize handles**: Eight handles resize a shape. Shift keeps the aspect ratio and Ctrl/Alt resizes from the centre **[modifier details partially verified]**.
- **Rotation handle**: A curved handle rotates the shape freely. Shift snaps to 15° increments. The Arrange tab gives exact angle entry, and Ctrl+R rotates 90°.
- **Flip horizontal / vertical**: Mirrors a shape (Arrange > Flip).
- **Geometry fields**: The Arrange tab has numeric fields for left, top, width, height and angle, plus a "constrain proportions" toggle.
- **Shape-specific parameter handles (yellow diamonds)**: Many shapes expose yellow handles for parametric changes such as corner radius, arrow head size, callout pointer position or cylinder depth.
- **Replace / Change shape**: Edit Style changes the shape type, or you can Shift-drop a library shape onto an existing shape to swap it **[menu wording unverified]**.
- **Edit Style**: Ctrl+E opens the raw style string (key=value;...) for direct editing.
- **Edit Shape**: For stencil-based shapes, opens the shape's XML stencil definition so you can edit it.
- **Custom shape (stencil XML)**: Arrange > Insert > Shape lets you write a custom shape in mxGraph stencil XML (paths, arcs, curves, connection constraints, foreground/background).
- **Freehand drawing**: The freehand tool draws lines with pen or mouse. Options include smoothing, brush size, fill and a "pressure"/sketch look.
- **Polygon / free-form shape conversion** **[unverified]**: Freehand paths become editable shapes.
- **Images**: Insert images by URL, upload, paste or drag. They can be cropped and resized, and you can edit the image URL, set clipping and toggle "preserve aspect ratio" **[crop verified in release notes]**.
- **Text shape / Textbox**: Text-only shapes with no fill or border.
- **Tables**: A native table shape (Arrange > Insert > Table) with rows and cells. You can insert or delete rows and columns, resize them, and style each cell.
- **Containers**: Any shape can be marked as a container ("Container" checkbox in the Style tab). Child shapes then move with it. Containers can be collapsible, with an expand/collapse "+/-" icon.
- **Collapse / expand**: Containers, groups, swimlanes and tree nodes can be collapsed to hide their children.
- **Shape properties (Edit > Edit Data)**: Ctrl+M edits a shape's ID, label and custom key/value properties.
- **Tooltips**: Shapes can have tooltips (stored as a `tooltip` property) that appear on hover in the editor and viewer.
- **Links on shapes**: Edit Link (Alt+Shift+L) attaches a URL, a page link or a custom action. Ctrl/Cmd-click follows it in the editor, and a plain click follows it in the viewer.
- **Copy/paste style**: Copy Style and Paste Style buttons in the Format panel transfer a style between shapes.
- **Set as default style**: Makes the current style the default for new shapes (Ctrl+Shift+D).
- **Edit Geometry** **[unverified]**: A dialog for exact geometry values.
- **Autosize**: Resizes a shape to fit its label (Ctrl+Shift+Y).
- **Fixed / resizable / movable / rotatable / deletable / editable flags**: Style flags such as `movable=0`, `resizable=0`, `rotatable=0`, `deletable=0` and `editable=0` lock individual behaviours. The Edit Style / Edit > Lock options expose them.

## 4. Connectors / Edges
- **Create connectors**: Drag from a hover arrow or from a connection point, or select two shapes and connect them. You can also draw a connector from blank space as a free-standing line.
- **Waypoint styles**: Straight, Orthogonal, Simple, Isometric, Curved, Entity Relation, Elbow (horizontal/vertical) and Manual. They're chosen in the Style tab's "Waypoints" dropdown.
- **Connector types**: Line, Link, Arrow (block arrow edge), Wide arrow, Wire/Pipe (a double line with a fill), Flex arrow **[naming per style panel]**.
- **Waypoints**: Drag the middle handles to add bends. Double-click a waypoint to remove it. "Clear Waypoints" (Alt+Shift+C) resets a manual route.
- **Automatic rerouting**: Orthogonal edges reroute automatically around their endpoints when shapes move.
- **Line jumps (crossings)**: At crossings, edges can show an arc, gap or sharp jump, with a configurable size.
- **Rounded corners / curved**: Edges can have rounded corners or be fully curved (Bezier-like).
- **Floating vs fixed connections**: Dropping an endpoint on a shape's outline (blue outline highlight) gives a floating connection that follows the shortest side. Dropping it on a specific connection point (an "x" marker) gives a fixed connection.
- **Connection points per shape**: Shapes define connection points. "Edit Connection Points" **[newer releases]** lets you add or move them, and you can also set them in stencil XML or with `points=[[x,y],...]` in the style.
- **Perimeter / anchor offset**: Style keys such as `exitX`, `exitY`, `entryX`, `entryY`, the `exitDx/Dy` offsets and `perimeterSpacing` control precise anchoring.
- **Arrowheads**: Line start and end markers include classic, open, block, oval, diamond, thin diamond, dash, cross, async, circle and ER notations (one, mandatory one, many, one-or-many, zero-to-one, zero-to-many), half arrows, box, and others. Each has a size and a filled/unfilled toggle.
- **Line pattern**: Solid, dashed, dotted, or a custom dash pattern.
- **Line width & colour**: Configurable stroke width and colour.
- **Edge labels**: Double-click an edge to add a label. An edge can have several labels (child labels), and you drag them along the edge or offset them from it.
- **Label background**: Edge labels get a background so the line doesn't run through the text.
- **Connector flow animation**: The "Flow Animation" style option animates a dashed edge to show direction.
- **Connect to edges**: An edge can connect to another edge.
- **Reverse**: Edit > Reverse **[Arrange > Reverse unverified exact menu]** flips the edge's direction.
- **Straighten / snap edges**: Turns an edge into a straight line **[unverified]**.
- **Edge style presets**: The Format panel and toolbar have quick connector-style buttons for new edges (Ctrl+Shift+?) **[unverified shortcut]**.
- **Ghost/disconnected edges**: Dangling edges are allowed, which makes free lines and arrows possible.
- **Sketch edges**: In sketch mode, edges get a hand-drawn appearance.

## 5. Text & Formatting
- **Labels on any shape**: Double-click, F2 or Enter starts editing. Typing with a shape selected starts editing and replaces the label.
- **Rich text (HTML) labels**: Formatted text supports bold, italic, underline, strikethrough, font, size, colour, highlight, alignment, lists, links, sub/superscript, horizontal rules, tables in labels, and images in labels.
- **Plain text mode**: Turning off "Formatted Text" makes the label plain text and wraps it based on the style.
- **Word wrap**: The "Word Wrap" toggle wraps text to the shape's width.
- **Label position**: Labels can be placed inside, outside (top, bottom, left, right) or at the corners via the Text tab "Position" option. Vertical and horizontal alignment are set separately.
- **Text direction**: Horizontal or vertical text, rotation, and RTL/LTR/automatic writing direction.
- **Spacing**: Top, left, bottom, right and global spacing around label text.
- **Fonts**: System fonts, web-safe fonts, Google Fonts (enter a name) and custom font URLs.
- **Font colour, background colour, border colour for label**: Styles that apply to the label box.
- **Opacity of text**: Text opacity is controlled separately from the shape.
- **Edit HTML source of label**: The "<>" toggle in the text toolbar lets you edit raw HTML.
- **Clear formatting**: Removes inline formatting from a label.
- **Mathematical typesetting**: Extras > Mathematical Typesetting renders LaTeX (`$$...$$`, `\(...\)`) and AsciiMath (`` `...` ``) through MathJax.
- **Placeholders in labels**: `%name%` placeholders pull in shape, parent or page property values. Supported variables include `%page%`, `%pagenumber%`, `%pagecount%`, `%date%`, `%time%`, `%timestamp%` and `%filename%`.
- **Spell check**: Uses the browser's native spell check when editing labels.
- **Find & Replace**: Ctrl+F searches labels and metadata, with options for regex, whole word, match case, all pages and replace.
- **Translations / multilingual labels**: Through placeholders and properties such as `label_de` combined with the `lang` setting, you can show translated labels **[documented via metadata/placeholders]**.
- **Text-to-diagram autoshape**: Typing creates text, and the editor can auto-create connected shapes in tree contexts.

## 6. Styling
- **Fill**: Solid colour, None, or Gradient (with a second colour and direction: north, south, east, west, radial).
- **Fill style (sketch)**: In sketch mode the fill can be hachure, solid, zigzag, cross-hatch, dots, dashed or zigzag-line.
- **Stroke**: Colour, width, pattern (dashed/dotted) and none.
- **Opacity**: Opacity settings for the whole shape, the fill and the line.
- **Shadow**: A drop shadow per shape. Newer versions expose its colour, blur, offset and opacity through style keys **[advanced shadow options partially verified]**.
- **Glass effect**: A glossy overlay style.
- **Rounded**: Rounded corners, with an arc size.
- **Sketch / hand-drawn (Rough.js)**: The "Sketch" checkbox per shape or diagram applies a rough look, along with the Comic/handwriting font option.
- **Comic style** **[legacy]**: The older `comic=1` hand-drawn style.
- **Colour palette**: Quick colour presets in the Style tab, a colour dialog with HSV/hex entry, recent colours, and a custom palette (configurable).
- **Style presets in Format panel**: Clickable preset thumbnails for quick styles.
- **Themes / Diagram style**: The Diagram tab offers "Style" presets that re-colour the whole diagram, plus default colour schemes.
- **Dark mode adaptive colours**: Diagram colours adapt automatically in dark mode. User-defined dark colours (`light-dark()`-style overrides) are supported, or you can disable adaptive colours.
- **Image styles**: Image shapes have opacity, flip, crop, border and background settings, plus image aspect ratio.
- **Shape-specific styles**: Examples are cylinder depth, arrow width, and how much a callout's tail sticks out.
- **Copy/Paste Style**: See section 3.
- **Default style editing**: Set as Default Style.
- **Swimlane styles**: Header size, horizontal or vertical orientation, and separate fill for the header and body.

## 7. Layers, Tags & Visibility
- **Layers dialog**: Ctrl+Shift+L. A new diagram has one "Background" layer.
- **Add / duplicate / rename / delete layers**: Done from the dialog's buttons and its Current Layer menu.
- **Current layer**: New shapes go into the layer that's selected.
- **Move selection to layer**: A dialog button moves the selected shapes to another layer.
- **Reorder layers**: Drag to reorder. Layer order sets the z-order between layers.
- **Hide/show layers**: Eye toggle per layer.
- **Lock layers**: Prevents changes to anything on the layer.
- **Select all in layer**: Selects everything on the layer.
- **Layer metadata**: Layers have Edit Data properties like shapes.
- **Layers in viewer/export**: The lightbox and HTML export let viewers toggle layers. Export can include only visible layers, or per-layer options **[export per-layer unverified]**.
- **Tags**: Assign tags to shapes in Edit Data. The Tags dialog then filters which shapes are visible by tag (docs: "layers and tags").
- **Custom link actions**: Links can toggle layers or tags, highlight or select cells, scroll, and so on (`data:action/json,...`), which enables interactive diagrams.

## 8. Grouping, Alignment, Distribution, Ordering
- **Group / Ungroup**: Ctrl+G and Ctrl+Shift+U. Groups are invisible container cells.
- **Remove from group**: Takes the selected shape out of its group.
- **Align**: Left, center, right, top, middle and bottom alignment for multiple shapes.
- **Distribute**: Spreads shapes evenly horizontally or vertically.
- **Ordering**: To Front (Ctrl+Shift+F), To Back (Ctrl+Shift+B), Bring Forward, and Send Backward.
- **Arrange > Layout**: Automatic layouts (see section 17).
- **Snap to grid / align to grid**: Aligns the selection to the grid **[menu item unverified]**.
- **Equal size** **[unverified]**: Matches width and height across the selection. The geometry fields work on a multi-selection.
- **Enter group (navigate into group)**: Opens a group or container for editing, isolating its children. Exit Group returns.
- **Home/Up navigation**: Navigates the container hierarchy.

## 9. Selection & Manipulation
- **Click / Shift-click / rubber-band**: Rubber-band selection selects shapes fully inside the rectangle. Alt+drag starts a rubber band even when you start on top of a shape.
- **Select all / vertices / edges / none**: Ctrl+A, Ctrl+Shift+I (vertices), Ctrl+Shift+E (edges) and Ctrl+Shift+A (none).
- **Select children / parent / siblings / descendants**: Keyboard and menu navigation of the hierarchy, e.g. Alt+Shift+X/P/S/D **[shortcut letters per shortcuts sheet, partially verified]**.
- **Copy / Cut / Paste / Paste here**: Works across tabs and diagrams through the system clipboard (XML in HTML/text). Paste Here pastes at the mouse position.
- **Duplicate**: Ctrl+D duplicates the selection. Ctrl-drag clones while dragging.
- **Copy as image / Copy as SVG**: Edit > Copy as Image puts PNG or SVG on the clipboard.
- **Delete / Delete All (with connections)**: Delete removes shapes. Ctrl+Delete also removes connected edges.
- **Move with arrow keys**: Arrow keys move by 1px, and Shift+arrow moves by the grid size. Alt+Shift+arrow clones and connects in a direction **[partial verify]**.
- **Lock / Unlock**: Ctrl+L **[newer: Edit > Lock/Unlock]** locks a shape against moving, resizing and editing.
- **Undo / Redo**: Unlimited per-session history (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z).
- **Edit tooltip**: Edits the shape's tooltip.
- **Edit link / open link**: See section 3.
- **Turn into / Replace shape**: Shift-drop.
- **Merge / boolean operations** **[unverified, probably not supported]**: As far as I can tell, draw.io has no union or subtract path operations.
- **Clear Default Style**: Resets the default style.

## 10. Pages
- **Multi-page diagrams**: A single file holds several pages, shown as tabs at the bottom.
- **Insert / duplicate / rename / delete / reorder pages**: Done from the page tab context menu or by dragging tabs.
- **Page links**: Shapes can link to another page (`data:page/id,...`).
- **Per-page settings**: Each page has its own background, grid, paper size and view state.
- **Page navigation in viewer**: The lightbox and embedded viewer can switch between pages.
- **Export selected pages**: Exports can cover the current page, all pages, or a page range (PDF).

## 11. Templates & Examples
- **New-diagram template gallery**: Categories include Basic, Business, Charts, Engineering, Flowcharts, Layout, Maps, Network, Other, Software, Tables, UML, Venn, Wireframes, Cloud (AWS/Azure/GCP/IBM), Mind maps, BPMN, Org charts, Kanban, Infographics, and others.
- **Template search**: Searches templates by keyword.
- **Template preview**: Shows a preview before you insert or create.
- **Insert template into existing diagram**: Arrange > Insert > Template.
- **Custom templates**: Configured in the desktop/Confluence/self-hosted config, or for Confluence via admin custom templates.
- **Example diagrams**: The drawio-diagrams GitHub repo and the documentation's example links.
- **"Blank diagram" / recent files**: The start screen offers a blank diagram, recent files and opening an existing diagram.

## 12. Import
- **draw.io XML / .drawio / .xml**: The native format, compressed or uncompressed.
- **Editable PNG / SVG / PDF / HTML**: Opens files that have embedded diagram XML.
- **Visio (.vsdx, .vssx stencils, legacy .vsd via conversion)**: VSDX import is built in and preserves shapes and pages. Some functionality goes through a server-side converter **[.vsd legacy conversion requires server]**.
- **Gliffy (.gliffy JSON)**: Gliffy diagrams import, and Confluence admins can mass-import Gliffy.
- **Lucidchart**: Imports from Lucidchart's exported JSON/.lucid format **[path partially verified]**.
- **Mermaid**: Arrange > Insert > Advanced > Mermaid converts Mermaid code into an editable diagram (with a native conversion for supported types) or an image.
- **PlantUML**: Arrange > Insert > Advanced > PlantUML renders PlantUML text as an image that stays editable via its source (this needs the server).
- **CSV**: Advanced > CSV (see section 16).
- **SQL**: Advanced > SQL turns CREATE TABLE statements into ER tables (MySQL, SQL Server, PostgreSQL, SQLite flavours).
- **From Text / Lists**: Advanced > From Text builds a list, a diagram, or a graph from indented or arrow notation (`a->b`).
- **Graphviz / DOT** **[unverified, I believe not supported natively]**
- **Images**: Drag and drop PNG, JPG, GIF, SVG, WebP and BMP as image shapes. SVG can be converted to editable shapes in some versions **[unverified]**.
- **Draw.io library (.xml)**: Opens custom libraries.
- **URL import**: Opens files from a URL, or loads XML via `#U<url>` / `?url=`.
- **Drag & drop file import**: Drop files onto the canvas to import them.
- **AI generation**: Generates a diagram from a text prompt (newer feature: "let an AI tool generate the diagram"). Smart templates **[naming unverified]**.

## 13. Export & Publishing
- **PNG**: Scale/zoom, DPI, border width, transparent background, selection only, crop to content, shadow, grid, embedded diagram data, and include links **[options per export dialog]**.
- **JPEG**: Lossy image with a quality option.
- **WebP**: A small web image format.
- **SVG**: Can embed fonts and images, embed the diagram data (editable SVG), use links, include text as foreignObject or convert it to SVG text, and use "light/dark/auto" appearance.
- **PDF**: All pages or a page range, page fit options, crop, include diagram data, selection only, and grid.
- **HTML**: A standalone viewer page that needs viewer.diagrams.net JS. It supports pages, layers, zoom and tooltips.
- **XML / .drawio**: Uncompressed or compressed XML.
- **VSDX**: Export to Visio format.
- **URL**: Encodes the diagram into a link (#R... compressed) so it opens without any storage.
- **Embed (HTML, Image, SVG, IFrame, Google Sites/Docs, Notion, etc.)**: The File > Embed submenu.
- **Publish link**: Creates a viewer link for files in cloud storage.
- **Print**: Print dialog with fit-to-pages, scale and page range.
- **Selection only / crop / border / scale**: Common export options.
- **Transparent background**: For PNG and SVG.
- **Export with "Include a copy of my diagram"**: Lets you re-edit the export later.
- **JSON** **[listed in docs synthesis; I couldn't verify it as a primary export format]**.
- **Command-line export (desktop)**: `drawio -x -f pdf|png|svg|jpg|vsdx|xml` with options for pages, scale, border, crop, transparency and embedding. Good for CI.

## 14. Storage & Integrations
- **Device (local files)**: Uses the browser File System Access API, or the desktop file system.
- **Browser storage**: IndexedDB storage in the web app.
- **Google Drive**: Opens and saves to Drive, with realtime collaboration and revision history.
- **Microsoft OneDrive / SharePoint**: Same, with realtime collaboration.
- **Dropbox**: Cloud storage.
- **GitHub**: Saves to a repository, with commits per save.
- **GitLab**: Same, including self-hosted instances.
- **Confluence Cloud & Data Center**: The draw.io app embeds diagrams in pages, with realtime editing, revisions, a Gliffy migration tool, and custom libraries and templates.
- **Jira Cloud / Data Center**: Attaches diagrams to issues.
- **Microsoft Teams, Word, Excel, PowerPoint (Office add-in)**: Inserts diagrams into documents.
- **Google Workspace (Docs, Sheets, Slides add-on)**: Inserts and updates diagrams.
- **Notion**: Embed via a browser extension or a link **[official browser extension for Notion verified historically]**.
- **Nextcloud / ownCloud**: Community/official integrations.
- **VS Code extension** (community, hediet.vscode-drawio): Edits .drawio files in VS Code.
- **Docker image (jgraph/drawio)**: Self-hosting.
- **Embed mode API**: Embeds the editor in other apps through postMessage (`?embed=1`, JSON protocol with load/save/export events).
- **Other integrations**: GitBook, Docusaurus, MediaWiki, Moodle, Redmine, Sphinx, Quip, Zammad and others (community or third-party integrations listed in the docs).

## 15. Collaboration & Sharing
- **Real-time collaboration with shared cursors**: Available in Google Drive, OneDrive, and Confluence.
- **Comments**: Shape or diagram comments, with replies and resolve, on Google Drive/OneDrive/Confluence.
- **Share dialog**: Opens the storage provider's sharing (permissions are handled by the provider).
- **Revision history**: File > Revision History lists versions with previews and lets you restore them (cloud storage and Confluence).
- **Conflict resolution / merge**: Automatic merging of concurrent changes.
- **Publish / link sharing**: URL export, publish link, and embedding.
- **Notifications** **[Confluence-specific]**

## 16. Advanced & Automation
- **CSV import syntax**: `#` directives for `label`, `style`, `stylename`/`styles`, `identity`, `parent`, `namespace`, `connect` (from/to/invert/label/style), `width`/`height` (auto), `padding`, `ignore`, `nodespacing`/`levelspacing`/`edgespacing`, `layout` (auto, none, horizontaltree, verticaltree, horizontalflow, verticalflow, organic, circle, orgchart), `link`, `left`/`top`, `placeholders`, plus line continuation with `\`.
- **Edit Diagram (XML)**: Extras > Edit Diagram shows and edits the page's full XML, so you can replace or add to the diagram.
- **Edit Style (raw)**: Ctrl+E.
- **Edit Data / custom properties**: Key/value metadata on shapes, edges, layers and pages. Placeholders (`placeholders=1`) render values in labels.
- **Placeholders**: `%key%` lookup that walks up through parent containers and up to the diagram.
- **Custom links & actions**: The `data:action/json` link format with show/hide/toggle, highlight, select, scroll, open-link and similar actions.
- **Plugins**: Extras > Plugins loads built-in plugins (anonymize, explore, replay, tags, voice, sql, text, props, etc.) and custom plugin URLs (on desktop or self-hosted, depending on configuration).
- **Configuration (Extras > Configuration)**: JSON configuration for default fonts, colour palettes, libraries, templates, styles, css, plugins and more.
- **URL parameters**: `lang`, `ui` (theme), `dark`, `libs`, `clibs`, `splash`, `offline`, `math`, `grid`, `p` (plugins), `stealth`, `lightbox`, `chrome`, `edit`, and many more.
- **Extended shape config**: Library/stencil XML and shape JSON settings.
- **Mermaid/PlantUML regeneration**: Double-click inserted text-generated diagrams to edit their source.
- **Mathematical typesetting**: See section 5.
- **Explore plugin / Anonymize / Replay / Voice**: Experimental plugins.
- **Scratchpad**: A drag-in personal library.
- **Autosave**: Configurable autosave per storage provider. Draft recovery on desktop.
- **Shape stencil XML** (`mxGraph stencil` format): For custom shapes and Visio-like stencil import.
- **Embed with JS viewer (viewer-static.min.js) & lightbox URL**: For integrations.
- **Offline mode**: The PWA plus `?offline=1`.
- **Integration with clipboard as XML**: Copied diagram XML can be pasted into other draw.io instances.

## 17. Layout Algorithms
Arrange > Layout includes Horizontal Flow, Vertical Flow, Horizontal Tree, Vertical Tree, Radial Tree, Organic (force-directed), Circle, Compact Tree, Org Chart (with options), and Parallel Edges, plus Apply Layout using a JSON definition **[menu labels partially verified]**. The docs say auto-layouts format flowcharts and tree diagrams. Mind-map and tree-specific behaviour includes auto-layout on child insertion and Tab/Enter to add child or sibling nodes (keyboard docs: "Shift+Enter adds a sibling before the shape").

## 18. UI & App Features
- **Editor themes / UI modes**: "Sketch" (a simple whiteboard with floating panels), "Simple" (floating), "Classic/Atlas" (standard layout), Minimal, and others (Extras > Appearance/Theme).
- **Dark mode**: Editor plus diagram adaptive colours (see section 6).
- **Language selection**: 40+ UI languages.
- **Format panel**: The right-hand panel with Diagram/Style/Text/Arrange tabs (Ctrl+Shift+P toggles it).
- **Shapes panel**: The left panel with library management and search.
- **Toolbar**: Undo/redo, zoom, delete, front/back, fill/line/shadow, connector and waypoint style, insert, table, and more.
- **Menus**: File, Edit, View, Arrange, Extras, Help.
- **Context menu**: Right-click actions for the current selection.
- **Outline panel**: See section 1.
- **Find/Replace**: Ctrl+F.
- **Keyboard navigation and accessibility**: Tab/Shift+Tab focus moving, arrow-key navigation, Escape, "/" to search, and Shift+F10 for the context menu. Documented accessibility features.
- **Shortcuts dialog**: Help > Keyboard Shortcuts (Ctrl+Shift+K) shows the full printable PDF.
- **Autosave & draft recovery**: Covered above.
- **Revision history**: Covered above.
- **Offline / PWA**: Installable progressive web app that works offline.
- **Recent files**: List of recently opened files.
- **Open in new window / Multiple windows**
- **Properties / file info**: File > Properties (compressed toggle, etc.).
- **Compressed XML option**: Toggle for whether the file's XML is compressed.
- **Pages & zoom controls in footer**
- **Touch / pen support**: Pinch zoom and pen input for freehand.
- **Tooltips**: Shown on shapes.
- **Search shapes, help search**
- **Spell checking**: Browser-native.
- **Units, grid, guides, page view toggles**
- **Fullscreen**
- **Notifications of updates (desktop)**

## 19. Keyboard & Mouse Shortcuts
The documentation has a large shortcut set: file (Ctrl+N/O/S/Shift+S/P), edit (copy/paste/duplicate/undo), selection, zoom/view, arrange (group, order, align via Ctrl+Shift+letters **[partial]**), text formatting (Ctrl+B/I/U, Ctrl+Shift+./, for font size **[unverified]**), connection (Alt+Shift+arrows), tree editing (Tab/Enter/Shift+Enter for mind-map nodes), and modifiers (Ctrl-drag clone, Alt-drag no snapping, Shift constrain, Alt+drag rubber band from a shape). Full reference: drawio.com/docs/reference/shortcuts and shortcuts.svg in the repo.

## 20. Diagram-Type-Specific Features
- **Flowcharts**: Flowchart library, auto-layout flow, quick connect.
- **UML**: Class shapes with list compartments (add attribute rows with Enter), sequence diagram lifelines with activations, plus the PlantUML insert.
- **ER diagrams**: Table shapes, SQL import, and Crow's-foot ends.
- **BPMN**: BPMN 2.0 symbols with configurable event and gateway types via shape properties.
- **Mind maps**: Mindmap templates, tree auto-layout, Tab/Enter to add child or sibling nodes.
- **Org charts**: CSV import with the orgchart layout, org chart templates, and the Org Chart layout.
- **Floorplans**: Floorplan library with walls and doors.
- **Network / cloud architecture**: Vendor libraries, rack diagrams, and AWS/Azure/GCP templates.
- **Gantt / timelines**: Templates and table-based shapes, not a dedicated engine **[no dedicated Gantt engine verified]**.
- **Kanban**: Templates using containers or tables.
- **Wireframes / mockups**: Mockup and device libraries.
- **Venn / infographics / charts**: Templates. There's no live data-driven charting **[verified absence uncertain]**.
- **Electrical circuits / P&ID**: Specialised libraries.
- **C4 / ArchiMate / SysML**: Notation libraries.
- **Swimlanes / cross-functional flowcharts**: Pools and lanes that resize as you add lanes.
- **Tables/Lists**: Table and list shapes with row add/remove.

## 21. Desktop App Specifics
- **Electron app (Windows, macOS, Linux; deb, rpm, AppImage, snap, MSI/EXE, portable)**: Fully offline desktop app.
- **Local file editing, autosave, backups (.bkp)**: Draft recovery files.
- **CLI export**: See section 13.
- **Auto-update**: Optional automatic updates.
- **No external network by default**: Some features are limited offline (PlantUML, cloud storage).
- **Open .vsdx, .drawio, .png, .svg** from the file system and via file association.
- **Plugins (allowed by flag)**, **config file**, and **spell check language**.

## 22. File Format Internals (relevant for parity)
- An `<mxfile>` root with `<diagram>` per page. Each diagram contains an `<mxGraphModel>` with `<root>` and `<mxCell>` (vertex/edge, parent, style string, `<mxGeometry>`). Diagram content can be deflate+base64 compressed. `<UserObject>`/`<object>` wraps cells that carry properties.
- Style strings (`key=value;`) define everything visual. Stencils use mxGraph stencil XML.

## 23. Security & Privacy
- Diagram data stays client-side and goes only to your chosen storage. No server storage. Content Security Policy is applied. Self-hosting is available with Docker.

## 24. Verification Notes
- I verified these directly from official docs fetched during this research: the features overview (realtime collaboration, AI generation, dark mode adaptive colours, rulers/grid/guides, auto-layout, layers and tags, metadata/placeholders, freehand, custom shapes and libraries, HTML and math labels, Mermaid/CSV/SQL generation, editor customisation), the layers doc, the CSV import doc, the export-formats doc, and keyboard navigation.
- Most other items come from documented, long-standing editor behaviour and jgraph/drawio source and release notes that I know well. Anything marked **[unverified]** needs checking in the live app.
- Shortcut letters, exact menu paths, and the full current list of shape libraries change between releases, so check them against app.diagrams.net and drawio.com/docs/reference/shortcuts.
