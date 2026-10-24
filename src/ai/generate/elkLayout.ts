/**
 * Layered layout with globally routed orthogonal edges, for diagrams the
 * assistant generates.
 *
 * Unlike the per-container layout in layout.ts (whose edges are routed one
 * by one when drawn), every edge here is routed together with all the
 * others: edges get their own lanes and ports, go around shapes and
 * containers, and labels get room of their own. Containers are real compound
 * nodes, so edges between nested shapes are routed across the whole diagram.
 *
 * The layout engine is loaded on first use (it is large), and runs in the
 * same thread: generated diagrams are small.
 */
import type { ELK, ElkExtendedEdge, ElkLabel, ElkNode, ElkPoint, ElkPort } from 'elkjs/lib/elk-api';
import type { Rect, Vec } from '@/model/types';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import type { LayoutEdge, LayoutOptions } from './layout';
import type { ResolvedNode } from './resolve';

export interface RoutedEdge {
  /** Start (on the source's border), bend points, end (on the target's border). */
  points: Vec[];
  /** Center of the edge label, when it has one. */
  label?: Vec;
}

export interface RoutedLayout {
  /** Shape rect per node id (labels below shapes are outside these rects). */
  rects: Map<string, Rect>;
  /** Route per edge, by index; missing for edges the engine couldn't route. */
  routes: Array<RoutedEdge | undefined>;
  /** Bounds of everything, including labels. Starts at (0,0). */
  width: number;
  height: number;
}

const DIRECTION = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' } as const;

type Side = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
/** Per flow direction: the side edges come in on, then the sides edges leave by (in order of use). */
const FLOW_SIDES: Record<keyof typeof DIRECTION, { in: Side; out: Side[] }> = {
  TB: { in: 'NORTH', out: ['SOUTH', 'EAST', 'WEST'] },
  BT: { in: 'SOUTH', out: ['NORTH', 'EAST', 'WEST'] },
  LR: { in: 'WEST', out: ['EAST', 'SOUTH', 'NORTH'] },
  RL: { in: 'EAST', out: ['WEST', 'SOUTH', 'NORTH'] },
};

/** Shapes whose outline only touches their box at the middle of each side: edges attach at those tips. */
const TIP_SHAPES = new Set(['diamond', 'ellipse', 'circle', 'hexagon', 'triangle', 'uml.initial', 'uml.final']);

/** Same wrapping and padding as connector labels on the canvas (src/canvas/ElementBodies.tsx). */
const LABEL_MAX_WIDTH = 220;
function labelSize(text: string): { width: number; height: number } {
  const lines = wrapText(text, LABEL_MAX_WIDTH, DEFAULT_CONNECTOR_STYLE);
  const w = Math.max(...lines.map((l) => measureText(l, DEFAULT_CONNECTOR_STYLE)), 4);
  return { width: Math.ceil(w + 12), height: Math.ceil(lines.length * lineHeight(DEFAULT_CONNECTOR_STYLE.fontSize) + 6) };
}

let engine: Promise<ELK> | null = null;
const loadEngine = () => (engine ??= import('elkjs/lib/elk.bundled.js').then((m) => new m.default()));

