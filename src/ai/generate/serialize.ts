/**
 * Compact, model-friendly snapshot of the current document for edit mode.
 */
import { isConnector, isShape, type Doc } from '@/model/types';

export interface CompactNode {
  id: string;
  kind: string;
  text?: string;
  icon?: string;
  parent?: string;
  /** [x, y, w, h], rounded. */
  box: [number, number, number, number];
  /** Emphasis animation kind (pulse, glow, bounce). */
  animation?: string;
  /** Build step at which it appears. */
  step?: number;
  selected?: true;
}

export interface CompactEdge {
  id: string;
  from?: string;
  to?: string;
  label?: string;
  startArrow?: string;
  endArrow?: string;
  /** Flow animation kind (flow, dots, pulse). */
  animation?: string;
  step?: number;
  selected?: true;
}

export interface CompactDoc {
  nodes: CompactNode[];
  edges: CompactEdge[];
}

const MAX_TEXT = 600;
const clip = (s: string) => (s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + '…' : s);

export function compactDoc(doc: Doc, selection: string[] = []): CompactDoc {
  const sel = new Set(selection);
  const nodes: CompactNode[] = [];
  const edges: CompactEdge[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (isShape(el)) {
      const n: CompactNode = { id: el.id, kind: el.kind, box: [Math.round(el.x), Math.round(el.y), Math.round(el.w), Math.round(el.h)] };
      if (el.text) n.text = clip(el.text);
      if (el.icon) n.icon = el.icon;
      if (el.containerId && doc.elements[el.containerId]) n.parent = el.containerId;
      if (el.animation && el.animation.kind !== 'none') n.animation = el.animation.kind;
      if (el.reveal) n.step = el.reveal;
      if (sel.has(el.id)) n.selected = true;
      nodes.push(n);
    } else if (isConnector(el)) {
      const e: CompactEdge = { id: el.id };
      if (el.source.elementId) e.from = el.source.elementId;
      if (el.target.elementId) e.to = el.target.elementId;
      if (el.text) e.label = clip(el.text);
      if (el.startArrow !== 'none') e.startArrow = el.startArrow;
      if (el.endArrow !== 'triangle') e.endArrow = el.endArrow;
      if (el.animation && el.animation.kind !== 'none') e.animation = el.animation.reverse ? `${el.animation.kind} (reverse)` : el.animation.kind;
      if (el.reveal) e.step = el.reveal;
      if (sel.has(el.id)) e.selected = true;
      edges.push(e);
    }
  }
  return { nodes, edges };
}

/** JSON text for the prompt: one element per line keeps it compact yet readable. */
export function serializeDoc(doc: Doc, selection: string[] = []): string {
  const c = compactDoc(doc, selection);
  const lines = [
    '{"nodes":[',
    c.nodes.map((n) => JSON.stringify(n)).join(',\n'),
    '],"edges":[',
    c.edges.map((e) => JSON.stringify(e)).join(',\n'),
    ']}',
  ];
  return lines.join('\n');
}
