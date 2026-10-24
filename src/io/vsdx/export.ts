/**
 * Visio 2013+ (.vsdx) export — a minimal, valid OPC package written with
 * fflate, following [MS-VSDX]:
 *
 *   [Content_Types].xml
 *   _rels/.rels                         → visio/document.xml, docProps/*
 *   docProps/core.xml, docProps/app.xml
 *   visio/document.xml                  (document settings + "No Style" style sheet)
 *   visio/_rels/document.xml.rels       → pages/pages.xml
 *   visio/pages/pages.xml               (one <Page> per diagram page, PageSheet with size)
 *   visio/pages/_rels/pages.xml.rels    → pageN.xml
 *   visio/pages/pageN.xml               (<Shapes> + <Connects>)
 *   visio/pages/_rels/pageN.xml.rels    → ../media/imageK.png (only when images exist)
 *   visio/media/imageK.png
 *
 * Coordinates are inches with the y axis pointing up from the bottom of the
 * page (96 px = 1 in). Shapes are master-less: a Geometry section (rectangle,
 * ellipse or diamond), fill / line / character / paragraph cells, `Angle` for
 * rotation (radians, counter-clockwise) and the label in `<Text>`. Connectors
 * are 1-D shapes (BeginX/BeginY/EndX/EndY + a polyline Geometry in the local
 * frame whose origin is the begin point), glued with `<Connect>` rows to the
 * shapes they attach to (static values: no glue formulas, so nothing is
 * recalculated on open). Icons/images become Foreign (bitmap) shapes when a
 * rasterizer is supplied, rectangles otherwise.
 */
import { zipSync, strToU8 } from 'fflate';
import type { ArrowHead, ConnectorElement, DiagramElement, Doc, Page, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { docLayers, layerOfElement, visualBounds } from '@/io/export/svg';

const DPI = 96;
const NS = 'http://schemas.microsoft.com/office/visio/2012/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const REL_DOCUMENT = 'http://schemas.microsoft.com/visio/2010/relationships/document';
const REL_PAGES = 'http://schemas.microsoft.com/visio/2010/relationships/pages';
const REL_PAGE = 'http://schemas.microsoft.com/visio/2010/relationships/page';
const REL_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const REL_CORE = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
const REL_APP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties';
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
/** Page margin around the drawing (inches). */
const MARGIN = 0.5;

export interface VsdxOptions {
  title?: string;
  /** Rasterizes an icon/image shape to PNG (browser only). Without it such shapes export as labelled rectangles. */
  rasterize?: (shape: ShapeElement) => Promise<Uint8Array | null>;
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

export const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Characters not allowed in XML 1.0.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '');

const num = (v: number) => {
  if (!Number.isFinite(v)) return '0';
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? '0' : String(r);
};

function cell(n: string, v: number | string, extra: { u?: string; f?: string } = {}): string {
  const value = typeof v === 'number' ? num(v) : xmlEscape(v);
  return `<Cell N="${n}" V="${value}"${extra.u ? ` U="${extra.u}"` : ''}${extra.f ? ` F="${xmlEscape(extra.f)}"` : ''}/>`;
}

const row = (t: string, ix: number, cells: string) => `<Row${t ? ` T="${t}"` : ''} IX="${ix}">${cells}</Row>`;

/** `#rgb` / `#rrggbb` / `rgb()` → `#RRGGBB`; null for none/transparent/unknown. */
export function vsdxColor(c: string | undefined): string | null {
  if (!c || c === 'none' || c === 'transparent') return null;
  let m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) return '#' + m[1].split('').map((x) => x + x).join('').toUpperCase();
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (m) return '#' + m[1].toUpperCase();
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (m) return '#' + [m[1], m[2], m[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, '0')).join('').toUpperCase();
  return null;
}

/** ArkDraw arrowheads → Visio BeginArrow/EndArrow indices. */
export function vsdxArrow(a: ArrowHead): number {
  switch (a) {
    case 'none': return 0;
    case 'arrow': case 'halfArrow': case 'async': return 1;
    case 'triangleOpen': return 6;
    case 'circle': return 20;
    case 'circleOpen': return 21;
    case 'diamond': return 22;
    case 'diamondOpen': return 24;
    case 'erOne': case 'erOnlyOne': case 'dash': return 29;
    case 'erMany': case 'erOneMany': case 'erZeroMany': return 31;
    case 'erZeroOne': return 30;
    default: return 4; // filled triangle
  }
}

