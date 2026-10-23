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
export type GradientDirection = 'south' | 'north' | 'east' | 'west' | 'radial';
/** Where a shape's label sits relative to the shape. */
export type LabelPosition = 'inside' | 'top' | 'bottom' | 'left' | 'right';

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
  fontFamily: FontKey;
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
  /** For `kind: 'icon' | 'image'`: icon pack path or data/http URL. */
  icon?: string;
  /** Image crop (image shapes). */
  crop?: ImageCrop;
  /** Freehand strokes: points normalized to the shape bounds (0..1). */
  points?: Vec[];
  table?: TableData;
  animation?: ShapeAnimation;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export interface Endpoint {
  /** Attached shape, if any. */
  elementId?: string;
  /** Which side of the attached shape. `auto` picks the side facing the other end. */
  side?: AnchorSide | 'auto';
  /** World position; authoritative for free endpoints, a cache for attached ones. */
  x: number;
  y: number;
}

export type Routing = 'orthogonal' | 'straight' | 'curved' | 'elbow-h' | 'elbow-v' | 'entity' | 'isometric';
export type ConnectorShape = 'line' | 'pipe' | 'arrow';
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
  | 'async';

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
}

export type DiagramElement = ShapeElement | ConnectorElement;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface Doc {
  elements: Record<string, DiagramElement>;
  /** Element ids in z-order, back to front. */
  order: string[];
  /** Layers bottom → top. Absent means a single implicit layer. */
  layers?: Layer[];
}

export type PaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | '16:9' | '16:10' | '4:3' | 'Custom';

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
}

export interface Page {
  id: string;
  name: string;
  doc: Doc;
  settings: PageSettings;
}

export const isShape = (el: DiagramElement | undefined): el is ShapeElement => el?.type === 'shape';
export const isConnector = (el: DiagramElement | undefined): el is ConnectorElement =>
  el?.type === 'connector';
