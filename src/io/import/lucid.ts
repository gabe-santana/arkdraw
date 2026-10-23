/**
 * Lucid (Lucidchart / Lucidspark) import via Lucid's public "Standard Import"
 * format (https://lucid.readme.io/docs/overview-si): a `.lucid` zip holding
 * `document.json`, or that JSON pasted directly.
 *
 *   { "version": 1, "pages": [ { "id", "title", "shapes": [...], "lines": [...],
 *     "groups": [{ "id", "items": [ids] }], "layers": [...] } ] }
 *
 * Shapes: `{ id, type, boundingBox: { x, y, w, h, rotation? }, style: { fill:
 * { type: "color", color }, stroke: { color, width, style }, rounding,
 * textColor }, text (HTML), opacity (0-100) }` with types from the Standard,
 * Shape, Flowchart and Container libraries. Lines: `{ lineType: straight |
 * elbow | curved, stroke, endpoint1/2: { type: shapeEndpoint (shapeId,
 * relative position) | positionEndpoint (absolute position) | lineEndpoint,
 * style: arrowhead }, text: [{ text, position }] }`.
 *
 * Lucid's proprietary editor JSON (what draw.io reads through its browser
 * extension) is undocumented and not supported.
 */
import { unzipSync } from 'fflate';
import type { AnchorSide, ArrowHead, ConnectorElement, DiagramElement, ElementStyle, Endpoint, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import type { ImportResult, ImportedPage, Importer } from './types';
import { hasKind, htmlToPlain, makeDoc, normColor, pickKind, toBytes, utf8Decode } from './_shared';

interface LStyle {
  fill?: { type?: string; color?: string };
  stroke?: { color?: string; width?: number; style?: string };
  rounding?: number;
  textColor?: string;
}
interface LShape {
  id: string;
  type: string;
  boundingBox?: { x?: number; y?: number; w?: number; h?: number; rotation?: number };
  style?: LStyle;
  stroke?: LStyle['stroke'];
  image?: { url?: string; ref?: string };
  text?: string;
  opacity?: number;
  zIndex?: number;
  note?: string;
  containerTitle?: { text?: string } | string;
  lanes?: Array<{ title?: string }>;
}
interface LEndpoint {
  type?: string;
  style?: string;
  shapeId?: string;
  lineId?: string;
  position?: { x?: number; y?: number } | number;
}
interface LLine {
  id: string;
  lineType?: string;
  endpoint1?: LEndpoint;
  endpoint2?: LEndpoint;
  stroke?: LStyle['stroke'];
  text?: Array<{ text?: string; position?: number }>;
  zIndex?: number;
}
interface LPage {
  id?: string;
  title?: string;
  shapes?: LShape[];
  lines?: LLine[];
  groups?: Array<{ id: string; items?: string[] }>;
}

const TYPES: Record<string, string[]> = {
  rectangle: ['rectangle'], text: ['text'], stickyNote: ['sticky', 'uml.note'], hotspot: ['rectangle'], image: ['image', 'icon'],
  circle: ['ellipse'], cloud: ['cloud'], cross: ['basic.cross', 'rectangle'], diamond: ['diamond'], doubleArrow: ['basic.doubleArrow', 'blockArrow'],
  hexagon: ['hexagon'], isoscelesTriangle: ['triangle'], octagon: ['basic.octagon', 'hexagon'], pentagon: ['basic.pentagon', 'hexagon'],
  polyStar: ['basic.star', 'rectangle'], rightTriangle: ['basic.rightTriangle', 'triangle'], singleArrow: ['blockArrow'], flexiblePolygon: ['rectangle'],
  process: ['rectangle'], decision: ['diamond'], terminator: ['flow.terminator'], data: ['parallelogram'], document: ['flow.document'],
  multipleDocuments: ['flow.multiDocument', 'flow.document'], database: ['cylinder'], storedData: ['flow.storedData', 'cylinder'],
  directAccessStorage: ['cylinder'], predefinedProcess: ['flow.predefined'], manualInput: ['flow.manualInput'],
  manualOperation: ['flow.manualOperation'], delay: ['flow.delay'], offPageLink: ['flow.offPage'], internalStorage: ['flow.internalStorage'],
  preparation: ['hexagon'], note: ['uml.note'], braceNote: ['uml.note'], display: ['flow.display', 'rectangle'],
  merge: ['triangle'], or: ['flow.or', 'ellipse'], summingJunction: ['flow.summingJunction', 'ellipse'], connector: ['ellipse'],
  paperTape: ['flow.paperTape', 'flow.document'],
  braceContainer: ['container'], bracketContainer: ['container'], circleContainer: ['container'], diamondContainer: ['container'],
  pillContainer: ['container'], rectangleContainer: ['container'], roundedRectangleContainer: ['container'], swimLanes: ['container'],
};

const ARROWS: Record<string, ArrowHead> = {
  none: 'none', arrow: 'triangle', hollowArrow: 'triangleOpen', openArrow: 'arrow', async1: 'async', async2: 'async',
  closedSquare: 'box', openSquare: 'boxOpen', closedCircle: 'circle', openCircle: 'circleOpen', composition: 'diamond',
  aggregation: 'diamondOpen', generalization: 'triangleOpen', exactlyOne: 'erOnlyOne', one: 'erOne', many: 'erMany',
  oneOrMore: 'erOneMany', zeroOrMore: 'erZeroMany', zeroOrOne: 'erZeroOne', nesting: 'circleOpen', bpmnConditional: 'diamondOpen',
  bpmnDefault: 'dash',
};

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function sideOf(p: { x?: number; y?: number } | undefined): AnchorSide | 'auto' {
  if (!p) return 'auto';
  const x = num(p.x, 0.5);
  const y = num(p.y, 0.5);
  if (y <= 0.01) return 'top';
  if (y >= 0.99) return 'bottom';
  if (x <= 0.01) return 'left';
  if (x >= 0.99) return 'right';
  return 'auto';
}

function strokeStyle(s: LStyle['stroke'] | undefined): Partial<ElementStyle> {
  if (!s) return {};
  const out: Partial<ElementStyle> = {};
  const c = normColor(s.color);
  if (c) out.stroke = c;
  if (s.width !== undefined) out.strokeWidth = num(s.width, 1);
  if (s.style === 'dashed' || s.style === 'dotted') out.strokeStyle = s.style;
  return out;
}

function convertPage(page: LPage, index: number, warn: (m: string) => void): ImportedPage {
  const shapes = new Map<string, ShapeElement>();
  const z = new Map<string, number>();
  let unknown = 0;
  for (const s of page.shapes ?? []) {
    const bb = s.boundingBox ?? {};
    const kinds = TYPES[s.type];
    if (!kinds) unknown++;
    const kind = kinds?.[0] === 'container' ? 'container' : pickKind(...(kinds ?? []));
    const st = s.style ?? {};
    const style: Partial<ElementStyle> = { radius: 0, ...strokeStyle(st.stroke ?? s.stroke) };
    const fill = st.fill?.type === 'color' ? normColor(st.fill.color) : undefined;
    if (fill) style.fill = fill;
    if (st.rounding) style.radius = num(st.rounding) / 2;
    if (s.type === 'roundedRectangleContainer' || s.type === 'pillContainer') style.radius = 16;
    const tc = normColor(st.textColor);
    if (tc) style.textColor = tc;
    if (s.opacity !== undefined && num(s.opacity, 100) < 100) style.opacity = num(s.opacity, 100) / 100;
    if (kind === 'text') Object.assign(style, { fill: 'none', stroke: 'none' });
    if (kind === 'container') Object.assign(style, { verticalAlign: 'top', bold: true, ...(fill ? {} : { fill: 'none' }) });
    let text = s.text ? htmlToPlain(s.text) : '';
    if (!text && s.containerTitle) text = htmlToPlain(typeof s.containerTitle === 'string' ? s.containerTitle : s.containerTitle.text ?? '');
    if (!text && s.lanes?.length) text = s.lanes.map((l) => l.title ?? '').filter(Boolean).join(' | ');
    const shape = createShape(kind, { x: num(bb.x), y: num(bb.y), w: Math.max(1, num(bb.w, 120)), h: Math.max(1, num(bb.h, 60)) }, style, text);
    if (s.type === 'image' && (hasKind('image') || hasKind('icon')) && s.image?.url) shape.icon = s.image.url;
    if (s.type === 'merge') shape.rotation = 180;
    if (num(bb.rotation)) shape.rotation = num(bb.rotation);
    if (s.note) shape.tooltip = htmlToPlain(s.note);
    shapes.set(s.id, shape);
    z.set(shape.id, num(s.zIndex));
  }
  if (unknown) warn(`${unknown} unsupported Lucid shape type(s) were imported as rectangles.`);

  // Containment by geometry: smallest container that fully encloses the shape.
  const containers = [...shapes.values()].filter((s) => s.kind === 'container');
  for (const s of shapes.values()) {
    let best: ShapeElement | undefined;
    for (const c of containers) {
      if (c === s) continue;
      const inside = s.x >= c.x && s.y >= c.y && s.x + s.w <= c.x + c.w && s.y + s.h <= c.y + c.h;
      if (inside && (!best || c.w * c.h < best.w * best.h)) best = c;
    }
    if (best) s.containerId = best.id;
  }

  // Lines (two passes so lineEndpoints can use the other line's midpoint).
  const lineEnds = new Map<string, { a: { x: number; y: number }; b: { x: number; y: number } }>();
  const pointOf = (e: LEndpoint | undefined): { x: number; y: number } | undefined => {
    if (!e) return undefined;
    if (e.type === 'shapeEndpoint') {
      const s = shapes.get(e.shapeId ?? '');
      if (!s) return undefined;
      const p = typeof e.position === 'object' ? e.position : undefined;
      return { x: s.x + s.w * num(p?.x, 0.5), y: s.y + s.h * num(p?.y, 0.5) };
    }
    if (e.type === 'positionEndpoint' && typeof e.position === 'object') return { x: num(e.position.x), y: num(e.position.y) };
    if (e.type === 'lineEndpoint') {
      const l = lineEnds.get(e.lineId ?? '');
      const t = typeof e.position === 'number' ? e.position : 0.5;
      if (l) return { x: l.a.x + (l.b.x - l.a.x) * t, y: l.a.y + (l.b.y - l.a.y) * t };
    }
    return undefined;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const l of page.lines ?? []) {
      const a = pointOf(l.endpoint1);
      const b = pointOf(l.endpoint2);
      if (a && b) lineEnds.set(l.id, { a, b });
    }
  }
  const connectors: ConnectorElement[] = [];
  const lineMap = new Map<string, ConnectorElement>();
  let dropped = 0;
  for (const l of page.lines ?? []) {
    const ends = lineEnds.get(l.id);
    if (!ends) {
      dropped++;
      continue;
    }
    const endpoint = (e: LEndpoint | undefined, p: { x: number; y: number }): Endpoint => {
      const s = e?.type === 'shapeEndpoint' ? shapes.get(e.shapeId ?? '') : undefined;
      const rel = typeof e?.position === 'object' ? e.position : undefined;
      return s ? { elementId: s.id, side: sideOf(rel), x: Math.round(p.x), y: Math.round(p.y) } : { x: Math.round(p.x), y: Math.round(p.y) };
    };
    const texts = (l.text ?? []).filter((t) => t.text);
    const conn = createConnector(endpoint(l.endpoint1, ends.a), endpoint(l.endpoint2, ends.b), {
      routing: l.lineType === 'elbow' ? 'orthogonal' : l.lineType === 'curved' ? 'curved' : 'straight',
      startArrow: ARROWS[l.endpoint1?.style ?? 'none'] ?? 'none',
      endArrow: ARROWS[l.endpoint2?.style ?? 'none'] ?? 'none',
      text: texts.map((t) => htmlToPlain(t.text!)).join('\n'),
      ...(texts.length && texts[0].position !== undefined ? { labelT: num(texts[0].position, 0.5) } : {}),
    });
    conn.style = { ...conn.style, ...strokeStyle(l.stroke) };
    connectors.push(conn);
    lineMap.set(l.id, conn);
    z.set(conn.id, num(l.zIndex));
  }
  if (dropped) warn(`${dropped} Lucid line(s) without resolvable endpoints were skipped.`);

  // Groups (items may reference nested groups).
  const groups = new Map((page.groups ?? []).map((g) => [g.id, g]));
  const byLucidId = new Map<string, DiagramElement>([...shapes, ...lineMap]);
  const membersOf = (gid: string, seen = new Set<string>()): DiagramElement[] => {
    if (seen.has(gid)) return [];
    seen.add(gid);
    return (groups.get(gid)?.items ?? []).flatMap((id) => (groups.has(id) ? membersOf(id, seen) : byLucidId.get(id) ? [byLucidId.get(id)!] : []));
  };
  // Innermost groups first: process groups that are not items of another group last.
  const nested = new Set((page.groups ?? []).flatMap((g) => g.items ?? []).filter((id) => groups.has(id)));
  const order = [...(page.groups ?? []).filter((g) => nested.has(g.id)), ...(page.groups ?? []).filter((g) => !nested.has(g.id))];
  for (const g of order) for (const el of membersOf(g.id)) if (!el.groupIds.includes(g.id)) el.groupIds.push(g.id);

  const containerFirst = (a: DiagramElement, b: DiagramElement) => {
    const ca = a.type === 'shape' && a.kind === 'container' ? 0 : 1;
    const cb = b.type === 'shape' && b.kind === 'container' ? 0 : 1;
    return ca - cb || (z.get(a.id) ?? 0) - (z.get(b.id) ?? 0);
  };
  const elements = [...shapes.values(), ...connectors].sort(containerFirst);
  return { name: page.title || `Page ${index + 1}`, doc: makeDoc(elements) };
}