const linePattern = (el: DiagramElement): number => {
  if (el.style.stroke === 'none') return 0;
  if (el.style.dashPattern) return 2;
  return el.style.strokeStyle === 'dashed' ? 2 : el.style.strokeStyle === 'dotted' ? 3 : 1;
};

// ---------------------------------------------------------------------------
// Page → XML
// ---------------------------------------------------------------------------

interface PageFrame {
  /** World px → page inches (y up). */
  X: (x: number) => number;
  Y: (y: number) => number;
  width: number;
  height: number;
}

function pageFrame(doc: Doc, els: DiagramElement[]): PageFrame {
  const b = visualBounds(doc, els) ?? { x: 0, y: 0, w: 8 * DPI, h: 6 * DPI };
  const width = b.w / DPI + MARGIN * 2;
  const height = b.h / DPI + MARGIN * 2;
  return { X: (x) => (x - b.x) / DPI + MARGIN, Y: (y) => height - ((y - b.y) / DPI + MARGIN), width, height };
}

function charSection(el: DiagramElement): string {
  const s = el.style;
  const style = (s.bold ? 1 : 0) | (s.italic ? 2 : 0) | (s.underline ? 4 : 0);
  const color = vsdxColor(s.textColor) ?? '#000000';
  return (
    `<Section N="Character">` +
    row('', 0, cell('Color', color) + cell('Size', s.fontSize / DPI, { u: 'PT' }) + cell('Style', style)) +
    `</Section>`
  );
}

function paraSection(el: DiagramElement): string {
  const align = el.style.textAlign === 'left' ? 0 : el.style.textAlign === 'right' ? 2 : 1;
  return `<Section N="Paragraph">${row('', 0, cell('HorzAlign', align))}</Section>`;
}

function lineCells(el: DiagramElement): string {
  const s = el.style;
  const lc = vsdxColor(s.stroke) ?? '#000000';
  return (
    cell('LineWeight', Math.max(0.25, s.strokeWidth) / DPI, { u: 'PT' }) +
    cell('LineColor', lc) +
    cell('LinePattern', linePattern(el)) +
    (s.strokeOpacity !== undefined && s.strokeOpacity < 1 ? cell('LineColorTrans', 1 - s.strokeOpacity) : '')
  );
}

function fillCells(el: ShapeElement, forceNone = false): string {
  const s = el.style;
  const fill = forceNone ? null : vsdxColor(s.fill);
  if (!fill) return cell('FillPattern', 0);
  const grad = vsdxColor(s.gradient);
  return (
    cell('FillForegnd', fill) +
    cell('FillBkgnd', grad ?? fill) +
    cell('FillPattern', 1) +
    (s.fillOpacity !== undefined && s.fillOpacity < 1 ? cell('FillForegndTrans', 1 - s.fillOpacity) + cell('FillBkgndTrans', 1 - s.fillOpacity) : '')
  );
}

function geometry(kind: 'rect' | 'ellipse' | 'diamond', w: number, h: number, noFill: boolean, noLine: boolean): string {
  const head = `<Section N="Geometry" IX="0">${cell('NoFill', noFill ? 1 : 0)}${cell('NoLine', noLine ? 1 : 0)}${cell('NoShow', 0)}${cell('NoSnap', 0)}${cell('NoQuickDrag', 0)}`;
  // Values plus Width/Height formulas, so the outline follows resizes in Visio.
  const X = (n: string, k: number) => cell(n, w * k, { f: `Width*${k}` });
  const Y = (n: string, k: number) => cell(n, h * k, { f: `Height*${k}` });
  let rows: string;
  if (kind === 'ellipse') {
    rows = row('Ellipse', 1, X('X', 0.5) + Y('Y', 0.5) + X('A', 1) + Y('B', 0.5) + X('C', 0.5) + Y('D', 1));
  } else {
    const pts = kind === 'diamond' ? [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5], [0.5, 0]] : [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    rows = pts.map(([x, y], i) => row(i === 0 ? 'MoveTo' : 'LineTo', i + 1, X('X', x) + Y('Y', y))).join('');
  }
  return `${head}${rows}</Section>`;
}

