/**
 * The OpenDraw document model.
 *
 * A file holds one or more pages. Each page is a flat map of elements plus an
 * `order` array that defines z-order (first = back), and a list of layers.
 * Keeping the structure flat (rather than a tree) makes immutable updates
 * cheap: moving one shape only replaces that shape's object, so React
 * re-renders just that shape and the connectors attached to it.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type FontKey = 'sans' | 'serif' | 'mono' | 'hand';
/** A built-in font key, or any font name (Google Font or installed system font); see src/text/fonts.ts. */
export type FontFamily = FontKey | (string & {});
/** Writing direction of a label (draw.io textDirection). */
export type TextDirection = 'ltr' | 'rtl' | 'auto';
export type GradientDirection = 'south' | 'north' | 'east' | 'west' | 'radial';
/** Where a shape's label sits relative to the shape. */
export type LabelPosition = 'inside' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ElementStyle {
  /** Fill color, or `'none'` for transparent. */
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  /** 0..1 — whole element. */
  opacity: number;
  /** Corner radius for shapes that support rounding. */
  radius: number;
  shadow: boolean;
  fontFamily: FontFamily;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  textColor: string;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;

  // --- Optional extras (absent = default) -------------------------------
  /** Second gradient color; enables a gradient fill from `fill` to this. */
  gradient?: string;
  gradientDirection?: GradientDirection;
  /** 0..1, separate from the element opacity. */
  fillOpacity?: number;
  strokeOpacity?: number;
  textOpacity?: number;
  underline?: boolean;
  strike?: boolean;
  /** Custom dash pattern (e.g. "8 4 2 4"), overrides strokeStyle. */
  dashPattern?: string;
  /** Hand-drawn (rough) rendering. */
  sketch?: boolean;
  /** Fill pattern in sketch mode. */
  sketchFill?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line';
  /** Sketch wobble (Rough.js roughness, default 1.15; draw.io `jiggle`). */
  sketchRoughness?: number;
  /** Drop-shadow options (absent = the built-in soft shadow); see src/styling/shadow.tsx. */
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  /** 0..1 */
  shadowOpacity?: number;
  /** User-defined dark-mode colors, used instead of auto-adapting when "Adapt diagram colors" is on. */
  darkFill?: string;
  darkStroke?: string;
  darkText?: string;
  /** Glossy highlight overlay. */
  glass?: boolean;
  labelPosition?: LabelPosition;
  /** Extra padding around the label (px). */
  spacing?: number;
  /** Text wraps to the shape width (default true). */
  wrap?: boolean;
  /** Vertical (top-to-bottom) label. */
  verticalText?: boolean;
  /** Label background (e.g. highlight), or none. */
  labelBackground?: string;
  /** Border drawn around the label box (draw.io labelBorderColor). */
  labelBorderColor?: string;
  /** Extra per-side label padding (px), added to `spacing` (draw.io spacingTop/Right/Bottom/Left). */
  spacingTop?: number;
  spacingRight?: number;
  spacingBottom?: number;
  spacingLeft?: number;
  /** Writing direction (absent = left-to-right). */
  textDirection?: TextDirection;
  /** Render %property% placeholders in the label. */
  placeholders?: boolean;
  /** Formatted text: Markdown subset (bold, italic, lists, headings, links, code). */
  richText?: boolean;
  /** Typeset LaTeX between $$…$$ / \(…\) with MathJax. */
  math?: boolean;
}

/** Per-element behavior locks (draw.io's movable=0, resizable=0, …). */
export interface Behavior {
  movable?: boolean;
  resizable?: boolean;
  rotatable?: boolean;
  deletable?: boolean;
  editable?: boolean;
  connectable?: boolean;
  /** `false`: clicks and rubber bands pass through (select via the Layers panel). */
  selectable?: boolean;
}

