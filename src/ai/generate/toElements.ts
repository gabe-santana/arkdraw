/**
 * Diagram spec → positioned OpenDraw elements.
 */
import type { ArrowHead, ConnectorElement, DiagramElement, ElementStyle, Endpoint, Rect, ShapeElement, Vec } from '@/model/types';
import { createConnector, createShape, DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import { measureText } from '@/lib/text';
import { layoutDiagram, type LayoutEdge, type LayoutOptions } from './layout';
import { layoutRouted, type RoutedEdge, type RoutedLayout } from './elkLayout';
import { defaultDirection, GROUP_ICON_SIZE, resolveSpec, type ResolvedNode } from './resolve';
import type { DiagramSpec, DiagramType, SpecEdge } from './spec';

export interface SpecConversion {
  /** Back-to-front: containers (outer first), shapes, then connectors. */
  elements: DiagramElement[];
  /** Spec node id → element id. */
  idMap: Map<string, string>;
  /** World bounds of the generated diagram. */
  bounds: Rect;
}

export interface ConvertOptions {
  /** Whether `origin` is the diagram's center (default) or its top-left corner. */
  anchor?: 'center' | 'topLeft';
}

const center = (r: Rect): Vec => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Midpoint of the side of `r` that faces `toward` (the cached endpoint position). */
export function facingPoint(r: Rect, toward: Vec): Vec {
  const c = center(r);
  const dx = (toward.x - c.x) / Math.max(1, r.w);
  const dy = (toward.y - c.y) / Math.max(1, r.h);
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? r.x + r.w : r.x, y: c.y };
  return { x: c.x, y: dy >= 0 ? r.y + r.h : r.y };
}

function edgeDefaults(type: DiagramType): { startArrow: ArrowHead; endArrow: ArrowHead } {
  switch (type) {
    case 'erd':
      return { startArrow: 'erOnlyOne', endArrow: 'erZeroMany' };
    case 'class':
      return { startArrow: 'none', endArrow: 'arrow' };
    case 'network':
      return { startArrow: 'none', endArrow: 'none' };
    default:
      return { startArrow: 'none', endArrow: 'triangle' };
  }
}

function connectorStyle(e: SpecEdge): ElementStyle {
  return { ...DEFAULT_CONNECTOR_STYLE, strokeStyle: e.dashed ? 'dashed' : 'solid' };
}

function depthOf(n: ResolvedNode, byId: Map<string, ResolvedNode>): number {
  let d = 0;
  for (let p = n.parent; p && byId.has(p) && d < 100; p = byId.get(p)!.parent) d++;
  return d;
}

function makeShape(n: ResolvedNode, rect: Rect): ShapeElement {
  const shape = createShape(n.kind, { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) }, n.style, n.text);
  if (n.icon) shape.icon = n.icon;
  if (n.kind === 'group' && n.icon) shape.params = { ...shape.params, iconSize: GROUP_ICON_SIZE };
  return shape;
}

