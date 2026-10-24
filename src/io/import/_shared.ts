/**
 * Helpers shared by the importers in this folder. This module deliberately
 * exports no `importer`, so the plugin index skips it.
 *
 * Contents:
 *  - document building (kind fallback, spec → laid-out elements, connectors)
 *  - colour / HTML-text / normalisation
 *  - bytes, base64, CRC32, PNG chunk reading/writing
 *  - `embedDiagramInPng` / `embedDiagramInSvg`: ArkDraw's own convention for
 *    "editable images" (documented in ./embedded.ts), used by the exporters.
 */
import { zlibSync, unzlibSync } from 'fflate';
import type {
  ArrowHead, ConnectorElement, DiagramElement, Doc, ElementStyle, Endpoint, Rect, Routing, ShapeElement, Vec,
} from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { SHAPES } from '@/shapes/registry';
import { parseStyle } from '@/io/drawio';
import { convertSpec, facingPoint } from '@/ai/generate/toElements';
import { layoutDiagram } from '@/ai/generate/layout';
import { defaultDirection, resolveSpec } from '@/ai/generate/resolve';
import type { DiagramSpec } from '@/ai/generate/spec';

// ---------------------------------------------------------------------------
// Kinds & documents
// ---------------------------------------------------------------------------

export const hasKind = (kind: string): boolean => kind in SHAPES;

/** First candidate kind that exists in the shape registry, else `rectangle`. */
export function pickKind(...candidates: Array<string | undefined>): string {
  for (const c of candidates) if (c && hasKind(c)) return c;
  return 'rectangle';
}

/** Builds a Doc from elements given back-to-front. */
export function makeDoc(elements: DiagramElement[]): Doc {
  const doc: Doc = { elements: {}, order: [] };
  for (const el of elements) {
    if (doc.elements[el.id]) continue;
    doc.elements[el.id] = el;
    doc.order.push(el.id);
  }
  return doc;
}

const centerOf = (r: Rect): Vec => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Endpoint attached to `shape` (side `auto`), cached on the side facing `toward`. */
export function attach(shape: ShapeElement, toward: Vec): Endpoint {
  const p = facingPoint(shape, toward);
  return { elementId: shape.id, side: 'auto', x: Math.round(p.x), y: Math.round(p.y) };
}

/** A connector between two shapes (or a self-loop). */
export function connectShapes(a: ShapeElement, b: ShapeElement, overrides: Partial<ConnectorElement> = {}): ConnectorElement {
  return createConnector(attach(a, centerOf(b)), attach(b, centerOf(a)), overrides);
}

/** Converts a connector endpoint into a free point or an attachment. */
export function endpointAt(shape: ShapeElement | undefined, p: Vec): Endpoint {
  return shape ? { elementId: shape.id, side: 'auto', x: Math.round(p.x), y: Math.round(p.y) } : { x: Math.round(p.x), y: Math.round(p.y) };
}

/** Bounding box of shapes and free connector points. */
export function boundsOf(elements: DiagramElement[]): Rect {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const el of elements) {
    if (isShape(el)) {
      x1 = Math.min(x1, el.x); y1 = Math.min(y1, el.y);
      x2 = Math.max(x2, el.x + el.w); y2 = Math.max(y2, el.y + el.h);
    } else if (isConnector(el)) {
      for (const p of [el.source, el.target]) {
        x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
        x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y);
      }
    }
  }
  if (!Number.isFinite(x1)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Moves everything so the top-left of the content sits at (`x`, `y`). */
export function translateTo(elements: DiagramElement[], x = 0, y = 0): void {
  const b = boundsOf(elements);
  const dx = x - b.x;
  const dy = y - b.y;
  if (!dx && !dy) return;
  for (const el of elements) {
    if (isShape(el)) {
      el.x = Math.round(el.x + dx);
      el.y = Math.round(el.y + dy);
    } else if (isConnector(el)) {
      el.source = { ...el.source, x: Math.round(el.source.x + dx), y: Math.round(el.source.y + dy) };
      el.target = { ...el.target, x: Math.round(el.target.x + dx), y: Math.round(el.target.y + dy) };
      if (el.waypoints) el.waypoints = el.waypoints.map((w) => ({ x: Math.round(w.x + dx), y: Math.round(w.y + dy) }));
    }
  }
}

// ---------------------------------------------------------------------------
// Spec → laid-out elements
// ---------------------------------------------------------------------------

/**
 * Makes a spec safe for `convertSpec`: unknown kinds → rectangle, dangling
 * parents dropped, containment cycles broken, edges to unknown nodes dropped.
 */
export function cleanSpec(spec: DiagramSpec): DiagramSpec {
  const ids = new Set<string>();
  const nodes = spec.nodes.filter((n) => (ids.has(n.id) ? false : (ids.add(n.id), true))).map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (!hasKind(n.kind) && !n.kind.startsWith('c4.')) n.kind = 'rectangle';
    if (n.parent !== undefined && (!byId.has(n.parent) || n.parent === n.id)) delete n.parent;
  }
  for (const n of nodes) {
    const seen = new Set([n.id]);
    for (let p = n.parent; p; p = byId.get(p)?.parent) {
      if (seen.has(p)) {
        delete n.parent;
        break;
      }
      seen.add(p);
    }
  }
  const edges = spec.edges.filter((e) => byId.has(e.from) && byId.has(e.to));
  return { ...spec, nodes, edges };
}