function textBlockCells(el: ShapeElement, w: number, h: number): string {
  const pos = el.style.labelPosition ?? (getShapeDef(el.kind).textPlacement === 'below' ? 'bottom' : 'inside');
  const lh = (el.style.fontSize * 1.3 * Math.max(1, el.text.split('\n').length)) / DPI + 0.1;
  const wide = w + 1.25;
  switch (pos) {
    case 'bottom':
      return cell('TxtPinX', w / 2) + cell('TxtPinY', -0.06) + cell('TxtWidth', wide) + cell('TxtHeight', lh) + cell('TxtLocPinX', wide / 2) + cell('TxtLocPinY', lh);
    case 'top':
      return cell('TxtPinX', w / 2) + cell('TxtPinY', h + 0.06) + cell('TxtWidth', wide) + cell('TxtHeight', lh) + cell('TxtLocPinX', wide / 2) + cell('TxtLocPinY', 0);
    case 'left':
      return cell('TxtPinX', -0.08) + cell('TxtPinY', h / 2) + cell('TxtWidth', 2) + cell('TxtHeight', h) + cell('TxtLocPinX', 2) + cell('TxtLocPinY', h / 2);
    case 'right':
      return cell('TxtPinX', w + 0.08) + cell('TxtPinY', h / 2) + cell('TxtWidth', 2) + cell('TxtHeight', h) + cell('TxtLocPinX', 0) + cell('TxtLocPinY', h / 2);
    default:
      return '';
  }
}

const verticalAlign = (el: DiagramElement) => (el.style.verticalAlign === 'top' ? 0 : el.style.verticalAlign === 'bottom' ? 2 : 1);

const textXml = (t: string) => (t ? `<Text>${xmlEscape(t)}</Text>` : '');

const shapeName = (el: DiagramElement, id: number) => xmlEscape(el.name || `Sheet.${id}`);

interface ShapeXml {
  xml: string;
  image?: Uint8Array;
}

async function shapeXml(el: ShapeElement, id: number, f: PageFrame, opts: VsdxOptions, imageRel: () => string): Promise<ShapeXml> {
  const def = getShapeDef(el.kind);
  const w = el.w / DPI;
  const h = el.h / DPI;
  const angle = el.rotation ? (-el.rotation * Math.PI) / 180 : 0;
  const xform =
    cell('PinX', f.X(el.x + el.w / 2)) +
    cell('PinY', f.Y(el.y + el.h / 2)) +
    cell('Width', w) +
    cell('Height', h) +
    cell('LocPinX', w / 2, { f: 'Width*0.5' }) +
    cell('LocPinY', h / 2, { f: 'Height*0.5' }) +
    cell('Angle', angle) +
    cell('FlipX', el.flipH ? 1 : 0) +
    cell('FlipY', el.flipV ? 1 : 0);
  const text = el.table ? el.table.cells.map((r) => r.join('\t')).join('\n') : el.text;
  const textCells = cell('VerticalAlign', verticalAlign(el)) + textBlockCells(el, w, h);
  const name = shapeName(el, id);

  // Icons and images: a Foreign (bitmap) shape when we can rasterize.
  if ((el.kind === 'icon' || el.kind === 'image' || el.icon) && opts.rasterize) {
    const png = await opts.rasterize(el).catch(() => null);
    if (png) {
      const rid = imageRel();
      return {
        image: png,
        xml:
          `<Shape ID="${id}" Type="Foreign" NameU="${name}" Name="${name}" LineStyle="0" FillStyle="0" TextStyle="0">` +
          xform +
          cell('ImgOffsetX', 0) + cell('ImgOffsetY', 0) + cell('ImgWidth', w, { f: 'Width*1' }) + cell('ImgHeight', h, { f: 'Height*1' }) +
          cell('FillPattern', 0) + cell('LinePattern', 0) + textCells +
          charSection(el) + paraSection(el) +
          textXml(text) +
          `<ForeignData ForeignType="Bitmap" CompressionType="PNG"><Rel r:id="${rid}"/></ForeignData>` +
          `</Shape>`,
      };
    }
  }

  const textOnly = el.kind === 'text';
  const noFill = textOnly || !vsdxColor(el.style.fill);
  const noLine = textOnly || el.style.stroke === 'none';
  const kind = def.perimeter === 'ellipse' ? 'ellipse' : def.perimeter === 'diamond' ? 'diamond' : 'rect';
  const rounding = kind === 'rect' && def.rounded !== false && el.style.radius > 0 ? cell('Rounding', el.style.radius / DPI) : '';
  return {
    xml:
      `<Shape ID="${id}" Type="Shape" NameU="${name}" Name="${name}" LineStyle="0" FillStyle="0" TextStyle="0">` +
      xform +
      lineCells(el) +
      (noLine ? cell('LinePattern', 0) : '') +
      fillCells(el, noFill) +
      rounding +
      (el.style.shadow ? cell('ShdwPattern', 1) + cell('ShdwForegnd', '#000000') + cell('ShdwForegndTrans', 0.75) : '') +
      textCells +
      charSection(el) +
      paraSection(el) +
      (textOnly ? '' : geometry(kind, w, h, noFill, noLine)) +
      textXml(text) +
      `</Shape>`,
  };
}