interface ElementBase {
  id: string;
  /** Nested group membership, innermost first. Selecting picks the outermost. */
  groupIds: string[];
  locked?: boolean;
  /** Optional user-facing name shown in the layers panel. */
  name?: string;
  style: ElementStyle;
  text: string;
  /** Build-sequence step at which the element appears (see docs/specs/animation.md). */
  reveal?: number;
  /** Layer the element lives on (absent = the page's first layer). */
  layerId?: string;
  /** Custom key/value metadata (Edit Data). */
  data?: Record<string, string>;
  tags?: string[];
  tooltip?: string;
  /** URL, or `page:<pageId>` to jump to another page. */
  link?: string;
  behavior?: Behavior;
  /** Review comments (threads). */
  comments?: Comment[];
  /** Hidden on its own (draw.io `visible="0"`), e.g. by a custom link action. */
  hidden?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  resolved?: boolean;
  replies?: Comment[];
}

export interface ShapeAnimation {
  kind: 'none' | 'pulse' | 'glow' | 'bounce';
  /** 1 = default speed. */
  speed: number;
}

export interface ConnectorAnimation {
  kind: 'none' | 'flow' | 'dots' | 'pulse';
  speed: number;
  /** Travel from target to source. */
  reverse?: boolean;
}

export interface TableData {
  /** Column widths and row heights in px. */
  cols: number[];
  rows: number[];
  /** cells[row][col] text. */
  cells: string[][];
  /** Style the first row as a header. */
  header?: boolean;
  /** Per-cell styling, keyed `"row,col"` (see src/interaction/table.ts). */
  cellStyles?: Record<string, TableCellStyle>;
  /** Merged ranges; the top-left cell holds the text. */
  merges?: TableMerge[];
}

export interface TableCellStyle {
  fill?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  textAlign?: TextAlign;
}

export interface TableMerge {
  r: number;
  c: number;
  /** Row / column span (≥ 1). */
  rs: number;
  cs: number;
}

export interface ImageCrop {
  /** Fractions 0..1 of the source image. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapeElement extends ElementBase {
  type: 'shape';
  /** Key into the shape registry (e.g. `rectangle`, `uml.class`). */
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the center. */
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** Container this shape lives in; it moves along with the container. */
  containerId?: string;
  /** Collapsed containers hide their children. */
  collapsed?: boolean;
  /** Container override: `true` makes any shape a container, `false` opts a container kind out. */
  container?: boolean;
  /** Constrain proportions when resizing (draw.io `aspect=fixed`). */
  lockAspect?: boolean;
  /** For `kind: 'icon' | 'image'`: icon pack path or data/http URL. */
  icon?: string;
  /** Image crop (image shapes). */
  crop?: ImageCrop;
  /** Freehand strokes: points normalized to the shape bounds (0..1). */
  points?: Vec[];
  table?: TableData;
  animation?: ShapeAnimation;
  /** Parametric geometry values (corner size, arrow width, header size…); see `ShapeDef.params`. */
  params?: Record<string, number | string>;
  /** Custom connection points (fractions of the unrotated box); replaces the shape's defaults. */
  connectionPoints?: Vec[];
  /** For `kind: 'stencil'`: mxGraph stencil XML (see src/stencils). */
  stencil?: string;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export interface Endpoint {
  /** Attached shape, if any. */
  elementId?: string;
  /** Which side of the attached shape. `auto` picks the side facing the other end. */
  side?: AnchorSide | 'auto';
  /** Fixed connection point as a fraction of the shape's unrotated box (draw.io exitX/exitY, entryX/entryY). Wins over `side`. */
  fixed?: Vec;
  /** Extra offset in px from the fixed point (draw.io exitDx/exitDy, entryDx/entryDy). */
  fixedOffset?: Vec;
  /** When `elementId` is another connector: the fraction (0..1) along its path. */
  edgeT?: number;
  /** World position; authoritative for free endpoints, a cache for attached ones. */
  x: number;
  y: number;
}

export type Routing = 'orthogonal' | 'straight' | 'curved' | 'elbow-h' | 'elbow-v' | 'entity' | 'isometric';
/** line, pipe (wire with a fill), arrow (simple block arrow), link (double line), flexArrow (sizable arrow band), wire (pipe with a dashed core), filledEdge (thick filled band). */
export type ConnectorShape = 'line' | 'pipe' | 'arrow' | 'link' | 'flexArrow' | 'wire' | 'filledEdge';

/** An additional connector label (draw.io child edge label). */
export interface ConnectorLabel {
  id: string;
  text: string;
  /** Position along the path, 0..1. */
  t: number;
  /** Perpendicular offset in px. */
  offset?: number;
}
export type LineJumps = 'none' | 'arc' | 'gap' | 'sharp';

export type ArrowHead =
  | 'none'
  | 'arrow'
  | 'triangle'
  | 'triangleOpen'
  | 'diamond'
  | 'diamondOpen'
  | 'circle'
  | 'circleOpen'
  | 'erOne'
  | 'erOnlyOne'
  | 'erMany'
  | 'erOneMany'
  | 'erZeroMany'
  | 'erZeroOne'
  | 'dash'
  | 'cross'
  | 'halfArrow'
  | 'box'
  | 'boxOpen'
  | 'async'
  | 'classic'
  | 'classicThin'
  | 'blockThin'
  | 'openThin'
  | 'diamondThin'
  | 'halfCircle'
  | 'circlePlus'
  | 'doubleBlock';

export interface ConnectorElement extends ElementBase {
  type: 'connector';
  source: Endpoint;
  target: Endpoint;
  routing: Routing;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  /** Manual bend points the route passes through. */
  waypoints?: Vec[];
  /** Label position along the path (0..1, default 0.5) and perpendicular offset. */
  labelT?: number;
  labelOffset?: number;
  connectorShape?: ConnectorShape;
  lineJumps?: LineJumps;
  animation?: ConnectorAnimation;
  /** Line-jump size in px (draw.io jumpSize, default 6). */
  jumpSize?: number;
  /** Arrowhead sizes (draw.io startSize/endSize, default 6). */
  startSize?: number;
  endSize?: number;
  /** Filled/hollow override for the arrowheads (draw.io startFill/endFill); absent = the head's default. */
  startFill?: boolean;
  endFill?: boolean;
  /** Body width of wide connector shapes (link, flexArrow, filledEdge — draw.io `width`). */
  bandWidth?: number;
  /** Head width of flex arrows (draw.io startWidth/endWidth). */
  headWidth?: number;
  /** Gap kept between the attached shapes and the connector ends (draw.io perimeterSpacing). */
  perimeterSpacing?: number;
  /** Labels beyond the main one (draw.io child edge labels). */
  labels?: ConnectorLabel[];
}

export type DiagramElement = ShapeElement | ConnectorElement;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** Custom key/value metadata (Edit Data on layers). */
  data?: Record<string, string>;
}