function sequenceToElements(spec: DiagramSpec, origin: Vec, anchor: 'center' | 'topLeft'): SpecConversion {
  const participants = resolveSpec({ ...spec, nodes: spec.nodes.map((n) => ({ ...n, parent: undefined })) }).filter((n) => !n.container);
  const HEADER = 40;
  const STEP = 46;
  const GAP = 48;
  const widths = participants.map((p) => Math.max(140, Math.min(260, measureText(p.text, p.style) + 36)));
  const xs: number[] = [];
  widths.reduce((x, w, i) => ((xs[i] = x), x + w + GAP), 0);
  const ids = new Set(participants.map((p) => p.id));
  const messages = spec.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const height = HEADER + 36 + Math.max(1, messages.length) * STEP + 24;
  const width = xs.length ? xs[xs.length - 1] + widths[widths.length - 1] : 0;
  const ox = anchor === 'center' ? origin.x - width / 2 : origin.x;
  const oy = anchor === 'center' ? origin.y - height / 2 : origin.y;

  const idMap = new Map<string, string>();
  const centers = new Map<string, number>();
  const elements: DiagramElement[] = [];
  participants.forEach((p, i) => {
    const shape = createShape(
      'uml.lifeline',
      { x: Math.round(ox + xs[i]), y: Math.round(oy), w: Math.round(widths[i]), h: height },
      { ...p.style, fill: p.style.fill === 'none' ? '#e0e7ff' : p.style.fill },
      p.text,
    );
    idMap.set(p.id, shape.id);
    centers.set(p.id, ox + xs[i] + widths[i] / 2);
    elements.push(shape);
  });
  messages.forEach((e, i) => {
    const y = Math.round(oy + HEADER + 36 + i * STEP);
    const x1 = centers.get(e.from)!;
    const x2 = centers.get(e.to)!;
    const self = e.from === e.to;
    const source: Endpoint = { x: Math.round(x1), y };
    const target: Endpoint = self ? { x: Math.round(x1 + 40), y: y + 18 } : { x: Math.round(x2), y };
    elements.push(
      createConnector(source, target, {
        routing: 'straight',
        startArrow: e.startArrow ?? 'none',
        endArrow: e.endArrow ?? (e.dashed ? 'arrow' : 'triangle'),
        text: e.label ?? '',
        style: connectorStyle(e),
      }),
    );
  });
  return { elements, idMap, bounds: { x: ox, y: oy, w: width, h: height } };
}

function layoutInput(spec: DiagramSpec): { nodes: ResolvedNode[]; edges: LayoutEdge[]; options: LayoutOptions } {
  const nodes = resolveSpec(spec);
  const iconHeavy = nodes.filter((n) => n.labelBelow > 0).length > nodes.length / 3;
  const roomy = spec.type === 'class' || spec.type === 'erd' || spec.type === 'c4';
  return {
    nodes,
    edges: spec.edges.map((e) => ({ from: e.from, to: e.to, label: e.label })),
    options: {
      direction: spec.direction ?? defaultDirection(spec.type),
      nodesep: iconHeavy ? 56 : roomy ? 64 : 48,
      ranksep: iconHeavy ? 84 : roomy ? 90 : 64,
    },
  };
}

/** Routed layouts computed ahead of time by `prepareLayout`, per spec object. */
const routedLayouts = new WeakMap<DiagramSpec, RoutedLayout | null>();

/**
 * Computes the routed layout of a spec (shapes placed and every edge routed
 * together, see elkLayout.ts). `convertSpec` uses it afterwards for the same
 * spec object; without it, or if it fails, it falls back to the simpler
 * synchronous layout whose edges are routed one by one when drawn.
 */
export async function prepareLayout(spec: DiagramSpec): Promise<void> {
  if (spec.type === 'sequence' || routedLayouts.has(spec)) return;
  const { nodes, edges, options } = layoutInput(spec);
  try {
    routedLayouts.set(spec, await layoutRouted(nodes, edges, options));
  } catch {
    routedLayouts.set(spec, null);
  }
}

/** Box fraction of a point on (or near) a shape's border. */
const fractionOn = (r: Rect, p: Vec): Vec => ({
  x: Math.min(1, Math.max(0, (p.x - r.x) / Math.max(1, r.w))),
  y: Math.min(1, Math.max(0, (p.y - r.y) / Math.max(1, r.h))),
});

/** How far along a polyline (0..1) the point closest to `at` is. */
function labelT(pts: Vec[], at: Vec): number {
  let total = 0;
  let best = { d: Infinity, along: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!len) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const k = Math.max(0, Math.min(len, (at.x - a.x) * ux + (at.y - a.y) * uy));
    const px = a.x + ux * k;
    const py = a.y + uy * k;
    const d = Math.hypot(at.x - px, at.y - py);
    if (d < best.d) best = { d, along: total + k };
    total += len;
  }
  return total ? best.along / total : 0.5;
}

