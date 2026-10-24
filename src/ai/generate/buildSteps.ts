/**
 * Build-sequence steps (element `reveal`, docs/specs/animation.md §3) that
 * follow the flow of a laid-out diagram: shapes are ordered along the main
 * direction, so a layout layer (shapes at about the same position) appears
 * together. Explicit steps win, and containers appear with their first child.
 */
import type { Rect } from '@/model/types';
import type { Direction } from './spec';

export interface StepItem {
  id: string;
  parent?: string;
  rect: Rect;
  /** Explicit step from the model. */
  step?: number;
}

/** Shapes whose centers are this close along the flow share a step. */
const SAME_LAYER = 24;

export function buildSteps(items: StepItem[], direction: Direction, auto: boolean): Map<string, number> {
  const children = new Map<string, StepItem[]>();
  for (const it of items) {
    if (!it.parent) continue;
    if (!children.has(it.parent)) children.set(it.parent, []);
    children.get(it.parent)!.push(it);
  }
  const steps = new Map<string, number>();

  if (auto) {
    const horizontal = direction === 'LR' || direction === 'RL';
    const sign = direction === 'RL' || direction === 'BT' ? -1 : 1;
    const along = (r: Rect) => sign * (horizontal ? r.x + r.w / 2 : r.y + r.h / 2);
    const leaves = items.filter((it) => !children.has(it.id)).sort((a, b) => along(a.rect) - along(b.rect));
    let step = 0;
    let layerStart = -Infinity;
    for (const it of leaves) {
      const k = along(it.rect);
      if (k - layerStart > SAME_LAYER) {
        step++;
        layerStart = k;
      }
      steps.set(it.id, step);
    }
  }
  for (const it of items) if (it.step) steps.set(it.id, it.step);

  // Containers appear with their first child, unless they have their own step.
  const first = (id: string, guard = 0): number | undefined => {
    if (guard > 100) return undefined;
    let min: number | undefined;
    for (const kid of children.get(id) ?? []) {
      const s = kid.step ?? (children.has(kid.id) ? first(kid.id, guard + 1) : steps.get(kid.id));
      if (s !== undefined && (min === undefined || s < min)) min = s;
    }
    return min;
  };
  for (const it of items) {
    if (!children.has(it.id) || it.step) continue;
    const s = first(it.id);
    if (s !== undefined) steps.set(it.id, s);
  }
  return steps;
}

/** The main direction of an existing diagram, from where its connectors go. */
export function flowDirection(edges: Array<{ from: Rect; to: Rect }>): Direction {
  let dx = 0;
  let dy = 0;
  for (const { from, to } of edges) {
    dx += to.x + to.w / 2 - (from.x + from.w / 2);
    dy += to.y + to.h / 2 - (from.y + from.h / 2);
  }
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'LR' : 'RL';
  return dy >= 0 ? 'TB' : 'BT';
}
