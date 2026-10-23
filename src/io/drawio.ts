/**
 * draw.io / diagrams.net interop.
 *
 * Export writes an uncompressed `.drawio` file (mxGraphModel XML) with
 * native draw.io styles, so diagrams stay editable after migrating.
 * Import reads both plain and compressed (deflate + base64) files and maps
 * common draw.io shapes back to OpenDraw kinds; unknown stencils become
 * labeled rectangles so nothing is silently lost.
 */
import type {
  Layer,
  AnchorSide, ArrowHead, ConnectorElement, DiagramElement, Doc, ElementStyle, Endpoint, ShapeElement,
} from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { createConnector, createShape, DEFAULT_STYLE } from '@/model/defaults';
import { SHAPES, getShapeDef, splitSections } from '@/shapes/registry';
import { uid } from '@/lib/id';
import { inlineIcons } from './export/svg';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

type StyleMap = Map<string, string>;

export function parseStyle(style: string): StyleMap {
  const m: StyleMap = new Map();
  for (const part of style.split(';')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq < 0) m.set(part, '');
    else m.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return m;
}

const styleString = (m: StyleMap) => [...m].map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join(';') + ';';

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
const htmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT_TO_DRAWIO: Record<ElementStyle['fontFamily'], string> = { sans: 'Helvetica', serif: 'Georgia', mono: 'Courier New', hand: 'Architects Daughter' };

const ARROW_TO_DRAWIO: Record<ArrowHead, [string, 0 | 1]> = {
  none: ['none', 0],
  arrow: ['open', 0],
  triangle: ['block', 1],
  triangleOpen: ['block', 0],
  diamond: ['diamond', 1],
  diamondOpen: ['diamond', 0],
  circle: ['oval', 1],
  circleOpen: ['oval', 0],
  erOne: ['ERone', 0],
  erOnlyOne: ['ERmandOne', 0],
  erMany: ['ERmany', 0],
  erOneMany: ['ERoneToMany', 0],
  erZeroMany: ['ERzeroToMany', 0],
  erZeroOne: ['ERzeroToOne', 0],
  dash: ['dash', 0],
  cross: ['cross', 0],
  halfArrow: ['openAsync', 0],
  async: ['async', 1],
  box: ['box', 1],
  boxOpen: ['box', 0],
};

const SIDE_TO_XY: Record<AnchorSide, [number, number]> = { top: [0.5, 0], right: [1, 0.5], bottom: [0.5, 1], left: [0, 0.5] };

/** draw.io only understands #rrggbb; split rgba() into color + opacity. */
function hexAndAlpha(c: string): [string, number | null] {
  const m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (!m) return [c, null];
  const hex = '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
  return [hex, m[4] !== undefined ? Number(m[4]) : null];
}

