/**
 * Layout extras: Parallel Edges (spread connectors that share the same two
 * shapes) and Apply layout from JSON (a subset of draw.io's
 * Arrange → Layout → Apply format, e.g.
 * `[{"layout":"mxHierarchicalLayout","config":{"orientation":"west","intraCellSpacing":30}}]`).
 */
import type { ConnectorElement, Doc, ShapeElement } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { LAYOUTS, type LayoutOptions } from '@/layout';

/** Pairs of shapes joined by more than one connector, connector ids in z-order. */
export function parallelGroups(doc: Doc, ids?: string[]): string[][] {
  const scope = ids?.length ? new Set(ids) : null;
  const groups = new Map<string, string[]>();
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (!isConnector(el)) continue;
    const a = el.source.elementId;
    const b = el.target.elementId;
    if (!a || !b || a === b) continue;
    if (scope && !scope.has(id) && !(scope.has(a) && scope.has(b))) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const list = groups.get(key) ?? [];
    list.push(id);
    groups.set(key, list);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

const center = (s: ShapeElement) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });

/**
 * draw.io's mxParallelEdgeLayout: each connector of a parallel bundle gets a
 * waypoint offset sideways from the midpoint, `spacing` apart. Orthogonal
 * routes become straight so the bundle fans out cleanly.
 */
export function parallelEdgesPatches(doc: Doc, ids?: string[], spacing = 24): Record<string, Partial<ConnectorElement>> {
  const patches: Record<string, Partial<ConnectorElement>> = {};
  for (const group of parallelGroups(doc, ids)) {
    const first = doc.elements[group[0]] as ConnectorElement;
    const a = doc.elements[first.source.elementId!];
    const b = doc.elements[first.target.elementId!];
    if (!isShape(a) || !isShape(b)) continue;
    const ca = center(a);
    const cb = center(b);
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const len = Math.hypot(dx, dy) || 1;
    const n = { x: -dy / len, y: dx / len };
    const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
    group.forEach((id, i) => {
      const c = doc.elements[id] as ConnectorElement;
      const off = (i - (group.length - 1) / 2) * spacing;
      const routing = c.routing === 'curved' ? 'curved' : 'straight';
      patches[id] = Math.abs(off) < 0.5 ? { waypoints: undefined, routing } : { waypoints: [{ x: Math.round(mid.x + n.x * off), y: Math.round(mid.y + n.y * off) }], routing };
    });
  }
  return patches;
}

// ---------------------------------------------------------------------------
// Layout JSON
// ---------------------------------------------------------------------------

export interface LayoutStep {
  /** OpenDraw layout id, or `parallel-edges`. */
  id: string;
  options: LayoutOptions;
  spacing?: number;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Parses draw.io layout JSON into steps. Throws with a readable message on bad input. */
export function parseLayoutJson(text: string): LayoutStep[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const list = Array.isArray(data) ? data : [data];
  const known = new Set(LAYOUTS.map((l) => l.id));
  return list.map((raw, i) => {
    const o = (raw ?? {}) as { layout?: unknown; config?: Record<string, unknown> };
    const name = typeof o.layout === 'string' ? o.layout : '';
    const cfg = o.config ?? {};
    const options: LayoutOptions = {
      nodeSpacing: num(cfg.intraCellSpacing) ?? num(cfg.nodeDistance) ?? num(cfg.spacing) ?? num(cfg.levelDistance) ?? 40,
      levelSpacing: num(cfg.interRankCellSpacing) ?? num(cfg.levelDistance) ?? num(cfg.radius) ?? num(cfg.forceConstant) ?? 70,
    };
    const orientation = String(cfg.orientation ?? '').toLowerCase();
    const horizontal = orientation === 'west' || orientation === 'east' || cfg.horizontal === true;
    const map: Record<string, string> = {
      mxHierarchicalLayout: horizontal ? 'flow-horizontal' : 'flow-vertical',
      mxCompactTreeLayout: cfg.horizontal === false ? 'tree-vertical' : 'tree-compact',
      mxRadialTreeLayout: 'tree-radial',
      mxFastOrganicLayout: 'organic',
      mxOrganicLayout: 'organic',
      mxCircleLayout: 'circle',
      mxOrgChartLayout: 'org-chart',
      mxStackLayout: 'grid',
    };
    if (name === 'mxParallelEdgeLayout') return { id: 'parallel-edges', options, spacing: num(cfg.spacing) ?? 24 };
    const id = map[name] ?? (known.has(name) ? name : null);
    if (!id || (id !== 'parallel-edges' && !known.has(id))) throw new Error(`Step ${i + 1}: unknown layout "${name || '(missing)'}".`);
    return { id, options };
  });
}

/** Runs steps against a doc, returning the combined patches (each step sees the previous one's result). */
export function runLayoutSteps(doc: Doc, ids: string[], steps: LayoutStep[]): { doc: Doc; changed: string[] } {
  let cur = doc;
  const changed = new Set<string>();
  for (const step of steps) {
    const patches: Record<string, object> =
      step.id === 'parallel-edges'
        ? parallelEdgesPatches(cur, ids, step.spacing)
        : (LAYOUTS.find((l) => l.id === step.id)?.run(cur, ids.filter((id) => isShape(cur.elements[id])), step.options) ?? {});
    if (!Object.keys(patches).length) continue;
    const elements = { ...cur.elements };
    for (const [id, p] of Object.entries(patches)) {
      if (!elements[id]) continue;
      elements[id] = { ...elements[id], ...p } as typeof elements[string];
      changed.add(id);
    }
    cur = { ...cur, elements };
  }
  return { doc: cur, changed: [...changed] };
}

export const LAYOUT_JSON_EXAMPLE = `[
  {
    "layout": "mxHierarchicalLayout",
    "config": { "orientation": "west", "intraCellSpacing": 30, "interRankCellSpacing": 100 }
  },
  { "layout": "mxParallelEdgeLayout", "config": { "spacing": 20 } }
]`;
