/**
 * Micro-assistant: a connection point made to measure. When a connector end
 * is dropped on a shape and none of its connection points is near, a point is
 * created for it: where the connector runs straight, if the other end faces a
 * side of the shape, or else right where it was dropped on the outline. The
 * point keeps its place on the shape as it moves and resizes.
 */
import type { Endpoint, ShapeElement, Vec } from '@/model/types';
import { endpointAtFraction, outlineFraction, worldToFraction, fractionToWorld } from '@/lib/connectionPoints';
import { getShapeDef } from '@/shapes/registry';
import { dist } from '@/lib/geometry';

/** Screen px from the outline within which a drop makes a point right there. */
export const OUTLINE_REACH = 14;
/** Screen px: an existing point this close to the straight position gives way to it (no small jog). */
export const STRAIGHT_PREFERENCE = 24;
/** Keep made-to-measure points off the very corners. */
const CORNER = 0.03;

/**
 * The endpoint for a drop at `p` on `shape`, with the connector's other end at
 * `other`, or null to leave the end floating (the connector then picks a side).
 */
export function connectionPointFor(shape: ShapeElement, p: Vec, other: Vec | undefined, z: number): Endpoint | null {
  if (shape.rotation) return null;
  // The other end faces a side: put the point level with it, so the connector runs straight.
  const straight = straightPoint(shape, other);
  if (straight) return straight;
  // Dropped on the outline: a point right there.
  const f = outlineFraction(shape, p);
  if (dist(fractionToWorld(shape, f), p) * z <= OUTLINE_REACH) return endpointAtFraction(shape, f);
  return null;
}

/**
 * Where on `shape` a connector from `other` runs straight: level with it on the
 * side it faces (rectangular outlines only), or null when it faces a corner.
 */
export function straightPoint(shape: ShapeElement, other: Vec | undefined): Endpoint | null {
  if (!other || shape.rotation || (getShapeDef(shape.kind).perimeter ?? 'rect') !== 'rect') return null;
  const { x, y, w, h } = shape;
  const within = (v: number, lo: number, size: number) => v > lo + size * CORNER && v < lo + size * (1 - CORNER);
  let f: Vec | null = null;
  if (within(other.y, y, h) && other.x <= x) f = { x: 0, y: (other.y - y) / h };
  else if (within(other.y, y, h) && other.x >= x + w) f = { x: 1, y: (other.y - y) / h };
  else if (within(other.x, x, w) && other.y <= y) f = { x: (other.x - x) / w, y: 0 };
  else if (within(other.x, x, w) && other.y >= y + h) f = { x: (other.x - x) / w, y: 1 };
  return f ? endpointAtFraction(shape, unflip(shape, f)) : null;
}

/** Fractions are stored in the shape's unflipped frame. */
function unflip(shape: ShapeElement, f: Vec): Vec {
  return worldToFraction(shape, { x: shape.x + f.x * shape.w, y: shape.y + f.y * shape.h });
}
