/**
 * Edit mode: incremental operations on the current document.
 *
 * Existing shapes keep their positions; new shapes are placed next to the
 * shapes they connect to (or inside their container, which grows to fit),
 * avoiding overlaps.
 */
import type { ArrowHead, ConnectorElement, DiagramElement, Doc, Rect, Routing, ShapeElement } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { createConnector, createShape, DEFAULT_CONNECTOR_STYLE } from '@/model/defaults';
import { compartmentHeight, getShapeDef } from '@/shapes/registry';
import { c4Text, C4_COLORS, compartmentText, resolveNode } from './resolve';
import { ARROW_HEADS, CONTAINER_KINDS, normalizeKind, ROUTINGS, validateSpec, type DiagramType, type SpecEdge, type SpecNode, type SpecStyle } from './spec';
import { facingPoint } from './toElements';

export type EditOp =
  | { op: 'add_node'; node: SpecNode }
  | {
      op: 'update_node';
      id: string;
      text?: string;
      kind?: string;
      icon?: string;
      parent?: string | null;
      technology?: string;
      description?: string;
      attributes?: string[];
      methods?: string[];
      style?: SpecStyle;
    }
  | { op: 'remove_node'; id: string }
  | { op: 'add_edge'; edge: SpecEdge }
  | { op: 'update_edge'; id: string; label?: string; startArrow?: ArrowHead; endArrow?: ArrowHead; dashed?: boolean; routing?: Routing }
  | { op: 'remove_edge'; id: string };

export interface OpsValidation {
  ok: boolean;
  ops: EditOp[];
  errors: string[];
  warnings: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);

