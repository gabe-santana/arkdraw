import { describe, expect, it } from 'vitest';
import type { ConnectorElement, DiagramElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { canDragSegment, dragSegment, segmentAt, snapSegment } from '@/interaction/segmentDrag';

/** Two boxes side by side, B a bit lower than A: the default route is a Z (horizontal, vertical, horizontal). */
function zRoute() {
  const a = createShape('rect', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
  const b = createShape('rect', { x: 300, y: 20, w: 100, h: 60 }, {}, 'B');
  const conn = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { routing: 'orthogonal' });
  const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [conn.id]: conn };
  const points = connectorGeometryInDoc(conn, elements).points;
  return { a, b, conn, elements, points };
}

describe('segment dragging', () => {
  it('finds the axis-aligned segment under the pointer', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }];
    expect(segmentAt(pts, { x: 50, y: 3 }, 6)).toEqual({ index: 0, horizontal: true });
    expect(segmentAt(pts, { x: 97, y: 40 }, 6)).toEqual({ index: 1, horizontal: false });
    expect(segmentAt(pts, { x: 50, y: 30 }, 6)).toBeNull();
  });

  it('only drags orthogonal routes, and every segment of them', () => {
    const { conn, elements, points } = zRoute();
    expect(points.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < points.length - 1; i++) expect(canDragSegment(conn, points, i, elements)).toBe(true);
    expect(canDragSegment({ ...conn, routing: 'straight' }, points, 0, elements)).toBe(false);
  });

  it('keeps an attached end where it is: the dragged end segment detours by a stub', () => {
    const { conn, elements, points } = zRoute();
    const res = dragSegment(conn, points, 0, true, 50, elements)!;
    expect(res.at).toBe(50);
    expect(res.patch.source).toBeUndefined();
    const next = { ...conn, ...res.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    // Same start, a short stub along the original direction, then down to the dragged height.
    expect(route[0]).toEqual(points[0]);
    expect(route[1]).toEqual({ x: points[0].x + 20, y: points[0].y });
    expect(route.some((p) => p.y === 50)).toBe(true);
  });

  it('snaps a dragged segment to line up with the far end', () => {
    const { conn, elements, points } = zRoute();
    const snap = snapSegment(conn, points, 0, true, points[points.length - 1].y + 3, elements, 6);
    expect(snap.at).toBe(points[points.length - 1].y);
    expect(snap.guide).toMatchObject({ axis: 'y', at: snap.at });
  });

  it('turns a straight connector into a detour without moving either end', () => {
    const a = createShape('rect', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
    const b = createShape('rect', { x: 300, y: 0, w: 100, h: 60 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    const pts = connectorGeometryInDoc(conn, elements).points;
    expect(pts).toHaveLength(2);
    const res = dragSegment(conn, pts, 0, true, 120, elements)!;
    expect(res.patch.source).toBeUndefined();
    expect(res.patch.target).toBeUndefined();
    const next = { ...conn, ...res.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(route[0]).toEqual(pts[0]);
    expect(route[route.length - 1]).toEqual(pts[1]);
    expect(route.filter((p) => p.y === 120)).toHaveLength(2);
  });

  it('lets a free end follow its segment', () => {
    const conn = createConnector({ x: 0, y: 0 }, { x: 200, y: 0 }, { routing: 'orthogonal' });
    const res = dragSegment(conn, [{ x: 0, y: 0 }, { x: 200, y: 0 }], 0, true, 40, { [conn.id]: conn })!;
    expect(res.patch.source).toMatchObject({ x: 0, y: 40 });
    expect(res.patch.target).toMatchObject({ x: 200, y: 40 });
  });
});