/** Removes repeated cells (keeps the last) — Visio rejects duplicate cell names in a sheet. */
function dedupeCells(shape: string): string {
  const open = shape.indexOf('>') + 1;
  const firstSection = shape.search(/<Section |<Text>|<ForeignData|<\/Shape>/);
  const head = shape.slice(open, firstSection);
  const cells = head.match(/<Cell [^>]*\/>/g) ?? [];
  const seen = new Map<string, string>();
  for (const c of cells) seen.set(/N="([^"]+)"/.exec(c)![1], c);
  return shape.slice(0, open) + [...seen.values()].join('') + shape.slice(firstSection);
}

function connectorXml(el: ConnectorElement, id: number, f: PageFrame, doc: Doc): string {
  const g = connectorGeometryInDoc(el, doc.elements);
  let pts: Vec[] = (g.points.length >= 2 ? g.points : [g.start, g.end]).map((p) => ({ x: f.X(p.x), y: f.Y(p.y) }));
  if (pts.length > 64) pts = pts.filter((_, i) => i % Math.ceil(pts.length / 64) === 0 || i === pts.length - 1);
  const b = pts[0];
  const e = pts[pts.length - 1];
  const dx = e.x - b.x;
  const dy = e.y - b.y;
  const len = Math.hypot(dx, dy);
  const width = Math.max(len, 1e-4);
  const ang = len > 1e-9 ? Math.atan2(dy, dx) : 0;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  // World (inches, y up) → local frame: origin at the begin point, x along begin→end.
  const local = (p: Vec) => ({ x: (p.x - b.x) * cos + (p.y - b.y) * sin, y: -(p.x - b.x) * sin + (p.y - b.y) * cos });
  const label = local({ x: f.X(g.label.x), y: f.Y(g.label.y) });
  const name = el.name ? xmlEscape(el.name) : 'Dynamic connector';

  const geo =
    `<Section N="Geometry" IX="0">${cell('NoFill', 1)}${cell('NoLine', 0)}${cell('NoShow', 0)}${cell('NoSnap', 0)}${cell('NoQuickDrag', 0)}` +
    pts.map((p, i) => {
      const l = local(p);
      return row(i === 0 ? 'MoveTo' : 'LineTo', i + 1, cell('X', l.x) + cell('Y', l.y));
    }).join('') +
    `</Section>`;

  return (
    `<Shape ID="${id}" Type="Shape" NameU="${name}" Name="${name}" LineStyle="0" FillStyle="0" TextStyle="0">` +
    cell('PinX', (b.x + e.x) / 2) +
    cell('PinY', (b.y + e.y) / 2) +
    cell('Width', width) +
    cell('Height', 0) +
    cell('LocPinX', width / 2, { f: 'Width*0.5' }) +
    cell('LocPinY', 0) +
    cell('Angle', ang) +
    cell('BeginX', b.x) +
    cell('BeginY', b.y) +
    cell('EndX', e.x) +
    cell('EndY', e.y) +
    cell('ObjType', 2) +
    lineCells(el) +
    cell('BeginArrow', vsdxArrow(el.startArrow)) +
    cell('EndArrow', vsdxArrow(el.endArrow)) +
    cell('BeginArrowSize', 2) +
    cell('EndArrowSize', 2) +
    cell('FillPattern', 0) +
    (el.routing === 'curved' ? cell('ShapeRouteStyle', 0) + cell('LineJumpStyle', 0) : '') +
    cell('TxtPinX', label.x) +
    cell('TxtPinY', label.y) +
    cell('TxtWidth', 1.6) +
    cell('TxtHeight', 0.35) +
    cell('TxtLocPinX', 0.8) +
    cell('TxtLocPinY', 0.175) +
    cell('TxtAngle', -ang) +
    cell('VerticalAlign', 1) +
    charSection(el) +
    paraSection(el) +
    geo +
    textXml(el.text) +
    `</Shape>`
  );
}

