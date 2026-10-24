/**
 * Mermaid → ArkDraw, with a hand-written parser (the mermaid package is huge
 * and DOM-bound). Supported diagram types:
 *
 *  - flowchart / graph: directions, all classic node shapes plus the
 *    `id@{ shape: … }` syntax, every edge style (`-->`, `---`, `-.->`, `==>`,
 *    `~~~`, `--o`, `--x`, `<-->`, `-- text -->`, `-->|text|`), chaining and
 *    `&`, subgraphs (nested → containers), classDef / class / `:::` / style /
 *    linkStyle colours.
 *  - sequenceDiagram: participants / actors (lifelines), all message arrows,
 *    autonumber, activations, notes, alt/else, opt, loop, par/and,
 *    critical/option, break frames and `rect` highlights, boxes.
 *  - classDiagram: classes with members (body or `A : member`), generics,
 *    annotations, namespaces, notes and every relation type with UML heads.
 *  - erDiagram: entities with attributes (PK/FK/UK), crow's-foot cardinalities
 *    (symbols and word aliases), identifying / non-identifying relations.
 *  - stateDiagram(-v2): states, descriptions, `[*]` start/end per scope,
 *    composite states, choice / fork / join, notes.
 *  - mindmap: indentation tree with node shapes.
 */
import type { ArrowHead, ConnectorElement, DiagramElement, ElementStyle, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { measureText } from '@/lib/text';
import type { DiagramSpec, Direction, SpecEdge, SpecNode } from '@/ai/generate/spec';
import type { ImportResult, Importer } from './types';
import { decodeEntities, layoutSpec, makeDoc, normColor, pickKind, translateTo } from './_shared';

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

type Warn = (msg: string) => void;

/** Mermaid label → plain text. */
function cleanLabel(raw: string): string {
  let s = raw.trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') s = s.slice(1, -1);
  if (s.length >= 2 && s[0] === '`' && s[s.length - 1] === '`') s = s.slice(1, -1).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
  s = s
    .replace(/#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/#([a-z]+);/gi, '&$1;')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '');
  return decodeEntities(s).replace(/fa:fa-[\w-]+\s*/g, '').trim();
}

function parseDirection(s: string | undefined): Direction | undefined {
  switch ((s ?? '').trim().toUpperCase()) {
    case 'TB':
    case 'TD':
    case 'V':
      return 'TB';
    case 'BT':
      return 'BT';
    case 'LR':
    case 'H':
      return 'LR';
    case 'RL':
      return 'RL';
    default:
      return undefined;
  }
}

/** CSS-ish `fill:#f9f,stroke:#333,stroke-width:4px` → style overrides. */
function cssToStyle(css: string): Partial<ElementStyle> {
  const out: Partial<ElementStyle> = {};
  for (const part of css.split(/[,;](?![^(]*\))/)) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim().toLowerCase();
    const v = part.slice(i + 1).trim();
    switch (k) {
      case 'fill':
      case 'background':
      case 'background-color': {
        const c = normColor(v);
        if (c) out.fill = c;
        break;
      }
      case 'stroke':
      case 'border-color': {
        const c = normColor(v);
        if (c) out.stroke = c;
        break;
      }
      case 'color': {
        const c = normColor(v);
        if (c) out.textColor = c;
        break;
      }
      case 'stroke-width': {
        const n = parseFloat(v);
        if (Number.isFinite(n)) out.strokeWidth = n;
        break;
      }
      case 'stroke-dasharray':
        out.strokeStyle = /^\s*[0-2](\s|,|$)/.test(v) ? 'dotted' : 'dashed';
        break;
      case 'font-weight':
        out.bold = /bold|[6-9]00/.test(v);
        break;
      case 'font-style':
        out.italic = /italic/.test(v);
        break;
      case 'font-size': {
        const n = parseFloat(v);
        if (Number.isFinite(n)) out.fontSize = n;
        break;
      }
      case 'rx': {
        const n = parseFloat(v);
        if (Number.isFinite(n)) out.radius = n;
        break;
      }
    }
  }
  return out;
}

/** Splits on `;` outside quotes and brackets. */
function splitStatements(line: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') quote = !quote;
    else if (!quote && '[({'.includes(ch)) depth++;
    else if (!quote && '])}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === ';' && !quote && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

interface Prepared {
  lines: string[];
  title?: string;
}

function prepare(text: string): Prepared {
  let src = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  let title: string | undefined;
  const fm = /^\s*---\n([\s\S]*?)\n---\s*\n/.exec(src);
  if (fm) {
    title = /^title:\s*(.+)$/m.exec(fm[1])?.[1]?.trim().replace(/^["']|["']$/g, '');
    src = src.slice(fm[0].length);
  }
  src = src.replace(/%%\{[\s\S]*?\}%%/g, '');
  const lines = src
    .split('\n')
    .map((l) => l.replace(/^\s*%%.*$/, '').replace(/\s+%%(?![^"]*"[^"]*$).*$/, ''))
    .filter((l) => l.trim().length > 0);
  return { lines, title };
}

const HEADERS: Array<[RegExp, string]> = [
  [/^(flowchart|graph|flowchart-elk)\b/i, 'flowchart'],
  [/^sequenceDiagram\b/, 'sequence'],
  [/^classDiagram(-v2)?\b/, 'class'],
  [/^erDiagram\b/, 'er'],
  [/^stateDiagram(-v2)?\b/, 'state'],
  [/^mindmap\b/, 'mindmap'],
];

function diagramType(firstLine: string): string | undefined {
  const t = firstLine.trim();
  return HEADERS.find(([re]) => re.test(t))?.[1];
}

// ---------------------------------------------------------------------------
// Flowchart
// ---------------------------------------------------------------------------

interface FNode {
  id: string;
  text: string;
  kind: string;
  style: Partial<ElementStyle>;
  classes: string[];
  parent?: string;
  container?: boolean;
}

interface FEdge {
  from: string;
  to: string;
  label: string;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  line: 'normal' | 'thick' | 'dotted' | 'invisible';
}

/** Bracket shapes, longest openers first. */
const SHAPE_DELIMS: Array<{ open: string; close: string[]; kinds: string[][]; radius?: number }> = [
  { open: '(((', close: [')))'], kinds: [['ellipse']] },
  { open: '([', close: ['])'], kinds: [['flow.terminator']] },
  { open: '[[', close: [']]'], kinds: [['flow.predefined']] },
  { open: '[(', close: [')]'], kinds: [['cylinder']] },
  { open: '((', close: ['))'], kinds: [['ellipse']] },
  { open: '{{', close: ['}}'], kinds: [['hexagon']] },
  { open: '[/', close: ['/]', '\\]'], kinds: [['parallelogram'], ['trapezoid']] },
  { open: '[\\', close: ['\\]', '/]'], kinds: [['basic.parallelogramAlt', 'parallelogram'], ['flow.manualOperation', 'trapezoid']] },
  { open: '(', close: [')'], kinds: [['rectangle']], radius: 14 },
  { open: '[', close: [']'], kinds: [['rectangle']], radius: 0 },
  { open: '{', close: ['}'], kinds: [['diamond']] },
  { open: '>', close: [']'], kinds: [['basic.flag', 'flow.offPage', 'rectangle']] },
];

/** `id@{ shape: … }` names → kinds. */
const AT_SHAPES: Record<string, string[]> = {
  rect: ['rectangle'], rectangle: ['rectangle'], proc: ['rectangle'], process: ['rectangle'],
  rounded: ['rectangle'], event: ['rectangle'], stadium: ['flow.terminator'], pill: ['flow.terminator'], terminal: ['flow.terminator'],
  circle: ['ellipse'], circ: ['ellipse'], 'dbl-circ': ['ellipse'], 'double-circle': ['ellipse'], 'sm-circ': ['uml.initial', 'ellipse'],
  start: ['uml.initial', 'ellipse'], stop: ['uml.final', 'ellipse'], 'fr-circ': ['uml.final', 'ellipse'],
  diam: ['diamond'], diamond: ['diamond'], decision: ['diamond'], question: ['diamond'],
  hex: ['hexagon'], hexagon: ['hexagon'], prepare: ['hexagon'],
  'lean-r': ['parallelogram'], 'in-out': ['parallelogram'], 'lean-l': ['parallelogram'], 'out-in': ['parallelogram'],
  'trap-b': ['trapezoid'], priority: ['trapezoid'], 'trap-t': ['flow.manualOperation', 'trapezoid'], manual: ['flow.manualOperation'],
  cyl: ['cylinder'], cylinder: ['cylinder'], database: ['cylinder'], db: ['cylinder'], 'h-cyl': ['cylinder'], das: ['cylinder'],
  doc: ['flow.document'], document: ['flow.document'], docs: ['flow.document'], 'lin-doc': ['flow.document'],
  subproc: ['flow.predefined'], subroutine: ['flow.predefined'], 'fr-rect': ['flow.predefined'],
  'sl-rect': ['flow.manualInput'], 'manual-input': ['flow.manualInput'], delay: ['flow.delay'], 'half-rounded-rectangle': ['flow.delay'],
  'notch-pent': ['flow.offPage'], 'off-page': ['flow.offPage'], cloud: ['cloud'], tri: ['triangle'], extract: ['triangle'],
  'bow-rect': ['flow.internalStorage'], 'win-pane': ['flow.internalStorage'], 'internal-storage': ['flow.internalStorage'],
  text: ['text'], comment: ['uml.note'], 'brace': ['uml.note'], flag: ['basic.flag', 'rectangle'], 'odd': ['basic.flag', 'rectangle'],
};

const ID_RE = /[A-Za-z0-9_\u00C0-\uFFFF$]+(?:-(?=[A-Za-z0-9_\u00C0-\uFFFF$])[A-Za-z0-9_\u00C0-\uFFFF$]+)*/y;
const LINK_RE = /\s*([xo<]?)(-{2,}[-xo>]|={2,}[=xo>]|-?\.+-[xo>]?|~{3,})\s*/y;
const START_LINK_RE = /\s*([xo<]?)(--|==|-\.)\s*/y;
const PIPE_RE = /\s*\|([^|]*)\|\s*/y;
const AMP_RE = /\s*&\s*/y;
const CLASS_RE = /:::([\w-]+)/y;

class FlowParser {
  nodes = new Map<string, FNode>();
  edges: FEdge[] = [];
  classDefs = new Map<string, Partial<ElementStyle>>();
  linkStyles = new Map<number | 'default', Partial<ElementStyle>>();
  direction: Direction = 'TB';
  stack: string[] = [];
  autoId = 0;
  constructor(private warn: Warn) {}

  node(id: string): FNode {
    let n = this.nodes.get(id);
    if (!n) {
      n = { id, text: id, kind: 'rectangle', style: { radius: 0 }, classes: [] };
      this.nodes.set(id, n);
    }
    const sub = this.stack[this.stack.length - 1];
    if (sub && !n.parent && sub !== id) n.parent = sub;
    return n;
  }

  statement(st: string) {
    let m: RegExpExecArray | null;
    if ((m = /^subgraph\b\s*(.*)$/i.exec(st))) return this.subgraph(m[1].trim());
    if (/^end\s*$/i.test(st)) {
      this.stack.pop();
      return;
    }
    if ((m = /^direction\s+(\w+)/i.exec(st))) {
      if (!this.stack.length) this.direction = parseDirection(m[1]) ?? this.direction;
      return;
    }
    if ((m = /^classDef\s+([\w,-]+)\s+(.*)$/i.exec(st))) {
      const style = cssToStyle(m[2]);
      for (const name of m[1].split(',')) this.classDefs.set(name.trim(), style);
      return;
    }
    if ((m = /^class\s+([^\s]+)\s+([\w-]+)\s*$/i.exec(st))) {
      for (const id of m[1].split(',')) this.node(id.trim()).classes.push(m[2]);
      return;
    }
    if ((m = /^style\s+(\S+)\s+(.*)$/i.exec(st))) {
      const n = this.node(m[1]);
      Object.assign(n.style, cssToStyle(m[2]));
      return;
    }
    if ((m = /^linkStyle\s+([\w,\s]+?)\s+((?:[\w-]+\s*:).*)$/i.exec(st))) {
      const style = cssToStyle(m[2]);
      for (const k of m[1].split(',')) {
        const key = k.trim() === 'default' ? 'default' : Number(k.trim());
        if (key === 'default' || Number.isFinite(key)) this.linkStyles.set(key, style);
      }
      return;
    }
    if (/^(click|accTitle|accDescr|callback|link)\b/i.test(st)) return;
    this.chain(st);
  }

  subgraph(rest: string) {
    let id: string;
    let title: string;
    let m: RegExpExecArray | null;
    if ((m = /^([^\s[\]"]+)\s*\[(.*)\]\s*$/.exec(rest))) {
      id = m[1];
      title = cleanLabel(m[2]);
    } else if ((m = /^"(.*)"\s*$/.exec(rest))) {
      id = `subgraph_${++this.autoId}`;
      title = cleanLabel(m[1]);
    } else if (rest) {
      id = rest;
      title = cleanLabel(rest);
    } else {
      id = `subgraph_${++this.autoId}`;
      title = '';
    }
    const n = this.node(id);
    n.text = title;
    n.kind = 'container';
    n.container = true;
    this.stack.push(id);
  }

  /** Parses `id[shape]:::cls` at `pos`; returns the end position. */
  nodeRef(s: string, pos: number): { id: string; end: number } | null {
    ID_RE.lastIndex = pos;
    const m = ID_RE.exec(s);
    if (!m) return null;
    const id = m[0];
    let p = ID_RE.lastIndex;
    const n = this.node(id);
    if (s.startsWith('@{', p)) {
      const close = s.indexOf('}', p);
      if (close > 0) {
        this.atShape(n, s.slice(p + 2, close));
        p = close + 1;
      }
    } else {
      for (const d of SHAPE_DELIMS) {
        if (!s.startsWith(d.open, p)) continue;
        const start = p + d.open.length;
        let textEnd = -1;
        let which = 0;
        let searchFrom = start;
        const lead = s.slice(start).match(/^\s*"/);
        if (lead) {
          const q2 = s.indexOf('"', start + lead[0].length);
          if (q2 > 0) searchFrom = q2 + 1;
        }
        d.close.forEach((c, i) => {
          const at = s.indexOf(c, searchFrom);
          if (at >= 0 && (textEnd < 0 || at < textEnd)) {
            textEnd = at;
            which = i;
          }
        });
        if (textEnd < 0) continue;
        n.text = cleanLabel(s.slice(start, textEnd));
        n.kind = pickKind(...d.kinds[which]);
        if (d.radius !== undefined) n.style.radius = d.radius;
        p = textEnd + d.close[which].length;
        break;
      }
    }
    CLASS_RE.lastIndex = p;
    const c = CLASS_RE.exec(s);
    if (c) {
      n.classes.push(c[1]);
      p = CLASS_RE.lastIndex;
    }
    return { id, end: p };
  }

  atShape(n: FNode, body: string) {
    const get = (k: string) => new RegExp(`\\b${k}\\s*:\\s*("([^"]*)"|[^,}]+)`).exec(body);
    const shape = get('shape');
    if (shape) {
      const name = (shape[2] ?? shape[1]).trim();
      const kinds = AT_SHAPES[name];
      if (kinds) n.kind = pickKind(...kinds);
      else this.warn(`Mermaid shape "${name}" is not supported; drawn as a rectangle.`);
      if (name === 'rounded' || name === 'event') n.style.radius = 14;
    }
    const label = get('label');
    if (label) n.text = cleanLabel(label[2] ?? label[1]);
  }

  group(s: string, pos: number): { ids: string[]; end: number } | null {
    const ids: string[] = [];
    let p = pos;
    for (;;) {
      while (s[p] === ' ' || s[p] === '\t') p++;
      const r = this.nodeRef(s, p);
      if (!r) break;
      ids.push(r.id);
      p = r.end;
      AMP_RE.lastIndex = p;
      if (!AMP_RE.exec(s)) break;
      p = AMP_RE.lastIndex;
    }
    return ids.length ? { ids, end: p } : null;
  }

  link(s: string, pos: number): { edge: Omit<FEdge, 'from' | 'to'>; end: number } | null {
    const make = (startCh: string, body: string, label: string) => {
      const endCh = body[body.length - 1];
      const head = (c: string): ArrowHead => (c === '>' || c === '<' ? 'triangle' : c === 'x' ? 'cross' : c === 'o' ? 'circle' : 'none');
      const line: FEdge['line'] = body.startsWith('~') ? 'invisible' : body.includes('=') ? 'thick' : body.includes('.') ? 'dotted' : 'normal';
      return { label, startArrow: head(startCh), endArrow: head(endCh), line };
    };
    LINK_RE.lastIndex = pos;
    let m = LINK_RE.exec(s);
    if (m) {
      let end = LINK_RE.lastIndex;
      let label = '';
      PIPE_RE.lastIndex = end;
      const pipe = PIPE_RE.exec(s);
      if (pipe) {
        label = cleanLabel(pipe[1]);
        end = PIPE_RE.lastIndex;
      }
      return { edge: make(m[1], m[2], label), end };
    }
    START_LINK_RE.lastIndex = pos;
    m = START_LINK_RE.exec(s);
    if (!m) return null;
    const textStart = START_LINK_RE.lastIndex;
    const endRe = m[2] === '--' ? /\s*(-{2,}[-xo>])\s*/g : m[2] === '==' ? /\s*(={2,}[=xo>])\s*/g : /\s*(\.+-[xo>]?)\s*/g;
    endRe.lastIndex = textStart;
    const e = endRe.exec(s);
    if (!e) return null;
    const label = cleanLabel(s.slice(textStart, e.index));
    return { edge: make(m[1], m[2] + e[1], label), end: e.index + e[0].length };
  }

  chain(st: string) {
    const first = this.group(st, 0);
    if (!first) {
      this.warn(`Skipped unrecognised Mermaid line: ${st.slice(0, 60)}`);
      return;
    }
    let prev = first.ids;
    let pos = first.end;
    while (pos < st.length) {
      const l = this.link(st, pos);
      if (!l) break;
      const next = this.group(st, l.end);
      if (!next) break;
      for (const a of prev) for (const b of next.ids) this.edges.push({ from: a, to: b, ...l.edge });
      prev = next.ids;
      pos = next.end;
    }
  }

  toSpec(): { spec: DiagramSpec; styles: Map<string, Partial<ElementStyle>> } {
    const styles = new Map<string, Partial<ElementStyle>>();
    const def = this.classDefs.get('default');
    const nodes: SpecNode[] = [...this.nodes.values()].map((n) => {
      const st: Partial<ElementStyle> = { ...(n.container ? {} : def ?? {}) };
      for (const c of n.classes) Object.assign(st, this.classDefs.get(c) ?? {});
      Object.assign(st, n.style);
      if (n.container) delete st.radius;
      styles.set(n.id, st);
      return { id: n.id, kind: n.container ? 'container' : n.kind, text: n.text, ...(n.parent ? { parent: n.parent } : {}) };
    });
    const edges: SpecEdge[] = this.edges.map((e) => ({
      from: e.from,
      to: e.to,
      ...(e.label ? { label: e.label } : {}),
      startArrow: e.startArrow,
      endArrow: e.endArrow,
      ...(e.line === 'dotted' ? { dashed: true } : {}),
    }));
    return { spec: { type: 'flowchart', direction: this.direction, nodes, edges }, styles };
  }
}

function flowchart(lines: string[], warn: Warn): DiagramElement[] {
  const p = new FlowParser(warn);
  const [head, ...inline] = splitStatements(lines[0]);
  p.direction = parseDirection(head.trim().split(/\s+/)[1]) ?? 'TB';
  for (const st of inline) p.statement(st);
  for (const line of lines.slice(1)) for (const st of splitStatements(line)) p.statement(st);
  if (!p.nodes.size) throw new Error('The flowchart has no nodes.');
  const { spec, styles } = p.toSpec();
  const out = layoutSpec(spec);
  for (const [id, st] of styles) {
    const s = out.shapes.get(id);
    if (s && Object.keys(st).length) s.style = { ...s.style, ...st };
  }
  const drop = new Set<string>();
  out.connectors.forEach((c, i) => {
    const e = p.edges[i];
    if (e.line === 'thick') c.style = { ...c.style, strokeWidth: 3 };
    const ls = { ...(p.linkStyles.get('default') ?? {}), ...(p.linkStyles.get(i) ?? {}) };
    if (ls.stroke) c.style.stroke = ls.stroke;
    if (ls.strokeWidth) c.style.strokeWidth = ls.strokeWidth;
    if (ls.strokeStyle) c.style.strokeStyle = ls.strokeStyle;
    if (ls.textColor) c.style.textColor = ls.textColor;
    if (e.line === 'invisible') drop.add(c.id);
  });
  return out.elements.filter((e) => !drop.has(e.id));
}

// ---------------------------------------------------------------------------
// Sequence diagram
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  label: string;
  actor: boolean;
}

type SeqEvent =
  | { t: 'msg'; from: string; to: string; text: string; start: ArrowHead; end: ArrowHead; dashed: boolean; act?: '+' | '-' }
  | { t: 'note'; pos: 'left' | 'right' | 'over'; ids: string[]; text: string }
  | { t: 'start'; kind: string; label: string; color?: string }
  | { t: 'else'; label: string }
  | { t: 'end' }
  | { t: 'activate' | 'deactivate'; id: string };

const SEQ_ARROWS: Array<[string, ArrowHead, ArrowHead, boolean]> = [
  ['<<-->>', 'triangle', 'triangle', true],
  ['<<->>', 'triangle', 'triangle', false],
  ['-->>', 'none', 'triangle', true],
  ['->>', 'none', 'triangle', false],
  ['--x', 'none', 'cross', true],
  ['-x', 'none', 'cross', false],
  ['--)', 'none', 'arrow', true],
  ['-)', 'none', 'arrow', false],
  ['-->', 'none', 'none', true],
  ['->', 'none', 'none', false],
];
const SEQ_MSG_RE = new RegExp(
  `^(.+?)\\s*(${SEQ_ARROWS.map(([a]) => a.replace(/[()|]/g, '\\$&')).join('|')})\\s*([+-]?)\\s*(.+?)\\s*(?::(.*))?$`,
);

function sequence(lines: string[], warn: Warn): DiagramElement[] {
  const parts = new Map<string, Participant>();
  const boxes: Array<{ label: string; color?: string; ids: string[] }> = [];
  const events: SeqEvent[] = [];
  const blocks: Array<'frame' | 'box'> = [];
  let autonumber = 0;
  const part = (raw: string, actor = false, label?: string): Participant => {
    const id = raw.trim().replace(/^"|"$/g, '');
    let p = parts.get(id);
    if (!p) {
      p = { id, label: label ?? id, actor };
      parts.set(id, p);
      const box = blocks.includes('box') ? boxes[boxes.length - 1] : undefined;
      box?.ids.push(id);
    }
    return p;
  };

  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if ((m = /^(?:create\s+)?(participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i.exec(line))) {
      const id = m[2].replace(/@\{.*\}$/, '').trim();
      const p = part(id, m[1].toLowerCase() === 'actor', m[3] ? cleanLabel(m[3]) : undefined);
      if (m[3]) p.label = cleanLabel(m[3]);
      if (m[1].toLowerCase() === 'actor') p.actor = true;
      continue;
    }
    if (/^destroy\s+/i.test(line) || /^(title|accTitle|accDescr)\b/i.test(line)) continue;
    if ((m = /^autonumber\b\s*(\d+)?/i.exec(line))) {
      autonumber = Number(m[1] ?? 1) || 1;
      continue;
    }
    if ((m = /^(activate|deactivate)\s+(.+)$/i.exec(line))) {
      events.push({ t: m[1].toLowerCase() as 'activate', id: part(m[2]).id });
      continue;
    }
    if ((m = /^note\s+(left of|right of|over)\s+([^:]+):(.*)$/i.exec(line))) {
      const pos = m[1].toLowerCase().startsWith('left') ? 'left' : m[1].toLowerCase().startsWith('right') ? 'right' : 'over';
      events.push({ t: 'note', pos, ids: m[2].split(',').map((s) => part(s).id), text: cleanLabel(m[3]) });
      continue;
    }
    if ((m = /^box\b\s*(.*)$/i.exec(line))) {
      const rest = m[1].trim();
      const cm = /^(rgba?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)\b\s*(.*)$/i.exec(rest);
      const color = cm ? normColor(cm[1]) : undefined;
      boxes.push({ label: cleanLabel(color ? cm![2] : rest), color, ids: [] });
      blocks.push('box');
      continue;
    }
    if ((m = /^(loop|alt|opt|par|critical|break|rect)\b\s*(.*)$/i.exec(line))) {
      const kind = m[1].toLowerCase();
      blocks.push('frame');
      events.push(kind === 'rect' ? { t: 'start', kind, label: '', color: normColor(m[2]) } : { t: 'start', kind, label: cleanLabel(m[2]) });
      continue;
    }
    if ((m = /^(else|and|option)\b\s*(.*)$/i.exec(line))) {
      events.push({ t: 'else', label: cleanLabel(m[2]) });
      continue;
    }
    if (/^end\s*$/i.test(line)) {
      const b = blocks.pop();
      if (b === 'frame') events.push({ t: 'end' });
      continue;
    }
    if ((m = SEQ_MSG_RE.exec(line))) {
      const [, a, arrow, act, b, text] = m;
      const spec = SEQ_ARROWS.find(([x]) => x === arrow)!;
      const from = part(a).id;
      const to = part(b).id;
      const label = cleanLabel(text ?? '');
      events.push({
        t: 'msg', from, to, start: spec[1], end: spec[2], dashed: spec[3],
        text: autonumber ? `${autonumber++}. ${label}`.trim() : label,
        ...(act ? { act: act as '+' | '-' } : {}),
      });
      continue;
    }
    warn(`Skipped unrecognised sequence line: ${line.slice(0, 60)}`);
  }
  if (!parts.size) throw new Error('The sequence diagram has no participants.');

  // ----- Columns ---------------------------------------------------------
  const plist = [...parts.values()];
  const index = new Map(plist.map((p, i) => [p.id, i]));
  const labelStyle = { fontFamily: 'sans' as const, fontSize: 13, bold: false, italic: false };
  const textW = (t: string) => Math.max(0, ...t.split('\n').map((l) => measureText(l, labelStyle)));
  const widths = plist.map((p) => Math.max(110, Math.min(240, textW(p.label) + 36)));
  const gaps = plist.map(() => 50);
  const centers = () => {
    const c: number[] = [];
    let x = 0;
    plist.forEach((_, i) => {
      c.push(x + widths[i] / 2);
      x += widths[i] + gaps[i];
    });
    return c;
  };
  for (const ev of events) {
    if (ev.t !== 'msg') continue;
    const i = index.get(ev.from)!;
    const j = index.get(ev.to)!;
    const need = textW(ev.text) + 40;
    const c = centers();
    if (i === j) {
      if (i < plist.length - 1) gaps[i] = Math.max(gaps[i], need + 40 - (widths[i] + widths[i + 1]) / 2);
      continue;
    }
    const [lo, hi] = i < j ? [i, j] : [j, i];
    const deficit = need - (c[hi] - c[lo]);
    if (deficit > 0) gaps[hi - 1] += deficit;
  }
  const cx = centers();

  // ----- Rows ------------------------------------------------------------
  const HEAD = 40;
  const back: DiagramElement[] = [];
  const frames: DiagramElement[] = [];
  const mid: DiagramElement[] = [];
  const front: DiagramElement[] = [];
  let y = HEAD + 24;
  interface Frame { kind: string; label: string; color?: string; y0: number; depth: number; ids: Set<number>; dividers: Array<{ y: number; label: string }>; selfRight: boolean }
  const open: Frame[] = [];
  const activations = new Map<string, number[]>();
  const touch = (...ids: string[]) => {
    for (const f of open) for (const id of ids) f.ids.add(index.get(id)!);
  };
  const activate = (id: string, at: number) => {
    if (!activations.has(id)) activations.set(id, []);
    activations.get(id)!.push(at);
  };
  const deactivate = (id: string, at: number) => {
    const y0 = activations.get(id)?.pop();
    if (y0 === undefined) return;
    const x = cx[index.get(id)!];
    mid.push(createShape('rectangle', { x: Math.round(x - 6), y: Math.round(y0), w: 12, h: Math.max(10, Math.round(at - y0)) }, { fill: '#f1f5f9', stroke: '#4f46e5', radius: 0 }));
  };
  const textShape = (text: string, x: number, yy: number, w: number, align: ElementStyle['textAlign'] = 'center') =>
    createShape('text', { x: Math.round(x), y: Math.round(yy), w: Math.round(w), h: 18 * Math.max(1, text.split('\n').length) }, { fill: 'none', stroke: 'none', fontSize: 12, textAlign: align, textColor: '#334155' }, text);

  for (const ev of events) {
    switch (ev.t) {
      case 'msg': {
        const i = index.get(ev.from)!;
        const j = index.get(ev.to)!;
        touch(ev.from, ev.to);
        const lines = Math.max(1, ev.text.split('\n').length);
        y += 18 * lines;
        const style = { strokeStyle: ev.dashed ? ('dashed' as const) : ('solid' as const) };
        let conn: ConnectorElement;
        if (i === j) {
          for (const f of open) f.selfRight = true;
          conn = createConnector({ x: Math.round(cx[i]), y: Math.round(y) }, { x: Math.round(cx[i]), y: Math.round(y + 22) }, {
            routing: 'straight', startArrow: ev.start, endArrow: ev.end, text: ev.text,
            waypoints: [{ x: Math.round(cx[i] + 44), y: Math.round(y) }, { x: Math.round(cx[i] + 44), y: Math.round(y + 22) }],
          });
          y += 22;
        } else {
          conn = createConnector({ x: Math.round(cx[i]), y: Math.round(y) }, { x: Math.round(cx[j]), y: Math.round(y) }, {
            routing: 'straight', startArrow: ev.start, endArrow: ev.end, text: ev.text,
          });
        }
        conn.style = { ...conn.style, ...style };
        front.push(conn);
        if (ev.act === '+') activate(ev.to, y);
        if (ev.act === '-') deactivate(ev.from, y);
        y += 22;
        break;
      }
      case 'note': {
        const idx = ev.ids.map((id) => index.get(id)!);
        touch(...ev.ids);
        const lines = Math.max(1, ev.text.split('\n').length);
        const h = lines * 18 + 16;
        const tw = Math.max(100, Math.min(260, textW(ev.text) + 28));
        let x: number;
        let w = tw;
        if (ev.pos === 'over') {
          const lo = Math.min(...idx.map((k) => cx[k]));
          const hi = Math.max(...idx.map((k) => cx[k]));
          w = Math.max(tw, hi - lo + 60);
          x = (lo + hi) / 2 - w / 2;
        } else if (ev.pos === 'left') x = cx[idx[0]] - 16 - w;
        else x = cx[idx[0]] + 16;
        y += 6;
        front.push(createShape('uml.note', { x: Math.round(x), y: Math.round(y), w: Math.round(w), h }, { fill: '#fef9c3', stroke: '#ca8a04', fontSize: 12 }, ev.text));
        y += h + 10;
        break;
      }
      case 'start':
        y += 10;
        open.push({ kind: ev.kind, label: ev.label, color: ev.color, y0: y, depth: open.length, ids: new Set(), dividers: [], selfRight: false });
        y += ev.kind === 'rect' ? 8 : 30;
        break;
      case 'else': {
        const f = open[open.length - 1];
        if (!f) break;
        y += 6;
        f.dividers.push({ y, label: ev.label });
        y += 24;
        break;
      }
      case 'end': {
        const f = open.pop();
        if (!f) break;
        y += 8;
        const ids = f.ids.size ? [...f.ids] : plist.map((_, k) => k);
        for (const g of open) for (const k of ids) g.ids.add(k);
        const pad = 64 - f.depth * 10;
        const x0 = Math.min(...ids.map((k) => cx[k])) - pad;
        const x1 = Math.max(...ids.map((k) => cx[k])) + pad + (f.selfRight ? 40 : 0);
        const rect = { x: Math.round(x0), y: Math.round(f.y0), w: Math.round(x1 - x0), h: Math.round(y - f.y0) };
        if (f.kind === 'rect') {
          back.push(createShape('rectangle', rect, { fill: f.color ?? '#f1f5f9', stroke: 'none', radius: 0, opacity: 0.6 }));
        } else {
          frames.push(createShape('uml.frame', rect, { fill: 'none', stroke: '#64748b', fontSize: 12, bold: true, textAlign: 'left', verticalAlign: 'middle' }, f.kind));
          if (f.label) front.push(textShape(`[${f.label}]`, x0 + 92, f.y0 + 3, Math.max(60, x1 - x0 - 100), 'left'));
          for (const d of f.dividers) {
            const div = createConnector({ x: Math.round(x0), y: Math.round(d.y) }, { x: Math.round(x1), y: Math.round(d.y) }, { routing: 'straight', startArrow: 'none', endArrow: 'none' });
            div.style = { ...div.style, strokeStyle: 'dashed', stroke: '#64748b' };
            frames.push(div);
            if (d.label) front.push(textShape(`[${d.label}]`, x0 + 8, d.y + 3, Math.max(60, x1 - x0 - 16), 'left'));
          }
        }
        y += 10;
        break;
      }
      case 'activate':
        activate(ev.id, y);
        break;
      case 'deactivate':
        deactivate(ev.id, y);
        break;
    }
  }
  if (open.length) warn('Some sequence blocks were not closed with `end`.');
  for (const [id, stack] of activations) while (stack.length) deactivate(id, y);
  const height = y + 30;

  const lifelines = plist.map((p, i) =>
    createShape(
      pickKind('uml.lifeline'),
      { x: Math.round(cx[i] - widths[i] / 2), y: 0, w: Math.round(widths[i]), h: Math.round(height) },
      p.actor ? { fill: '#fef3c7', stroke: '#d97706' } : { fill: '#e0e7ff', stroke: '#4f46e5' },
      p.actor ? `«actor»\n${p.label}` : p.label,
    ),
  );
  for (const b of boxes) {
    const idx = b.ids.map((id) => index.get(id)!).filter((k) => k !== undefined);
    if (!idx.length) continue;
    const x0 = Math.min(...idx.map((k) => cx[k] - widths[k] / 2)) - 14;
    const x1 = Math.max(...idx.map((k) => cx[k] + widths[k] / 2)) + 14;
    back.unshift(
      createShape('rectangle', { x: Math.round(x0), y: -30, w: Math.round(x1 - x0), h: Math.round(height + 44) },
        { fill: b.color ?? '#f8fafc', stroke: '#cbd5e1', radius: 6, verticalAlign: 'top', fontSize: 12, bold: true }, b.label),
    );
  }
  const all = [...back, ...frames, ...lifelines, ...mid, ...front];
  translateTo(all, 0, 0);
  return all;
}

// ---------------------------------------------------------------------------
// Class diagram
// ---------------------------------------------------------------------------

interface UClass {
  id: string;
  label: string;
  annotations: string[];
  attributes: string[];
  methods: string[];
  parent?: string;
  style: Partial<ElementStyle>;
}

const CLASS_NAME = String.raw`[\w.$]+(?:~[^~]+~)?|\x60[^\x60]+\x60`;
const REL_RE = new RegExp(
  String.raw`^(${CLASS_NAME})\s*(?:"([^"]*)"\s*)?((?:<\||\*|o|<|\(\))?(?:--|\.\.)(?:\|>|\*|o|>|\(\))?)\s*(?:"([^"]*)"\s*)?(${CLASS_NAME})\s*(?::\s*(.*))?$`,
);

const generic = (s: string) => s.replace(/~([^~]+)~/g, '<$1>');

function relHead(token: string): ArrowHead {
  switch (token) {
    case '<|':
    case '|>':
      return 'triangleOpen';
    case '*':
      return 'diamond';
    case 'o':
      return 'diamondOpen';
    case '<':
    case '>':
      return 'arrow';
    case '()':
      return 'circleOpen';
    default:
      return 'none';
  }
}

function classDiagram(lines: string[], warn: Warn): DiagramElement[] {
  const classes = new Map<string, UClass>();
  const namespaces: string[] = [];
  const edges: SpecEdge[] = [];
  const notes: Array<{ id: string; text: string; for?: string }> = [];
  const nsNodes = new Map<string, string>();
  let direction: Direction = 'TB';
  const cls = (raw: string): UClass => {
    const id = raw.replace(/^`|`$/g, '').replace(/~.*$/, '');
    let c = classes.get(id);
    if (!c) {
      c = { id, label: generic(raw.replace(/^`|`$/g, '')), annotations: [], attributes: [], methods: [], style: {} };
      classes.set(id, c);
    } else if (raw.includes('~')) c.label = generic(raw);
    const ns = namespaces[namespaces.length - 1];
    if (ns && !c.parent) c.parent = ns;
    return c;
  };
  const member = (c: UClass, raw: string) => {
    const m = raw.trim();
    if (!m) return;
    const ann = /^<<(.+)>>$/.exec(m);
    if (ann) c.annotations.push(ann[1].trim());
    else if (/\(.*\)/.test(m)) c.methods.push(generic(m));
    else c.attributes.push(generic(m));
  };

  let body: UClass | null = null;
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (body) {
      if (line.startsWith('}')) body = null;
      else member(body, line);
      continue;
    }
    if ((m = /^direction\s+(\w+)/i.exec(line))) {
      direction = parseDirection(m[1]) ?? direction;
      continue;
    }
    if ((m = /^namespace\s+([\w.]+)\s*\{?$/.exec(line))) {
      const id = `ns:${m[1]}`;
      nsNodes.set(id, m[1]);
      namespaces.push(id);
      continue;
    }
    if (line === '}') {
      namespaces.pop();
      continue;
    }
    if ((m = new RegExp(String.raw`^class\s+(${CLASS_NAME})\s*(?:\["([^"]*)"\])?\s*(?::::([\w-]+))?\s*(\{)?\s*(.*?)\s*(\})?$`).exec(line))) {
      const c = cls(m[1]);
      if (m[2]) c.label = cleanLabel(m[2]);
      if (m[4]) {
        if (m[5]) member(c, m[5]);
        if (!m[6]) body = c;
      }
      continue;
    }
    if ((m = /^<<(.+?)>>\s*([\w.$]+)\s*$/.exec(line))) {
      cls(m[2]).annotations.push(m[1].trim());
      continue;
    }
    if ((m = /^note\s+for\s+([\w.$]+)\s+"(.*)"$/i.exec(line))) {
      notes.push({ id: `note${notes.length}`, text: cleanLabel(m[2]), for: cls(m[1]).id });
      continue;
    }
    if ((m = /^note\s+"(.*)"$/i.exec(line))) {
      notes.push({ id: `note${notes.length}`, text: cleanLabel(m[1]) });
      continue;
    }
    if ((m = REL_RE.exec(line))) {
      const [, a, cardA, arrow, cardB, b, label] = m;
      const lm = /^(<\||\*|o|<|\(\))?(--|\.\.)(\|>|\*|o|>|\(\))?$/.exec(arrow)!;
      const text = [cardA, label ? cleanLabel(label) : '', cardB].filter(Boolean).join('  ');
      edges.push({
        from: cls(a).id,
        to: cls(b).id,
        startArrow: relHead(lm[1] ?? ''),
        endArrow: relHead(lm[3] ?? ''),
        ...(lm[2] === '..' ? { dashed: true } : {}),
        ...(text ? { label: text } : {}),
      });
      continue;
    }
    if ((m = /^([\w.$]+)\s*:\s*(.+)$/.exec(line))) {
      member(cls(m[1]), m[2]);
      continue;
    }
    if (/^(style|classDef|cssClass|click|link|callback|class\s+\S+\s*:::)/.test(line)) continue;
    warn(`Skipped unrecognised class diagram line: ${line.slice(0, 60)}`);
  }
  if (!classes.size) throw new Error('The class diagram has no classes.');

  const nodes: SpecNode[] = [];
  for (const [id, label] of nsNodes) nodes.push({ id, kind: 'container', text: label });
  for (const c of classes.values()) {
    const header = [...c.annotations.map((a) => `«${a}»`), c.label].join('\n');
    nodes.push({
      id: c.id,
      kind: 'uml.class',
      text: [header, c.attributes.join('\n'), c.methods.join('\n')].join('\n--\n'),
      ...(c.parent ? { parent: c.parent } : {}),
    });
  }
  for (const n of notes) {
    nodes.push({ id: n.id, kind: 'uml.note', text: n.text });
    if (n.for) edges.push({ from: n.id, to: n.for, startArrow: 'none', endArrow: 'none', dashed: true });
  }
  return layoutSpec({ type: 'class', direction, nodes, edges }).elements;
}

// ---------------------------------------------------------------------------
// ER diagram
// ---------------------------------------------------------------------------

const ER_LEFT: Record<string, ArrowHead> = { '|o': 'erZeroOne', '||': 'erOnlyOne', '}o': 'erZeroMany', '}|': 'erOneMany' };
const ER_RIGHT: Record<string, ArrowHead> = { 'o|': 'erZeroOne', '||': 'erOnlyOne', 'o{': 'erZeroMany', '|{': 'erOneMany' };
const ER_WORDS: Array<[RegExp, ArrowHead]> = [
  [/^(one or zero|zero or one)$/i, 'erZeroOne'],
  [/^(one or more|one or many|many\(1\)|1\+)$/i, 'erOneMany'],
  [/^(zero or more|zero or many|many\(0\)|0\+)$/i, 'erZeroMany'],
  [/^(only one|1)$/i, 'erOnlyOne'],
];
const ER_WORD_SRC = String.raw`one or zero|zero or one|one or more|one or many|many\(1\)|1\+|zero or more|zero or many|many\(0\)|0\+|only one|1`;
const ER_SYM_RE = /^("[^"]+"|[\w.-]+)\s*(\|o|\|\||\}o|\}\|)\s*(--|\.\.)\s*(o\||\|\||o\{|\|\{)\s*("[^"]+"|[\w.-]+)\s*:\s*(.*)$/;
const ER_WORD_RE = new RegExp(String.raw`^("[^"]+"|[\w.-]+)\s+(${ER_WORD_SRC})\s+(to|optionally to)\s+(${ER_WORD_SRC})\s+("[^"]+"|[\w.-]+)\s*:\s*(.*)$`, 'i');

function erDiagram(lines: string[], warn: Warn): DiagramElement[] {
  const entities = new Map<string, { label: string; rows: string[] }>();
  const edges: SpecEdge[] = [];
  let direction: Direction = 'TB';
  const ent = (raw: string, alias?: string) => {
    const id = raw.replace(/^"|"$/g, '');
    let e = entities.get(id);
    if (!e) {
      e = { label: id, rows: [] };
      entities.set(id, e);
    }
    if (alias) e.label = cleanLabel(alias);
    return id;
  };
  let body: string | null = null;
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (body) {
      if (line.startsWith('}')) {
        body = null;
        continue;
      }
      const a = /^([\w\-()[\]<>,.*]+)\s+([\w\-*]+)\s*((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*)?\s*(?:"(.*)")?$/i.exec(line);
      if (a) {
        const keys = (a[3] ?? '').toUpperCase().replace(/\s+/g, '');
        entities.get(body)!.rows.push(`${keys ? keys + ' ' : ''}${a[2]}  ${a[1]}`);
      } else warn(`Skipped ER attribute: ${line.slice(0, 60)}`);
      continue;
    }
    if ((m = /^direction\s+(\w+)/i.exec(line))) {
      direction = parseDirection(m[1]) ?? direction;
      continue;
    }
    if ((m = /^("[^"]+"|[\w.-]+)\s*(?:\[\s*"?(.*?)"?\s*\])?\s*\{\s*(\})?$/.exec(line))) {
      const id = ent(m[1], m[2]);
      if (!m[3]) body = id;
      continue;
    }
    let rel: { a: string; b: string; l: ArrowHead; r: ArrowHead; dashed: boolean; label: string } | null = null;
    if ((m = ER_SYM_RE.exec(line))) rel = { a: m[1], b: m[5], l: ER_LEFT[m[2]], r: ER_RIGHT[m[4]], dashed: m[3] === '..', label: m[6] };
    else if ((m = ER_WORD_RE.exec(line))) {
      const word = (w: string) => ER_WORDS.find(([re]) => re.test(w))?.[1] ?? 'erOne';
      rel = { a: m[1], b: m[5], l: word(m[2]), r: word(m[4]), dashed: /optionally/i.test(m[3]), label: m[6] };
    }
    if (rel) {
      edges.push({
        from: ent(rel.a), to: ent(rel.b), startArrow: rel.l, endArrow: rel.r,
        ...(rel.dashed ? { dashed: true } : {}),
        ...(cleanLabel(rel.label) ? { label: cleanLabel(rel.label) } : {}),
      });
      continue;
    }
    if ((m = /^("[^"]+"|[\w.-]+)\s*(?:\[\s*"?(.*?)"?\s*\])?$/.exec(line))) {
      ent(m[1], m[2]);
      continue;
    }
    if (/^(style|classDef|class)\b/.test(line)) continue;
    warn(`Skipped unrecognised ER line: ${line.slice(0, 60)}`);
  }
  if (!entities.size) throw new Error('The ER diagram has no entities.');
  const nodes: SpecNode[] = [...entities].map(([id, e]) => ({ id, kind: 'erd.entity', text: [e.label, e.rows.join('\n')].join('\n--\n') }));
  return layoutSpec({ type: 'erd', direction, nodes, edges }).elements;
}

// ---------------------------------------------------------------------------
// State diagram
// ---------------------------------------------------------------------------

function stateDiagram(lines: string[], warn: Warn): DiagramElement[] {
  interface St { id: string; label: string; desc: string[]; kind: 'state' | 'start' | 'end' | 'choice' | 'fork' | 'join' | 'composite' | 'note'; parent?: string }
  const states = new Map<string, St>();
  const edges: SpecEdge[] = [];
  const scope: string[] = [];
  const classDefs = new Map<string, Partial<ElementStyle>>();
  const classOf = new Map<string, string>();
  let direction: Direction = 'TB';
  let concurrencyWarned = false;
  const cur = () => scope[scope.length - 1];
  const st = (raw: string, asTarget = false): string => {
    let name = raw.trim();
    const cm = /:::([\w-]+)$/.exec(name);
    if (cm) name = name.slice(0, cm.index).trim();
    if (name === '[*]') {
      const id = `${asTarget ? '__end' : '__start'}:${cur() ?? 'root'}`;
      if (!states.has(id)) states.set(id, { id, label: '', desc: [], kind: asTarget ? 'end' : 'start', parent: cur() });
      return id;
    }
    let s = states.get(name);
    if (!s) {
      s = { id: name, label: name, desc: [], kind: 'state', parent: cur() };
      states.set(name, s);
    }
    if (cm) classOf.set(name, cm[1]);
    return name;
  };

  let note: { target: string; lines: string[] } | null = null;
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (note) {
      if (/^end\s+note$/i.test(line)) {
        addNote(note.target, note.lines.join('\n'));
        note = null;
      } else note.lines.push(line);
      continue;
    }
    if ((m = /^direction\s+(\w+)/i.exec(line))) {
      if (!scope.length) direction = parseDirection(m[1]) ?? direction;
      continue;
    }
    if ((m = /^classDef\s+([\w-]+)\s+(.*)$/.exec(line))) {
      classDefs.set(m[1], cssToStyle(m[2]));
      continue;
    }
    if ((m = /^class\s+([\w,\s]+?)\s+([\w-]+)$/.exec(line))) {
      for (const id of m[1].split(',')) classOf.set(id.trim(), m[2]);
      continue;
    }
    if (line === '}') {
      scope.pop();
      continue;
    }
    if (line === '--') {
      if (!concurrencyWarned) warn('Concurrent regions (--) are drawn in a single region.');
      concurrencyWarned = true;
      continue;
    }
    if ((m = /^state\s+"([^"]*)"\s+as\s+([\w.-]+)\s*(\{)?$/.exec(line))) {
      const id = st(m[2]);
      states.get(id)!.label = cleanLabel(m[1]);
      if (m[3]) {
        states.get(id)!.kind = 'composite';
        scope.push(id);
      }
      continue;
    }
    if ((m = /^state\s+([\w.-]+)\s*<<(choice|fork|join)>>$/i.exec(line))) {
      states.get(st(m[1]))!.kind = m[2].toLowerCase() as 'choice';
      continue;
    }
    if ((m = /^state\s+([\w.-]+)\s*(?:as\s+"?([^"{]*)"?)?\s*\{$/.exec(line))) {
      const id = st(m[1]);
      states.get(id)!.kind = 'composite';
      if (m[2]) states.get(id)!.label = cleanLabel(m[2]);
      scope.push(id);
      continue;
    }
    if ((m = /^state\s+([\w.-]+)$/.exec(line))) {
      st(m[1]);
      continue;
    }
    if ((m = /^note\s+(?:left|right)\s+of\s+([\w.-]+)\s*:\s*(.*)$/i.exec(line))) {
      addNote(st(m[1]), cleanLabel(m[2]));
      continue;
    }
    if ((m = /^note\s+(?:left|right)\s+of\s+([\w.-]+)$/i.exec(line))) {
      note = { target: st(m[1]), lines: [] };
      continue;
    }
    if ((m = /^(\[\*\]|[\w.-]+(?::::[\w-]+)?)\s*-->\s*(\[\*\]|[\w.-]+(?::::[\w-]+)?)\s*(?::\s*(.*))?$/.exec(line))) {
      const from = st(m[1]);
      const to = st(m[2], true);
      edges.push({ from, to, ...(m[3] ? { label: cleanLabel(m[3]) } : {}) });
      continue;
    }
    if ((m = /^([\w.-]+)\s*:\s*(.*)$/.exec(line))) {
      states.get(st(m[1]))!.desc.push(cleanLabel(m[2]));
      continue;
    }
    if (/^(hide|scale|style|accTitle|accDescr)\b/.test(line)) continue;
    warn(`Skipped unrecognised state line: ${line.slice(0, 60)}`);
  }
  function addNote(target: string, text: string) {
    const id = `__note${states.size}`;
    states.set(id, { id, label: text, desc: [], kind: 'note', parent: states.get(target)?.parent });
    edges.push({ from: id, to: target, startArrow: 'none', endArrow: 'none', dashed: true });
  }
  if (!states.size) throw new Error('The state diagram has no states.');

  const sizes = new Map<string, { w?: number; h?: number }>();
  const styles = new Map<string, Partial<ElementStyle>>();
  const nodes: SpecNode[] = [...states.values()].map((s) => {
    let kind: string;
    let text = s.label;
    let style: Partial<ElementStyle> = {};
    switch (s.kind) {
      case 'start':
        kind = pickKind('uml.initial', 'ellipse');
        style = { fill: '#1e293b', stroke: '#1e293b' };
        break;
      case 'end':
        kind = pickKind('uml.final', 'ellipse');
        break;
      case 'choice':
        kind = 'diamond';
        text = '';
        sizes.set(s.id, { w: 36, h: 36 });
        style = { fill: '#fef3c7', stroke: '#d97706' };
        break;
      case 'fork':
      case 'join':
        kind = 'rectangle';
        text = '';
        sizes.set(s.id, { w: 90, h: 8 });
        style = { fill: '#1e293b', stroke: '#1e293b', radius: 0 };
        break;
      case 'note':
        kind = 'uml.note';
        style = { fill: '#fef9c3', stroke: '#ca8a04' };
        break;
      case 'composite':
        kind = 'container';
        break;
      default:
        kind = 'rectangle';
        if (s.desc.length) text = `${s.label}\n${s.desc.join('\n')}`;
        style = { fill: '#eef2ff', stroke: '#4f46e5', radius: 12 };
    }
    const cls = classOf.get(s.id);
    if (cls) style = { ...style, ...(classDefs.get(cls) ?? {}) };
    styles.set(s.id, style);
    return { id: s.id, kind, text, ...(s.parent ? { parent: s.parent } : {}) };
  });
  const out = layoutSpec({ type: 'generic', direction, nodes, edges }, sizes.size ? { sizes } : {});
  for (const [id, style] of styles) {
    const s = out.shapes.get(id);
    if (s) s.style = { ...s.style, ...style };
  }
  return out.elements;
}

// ---------------------------------------------------------------------------
// Mindmap
// ---------------------------------------------------------------------------

const MINDMAP_SHAPES: Array<{ re: RegExp; kind: string[]; radius?: number }> = [
  { re: /^([^\s(\[{)]*)\(\((.+)\)\)$/, kind: ['ellipse'] },
  { re: /^([^\s(\[{)]*)\)\)(.+)\(\($/, kind: ['basic.explosion', 'cloud'] },
  { re: /^([^\s(\[{)]*)\)(.+)\($/, kind: ['cloud'] },
  { re: /^([^\s(\[{)]*)\{\{(.+)\}\}$/, kind: ['hexagon'] },
  { re: /^([^\s(\[{)]*)\((.+)\)$/, kind: ['rectangle'], radius: 14 },
  { re: /^([^\s(\[{)]*)\[(.+)\]$/, kind: ['rectangle'], radius: 0 },
];
const BRANCH_COLORS = [
  ['#dbeafe', '#2563eb'], ['#dcfce7', '#16a34a'], ['#fef3c7', '#d97706'], ['#fce7f3', '#db2777'],
  ['#ede9fe', '#7c3aed'], ['#ccfbf1', '#0d9488'], ['#ffedd5', '#ea580c'], ['#fee2e2', '#dc2626'],
];

function mindmap(lines: string[]): DiagramElement[] {
  const indentOf = (l: string) => l.replace(/\t/g, '    ').match(/^\s*/)![0].length;
  const nodes: SpecNode[] = [];
  const edges: SpecEdge[] = [];
  const styles = new Map<string, Partial<ElementStyle>>();
  const stack: Array<{ indent: number; id: string; branch: number }> = [];
  let branches = 0;
  for (const raw of lines.slice(1)) {
    const t = raw.trim();
    if (t.startsWith('::icon(') || /^:::/.test(t)) continue;
    const indent = indentOf(raw);
    const body = t.replace(/:::[\w\s-]+$/, '').trim();
    let kind = 'rectangle';
    let text = body;
    let radius = 10;
    for (const s of MINDMAP_SHAPES) {
      const m = s.re.exec(body);
      if (!m) continue;
      kind = pickKind(...s.kind);
      text = m[2];
      if (s.radius !== undefined) radius = s.radius;
      break;
    }
    const id = `n${nodes.length}`;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    const branch = !parent ? -1 : parent.branch < 0 ? branches++ : parent.branch;
    nodes.push({ id, kind, text: cleanLabel(text) });
    const [fill, stroke] = branch < 0 ? ['#1e293b', '#1e293b'] : BRANCH_COLORS[branch % BRANCH_COLORS.length];
    styles.set(id, { fill, stroke, radius, ...(branch < 0 ? { textColor: '#ffffff', bold: true, fontSize: 16 } : {}) });
    if (parent) edges.push({ from: parent.id, to: id, startArrow: 'none', endArrow: 'none', routing: 'curved' });
    stack.push({ indent, id, branch });
  }
  if (!nodes.length) throw new Error('The mindmap is empty.');
  const out = layoutSpec({ type: 'generic', direction: 'LR', nodes, edges });
  for (const [id, style] of styles) {
    const s = out.shapes.get(id);
    if (s) s.style = { ...s.style, ...style };
  }
  for (const c of out.connectors) c.style = { ...c.style, strokeWidth: 2 };
  return out.elements;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

export function parseMermaid(text: string): ImportResult {
  const warnings: string[] = [];
  const warn: Warn = (msg) => {
    if (!warnings.includes(msg) && warnings.length < 50) warnings.push(msg);
  };
  const { lines, title } = prepare(text);
  if (!lines.length) throw new Error('The Mermaid text is empty.');
  const type = diagramType(lines[0]);
  let elements: DiagramElement[];
  switch (type) {
    case 'flowchart':
      elements = flowchart(lines, warn);
      break;
    case 'sequence':
      elements = sequence(lines, warn);
      break;
    case 'class':
      elements = classDiagram(lines, warn);
      break;
    case 'er':
      elements = erDiagram(lines, warn);
      break;
    case 'state':
      elements = stateDiagram(lines, warn);
      break;
    case 'mindmap':
      elements = mindmap(lines);
      break;
    default:
      throw new Error(
        `Unsupported Mermaid diagram "${lines[0].trim().split(/\s+/)[0]}". Supported: flowchart/graph, sequenceDiagram, classDiagram, erDiagram, stateDiagram, mindmap.`,
      );
  }
  const shapes = elements.filter((e): e is ShapeElement => e.type === 'shape');
  if (!shapes.length) throw new Error('Nothing to import.');
  return { pages: [{ name: title || 'Mermaid', doc: makeDoc(elements) }], warnings };
}

export const importer: Importer = {
  id: 'mermaid',
  label: 'Mermaid…',
  description: 'Flowcharts, sequence, class, ER, state diagrams and mindmaps written in Mermaid.',
  extensions: ['mmd', 'mermaid'],
  acceptsText: true,
  example: `flowchart TD
    A([Start]) --> B{Is it working?}
    B -- Yes --> C[Great]
    B -- No --> D[[Debug]]
    D --> E[(Logs)]
    E -.-> B
    C --> F((Done))
    subgraph Ops
      D
      E
    end
    classDef warn fill:#fee2e2,stroke:#dc2626
    class D warn`,
  detect: (content) => {
    if (typeof content !== 'string') return false;
    const { lines } = prepare(content.slice(0, 4000));
    return !!lines.length && !!diagramType(lines[0]);
  },
  run: async (content) => parseMermaid(typeof content === 'string' ? content : new TextDecoder().decode(content)),
};