export async function layoutRouted(nodes: ResolvedNode[], edges: LayoutEdge[], opts: LayoutOptions): Promise<RoutedLayout> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = (id: string) => {
    const p = byId.get(id)?.parent;
    return p && byId.has(p) ? p : undefined;
  };
  const isAncestor = (anc: string, id: string) => {
    for (let p = parentOf(id), guard = 0; p && guard < 1000; p = parentOf(p), guard++) if (p === anc) return true;
    return false;
  };

  const elkNodes = new Map<string, ElkNode>();
  for (const n of nodes) {
    const node: ElkNode = { id: n.id, layoutOptions: {} };
    if (n.container) {
      const { top, left, bottom, right } = n.padding;
      node.layoutOptions!['elk.padding'] = `[top=${top},left=${left},bottom=${bottom},right=${right}]`;
      node.layoutOptions!['elk.nodeSize.minimum'] = `(${n.w}, ${n.h})`;
      node.layoutOptions!['elk.nodeSize.constraints'] = 'MINIMUM_SIZE';
      node.children = [];
    } else {
      node.width = n.w;
      node.height = n.h;
      if (TIP_SHAPES.has(n.kind)) {
        const tip: Record<Side, Vec> = { NORTH: { x: n.w / 2, y: 0 }, SOUTH: { x: n.w / 2, y: n.h }, EAST: { x: n.w, y: n.h / 2 }, WEST: { x: 0, y: n.h / 2 } };
        node.ports = (Object.keys(tip) as Side[]).map<ElkPort>((side) => ({
          id: `${n.id}\u0000${side}`,
          x: tip[side].x,
          y: tip[side].y,
          width: 0,
          height: 0,
          layoutOptions: { 'elk.port.side': side },
        }));
        node.layoutOptions!['elk.portConstraints'] = 'FIXED_POS';
      }
      if (n.labelBelow > 0) {
        // The caption under an icon: kept clear of other shapes and edges.
        node.labels = [{ text: n.text, width: n.boxW, height: n.labelBelow }];
        node.layoutOptions!['elk.nodeLabels.placement'] = 'OUTSIDE V_BOTTOM H_CENTER';
      }
    }
    elkNodes.set(n.id, node);
  }
  const roots: ElkNode[] = [];
  for (const n of nodes) {
    const p = parentOf(n.id);
    const parent = p ? elkNodes.get(p) : undefined;
    if (parent?.children) parent.children.push(elkNodes.get(n.id)!);
    else roots.push(elkNodes.get(n.id)!);
  }
  // A container without children still needs a size.
  for (const n of nodes) {
    const node = elkNodes.get(n.id)!;
    if (n.container && !node.children!.length) {
      delete node.children;
      node.width = n.w;
      node.height = Math.max(n.h, n.padding.top + n.padding.bottom + 40);
    }
  }

  const sides = FLOW_SIDES[opts.direction];
  const outCount = new Map<string, number>();
  /** Tip shapes: edges come in at the tip facing the flow, and leave by the opposite tip, then the sides. */
  const endRef = (id: string, outgoing: boolean) => {
    if (!elkNodes.get(id)?.ports) return id;
    if (!outgoing) return `${id}\u0000${sides.in}`;
    const k = outCount.get(id) ?? 0;
    outCount.set(id, k + 1);
    return `${id}\u0000${sides.out[k % sides.out.length]}`;
  };
  const elkEdges: ElkExtendedEdge[] = [];
  edges.forEach((e, i) => {
    // Edges between a container and its own content can't be laid out as edges; they're drawn later.
    if (!byId.has(e.from) || !byId.has(e.to) || e.from === e.to || isAncestor(e.from, e.to) || isAncestor(e.to, e.from)) return;
    // Inline: the label sits on the line (as the canvas draws it), with room kept for it.
    const labels: ElkLabel[] = e.label ? [{ text: e.label, ...labelSize(e.label), layoutOptions: { 'elk.edgeLabels.inline': 'true' } }] : [];
    elkEdges.push({ id: `e${i}`, sources: [endRef(e.from, true)], targets: [endRef(e.to, false)], labels });
  });

  const nodesep = opts.nodesep ?? 48;
  const ranksep = opts.ranksep ?? 64;
  const graph: ElkNode = {
    id: '\u0000root',
    children: roots,
    edges: elkEdges,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIRECTION[opts.direction],
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.json.edgeCoords': 'ROOT',
      'elk.spacing.nodeNode': String(nodesep),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(ranksep),
      'elk.spacing.edgeNode': '24',
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.spacing.edgeEdge': '16',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
      'elk.spacing.edgeLabel': '4',
      'elk.spacing.labelNode': '6',
      'elk.layered.edgeLabels.sideSelection': 'SMART_DOWN',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
      'elk.layered.thoroughness': '20',
      'elk.layered.unnecessaryBendpoints': 'false',
      'elk.layered.mergeEdges': 'false',
    },
  };

  const elk = await loadEngine();
  const out = await elk.layout(graph);

  const rects = new Map<string, Rect>();
  // Node positions are relative to their parent; edge coordinates are absolute (edgeCoords ROOT).
  const visit = (list: ElkNode[] | undefined, ox: number, oy: number) => {
    for (const n of list ?? []) {
      const x = ox + (n.x ?? 0);
      const y = oy + (n.y ?? 0);
      rects.set(n.id, { x, y, w: n.width ?? 0, h: n.height ?? 0 });
      visit(n.children, x, y);
    }
  };
  visit(out.children, 0, 0);

  const routes: Array<RoutedEdge | undefined> = edges.map(() => undefined);
  const collectEdges = (n: ElkNode) => {
    for (const e of (n.edges ?? []) as ElkExtendedEdge[]) {
      const i = Number(e.id.slice(1));
      const pts: ElkPoint[] = [];
      for (const s of e.sections ?? []) pts.push(s.startPoint, ...(s.bendPoints ?? []), s.endPoint);
      if (pts.length < 2) continue;
      const l = e.labels?.[0];
      routes[i] = {
        points: pts.map((p) => ({ x: p.x, y: p.y })),
        label: l && l.x !== undefined && l.y !== undefined ? { x: l.x + (l.width ?? 0) / 2, y: l.y + (l.height ?? 0) / 2 } : undefined,
      };
    }
    for (const c of n.children ?? []) collectEdges(c);
  };
  collectEdges(out);

  // Normalize to start at (0,0), counting captions and labels.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, w = 0, h = 0) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };
  for (const [id, r] of rects) {
    const n = byId.get(id)!;
    grow(r.x - (n.boxW - r.w) / 2, r.y, n.container ? r.w : Math.max(r.w, n.boxW), r.h + (n.container ? 0 : n.labelBelow));
  }
  for (const r of routes) for (const p of r?.points ?? []) grow(p.x, p.y);
  if (!Number.isFinite(minX)) return { rects, routes, width: 0, height: 0 };
  for (const [id, r] of rects) rects.set(id, { ...r, x: r.x - minX, y: r.y - minY });
  for (const r of routes) {
    if (!r) continue;
    r.points = r.points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
    if (r.label) r.label = { x: r.label.x - minX, y: r.label.y - minY };
  }
  return { rects, routes, width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY) };
}
