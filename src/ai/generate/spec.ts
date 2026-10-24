/**
 * The compact diagram spec the model produces (via the `submit_diagram` tool),
 * plus hand-written validation/normalisation.
 *
 * Validation is lenient where a sensible repair exists (unknown kind → closest
 * shape, bad color → dropped) and strict where only the model can fix it
 * (duplicate ids, dangling edges, containment cycles). Hard errors are sent
 * back to the model as a tool error so it can correct itself.
 */
import type { ArrowHead, Routing } from '@/model/types';
import { SHAPES } from '@/shapes/registry';

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'erd' | 'c4' | 'cloud' | 'network' | 'generic';
export type Direction = 'TB' | 'LR' | 'BT' | 'RL';

export interface SpecStyle {
  fill?: string;
  stroke?: string;
  textColor?: string;
  dashed?: boolean;
  bold?: boolean;
}

/** Motion on a node or edge (docs/specs/animation.md). */
export interface SpecAnimation<K extends string = string> {
  kind: K;
  /** 1 = default speed (0.25–4). */
  speed?: number;
  /** Edges: travel from target to source. */
  reverse?: boolean;
}

export const EDGE_ANIMATIONS = ['flow', 'dots', 'pulse'] as const;
export const NODE_ANIMATIONS = ['pulse', 'glow', 'bounce'] as const;
export type EdgeAnimationKind = (typeof EDGE_ANIMATIONS)[number];
export type NodeAnimationKind = (typeof NODE_ANIMATIONS)[number];

export interface SpecNode {
  id: string;
  /** Shape kind from the registry (aliases like `process`, `decision` accepted). */
  kind: string;
  text: string;
  /** For `kind: 'icon'`: `<provider>/<file>` from `search_icons`. */
  icon?: string;
  /** Id of the container / boundary this node sits in. */
  parent?: string;
  /** C4: technology, shown as `[Container: tech]`. */
  technology?: string;
  /** C4: description paragraph. */
  description?: string;
  /** UML class / ERD entity rows. */
  attributes?: string[];
  methods?: string[];
  /** C4: external (grey) element. */
  external?: boolean;
  style?: SpecStyle;
  /** Emphasis animation (e.g. the failing service pulses). */
  animation?: SpecAnimation<NodeAnimationKind>;
  /** Build step (1, 2, 3…) at which the node appears. */
  step?: number;
}

export interface SpecEdge {
  from: string;
  to: string;
  label?: string;
  routing?: Routing;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  dashed?: boolean;
  /** Motion along the edge: requests flowing, data moving. */
  animation?: SpecAnimation<EdgeAnimationKind>;
  /** Build step at which the edge appears (never before its ends). */
  step?: number;
}

export interface DiagramSpec {
  type: DiagramType;
  direction?: Direction;
  title?: string;
  nodes: SpecNode[];
  edges: SpecEdge[];
  /** Reveal the diagram step by step, following the flow (explicit `step`s win). */
  build?: boolean;
}

export const DIAGRAM_TYPES: DiagramType[] = ['flowchart', 'sequence', 'class', 'erd', 'c4', 'cloud', 'network', 'generic'];
export const DIRECTIONS: Direction[] = ['TB', 'LR', 'BT', 'RL'];
export const ROUTINGS: Routing[] = ['orthogonal', 'straight', 'curved'];
export const ARROW_HEADS: ArrowHead[] = [
  'none', 'arrow', 'triangle', 'triangleOpen', 'diamond', 'diamondOpen', 'circle', 'circleOpen',
  'erOne', 'erOnlyOne', 'erMany', 'erOneMany', 'erZeroMany', 'erZeroOne',
];

/** Semantic C4 kinds the model may use; all render with the registry's `c4.box`. */
export const C4_BOX_KINDS = ['c4.system', 'c4.container', 'c4.component', 'c4.external'] as const;

/** Kinds that hold children. */
export const CONTAINER_KINDS = new Set(['container', 'group', 'c4.boundary', 'uml.frame']);