function applyCommonStyle(m: StyleMap, s: ElementStyle, isEdge: boolean) {
  if (!isEdge) {
    const [fill, alpha] = s.fill === 'none' ? ['none', null] : hexAndAlpha(s.fill);
    m.set('fillColor', fill);
    const fo = alpha ?? s.fillOpacity;
    if (fo !== undefined && fo !== null && fo < 1) m.set('fillOpacity', String(Math.round(fo * 100)));
  }
  if (s.strokeOpacity !== undefined && s.strokeOpacity < 1) m.set('strokeOpacity', String(Math.round(s.strokeOpacity * 100)));
  m.set('strokeColor', s.stroke === 'none' ? 'none' : s.stroke);
  m.set('strokeWidth', String(s.strokeWidth));
  m.set('fontColor', s.textColor);
  m.set('fontSize', String(s.fontSize));
  m.set('fontFamily', FONT_TO_DRAWIO[s.fontFamily]);
  m.set('fontStyle', String((s.bold ? 1 : 0) | (s.italic ? 2 : 0)));
  if (!isEdge) {
    if (!m.has('align')) m.set('align', s.textAlign);
    if (!m.has('verticalAlign')) m.set('verticalAlign', s.verticalAlign);
  }
  if (s.opacity < 1) m.set('opacity', String(Math.round(s.opacity * 100)));
  if (s.strokeStyle !== 'solid') {
    m.set('dashed', '1');
    if (s.strokeStyle === 'dotted') m.set('dashPattern', '1 3');
  }
  if (s.shadow) m.set('shadow', '1');
  m.set('html', '1');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function compartmentsHtml(text: string): string {
  const [head, ...rest] = splitSections(text);
  // The last header line is the class name (earlier lines are stereotypes like «interface»).
  const header = head
    .map((l, i) => {
      const t = i === head.length - 1 ? `<b>${htmlEscape(l)}</b>` : htmlEscape(l);
      return `<p style="margin:0px;margin-top:4px;text-align:center;">${t}</p>`;
    })
    .join('');
  const body = rest.map((sec) => sec.map((l) => `<p style="margin:0px;margin-left:6px;">${htmlEscape(l) || '&nbsp;'}</p>`).join(''));
  return [header, ...body].join('<hr size="1" style="border-style:solid;"/>');
}

function c4Html(text: string): string {
  const [name = '', ...rest] = text.split('\n');
  let type = '';
  if (rest[0]?.trim().startsWith('[')) type = rest.shift()!;
  const desc = rest.join('\n').trim();
  return (
    `<font style="font-size:16px"><b>${htmlEscape(name)}</b></font>` +
    (type ? `<div>${htmlEscape(type)}</div>` : '') +
    (desc ? `<br><div><font style="font-size:11px">${htmlEscape(desc).replace(/\n/g, '<br>')}</font></div>` : '')
  );
}

const plainHtml = (text: string) => htmlEscape(text).replace(/\n/g, '<br>');

/** Wraps a cell in <UserObject> when it carries metadata (tooltip, link, custom data). */
function withUserObject(el: DiagramElement, label: string, cell: string): string {
  const attrs: string[] = [];
  if (el.tooltip) attrs.push(`tooltip="${xmlEscape(el.tooltip)}"`);
  if (el.link) attrs.push(`link="${xmlEscape(el.link.startsWith('page:') ? `data:page/id,${el.link.slice(5)}` : el.link)}"`);
  if (el.tags?.length) attrs.push(`tags="${xmlEscape(el.tags.join(' '))}"`);
  for (const [k, v] of Object.entries(el.data ?? {})) if (/^[A-Za-z_][\w.-]*$/.test(k) && k !== 'label' && k !== 'id') attrs.push(`${k}="${xmlEscape(v)}"`);
  if (!attrs.length) return cell;
  // Inside a UserObject the mxCell loses its id/value; the wrapper carries them.
  const inner = cell.replace(/^<mxCell id="[^"]*" value="[^"]*"/, '<mxCell');
  return `<UserObject label="${xmlEscape(label)}" id="${el.id}" ${attrs.join(' ')}>${inner}</UserObject>`;
}

/** One page as a <diagram> element. */
function diagramXml(doc: Doc, title: string, iconHref: (p: string) => string): string {
  const els = doc.order.map((id) => doc.elements[id]);
  const layers = doc.layers ?? [{ id: '1', name: 'Background', visible: true, locked: false }];
  const layerIdOf = (el: DiagramElement) => (doc.layers ? (el.layerId && doc.layers.some((l) => l.id === el.layerId) ? el.layerId : layers[0].id) : '1');
  // Containers must precede their children.
  const emitted = new Set<string>();
  const cells: string[] = [];
  const vertexIds = new Set(els.filter(isShape).map((e) => e.id));

  const emitShape = (el: ShapeElement) => {
    if (emitted.has(el.id)) return;
    const parent = el.containerId && vertexIds.has(el.containerId) ? (doc.elements[el.containerId] as ShapeElement) : null;
    if (parent) emitShape(parent);
    emitted.add(el.id);
    const def = getShapeDef(el.kind);
    const m = parseStyle(def.drawio);
    let value = plainHtml(el.text);
    if (el.kind === 'uml.class' || el.kind === 'erd.entity') {
      for (const k of ['swimlane', 'childLayout', 'fontStyle']) m.delete(k);
      m.set('verticalAlign', 'top');
      m.set('align', 'left');
      m.set('overflow', 'fill');
      m.set('rounded', el.style.radius > 0 ? '1' : '0');
      value = compartmentsHtml(el.text);
    } else if (el.kind.startsWith('c4.')) {
      value = c4Html(el.text);
    }
    if (def.rounded && el.kind !== 'uml.class' && el.kind !== 'erd.entity') {
      m.set('rounded', el.style.radius > 0 ? '1' : '0');
      if (el.style.radius > 0) {
        m.set('absoluteArcSize', '1');
        m.set('arcSize', String(el.style.radius * 2));
      }
    }
    if (el.kind === 'icon' && el.icon) {
      const uri = iconHref(el.icon);
      // draw.io expects "data:<mime>,<base64>" (no ";base64" marker).
      if (uri.startsWith('data:')) m.set('image', uri.replace(';base64', ''));
    }
    applyCommonStyle(m, el.style, false);
    if (def.textPlacement === 'below') {
      m.set('verticalLabelPosition', 'bottom');
      m.set('verticalAlign', 'top');
    }
    if (el.rotation) m.set('rotation', String(round(el.rotation)));
    if (el.flipH) m.set('flipH', '1');
    if (el.flipV) m.set('flipV', '1');
    if (el.style.gradient) {
      m.set('gradientColor', el.style.gradient);
      if (el.style.gradientDirection && el.style.gradientDirection !== 'south') m.set('gradientDirection', el.style.gradientDirection);
    }
    if (el.style.sketch) m.set('sketch', '1');
    if (el.style.glass) m.set('glass', '1');
    if (el.collapsed) m.set('collapsible', '1');
    const ox = parent ? parent.x : 0;
    const oy = parent ? parent.y : 0;
    const cell =
      `<mxCell id="${el.id}" value="${xmlEscape(value)}" style="${xmlEscape(styleString(m))}" vertex="1" parent="${parent ? parent.id : layerIdOf(el)}"${el.collapsed ? ' collapsed="1"' : ''}>` +
      `<mxGeometry x="${round(el.x - ox)}" y="${round(el.y - oy)}" width="${round(el.w)}" height="${round(el.h)}" as="geometry"/></mxCell>`;
    cells.push(withUserObject(el, value, cell));
  };

  for (const el of els) if (isShape(el)) emitShape(el);

  for (const el of els) {
    if (!isConnector(el)) continue;
    const m: StyleMap = new Map();
    if (el.routing === 'orthogonal') {
      m.set('edgeStyle', 'orthogonalEdgeStyle');
      m.set('rounded', '1');
    } else if (el.routing === 'curved') {
      m.set('edgeStyle', 'orthogonalEdgeStyle');
      m.set('curved', '1');
    }
    const [endArrow, endFill] = ARROW_TO_DRAWIO[el.endArrow];
    const [startArrow, startFill] = ARROW_TO_DRAWIO[el.startArrow];
    m.set('endArrow', endArrow);
    m.set('endFill', String(endFill));
    m.set('startArrow', startArrow);
    m.set('startFill', String(startFill));
    for (const [end, prefix] of [['source', 'exit'], ['target', 'entry']] as const) {
      const side = el[end].side;
      if (el[end].elementId && side && side !== 'auto') {
        const [x, y] = SIDE_TO_XY[side];
        m.set(`${prefix}X`, String(x));
        m.set(`${prefix}Y`, String(y));
        m.set(`${prefix}Dx`, '0');
        m.set(`${prefix}Dy`, '0');
      }
    }
    if (el.animation?.kind === 'flow') m.set('flowAnimation', '1');
    if (el.routing === 'elbow-h' || el.routing === 'elbow-v') {
      m.set('edgeStyle', 'elbowEdgeStyle');
      m.set('elbow', el.routing === 'elbow-v' ? 'vertical' : 'horizontal');
    } else if (el.routing === 'entity') m.set('edgeStyle', 'entityRelationEdgeStyle');
    else if (el.routing === 'isometric') m.set('edgeStyle', 'isometricEdgeStyle');
    if (el.lineJumps && el.lineJumps !== 'none') m.set('jumpStyle', el.lineJumps);
    if (el.connectorShape === 'pipe') m.set('shape', 'pipe');
    if (el.connectorShape === 'arrow') m.set('shape', 'flexArrow');
    applyCommonStyle(m, el.style, true);
    const src = el.source.elementId && vertexIds.has(el.source.elementId) ? ` source="${el.source.elementId}"` : '';
    const tgt = el.target.elementId && vertexIds.has(el.target.elementId) ? ` target="${el.target.elementId}"` : '';
    const points = el.waypoints?.length
      ? `<Array as="points">${el.waypoints.map((p) => `<mxPoint x="${round(p.x)}" y="${round(p.y)}"/>`).join('')}</Array>`
      : '';
    const label = plainHtml(el.text);
    const cell =
      `<mxCell id="${el.id}" value="${xmlEscape(label)}" style="${xmlEscape(styleString(m))}" edge="1" parent="${layerIdOf(el)}"${src}${tgt}>` +
      `<mxGeometry relative="1" as="geometry">` +
      `<mxPoint x="${round(el.source.x)}" y="${round(el.source.y)}" as="sourcePoint"/>` +
      `<mxPoint x="${round(el.target.x)}" y="${round(el.target.y)}" as="targetPoint"/>` +
      points +
      `</mxGeometry></mxCell>`;
    cells.push(withUserObject(el, label, cell));
  }

  const layerCells = layers.map(
    (l) =>
      `<mxCell id="${xmlEscape(l.id)}" ${doc.layers ? `value="${xmlEscape(l.name)}" ` : ''}parent="0"${l.visible ? '' : ' visible="0"'}${l.locked ? ' style="locked=1;"' : ''}/>`,
  );
  return (
    `  <diagram id="${uid()}" name="${xmlEscape(title)}">\n` +
    `    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">\n` +
    `      <root>\n        <mxCell id="0"/>\n` +
    layerCells.map((c) => `        ${c}\n`).join('') +
    cells.map((c) => `        ${c}\n`).join('') +
    `      </root>\n    </mxGraphModel>\n  </diagram>\n`
  );
}

const mxfile = (diagrams: string[]) =>
  `<mxfile host="OpenDraw" agent="OpenDraw ${__APP_VERSION__}" version="24.7.0" type="device">\n${diagrams.join('')}</mxfile>\n`;

/** Single page. */
export async function exportDrawio(doc: Doc, title = 'Page-1'): Promise<string> {
  const iconHref = await inlineIcons(doc.order.map((id) => doc.elements[id]));
  return mxfile([diagramXml(doc, title, iconHref)]);
}

/** Every page as a separate draw.io page. */
export async function exportDrawioPages(pages: Array<{ name: string; doc: Doc }>): Promise<string> {
  const iconHref = await inlineIcons(pages.flatMap((p) => p.doc.order.map((id) => p.doc.elements[id])));
  return mxfile(pages.map((p) => diagramXml(p.doc, p.name, iconHref)));
}

const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Reverse index: draw.io shape name / base style → OpenDraw kind. */
const KIND_BY_DRAWIO: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const def of Object.values(SHAPES)) {
    const st = parseStyle(def.drawio);
    const key = st.get('shape') ?? [...st.keys()][0];
    if (key && !m.has(key)) m.set(key, def.kind);
  }
  // Common draw.io names that map onto our generic shapes.
  const extra: Record<string, string> = {
    rhombus: 'diamond',
    ellipse: 'ellipse',
    doubleEllipse: 'erd.multivalued',
    swimlane: 'container',
    process: 'flow.predefined',
    note: 'uml.note',
    umlActor: 'uml.actor',
    cylinder: 'cylinder',
    cylinder3: 'cylinder',
    datastore: 'cylinder',
    'mxgraph.flowchart.terminator': 'flow.terminator',
    'mxgraph.flowchart.decision': 'diamond',
    'mxgraph.flowchart.document': 'flow.document',
    'mxgraph.flowchart.database': 'cylinder',
    'mxgraph.flowchart.process': 'rectangle',
    'mxgraph.flowchart.start_1': 'ellipse',
    'mxgraph.flowchart.start_2': 'ellipse',
    'mxgraph.c4.person2': 'c4.person',
    'mxgraph.c4.person': 'c4.person',
    cube: 'uml.node',
    folder: 'uml.package',
    component: 'uml.component',
    umlLifeline: 'uml.lifeline',
    umlFrame: 'uml.frame',
    endState: 'uml.final',
    hexagon: 'hexagon',
    parallelogram: 'parallelogram',
    trapezoid: 'trapezoid',
    triangle: 'triangle',
    cloud: 'cloud',
    callout: 'callout',
    singleArrow: 'blockArrow',
    text: 'text',
  };
  for (const [k, v] of Object.entries(extra)) m.set(k, v);
  return m;
})();

