/**
 * Turns spec nodes into concrete shapes: registry kind, final text (C4 / UML
 * / ERD formats), style (diagram conventions + model hints) and a size that
 * fits the text. Containers get paddings; their size comes from the layout.
 */
import type { ElementStyle } from '@/model/types';
import { DEFAULT_STYLE } from '@/model/defaults';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { c4Layout, compartmentHeight, getShapeDef, textBoxOf } from '@/shapes/registry';
import { CONTAINER_KINDS, type DiagramSpec, type DiagramType, type SpecNode } from './spec';
import { dominantCloud, groupIcon, groupStyle, GROUP_ICON_SIZE } from '@/shapes/cloudGroups';

export { dominantCloud, groupIcon, GROUP_ICON_SIZE };

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResolvedNode {
  id: string;
  parent?: string;
  /** Registry kind. */
  kind: string;
  text: string;
  icon?: string;
  style: ElementStyle;
  /** Shape size (for containers: minimum size; the layout grows it). */
  w: number;
  h: number;
  /** Extra height reserved under the shape for a `below` label. */
  labelBelow: number;
  /** Width the shape + its label occupy (≥ w). */
  boxW: number;
  container: boolean;
  padding: Padding;
}

// ---------------------------------------------------------------------------
// Conventions
// ---------------------------------------------------------------------------

export const C4_COLORS = {
  person: { fill: '#08427B', stroke: '#073B6F', textColor: '#ffffff' },
  system: { fill: '#1168BD', stroke: '#0B4884', textColor: '#ffffff' },
  container: { fill: '#438DD5', stroke: '#3C7FC0', textColor: '#ffffff' },
  component: { fill: '#85BBF0', stroke: '#78A8D8', textColor: '#000000' },
  external: { fill: '#999999', stroke: '#8A8A8A', textColor: '#ffffff' },
  boundary: { fill: 'none', stroke: '#444444', textColor: '#444444' },
} as const;

const FLOW_STYLES: Record<string, Partial<ElementStyle>> = {
  'flow.terminator': { fill: '#dcfce7', stroke: '#16a34a' },
  diamond: { fill: '#fef3c7', stroke: '#d97706' },
  rectangle: { fill: '#e0e7ff', stroke: '#4f46e5' },
  'flow.predefined': { fill: '#e0e7ff', stroke: '#4f46e5' },
  parallelogram: { fill: '#ccfbf1', stroke: '#0d9488' },
  'flow.manualInput': { fill: '#ccfbf1', stroke: '#0d9488' },
  'flow.document': { fill: '#fce7f3', stroke: '#db2777' },
  cylinder: { fill: '#ede9fe', stroke: '#7c3aed' },
  'flow.delay': { fill: '#ffedd5', stroke: '#ea580c' },
};

const KIND_STYLES: Record<string, Partial<ElementStyle>> = {
  'uml.class': { fill: '#ffffff', stroke: '#4f46e5', fontSize: 13 },
  'erd.entity': { fill: '#ffffff', stroke: '#0d9488', fontSize: 13 },
  'uml.note': { fill: '#fef9c3', stroke: '#ca8a04' },
  sticky: { fill: '#fef3c7', stroke: 'none', shadow: true },
  cylinder: { fill: '#ede9fe', stroke: '#7c3aed' },
  'uml.lifeline': { fill: '#e0e7ff', stroke: '#4f46e5' },
  text: { fill: 'none', stroke: 'none' },
  icon: { fill: 'none', stroke: 'none', fontSize: 12 },
};

function containerStyle(n: SpecNode): Partial<ElementStyle> {
  return groupStyle(n.text);
}

// ---------------------------------------------------------------------------
// Text formats
// ---------------------------------------------------------------------------

const C4_BOX = new Set(['c4.system', 'c4.container', 'c4.component']);

