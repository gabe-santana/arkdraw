/**
 * Micro-assistant: straight connectors. While a shape is moved or resized, a
 * connector that is a few pixels away from running straight pulls the shape
 * the rest of the way, and a guide line along the connector shows it. Moving
 * further past the pull releases it; Alt turns it off (like every snap).
 */
import type { ConnectorElement, DiagramElement, Doc, Rect, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { endpointPositions } from '@/lib/connectorGeometry';
import type { Guide } from '@/store/editor';

/** Screen px within which a connector is pulled straight. */
export const STRAIGHTEN_SNAP = 8;

interface Link {
  conn: ConnectorElement;
  /** The end on a shape that is being moved or resized. */
  moving: 'a' | 'b';
}

/** Connectors with exactly one end on `moving` shapes (the other end stays put). */
function linksOf(doc: Doc, moving: Set<string>): Link[] {
  const links: Link[] = [];
  const onShape = (id?: string) => !id || isShape(doc.elements[id]);
  for (const el of Object.values(doc.elements)) {
    if (!isConnector(el) || moving.has(el.id) || el.routing === 'curved' || el.waypoints?.length) continue;
    if (!onShape(el.source.elementId) || !onShape(el.target.elementId)) continue;
    const s = !!el.source.elementId && moving.has(el.source.elementId);
    const t = !!el.target.elementId && moving.has(el.target.elementId);
    if (s !== t) links.push({ conn: el, moving: s ? 'a' : 'b' });
  }
  return links;
}

type Lookup = (id: string) => DiagramElement | undefined;

interface Ends {
  m: { point: Vec; dir: Vec };
  o: { point: Vec; dir: Vec };
}

function ends(link: Link, lookup: Lookup): Ends {
  const { a, b } = endpointPositions(link.conn, lookup);
  return link.moving === 'a' ? { m: a, o: b } : { m: b, o: a };
}

/** The ends leave sideways (or float), so a level line between them is a straight connector. */
const leavesSideways = (e: Ends) => e.m.dir.y === 0 && e.o.dir.y === 0;
const leavesUpDown = (e: Ends) => e.m.dir.x === 0 && e.o.dir.x === 0;

interface Pull {
  /** Offset that makes the connector straight (moving end → other end). */
  d: number;
  guide: Guide;
  link: Link;
}

const better = (a: Pull | null, b: Pull) => (!a || Math.abs(b.d) < Math.abs(a.d) ? b : a);

/** The smallest pull on each axis that makes one of `links` straight. */
function pulls(links: Link[], lookup: Lookup, threshold: number): { x: Pull | null; y: Pull | null } {
  let x: Pull | null = null;
  let y: Pull | null = null;
  for (const link of links) {
    const e = ends(link, lookup);
    const dx = e.o.point.x - e.m.point.x;
    const dy = e.o.point.y - e.m.point.y;
    if (dy && Math.abs(dy) < threshold && Math.abs(dx) > 2 * threshold && leavesSideways(e)) {
      y = better(y, { d: dy, link, guide: { axis: 'y', at: e.o.point.y, from: Math.min(e.m.point.x, e.o.point.x), to: Math.max(e.m.point.x, e.o.point.x) } });
    }
    if (dx && Math.abs(dx) < threshold && Math.abs(dy) > 2 * threshold && leavesUpDown(e)) {
      x = better(x, { d: dx, link, guide: { axis: 'x', at: e.o.point.x, from: Math.min(e.m.point.y, e.o.point.y), to: Math.max(e.m.point.y, e.o.point.y) } });
    }
  }
  return { x, y };
}

/**
 * While moving `start` (the dragged elements, as they were) by `dx`/`dy`: the
 * extra offset that straightens a nearly straight connector, per axis, with
 * its guide. Zero when nothing is close enough.
 */
export function straightenMove(doc: Doc, start: Map<string, DiagramElement>, dx: number, dy: number, z: number): { dx: number; dy: number; guides: Guide[] } {
  const links = linksOf(doc, new Set(start.keys()));
  if (!links.length) return { dx: 0, dy: 0, guides: [] };
  const lookup: Lookup = (id) => {
    const el = start.get(id);
    return el && isShape(el) ? { ...el, x: el.x + dx, y: el.y + dy } : doc.elements[id];
  };
  const p = pulls(links, lookup, STRAIGHTEN_SNAP / z);
  return { dx: p.x?.d ?? 0, dy: p.y?.d ?? 0, guides: [p.x?.guide, p.y?.guide].filter((g): g is Guide => !!g) };
}

/**
 * While resizing one unrotated shape by `handle` to `rect`: moves the dragged
 * edge so a nearly straight connector on the shape becomes straight.
 */
export function straightenResize(doc: Doc, shape: ShapeElement, rect: Rect, handle: string, z: number): { rect: Rect; guides: Guide[] } {
  const links = linksOf(doc, new Set([shape.id]));
  if (!links.length || shape.rotation) return { rect, guides: [] };
  const lookupFor = (r: Rect): Lookup => (id) => (id === shape.id ? { ...shape, ...r } : doc.elements[id]);
  const threshold = STRAIGHTEN_SNAP / z;
  const out = { ...rect };
  const guides: Guide[] = [];
  // How far a connector's moving end travels when the edge moves by one unit.
  const rate = (link: Link, axis: 'x' | 'y', moved: Rect) => ends(link, lookupFor(moved)).m.point[axis] - ends(link, lookupFor(rect)).m.point[axis];
  for (const axis of ['x', 'y'] as const) {
    const [lo, hi] = axis === 'y' ? ['n', 's'] : ['w', 'e'];
    const edge = handle.includes(hi) ? 'hi' : handle.includes(lo) ? 'lo' : null;
    if (!edge) continue;
    const pull = pulls(links, lookupFor(rect), threshold)[axis];
    if (!pull) continue;
    const size = axis === 'y' ? 'h' : 'w';
    const moved = edge === 'hi' ? { ...rect, [size]: rect[size] + 1 } : { ...rect, [axis]: rect[axis] + 1, [size]: rect[size] - 1 };
    // How fast that connector's end follows the edge (½ for a side midpoint, ¼ for a point a quarter down…).
    const k = rate(pull.link, axis, moved);
    if (Math.abs(k) < 0.05) continue;
    const shift = pull.d / k;
    if (edge === 'hi') out[size] = rect[size] + shift;
    else {
      out[axis] = rect[axis] + shift;
      out[size] = rect[size] - shift;
    }
    if (out[size] < 4) return { rect, guides: [] };
    guides.push(pull.guide);
  }
  return { rect: out, guides };
}