const KIND_ALIASES: Record<string, string> = {
  process: 'rectangle',
  box: 'rectangle',
  rect: 'rectangle',
  step: 'rectangle',
  action: 'rectangle',
  decision: 'diamond',
  condition: 'diamond',
  start: 'flow.terminator',
  end: 'flow.terminator',
  terminator: 'flow.terminator',
  io: 'parallelogram',
  input: 'parallelogram',
  output: 'parallelogram',
  data: 'parallelogram',
  document: 'flow.document',
  subprocess: 'flow.predefined',
  database: 'cylinder',
  db: 'cylinder',
  storage: 'cylinder',
  note: 'uml.note',
  comment: 'uml.note',
  class: 'uml.class',
  interface: 'uml.class',
  entity: 'erd.entity',
  table: 'erd.entity',
  actor: 'uml.actor',
  participant: 'uml.lifeline',
  lifeline: 'uml.lifeline',
  group: 'container',
  cluster: 'container',
  region: 'container',
  vpc: 'container',
  vnet: 'container',
  subnet: 'container',
  zone: 'container',
  boundary: 'c4.boundary',
  person: 'c4.person',
  'c4.system_boundary': 'c4.boundary',
  'c4.db': 'c4.database',
};

const ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|none)$/;
const ICON_RE = /^[a-z0-9][a-z0-9_-]*\/[^\s]+\.svg$/i;

export interface ValidationOk {
  ok: true;
  spec: DiagramSpec;
  warnings: string[];
}
export interface ValidationFail {
  ok: false;
  errors: string[];
  warnings: string[];
}
export type ValidationResult = ValidationOk | ValidationFail;

export interface ValidateOptions {
  /** Icon paths known to exist. Icons not in this set are replaced by a plain shape. */
  knownIcons?: Set<string>;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
const strList = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((x): x is string => x !== undefined) : undefined;

const ANIMATION_ALIASES: Record<string, string> = {
  marching: 'flow', ants: 'flow', dash: 'flow', dashes: 'flow', dashed: 'flow', stream: 'flow', flowing: 'flow',
  dot: 'dots', particles: 'dots', particle: 'dots', tokens: 'dots', packets: 'dots', data: 'dots',
  blink: 'pulse', pulsing: 'pulse', highlight: 'glow', glowing: 'glow', shake: 'bounce', jump: 'bounce', bouncing: 'bounce',
};

/**
 * Parses an `animation` value: a kind ("flow") or `{ kind, speed, reverse }`.
 * Returns null for an explicit "none"/false (remove), undefined when absent or unusable.
 */
export function parseAnimation<K extends string>(raw: unknown, kinds: readonly K[], warnings: string[], where: string): SpecAnimation<K> | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === false) return null;
  const obj = isObj(raw) ? raw : undefined;
  const name = (raw === true ? kinds[0] : str(obj ? (obj.kind ?? obj.type ?? obj.effect) : raw))?.trim().toLowerCase();
  if (!name) return undefined;
  if (name === 'none' || name === 'off') return null;
  const kind = (kinds as readonly string[]).includes(name) ? name : ANIMATION_ALIASES[name];
  if (!kind || !(kinds as readonly string[]).includes(kind)) {
    warnings.push(`${where}: unknown animation "${name}" (use ${kinds.join(', ')}).`);
    return undefined;
  }
  const out: SpecAnimation<K> = { kind: kind as K };
  const speed = typeof obj?.speed === 'number' ? obj.speed : Number(str(obj?.speed));
  if (Number.isFinite(speed) && speed > 0) out.speed = Math.min(4, Math.max(0.25, speed));
  if (obj?.reverse === true) out.reverse = true;
  return out;
}

/** Parses a build `step`: a positive integer, null for an explicit 0/null (remove), undefined when absent or unusable. */
export function parseStep(raw: unknown, warnings: string[], where: string): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === 0 || raw === '0') return null;
  const n = typeof raw === 'number' ? raw : Number(str(raw));
  if (Number.isInteger(n) && n > 0 && n <= 999) return n;
  warnings.push(`${where}: step must be a whole number from 1, ignored "${String(raw)}".`);
  return undefined;
}

export function isKnownKind(kind: string): boolean {
  return kind in SHAPES || (C4_BOX_KINDS as readonly string[]).includes(kind);
}

export function normalizeKind(raw: string): string | undefined {
  const k = raw.trim();
  if (isKnownKind(k)) return k;
  const lower = k.toLowerCase();
  if (KIND_ALIASES[lower]) return KIND_ALIASES[lower];
  const caseFix = Object.keys(SHAPES).find((s) => s.toLowerCase() === lower);
  if (caseFix) return caseFix;
  const c4 = (C4_BOX_KINDS as readonly string[]).find((s) => s === lower);
  return c4;
}

