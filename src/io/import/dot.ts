/**
 * Graphviz DOT import (mxGraph has no native equivalent). Parses `graph` /
 * `digraph` with node, edge and attribute statements, edge chains
 * (`a -> b -> c`), `{a b}` endpoint sets, default `node` / `edge` attributes
 * and subgraphs: `cluster…` subgraphs (or any subgraph with a `label`) become
 * containers. Common attributes are mapped — `label`, `shape`, `color`,
 * `fillcolor`, `fontcolor`, `style` (filled, dashed, dotted, bold, rounded,
 * invis), `penwidth`, `dir`, `arrowhead` / `arrowtail` and `rankdir` — then
 * the result is auto-laid-out with the shared layered layout. Positions in the
 * file (`pos`) are ignored, and HTML labels are reduced to their text.
 */
import type { ArrowHead, ConnectorElement, ShapeElement } from '@/model/types';
import type { DiagramSpec, Direction, SpecEdge, SpecNode } from '@/ai/generate/spec';
import type { ImportResult, Importer } from './types';
import { layoutSpec, makeDoc, normColor, pickKind, toText } from './_shared';

type Attrs = Record<string, string>;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Tok = { t: 'id'; v: string; quoted?: boolean } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    // Comments: //, /* */, and # lines (preprocessor output).
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (c === '#' && (i === 0 || src[i - 1] === '\n')) {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '-' && (src[i + 1] === '>' || src[i + 1] === '-')) {
      out.push({ t: 'op', v: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if ('{}[];,=:'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '"') {
      let s = '';
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < n) {
          const nx = src[i + 1];
          if (nx === '"') s += '"';
          else if (nx === 'n' || nx === 'l' || nx === 'r') s += '\n';
          else if (nx === '\n') s += '';
          else s += '\\' + nx;
          i += 2;
        } else s += src[i++];
      }
      i++;
      // "a" + "b" concatenation.
      const prev = out[out.length - 1];
      const prev2 = out[out.length - 2];
      if (prev?.t === 'op' && prev.v === '+' && prev2?.t === 'id') {
        out.pop();
        prev2.v += s;
      } else out.push({ t: 'id', v: s, quoted: true });
      continue;
    }
    if (c === '+') {
      out.push({ t: 'op', v: '+' });
      i++;
      continue;
    }
    if (c === '<') {
      // HTML string: balanced < >.
      let depth = 0;
      let j = i;
      for (; j < n; j++) {
        if (src[j] === '<') depth++;
        else if (src[j] === '>' && --depth === 0) break;
      }
      const html = src.slice(i + 1, j);
      out.push({ t: 'id', v: htmlText(html), quoted: true });
      i = j + 1;
      continue;
    }
    const m = /^[A-Za-z_\u0080-￿][\w\u0080-￿.]*|^-?(\.\d+|\d+(\.\d*)?)/.exec(src.slice(i));
    if (m) {
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    i++; // skip anything unrecognised
  }
  return out;
}

const htmlText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{2,}/g, '\n')
    .trim();

// ---------------------------------------------------------------------------
// Parser → graph model
// ---------------------------------------------------------------------------

export interface DotNode {
  id: string;
  attrs: Attrs;
  /** Innermost cluster. */
  cluster?: string;
}
export interface DotEdge {
  from: string;
  to: string;
  attrs: Attrs;
}
export interface DotCluster {
  id: string;
  attrs: Attrs;
  parent?: string;
}
export interface DotGraph {
  directed: boolean;
  name: string;
  attrs: Attrs;
  nodes: Map<string, DotNode>;
  edges: DotEdge[];
  clusters: Map<string, DotCluster>;
}

interface Scope {
  node: Attrs;
  edge: Attrs;
  graph: Attrs;
  cluster?: string;
}