export interface LayoutOverrides {
  /** Fixed sizes per spec node id (otherwise sized to fit the text). */
  sizes?: Map<string, { w?: number; h?: number }>;
  /** Extra space added to auto sizes (mxGraph CSV `padding`). */
  padding?: number;
  nodesep?: number;
  ranksep?: number;
}

export interface LaidOut {
  /** Back to front: containers, shapes, connectors. */
  elements: DiagramElement[];
  /** Spec node id → shape. */
  shapes: Map<string, ShapeElement>;
  /** Connectors aligned with `spec.edges` (after cleaning). */
  connectors: ConnectorElement[];
  spec: DiagramSpec;
}

/**
 * Lays out a spec with the shared dagre layout (`src/ai/generate`). Without
 * overrides it simply delegates to `convertSpec`; with fixed sizes / spacing it
 * runs the same resolve + layout steps with those tweaks applied.
 */
export function layoutSpec(rawSpec: DiagramSpec, overrides: LayoutOverrides = {}): LaidOut {
  const spec = cleanSpec(rawSpec);
  const custom = overrides.sizes?.size || overrides.padding || overrides.nodesep !== undefined || overrides.ranksep !== undefined;
  if (!custom && spec.type !== 'sequence') {
    const conv = convertSpec(spec, { x: 0, y: 0 }, { anchor: 'topLeft' });
    const shapes = new Map<string, ShapeElement>();
    for (const [nid, eid] of conv.idMap) {
      const el = conv.elements.find((e) => e.id === eid);
      if (isShape(el)) shapes.set(nid, el);
    }
    return { elements: conv.elements, shapes, connectors: conv.elements.filter(isConnector), spec };
  }

  const nodes = resolveSpec(spec);
  for (const n of nodes) {
    if (n.container) continue;
    const pad = overrides.padding ?? 0;
    const fixed = overrides.sizes?.get(n.id);
    if (pad) {
      n.w = Math.max(10, n.w + pad);
      n.h = Math.max(10, n.h + pad);
    }
    if (fixed?.w) n.w = fixed.w;
    if (fixed?.h) n.h = fixed.h;
    n.boxW = Math.max(n.w, n.labelBelow ? n.boxW : 0);
  }
  const layout = layoutDiagram(
    nodes,
    spec.edges.map((e) => ({ from: e.from, to: e.to, label: e.label })),
    { direction: spec.direction ?? defaultDirection(spec.type), nodesep: overrides.nodesep ?? 48, ranksep: overrides.ranksep ?? 64 },
  );
  const shapes = new Map<string, ShapeElement>();
  for (const n of nodes) {
    const r = layout.rects.get(n.id)!;
    const s = createShape(n.kind, { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }, n.style, n.text);
    if (n.icon) s.icon = n.icon;
    shapes.set(n.id, s);
  }
  for (const n of nodes) if (n.parent && shapes.has(n.parent)) shapes.get(n.id)!.containerId = shapes.get(n.parent)!.id;
  const depth = (id: string) => {
    let d = 0;
    for (let p = spec.nodes.find((x) => x.id === id)?.parent; p && d < 100; p = spec.nodes.find((x) => x.id === p)?.parent) d++;
    return d;
  };
  const containers = nodes.filter((n) => n.container).sort((a, b) => depth(a.id) - depth(b.id));
  const connectors = spec.edges.map((e) =>
    connectShapes(shapes.get(e.from)!, shapes.get(e.to)!, {
      startArrow: e.startArrow ?? 'none',
      endArrow: e.endArrow ?? 'triangle',
      routing: e.routing ?? 'orthogonal',
      text: e.label ?? '',
    }),
  );
  connectors.forEach((c, i) => {
    if (spec.edges[i].dashed) c.style = { ...c.style, strokeStyle: 'dashed' };
  });
  const elements: DiagramElement[] = [
    ...containers.map((n) => shapes.get(n.id)!),
    ...nodes.filter((n) => !n.container).map((n) => shapes.get(n.id)!),
    ...connectors,
  ];
  return { elements, shapes, connectors, spec };
}