export function c4Text(n: SpecNode, kind: string): string {
  if (/\n\s*\[/.test(n.text) || (!n.technology && !n.description && kind === 'c4.boundary' && n.text.includes('['))) return n.text;
  const tech = n.technology ? `: ${n.technology}` : '';
  let type: string;
  switch (kind) {
    case 'c4.person':
      type = n.external ? 'External Person' : 'Person';
      break;
    case 'c4.system':
      type = n.external ? 'External System' : 'Software System';
      break;
    case 'c4.component':
      type = `Component${tech}`;
      break;
    case 'c4.boundary':
      type = n.technology ?? 'System Boundary';
      return `${n.text}\n[${type}]`;
    default:
      type = `${n.external ? 'External ' : ''}Container${tech}`;
  }
  return `${n.text}\n[${type}]${n.description ? `\n\n${n.description}` : ''}`;
}

export function compartmentText(n: SpecNode): string {
  if (/\n\s*-{2,}\s*(\n|$)/.test(n.text) || (!n.attributes && !n.methods)) return n.text;
  const parts = [n.text];
  if (n.attributes || n.methods) parts.push((n.attributes ?? []).join('\n'));
  if (n.methods) parts.push(n.methods.join('\n'));
  return parts.join('\n--\n');
}

// ---------------------------------------------------------------------------
// Sizing
// ---------------------------------------------------------------------------

const BASE_SIZE: Record<string, [number, number]> = {
  rectangle: [160, 64], ellipse: [150, 80], diamond: [170, 100], triangle: [150, 110], hexagon: [170, 72],
  parallelogram: [180, 64], trapezoid: [170, 64], cylinder: [120, 90], cloud: [190, 120], callout: [170, 90],
  blockArrow: [160, 70], text: [160, 30], sticky: [180, 120], container: [220, 140],
  'flow.terminator': [150, 52], 'flow.document': [160, 76], 'flow.predefined': [170, 64],
  'flow.internalStorage': [160, 76], 'flow.manualInput': [160, 70], 'flow.manualOperation': [170, 64],
  'flow.delay': [150, 64], 'flow.offPage': [80, 80],
  'uml.package': [180, 110], 'uml.component': [190, 70], 'uml.note': [180, 90], 'uml.node': [180, 100],
  'uml.lifeline': [140, 300], 'uml.actor': [36, 72], 'uml.initial': [28, 28], 'uml.final': [32, 32],
  'erd.weakEntity': [160, 64], 'erd.multivalued': [150, 70],
  icon: [56, 56],
};

const MAX_W = 300;
const LABEL_MAX_W = 150;

function fitBox(kind: string, text: string, style: ElementStyle): [number, number] {
  const [bw, bh] = BASE_SIZE[kind] ?? [160, 64];
  if (!text.trim()) return [bw, bh];
  const def = getShapeDef(kind);
  const tb = textBoxOf(def, bw, bh);
  const fw = Math.max(0.3, tb.w / bw);
  const fh = Math.max(0.3, tb.h / bh);
  const longest = Math.max(...text.split('\n').map((l) => measureText(l, style)));
  const w = Math.round(Math.min(MAX_W, Math.max(bw, (longest + 12) / fw)));
  const inner = textBoxOf(def, w, bh).w;
  const lines = wrapText(text, Math.max(20, inner - 4), style).length;
  const h = Math.round(Math.max(bh, (lines * lineHeight(style.fontSize) + 14) / fh));
  return [w, h];
}

function sizeLeaf(kind: string, text: string, style: ElementStyle): { w: number; h: number; labelBelow: number; boxW: number } {
  const def = getShapeDef(kind);
  if (def.textPlacement === 'below') {
    const [w, h] = kind.startsWith('net.') ? [64, 64] : (BASE_SIZE[kind] ?? [56, 56]);
    const lines = text.trim() ? wrapText(text, LABEL_MAX_W, style) : [];
    const labelW = lines.length ? Math.max(...lines.map((l) => measureText(l, style))) : 0;
    const labelBelow = lines.length ? Math.ceil(lines.length * lineHeight(style.fontSize) + 8) : 0;
    return { w, h, labelBelow, boxW: Math.ceil(Math.max(w, Math.min(LABEL_MAX_W, labelW) + 8)) };
  }
  if (kind === 'uml.class' || kind === 'erd.entity') {
    const [header = '', ...rows] = text.split('\n');
    const longest = Math.max(measureText(header, { ...style, bold: true }), ...rows.map((r) => measureText(r, style)));
    const w = Math.round(Math.min(340, Math.max(180, longest + 30)));
    return { w, h: Math.ceil(compartmentHeight(w, style, text)), labelBelow: 0, boxW: w };
  }
  if (kind === 'c4.person') {
    const w = 210;
    const textH = c4Layout(text, w - 24, style).height;
    const h = Math.round(Math.max(180, 112 + textH));
    return { w, h, labelBelow: 0, boxW: w };
  }
  if (kind === 'c4.box' || kind === 'c4.database' || kind === 'c4.queue' || kind === 'c4.browser') {
    const w = kind === 'c4.queue' ? 270 : 240;
    const inset = kind === 'c4.queue' ? 56 : 24;
    const textH = c4Layout(text, w - inset, style).height;
    const extra = kind === 'c4.database' ? 70 : kind === 'c4.browser' ? 56 : 34;
    const min = kind === 'c4.database' ? 140 : kind === 'c4.browser' ? 150 : 120;
    return { w, h: Math.round(Math.max(min, textH + extra)), labelBelow: 0, boxW: w };
  }
  const [w, h] = fitBox(kind, text, style);
  return { w, h, labelBelow: 0, boxW: w };
}

function containerPadding(kind: string, text: string, style: ElementStyle): Padding {
  if (kind === 'c4.boundary') {
    const textH = c4Layout(text, 400, style).height;
    return { top: 28, right: 28, bottom: Math.ceil(textH + 34), left: 28 };
  }
  if (kind === 'uml.frame') return { top: 44, right: 24, bottom: 24, left: 24 };
  return { top: 36 + 22, right: 24, bottom: 24, left: 24 };
}

// ---------------------------------------------------------------------------

export function defaultDirection(type: DiagramType): 'TB' | 'LR' {
  return type === 'cloud' || type === 'erd' || type === 'network' ? 'LR' : 'TB';
}

export function resolveNode(n: SpecNode, type: DiagramType, hasChildren: boolean, cloud?: string): ResolvedNode {
  let kind = n.kind;
  let text = n.text;
  let style: Partial<ElementStyle> = {};
  const isC4 = kind.startsWith('c4.');

  if (hasChildren && !CONTAINER_KINDS.has(kind)) kind = type === 'c4' ? 'c4.boundary' : 'container';
  // Generic containers are drawn as groups: logo + title, no header rule.
  if (kind === 'container') kind = 'group';
  const container = CONTAINER_KINDS.has(kind);

  if (isC4 || kind === 'c4.boundary') {
    text = c4Text(n, kind);
    if (C4_BOX.has(kind)) kind = 'c4.box';
    const level = n.external
      ? 'external'
      : n.kind === 'c4.person'
        ? 'person'
        : n.kind === 'c4.system'
          ? 'system'
          : n.kind === 'c4.component'
            ? 'component'
            : n.kind === 'c4.boundary'
              ? 'boundary'
              : 'container';
    style = { ...C4_COLORS[level], fontSize: 13, radius: 10 };
    if (level === 'boundary') style = { ...style, strokeStyle: 'dashed', textAlign: 'left', verticalAlign: 'bottom', fontSize: 12, radius: 6 };
  } else if (kind === 'uml.class' || kind === 'erd.entity') {
    text = compartmentText(n);
    style = { ...KIND_STYLES[kind] };
  } else if (container) {
    style = kind === 'group' ? containerStyle(n) : { fill: 'none', stroke: '#475569', textAlign: 'left', fontSize: 12, bold: true };
  } else if (kind.startsWith('net.')) {
    style = { fill: '#ffffff', stroke: '#2563eb', fontSize: 12, radius: 12 };
  } else {
    style = { ...(KIND_STYLES[kind] ?? {}), ...(type === 'flowchart' ? (FLOW_STYLES[kind] ?? {}) : {}) };
    if (getShapeDef(kind).textPlacement === 'below') style.fontSize = 12;
  }

  // Model hints win over conventions.
  const hints = n.style;
  if (hints) {
    if (hints.fill) style.fill = hints.fill;
    if (hints.stroke) style.stroke = hints.stroke;
    if (hints.textColor) style.textColor = hints.textColor;
    if (hints.dashed !== undefined) style.strokeStyle = hints.dashed ? 'dashed' : 'solid';
    if (hints.bold !== undefined) style.bold = hints.bold;
  }
  const full: ElementStyle = { ...DEFAULT_STYLE, ...style };

  if (container) {
    const padding = containerPadding(kind, text, full);
    const labelW = Math.max(...text.split('\n').map((l) => measureText(l, { ...full, fontSize: full.fontSize + 2, bold: true })));
    const [bw, bh] = BASE_SIZE.container;
    const w = Math.ceil(Math.max(bw, labelW + padding.left + padding.right + 8));
    const icon = kind === 'group' ? (n.icon ?? groupIcon(text, cloud)) : undefined;
    const iconW = icon ? GROUP_ICON_SIZE + 8 : 0;
    return { id: n.id, parent: n.parent, kind, text, icon, style: full, w: w + iconW, h: bh, labelBelow: 0, boxW: w + iconW, container: true, padding };
  }

  const size = sizeLeaf(kind, text, full);
  return {
    id: n.id,
    parent: n.parent,
    kind,
    text,
    icon: kind === 'icon' ? n.icon : undefined,
    style: full,
    ...size,
    container: false,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

export function resolveSpec(spec: DiagramSpec): ResolvedNode[] {
  const parents = new Set(spec.nodes.map((n) => n.parent).filter((p): p is string => !!p));
  const cloud = dominantCloud(spec.nodes);
  return spec.nodes.map((n) => resolveNode(n, spec.type, parents.has(n.id), cloud));
}