export function parseDot(text: string): DotGraph {
  const toks = tokenize(text);
  let p = 0;
  const peek = (o = 0) => toks[p + o];
  const isOp = (v: string, o = 0) => peek(o)?.t === 'op' && peek(o)!.v === v;
  const take = () => toks[p++];
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`DOT: expected "${v}"${peek() ? ` near "${peek()!.v}"` : ' at the end'}.`);
    p++;
  };

  // Header: [strict] (graph|digraph) [ID] {
  if (peek()?.t === 'id' && peek()!.v.toLowerCase() === 'strict') p++;
  const kw = take();
  if (!kw || kw.t !== 'id' || !/^(di)?graph$/i.test(kw.v)) throw new Error('DOT: the text must start with "graph" or "digraph".');
  const g: DotGraph = { directed: kw.v.toLowerCase() === 'digraph', name: '', attrs: {}, nodes: new Map(), edges: [], clusters: new Map() };
  if (peek()?.t === 'id') g.name = take().v;
  let anon = 0;

  const attrList = (): Attrs => {
    const a: Attrs = {};
    while (isOp('[')) {
      p++;
      while (!isOp(']') && peek()) {
        const k = take();
        if (k.t !== 'id') continue;
        if (isOp('=')) {
          p++;
          const v = take();
          a[k.v.toLowerCase()] = v?.v ?? '';
        } else a[k.v.toLowerCase()] = 'true';
        if (isOp(',') || isOp(';')) p++;
      }
      expect(']');
    }
    return a;
  };

  const ensureNode = (id: string, scope: Scope, attrs: Attrs = {}) => {
    let n = g.nodes.get(id);
    if (!n) {
      n = { id, attrs: { ...scope.node }, cluster: scope.cluster };
      g.nodes.set(id, n);
    } else if (scope.cluster && !n.cluster) n.cluster = scope.cluster; // mentioned inside a cluster → belongs to it (like Graphviz)
    Object.assign(n.attrs, attrs);
    return n;
  };

  /** Node id with optional :port[:compass] (ports are ignored). */
  const nodeId = (): string => {
    const id = take().v;
    while (isOp(':')) {
      p++;
      take();
    }
    return id;
  };

  // eslint-disable-next-line prefer-const
  let stmtList: (scope: Scope) => void;

  /** Edge endpoint: a node id or a `{…}` / subgraph set. Returns the node ids. */
  const endpoint = (scope: Scope): string[] => {
    if (isOp('{') || (peek()?.t === 'id' && peek()!.v.toLowerCase() === 'subgraph')) {
      const before = new Set(g.nodes.keys());
      const inner = subgraph(scope);
      return inner.length ? inner : [...g.nodes.keys()].filter((k) => !before.has(k));
    }
    return [nodeId()];
  };

  /** Parses `[subgraph [ID]] { … }`; returns the node ids mentioned inside. */
  const subgraph = (scope: Scope): string[] => {
    let name = '';
    if (peek()?.t === 'id' && peek()!.v.toLowerCase() === 'subgraph') {
      p++;
      if (peek()?.t === 'id') name = take().v;
    }
    expect('{');
    const id = name || `__anon${anon++}`;
    const mentioned: string[] = [];
    const inner: Scope = { node: { ...scope.node }, edge: { ...scope.edge }, graph: {}, cluster: scope.cluster };
    const isCluster = name.toLowerCase().startsWith('cluster');
    // Decide container-ness after reading attributes (a labelled subgraph is a container too).
    const cluster: DotCluster = { id, attrs: inner.graph, parent: scope.cluster };
    inner.cluster = id;
    g.clusters.set(id, cluster);
    const before = new Set(g.nodes.keys());
    stmtList(inner);
    expect('}');
    for (const k of g.nodes.keys()) if (!before.has(k)) mentioned.push(k);
    if (!(isCluster || inner.graph.label)) {
      // Plain subgraph: just a scope; its nodes belong to the enclosing cluster.
      g.clusters.delete(id);
      for (const n of g.nodes.values()) if (n.cluster === id) n.cluster = scope.cluster;
      for (const c of g.clusters.values()) if (c.parent === id) c.parent = scope.cluster;
    }
    return mentioned;
  };

  stmtList = (scope: Scope) => {
    while (peek() && !isOp('}')) {
      if (isOp(';') || isOp(',')) {
        p++;
        continue;
      }
      const t = peek()!;
      const kwd = t.t === 'id' && !t.quoted ? t.v.toLowerCase() : '';
      if ((kwd === 'graph' || kwd === 'node' || kwd === 'edge') && isOp('[', 1)) {
        p++;
        const a = attrList();
        Object.assign(kwd === 'node' ? scope.node : kwd === 'edge' ? scope.edge : scope.graph, a);
        continue;
      }
      // ID = ID (graph attribute)
      if (t.t === 'id' && isOp('=', 1)) {
        p += 2;
        scope.graph[t.v.toLowerCase()] = take()?.v ?? '';
        continue;
      }
      const left = endpoint(scope);
      if (isOp('->') || isOp('--')) {
        const chain: string[][] = [left];
        while (isOp('->') || isOp('--')) {
          p++;
          chain.push(endpoint(scope));
        }
        const a = attrList();
        for (const ids of chain) for (const id of ids) ensureNode(id, scope);
        for (let i = 0; i + 1 < chain.length; i++) for (const from of chain[i]) for (const to of chain[i + 1]) g.edges.push({ from, to, attrs: { ...scope.edge, ...a } });
        continue;
      }
      const a = attrList();
      if (left.length === 1 && t.t === 'id') ensureNode(left[0], scope, a);
    }
  };

  expect('{');
  const root: Scope = { node: {}, edge: {}, graph: g.attrs };
  stmtList(root);
  if (peek()) expect('}');
  return g;
}