function normStyle(raw: unknown, warnings: string[], where: string): SpecStyle | undefined {
  if (!isObj(raw)) return undefined;
  const out: SpecStyle = {};
  for (const key of ['fill', 'stroke', 'textColor'] as const) {
    const v = str(raw[key]);
    if (v === undefined) continue;
    if (COLOR_RE.test(v.trim())) out[key] = v.trim();
    else warnings.push(`${where}: ignored invalid color ${key}="${v}"`);
  }
  if (typeof raw.dashed === 'boolean') out.dashed = raw.dashed;
  if (typeof raw.bold === 'boolean') out.bold = raw.bold;
  return Object.keys(out).length ? out : undefined;
}

/** Validates and normalises untrusted model output into a `DiagramSpec`. */
export function validateSpec(input: unknown, opts: ValidateOptions = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let root = input;
  // Accept `{ spec: {...} }` and JSON strings.
  if (typeof root === 'string') {
    try {
      root = JSON.parse(root);
    } catch {
      return { ok: false, errors: ['The diagram spec is not valid JSON.'], warnings };
    }
  }
  if (isObj(root) && isObj(root.spec) && !Array.isArray(root.nodes)) root = root.spec;
  if (isObj(root) && '__invalidJson' in root) return { ok: false, errors: ['The tool arguments were not valid JSON.'], warnings };
  if (!isObj(root)) return { ok: false, errors: ['The diagram spec must be an object with `nodes` and `edges`.'], warnings };

  const typeRaw = str(root.type)?.toLowerCase();
  const type: DiagramType = DIAGRAM_TYPES.includes(typeRaw as DiagramType) ? (typeRaw as DiagramType) : 'generic';
  if (typeRaw && type === 'generic' && typeRaw !== 'generic') warnings.push(`Unknown diagram type "${typeRaw}", using generic.`);
  const dirRaw = str(root.direction)?.toUpperCase();
  const direction = DIRECTIONS.includes(dirRaw as Direction) ? (dirRaw as Direction) : undefined;

  if (!Array.isArray(root.nodes) || root.nodes.length === 0) errors.push('`nodes` must be a non-empty array.');
  const nodes: SpecNode[] = [];
  const ids = new Set<string>();
  for (const [i, rawNode] of (Array.isArray(root.nodes) ? root.nodes : []).entries()) {
    if (!isObj(rawNode)) {
      errors.push(`nodes[${i}] is not an object.`);
      continue;
    }
    const id = str(rawNode.id)?.trim();
    if (!id || !ID_RE.test(id)) {
      errors.push(`nodes[${i}] needs an \`id\` (letters, digits, _ . : -; max 64 chars).`);
      continue;
    }
    if (ids.has(id)) {
      errors.push(`Duplicate node id "${id}".`);
      continue;
    }
    ids.add(id);
    const where = `node "${id}"`;
    let kind = normalizeKind(str(rawNode.kind) ?? str(rawNode.type) ?? 'rectangle') ?? '';
    if (!kind) {
      warnings.push(`${where}: unknown kind "${str(rawNode.kind)}", using rectangle.`);
      kind = 'rectangle';
    }
    const node: SpecNode = { id, kind, text: str(rawNode.text) ?? str(rawNode.label) ?? str(rawNode.name) ?? '' };
    let icon = str(rawNode.icon)?.trim().replace(/^\/?icons\//, '');
    if (icon && !icon.endsWith('.svg') && ICON_RE.test(icon + '.svg')) icon += '.svg';
    if (icon) {
      if (!ICON_RE.test(icon)) warnings.push(`${where}: ignored malformed icon "${icon}".`);
      else if (opts.knownIcons && !opts.knownIcons.has(icon)) warnings.push(`${where}: icon "${icon}" not found, using a plain shape.`);
      else node.icon = icon;
    }
    if (kind === 'icon' && !node.icon) node.kind = 'rectangle';
    else if (node.icon && kind !== 'icon') node.kind = 'icon';
    const parent = str(rawNode.parent ?? rawNode.parentId ?? rawNode.container)?.trim();
    if (parent) node.parent = parent;
    const technology = str(rawNode.technology)?.trim();
    if (technology) node.technology = technology;
    const description = str(rawNode.description)?.trim();
    if (description) node.description = description;
    const attributes = strList(rawNode.attributes ?? rawNode.columns ?? rawNode.fields);
    if (attributes?.length) node.attributes = attributes;
    const methods = strList(rawNode.methods ?? rawNode.operations);
    if (methods?.length) node.methods = methods;
    if (rawNode.external === true) node.external = true;
    if (node.kind === 'c4.external') {
      node.kind = 'c4.system';
      node.external = true;
    }
    const style = normStyle(rawNode.style, warnings, where);
    if (style) node.style = style;
    const animation = parseAnimation(rawNode.animation ?? rawNode.animate, NODE_ANIMATIONS, warnings, where);
    if (animation) node.animation = animation;
    const step = parseStep(rawNode.step ?? rawNode.reveal, warnings, where);
    if (step) node.step = step;
    nodes.push(node);
  }

  // Containment: parents must exist and form no cycles.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (n.parent === undefined) continue;
    if (n.parent === n.id || !byId.has(n.parent)) {
      errors.push(`Node "${n.id}" has unknown parent "${n.parent}".`);
      continue;
    }
    const seen = new Set([n.id]);
    let p: string | undefined = n.parent;
    while (p) {
      if (seen.has(p)) {
        errors.push(`Containment cycle involving "${n.id}".`);
        break;
      }
      seen.add(p);
      p = byId.get(p)?.parent;
    }
  }
  // Any node with children becomes a container.
  const parents = new Set(nodes.map((n) => n.parent).filter(Boolean));
  for (const n of nodes) {
    if (parents.has(n.id) && !CONTAINER_KINDS.has(n.kind)) {
      warnings.push(`Node "${n.id}" has children; drawing it as a container.`);
      n.kind = type === 'c4' ? 'c4.boundary' : 'container';
      delete n.icon;
    }
  }

  const edges: SpecEdge[] = [];
  if (root.edges !== undefined && !Array.isArray(root.edges)) errors.push('`edges` must be an array.');
  for (const [i, rawEdge] of (Array.isArray(root.edges) ? root.edges : []).entries()) {
    if (!isObj(rawEdge)) {
      errors.push(`edges[${i}] is not an object.`);
      continue;
    }
    const from = str(rawEdge.from ?? rawEdge.source)?.trim();
    const to = str(rawEdge.to ?? rawEdge.target)?.trim();
    if (!from || !to) {
      errors.push(`edges[${i}] needs \`from\` and \`to\`.`);
      continue;
    }
    if (!byId.has(from) || !byId.has(to)) {
      errors.push(`edges[${i}] references unknown node "${!byId.has(from) ? from : to}".`);
      continue;
    }
    const edge: SpecEdge = { from, to };
    const label = str(rawEdge.label ?? rawEdge.text)?.trim();
    if (label) edge.label = label;
    const routing = str(rawEdge.routing);
    if (routing) {
      if (ROUTINGS.includes(routing as Routing)) edge.routing = routing as Routing;
      else warnings.push(`edges[${i}]: unknown routing "${routing}".`);
    }
    for (const key of ['startArrow', 'endArrow'] as const) {
      const v = str(rawEdge[key]);
      if (v === undefined) continue;
      if (ARROW_HEADS.includes(v as ArrowHead)) edge[key] = v as ArrowHead;
      else warnings.push(`edges[${i}]: unknown ${key} "${v}".`);
    }
    if (rawEdge.dashed === true) edge.dashed = true;
    const animation = parseAnimation(rawEdge.animation ?? rawEdge.animate ?? rawEdge.animated, EDGE_ANIMATIONS, warnings, `edges[${i}]`);
    if (animation) edge.animation = animation;
    const step = parseStep(rawEdge.step ?? rawEdge.reveal, warnings, `edges[${i}]`);
    if (step) edge.step = step;
    edges.push(edge);
  }

  if (errors.length) return { ok: false, errors, warnings };
  const spec: DiagramSpec = { type, nodes, edges };
  if (direction) spec.direction = direction;
  const title = str(root.title)?.trim();
  if (title) spec.title = title;
  if (root.build === true || root.stepByStep === true || str(root.build) === 'true') spec.build = true;
  return { ok: true, spec, warnings };
}
