/**
 * Gliffy (.gliffy JSON) import, best effort.
 *
 * Reads `stage.objects` (recursively through `children`, whose coordinates are
 * relative to their parent): `graphic.Shape` objects map their `tid` stencil
 * (or `uid`) onto ArkDraw kinds, `graphic.Text` children become the shape
 * label (`Text.html` → plain text), free-standing text becomes text shapes,
 * `graphic.Line` objects become connectors attached through
 * `constraints.startConstraint / endConstraint … nodeId` (free ends use the
 * `controlPath`), groups become ArkDraw groups and swimlanes containers.
 * Unknown stencils fall back to rectangles (reported as a warning).
 */
import type { ArrowHead, ConnectorElement, DiagramElement, ElementStyle, ShapeElement, Vec } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { uid } from '@/lib/id';
import type { ImportResult, Importer } from './types';
import { attach, endpointAt, hasKind, htmlToPlain, makeDoc, normColor, pickKind, toText } from './_shared';

interface GText {
  html?: string;
}
interface GShape {
  tid?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  dashStyle?: string | null;
  dropShadow?: boolean;
  opacity?: number;
  gradient?: boolean;
}
interface GLine {
  strokeWidth?: number;
  strokeColor?: string;
  dashStyle?: string | null;
  startArrow?: number;
  endArrow?: number;
  interpolationType?: string;
  ortho?: boolean;
  controlPath?: number[][];
}
interface GObject {
  id: number | string;
  uid?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  hidden?: boolean;
  graphic?: { type?: string; Shape?: GShape; Line?: GLine; Text?: GText; Image?: { url?: string; tid?: string }; Svg?: unknown } | null;
  children?: GObject[] | null;
  constraints?: {
    startConstraint?: { StartPositionConstraint?: { nodeId?: number | string; px?: number; py?: number } } | null;
    endConstraint?: { EndPositionConstraint?: { nodeId?: number | string; px?: number; py?: number } } | null;
  } | null;
}

/** Gliffy stencil names (`com.gliffy.stencil.<name>.<lib>`) → kind candidates. */
const STENCILS: Array<[RegExp, string[], Partial<ElementStyle>?]> = [
  [/round(ed)?_rectangle/, ['rectangle'], { radius: 10 }],
  [/start_end|terminator|terminal/, ['flow.terminator']],
  [/decision|diamond|rhombus/, ['diamond']],
  [/predefined_process|subroutine|subprocess/, ['flow.predefined']],
  [/multiple_documents|document/, ['flow.document']],
  [/database|cylinder|disk_storage|stored_data|data_storage|direct_access/, ['cylinder']],
  [/internal_storage/, ['flow.internalStorage']],
  [/manual_input/, ['flow.manualInput']],
  [/manual_operation/, ['flow.manualOperation']],
  [/delay/, ['flow.delay']],
  [/off_page|offpage/, ['flow.offPage']],
  [/input_output|parallelogram|^data$|_data_/, ['parallelogram']],
  [/preparation|hexagon/, ['hexagon']],
  [/trapezoid/, ['trapezoid']],
  [/triangle/, ['triangle']],
  [/cloud/, ['cloud']],
  [/callout|speech/, ['callout']],
  [/note|comment|sticky/, ['uml.note']],
  [/actor|stick_?figure|person|user/, ['uml.actor']],
  [/package|folder/, ['uml.package']],
  [/component/, ['uml.component']],
  [/lifeline|object_timeline/, ['uml.lifeline']],
  [/^node$|_node|node_/, ['uml.node']],
  [/class|interface/, ['uml.class']],
  [/entity|table/, ['erd.entity']],
  [/swimlane|pool|lane|container/, ['container']],
  [/initial_state|start_state/, ['uml.initial']],
  [/final_state|end_state/, ['uml.final']],
  [/star/, ['basic.star', 'rectangle']],
  [/arrow/, ['blockArrow']],
  [/ellipse|circle|oval|connector/, ['ellipse']],
  [/rectangle|process|square|box/, ['rectangle'], { radius: 0 }],
  [/text/, ['text'], { fill: 'none', stroke: 'none' }],
];