// ---------------------------------------------------------------------------
// Graph model → diagram
// ---------------------------------------------------------------------------

const SHAPE_MAP: Record<string, string[]> = {
  box: ['rectangle'], rect: ['rectangle'], rectangle: ['rectangle'], square: ['rectangle'], record: ['rectangle'],
  mrecord: ['rounded', 'rectangle'], ellipse: ['ellipse'], oval: ['ellipse'], circle: ['ellipse'], doublecircle: ['ellipse'], point: ['ellipse'],
  diamond: ['diamond'], cylinder: ['cylinder'], note: ['note', 'rectangle'], hexagon: ['hexagon'], parallelogram: ['parallelogram'],
  triangle: ['triangle'], invtriangle: ['triangle'], trapezium: ['trapezoid'], invtrapezium: ['trapezoid'], plaintext: ['text'], plain: ['text'],
  none: ['text'], underline: ['text'], folder: ['folder', 'rectangle'], tab: ['folder', 'rectangle'], component: ['component', 'rectangle'],
  octagon: ['octagon', 'hexagon'], star: ['star', 'rectangle'], box3d: ['cube', 'rectangle'],
};

const ARROWS: Record<string, ArrowHead> = {
  normal: 'triangle', inv: 'triangle', empty: 'triangleOpen', onormal: 'triangleOpen', vee: 'arrow', open: 'arrow', halfopen: 'halfArrow',
  diamond: 'diamond', odiamond: 'diamondOpen', ediamond: 'diamondOpen', dot: 'circle', odot: 'circleOpen', invdot: 'circle', invodot: 'circleOpen',
  box: 'box', obox: 'boxOpen', tee: 'dash', crow: 'erMany', none: 'none',
};

const arrow = (name: string | undefined, fallback: ArrowHead): ArrowHead => {
  if (!name) return fallback;
  const key = name.toLowerCase().replace(/^l|^r(?=[a-z]{3})/, '');
  return ARROWS[name.toLowerCase()] ?? ARROWS[key] ?? fallback;
};

