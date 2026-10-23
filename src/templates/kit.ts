/**
 * Small builder toolkit for programmatic templates.
 *
 * Templates never hand-place every coordinate: they either feed a spec to the
 * layered auto-layout (`spec`), run one of the layout algorithms over a graph
 * (`layout`), or compute positions from grids/stacks (`grid`, `stack`).
 */
import type {
  AnchorSide,
  ArrowHead,
  ConnectorElement,
  DiagramElement,
  Doc,
  ElementStyle,
  Page,
  PageSettings,
  Rect,
  Routing,
  ShapeElement,
  TableData,
  Vec,
} from '@/model/types';
import { isShape } from '@/model/types';
import { createConnector, createShape, DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import { LIBRARIES } from '@/shapes/libraries';
import { convertSpec, facingPoint } from '@/ai/generate/toElements';
import type { DiagramSpec } from '@/ai/generate/spec';
import { LAYOUTS } from '@/layout';
import { measureText } from '@/lib/text';
import { newPage } from '@/store/editor';

// ---------------------------------------------------------------------------
// Palette: soft fills paired with saturated strokes (matches the app swatches).
// ---------------------------------------------------------------------------

export interface Tone {
  fill: string;
  stroke: string;
  text: string;
  /** Solid accent (for headers, badges). */
  solid: string;
}

export const TONES = {
  indigo: { fill: '#e0e7ff', stroke: '#4f46e5', text: '#1e1b4b', solid: '#4f46e5' },
  blue: { fill: '#dbeafe', stroke: '#2563eb', text: '#172554', solid: '#2563eb' },
  sky: { fill: '#e0f2fe', stroke: '#0284c7', text: '#082f49', solid: '#0284c7' },
  teal: { fill: '#ccfbf1', stroke: '#0d9488', text: '#042f2e', solid: '#0d9488' },
  green: { fill: '#dcfce7', stroke: '#16a34a', text: '#052e16', solid: '#16a34a' },
  amber: { fill: '#fef3c7', stroke: '#d97706', text: '#451a03', solid: '#d97706' },
  orange: { fill: '#ffedd5', stroke: '#ea580c', text: '#431407', solid: '#ea580c' },
  rose: { fill: '#ffe4e6', stroke: '#e11d48', text: '#4c0519', solid: '#e11d48' },
  red: { fill: '#fee2e2', stroke: '#dc2626', text: '#450a0a', solid: '#dc2626' },
  violet: { fill: '#ede9fe', stroke: '#7c3aed', text: '#2e1065', solid: '#7c3aed' },
  pink: { fill: '#fce7f3', stroke: '#db2777', text: '#500724', solid: '#db2777' },
  slate: { fill: '#f1f5f9', stroke: '#64748b', text: '#0f172a', solid: '#475569' },
} satisfies Record<string, Tone>;

export type ToneName = keyof typeof TONES;

/** Style for a soft-filled shape in a tone. */
export const soft = (t: Tone, extra: Partial<ElementStyle> = {}): Partial<ElementStyle> => ({
  fill: t.fill,
  stroke: t.stroke,
  textColor: t.text,
  ...extra,
});

/** Style for a solid-filled shape in a tone (white text). */
export const solid = (t: Tone, extra: Partial<ElementStyle> = {}): Partial<ElementStyle> => ({
  fill: t.solid,
  stroke: t.solid,
  textColor: '#ffffff',
  bold: true,
  ...extra,
});

export const INK = '#0f172a';
export const MUTED = '#64748b';
export const LINE = '#94a3b8';

/** Library preset style for `kind` (first item, or the one with `label`). */
export function presetStyle(kind: string, label?: string): Partial<ElementStyle> {
  for (const lib of LIBRARIES) {
    for (const item of lib.items) {
      if (item.kind === kind && (!label || item.label === label)) return { ...(item.style ?? {}) };
    }
  }
  return {};
}

export const textWidth = (text: string, fontSize = 14, bold = false) =>
  Math.max(...text.split('\n').map((l) => measureText(l, { fontFamily: 'sans', fontSize, bold, italic: false })));

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface EdgeOptions {
  text?: string;
  routing?: Routing;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  dashed?: boolean;
  dotted?: boolean;
  stroke?: string;
  strokeWidth?: number;
  fromSide?: AnchorSide | 'auto';
  toSide?: AnchorSide | 'auto';
  labelT?: number;
  fontSize?: number;
  waypoints?: Vec[];
}

export interface ShapeOptions {
  icon?: string;
  table?: TableData;
  container?: ShapeElement | string;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  name?: string;
}

const center = (r: Rect): Vec => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const sidePoint = (r: Rect, side: AnchorSide): Vec =>
  side === 'top'
    ? { x: r.x + r.w / 2, y: r.y }
    : side === 'bottom'
      ? { x: r.x + r.w / 2, y: r.y + r.h }
      : side === 'left'
        ? { x: r.x, y: r.y + r.h / 2 }
        : { x: r.x + r.w, y: r.y + r.h / 2 };

export class Builder {
  readonly els: DiagramElement[] = [];

  /** Adds a shape. `style` is merged over the library preset of `kind` when `preset` is true. */
  shape(kind: string, rect: Rect, style: Partial<ElementStyle> = {}, text = '', opts: ShapeOptions = {}): ShapeElement {
    const s = createShape(
      kind,
      { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) },
      { opacity: 1, ...presetStyle(kind), ...style },
      text,
    );
    if (opts.icon) s.icon = opts.icon;
    if (opts.table) s.table = opts.table;
    if (opts.container) s.containerId = typeof opts.container === 'string' ? opts.container : opts.container.id;
    if (opts.rotation) s.rotation = opts.rotation;
    if (opts.flipH) s.flipH = true;
    if (opts.flipV) s.flipV = true;
    if (opts.name) s.name = opts.name;
    this.els.push(s);
    return s;
  }

  /** Free text label (no fill / stroke). */
  text(text: string, rect: Rect, style: Partial<ElementStyle> = {}, opts: ShapeOptions = {}): ShapeElement {
    return this.shape('text', rect, { fill: 'none', stroke: 'none', textColor: INK, fontSize: 14, ...style }, text, opts);
  }

  /** Big left-aligned heading with an optional muted subtitle beneath it. */
  title(text: string, x: number, y: number, w: number, subtitle?: string, size = 26): ShapeElement {
    const t = this.text(text, { x, y, w, h: Math.round(size * 1.5) }, { fontSize: size, bold: true, textAlign: 'left' });
    if (subtitle) this.text(subtitle, { x, y: y + Math.round(size * 1.5), w, h: 24 }, { fontSize: 14, textColor: MUTED, textAlign: 'left' });
    return t;
  }

  /** Connector between two shapes (sides default to auto). */
  edge(a: ShapeElement, b: ShapeElement, o: EdgeOptions = {}): ConnectorElement {
    const fs = o.fromSide ?? 'auto';
    const ts = o.toSide ?? 'auto';
    const sp = fs === 'auto' ? facingPoint(a, center(b)) : sidePoint(a, fs);
    const tp = ts === 'auto' ? facingPoint(b, center(a)) : sidePoint(b, ts);
    const c = createConnector(
      { elementId: a.id, side: fs, x: Math.round(sp.x), y: Math.round(sp.y) },
      { elementId: b.id, side: ts, x: Math.round(tp.x), y: Math.round(tp.y) },
      {
        routing: o.routing ?? 'orthogonal',
        startArrow: o.startArrow ?? 'none',
        endArrow: o.endArrow ?? 'triangle',
        text: o.text ?? '',
        style: this.lineStyle(o),
      },
    );
    if (o.labelT !== undefined) c.labelT = o.labelT;
    if (o.waypoints) c.waypoints = o.waypoints;
    this.els.push(c);
    return c;
  }

  /** Free-floating line/arrow between two points. */
  line(p1: Vec, p2: Vec, o: EdgeOptions = {}): ConnectorElement {
    const c = createConnector(
      { x: Math.round(p1.x), y: Math.round(p1.y) },
      { x: Math.round(p2.x), y: Math.round(p2.y) },
      {
        routing: o.routing ?? 'straight',
        startArrow: o.startArrow ?? 'none',
        endArrow: o.endArrow ?? 'none',
        text: o.text ?? '',
        style: this.lineStyle(o),
      },
    );
    if (o.labelT !== undefined) c.labelT = o.labelT;
    if (o.waypoints) c.waypoints = o.waypoints;
    this.els.push(c);
    return c;
  }

  /** Chain of connectors a → b → c … */
  chain(nodes: ShapeElement[], o: EdgeOptions = {}) {
    for (let i = 0; i + 1 < nodes.length; i++) this.edge(nodes[i], nodes[i + 1], o);
  }

  private lineStyle(o: EdgeOptions): ElementStyle {
    return {
      ...DEFAULT_CONNECTOR_STYLE,
      stroke: o.stroke ?? DEFAULT_CONNECTOR_STYLE.stroke,
      strokeWidth: o.strokeWidth ?? DEFAULT_CONNECTOR_STYLE.strokeWidth,
      strokeStyle: o.dashed ? 'dashed' : o.dotted ? 'dotted' : 'solid',
      fontSize: o.fontSize ?? 12,
    };
  }

  /**
   * Lays a spec out with the diagram auto-layout and adds the result.
   * Returns spec id → shape.
   */
  spec(spec: DiagramSpec, origin: Vec = { x: 0, y: 0 }): { nodes: Map<string, ShapeElement>; bounds: Rect } {
    const conv = convertSpec(spec, origin, { anchor: 'topLeft' });
    this.els.push(...conv.elements);
    const byId = new Map(conv.elements.map((e) => [e.id, e]));
    const nodes = new Map<string, ShapeElement>();
    for (const [sid, eid] of conv.idMap) {
      const el = byId.get(eid);
      if (el && isShape(el)) nodes.set(sid, el);
    }
    return { nodes, bounds: conv.bounds };
  }

  /**
   * Runs a layout algorithm (src/layout) over the given shapes (default: all)
   * and moves them so the result's top-left lands on `origin`.
   */
  layout(id: string, opts: { nodeSpacing?: number; levelSpacing?: number; origin?: Vec; ids?: string[] } = {}): Rect {
    const algo = LAYOUTS.find((l) => l.id === id);
    if (!algo) throw new Error(`Unknown layout ${id}`);
    const doc = this.doc();
    const patch = algo.run(doc, opts.ids ?? [], { nodeSpacing: opts.nodeSpacing ?? 40, levelSpacing: opts.levelSpacing ?? 70 });
    for (const el of this.els) {
      const p = patch[el.id];
      if (p && isShape(el)) Object.assign(el, p);
    }
    const scope = new Set(opts.ids ?? this.els.filter(isShape).map((e) => e.id));
    const shapes = this.els.filter((e): e is ShapeElement => isShape(e) && scope.has(e.id));
    const b = boundsOf(shapes);
    if (opts.origin) this.translate(opts.origin.x - b.x, opts.origin.y - b.y, shapes);
    return opts.origin ? { ...b, x: opts.origin.x, y: opts.origin.y } : b;
  }

  /** Moves shapes (default: everything) by dx/dy. */
  translate(dx: number, dy: number, shapes: ShapeElement[] = this.els.filter(isShape)) {
    for (const s of shapes) {
      s.x = Math.round(s.x + dx);
      s.y = Math.round(s.y + dy);
    }
  }

  /** Moves an element to the back of the z-order (e.g. a container added late). */
  toBack(el: DiagramElement) {
    const i = this.els.indexOf(el);
    if (i > 0) {
      this.els.splice(i, 1);
      this.els.unshift(el);
    }
  }

  bounds(): Rect {
    return boundsOf(this.els.filter(isShape));
  }

  doc(): Doc {
    return { elements: Object.fromEntries(this.els.map((e) => [e.id, e])), order: this.els.map((e) => e.id) };
  }

  page(name: string, settings: Partial<PageSettings> = {}): Page {
    const p = newPage(name, this.doc());
    p.settings = { ...p.settings, ...settings };
    return p;
  }
}

