/**
 * draw.io edge-style mapping for connectors: arrowheads (+ size and fill),
 * edge shapes (link, flexArrow, wire…), line jumps, fixed connection points
 * (exitX/exitY/exitDx/exitDy, entry*), perimeter spacing, extra edge labels
 * and edge-to-edge connections. Used by src/io/drawio.ts.
 */
import type { AnchorSide, ArrowHead, ConnectorElement, ConnectorLabel, DiagramElement, Endpoint, Vec } from '@/model/types';
import { isConnector } from '@/model/types';
import { arrowFillable, arrowFilled, connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { projectOnPolyline, sideOfFraction } from '@/lib/connectionPoints';
import { uid } from '@/lib/id';

type StyleMap = Map<string, string>;

/** OpenDraw head → draw.io marker name. Fill comes from `arrowFilled`. */
export const ARROW_TO_DRAWIO: Record<ArrowHead, string> = {
  none: 'none',
  arrow: 'open',
  openThin: 'openThin',
  triangle: 'block',
  triangleOpen: 'block',
  blockThin: 'blockThin',
  classic: 'classic',
  classicThin: 'classicThin',
  doubleBlock: 'doubleBlock',
  diamond: 'diamond',
  diamondOpen: 'diamond',
  diamondThin: 'diamondThin',
  circle: 'oval',
  circleOpen: 'oval',
  circlePlus: 'circlePlus',
  halfCircle: 'halfCircle',
  erOne: 'ERone',
  erOnlyOne: 'ERmandOne',
  erMany: 'ERmany',
  erOneMany: 'ERoneToMany',
  erZeroMany: 'ERzeroToMany',
  erZeroOne: 'ERzeroToOne',
  dash: 'dash',
  cross: 'cross',
  halfArrow: 'openAsync',
  async: 'async',
  box: 'box',
  boxOpen: 'box',
};

const DRAWIO_TO_ARROW: Record<string, ArrowHead> = {
  none: 'none',
  open: 'arrow',
  openThin: 'openThin',
  classic: 'classic',
  classicThin: 'classicThin',
  block: 'triangle',
  blockThin: 'blockThin',
  doubleBlock: 'doubleBlock',
  diamond: 'diamond',
  diamondThin: 'diamondThin',
  oval: 'circle',
  circle: 'circle',
  circlePlus: 'circlePlus',
  halfCircle: 'halfCircle',
  ERone: 'erOne',
  ERmandOne: 'erOnlyOne',
  ERmany: 'erMany',
  ERoneToMany: 'erOneMany',
  ERzeroToMany: 'erZeroMany',
  ERzeroToOne: 'erZeroOne',
  dash: 'dash',
  cross: 'cross',
  openAsync: 'halfArrow',
  async: 'async',
  box: 'box',
};

/** Hollow twin of a head that has a dedicated open variant. */
const HOLLOW_TWIN: Partial<Record<ArrowHead, ArrowHead>> = { triangle: 'triangleOpen', diamond: 'diamondOpen', circle: 'circleOpen', box: 'boxOpen' };

/** draw.io marker + fill flag → head kind and (when needed) a fill override. */
export function arrowFromDrawio(name: string | undefined, fillFlag: string | undefined, fallback: ArrowHead): { kind: ArrowHead; fill?: boolean } {
  const kind = name === undefined ? fallback : (DRAWIO_TO_ARROW[name] ?? fallback);
  if (fillFlag === undefined || !arrowFillable(kind)) return { kind };
  const filled = fillFlag !== '0';
  if (!filled && HOLLOW_TWIN[kind]) return { kind: HOLLOW_TWIN[kind]! };
  return filled === arrowFilled(kind) ? { kind } : { kind, fill: filled };
}

const num = (v: string | undefined): number | undefined => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
const fmt = (n: number) => String(Math.round(n * 10000) / 10000);

const SHAPE_TO_DRAWIO: Partial<Record<NonNullable<ConnectorElement['connectorShape']>, string>> = {
  pipe: 'pipe',
  wire: 'wire',
  arrow: 'arrow',
  link: 'link',
  flexArrow: 'flexArrow',
  filledEdge: 'filledEdge',
};

const SIDE_XY: Record<AnchorSide, Vec> = { top: { x: 0.5, y: 0 }, right: { x: 1, y: 0.5 }, bottom: { x: 0.5, y: 1 }, left: { x: 0, y: 0.5 } };

/** Writes the connector-specific style keys onto an edge style map. */
export function connectorStyleToDrawio(el: ConnectorElement, m: StyleMap) {
  for (const [end, kind, fill, size] of [
    ['end', el.endArrow, el.endFill, el.endSize],
    ['start', el.startArrow, el.startFill, el.startSize],
  ] as const) {
    m.set(`${end}Arrow`, ARROW_TO_DRAWIO[kind]);
    m.set(`${end}Fill`, arrowFilled(kind, fill) ? '1' : '0');
    if (size !== undefined) m.set(`${end}Size`, fmt(size));
  }
  for (const [end, prefix] of [['source', 'exit'], ['target', 'entry']] as const) {
    const ep = el[end];
    if (!ep.elementId) continue;
    const f = ep.fixed ?? (ep.side && ep.side !== 'auto' ? SIDE_XY[ep.side] : null);
    if (!f) continue;
    m.set(`${prefix}X`, fmt(f.x));
    m.set(`${prefix}Y`, fmt(f.y));
    m.set(`${prefix}Dx`, fmt(ep.fixedOffset?.x ?? 0));
    m.set(`${prefix}Dy`, fmt(ep.fixedOffset?.y ?? 0));
  }
  if (el.perimeterSpacing) m.set('perimeterSpacing', fmt(el.perimeterSpacing));
  if (el.lineJumps && el.lineJumps !== 'none') m.set('jumpStyle', el.lineJumps);
  if (el.jumpSize !== undefined) m.set('jumpSize', fmt(el.jumpSize));
  const shape = el.connectorShape ? SHAPE_TO_DRAWIO[el.connectorShape] : undefined;
  if (shape) m.set('shape', shape);
  if (el.bandWidth !== undefined) m.set('width', fmt(el.bandWidth));
  if (el.headWidth !== undefined) {
    m.set('endWidth', fmt(el.headWidth));
    m.set('startWidth', fmt(el.headWidth));
  }
}

/** Reads the connector-specific style keys (heads, shape, jumps, spacing) onto `conn`. */
export function connectorStyleFromDrawio(m: StyleMap, conn: ConnectorElement) {
  const end = arrowFromDrawio(m.get('endArrow'), m.get('endFill'), 'classic');
  const start = arrowFromDrawio(m.get('startArrow'), m.get('startFill'), 'none');
  conn.endArrow = end.kind;
  conn.startArrow = start.kind;
  if (end.fill !== undefined) conn.endFill = end.fill;
  if (start.fill !== undefined) conn.startFill = start.fill;
  const endSize = num(m.get('endSize'));
  const startSize = num(m.get('startSize'));
  if (endSize !== undefined) conn.endSize = endSize;
  if (startSize !== undefined) conn.startSize = startSize;
  const jump = m.get('jumpStyle');
  if (jump === 'arc' || jump === 'gap' || jump === 'sharp') conn.lineJumps = jump;
  const jumpSize = num(m.get('jumpSize'));
  if (jumpSize !== undefined) conn.jumpSize = jumpSize;
  const spacing = num(m.get('perimeterSpacing'));
  if (spacing) conn.perimeterSpacing = spacing;
  const shape = m.get('shape');
  const byName: Record<string, ConnectorElement['connectorShape']> = {
    pipe: 'pipe', wire: 'wire', arrow: 'arrow', link: 'link', flexArrow: 'flexArrow', filledEdge: 'filledEdge',
  };
  if (shape && byName[shape]) conn.connectorShape = byName[shape];
  const width = num(m.get('width'));
  if (width !== undefined && conn.connectorShape) conn.bandWidth = width;
  const headWidth = num(m.get('endWidth')) ?? num(m.get('startWidth'));
  if (headWidth !== undefined && conn.connectorShape === 'flexArrow') conn.headWidth = headWidth;
}

/** Endpoint attached to a shape, from exitX/exitY (+Dx/Dy) or entry*. */
export function shapeEndpointFromDrawio(m: StyleMap, prefix: 'exit' | 'entry', id: string, p: Vec): Endpoint {
  const x = num(m.get(`${prefix}X`));
  const y = num(m.get(`${prefix}Y`));
  if (x === undefined || y === undefined) return { elementId: id, side: 'auto', x: p.x, y: p.y };
  const dx = num(m.get(`${prefix}Dx`)) ?? 0;
  const dy = num(m.get(`${prefix}Dy`)) ?? 0;
  const side = sideOfFraction({ x, y });
  if (side && !dx && !dy) return { elementId: id, side, x: p.x, y: p.y };
  return { elementId: id, side: 'auto', fixed: { x, y }, ...(dx || dy ? { fixedOffset: { x: dx, y: dy } } : {}), x: p.x, y: p.y };
}

/**
 * Edge-to-edge ends: once every connector exists, place each end attached to
 * another connector at the fraction nearest its stored point (or the middle).
 */
export function resolveEdgeEnds(elements: Record<string, DiagramElement>, pending: Array<{ connId: string; end: 'source' | 'target'; point: Vec | null }>) {
  for (const { connId, end, point } of pending) {
    const conn = elements[connId];
    if (!isConnector(conn)) continue;
    const other = conn[end].elementId ? elements[conn[end].elementId!] : undefined;
    if (!isConnector(other)) {
      elements[connId] = { ...conn, [end]: { x: conn[end].x, y: conn[end].y } };
      continue;
    }
    let t = 0.5;
    if (point) t = projectOnPolyline(connectorGeometryInDoc(other, elements).samples, point).t;
    elements[connId] = { ...conn, [end]: { ...conn[end], edgeT: Math.round(t * 1e4) / 1e4 } };
  }
}

/** Shape connection points as draw.io's `points=[[x,y],…]` style value. */
export const connectionPointsToDrawio = (pts: Vec[]) => `[${pts.map((p) => `[${fmt(p.x)},${fmt(p.y)}]`).join(',')}]`;

/** Parses draw.io's `points` style (`[[x,y,perimeter,dx,dy],…]`); undefined when absent or malformed. */
export function connectionPointsFromDrawio(v: string | undefined): Vec[] | undefined {
  if (v === undefined) return undefined;
  try {
    const arr: unknown = JSON.parse(v);
    if (!Array.isArray(arr)) return undefined;
    const out = arr
      .filter((p): p is number[] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => ({ x: Math.min(1, Math.max(0, p[0])), y: Math.min(1, Math.max(0, p[1])) }));
    return out;
  } catch {
    return undefined;
  }
}

/** Child label cells for the extra labels (draw.io: x = -1..1 along the edge, y = perpendicular offset). */
export function extraLabelCells(el: ConnectorElement, esc: (s: string) => string, html: (s: string) => string): string[] {
  return (el.labels ?? []).map(
    (l, i) =>
      `<mxCell id="${el.id}-label-${i}" value="${esc(html(l.text))}" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];" vertex="1" connectable="0" parent="${el.id}">` +
      `<mxGeometry x="${fmt(l.t * 2 - 1)}" y="${fmt(l.offset ?? 0)}" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>`,
  );
}

/** Edge label child → position along the edge and offset. */
export function edgeLabelPlacement(geo: Element | null | undefined): { t: number; offset?: number } {
  const x = num(geo?.getAttribute('x') ?? undefined) ?? 0;
  const y = num(geo?.getAttribute('y') ?? undefined) ?? 0;
  const t = Math.min(1, Math.max(0, (x + 1) / 2));
  return { t: Math.round(t * 1e4) / 1e4, ...(y ? { offset: y } : {}) };
}

/** Attaches imported edge-label cells: the first fills an empty main label, the rest become extra labels. */
export function applyEdgeLabel(conn: ConnectorElement, text: string, geo: Element | null | undefined): ConnectorElement {
  if (!text) return conn;
  const { t, offset } = edgeLabelPlacement(geo);
  if (!conn.text) return { ...conn, text, ...(t !== 0.5 ? { labelT: t } : {}), ...(offset ? { labelOffset: offset } : {}) };
  const label: ConnectorLabel = { id: uid(), text, t, ...(offset ? { offset } : {}) };
  return { ...conn, labels: [...(conn.labels ?? []), label] };
}