/** Sets a connector's routing, accepting only values the model knows. */
export function asRouting(v: string | undefined, fallback: Routing = 'orthogonal'): Routing {
  return v === 'straight' || v === 'curved' || v === 'orthogonal' ? v : fallback;
}

// ---------------------------------------------------------------------------
// Colours & text
// ---------------------------------------------------------------------------

const NAMED_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
  orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', brown: '#a52a2a', cyan: '#00ffff', magenta: '#ff00ff',
  gray: '#808080', grey: '#808080', lightgray: '#d3d3d3', lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
  silver: '#c0c0c0', navy: '#000080', teal: '#008080', lime: '#00ff00', olive: '#808000', maroon: '#800000',
  gold: '#ffd700', aqua: '#00ffff', fuchsia: '#ff00ff', indigo: '#4b0082', violet: '#ee82ee', coral: '#ff7f50',
  salmon: '#fa8072', tomato: '#ff6347', khaki: '#f0e68c', beige: '#f5f5dc', ivory: '#fffff0', lavender: '#e6e6fa',
  lightblue: '#add8e6', lightgreen: '#90ee90', lightyellow: '#ffffe0', lightpink: '#ffb6c1', darkblue: '#00008b',
  darkgreen: '#006400', darkred: '#8b0000', skyblue: '#87ceeb', steelblue: '#4682b4', royalblue: '#4169e1',
  orchid: '#da70d6', plum: '#dda0dd', tan: '#d2b48c', chocolate: '#d2691e', crimson: '#dc143c', turquoise: '#40e0d0',
  whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc', slategray: '#708090', aliceblue: '#f0f8ff', honeydew: '#f0fff0',
  mintcream: '#f5fffa', lemonchiffon: '#fffacd', wheat: '#f5deb3', peachpuff: '#ffdab9', mistyrose: '#ffe4e1',
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** Normalises a CSS-ish colour to `#rrggbb` (or `none`); undefined if unrecognised. */
export function normColor(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase().replace(/!important$/, '').trim();
  if (!v) return undefined;
  if (v === 'none' || v === 'transparent') return 'none';
  let m = /^#([0-9a-f]{3,4})$/.exec(v);
  if (m) return '#' + m[1].slice(0, 3).split('').map((c) => c + c).join('');
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) return '#' + m[1];
  m = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/.exec(v);
  if (m) return '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]);
  return NAMED_COLORS[v];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (all, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[e.toLowerCase()] ?? all;
  });
}