export function importLucid(content: string | Uint8Array): ImportResult {
  const bytes = toBytes(content);
  let json: string;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes);
    const entry = Object.keys(files).find((k) => /(^|\/)document\.json$/i.test(k));
    if (!entry) throw new Error('This .lucid archive has no document.json.');
    json = utf8Decode(files[entry]);
  } else json = typeof content === 'string' ? content : utf8Decode(bytes);
  let doc: { pages?: LPage[] };
  try {
    doc = JSON.parse(json.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('This is not a Lucid Standard Import document (invalid JSON).');
  }
  if (!Array.isArray(doc?.pages)) throw new Error('This is not a Lucid Standard Import document (no pages).');
  const warnings: string[] = [];
  const warn = (m: string) => {
    if (!warnings.includes(m)) warnings.push(m);
  };
  const pages = doc.pages.map((p, i) => convertPage(p, i, warn));
  return { pages, warnings };
}

export const importer: Importer = {
  id: 'lucid',
  label: 'Lucidchart (Standard Import)…',
  description: 'Lucid Standard Import documents (.lucid zip or document.json): shapes, lines, groups and pages.',
  extensions: ['lucid'],
  acceptsText: true,
  example: `{
  "version": 1,
  "pages": [{
    "id": "page1", "title": "Main",
    "shapes": [
      { "id": "a", "type": "terminator", "boundingBox": { "x": 0, "y": 0, "w": 160, "h": 60 }, "text": "Start" },
      { "id": "b", "type": "process", "boundingBox": { "x": 0, "y": 140, "w": 160, "h": 70 }, "text": "Do work",
        "style": { "fill": { "type": "color", "color": "#dbeafe" }, "stroke": { "color": "#2563eb", "width": 2 } } }
    ],
    "lines": [
      { "id": "l1", "lineType": "straight",
        "endpoint1": { "type": "shapeEndpoint", "style": "none", "shapeId": "a", "position": { "x": 0.5, "y": 1 } },
        "endpoint2": { "type": "shapeEndpoint", "style": "arrow", "shapeId": "b", "position": { "x": 0.5, "y": 0 } } }
    ]
  }]
}`,
  detect: (content, fileName) => {
    if (/\.lucid$/i.test(fileName ?? '')) return true;
    if (typeof content !== 'string') return false;
    const head = content.slice(0, 5000);
    return /"pages"\s*:/.test(head) && /"boundingBox"\s*:/.test(content);
  },
  run: async (content) => importLucid(content),
};