/** Validates untrusted edit operations against the current document. */
export function validateOps(input: unknown, doc: Doc, knownIcons?: Set<string>): OpsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ops: EditOp[] = [];
  const root = isObj(input) && Array.isArray(input.ops) ? input.ops : Array.isArray(input) ? input : null;
  if (!root) return { ok: false, ops, errors: ['Expected `{ "ops": [...] }`.'], warnings };

  const shapeIds = new Set(Object.values(doc.elements).filter(isShape).map((e) => e.id));
  const edgeIds = new Set(Object.values(doc.elements).filter(isConnector).map((e) => e.id));
  const removed = new Set<string>();
  const added = new Set<string>();
  const nodeExists = (id: string) => (shapeIds.has(id) && !removed.has(id)) || added.has(id);
  const isContainerId = (id: string) => {
    const el = doc.elements[id];
    return added.has(id) || (isShape(el) && (CONTAINER_KINDS.has(el.kind) || !!getShapeDef(el.kind).container));
  };

  root.forEach((raw, i) => {
    const where = `ops[${i}]`;
    if (!isObj(raw)) return void errors.push(`${where} is not an object.`);
    const op = str(raw.op);
    switch (op) {
      case 'add_node': {
        const rawNode = isObj(raw.node) ? raw.node : raw;
        const { parent, ...rest } = rawNode as Record<string, unknown>;
        const v = validateSpec({ nodes: [rest], edges: [] }, { knownIcons });
        warnings.push(...v.warnings.map((w) => `${where}: ${w}`));
        if (!v.ok) return void errors.push(...v.errors.map((e) => `${where}: ${e}`));
        const node = v.spec.nodes[0];
        if (nodeExists(node.id) || edgeIds.has(node.id)) return void errors.push(`${where}: id "${node.id}" already exists; choose a new id.`);
        const p = str(parent);
        if (p) {
          if (!nodeExists(p)) return void errors.push(`${where}: unknown parent "${p}".`);
          node.parent = p;
        }
        added.add(node.id);
        ops.push({ op: 'add_node', node });
        return;
      }
      case 'update_node': {
        const id = str(raw.id);
        if (!id || !shapeIds.has(id) || removed.has(id)) return void errors.push(`${where}: unknown node id "${id}".`);
        const u: Extract<EditOp, { op: 'update_node' }> = { op: 'update_node', id };
        const text = str(raw.text);
        if (text !== undefined) u.text = text;
        const kindRaw = str(raw.kind);
        if (kindRaw) {
          const k = normalizeKind(kindRaw);
          if (k) u.kind = k;
          else warnings.push(`${where}: unknown kind "${kindRaw}" ignored.`);
        }
        const icon = str(raw.icon);
        if (icon) {
          if (knownIcons && !knownIcons.has(icon)) warnings.push(`${where}: icon "${icon}" not found, ignored.`);
          else u.icon = icon;
        }
        if (raw.parent === null || raw.parent === '') u.parent = null;
        else if (str(raw.parent)) {
          const p = str(raw.parent)!;
          if (!nodeExists(p) || p === id) return void errors.push(`${where}: unknown parent "${p}".`);
          if (!isContainerId(p)) warnings.push(`${where}: "${p}" is not a container.`);
          u.parent = p;
        }
        for (const k of ['technology', 'description'] as const) if (str(raw[k])) u[k] = str(raw[k]);
        for (const k of ['attributes', 'methods'] as const)
          if (Array.isArray(raw[k])) u[k] = (raw[k] as unknown[]).map((x) => str(x) ?? '').filter(Boolean);
        if (isObj(raw.style)) {
          const v = validateSpec({ nodes: [{ id: 'x', kind: 'rectangle', style: raw.style }], edges: [] });
          if (v.ok && v.spec.nodes[0].style) u.style = v.spec.nodes[0].style;
        }
        ops.push(u);
        return;
      }
      case 'remove_node': {
        const id = str(raw.id);
        if (!id || !nodeExists(id)) return void errors.push(`${where}: unknown node id "${id}".`);
        removed.add(id);
        ops.push({ op: 'remove_node', id });
        return;
      }
      case 'add_edge': {
        const e = isObj(raw.edge) ? raw.edge : raw;
        const from = str(e.from ?? e.source);
        const to = str(e.to ?? e.target);
        if (!from || !to || !nodeExists(from) || !nodeExists(to)) return void errors.push(`${where}: edge endpoints must be existing or newly added node ids (got "${from}" → "${to}").`);
        const edge: SpecEdge = { from, to };
        const label = str(e.label);
        if (label) edge.label = label;
        if (ROUTINGS.includes(e.routing as Routing)) edge.routing = e.routing as Routing;
        if (ARROW_HEADS.includes(e.startArrow as ArrowHead)) edge.startArrow = e.startArrow as ArrowHead;
        if (ARROW_HEADS.includes(e.endArrow as ArrowHead)) edge.endArrow = e.endArrow as ArrowHead;
        if (e.dashed === true) edge.dashed = true;
        ops.push({ op: 'add_edge', edge });
        return;
      }
      case 'update_edge': {
        const id = str(raw.id);
        if (!id || !edgeIds.has(id)) return void errors.push(`${where}: unknown edge id "${id}".`);
        const u: Extract<EditOp, { op: 'update_edge' }> = { op: 'update_edge', id };
        if (str(raw.label) !== undefined) u.label = str(raw.label);
        if (ARROW_HEADS.includes(raw.startArrow as ArrowHead)) u.startArrow = raw.startArrow as ArrowHead;
        if (ARROW_HEADS.includes(raw.endArrow as ArrowHead)) u.endArrow = raw.endArrow as ArrowHead;
        if (typeof raw.dashed === 'boolean') u.dashed = raw.dashed;
        if (ROUTINGS.includes(raw.routing as Routing)) u.routing = raw.routing as Routing;
        ops.push(u);
        return;
      }
      case 'remove_edge': {
        const id = str(raw.id);
        if (!id || !edgeIds.has(id)) return void errors.push(`${where}: unknown edge id "${id}".`);
        ops.push({ op: 'remove_edge', id });
        return;
      }
      default:
        errors.push(`${where}: unknown op "${op}".`);
    }
  });
  if (!ops.length && !errors.length) errors.push('No operations given.');
  return { ok: errors.length === 0, ops, errors, warnings };
}

// ---------------------------------------------------------------------------

export function inferDiagramType(doc: Doc): DiagramType {
  const kinds = Object.values(doc.elements).filter(isShape).map((s) => s.kind);
  if (kinds.some((k) => k.startsWith('c4.'))) return 'c4';
  if (kinds.some((k) => k === 'erd.entity')) return 'erd';
  if (kinds.some((k) => k === 'uml.class')) return 'class';
  if (kinds.some((k) => k.startsWith('flow.') || k === 'diamond')) return 'flowchart';
  if (kinds.some((k) => k === 'icon')) return 'cloud';
  if (kinds.some((k) => k.startsWith('net.'))) return 'network';
  return 'generic';
}