interface PagePart {
  xml: string;
  images: Uint8Array[];
  width: number;
  height: number;
}

async function pageXml(page: Page, opts: VsdxOptions, imageCounter: { n: number }): Promise<PagePart & { imageNames: string[] }> {
  const doc = page.doc;
  const layers = docLayers(doc);
  const rank = new Map(layers.map((l, i) => [l.id, i]));
  const els = doc.order
    .map((id) => doc.elements[id])
    .filter((el): el is DiagramElement => !!el && layerOfElement(doc, el).visible)
    .map((el, i) => ({ el, i, r: rank.get(layerOfElement(doc, el).id) ?? 0 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.el);
  const f = pageFrame(doc, els);
  const ids = new Map<string, number>();
  let next = 1;
  for (const el of els) ids.set(el.id, next++);

  const shapes: string[] = [];
  const images: Uint8Array[] = [];
  const imageNames: string[] = [];
  const connects: string[] = [];
  for (const el of els) {
    const id = ids.get(el.id)!;
    if (isShape(el)) {
      const out = await shapeXml(el, id, f, opts, () => `rId${images.length + 1}`);
      if (out.image) {
        images.push(out.image);
        imageNames.push(`image${++imageCounter.n}.png`);
      }
      shapes.push(dedupeCells(out.xml));
    } else if (isConnector(el)) {
      shapes.push(dedupeCells(connectorXml(el, id, f, doc)));
      const s = el.source.elementId ? ids.get(el.source.elementId) : undefined;
      const t = el.target.elementId ? ids.get(el.target.elementId) : undefined;
      if (s) connects.push(`<Connect FromSheet="${id}" FromCell="BeginX" FromPart="9" ToSheet="${s}" ToCell="PinX" ToPart="3"/>`);
      if (t) connects.push(`<Connect FromSheet="${id}" FromCell="EndX" FromPart="12" ToSheet="${t}" ToCell="PinX" ToPart="3"/>`);
    }
  }
  const xml =
    XML_DECL +
    `<PageContents xmlns="${NS}" xmlns:r="${NS_R}" xml:space="preserve">` +
    (shapes.length ? `<Shapes>${shapes.join('')}</Shapes>` : '') +
    (connects.length ? `<Connects>${connects.join('')}</Connects>` : '') +
    `</PageContents>`;
  return { xml, images, imageNames, width: f.width, height: f.height };
}

// ---------------------------------------------------------------------------
// Package parts
// ---------------------------------------------------------------------------

const rels = (items: Array<{ id: string; type: string; target: string }>) =>
  XML_DECL +
  `<Relationships xmlns="${NS_PKG_REL}">` +
  items.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${xmlEscape(r.target)}"/>`).join('') +
  `</Relationships>`;

function documentXml(): string {
  const styleCells =
    cell('EnableLineProps', 1) + cell('EnableFillProps', 1) + cell('EnableTextProps', 1) + cell('HideForApply', 0) +
    cell('LineWeight', 0.01041666666666667, { u: 'PT' }) + cell('LineColor', '#000000') + cell('LinePattern', 1) + cell('Rounding', 0) +
    cell('EndArrowSize', 2) + cell('BeginArrow', 0) + cell('EndArrow', 0) + cell('LineCap', 0) + cell('BeginArrowSize', 2) +
    cell('LineColorTrans', 0) + cell('CompoundType', 0) +
    cell('FillForegnd', '#FFFFFF') + cell('FillBkgnd', '#FFFFFF') + cell('FillPattern', 1) + cell('ShdwForegnd', '#000000') +
    cell('ShdwPattern', 0) + cell('FillForegndTrans', 0) + cell('FillBkgndTrans', 0) + cell('ShdwForegndTrans', 0) +
    cell('ShapeShdwType', 0) + cell('ShapeShdwOffsetX', 0.02777777777777778) + cell('ShapeShdwOffsetY', -0.02777777777777778) +
    cell('ShapeShdwObliqueAngle', 0) + cell('ShapeShdwScaleFactor', 1) + cell('ShapeShdwBlur', 0) + cell('ShapeShdwShow', 0) +
    cell('LeftMargin', 0.05555555555555555, { u: 'PT' }) + cell('RightMargin', 0.05555555555555555, { u: 'PT' }) +
    cell('TopMargin', 0.05555555555555555, { u: 'PT' }) + cell('BottomMargin', 0.05555555555555555, { u: 'PT' }) +
    cell('VerticalAlign', 1) + cell('TextBkgnd', 0) + cell('DefaultTabStop', 0.5) + cell('TextDirection', 0) + cell('TextBkgndTrans', 0);
  const charRow = `<Row IX="0">${cell('Color', '#000000')}${cell('Size', 0.1666666666666667, { u: 'PT' })}${cell('Style', 0)}${cell('Case', 0)}${cell('Pos', 0)}${cell('FontScale', 1)}${cell('Letterspace', 0)}</Row>`;
  const paraRow = `<Row IX="0">${cell('IndFirst', 0)}${cell('IndLeft', 0)}${cell('IndRight', 0)}${cell('SpLine', -1.2)}${cell('SpBefore', 0)}${cell('SpAfter', 0)}${cell('HorzAlign', 1)}${cell('Bullet', 0)}</Row>`;
  return (
    XML_DECL +
    `<VisioDocument xmlns="${NS}" xmlns:r="${NS_R}" xml:space="preserve">` +
    `<DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0" DefaultGuideStyle="0">` +
    `<GlueSettings>9</GlueSettings><SnapSettings>65847</SnapSettings><SnapExtensions>34</SnapExtensions><SnapAngles/>` +
    `<DynamicGridEnabled>1</DynamicGridEnabled><ProtectStyles>0</ProtectStyles><ProtectShapes>0</ProtectShapes>` +
    `<ProtectMasters>0</ProtectMasters><ProtectBkgnds>0</ProtectBkgnds>` +
    `</DocumentSettings>` +
    `<Colors><ColorEntry IX="0" RGB="#000000"/><ColorEntry IX="1" RGB="#FFFFFF"/></Colors>` +
    `<FaceNames><FaceName NameU="Calibri" UnicodeRanges="-536859905 -1073732485 9 0" CharSets="536871423 0" Panose="2 15 5 2 2 2 4 3 2 4" Flags="325"/></FaceNames>` +
    `<StyleSheets><StyleSheet ID="0" NameU="No Style" IsCustomNameU="1" Name="No Style" IsCustomName="1">` +
    styleCells +
    `<Section N="Character">${charRow}</Section><Section N="Paragraph">${paraRow}</Section>` +
    `</StyleSheet></StyleSheets>` +
    `<DocumentSheet NameU="TheDoc" IsCustomNameU="1" Name="TheDoc" IsCustomName="1" LineStyle="0" FillStyle="0" TextStyle="0">` +
    cell('OutputFormat', 0) + cell('LockPreview', 0) + cell('AddMarkup', 0) + cell('ViewMarkup', 0) + cell('DocLockReplace', 0, { u: 'BOOL' }) +
    cell('NoCoauth', 0, { u: 'BOOL' }) + cell('DocLockDuplicatePage', 0, { u: 'BOOL' }) + cell('PreviewQuality', 0) + cell('PreviewScope', 0) +
    cell('DocLangID', 1033) +
    `</DocumentSheet>` +
    `</VisioDocument>`
  );
}

function pagesXml(pages: Array<{ name: string; width: number; height: number }>): string {
  return (
    XML_DECL +
    `<Pages xmlns="${NS}" xmlns:r="${NS_R}" xml:space="preserve">` +
    pages
      .map((p, i) => {
        const name = xmlEscape(p.name || `Page-${i + 1}`);
        return (
          `<Page ID="${i}" NameU="${name}" Name="${name}" ViewScale="-1" ViewCenterX="${num(p.width / 2)}" ViewCenterY="${num(p.height / 2)}">` +
          `<PageSheet LineStyle="0" FillStyle="0" TextStyle="0">` +
          cell('PageWidth', p.width, { u: 'IN' }) +
          cell('PageHeight', p.height, { u: 'IN' }) +
          cell('ShdwOffsetX', 0.125) + cell('ShdwOffsetY', -0.125) +
          cell('PageScale', 1, { u: 'IN' }) + cell('DrawingScale', 1, { u: 'IN' }) +
          cell('DrawingSizeType', 0) + cell('DrawingScaleType', 0) + cell('InhibitSnap', 0) +
          cell('PageLockReplace', 0, { u: 'BOOL' }) + cell('PageLockDuplicate', 0, { u: 'BOOL' }) +
          cell('UIVisibility', 0) + cell('ShdwType', 0) + cell('ShdwObliqueAngle', 0) + cell('ShdwScaleFactor', 1) +
          cell('DrawingResizeType', 1) + cell('PageShapeSplit', 1) +
          `</PageSheet>` +
          `<Rel r:id="rId${i + 1}"/>` +
          `</Page>`
        );
      })
      .join('') +
    `</Pages>`
  );
}

function contentTypes(pageCount: number, hasImages: boolean): string {
  return (
    XML_DECL +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    (hasImages ? `<Default Extension="png" ContentType="image/png"/>` : '') +
    `<Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>` +
    `<Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>` +
    Array.from({ length: pageCount }, (_, i) => `<Override PartName="/visio/pages/page${i + 1}.xml" ContentType="application/vnd.ms-visio.page+xml"/>`).join('') +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`
  );
}

const coreXml = (title: string) =>
  XML_DECL +
  `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
  `<dc:title>${xmlEscape(title)}</dc:title><dc:creator>ArkDraw</dc:creator>` +
  `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>` +
  `</cp:coreProperties>`;

const appXml = () =>
  XML_DECL +
  `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
  `<Application>ArkDraw</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><AppVersion>15.0000</AppVersion>` +
  `</Properties>`;

/** Builds the .vsdx package for `pages`. */
export async function exportVsdx(pages: Array<Pick<Page, 'name' | 'doc'>>, opts: VsdxOptions = {}): Promise<Uint8Array> {
  if (!pages.length) throw new Error('Nothing to export.');
  const counter = { n: 0 };
  const built: Array<Awaited<ReturnType<typeof pageXml>> & { name: string }> = [];
  for (const p of pages) built.push({ ...(await pageXml(p as Page, opts, counter)), name: p.name });
  const hasImages = built.some((b) => b.images.length);

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypes(built.length, hasImages)),
    '_rels/.rels': strToU8(
      rels([
        { id: 'rId1', type: REL_DOCUMENT, target: 'visio/document.xml' },
        { id: 'rId2', type: REL_CORE, target: 'docProps/core.xml' },
        { id: 'rId3', type: REL_APP, target: 'docProps/app.xml' },
      ]),
    ),
    'docProps/core.xml': strToU8(coreXml(opts.title ?? 'Diagram')),
    'docProps/app.xml': strToU8(appXml()),
    'visio/document.xml': strToU8(documentXml()),
    'visio/_rels/document.xml.rels': strToU8(rels([{ id: 'rId1', type: REL_PAGES, target: 'pages/pages.xml' }])),
    'visio/pages/pages.xml': strToU8(pagesXml(built)),
    'visio/pages/_rels/pages.xml.rels': strToU8(rels(built.map((_, i) => ({ id: `rId${i + 1}`, type: REL_PAGE, target: `page${i + 1}.xml` })))),
  };
  built.forEach((b, i) => {
    files[`visio/pages/page${i + 1}.xml`] = strToU8(b.xml);
    if (b.images.length) {
      files[`visio/pages/_rels/page${i + 1}.xml.rels`] = strToU8(
        rels(b.imageNames.map((name, k) => ({ id: `rId${k + 1}`, type: REL_IMAGE, target: `../media/${name}` }))),
      );
      b.images.forEach((img, k) => (files[`visio/media/${b.imageNames[k]}`] = img));
    }
  });
  return zipSync(files, { level: 6 });
}