const DRAWIO_TO_ARROW: Record<string, ArrowHead> = {
  none: 'none',
  open: 'arrow',
  openThin: 'arrow',
  classic: 'triangle',
  classicThin: 'triangle',
  block: 'triangle',
  blockThin: 'triangle',
  diamond: 'diamond',
  diamondThin: 'diamond',
  oval: 'circle',
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

async function inflate(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const text = await new Response(stream).text();
  return decodeURIComponent(text);
}

/** Strips draw.io HTML labels down to plain text. */
function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h\d)>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n--\n');
  const doc = new DOMParser().parseFromString(`<body>${withBreaks}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const color = (v: string | undefined, fallback: string) =>
  !v || v === 'default' ? fallback : v === 'none' ? 'none' : v.startsWith('#') || v.startsWith('rgb') ? v : fallback;

function styleFromDrawio(m: StyleMap, isEdge: boolean, base: ElementStyle): ElementStyle {
  const fontStyle = Number(m.get('fontStyle') ?? 0);
  const fontFamily = (m.get('fontFamily') ?? '').toLowerCase();
  const align = m.get('align');
  const valign = m.get('verticalAlign');
  return {
    ...base,
    fill: isEdge ? 'none' : color(m.get('fillColor'), base.fill),
    stroke: color(m.get('strokeColor'), base.stroke),
    strokeWidth: Number(m.get('strokeWidth') ?? base.strokeWidth) || base.strokeWidth,
    strokeStyle: m.get('dashed') === '1' ? (m.get('dashPattern')?.startsWith('1 ') ? 'dotted' : 'dashed') : 'solid',
    opacity: m.has('opacity') ? Number(m.get('opacity')) / 100 : 1,
    radius: m.get('rounded') === '1' ? (m.get('absoluteArcSize') === '1' ? Number(m.get('arcSize') ?? 20) / 2 : 10) : base.radius && m.has('rounded') ? 0 : base.radius,
    shadow: m.get('shadow') === '1',
    fontFamily: /mono|courier|consol/.test(fontFamily) ? 'mono' : /serif|georgia|times/.test(fontFamily) && !/sans/.test(fontFamily) ? 'serif' : 'sans',
    fontSize: Number(m.get('fontSize') ?? 12) || 12,
    bold: (fontStyle & 1) === 1,
    italic: (fontStyle & 2) === 2,
    textColor: color(m.get('fontColor'), base.textColor),
    textAlign: align === 'left' || align === 'right' ? align : 'center',
    verticalAlign: valign === 'top' || valign === 'bottom' ? valign : 'middle',
  };
}

function sideFromXY(x?: string, y?: string): AnchorSide | 'auto' {
  if (x === undefined || y === undefined) return 'auto';
  const fx = Number(x);
  const fy = Number(y);
  if (fy <= 0.01) return 'top';
  if (fy >= 0.99) return 'bottom';
  if (fx <= 0.01) return 'left';
  if (fx >= 0.99) return 'right';
  return 'auto';
}

/** Parses a .drawio / .xml file into an OpenDraw document (first page). */
export async function importDrawio(xml: string): Promise<Doc> {
  return (await importDrawioPages(xml))[0].doc;
}

/** Parses every page of a .drawio / .xml file. */
export async function importDrawioPages(xml: string): Promise<Array<{ name: string; doc: Doc }>> {
  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('This file is not valid XML.');
  const diagrams = Array.from(dom.querySelectorAll('diagram'));
  const out: Array<{ name: string; doc: Doc }> = [];
  if (!diagrams.length) {
    const model = dom.querySelector('mxGraphModel');
    if (!model) throw new Error('No diagram found in this file.');
    return [{ name: 'Page 1', doc: modelToDoc(model) }];
  }
  for (const [i, diagram] of diagrams.entries()) {
    let model = diagram.querySelector('mxGraphModel');
    if (!model) {
      const packed = diagram.textContent?.trim();
      if (!packed) continue;
      model = new DOMParser().parseFromString(await inflate(packed), 'text/xml').querySelector('mxGraphModel');
    }
    if (model) out.push({ name: diagram.getAttribute('name') || `Page ${i + 1}`, doc: modelToDoc(model) });
  }
  if (!out.length) throw new Error('No diagram found in this file.');
  return out;
}

function modelToDoc(model: Element): Doc {
  interface Cell {
    id: string;
    parent?: string;
    value: string;
    style: StyleMap;
    vertex: boolean;
    edge: boolean;
    source?: string;
    target?: string;
    geo?: Element | null;
    attrs: Record<string, string>;
    visible: boolean;
    collapsed: boolean;
  }
  const cells: Cell[] = [];
  for (const node of Array.from(model.querySelectorAll('root > mxCell, root > object, root > UserObject'))) {
    const cellEl = node.tagName === 'mxCell' ? node : node.querySelector('mxCell');
    if (!cellEl) continue;
    const id = node.getAttribute('id') ?? cellEl.getAttribute('id') ?? uid();
    cells.push({
      id,
      parent: cellEl.getAttribute('parent') ?? undefined,
      value: node.getAttribute('label') ?? node.getAttribute('value') ?? '',
      style: parseStyle(cellEl.getAttribute('style') ?? ''),
      vertex: cellEl.getAttribute('vertex') === '1',
      edge: cellEl.getAttribute('edge') === '1',
      source: cellEl.getAttribute('source') ?? undefined,
      target: cellEl.getAttribute('target') ?? undefined,
      geo: cellEl.querySelector('mxGeometry'),
      attrs: node === cellEl ? {} : Object.fromEntries(Array.from(node.attributes).map((a) => [a.name, a.value])),
      visible: cellEl.getAttribute('visible') !== '0',
      collapsed: cellEl.getAttribute('collapsed') === '1',
    });
  }
  // Cells parented to the root ("0") are layers.
  const rootId = cells.find((c) => !c.parent)?.id ?? '0';
  const layerCells = cells.filter((c) => c.parent === rootId && !c.vertex && !c.edge);
  const layerIds = new Set(layerCells.map((c) => c.id));
  const layers: Layer[] = layerCells.map((c, i) => ({
    id: c.id,
    name: c.value || (i === 0 ? 'Background' : `Layer ${i + 1}`),
    visible: c.visible,
    locked: c.style.get('locked') === '1',
  }));
  const layerFor = (c: Cell): string | undefined => {
    let p: Cell | undefined = c;
    let guard = 0;
    while (p && guard++ < 100) {
      if (p.parent && layerIds.has(p.parent)) return p.parent;
      p = p.parent ? byIdEarly.get(p.parent) : undefined;
    }
    return undefined;
  };
  const byIdEarly = new Map(cells.map((c) => [c.id, c]));
  const meta = (c: Cell): Partial<DiagramElement> => {
    const out: Partial<DiagramElement> = {};
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(c.attrs)) {
      if (k === 'label' || k === 'id' || k === 'placeholders') continue;
      if (k === 'tooltip') out.tooltip = v;
      else if (k === 'link') out.link = v.startsWith('data:page/id,') ? `page:${v.slice(13)}` : v;
      else if (k === 'tags') out.tags = v.split(/\s+/).filter(Boolean);
      else data[k] = v;
    }
    if (Object.keys(data).length) out.data = data;
    if (layers.length > 1) out.layerId = layerFor(c);
    return out;
  };
  const byId = new Map(cells.map((c) => [c.id, c]));
  const text = (c: Cell) => (c.style.get('html') === '1' || /<[a-z][\s\S]*>/i.test(c.value) ? htmlToText(c.value) : c.value);

  // Absolute positions (vertex geometry is relative to vertex parents).
  const absCache = new Map<string, { x: number; y: number }>();
  const absOf = (c: Cell): { x: number; y: number } => {
    const hit = absCache.get(c.id);
    if (hit) return hit;
    const x = Number(c.geo?.getAttribute('x') ?? 0);
    const y = Number(c.geo?.getAttribute('y') ?? 0);
    const parent = c.parent ? byId.get(c.parent) : undefined;
    const off = parent?.vertex ? absOf(parent) : { x: 0, y: 0 };
    const p = { x: x + off.x, y: y + off.y };
    absCache.set(c.id, p);
    return p;
  };

  const elements: Record<string, DiagramElement> = {};
  const order: string[] = [];
  const groupCells = new Set(cells.filter((c) => c.vertex && c.style.has('group')).map((c) => c.id));
  const edgeLabels: Cell[] = [];

  for (const c of cells) {
    if (!c.vertex || groupCells.has(c.id)) continue;
    if (c.style.has('edgeLabel') && c.parent && byId.get(c.parent)?.edge) {
      edgeLabels.push(c);
      continue;
    }
    const pos = absOf(c);
    const w = Number(c.geo?.getAttribute('width') ?? 120);
    const h = Number(c.geo?.getAttribute('height') ?? 60);
    const shapeName = c.style.get('shape') ?? [...c.style.keys()][0] ?? '';
    let kind = KIND_BY_DRAWIO.get(shapeName) ?? (c.style.has('ellipse') ? 'ellipse' : c.style.has('rhombus') ? 'diamond' : 'rectangle');
    if (c.style.has('text') && !c.style.has('shape')) kind = 'text';
    if (c.style.get('rounded') === '1' && Number(c.style.get('arcSize') ?? 0) >= 50 && kind === 'rectangle') kind = 'flow.terminator';
    let icon: string | undefined;
    if (shapeName === 'image' || c.style.has('image')) {
      const img = c.style.get('image') ?? '';
      kind = 'icon';
      // draw.io's "data:mime,base64" → standard "data:mime;base64,base64".
      icon = img.startsWith('data:') && !img.includes(';base64') ? img.replace(/^data:([^,]+),/, 'data:$1;base64,') : img;
    }
    const base = kind === 'text' ? { ...DEFAULT_STYLE, fill: 'none', stroke: 'none' } : DEFAULT_STYLE;
    const style = styleFromDrawio(c.style, false, base);
    if (kind === 'text') {
      style.fill = c.style.get('fillColor') && c.style.get('fillColor') !== 'none' ? style.fill : 'none';
      style.stroke = c.style.get('strokeColor') && c.style.get('strokeColor') !== 'none' ? style.stroke : 'none';
    }
    const el = createShape(kind, { x: pos.x, y: pos.y, w, h }, style, text(c));
    el.id = c.id;
    if (icon) el.icon = icon;
    // Group membership from draw.io "group" parents.
    const groups: string[] = [];
    let p = c.parent ? byId.get(c.parent) : undefined;
    while (p && p.vertex) {
      if (groupCells.has(p.id)) groups.push(p.id);
      else if (!el.containerId && getShapeDef(KIND_BY_DRAWIO.get(p.style.get('shape') ?? [...p.style.keys()][0] ?? '') ?? '').container) el.containerId = p.id;
      p = p.parent ? byId.get(p.parent) : undefined;
    }
    el.groupIds = groups;
    if (c.style.has('swimlane') || c.style.get('container') === '1') {
      el.kind = 'container';
      el.style = { ...el.style, textAlign: 'left', bold: true };
    }
    Object.assign(el, meta(c));
    const rot = Number(c.style.get('rotation') ?? 0);
    if (rot) el.rotation = rot;
    if (c.style.get('flipH') === '1') el.flipH = true;
    if (c.style.get('flipV') === '1') el.flipV = true;
    if (c.collapsed) el.collapsed = true;
    if (c.style.get('gradientColor') && c.style.get('gradientColor') !== 'none') {
      el.style.gradient = c.style.get('gradientColor');
      const dir = c.style.get('gradientDirection');
      if (dir === 'north' || dir === 'east' || dir === 'west' || dir === 'radial') el.style.gradientDirection = dir;
    }
    if (c.style.get('sketch') === '1') el.style.sketch = true;
    if (c.style.get('glass') === '1') el.style.glass = true;
    elements[el.id] = el;
    order.push(el.id);
  }

  for (const c of cells) {
    if (!c.edge) continue;
    const m = c.style;
    const pointOf = (as: string) => {
      const pt = c.geo?.querySelector(`mxPoint[as="${as}"]`);
      return pt ? { x: Number(pt.getAttribute('x') ?? 0), y: Number(pt.getAttribute('y') ?? 0) } : { x: 0, y: 0 };
    };
    const end = (id: string | undefined, as: string, px: string, py: string): Endpoint => {
      const p = pointOf(as);
      if (id && isShape(elements[id])) return { elementId: id, side: sideFromXY(m.get(px), m.get(py)), x: p.x, y: p.y };
      return p;
    };
    const edgeStyle = m.get('edgeStyle');
    const conn: ConnectorElement = createConnector(end(c.source, 'sourcePoint', 'exitX', 'exitY'), end(c.target, 'targetPoint', 'entryX', 'entryY'), {
      routing: m.get('curved') === '1' ? 'curved' : edgeStyle && edgeStyle !== 'none' ? 'orthogonal' : 'straight',
      endArrow: DRAWIO_TO_ARROW[m.get('endArrow') ?? 'classic'] ?? 'triangle',
      startArrow: DRAWIO_TO_ARROW[m.get('startArrow') ?? 'none'] ?? 'none',
      text: text(c),
    });
    if (m.get('endFill') === '0' && conn.endArrow === 'triangle') conn.endArrow = 'triangleOpen';
    if (m.get('endFill') === '0' && conn.endArrow === 'diamond') conn.endArrow = 'diamondOpen';
    if (m.get('startFill') === '0' && conn.startArrow === 'diamond') conn.startArrow = 'diamondOpen';
    if (m.get('flowAnimation') === '1') conn.animation = { kind: 'flow', speed: 1 };
    conn.id = c.id;
    conn.style = styleFromDrawio(m, true, conn.style);
    Object.assign(conn, meta(c));
    const pts = Array.from(c.geo?.querySelectorAll('Array[as="points"] > mxPoint') ?? []).map((pt) => ({
      x: Number(pt.getAttribute('x') ?? 0),
      y: Number(pt.getAttribute('y') ?? 0),
    }));
    if (pts.length) conn.waypoints = pts;
    const es = m.get('edgeStyle');
    if (es === 'elbowEdgeStyle') conn.routing = m.get('elbow') === 'vertical' ? 'elbow-v' : 'elbow-h';
    else if (es === 'entityRelationEdgeStyle') conn.routing = 'entity';
    else if (es === 'isometricEdgeStyle') conn.routing = 'isometric';
    const jump = m.get('jumpStyle');
    if (jump === 'arc' || jump === 'gap' || jump === 'sharp') conn.lineJumps = jump;
    if (m.get('shape') === 'pipe') conn.connectorShape = 'pipe';
    if (m.get('shape') === 'flexArrow' || m.get('shape') === 'arrow') conn.connectorShape = 'arrow';
    elements[conn.id] = conn;
    order.push(conn.id);
  }

  for (const lbl of edgeLabels) {
    const conn = elements[lbl.parent!];
    if (isConnector(conn)) elements[conn.id] = { ...conn, text: [conn.text, text(lbl)].filter(Boolean).join('\n') };
  }

  return layers.length > 1 ? { elements, order, layers } : { elements, order };
}