/** Recovers the semantic C4 kind of an existing `c4.box` from its color. */
function c4KindOf(s: ShapeElement): { kind: string; external?: boolean } {
  if (s.kind !== 'c4.box') return { kind: s.kind };
  const fill = s.style.fill.toLowerCase();
  if (fill === C4_COLORS.system.fill.toLowerCase()) return { kind: 'c4.system' };
  if (fill === C4_COLORS.component.fill.toLowerCase()) return { kind: 'c4.component' };
  if (fill === C4_COLORS.external.fill.toLowerCase()) return { kind: 'c4.system', external: true };
  return { kind: 'c4.container' };
}

const overlaps = (a: Rect, b: Rect, m = 16) =>
  a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;

export interface ApplyResult {
  /** The complete new element list (back-to-front), for `replaceDoc`. */
  elements: DiagramElement[];
  added: number;
  updated: number;
  removed: number;
  /** Element ids created by this edit. */
  newIds: string[];
}

export function applyOps(doc: Doc, ops: EditOp[]): ApplyResult {
  const els = new Map<string, DiagramElement>(Object.entries(doc.elements));
  const order = doc.order.filter((id) => els.has(id));
  const type = inferDiagramType(doc);
  const specToEl = new Map<string, string>();
  const newShapes: ShapeElement[] = [];
  const newContainers: ShapeElement[] = [];
  const newConnectors: ConnectorElement[] = [];
  const pendingPlacement: Array<{ shape: ShapeElement; node: SpecNode }> = [];
  let updated = 0;
  let removedCount = 0;

  const resolveId = (id: string) => specToEl.get(id) ?? id;
  const shape = (id: string) => {
    const el = els.get(resolveId(id));
    return isShape(el) ? el : undefined;
  };
  const touch = <T extends DiagramElement>(el: T): T => {
    const copy = { ...el, style: { ...el.style } } as T;
    els.set(el.id, copy);
    return copy;
  };

  // 1. Create shapes (unplaced) so edges can reference them.
  for (const op of ops) {
    if (op.op !== 'add_node') continue;
    const r = resolveNode(op.node, type, ops.some((o) => o.op === 'add_node' && o.node.parent === op.node.id));
    const s = createShape(r.kind, { x: 0, y: 0, w: r.w, h: r.h }, r.style, r.text);
    if (r.icon) s.icon = r.icon;
    specToEl.set(op.node.id, s.id);
    els.set(s.id, s);
    (r.container ? newContainers : newShapes).push(s);
    pendingPlacement.push({ shape: s, node: op.node });
  }
  for (const { shape: s, node } of pendingPlacement) if (node.parent) s.containerId = resolveId(node.parent);

  // 2. Apply updates / removals / edges in order.
  for (const op of ops) {
    switch (op.op) {
      case 'update_node': {
        const cur = shape(op.id);
        if (!cur) break;
        const s = touch(cur);
        updated++;
        if (op.kind) s.kind = op.kind === 'c4.system' || op.kind === 'c4.container' || op.kind === 'c4.component' ? 'c4.box' : op.kind;
        if (op.icon) {
          s.icon = op.icon;
          s.kind = 'icon';
        }
        if (op.parent === null) delete s.containerId;
        else if (op.parent) s.containerId = resolveId(op.parent);
        const baseText = op.text ?? s.text.split('\n')[0];
        if (s.kind.startsWith('c4.') && (op.technology || op.description || op.text !== undefined)) {
          const sem = c4KindOf(s);
          s.text = op.technology || op.description ? c4Text({ id: s.id, kind: sem.kind, text: baseText, technology: op.technology, description: op.description, external: sem.external }, sem.kind === 'c4.box' ? 'c4.container' : sem.kind) : (op.text ?? s.text);
        } else if ((s.kind === 'uml.class' || s.kind === 'erd.entity') && (op.attributes || op.methods)) {
          s.text = compartmentText({ id: s.id, kind: s.kind, text: baseText, attributes: op.attributes, methods: op.methods });
        } else if (op.text !== undefined) {
          s.text = op.text;
        }
        if (s.kind === 'uml.class' || s.kind === 'erd.entity') s.h = Math.max(s.h, Math.ceil(compartmentHeight(s.w, s.style, s.text)));
        if (op.style) {
          if (op.style.fill) s.style.fill = op.style.fill;
          if (op.style.stroke) s.style.stroke = op.style.stroke;
          if (op.style.textColor) s.style.textColor = op.style.textColor;
          if (op.style.dashed !== undefined) s.style.strokeStyle = op.style.dashed ? 'dashed' : 'solid';
          if (op.style.bold !== undefined) s.style.bold = op.style.bold;
        }
        break;
      }
      case 'remove_node': {
        const id = resolveId(op.id);
        if (!els.delete(id)) break;
        removedCount++;
        for (const [eid, el] of els) {
          if (isConnector(el) && (el.source.elementId === id || el.target.elementId === id)) {
            els.delete(eid);
            removedCount++;
          } else if (isShape(el) && el.containerId === id) {
            const c = touch(el);
            delete c.containerId;
          }
        }
        break;
      }
      case 'add_edge': {
        // Endpoints are positioned after placement (step 3).
        const from = resolveId(op.edge.from);
        const to = resolveId(op.edge.to);
        if (!els.has(from) || !els.has(to)) break;
        const c = createConnector(
          { elementId: from, side: 'auto', x: 0, y: 0 },
          { elementId: to, side: 'auto', x: 0, y: 0 },
          {
            routing: op.edge.routing ?? 'orthogonal',
            startArrow: op.edge.startArrow ?? (type === 'erd' ? 'erOnlyOne' : 'none'),
            endArrow: op.edge.endArrow ?? (type === 'erd' ? 'erZeroMany' : type === 'network' ? 'none' : type === 'class' ? 'arrow' : 'triangle'),
            text: op.edge.label ?? '',
            style: { ...DEFAULT_CONNECTOR_STYLE, strokeStyle: op.edge.dashed ? 'dashed' : 'solid' },
          },
        );
        els.set(c.id, c);
        newConnectors.push(c);
        break;
      }
      case 'update_edge': {
        const cur = els.get(op.id);
        if (!isConnector(cur)) break;
        const c = touch(cur);
        updated++;
        if (op.label !== undefined) c.text = op.label;
        if (op.startArrow) c.startArrow = op.startArrow;
        if (op.endArrow) c.endArrow = op.endArrow;
        if (op.routing) c.routing = op.routing;
        if (op.dashed !== undefined) c.style.strokeStyle = op.dashed ? 'dashed' : 'solid';
        break;
      }
      case 'remove_edge': {
        if (els.delete(op.id)) removedCount++;
        break;
      }
    }
  }

  // 3. Place new shapes (containers last so they can wrap new children).
  const placed = new Set<string>();
  const ancestors = (id: string | undefined): Set<string> => {
    const out = new Set<string>();
    for (let p = id; p && !out.has(p); p = shape(p)?.containerId) out.add(p);
    return out;
  };
  const obstacles = (self: ShapeElement): Rect[] => {
    const anc = ancestors(self.containerId);
    const out: Rect[] = [];
    for (const el of els.values()) {
      if (!isShape(el) || el.id === self.id || anc.has(el.id)) continue;
      if (pendingPlacement.some((p) => p.shape.id === el.id) && !placed.has(el.id)) continue;
      out.push(el);
    }
    return out;
  };
  const free = (r: Rect, self: ShapeElement) => !obstacles(self).some((o) => overlaps(r, o));
  const neighbours = (id: string): ShapeElement[] => {
    const out: ShapeElement[] = [];
    for (const c of newConnectors) {
      const other = c.source.elementId === id ? c.target.elementId : c.target.elementId === id ? c.source.elementId : undefined;
      const s = other ? shape(other) : undefined;
      if (s && (!pendingPlacement.some((p) => p.shape.id === s.id) || placed.has(s.id))) out.push(s);
    }
    return out;
  };
  const allShapes = () => [...els.values()].filter(isShape).filter((s) => !pendingPlacement.some((p) => p.shape.id === s.id) || placed.has(s.id));

  const growToFit = (containerId: string | undefined, r: Rect) => {
    for (let id = containerId, guard = 0; id && guard < 50; guard++) {
      const cur = shape(id);
      if (!cur) break;
      const pad = 24;
      const top = 58;
      const x = Math.min(cur.x, r.x - pad);
      const y = Math.min(cur.y, r.y - top);
      const x2 = Math.max(cur.x + cur.w, r.x + r.w + pad);
      const y2 = Math.max(cur.y + cur.h, r.y + r.h + pad);
      if (x === cur.x && y === cur.y && x2 === cur.x + cur.w && y2 === cur.y + cur.h) break;
      const c = touch(cur);
      Object.assign(c, { x, y, w: x2 - x, h: y2 - y });
      r = c;
      id = c.containerId;
    }
  };

  const ordered = [...pendingPlacement].sort((a, b) => Number(CONTAINER_KINDS.has(a.shape.kind)) - Number(CONTAINER_KINDS.has(b.shape.kind)));
  for (const { shape: s } of ordered) {
    const isCont = CONTAINER_KINDS.has(s.kind);
    const kids = isCont ? [...els.values()].filter((e): e is ShapeElement => isShape(e) && e.containerId === s.id && placed.has(e.id)) : [];
    if (kids.length) {
      // Wrap already-placed children.
      const x = Math.min(...kids.map((k) => k.x)) - 24;
      const y = Math.min(...kids.map((k) => k.y)) - 58;
      const x2 = Math.max(...kids.map((k) => k.x + k.w)) + 24;
      const y2 = Math.max(...kids.map((k) => k.y + k.h)) + 24;
      Object.assign(s, { x, y, w: Math.max(s.w, x2 - x), h: y2 - y });
    } else {
      const nb = neighbours(s.id);
      const anchor = nb.find((n) => n.containerId === s.containerId) ?? nb[0];
      const parent = s.containerId ? shape(s.containerId) : undefined;
      const candidates: Array<[number, number, number, number]> = []; // x, y, dx, dy (slide direction)
      if (anchor) {
        candidates.push([anchor.x + anchor.w + 80, anchor.y + (anchor.h - s.h) / 2, 0, 1]);
        candidates.push([anchor.x + (anchor.w - s.w) / 2, anchor.y + anchor.h + 70, 1, 0]);
        candidates.push([anchor.x - s.w - 80, anchor.y + (anchor.h - s.h) / 2, 0, 1]);
      } else if (parent) {
        const inside = allShapes().filter((e) => e.containerId === parent.id && e.id !== s.id);
        const bottom = inside.length ? Math.max(...inside.map((e) => e.y + e.h)) + 40 : parent.y + 58;
        candidates.push([parent.x + 24, bottom, 1, 0]);
      } else {
        const all = allShapes().filter((e) => e.id !== s.id);
        const right = all.length ? Math.max(...all.map((e) => e.x + e.w)) + 100 : 0;
        const top = all.length ? Math.min(...all.map((e) => e.y)) : 0;
        candidates.push([right, top, 0, 1]);
      }
      let spot: Rect | undefined;
      for (const [cx, cy, dx, dy] of candidates) {
        for (let k = 0; k < 30 && !spot; k++) {
          const r = { x: Math.round(cx + dx * k * 40), y: Math.round(cy + dy * k * 40), w: s.w, h: s.h };
          if (free(r, s)) spot = r;
        }
        if (spot) break;
      }
      spot ??= { x: Math.round(candidates[0][0]), y: Math.round(candidates[0][1]), w: s.w, h: s.h };
      s.x = spot.x;
      s.y = spot.y;
    }
    placed.add(s.id);
    if (s.containerId) growToFit(s.containerId, s);
  }

  // 4. Refresh cached endpoint positions of new connectors.
  for (const c of newConnectors) {
    const a = shape(c.source.elementId!);
    const b = shape(c.target.elementId!);
    if (!a || !b) continue;
    const pa = facingPoint(a, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const pb = facingPoint(b, { x: a.x + a.w / 2, y: a.y + a.h / 2 });
    Object.assign(c.source, { x: Math.round(pa.x), y: Math.round(pa.y) });
    Object.assign(c.target, { x: Math.round(pb.x), y: Math.round(pb.y) });
  }

  const newIds = [...newContainers, ...newShapes, ...newConnectors].map((e) => e.id).filter((id) => els.has(id));
  const finalOrder = [
    ...newContainers.map((e) => e.id),
    ...order,
    ...newShapes.map((e) => e.id),
    ...newConnectors.map((e) => e.id),
  ].filter((id, i, arr) => els.has(id) && arr.indexOf(id) === i);
  return {
    elements: finalOrder.map((id) => els.get(id)!),
    added: newIds.length,
    updated,
    removed: removedCount,
    newIds,
  };
}
