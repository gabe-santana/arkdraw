/**
 * Custom link actions, compatible with draw.io's `data:action/json,{…}` links.
 *
 *   data:action/json,{"actions":[{"toggle":{"cells":["a","b"]}},{"highlight":{"tags":["db"]}}]}
 *
 * Supported actions: `show`, `hide`, `toggle` (visibility of cells — element
 * or layer ids — and/or tagged elements), `select`, `highlight` (optional
 * `color`, `duration` ms), `scroll` (centre the targets) and `open` (a URL or
 * `data:page/id,<id>` / `page:<id>`). Targets are `{ cells, tags, excludeCells }`;
 * `"cells": ["*"]` means every element.
 *
 * The core here is pure (parse, resolve, apply visibility); the editor and the
 * viewer each provide an `ActionHost` for the interactive parts.
 */
import type { DiagramElement, Doc } from '@/model/types';
import { isShape } from '@/model/types';
import { containedShapes, layersOf } from '@/store/editor';

export const ACTION_PREFIX = 'data:action/json,';

export interface ActionTargets {
  cells?: string[];
  tags?: string[];
  excludeCells?: string[];
}

export type LinkAction =
  | { kind: 'show' | 'hide' | 'toggle' | 'select' | 'scroll'; targets: ActionTargets }
  | { kind: 'highlight'; targets: ActionTargets; color?: string; duration?: number }
  | { kind: 'open'; url: string };

const KINDS = ['show', 'hide', 'toggle', 'select', 'highlight', 'scroll', 'open'] as const;

export const isActionLink = (link: string | undefined): boolean => !!link && link.trim().startsWith(ACTION_PREFIX);

const strings = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);

/** Parses a `data:action/json,…` link (or bare JSON). Returns null if it isn't a valid action link. */
export function parseActionLink(link: string): LinkAction[] | null {
  let body = link.trim();
  if (body.startsWith(ACTION_PREFIX)) body = body.slice(ACTION_PREFIX.length);
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    try {
      data = JSON.parse(decodeURIComponent(body));
    } catch {
      return null;
    }
  }
  const list = (data as { actions?: unknown })?.actions;
  if (!Array.isArray(list)) return null;
  const out: LinkAction[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    for (const kind of KINDS) {
      if (!(kind in raw)) continue;
      const v = (raw as Record<string, unknown>)[kind];
      if (kind === 'open') {
        const url = typeof v === 'string' ? v : typeof (v as { url?: unknown })?.url === 'string' ? (v as { url: string }).url : null;
        if (url) out.push({ kind, url });
        continue;
      }
      const o = (v ?? {}) as Record<string, unknown>;
      const targets: ActionTargets = { cells: strings(o.cells), tags: strings(o.tags), excludeCells: strings(o.excludeCells) };
      if (kind === 'highlight') {
        out.push({
          kind,
          targets,
          ...(typeof o.color === 'string' ? { color: o.color } : {}),
          ...(typeof o.duration === 'number' ? { duration: o.duration } : {}),
        });
      } else out.push({ kind, targets });
    }
  }
  return out;
}

/** Serializes actions back into a draw.io-compatible link. */
export function buildActionLink(actions: LinkAction[]): string {
  const json = actions.map((a) => {
    if (a.kind === 'open') return { open: a.url };
    const t: Record<string, unknown> = {};
    if (a.targets.cells?.length) t.cells = a.targets.cells;
    if (a.targets.tags?.length) t.tags = a.targets.tags;
    if (a.targets.excludeCells?.length) t.excludeCells = a.targets.excludeCells;
    if (a.kind === 'highlight') {
      if (a.color) t.color = a.color;
      if (a.duration) t.duration = a.duration;
    }
    return { [a.kind]: t };
  });
  return ACTION_PREFIX + JSON.stringify({ actions: json });
}

/** Element and layer ids a target spec refers to. */
export function resolveTargets(doc: Doc, t: ActionTargets): { elements: string[]; layers: string[] } {
  const layerIds = new Set((doc.layers ?? layersOf(doc)).map((l) => l.id));
  const exclude = new Set(t.excludeCells ?? []);
  const elements = new Set<string>();
  const layers = new Set<string>();
  for (const id of t.cells ?? []) {
    if (id === '*') doc.order.forEach((oid) => elements.add(oid));
    else if (doc.elements[id]) elements.add(id);
    else if (layerIds.has(id)) layers.add(id);
  }
  if (t.tags?.length) {
    const want = new Set(t.tags);
    for (const id of doc.order) if (doc.elements[id]?.tags?.some((tag) => want.has(tag))) elements.add(id);
  }
  for (const id of exclude) {
    elements.delete(id);
    layers.delete(id);
  }
  return { elements: doc.order.filter((id) => elements.has(id)), layers: [...layers] };
}

