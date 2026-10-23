/**
 * Tree editing helpers for mind maps / trees (Tab = add child, Enter = add
 * sibling, Shift+Enter = add sibling before). They only create elements;
 * the caller adds them to the document (and may re-run a tree layout).
 * The new node is positioned so that tree layouts, which order siblings by
 * their current position, keep it in the intended slot.
 */
import type { ConnectorElement, Doc, Endpoint, ShapeElement } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';

const GAP = 20;
const LEVEL_GAP = 80;

export interface NewNode {
  shape: ShapeElement;
  connector: ConnectorElement | null;
}

const shapeIn = (doc: Doc, id: string | undefined): ShapeElement | undefined => {
  const el = id ? doc.elements[id] : undefined;
  return isShape(el) ? el : undefined;
};

/** Connectors in z-order. */
const connectorsOf = (doc: Doc): ConnectorElement[] =>
  doc.order.map((id) => doc.elements[id]).filter((el): el is ConnectorElement => isConnector(el));

function childrenOf(doc: Doc, parentId: string): { shape: ShapeElement; via: ConnectorElement }[] {
  const out: { shape: ShapeElement; via: ConnectorElement }[] = [];
  const seen = new Set<string>();
  for (const c of connectorsOf(doc)) {
    if (c.source.elementId !== parentId) continue;
    const s = shapeIn(doc, c.target.elementId);
    if (s && s.id !== parentId && !seen.has(s.id)) {
      seen.add(s.id);
      out.push({ shape: s, via: c });
    }
  }
  return out;
}

function parentOf(doc: Doc, nodeId: string): { shape: ShapeElement; via: ConnectorElement } | undefined {
  for (const c of connectorsOf(doc)) {
    if (c.target.elementId !== nodeId) continue;
    const s = shapeIn(doc, c.source.elementId);
    if (s && s.id !== nodeId) return { shape: s, via: c };
  }
  return undefined;
}

function cloneNode(from: ShapeElement, x: number, y: number): ShapeElement {
  const s = createShape(from.kind, { x: Math.round(x), y: Math.round(y), w: from.w, h: from.h }, { ...from.style }, 'Topic');
  if (from.containerId) s.containerId = from.containerId;
  if (from.icon) s.icon = from.icon;
  return s;
}

function link(a: ShapeElement, b: ShapeElement, template?: ConnectorElement): ConnectorElement {
  const center = (s: ShapeElement) => ({ x: Math.round(s.x + s.w / 2), y: Math.round(s.y + s.h / 2) });
  const src: Endpoint = { elementId: a.id, side: 'auto', ...center(a) };
  const dst: Endpoint = { elementId: b.id, side: 'auto', ...center(b) };
  if (!template) return createConnector(src, dst);
  return createConnector(src, dst, {
    routing: template.routing,
    startArrow: template.startArrow,
    endArrow: template.endArrow,
    style: { ...template.style },
  });
}

/**
 * Creates a child of `parentId` (same kind/style, text "Topic") plus the
 * connector from the parent. With `right` the child goes right of the parent
 * (below its last child, if any); with `down` it goes below the parent (right
 * of its last child, if any).
 */
export function addChildNode(doc: Doc, parentId: string, direction: 'right' | 'down'): NewNode {
  const parent = shapeIn(doc, parentId);
  if (!parent) throw new Error(`addChildNode: ${parentId} is not a shape`);
  const kids = childrenOf(doc, parentId);
  let x: number;
  let y: number;
  if (direction === 'right') {
    const last = kids.map((k) => k.shape).sort((a, b) => b.y + b.h - (a.y + a.h))[0];
    if (last) {
      x = last.x;
      y = last.y + last.h + GAP;
    } else {
      x = parent.x + parent.w + LEVEL_GAP;
      y = parent.y;
    }
  } else {
    const last = kids.map((k) => k.shape).sort((a, b) => b.x + b.w - (a.x + a.w))[0];
    if (last) {
      x = last.x + last.w + GAP;
      y = last.y;
    } else {
      x = parent.x;
      y = parent.y + parent.h + LEVEL_GAP;
    }
  }
  const shape = cloneNode(parent, x, y);
  return { shape, connector: link(parent, shape, kids[0]?.via ?? parentOf(doc, parentId)?.via) };
}

/**
 * Creates a sibling of `nodeId` right after it (or before it with `before`)
 * and connects it to the node's parent. Siblings are assumed to be stacked
 * vertically when the node sits beside its parent, horizontally when below.
 * A node without a parent gets an unconnected sibling (`connector: null`).
 */
export function addSiblingNode(doc: Doc, nodeId: string, before: boolean): NewNode {
  const node = shapeIn(doc, nodeId);
  if (!node) throw new Error(`addSiblingNode: ${nodeId} is not a shape`);
  const p = parentOf(doc, nodeId);
  const cx = (s: ShapeElement) => s.x + s.w / 2;
  const cy = (s: ShapeElement) => s.y + s.h / 2;
  const vertical = p ? Math.abs(cx(node) - cx(p.shape)) >= Math.abs(cy(node) - cy(p.shape)) : true;
  const siblings = p ? childrenOf(doc, p.shape.id).map((k) => k.shape).filter((s) => s.id !== nodeId) : [];
  const along = vertical ? cy : cx;
  const size = vertical ? node.h : node.w;
  const dir = before ? -1 : 1;
  // Nearest sibling on the requested side: go halfway if it's too close.
  const neighbours = siblings
    .filter((s) => (along(s) - along(node)) * dir > 0)
    .sort((a, b) => Math.abs(along(a) - along(node)) - Math.abs(along(b) - along(node)));
  let delta = size + GAP;
  if (neighbours[0]) delta = Math.min(delta, Math.abs(along(neighbours[0]) - along(node)) / 2);
  const x = vertical ? node.x : node.x + dir * delta;
  const y = vertical ? node.y + dir * delta : node.y;
  const shape = cloneNode(node, x, y);
  return { shape, connector: p ? link(p.shape, shape, p.via) : null };
}