/** Gliffy arrow ids → ArkDraw heads (approximate; Gliffy uses ~20 numbered styles). */
function arrowOf(n: number | undefined): ArrowHead {
  switch (n ?? 0) {
    case 0:
      return 'none';
    case 1:
    case 2:
      return 'triangle';
    case 3:
    case 4:
      return 'arrow';
    case 5:
    case 6:
      return 'triangleOpen';
    case 7:
      return 'diamond';
    case 8:
      return 'diamondOpen';
    case 9:
      return 'circle';
    case 10:
      return 'circleOpen';
    case 11:
      return 'erOne';
    case 12:
      return 'erMany';
    case 13:
      return 'erOneMany';
    case 14:
      return 'erZeroMany';
    case 15:
      return 'erZeroOne';
    case 16:
      return 'erOnlyOne';
    default:
      return 'triangle';
  }
}

function kindOf(o: GObject): { kind: string; style: Partial<ElementStyle>; known: boolean } {
  const tid = o.graphic?.Shape?.tid ?? '';
  const name = /stencil\.([^.]+)\./.exec(tid)?.[1] ?? '';
  const keys = [(o.uid ?? '').split('.').slice(-2).join('_'), name, o.uid ?? ''].filter(Boolean);
  for (const k of keys) {
    for (const [re, kinds, style] of STENCILS) {
      if (re.test(k.toLowerCase())) return { kind: pickKind(...kinds), style: style ?? {}, known: true };
    }
  }
  return { kind: 'rectangle', style: {}, known: false };
}

