/**
 * mxGraph stencil XML → a typed stencil model.
 *
 * mxGraph describes custom shapes ("Edit shape", `shape=stencil(…)`, sidebar
 * stencil sets) in this format:
 *
 *   <shape name="Box" w="100" h="60" aspect="variable" strokewidth="inherit">
 *     <connections><constraint x="0.5" y="0" perimeter="1" name="N"/></connections>
 *     <background><rect x="0" y="0" w="100" h="60"/></background>
 *     <foreground><fillstroke/><path>…</path><stroke/></foreground>
 *   </shape>
 *
 * Background and foreground are lists of drawing ops; geometry ops build the
 * current path and paint ops (`fill`, `stroke`, `fillstroke`) draw it. Parsing
 * is pure and cached by XML string, so rendering a stencil on every frame of a
 * drag costs one Map lookup.
 */

export interface StencilConnection {
  x: number;
  y: number;
  /** Project the point onto the shape outline (mxGraph `perimeter="1"`). */
  perimeter: boolean;
  name?: string;
}

export type PathOp =
  | { op: 'move' | 'line'; x: number; y: number }
  | { op: 'quad'; x1: number; y1: number; x2: number; y2: number }
  | { op: 'curve'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
  | { op: 'arc'; rx: number; ry: number; rotation: number; large: boolean; sweep: boolean; x: number; y: number }
  | { op: 'close' };

export type StencilOp =
  | { op: 'path'; ops: PathOp[] }
  | { op: 'rect'; x: number; y: number; w: number; h: number }
  | { op: 'roundrect'; x: number; y: number; w: number; h: number; arcsize: number }
  | { op: 'ellipse'; x: number; y: number; w: number; h: number }
  | { op: 'text'; str: string; x: number; y: number; align: 'left' | 'center' | 'right'; valign: 'top' | 'middle' | 'bottom'; rotation: number; vertical: boolean }
  | { op: 'image'; src: string; x: number; y: number; w: number; h: number; aspect: boolean; flipH: boolean; flipV: boolean }
  | { op: 'include'; name: string; x: number; y: number; w: number; h: number }
  | { op: 'fill' | 'stroke' | 'fillstroke' | 'save' | 'restore' }
  | { op: 'strokecolor' | 'fillcolor' | 'fontcolor'; color: string }
  | { op: 'strokewidth'; width: number; fixed: boolean }
  | { op: 'dashed'; dashed: boolean }
  | { op: 'dashpattern'; pattern: string }
  | { op: 'linejoin'; join: 'miter' | 'round' | 'bevel' }
  | { op: 'linecap'; cap: 'butt' | 'round' | 'square' }
  | { op: 'miterlimit'; limit: number }
  | { op: 'alpha' | 'fillalpha' | 'strokealpha'; alpha: number }
  | { op: 'fontsize'; size: number }
  | { op: 'fontstyle'; style: number }
  | { op: 'fontfamily'; family: string };

export interface Stencil {
  name: string;
  /** Design size in stencil units; drawings are scaled from this to the shape bounds. */
  w: number;
  h: number;
  /** `fixed` keeps the design aspect ratio (centered); `variable` stretches. */
  aspect: 'variable' | 'fixed';
  /** `inherit` uses the shape's stroke width; a number is scaled with the shape. */
  strokewidth: 'inherit' | number;
  connections: StencilConnection[];
  background: StencilOp[];
  foreground: StencilOp[];
  /** Ops the renderer can't draw (unknown tags), for diagnostics. */
  unsupported: string[];
}

export class StencilError extends Error {}

const num = (el: Element, name: string, fallback = 0): number => {
  const v = el.getAttribute(name);
  if (v === null || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (el: Element, name: string) => {
  const v = el.getAttribute(name);
  return v === '1' || v === 'true';
};
const childElements = (el: Element | null | undefined): Element[] => (el ? Array.from(el.children) : []);
const child = (el: Element, tag: string) => childElements(el).find((c) => c.tagName.toLowerCase() === tag);

function parsePathOps(path: Element, unsupported: string[]): PathOp[] {
  const out: PathOp[] = [];
  for (const c of childElements(path)) {
    const tag = c.tagName.toLowerCase();
    switch (tag) {
      case 'move':
      case 'line':
        out.push({ op: tag, x: num(c, 'x'), y: num(c, 'y') });
        break;
      case 'quad':
        out.push({ op: 'quad', x1: num(c, 'x1'), y1: num(c, 'y1'), x2: num(c, 'x2'), y2: num(c, 'y2') });
        break;
      case 'curve':
        out.push({ op: 'curve', x1: num(c, 'x1'), y1: num(c, 'y1'), x2: num(c, 'x2'), y2: num(c, 'y2'), x3: num(c, 'x3'), y3: num(c, 'y3') });
        break;
      case 'arc':
        out.push({
          op: 'arc',
          rx: num(c, 'rx'),
          ry: num(c, 'ry'),
          rotation: num(c, 'x-axis-rotation'),
          large: bool(c, 'large-arc-flag'),
          sweep: bool(c, 'sweep-flag'),
          x: num(c, 'x'),
          y: num(c, 'y'),
        });
        break;
      case 'close':
        out.push({ op: 'close' });
        break;
      default:
        unsupported.push(`path/${tag}`);
    }
  }
  return out;
}

const ALIGN = (v: string | null): 'left' | 'center' | 'right' => (v === 'left' || v === 'right' ? v : 'center');
const VALIGN = (v: string | null): 'top' | 'middle' | 'bottom' => (v === 'top' || v === 'bottom' ? v : 'middle');

function parseOps(container: Element | null | undefined, unsupported: string[]): StencilOp[] {
  const out: StencilOp[] = [];
  for (const c of childElements(container)) {
    const tag = c.tagName.toLowerCase();
    switch (tag) {
      case 'path':
        out.push({ op: 'path', ops: parsePathOps(c, unsupported) });
        break;
      case 'rect':
      case 'ellipse':
        out.push({ op: tag, x: num(c, 'x'), y: num(c, 'y'), w: num(c, 'w'), h: num(c, 'h') });
        break;
      case 'roundrect':
        out.push({ op: 'roundrect', x: num(c, 'x'), y: num(c, 'y'), w: num(c, 'w'), h: num(c, 'h'), arcsize: num(c, 'arcsize', 0) || 15 });
        break;
      case 'text':
        out.push({
          op: 'text',
          str: c.getAttribute('str') ?? '',
          x: num(c, 'x'),
          y: num(c, 'y'),
          align: ALIGN(c.getAttribute('align')),
          valign: VALIGN(c.getAttribute('valign')),
          rotation: num(c, 'rotation'),
          vertical: bool(c, 'vertical'),
        });
        break;
      case 'image':
        out.push({
          op: 'image',
          src: c.getAttribute('src') ?? '',
          x: num(c, 'x'),
          y: num(c, 'y'),
          w: num(c, 'w'),
          h: num(c, 'h'),
          aspect: c.getAttribute('aspect') !== '0',
          flipH: bool(c, 'flipH'),
          flipV: bool(c, 'flipV'),
        });
        break;
      case 'include-shape':
        out.push({ op: 'include', name: c.getAttribute('name') ?? '', x: num(c, 'x'), y: num(c, 'y'), w: num(c, 'w'), h: num(c, 'h') });
        break;
      case 'fill':
      case 'stroke':
      case 'fillstroke':
      case 'save':
      case 'restore':
        out.push({ op: tag });
        break;
      case 'strokecolor':
      case 'fillcolor':
      case 'fontcolor':
        out.push({ op: tag, color: c.getAttribute('color') ?? 'none' });
        break;
      case 'strokewidth':
        out.push({ op: 'strokewidth', width: num(c, 'width', 1), fixed: bool(c, 'fixed') });
        break;
      case 'dashed':
        out.push({ op: 'dashed', dashed: bool(c, 'dashed') });
        break;
      case 'dashpattern':
        out.push({ op: 'dashpattern', pattern: c.getAttribute('pattern') ?? '3 3' });
        break;
      case 'linejoin': {
        const j = c.getAttribute('join');
        out.push({ op: 'linejoin', join: j === 'round' || j === 'bevel' ? j : 'miter' });
        break;
      }
      case 'linecap': {
        const cap = c.getAttribute('cap');
        out.push({ op: 'linecap', cap: cap === 'round' || cap === 'square' ? cap : 'butt' });
        break;
      }
      case 'miterlimit':
        out.push({ op: 'miterlimit', limit: num(c, 'limit', 10) });
        break;
      case 'alpha':
      case 'fillalpha':
      case 'strokealpha':
        out.push({ op: tag, alpha: Math.max(0, Math.min(1, num(c, 'alpha', 1))) });
        break;
      case 'fontsize':
        out.push({ op: 'fontsize', size: num(c, 'size', 12) });
        break;
      case 'fontstyle':
        out.push({ op: 'fontstyle', style: num(c, 'style', 0) });
        break;
      case 'fontfamily':
        out.push({ op: 'fontfamily', family: c.getAttribute('family') ?? '' });
        break;
      default:
        unsupported.push(tag);
    }
  }
  return out;
}

/** Parses one `<shape>` element. */
export function stencilFromElement(shape: Element): Stencil {
  const unsupported: string[] = [];
  const w = num(shape, 'w', 100) || 100;
  const h = num(shape, 'h', 100) || 100;
  const sw = shape.getAttribute('strokewidth');
  const connections = childElements(child(shape, 'connections')).filter((c) => c.tagName.toLowerCase() === 'constraint');
  return {
    name: shape.getAttribute('name') ?? '',
    w,
    h,
    aspect: shape.getAttribute('aspect') === 'fixed' ? 'fixed' : 'variable',
    strokewidth: sw === 'inherit' ? 'inherit' : Number.isFinite(Number(sw)) && sw !== null && sw !== '' ? Number(sw) : 1,
    connections: connections.map((c) => ({
      x: num(c, 'x'),
      y: num(c, 'y'),
      perimeter: c.getAttribute('perimeter') !== '0',
      ...(c.getAttribute('name') ? { name: c.getAttribute('name')! } : {}),
    })),
    background: parseOps(child(shape, 'background'), unsupported),
    foreground: parseOps(child(shape, 'foreground'), unsupported),
    unsupported,
  };
}

function parseXml(xml: string): Document {
  const dom = new DOMParser().parseFromString(xml.trim(), 'text/xml');
  const err = dom.querySelector('parsererror');
  if (err) throw new StencilError(`Invalid XML: ${(err.textContent ?? '').split('\n')[0].trim() || 'parse error'}`);
  return dom;
}

const CACHE = new Map<string, Stencil>();

/**
 * Parses stencil XML (a `<shape>` root, or the first shape of a `<shapes>`
 * set). Throws a `StencilError` with a readable message on bad input.
 */
export function parseStencil(xml: string): Stencil {
  const hit = CACHE.get(xml);
  if (hit) return hit;
  const dom = parseXml(xml);
  const root = dom.documentElement;
  const shape = root.tagName.toLowerCase() === 'shape' ? root : root.querySelector('shape');
  if (!shape) throw new StencilError('Expected a <shape> element.');
  const stencil = stencilFromElement(shape);
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(xml, stencil);
  return stencil;
}

/** Like `parseStencil` but returns null instead of throwing. */
export function tryParseStencil(xml: string | undefined): Stencil | null {
  if (!xml) return null;
  try {
    return parseStencil(xml);
  } catch {
    return null;
  }
}

/** Splits a `<shapes>` stencil set (or a lone `<shape>`) into one XML string per shape. */
export function splitStencilSet(xml: string): Array<{ name: string; xml: string; w: number; h: number }> {
  const dom = parseXml(xml);
  const root = dom.documentElement;
  const shapes = root.tagName.toLowerCase() === 'shape' ? [root] : Array.from(root.querySelectorAll('shape'));
  const ser = new XMLSerializer();
  return shapes.map((s) => ({
    name: s.getAttribute('name') ?? 'Shape',
    xml: ser.serializeToString(s),
    w: num(s, 'w', 100) || 100,
    h: num(s, 'h', 100) || 100,
  }));
}

/** Connection points as fractions of the shape bounds. */
export function stencilConnections(xml: string | undefined): StencilConnection[] {
  return tryParseStencil(xml)?.connections ?? [];
}

/** Stencil connection constraints as `ShapeElement.connectionPoints`, or undefined when it declares none. */
export function stencilPoints(xml: string | undefined): Array<{ x: number; y: number }> | undefined {
  const cs = stencilConnections(xml);
  return cs.length ? cs.map(({ x, y }) => ({ x, y })) : undefined;
}
