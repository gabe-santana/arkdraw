/**
 * draw.io's Arrange > Insert > Advanced > From Text, in two notations:
 *
 *  - Indented list → tree. Indent with spaces or tabs; bullets (`-`, `*`,
 *    `+`, `•`, `1.`) are optional.
 *
 *        Company
 *          Sales
 *            Inside sales
 *          Engineering
 *
 *  - Graph notation, one relation per line (chains allowed):
 *
 *        a -> b            directed edge
 *        a <- b            reversed
 *        a <-> b           both ends
 *        a -- b            undirected
 *        a -> b: label     edge label after the last ':'
 *        a -> b -> c       chain
 *        lonely node       (a line without arrows)
 *
 * Lines starting with `;`, `#` or `//` are comments. Everything is placed with
 * the shared layered layout.
 */
import type { ArrowHead } from '@/model/types';
import type { DiagramSpec, SpecEdge, SpecNode } from '@/ai/generate/spec';
import type { ImportResult, Importer } from './types';
import { layoutSpec, makeDoc, toText } from './_shared';

const ARROW_SPLIT = /\s*(<->|<-|->|--)\s*/;
const HAS_ARROW = /\S\s*(<->|<-|->|--)\s*\S/;

const isComment = (l: string) => /^\s*(;|#|\/\/)/.test(l);
const unquote = (s: string) => s.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();

function graph(lines: string[]): DiagramSpec {
  const nodes = new Map<string, SpecNode>();
  const edges: SpecEdge[] = [];
  const node = (name: string) => {
    const id = unquote(name);
    if (id && !nodes.has(id)) nodes.set(id, { id, kind: 'rectangle', text: id });
    return id;
  };
  for (const line of lines) {
    if (!HAS_ARROW.test(line)) {
      node(line);
      continue;
    }
    // Label: text after the last ':' that follows the last arrow.
    const lastArrow = Math.max(line.lastIndexOf('->'), line.lastIndexOf('<-'), line.lastIndexOf('--'));
    const colon = line.indexOf(':', lastArrow + 2);
    const label = colon >= 0 ? line.slice(colon + 1).trim() : '';
    const body = colon >= 0 ? line.slice(0, colon) : line;
    const parts = body.split(ARROW_SPLIT);
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const a = node(parts[i - 1]);
      const b = node(parts[i + 1]);
      if (!a || !b) continue;
      const op = parts[i];
      const heads: Record<string, [ArrowHead, ArrowHead]> = { '->': ['none', 'triangle'], '<-': ['triangle', 'none'], '<->': ['triangle', 'triangle'], '--': ['none', 'none'] };
      const [startArrow, endArrow] = heads[op];
      edges.push({ from: a, to: b, startArrow, endArrow, ...(label && i + 2 === parts.length ? { label } : {}) });
    }
  }
  return { type: 'flowchart', direction: 'TB', nodes: [...nodes.values()], edges };
}

function tree(lines: string[]): DiagramSpec {
  const nodes: SpecNode[] = [];
  const edges: SpecEdge[] = [];
  const stack: Array<{ indent: number; id: string }> = [];
  for (const raw of lines) {
    const expanded = raw.replace(/\t/g, '    ');
    const indent = expanded.match(/^\s*/)![0].length;
    const text = expanded.trim().replace(/^([-*+•]|\d+[.)])\s+/, '');
    if (!text) continue;
    const id = `n${nodes.length}`;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    nodes.push({ id, kind: 'rectangle', text });
    if (parent) edges.push({ from: parent.id, to: id, startArrow: 'none', endArrow: 'none' });
    stack.push({ indent, id });
  }
  return { type: 'generic', direction: 'TB', nodes, edges };
}

export function parseTextDiagram(text: string): ImportResult {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() && !isComment(l));
  if (!lines.length) throw new Error('The text is empty.');
  const isGraph = lines.some((l) => HAS_ARROW.test(l));
  const spec = isGraph ? graph(lines.map((l) => l.trim())) : tree(lines);
  const out = layoutSpec(spec);
  if (!isGraph) for (const s of out.shapes.values()) s.style = { ...s.style, fill: '#f8fafc', stroke: '#475569' };
  return { pages: [{ name: 'From text', doc: makeDoc(out.elements) }], warnings: [] };
}

export const importer: Importer = {
  id: 'text',
  label: 'From text…',
  description: 'An indented list becomes a tree; "a -> b: label" lines become a graph.',
  extensions: [],
  acceptsText: true,
  example: `; Graph notation (or use an indented list for a tree)
Browser -> Load balancer: HTTPS
Load balancer -> API
API -> Database: SQL
API -> Cache
Cache -- Database`,
  run: async (content) => parseTextDiagram(toText(content)),
};
