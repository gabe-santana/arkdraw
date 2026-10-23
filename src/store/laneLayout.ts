/**
 * Swimlane pools that grow with their lanes (draw.io stackLayout on pools).
 *
 * Lanes inside a pool are stacked edge to edge below / beside the pool's
 * header band and stretched across its body; the pool's length is the sum of
 * its lanes. So adding a lane grows the pool, resizing a lane resizes the
 * pool, widening the pool widens every lane, and resizing the pool along the
 * stack resizes its last lane. Shapes inside a lane move with it.
 *
 * `layoutPools` is pure; `installLaneLayout` applies it after each committed
 * edit (folded into that same undo step).
 */
import type { DiagramElement, Doc, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { paramsOf, pn } from '@/shapes/params';
import { containedShapes, useEditor } from './editor';

/** Pool kind → stacking axis: `y` = lanes stacked top to bottom (header on the left). */
const POOLS: Record<string, 'x' | 'y'> = { 'lane.poolH': 'y', 'lane.poolV': 'x', 'bpmn.pool': 'y', 'bpmn.poolV': 'x' };
const LANES = new Set(['lane.laneH', 'lane.laneV', 'bpmn.lane']);
const MIN_LANE = 20;
const EPS = 0.01;

export const isPool = (el: DiagramElement | undefined): el is ShapeElement => isShape(el) && el.kind in POOLS;
export const isLane = (el: DiagramElement | undefined): el is ShapeElement => isShape(el) && LANES.has(el.kind);

/** Header band size of a pool. */
function headerOf(pool: ShapeElement): number {
  const def = getShapeDef(pool.kind);
  const p = paramsOf(def, pool);
  const len = POOLS[pool.kind] === 'y' ? pool.w : pool.h;
  return p.startSize !== undefined ? Math.max(0, Math.min(len, pn(p, 'startSize'))) : Math.min(32, len * 0.35);
}

const near = (a: number, b: number) => Math.abs(a - b) < EPS;

/**
 * Element patches that lay out every pool's lanes, or null when nothing
 * changes. `prev` (the document before the edit) tells which side changed:
 * a pool resized along the stack resizes its last lane, otherwise the pool
 * follows its lanes.
 */
export function layoutPools(doc: Doc, prev?: Doc | null): Record<string, Partial<ShapeElement>> | null {
  const patches: Record<string, Partial<ShapeElement>> = {};
  const lanesOf = new Map<string, ShapeElement[]>();
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (isLane(el) && el.containerId && isPool(doc.elements[el.containerId])) {
      const list = lanesOf.get(el.containerId) ?? [];
      list.push(el);
      lanesOf.set(el.containerId, list);
    }
  }
  for (const [poolId, lanes] of lanesOf) {
    const pool = doc.elements[poolId] as ShapeElement;
    if (pool.collapsed) continue;
    const axis = POOLS[pool.kind];
    const before = prev?.elements[poolId];
    const head = headerOf(pool);
    // Stack order follows the lanes' current positions (dragging a lane past another reorders).
    const sorted = [...lanes].sort((a, b) => (axis === 'y' ? a.y - b.y : a.x - b.x) || doc.order.indexOf(a.id) - doc.order.indexOf(b.id));
    const len = (l: ShapeElement) => Math.max(MIN_LANE, axis === 'y' ? l.h : l.w);
    const sizes = sorted.map(len);
    let poolW = pool.w;
    let poolH = pool.h;

    // A lane stretched across the stack (wider lane in a horizontal pool) widens the pool.
    const prevLanes = sorted.map((l) => prev?.elements[l.id]);
    const crossChanged = sorted.find((l, i) => {
      const p = prevLanes[i];
      return isShape(p) && p.containerId === poolId && !(axis === 'y' ? near(p.w, l.w) : near(p.h, l.h));
    });
    const poolCrossChanged = isShape(before) && !(axis === 'y' ? near(before.w, pool.w) : near(before.h, pool.h));
    if (crossChanged && !poolCrossChanged) {
      if (axis === 'y') poolW = head + crossChanged.w;
      else poolH = head + crossChanged.h;
    }

    // The pool resized along the stack while its lanes kept their sizes: the last lane absorbs it.
    const total = sizes.reduce((a, b) => a + b, 0);
    const lanesChanged = sorted.some((_, i) => {
      const p = prevLanes[i];
      return !isShape(p) || p.containerId !== poolId || !near(len(p), sizes[i]);
    });
    const poolLen = axis === 'y' ? pool.h : pool.w;
    const poolLenChanged = isShape(before) && !near(axis === 'y' ? before.h : before.w, poolLen);
    if (poolLenChanged && !lanesChanged && sorted.length) {
      sizes[sizes.length - 1] = Math.max(MIN_LANE, sizes[sizes.length - 1] + poolLen - total);
    }
    const stack = sizes.reduce((a, b) => a + b, 0);
    if (axis === 'y') poolH = stack;
    else poolW = stack;

    if (!near(poolW, pool.w) || !near(poolH, pool.h)) patches[poolId] = { w: poolW, h: poolH };

    let cursor = axis === 'y' ? pool.y : pool.x;
    sorted.forEach((lane, i) => {
      const box =
        axis === 'y'
          ? { x: pool.x + head, y: cursor, w: Math.max(MIN_LANE, poolW - head), h: sizes[i] }
          : { x: cursor, y: pool.y + head, w: sizes[i], h: Math.max(MIN_LANE, poolH - head) };
      cursor += sizes[i];
      if (near(box.x, lane.x) && near(box.y, lane.y) && near(box.w, lane.w) && near(box.h, lane.h)) return;
      patches[lane.id] = box;
      // Content of the lane moves with it.
      const dx = box.x - lane.x;
      const dy = box.y - lane.y;
      if (near(dx, 0) && near(dy, 0)) return;
      for (const cid of containedShapes(doc, [lane.id])) {
        const c = doc.elements[cid];
        if (isShape(c)) patches[cid] = { ...patches[cid], x: c.x + dx, y: c.y + dy };
      }
    });
  }
  return Object.keys(patches).length ? patches : null;
}

/** Applies `layoutPools` patches to a document. */
export function withPoolLayout(doc: Doc, prev?: Doc | null): Doc {
  const patches = layoutPools(doc, prev);
  if (!patches) return doc;
  const elements = { ...doc.elements };
  for (const [id, p] of Object.entries(patches)) elements[id] = { ...(elements[id] as ShapeElement), ...p };
  return { ...doc, elements };
}

let installed = false;

/**
 * Re-lays out pools after every new history entry (edits, finished drags,
 * redo) — never during a gesture, on undo, or when loading / switching pages.
 * The result replaces the current document without a separate undo step.
 */
export function installLaneLayout() {
  if (installed) return;
  installed = true;
  useEditor.subscribe((s, prev) => {
    if (s.interactionBase || s.past === prev.past || !s.past.length) return;
    const before = s.past[s.past.length - 1];
    if (before !== (prev.interactionBase ?? prev.doc)) return;
    const next = withPoolLayout(s.doc, before);
    if (next !== s.doc) useEditor.setState({ doc: next });
  });
}