export function boundsOf(shapes: Rect[]): Rect {
  if (!shapes.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...shapes.map((s) => s.x));
  const y = Math.min(...shapes.map((s) => s.y));
  const r = Math.max(...shapes.map((s) => s.x + s.w));
  const b = Math.max(...shapes.map((s) => s.y + s.h));
  return { x, y, w: r - x, h: b - y };
}

/** Top-left positions of `n` cells laid out in `cols` columns. */
export function grid(n: number, cols: number, cell: { w: number; h: number }, gap: { x: number; y: number }, origin: Vec = { x: 0, y: 0 }): Rect[] {
  return Array.from({ length: n }, (_, i) => ({
    x: origin.x + (i % cols) * (cell.w + gap.x),
    y: origin.y + Math.floor(i / cols) * (cell.h + gap.y),
    w: cell.w,
    h: cell.h,
  }));
}

/** Single-page helper. */
export function onePage(name: string, fill: (b: Builder) => void, settings?: Partial<PageSettings>): Page[] {
  const b = new Builder();
  fill(b);
  return [b.page(name, settings)];
}

/** A page with a heading and an auto-laid-out spec beneath it. */
export function specPage(name: string, title: string, subtitle: string, spec: DiagramSpec, settings?: Partial<PageSettings>): Page[] {
  const b = new Builder();
  const { bounds } = b.spec(spec, { x: 0, y: 84 });
  b.title(title, bounds.x, 0, Math.max(360, bounds.w), subtitle);
  return [b.page(name, settings)];
}
