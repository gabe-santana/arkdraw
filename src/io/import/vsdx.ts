/**
 * Visio (.vsdx drawings, .vssx stencils) import, best effort.
 *
 * Unzips with fflate and reads `visio/pages/pages.xml` (+ rels) for the page
 * list, every foreground `pageN.xml` for shapes, and `visio/masters/*` so that
 * shapes inherit cells (size, colours, geometry) from their master and master
 * names (Process, Decision, Start/End, Database, Document, …) map onto
 * ArkDraw kinds; masterless shapes fall back to their geometry (ellipse /
 * rectangle / text). Coordinates are inches with the y axis pointing up:
 *
 *   left = PinX − LocPinX, top = PageHeight − (PinY − LocPinY + Height), × 96 px
 *
 * Groups are flattened (children are relative to the group's local origin)
 * and kept as ArkDraw groups; 1-D shapes become connectors, attached through
 * `Connects` (FromCell BeginX/EndX → ToSheet), with BeginX/EndX as the free
 * end position. Angle → rotation, FillForegnd/LineColor/LineWeight/LinePattern
 * and the first Character row (Color/Size/Style) → style, embedded images
 * (Foreign shapes) → image shapes. Background pages, themes and style sheets
 * are not read. A .vssx stencil becomes one page listing its masters.
 */
import { unzipSync } from 'fflate';
import type { ArrowHead, ConnectorElement, DiagramElement, ElementStyle, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { uid } from '@/lib/id';
import type { ImportResult, ImportedPage, Importer } from './types';
import { base64Encode, endpointAt, hasKind, kid, kids, latin1Decode, makeDoc, parseXml, pickKind, utf8Decode } from './_shared';

const DPI = 96;

type Files = Record<string, Uint8Array>;

interface VShape {
  id: string;
  type: string;
  cells: Map<string, { v: string; f?: string }>;
  sections: Element[];
  text?: string;
  masterId?: string;
  masterShapeId?: string;
  name: string;
  children: VShape[];
  foreignRel?: string;
}

interface Master {
  id: string;
  name: string;
  shapes: Map<string, VShape>;
  top?: VShape;
}

// ---------------------------------------------------------------------------
// Zip / XML helpers
// ---------------------------------------------------------------------------

function resolvePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function fileText(files: Files, path: string): string | undefined {
  const key = Object.keys(files).find((k) => k.toLowerCase() === path.toLowerCase());
  return key ? utf8Decode(files[key]) : undefined;
}

/** Relationship id → resolved part path, for `dir/name.xml` via `dir/_rels/name.xml.rels`. */
function rels(files: Files, part: string): Map<string, string> {
  const dir = part.split('/').slice(0, -1).join('/');
  const name = part.split('/').pop();
  const text = fileText(files, `${dir}/_rels/${name}.rels`);
  const out = new Map<string, string>();
  if (!text) return out;
  for (const r of Array.from(parseXml(text).getElementsByTagName('*'))) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) out.set(id, resolvePath(part, target));
  }
  return out;
}

const relId = (el: Element | undefined) => el?.getAttribute('r:id') ?? el?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? undefined;

function readShape(el: Element): VShape {
  const cells = new Map<string, { v: string; f?: string }>();
  for (const c of kids(el, 'Cell')) {
    const n = c.getAttribute('N');
    if (n) cells.set(n, { v: c.getAttribute('V') ?? '', f: c.getAttribute('F') ?? undefined });
  }
  const textEl = kid(el, 'Text');
  const foreign = kid(el, 'ForeignData');
  return {
    id: el.getAttribute('ID') ?? '',
    type: el.getAttribute('Type') ?? 'Shape',
    cells,
    sections: kids(el, 'Section'),
    text: textEl ? (textEl.textContent ?? '').replace(/\u2028|\u2029|\r\n?/g, '\n').trim() : undefined,
    masterId: el.getAttribute('Master') ?? undefined,
    masterShapeId: el.getAttribute('MasterShape') ?? undefined,
    name: el.getAttribute('NameU') ?? el.getAttribute('Name') ?? '',
    children: kids(kid(el, 'Shapes'), 'Shape').map(readShape),
    foreignRel: relId(kid(foreign, 'Rel')),
  };
}

function indexShapes(list: VShape[], into: Map<string, VShape>) {
  for (const s of list) {
    into.set(s.id, s);
    indexShapes(s.children, into);
  }
}

