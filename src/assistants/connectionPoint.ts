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
import { dist, rotatedBounds } from '@/lib/geometry';

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
  if ((shape.rotation ?? 0) % 90 !== 0) return null;
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
  if (!other || (shape.rotation ?? 0) % 90 !== 0 || (getShapeDef(shape.kind).perimeter ?? 'rect') !== 'rect') return null;
  // The box on screen (a shape turned by a right angle is still one).
  const { x, y, w, h } = rotatedBounds(shape);
  const within = (v: number, lo: number, size: number) => v > lo + size * CORNER && v < lo + size * (1 - CORNER);
  let at: Vec | null = null;
  if (within(other.y, y, h) && other.x <= x) at = { x, y: other.y };
  else if (within(other.y, y, h) && other.x >= x + w) at = { x: x + w, y: other.y };
  else if (within(other.x, x, w) && other.y <= y) at = { x: other.x, y };
  else if (within(other.x, x, w) && other.y >= y + h) at = { x: other.x, y: y + h };
  // Stored in the shape's own frame (unflipped, unrotated).
  return at ? endpointAtFraction(shape, worldToFraction(shape, at)) : null;
}