/** HTML label → plain text with line breaks (no DOM needed). */
export function htmlToPlain(html: string): string {
  if (!/[<&]/.test(html)) return html;
  return decodeEntities(
    html
      .replace(/\r/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
      .replace(/<hr[^>]*>/gi, '\n--\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// mxGraph styles → ArkDraw
// ---------------------------------------------------------------------------

/** mxGraph shape names → ArkDraw kind candidates. */
const DRAWIO_KIND: Record<string, string[]> = {
  rectangle: ['rectangle'], label: ['rectangle'], rect: ['rectangle'],
  ellipse: ['ellipse'], doubleEllipse: ['erd.multivalued', 'ellipse'],
  rhombus: ['diamond'], cylinder: ['cylinder'], cylinder3: ['cylinder'], datastore: ['cylinder'],
  hexagon: ['hexagon'], parallelogram: ['parallelogram'], trapezoid: ['trapezoid'], triangle: ['triangle'],
  cloud: ['cloud'], callout: ['callout'], singleArrow: ['blockArrow'], text: ['text'],
  swimlane: ['container'], note: ['uml.note'], document: ['flow.document'], process: ['flow.predefined'],
  umlActor: ['uml.actor'], cube: ['uml.node'], folder: ['uml.package'], component: ['uml.component'],
  umlLifeline: ['uml.lifeline'], umlFrame: ['uml.frame'], endState: ['uml.final'], image: ['image', 'icon'],
  'mxgraph.flowchart.terminator': ['flow.terminator'], 'mxgraph.flowchart.decision': ['diamond'],
  'mxgraph.flowchart.document': ['flow.document'], 'mxgraph.flowchart.database': ['cylinder'],
  'mxgraph.flowchart.process': ['rectangle'], 'mxgraph.flowchart.start_1': ['ellipse'], 'mxgraph.flowchart.start_2': ['ellipse'],
  'mxgraph.c4.person2': ['c4.person'], step: ['basic.step', 'blockArrow'], card: ['basic.card', 'rectangle'],
  internalStorage: ['flow.internalStorage'], manualInput: ['flow.manualInput'], delay: ['flow.delay'],
  offPageConnector: ['flow.offPage'], or: ['flow.or', 'ellipse'], xor: ['flow.xor', 'ellipse'],
};

/** Reverse index of the registry's own mxGraph styles. */
let registryIndex: Map<string, string> | undefined;
function kindFromRegistry(name: string): string | undefined {
  if (!registryIndex) {
    registryIndex = new Map();
    for (const def of Object.values(SHAPES)) {
      const st = parseStyle(def.drawio ?? '');
      const key = st.get('shape') ?? [...st.keys()][0];
      if (key && !registryIndex.has(key)) registryIndex.set(key, def.kind);
    }
  }
  return registryIndex.get(name);
}

export function drawioArrow(name: string | undefined, fill: string | undefined): ArrowHead {
  const open = fill === '0';
  switch (name) {
    case undefined:
    case '':
      return 'triangle';
    case 'none':
      return 'none';
    case 'open':
    case 'openThin':
    case 'openAsync':
      return 'arrow';
    case 'classic':
    case 'classicThin':
    case 'block':
    case 'blockThin':
      return open ? 'triangleOpen' : 'triangle';
    case 'diamond':
    case 'diamondThin':
      return open ? 'diamondOpen' : 'diamond';
    case 'oval':
    case 'circle':
      return open ? 'circleOpen' : 'circle';
    case 'cross':
      return 'cross';
    case 'dash':
      return 'dash';
    case 'box':
      return open ? 'boxOpen' : 'box';
    case 'async':
      return 'async';
    case 'halfCircle':
      return 'circleOpen';
    case 'ERone':
      return 'erOne';
    case 'ERmandOne':
      return 'erOnlyOne';
    case 'ERmany':
      return 'erMany';
    case 'ERoneToMany':
      return 'erOneMany';
    case 'ERzeroToMany':
      return 'erZeroMany';
    case 'ERzeroToOne':
      return 'erZeroOne';
    default:
      return 'triangle';
  }
}

export interface MappedDrawioStyle {
  kind: string;
  style: Partial<ElementStyle>;
  /** Image URL (`image=`), if any. */
  image?: string;
  /** Edge-only bits. */
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  routing: Routing;
  container: boolean;
}

/** Maps a string onto an ArkDraw kind + style overrides. */
export function mapDrawioStyle(styleText: string, isEdge = false): MappedDrawioStyle {
  const m = parseStyle(styleText);
  const style: Partial<ElementStyle> = {};
  const col = (k: string) => {
    const v = m.get(k);
    return v && v !== 'default' ? normColor(v) : undefined;
  };
  const fill = col('fillColor');
  if (fill && !isEdge) style.fill = fill;
  const stroke = col('strokeColor');
  if (stroke) style.stroke = stroke;
  const font = col('fontColor');
  if (font) style.textColor = font;
  const grad = col('gradientColor');
  if (grad && grad !== 'none' && !isEdge) style.gradient = grad;
  const num = (k: string) => {
    const v = Number(m.get(k));
    return m.has(k) && Number.isFinite(v) ? v : undefined;
  };
  const sw = num('strokeWidth');
  if (sw !== undefined) style.strokeWidth = sw;
  const fs = num('fontSize');
  if (fs) style.fontSize = fs;
  const fst = num('fontStyle');
  if (fst !== undefined) {
    style.bold = (fst & 1) === 1;
    style.italic = (fst & 2) === 2;
    if (fst & 4) style.underline = true;
  }
  const op = num('opacity');
  if (op !== undefined) style.opacity = Math.max(0, Math.min(1, op / 100));
  if (m.get('dashed') === '1') style.strokeStyle = m.get('dashPattern')?.startsWith('1 ') ? 'dotted' : 'dashed';
  if (m.get('shadow') === '1') style.shadow = true;
  if (m.get('rounded') === '1') style.radius = m.get('absoluteArcSize') === '1' ? (num('arcSize') ?? 20) / 2 : 10;
  else if (m.get('rounded') === '0') style.radius = 0;
  const align = m.get('align');
  if (align === 'left' || align === 'right' || align === 'center') style.textAlign = align;
  const va = m.get('verticalAlign');
  if (va === 'top' || va === 'bottom' || va === 'middle') style.verticalAlign = va;
  const ff = (m.get('fontFamily') ?? '').toLowerCase();
  if (ff) style.fontFamily = /mono|courier|consol/.test(ff) ? 'mono' : /georgia|times|serif/.test(ff) && !/sans/.test(ff) ? 'serif' : 'sans';

  const shapeName = m.get('shape') ?? [...m.keys()].find((k) => !m.get(k) && DRAWIO_KIND[k]) ?? '';
  let kind = pickKind(...(DRAWIO_KIND[shapeName] ?? []), kindFromRegistry(shapeName));
  if (!shapeName) {
    if (m.has('ellipse')) kind = 'ellipse';
    else if (m.has('rhombus')) kind = 'diamond';
    else if (m.has('text')) kind = 'text';
  }
  if (kind === 'rectangle' && m.get('rounded') === '1' && (num('arcSize') ?? 0) >= 50) kind = pickKind('flow.terminator');
  const container = m.has('swimlane') || m.get('container') === '1';
  if (container) kind = 'container';
  if (kind === 'text') {
    if (!fill) style.fill = 'none';
    if (!stroke) style.stroke = 'none';
  }
  const edgeStyle = m.get('edgeStyle');
  return {
    kind,
    style,
    image: m.get('image') || undefined,
    startArrow: m.has('startArrow') ? drawioArrow(m.get('startArrow'), m.get('startFill')) : 'none',
    endArrow: drawioArrow(m.get('endArrow'), m.get('endFill')),
    routing: m.get('curved') === '1' ? 'curved' : edgeStyle === 'none' || (!edgeStyle && isEdge) ? 'straight' : 'orthogonal',
    container,
  };
}

// ---------------------------------------------------------------------------
// Bytes
// ---------------------------------------------------------------------------

export const utf8Encode = (s: string): Uint8Array => new TextEncoder().encode(s);
export const utf8Decode = (b: Uint8Array): string => new TextDecoder('utf-8').decode(b);
export const latin1Decode = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
};
export const latin1Encode = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

export function toBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === 'string' ? utf8Encode(content) : content;
}

/** Content as text (UTF-8, BOM stripped). */
export function toText(content: string | Uint8Array): string {
  const s = typeof content === 'string' ? content : utf8Decode(content);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function base64Encode(bytes: Uint8Array): string {
  return btoa(latin1Decode(bytes));
}

export function base64Decode(b64: string): Uint8Array {
  return latin1Encode(atob(b64.replace(/\s+/g, '')));
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Standard CRC-32 (ISO-HDLC, as used by PNG and zip). */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// PNG chunks
// ---------------------------------------------------------------------------

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const isPng = (b: Uint8Array): boolean => b.length >= 8 && PNG_SIGNATURE.every((v, i) => b[i] === v);

export interface PngChunk {
  type: string;
  /** Offset of the chunk (its length field) in the file. */
  offset: number;
  data: Uint8Array;
}

export function readPngChunks(png: Uint8Array): PngChunk[] {
  if (!isPng(png)) throw new Error('Not a PNG file.');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: PngChunk[] = [];
  let pos = 8;
  while (pos + 12 <= png.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    if (pos + 12 + len > png.length) break;
    chunks.push({ type, offset: pos, data: png.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

export interface PngText {
  type: 'tEXt' | 'zTXt' | 'iTXt';
  keyword: string;
  text: string;
}

/** Decodes the tEXt / zTXt / iTXt chunks of a PNG. Corrupt chunks are skipped. */
export function readPngText(png: Uint8Array): PngText[] {
  const out: PngText[] = [];
  for (const c of readPngChunks(png)) {
    if (c.type !== 'tEXt' && c.type !== 'zTXt' && c.type !== 'iTXt') continue;
    const d = c.data;
    const nul = d.indexOf(0);
    if (nul < 1) continue;
    const keyword = latin1Decode(d.subarray(0, nul));
    try {
      if (c.type === 'tEXt') out.push({ type: c.type, keyword, text: latin1Decode(d.subarray(nul + 1)) });
      else if (c.type === 'zTXt') out.push({ type: c.type, keyword, text: latin1Decode(unzlibSync(d.subarray(nul + 2))) });
      else {
        const compressed = d[nul + 1] === 1;
        let p = nul + 3;
        p = d.indexOf(0, p) + 1; // language tag
        if (p <= 0) continue;
        p = d.indexOf(0, p) + 1; // translated keyword
        if (p <= 0) continue;
        const body = d.subarray(p);
        out.push({ type: c.type, keyword, text: utf8Decode(compressed ? unzlibSync(body) : body) });
      }
    } catch {
      /* skip corrupt chunk */
    }
  }
  return out;
}

/** The PNG iTXt keyword ArkDraw uses for its embedded document. */
export const ARKDRAW_PNG_KEYWORD = 'arkdraw';
/** The root `<svg>` attribute ArkDraw uses for its embedded document. */
export const ARKDRAW_SVG_ATTRIBUTE = 'data-arkdraw';

/**
 * Returns a copy of `png` carrying `json` (an `.arkdraw` document) in a
 * zlib-compressed `iTXt` chunk with keyword `arkdraw`, placed right after
 * IHDR. Any previous `arkdraw` chunk is replaced. See ./embedded.ts.
 */
export function embedDiagramInPng(png: Uint8Array, json: string): Uint8Array {
  const chunks = readPngChunks(png);
  if (chunks[0]?.type !== 'IHDR') throw new Error('PNG has no IHDR chunk.');
  const keyword = latin1Encode(ARKDRAW_PNG_KEYWORD);
  const body = zlibSync(utf8Encode(json), { level: 9 });
  // keyword \0 compressionFlag=1 method=0 language \0 translated \0 text
  const data = new Uint8Array(keyword.length + 5 + body.length);
  data.set(keyword, 0);
  data[keyword.length + 1] = 1;
  data.set(body, keyword.length + 5);
  const chunk = makePngChunk('iTXt', data);

  const parts: Uint8Array[] = [png.subarray(0, 8)];
  for (const c of chunks) {
    const raw = png.subarray(c.offset, c.offset + 12 + c.data.length);
    if (c.type === 'iTXt' && latin1Decode(c.data.subarray(0, c.data.indexOf(0))) === ARKDRAW_PNG_KEYWORD) continue;
    parts.push(raw);
    if (c.type === 'IHDR') parts.push(chunk);
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/**
 * Returns `svg` with `data-arkdraw="<base64 of the UTF-8 json>"` on its root
 * `<svg>` element (replacing an existing one). See ./embedded.ts.
 */
export function embedDiagramInSvg(svg: string, json: string): string {
  const b64 = base64Encode(utf8Encode(json));
  const m = /<svg\b[^>]*>/i.exec(svg);
  if (!m) throw new Error('No <svg> element found.');
  const tag = m[0].replace(/\s+data-arkdraw\s*=\s*("[^"]*"|'[^']*')/i, '');
  const selfClosing = tag.endsWith('/>');
  const newTag = tag.slice(0, selfClosing ? -2 : -1).replace(/\s+$/, '') + ` ${ARKDRAW_SVG_ATTRIBUTE}="${b64}"` + (selfClosing ? '/>' : '>');
  return svg.slice(0, m.index) + newTag + svg.slice(m.index + m[0].length);
}

// ---------------------------------------------------------------------------
// XML (DOM) helpers
// ---------------------------------------------------------------------------

export function parseXml(text: string): Document {
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  if (dom.getElementsByTagName('parsererror').length) throw new Error('Invalid XML.');
  return dom;
}

const localName = (el: Element) => el.localName || el.tagName.replace(/^.*:/, '');

/** Direct children with the given local name. */
export function kids(el: Element | Document | null | undefined, name?: string): Element[] {
  if (!el) return [];
  return Array.from(el.children).filter((c) => !name || localName(c) === name);
}

export function kid(el: Element | Document | null | undefined, name: string): Element | undefined {
  return kids(el, name)[0];
}

/** All descendants with the given local name (namespace agnostic). */
export function descendants(el: Element | Document, name: string): Element[] {
  return Array.from(el.getElementsByTagName('*')).filter((c) => localName(c) === name);
}
