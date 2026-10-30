/**
 * A connector never runs through the shapes it connects: whatever the direction,
 * the rotation or the outline, it stops where it first reaches its end shape.
 */
import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { ConnectorElement, DiagramElement, ShapeElement, Vec } from '@/model/types';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { worldToFraction } from '@/lib/connectionPoints';
import { center, rotatePoint } from '@/lib/geometry';
import { getShapeDef } from '@/shapes/registry';

/** Strictly inside the shape's outline (by more than a pixel). */
function inside(s: ShapeElement, p: Vec): boolean {
  const c = center(s);
  const l = rotatePoint(p, c, -(s.rotation ?? 0));
  const u = (l.x - c.x) / (s.w / 2 - 1);
  const v = (l.y - c.y) / (s.h / 2 - 1);
  const kind = getShapeDef(s.kind).perimeter ?? 'rect';
  if (kind === 'ellipse') return u * u + v * v < 1;
  if (kind === 'diamond') return Math.abs(u) + Math.abs(v) < 1;
  return Math.abs(u) < 1 && Math.abs(v) < 1;
}

/** Every pixel of the route stays out of the shape. */
function crosses(route: Vec[], s: ShapeElement): boolean {
  for (let i = 0; i < route.length - 1; i++) {
    const [p, q] = [route[i], route[i + 1]];
    const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y)));
    for (let j = 0; j <= steps; j++) if (inside(s, { x: p.x + ((q.x - p.x) * j) / steps, y: p.y + ((q.y - p.y) * j) / steps })) return true;
  }
  return false;
}

const DIRECTIONS: Array<[string, Vec]> = [
  ['right', { x: 1, y: 0 }],
  ['left', { x: -1, y: 0 }],
  ['below', { x: 0, y: 1 }],
  ['above', { x: 0, y: -1 }],
];
const KINDS = ['rectangle', 'ellipse', 'diamond'];
const ROTATIONS = [0, 90, 180, 270, 33];
/** `orthogonal` alone routes around B to its far side; with a bend between the shapes (`via`) it must cut. */
const ROUTINGS = ['orthogonal', 'orthogonal via', 'straight'] as const;

describe('connectors stop at the first contact with their end shapes', () => {
  for (const [dirName, dir] of DIRECTIONS) {
    for (const kind of KINDS) {
      for (const rot of ROTATIONS) {
        for (const routing of ROUTINGS) {
          it(`${routing}, B ${dirName} of A, ${kind} at ${rot}°, attached on B's far side`, () => {
            const a = { ...createShape('rectangle', { x: -40, y: -30, w: 80, h: 60 }), id: 'a' };
            const bc = { x: dir.x * 400, y: dir.y * 300 };
            const b = { ...createShape(kind, { x: bc.x - 60, y: bc.y - 40, w: 120, h: 80 }), id: 'b', rotation: rot };
            expect(getShapeDef(b.kind).kind).toBe(kind);
            // A leaves towards B; B's end is pinned on the side facing away from A, so reaching it means crossing B.
            const from = { x: dir.x * 40, y: dir.y * 30 };
            const far = { x: bc.x + dir.x * 80, y: bc.y + dir.y * 60 };
            const farOnB = rotatePoint(far, bc, 0);
            const conn = {
              ...createConnector(
                { elementId: 'a', side: 'auto', fixed: worldToFraction(a, from), x: from.x, y: from.y },
                { elementId: 'b', side: 'auto', fixed: clampFraction(worldToFraction(b, farOnB)), x: far.x, y: far.y },
                { routing: routing === 'straight' ? 'straight' : 'orthogonal', waypoints: routing === 'orthogonal via' ? [{ x: dir.x * 200 + dir.y * 7, y: dir.y * 150 + dir.x * 7 }] : undefined },
              ),
              id: 'c',
            } as ConnectorElement;
            const elements: Record<string, DiagramElement> = { a, b, c: conn };
            const route = connectorGeometryInDoc(conn, elements).points;
            expect(crosses(route, b)).toBe(false);
            expect(crosses(route, a)).toBe(false);
            // Coming from A's side, it ends on B where it first reaches it: on the side facing A.
            if (routing !== 'orthogonal') {
              const end = route[route.length - 1];
              expect((end.x - bc.x) * -dir.x + (end.y - bc.y) * -dir.y).toBeGreaterThan(0);
            }
          });
        }
      }
    }
  }
});

/** A fraction pulled onto the shape's box (the far point may sit just outside a rotated shape). */
function clampFraction(f: Vec): Vec {
  const k = Math.max(Math.abs(f.x - 0.5), Math.abs(f.y - 0.5)) * 2;
  return k > 1 ? { x: 0.5 + (f.x - 0.5) / k, y: 0.5 + (f.y - 0.5) / k } : f;
}