function loadMasters(files: Files): Map<string, Master> {
  const masters = new Map<string, Master>();
  const path = 'visio/masters/masters.xml';
  const text = fileText(files, path);
  if (!text) return masters;
  const relMap = rels(files, path);
  for (const m of kids(parseXml(text).documentElement, 'Master')) {
    const id = m.getAttribute('ID') ?? '';
    const name = (m.getAttribute('NameU') ?? m.getAttribute('Name') ?? '').replace(/\.\d+$/, '');
    const part = relMap.get(relId(kid(m, 'Rel')) ?? '');
    const shapes = new Map<string, VShape>();
    let top: VShape | undefined;
    const content = part ? fileText(files, part) : undefined;
    if (content) {
      const list = kids(kid(parseXml(content).documentElement, 'Shapes'), 'Shape').map(readShape);
      top = list[0];
      indexShapes(list, shapes);
    }
    masters.set(id, { id, name, shapes, top });
  }
  return masters;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const MASTER_KINDS: Array<[RegExp, string[], Partial<ElementStyle>?]> = [
  [/dynamic connector|^connector|^line|curved connector|straight connector/, ['__connector']],
  [/start\/end|terminator|^terminal/, ['flow.terminator']],
  [/decision|diamond|rhombus/, ['diamond']],
  [/predefined process|subprocess|sub-process/, ['flow.predefined']],
  [/multiple documents|document/, ['flow.document']],
  [/database|data store|stored data|direct data|disk|cylinder/, ['cylinder']],
  [/internal storage/, ['flow.internalStorage']],
  [/manual input/, ['flow.manualInput']],
  [/manual operation/, ['flow.manualOperation']],
  [/delay/, ['flow.delay']],
  [/off-page|off page/, ['flow.offPage']],
  [/on-page|on page|^circle|ellipse|oval/, ['ellipse']],
  [/^data$|input\/output|parallelogram/, ['parallelogram']],
  [/preparation|hexagon/, ['hexagon']],
  [/trapezoid/, ['trapezoid']],
  [/triangle/, ['triangle']],
  [/cloud/, ['cloud']],
  [/callout/, ['callout']],
  [/note|annotation|comment/, ['uml.note']],
  [/actor|stick figure|person/, ['uml.actor']],
  [/class/, ['uml.class']],
  [/lifeline/, ['uml.lifeline']],
  [/package/, ['uml.package']],
  [/component/, ['uml.component']],
  [/^node/, ['uml.node']],
  [/entity|table/, ['erd.entity']],
  [/container|swimlane|swim lane|pool|lane|cfF/, ['container']],
  [/^text|text block/, ['text']],
  [/rounded rectangle/, ['rectangle'], { radius: 10 }],
  [/rectangle|square|process|box/, ['rectangle'], { radius: 0 }],
];

const VISIO_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#c0c0c0', '#e6e6e6',
  '#cdcdcd', '#b3b3b3', '#9a9a9a', '#808080', '#666666', '#4d4d4d', '#333333', '#1a1a1a',
];

function color(v: string | undefined): string | undefined {
  if (!v || v === 'Themed') return undefined;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0 && n < VISIO_COLORS.length) return VISIO_COLORS[n];
  const rgb = /RGB\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(v);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((x) => Math.min(255, +x).toString(16).padStart(2, '0')).join('');
  return undefined;
}