export interface Doc {
  elements: Record<string, DiagramElement>;
  /** Element ids in z-order, back to front. */
  order: string[];
  /** Layers bottom → top. Absent means a single implicit layer. */
  layers?: Layer[];
}

export type PaperSize =
  | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'B4' | 'B5'
  | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'Executive'
  | '16:9' | '16:10' | '4:3' | 'Custom';

export interface PageSettings {
  /** Canvas/page background color, or null for the theme canvas. */
  background: string | null;
  backgroundImage?: string;
  paper: PaperSize;
  landscape: boolean;
  /** Custom paper size in px (when paper = Custom). */
  paperW?: number;
  paperH?: number;
  /** Show page-sized tiles behind the diagram. */
  pageView: boolean;
  /** Drop shadow on every shape. */
  shadow?: boolean;
  /** Diagram language: labels show their `label_<lang>` translation from element data when present. */
  language?: string;
  /** Per-page grid & snap (absent = the global setting); see src/styling/pageGrid.ts. */
  grid?: boolean;
  gridSize?: number;
  snap?: boolean;
  gridColor?: string;
}

export interface Page {
  id: string;
  name: string;
  doc: Doc;
  settings: PageSettings;
  /** Custom key/value metadata (Edit Data on pages). */
  data?: Record<string, string>;
}

/** File-level properties (File → Properties), stored in the `.opendraw` file. */
export interface DocumentMeta {
  title?: string;
  author?: string;
  description?: string;
  /** ISO timestamps. */
  created?: string;
  modified?: string;
  /** Document-level key/value data (placeholders fall back to it). */
  data?: Record<string, string>;
}

export const isShape = (el: DiagramElement | undefined): el is ShapeElement => el?.type === 'shape';
export const isConnector = (el: DiagramElement | undefined): el is ConnectorElement =>
  el?.type === 'connector';