const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function importGliffy(text: string): ImportResult {
  let data: { stage?: { objects?: GObject[] }; contentType?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a Gliffy file (invalid JSON).');
  }
  const objects = data?.stage?.objects;
  if (!Array.isArray(objects)) throw new Error('This is not a Gliffy diagram (no stage.objects).');

  const warnings: string[] = [];
  let unknown = 0;
  const shapes = new Map<string, ShapeElement>();
  const containers: ShapeElement[] = [];
  const leaves: ShapeElement[] = [];
  const lines: Array<{ o: GObject; ox: number; oy: number; groups: string[] }> = [];

  const textOf = (o: GObject) => {
    const t = (o.children ?? []).find((c) => c.graphic?.type === 'Text');
    return t?.graphic?.Text?.html ? htmlToPlain(t.graphic.Text.html) : '';
  };

  const visit = (o: GObject, ox: number, oy: number, groups: string[], container?: ShapeElement) => {
    if (o.hidden) return;
    const x = ox + n(o.x);
    const y = oy + n(o.y);
    const w = Math.max(1, n(o.width, 120));
    const h = Math.max(1, n(o.height, 60));
    const type = o.graphic?.type;
    const children = o.children ?? [];
    if (type === 'Line') {
      lines.push({ o, ox, oy, groups });
      return;
    }
    if (!type || (o.uid ?? '').includes('group')) {
      if (!children.length) return;
      const gid = uid();
      for (const c of children) visit(c, x, y, [gid, ...groups], container);
      return;
    }
    let shape: ShapeElement;
    if (type === 'Shape') {
      const g = o.graphic!.Shape!;
      const k = kindOf(o);
      if (!k.known) unknown++;
      const style: Partial<ElementStyle> = { radius: 0, ...k.style };
      const fill = normColor(g.fillColor);
      if (fill && k.kind !== 'text') style.fill = fill;
      const stroke = normColor(g.strokeColor);
      if (stroke && k.kind !== 'text') style.stroke = g.strokeWidth === 0 ? 'none' : stroke;
      if (g.strokeWidth !== undefined) style.strokeWidth = g.strokeWidth;
      if (g.dashStyle) style.strokeStyle = 'dashed';
      if (g.dropShadow) style.shadow = true;
      if (g.opacity !== undefined && g.opacity < 1) style.opacity = g.opacity;
      if (k.kind === 'container') Object.assign(style, { verticalAlign: 'top', bold: true });
      shape = createShape(k.kind, { x, y, w, h }, style, textOf(o));
    } else if (type === 'Text') {
      shape = createShape('text', { x, y, w, h }, { fill: 'none', stroke: 'none' }, htmlToPlain(o.graphic?.Text?.html ?? ''));
    } else if (type === 'Image') {
      const url = o.graphic?.Image?.url;
      if (url && (hasKind('image') || hasKind('icon'))) {
        shape = createShape(pickKind('image', 'icon'), { x, y, w, h }, { fill: 'none', stroke: 'none' }, textOf(o));
        shape.icon = url;
      } else {
        unknown++;
        shape = createShape('rectangle', { x, y, w, h }, {}, textOf(o));
      }
    } else {
      unknown++;
      shape = createShape('rectangle', { x, y, w, h }, {}, textOf(o));
    }
    if (n(o.rotation)) shape.rotation = n(o.rotation);
    shape.groupIds = [...groups];
    if (container) shape.containerId = container.id;
    shapes.set(String(o.id), shape);
    (shape.kind === 'container' ? containers : leaves).push(shape);
    const inner = children.filter((c) => c.graphic?.type !== 'Text');
    for (const c of inner) visit(c, x, y, groups, shape.kind === 'container' ? shape : container);
  };
  for (const o of objects) visit(o, 0, 0, []);

  const connectors: ConnectorElement[] = [];
  for (const { o, ox, oy, groups } of lines) {
    const g = o.graphic!.Line!;
    const bx = ox + n(o.x);
    const by = oy + n(o.y);
    const path: Vec[] = (g.controlPath ?? []).filter((p) => Array.isArray(p) && p.length >= 2).map(([px, py]) => ({ x: bx + px, y: by + py }));
    const startId = o.constraints?.startConstraint?.StartPositionConstraint?.nodeId;
    const endId = o.constraints?.endConstraint?.EndPositionConstraint?.nodeId;
    const a = startId !== undefined ? shapes.get(String(startId)) : undefined;
    const b = endId !== undefined ? shapes.get(String(endId)) : undefined;
    const p0 = path[0] ?? (a ? { x: a.x + a.w / 2, y: a.y + a.h / 2 } : { x: bx, y: by });
    const p1 = path[path.length - 1] ?? (b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: bx + n(o.width), y: by + n(o.height) });
    const routing = g.ortho ? 'orthogonal' : /curve|quad|spline/i.test(g.interpolationType ?? '') ? 'curved' : 'straight';
    const conn = createConnector(a ? attach(a, p1) : endpointAt(undefined, p0), b ? attach(b, p0) : endpointAt(undefined, p1), {
      routing,
      startArrow: arrowOf(g.startArrow),
      endArrow: arrowOf(g.endArrow),
      text: textOf(o),
    });
    if (routing === 'straight' && path.length > 2) conn.waypoints = path.slice(1, -1).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    conn.style = {
      ...conn.style,
      ...(normColor(g.strokeColor) ? { stroke: normColor(g.strokeColor)! } : {}),
      ...(g.strokeWidth ? { strokeWidth: g.strokeWidth } : {}),
      ...(g.dashStyle ? { strokeStyle: 'dashed' as const } : {}),
    };
    conn.groupIds = [...groups];
    connectors.push(conn);
  }
  if (unknown) warnings.push(`${unknown} unsupported Gliffy shape(s) were imported as rectangles.`);
  const elements: DiagramElement[] = [...containers, ...leaves, ...connectors];
  if (!elements.length) throw new Error('The Gliffy diagram is empty.');
  return { pages: [{ name: 'Gliffy', doc: makeDoc(elements) }], warnings };
}

export const importer: Importer = {
  id: 'gliffy',
  label: 'Gliffy…',
  description: 'Gliffy diagrams (.gliffy JSON): shapes, text, lines, groups and swimlanes.',
  extensions: ['gliffy'],
  acceptsText: false,
  detect: (content, fileName) =>
    /\.gliffy$/i.test(fileName ?? '') || (typeof content === 'string' && /"contentType"\s*:\s*"application\/gliffy\+json"/.test(content.slice(0, 2000))),
  run: async (content) => importGliffy(toText(content)),
};