function arrow(v: string | undefined): ArrowHead {
  const n = Number(v ?? 0);
  if (!n) return 'none';
  if ([1, 2, 3, 9, 10].includes(n)) return 'arrow';
  if ([6, 7, 8].includes(n)) return 'triangleOpen';
  if ([20, 21].includes(n)) return 'circle';
  if ([22, 23, 24].includes(n)) return 'diamond';
  if (n === 29 || n === 30) return 'erOne';
  if (n >= 31 && n <= 45) return 'erMany';
  return 'triangle';
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', emf: 'image/emf', wmf: 'image/wmf' };

// ---------------------------------------------------------------------------
// Page conversion
// ---------------------------------------------------------------------------

interface Ctx {
  masters: Map<string, Master>;
  files: Files;
  pageRels: Map<string, string>;
  pageH: number;
  shapes: Map<string, ShapeElement>;
  oneD: Array<{ s: VShape; cell: (n: string) => string | undefined; ox: number; oy: number; groups: string[] }>;
  containers: ShapeElement[];
  leaves: ShapeElement[];
  warn: (m: string) => void;
  unknownMasters: Set<string>;
  rotated: number;
}

function convertShape(ctx: Ctx, s: VShape, ox: number, oy: number, groups: string[], masterId?: string) {
  const mid = s.masterId ?? masterId;
  const master = mid ? ctx.masters.get(mid) : undefined;
  const ms = master ? (s.masterShapeId ? master.shapes.get(s.masterShapeId) : master.top) : undefined;
  const cell = (n: string) => s.cells.get(n)?.v ?? ms?.cells.get(n)?.v;
  const num = (n: string, d = 0) => {
    const v = Number(cell(n));
    return Number.isFinite(v) ? v : d;
  };
  const masterName = (s.masterShapeId ? ms?.name || master?.name : master?.name) ?? '';
  const mapped = MASTER_KINDS.find(([re]) => re.test(masterName.toLowerCase()));
  const hasBegin = cell('BeginX') !== undefined && cell('EndX') !== undefined;
  if (hasBegin || mapped?.[1][0] === '__connector') {
    ctx.oneD.push({ s, cell, ox, oy, groups });
    return;
  }

  const w = num('Width', 1);
  const h = num('Height', 0.75);
  const pinX = ox + num('PinX');
  const pinY = oy + num('PinY');
  const left = pinX - num('LocPinX', w / 2);
  const bottom = pinY - num('LocPinY', h / 2);
  const rect = { x: Math.round(left * DPI), y: Math.round((ctx.pageH - bottom - h) * DPI), w: Math.max(1, Math.round(w * DPI)), h: Math.max(1, Math.round(h * DPI)) };

  if (s.type === 'Group') {
    const gid = uid();
    if (s.text) {
      const t = createShape('text', rect, { fill: 'none', stroke: 'none' }, s.text);
      t.groupIds = [gid, ...groups];
      ctx.leaves.push(t);
      ctx.shapes.set(s.id, t);
    }
    for (const c of s.children) convertShape(ctx, c, left, bottom, [gid, ...groups], mid);
    return;
  }

  const geometry = s.sections.filter((x) => x.getAttribute('N') === 'Geometry');
  const geo = geometry.length ? geometry : (ms?.sections ?? []).filter((x) => x.getAttribute('N') === 'Geometry');
  const rowsOf = (g: Element) => kids(g, 'Row');
  const geoCell = (g: Element, n: string) => kids(g, 'Cell').find((c) => c.getAttribute('N') === n)?.getAttribute('V');
  const isEllipse = geo.some((g) => rowsOf(g).some((r) => r.getAttribute('T') === 'Ellipse'));
  const invisible = geo.length > 0 && geo.every((g) => geoCell(g, 'NoShow') === '1' || (geoCell(g, 'NoFill') === '1' && geoCell(g, 'NoLine') === '1'));

  let kind = 'rectangle';
  const style: Partial<ElementStyle> = { radius: 0 };
  if (s.type === 'Foreign') kind = pickKind('image', 'icon');
  else if (mapped) {
    kind = pickKind(...mapped[1]);
    Object.assign(style, mapped[2] ?? {});
  } else {
    if (masterName) ctx.unknownMasters.add(masterName);
    kind = isEllipse ? 'ellipse' : (invisible || !geo.length) && s.text ? 'text' : 'rectangle';
  }
  if (num('Rounding') > 0 && kind === 'rectangle') style.radius = Math.round(num('Rounding') * DPI);

  const fill = color(cell('FillForegnd'));
  if (fill) style.fill = fill;
  if (cell('FillPattern') === '0' || kind === 'text') style.fill = 'none';
  const line = color(cell('LineColor'));
  if (line) style.stroke = line;
  const lp = cell('LinePattern');
  if (lp === '0' || kind === 'text') style.stroke = 'none';
  else if (lp && lp !== '1') style.strokeStyle = ['3', '10', '16'].includes(lp) ? 'dotted' : 'dashed';
  if (cell('LineWeight') !== undefined) style.strokeWidth = Math.max(0.5, Math.round(num('LineWeight', 0.01) * DPI * 4) / 4);
  const ch = s.sections.find((x) => x.getAttribute('N') === 'Character') ?? ms?.sections.find((x) => x.getAttribute('N') === 'Character');
  const row0 = ch ? kids(ch, 'Row')[0] : undefined;
  const chCell = (n: string) => (row0 ? kids(row0, 'Cell').find((c) => c.getAttribute('N') === n)?.getAttribute('V') : undefined) ?? undefined;
  const tc = color(chCell('Color'));
  if (tc) style.textColor = tc;
  const size = Number(chCell('Size'));
  if (Number.isFinite(size) && size > 0) style.fontSize = Math.round(size * DPI);
  const cs = Number(chCell('Style') ?? 0);
  if (cs & 1) style.bold = true;
  if (cs & 2) style.italic = true;
  if (cs & 4) style.underline = true;
  if (kind === 'container') Object.assign(style, { verticalAlign: 'top', bold: true });

  const shape = createShape(kind, rect, style, s.text ?? '');
  if (s.type === 'Foreign') {
    const target = ctx.pageRels.get(s.foreignRel ?? '');
    const key = target && Object.keys(ctx.files).find((k) => k.toLowerCase() === target.toLowerCase());
    const ext = (target ?? '').split('.').pop()?.toLowerCase() ?? '';
    if (key && MIME[ext] && hasKind(kind) && kind !== 'rectangle') shape.icon = `data:${MIME[ext]};base64,${base64Encode(ctx.files[key])}`;
    else {
      shape.kind = 'rectangle';
      ctx.warn('Some embedded objects (OLE / unsupported images) became rectangles.');
    }
  }
  const angle = num('Angle');
  if (angle) {
    let deg = Math.round(((-angle * 180) / Math.PI) * 100) / 100;
    deg = ((deg % 360) + 360) % 360;
    if (deg) {
      shape.rotation = deg;
      ctx.rotated++;
    }
  }
  if (s.name && !/^(Sheet|Shape)\.\d+$/.test(s.name)) shape.name = s.name;
  shape.groupIds = [...groups];
  ctx.shapes.set(s.id, shape);
  (kind === 'container' ? ctx.containers : ctx.leaves).push(shape);
}

function convertPage(files: Files, part: string, name: string, pageH: number, masters: Map<string, Master>, warn: (m: string) => void): ImportedPage {
  const text = fileText(files, part);
  if (!text) throw new Error(`Missing page part ${part}.`);
  const root = parseXml(text).documentElement;
  const top = kids(kid(root, 'Shapes'), 'Shape').map(readShape);
  const ctx: Ctx = {
    masters, files, pageRels: rels(files, part), pageH, shapes: new Map(), oneD: [], containers: [], leaves: [], warn,
    unknownMasters: new Set(), rotated: 0,
  };
  // Page height fallback: highest shape top.
  if (!ctx.pageH) {
    let maxTop = 0;
    const walk = (list: VShape[]) => {
      for (const s of list) {
        const v = (n: string) => Number(s.cells.get(n)?.v ?? 0) || 0;
        maxTop = Math.max(maxTop, v('PinY') + v('Height') / 2, v('BeginY'), v('EndY'));
      }
    };
    walk(top);
    ctx.pageH = maxTop + 0.5;
  }
  for (const s of top) convertShape(ctx, s, 0, 0, []);

  // Connects: connector sheet → { begin, end } target sheets.
  const links = new Map<string, { begin?: string; end?: string }>();
  for (const c of kids(kid(root, 'Connects'), 'Connect')) {
    const from = c.getAttribute('FromSheet') ?? '';
    const cellName = c.getAttribute('FromCell') ?? '';
    const to = c.getAttribute('ToSheet') ?? '';
    const l = links.get(from) ?? {};
    if (cellName === 'BeginX') l.begin = to;
    else if (cellName === 'EndX') l.end = to;
    links.set(from, l);
  }
  const connectors: ConnectorElement[] = [];
  for (const { s, cell, ox, oy, groups } of ctx.oneD) {
    const v = (n: string) => Number(cell(n) ?? NaN);
    const pt = (x: number, y: number) => ({ x: (ox + x) * DPI, y: (ctx.pageH - (oy + y)) * DPI });
    const l = links.get(s.id) ?? {};
    const a = l.begin ? ctx.shapes.get(l.begin) : undefined;
    const b = l.end ? ctx.shapes.get(l.end) : undefined;
    const center = (sh: ShapeElement) => ({ x: sh.x + sh.w / 2, y: sh.y + sh.h / 2 });
    const p0 = Number.isFinite(v('BeginX')) ? pt(v('BeginX'), v('BeginY')) : a ? center(a) : null;
    const p1 = Number.isFinite(v('EndX')) ? pt(v('EndX'), v('EndY')) : b ? center(b) : null;
    if (!p0 || !p1) {
      warn('Some connectors without coordinates were skipped.');
      continue;
    }
    const lp = cell('LinePattern');
    const conn = createConnector(endpointAt(a, p0), endpointAt(b, p1), {
      routing: cell('ShapeRouteStyle') !== undefined || /connector/i.test(s.name) || (a && b) ? 'orthogonal' : 'straight',
      startArrow: arrow(cell('BeginArrow')),
      endArrow: arrow(cell('EndArrow')),
      text: s.text ?? '',
    });
    conn.style = {
      ...conn.style,
      ...(color(cell('LineColor')) ? { stroke: color(cell('LineColor'))! } : {}),
      ...(cell('LineWeight') !== undefined ? { strokeWidth: Math.max(0.5, Math.round((Number(cell('LineWeight')) || 0.01) * DPI * 4) / 4) } : {}),
      ...(lp && lp !== '0' && lp !== '1' ? { strokeStyle: 'dashed' as const } : {}),
    };
    conn.groupIds = [...groups];
    connectors.push(conn);
  }
  if (ctx.unknownMasters.size) warn(`Unmapped Visio masters drawn as rectangles: ${[...ctx.unknownMasters].slice(0, 8).join(', ')}.`);

  // Geometric containment for container kinds.
  for (const s of ctx.leaves) {
    let best: ShapeElement | undefined;
    for (const c of ctx.containers) {
      if (s.x >= c.x && s.y >= c.y && s.x + s.w <= c.x + c.w && s.y + s.h <= c.y + c.h && (!best || c.w * c.h < best.w * best.h)) best = c;
    }
    if (best) s.containerId = best.id;
  }
  const elements: DiagramElement[] = [...ctx.containers, ...ctx.leaves, ...connectors];
  return { name, doc: makeDoc(elements) };
}

function stencilPage(masters: Map<string, Master>): ImportedPage {
  const elements: DiagramElement[] = [];
  let i = 0;
  for (const m of masters.values()) {
    const mapped = MASTER_KINDS.find(([re]) => re.test(m.name.toLowerCase()));
    const kind = mapped && mapped[1][0] !== '__connector' ? pickKind(...mapped[1]) : 'rectangle';
    const col = i % 6;
    const row = Math.floor(i / 6);
    elements.push(createShape(kind, { x: col * 180, y: row * 130, w: 140, h: 80 }, { ...(mapped?.[2] ?? {}), fontSize: 12 }, m.name));
    i++;
  }
  return { name: 'Stencil', doc: makeDoc(elements) };
}

export function importVsdx(content: Uint8Array): ImportResult {
  let files: Files;
  try {
    files = unzipSync(content);
  } catch {
    throw new Error('This is not a valid .vsdx/.vssx file (not a zip archive).');
  }
  const warnings: string[] = [];
  const warn = (m: string) => {
    if (!warnings.includes(m)) warnings.push(m);
  };
  const masters = loadMasters(files);
  const pagesPath = 'visio/pages/pages.xml';
  const pagesXml = fileText(files, pagesPath);
  if (!pagesXml) {
    if (masters.size) return { pages: [stencilPage(masters)], warnings };
    throw new Error('No Visio pages found in this file.');
  }
  const relMap = rels(files, pagesPath);
  const pages: ImportedPage[] = [];
  let background = 0;
  kids(parseXml(pagesXml).documentElement, 'Page').forEach((p, i) => {
    if (p.getAttribute('Background') === '1') {
      background++;
      return;
    }
    const sheet = kid(p, 'PageSheet');
    const h = Number(kids(sheet, 'Cell').find((c) => c.getAttribute('N') === 'PageHeight')?.getAttribute('V'));
    const part = relMap.get(relId(kid(p, 'Rel')) ?? '') ?? `visio/pages/page${i + 1}.xml`;
    const name = p.getAttribute('Name') ?? p.getAttribute('NameU') ?? `Page-${i + 1}`;
    pages.push(convertPage(files, part, name, Number.isFinite(h) ? h : 0, masters, warn));
  });
  if (background) warnings.push(`${background} background page(s) were skipped.`);
  const rotated = pages.reduce((n, p) => n + Object.values(p.doc.elements).filter((e) => e.type === 'shape' && e.rotation).length, 0);
  if (rotated) warnings.push(`${rotated} rotated shape(s) imported; rotation is approximated around the shape center.`);
  if (!pages.length) throw new Error('This Visio file has no foreground pages.');
  return { pages, warnings };
}

export const importer: Importer = {
  id: 'vsdx',
  label: 'Visio (.vsdx)…',
  description: 'Microsoft Visio drawings and stencils (.vsdx, .vssx): shapes, text, connectors, groups and pages.',
  extensions: ['vsdx', 'vssx'],
  acceptsText: false,
  detect: (content, fileName) =>
    /\.(vsdx|vssx)$/i.test(fileName ?? '') ||
    (typeof content !== 'string' && content[0] === 0x50 && content[1] === 0x4b && latin1Decode(content.subarray(0, 4000)).includes('visio/')),
  run: async (content) => {
    if (typeof content === 'string') throw new Error('Visio files must be opened as binary files.');
    return importVsdx(content);
  },
};