/** A connector that follows a precomputed route exactly: fixed ends where the route meets the shapes, bends as waypoints. */
function routedConnector(s: ShapeElement, t: ShapeElement, route: RoutedEdge, ox: number, oy: number, rest: Partial<ConnectorElement>): ConnectorElement {
  const pts = route.points.map((p) => ({ x: Math.round(p.x + ox), y: Math.round(p.y + oy) }));
  const start = pts[0];
  const end = pts[pts.length - 1];
  // A straight route still gets a waypoint, so it is drawn exactly where it was routed.
  const waypoints = pts.length > 2 ? pts.slice(1, -1) : [{ x: Math.round((start.x + end.x) / 2), y: Math.round((start.y + end.y) / 2) }];
  // Labels sit on the line, at the spot the layout kept free for them.
  const along = route.label && rest.text ? labelT(pts, { x: route.label.x + ox, y: route.label.y + oy }) : undefined;
  return createConnector(
    { elementId: s.id, fixed: fractionOn(s, start), x: start.x, y: start.y },
    { elementId: t.id, fixed: fractionOn(t, end), x: end.x, y: end.y },
    { ...rest, waypoints, ...(along !== undefined && { labelT: Math.round(along * 1000) / 1000 }) },
  );
}

/** Lays out a spec and converts it to elements, with details. */
export function convertSpec(spec: DiagramSpec, origin: Vec, opts: ConvertOptions = {}): SpecConversion {
  const anchor = opts.anchor ?? 'center';
  if (spec.type === 'sequence') return sequenceToElements(spec, origin, anchor);

  const { nodes, edges, options } = layoutInput(spec);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const routed = routedLayouts.get(spec) ?? null;
  const layout = routed ?? layoutDiagram(nodes, edges, options);
  const ox = anchor === 'center' ? origin.x - layout.width / 2 : origin.x;
  const oy = anchor === 'center' ? origin.y - layout.height / 2 : origin.y;
  const abs = (r: Rect): Rect => ({ x: r.x + ox, y: r.y + oy, w: r.w, h: r.h });

  const idMap = new Map<string, string>();
  const shapes = new Map<string, ShapeElement>();
  for (const n of nodes) {
    const shape = makeShape(n, abs(layout.rects.get(n.id)!));
    idMap.set(n.id, shape.id);
    shapes.set(n.id, shape);
  }
  for (const n of nodes) {
    if (n.parent && idMap.has(n.parent)) shapes.get(n.id)!.containerId = idMap.get(n.parent);
  }

  const containers = nodes.filter((n) => n.container).sort((a, b) => depthOf(a, byId) - depthOf(b, byId));
  const leaves = nodes.filter((n) => !n.container);

  const defaults = edgeDefaults(spec.type);
  const connectors: ConnectorElement[] = spec.edges.map((e, i) => {
    const s = shapes.get(e.from)!;
    const t = shapes.get(e.to)!;
    const rest: Partial<ConnectorElement> = {
      routing: e.routing ?? 'orthogonal',
      startArrow: e.startArrow ?? defaults.startArrow,
      endArrow: e.endArrow ?? defaults.endArrow,
      text: e.label ?? '',
      style: connectorStyle(e),
    };
    const route = routed?.routes[i];
    if (route && rest.routing === 'orthogonal') return routedConnector(s, t, route, ox, oy, rest);
    const sp = facingPoint(s, center(t));
    const tp = facingPoint(t, center(s));
    return createConnector(
      { elementId: s.id, side: 'auto', x: Math.round(sp.x), y: Math.round(sp.y) },
      { elementId: t.id, side: 'auto', x: Math.round(tp.x), y: Math.round(tp.y) },
      rest,
    );
  });

  const elements: DiagramElement[] = [
    ...containers.map((n) => shapes.get(n.id)!),
    ...leaves.map((n) => shapes.get(n.id)!),
    ...connectors,
  ];
  return { elements, idMap, bounds: { x: ox, y: oy, w: layout.width, h: layout.height } };
}

/**
 * Pure conversion of a validated spec into OpenDraw elements, laid out and
 * centered on `origin` (world coordinates).
 */
export function specToElements(spec: DiagramSpec, origin: Vec): DiagramElement[] {
  return convertSpec(spec, origin).elements;
}