/**
 * Shows, hides or toggles targets. Like draw.io, `toggle` flips them all based
 * on the first target's state, and hiding a shape also hides its contents and
 * the connectors attached to it. Pure: returns a new doc (or the same one).
 */
export function applyVisibility(doc: Doc, targets: { elements: string[]; layers: string[] }, mode: 'show' | 'hide' | 'toggle'): Doc {
  if (!targets.elements.length && !targets.layers.length) return doc;
  const layers = layersOf(doc);
  let show: boolean;
  if (mode !== 'toggle') show = mode === 'show';
  else if (targets.elements.length) show = !!doc.elements[targets.elements[0]]?.hidden;
  else show = !layers.find((l) => l.id === targets.layers[0])?.visible;

  const ids = new Set(targets.elements);
  for (const id of containedShapes(doc, targets.elements.filter((id) => isShape(doc.elements[id])))) ids.add(id);
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (el?.type === 'connector' && ((el.source.elementId && ids.has(el.source.elementId)) || (el.target.elementId && ids.has(el.target.elementId)))) ids.add(id);
  }
  let elements = doc.elements;
  for (const id of ids) {
    const el = elements[id];
    if (!el || !!el.hidden === !show) continue;
    if (elements === doc.elements) elements = { ...doc.elements };
    const next = { ...el } as DiagramElement;
    if (show) delete next.hidden;
    else next.hidden = true;
    elements[id] = next;
  }
  let nextLayers = doc.layers;
  if (targets.layers.length) {
    const want = new Set(targets.layers);
    nextLayers = layers.map((l) => (want.has(l.id) && l.visible !== show ? { ...l, visible: show } : l));
  }
  if (elements === doc.elements && nextLayers === doc.layers) return doc;
  return { ...doc, elements, ...(nextLayers ? { layers: nextLayers } : {}) };
}

/** Clears every element-level `hidden` flag (Edit → Show hidden elements). */
export function revealAll(doc: Doc): Doc {
  const hidden = doc.order.filter((id) => doc.elements[id]?.hidden);
  if (!hidden.length) return doc;
  return applyVisibility(doc, { elements: hidden, layers: [] }, 'show');
}

/** Interactive side of the actions, implemented by the editor and the viewer. */
export interface ActionHost {
  getDoc: () => Doc;
  /** Applies a visibility change (the editor records it as one undo step). */
  setDoc: (doc: Doc) => void;
  select: (ids: string[]) => void;
  highlight: (ids: string[], color: string, duration: number) => void;
  scrollTo: (ids: string[]) => void;
  /** Opens a plain link (URL or `page:<id>`). */
  open: (link: string) => void;
}

/** Normalizes draw.io page links to ours. */
export const normalizeLink = (url: string) => (url.startsWith('data:page/id,') ? `page:${url.slice('data:page/id,'.length)}` : url);

/** Runs every action of a link in order. Returns false when the link isn't a valid action link. */
export function runActionLink(link: string, host: ActionHost): boolean {
  const actions = parseActionLink(link);
  if (!actions) return false;
  let doc = host.getDoc();
  const flush = () => {
    if (doc !== host.getDoc()) host.setDoc(doc);
  };
  for (const a of actions) {
    if (a.kind === 'open') {
      flush();
      host.open(normalizeLink(a.url));
      continue;
    }
    const targets = resolveTargets(doc, a.targets);
    if (a.kind === 'show' || a.kind === 'hide' || a.kind === 'toggle') {
      doc = applyVisibility(doc, targets, a.kind);
      continue;
    }
    flush();
    if (a.kind === 'select') host.select(targets.elements);
    else if (a.kind === 'scroll') host.scrollTo(targets.elements);
    else if (a.kind === 'highlight') host.highlight(targets.elements, a.color ?? '#f59e0b', a.duration ?? 1500);
  }
  flush();
  return true;
}
