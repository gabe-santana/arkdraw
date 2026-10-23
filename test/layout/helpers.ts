import { createConnector, createShape } from '@/model/defaults';
import type { Doc, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { seededRandom } from '@/layout/engine';
import type { LayoutAlgorithm } from '@/layout/types';

export interface NodeSpec {
  id: string;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  kind?: string;
  containerId?: string;
  locked?: boolean;
}

export function makeDoc(nodes: NodeSpec[], edges: [string, string][]): Doc {
  const doc: Doc = { elements: {}, order: [] };
  for (const n of nodes) {
    const s = createShape(n.kind ?? 'rectangle', { x: n.x ?? 0, y: n.y ?? 0, w: n.w ?? 120, h: n.h ?? 60 });
    s.id = n.id;
    if (n.containerId) s.containerId = n.containerId;
    if (n.locked) s.locked = true;
    doc.elements[s.id] = s;
    doc.order.push(s.id);
  }
  edges.forEach(([a, b], i) => {
    const c = createConnector({ elementId: a, x: 0, y: 0 }, { elementId: b, x: 0, y: 0 });
    c.id = `e${i}`;
    doc.elements[c.id] = c;
    doc.order.push(c.id);
  });
  return doc;
}

export function applyPatch(doc: Doc, patch: ReturnType<LayoutAlgorithm['run']>): Doc {
  const elements = { ...doc.elements };
  for (const [id, p] of Object.entries(patch)) elements[id] = { ...(elements[id] as ShapeElement), ...p };
  return { elements, order: doc.order };
}

export const shapesOf = (doc: Doc): ShapeElement[] => doc.order.map((id) => doc.elements[id]).filter(isShape);

export function isAncestor(doc: Doc, anc: string, id: string): boolean {
  let cur = (doc.elements[id] as ShapeElement).containerId;
  for (let g = 0; cur && g < 100; g++) {
    if (cur === anc) return true;
    cur = (doc.elements[cur] as ShapeElement | undefined)?.containerId;
  }
  return false;
}

export const overlap = (a: ShapeElement, b: ShapeElement) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Pairs of overlapping shapes, ignoring container/descendant pairs. */
export function overlaps(doc: Doc): [string, string][] {
  const s = shapesOf(doc);
  const out: [string, string][] = [];
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++) {
      if (isAncestor(doc, s[i].id, s[j].id) || isAncestor(doc, s[j].id, s[i].id)) continue;
      if (overlap(s[i], s[j])) out.push([s[i].id, s[j].id]);
    }
  return out;
}

const size = (r: () => number) => ({ w: 60 + Math.round(r() * 120), h: 30 + Math.round(r() * 60) });
const at = (r: () => number) => ({ x: Math.round(r() * 1000), y: Math.round(r() * 800) });

/** Random tree (node 0 is the root). */
export function randomTree(seed: number, n: number): Doc {
  const r = seededRandom(seed);
  const nodes: NodeSpec[] = [];
  const edges: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({ id: `n${i}`, ...size(r), ...at(r) });
    if (i > 0) edges.push([`n${Math.floor(r() * i)}`, `n${i}`]);
  }
  return makeDoc(nodes, edges);
}

/** Random sparse directed graph, may contain cycles and isolated nodes. */
export function randomGraph(seed: number, n: number, m: number): Doc {
  const r = seededRandom(seed);
  const nodes: NodeSpec[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, ...size(r), ...at(r) });
  const edges: [string, string][] = [];
  for (let k = 0; k < m; k++) {
    const a = Math.floor(r() * n);
    const b = Math.floor(r() * n);
    if (a !== b) edges.push([`n${a}`, `n${b}`]);
  }
  return makeDoc(nodes, edges);
}

/** Random DAG (edges only go from lower to higher index). */
export function randomDag(seed: number, n: number, m: number): Doc {
  const r = seededRandom(seed);
  const nodes: NodeSpec[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, ...size(r), ...at(r) });
  const edges: [string, string][] = [];
  for (let k = 0; k < m; k++) {
    const a = Math.floor(r() * n);
    const b = Math.floor(r() * n);
    if (a < b) edges.push([`n${a}`, `n${b}`]);
  }
  return makeDoc(nodes, edges);
}