/** Graphviz colours: names, #rrggbb[aa], or "H,S,V" / "H S V" (0..1). Lists ("red:blue") use the first. */
export function dotColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.split(/[:;]/)[0].trim().replace(/^\/[^/]*\//, '');
  const hsv = /^([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)$/.exec(v);
  if (hsv) {
    const [h, s, b] = [+hsv[1], +hsv[2], +hsv[3]];
    const f = (n: number) => {
      const k = (n + h * 6) % 6;
      return Math.round((b - b * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
    };
    return '#' + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  return normColor(v) ?? (/^[a-z]+$/i.test(v) ? v.toLowerCase() : undefined);
}

const styles = (a: Attrs) => new Set((a.style ?? '').toLowerCase().split(/[\s,]+/).filter(Boolean));

function labelOf(id: string, a: Attrs): string {
  const raw = a.label ?? id;
  if (raw === '\\N') return id;
  // Record labels: "{a|b|c}" → one field per line.
  const isRecord = /^m?record$/i.test(a.shape ?? '');
  let s = raw.replace(/\\N/g, id).replace(/\\G/g, '');
  if (isRecord) s = s.replace(/[{}]/g, '').replace(/<[^>]*>/g, '').split('|').map((x) => x.trim()).join('\n');
  return s.trim();
}

export function dotToSpec(g: DotGraph): DiagramSpec {
  const rankdir = (g.attrs.rankdir ?? 'TB').toUpperCase();
  const direction: Direction = rankdir === 'LR' || rankdir === 'RL' || rankdir === 'BT' ? (rankdir as Direction) : 'TB';
  const nodes: SpecNode[] = [];
  for (const c of g.clusters.values()) {
    nodes.push({ id: `cluster:${c.id}`, kind: 'container', text: (c.attrs.label ?? c.id.replace(/^cluster_?/i, '')).trim(), ...(c.parent ? { parent: `cluster:${c.parent}` } : {}) });
  }
  for (const n of g.nodes.values()) {
    const shape = (n.attrs.shape ?? 'ellipse').toLowerCase();
    nodes.push({
      id: n.id,
      kind: pickKind(...(SHAPE_MAP[shape] ?? ['ellipse'])),
      text: labelOf(n.id, n.attrs),
      ...(n.cluster && g.clusters.has(n.cluster) ? { parent: `cluster:${n.cluster}` } : {}),
    });
  }
  const edges: SpecEdge[] = g.edges.map((e) => {
    const dir = (e.attrs.dir ?? (g.directed ? 'forward' : 'none')).toLowerCase();
    const head = dir === 'forward' || dir === 'both';
    const tail = dir === 'back' || dir === 'both';
    return {
      from: e.from,
      to: e.to,
      ...(e.attrs.label ? { label: e.attrs.label.replace(/\\[nlr]/g, '\n') } : e.attrs.xlabel ? { label: e.attrs.xlabel } : {}),
      endArrow: head ? arrow(e.attrs.arrowhead, 'triangle') : 'none',
      startArrow: tail ? arrow(e.attrs.arrowtail, 'triangle') : 'none',
      dashed: styles(e.attrs).has('dashed'),
    };
  });
  return { type: 'generic', direction, nodes, edges };
}

/** Applies colours / pen styles the spec layer doesn't carry. */
function styleShapes(g: DotGraph, shapes: Map<string, ShapeElement>, connectors: ConnectorElement[]) {
  const apply = (s: ShapeElement, a: Attrs, isCluster: boolean) => {
    const st = styles(a);
    const color = dotColor(a.color ?? a.pencolor);
    const fill = dotColor(a.fillcolor ?? (st.has('filled') ? a.color : undefined) ?? (isCluster ? a.bgcolor : undefined));
    const next = { ...s.style };
    if (color) next.stroke = color;
    if (fill) next.fill = fill;
    else if (st.has('filled') && !isCluster) next.fill = '#d3d3d3';
    const fc = dotColor(a.fontcolor);
    if (fc) next.textColor = fc;
    if (st.has('dashed')) next.strokeStyle = 'dashed';
    if (st.has('dotted')) next.strokeStyle = 'dotted';
    if (st.has('bold')) next.strokeWidth = Math.max(next.strokeWidth, 2.5);
    if (st.has('rounded')) next.radius = 10;
    if (a.penwidth && Number.isFinite(+a.penwidth)) next.strokeWidth = Math.max(0.5, +a.penwidth);
    if (a.fontsize && Number.isFinite(+a.fontsize)) next.fontSize = Math.max(6, Math.min(72, +a.fontsize));
    if (st.has('invis')) s.hidden = true;
    s.style = next;
    if (a.tooltip) s.tooltip = a.tooltip;
    if (a.url ?? a.href) s.link = a.url ?? a.href;
  };
  for (const n of g.nodes.values()) {
    const s = shapes.get(n.id);
    if (s) apply(s, n.attrs, false);
  }
  for (const c of g.clusters.values()) {
    const s = shapes.get(`cluster:${c.id}`);
    if (s) apply(s, c.attrs, true);
  }
  connectors.forEach((c, i) => {
    const a = g.edges[i]?.attrs;
    if (!a) return;
    const st = styles(a);
    const color = dotColor(a.color);
    if (color) c.style = { ...c.style, stroke: color };
    if (st.has('dotted')) c.style = { ...c.style, strokeStyle: 'dotted' };
    if (st.has('bold')) c.style = { ...c.style, strokeWidth: Math.max(c.style.strokeWidth, 2.5) };
    if (a.penwidth && Number.isFinite(+a.penwidth)) c.style = { ...c.style, strokeWidth: Math.max(0.5, +a.penwidth) };
    const fc = dotColor(a.fontcolor);
    if (fc) c.style = { ...c.style, textColor: fc };
    if (st.has('invis')) c.hidden = true;
  });
}

export function parseDotDiagram(text: string): ImportResult {
  const g = parseDot(text);
  if (!g.nodes.size) throw new Error('This DOT graph has no nodes.');
  const spec = dotToSpec(g);
  // Edges to nodes that only exist as clusters are dropped by the layout; keep the index mapping intact.
  const out = layoutSpec(spec);
  styleShapes(g, out.shapes, out.connectors.length === g.edges.length ? out.connectors : []);
  const warnings: string[] = [];
  if (out.connectors.length !== g.edges.length) warnings.push('Some edge styles were not applied.');
  return { pages: [{ name: (g.attrs.label ?? g.name) || 'Graph', doc: makeDoc(out.elements) }], warnings };
}

export const importer: Importer = {
  id: 'dot',
  label: 'Graphviz (DOT)…',
  description: 'Graphviz graph / digraph files: nodes, edges, labels, shapes, colours and clusters, auto-laid-out.',
  extensions: ['dot', 'gv'],
  acceptsText: true,
  example: `digraph G {
  rankdir=LR;
  node [shape=box, style="rounded,filled", fillcolor="#e0f2fe", color="#0284c7"];
  subgraph cluster_api {
    label="API";
    gateway -> auth;
    gateway -> orders;
  }
  client [shape=ellipse, fillcolor="#fef3c7", color="#d97706"];
  db [shape=cylinder, label="Orders DB"];
  client -> gateway [label="HTTPS"];
  orders -> db;
  auth -> db [style=dashed];
}`,
  detect: (content) => /^\s*(strict\s+)?(di)?graph\b[^{]*\{/i.test(toText(content).replace(/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, '')),
  run: async (content) => parseDotDiagram(toText(content)),
};
