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

  it('slides an end segment along the shape side as a fixed connection point', () => {
    const { a, conn, elements, points } = zRoute();
    const res = dragSegment(conn, points, 0, true, 50, elements)!;
    expect(res.at).toBe(50);
    expect(res.patch.source?.fixed).toEqual({ x: 1, y: 50 / a.h });
    // Beyond the shape the end stops at its edge.
    expect(dragSegment(conn, points, 0, true, 500, elements)!.at).toBe(a.y + a.h);
  });

  it('pulls a Z route into a straight line when both ends overlap', () => {
    const { conn, elements, points } = zRoute();
    // Snapping the first segment to the far end's height removes both bends.
    const snap = snapSegment(conn, points, 0, true, points[points.length - 1].y + 3, elements, 6);
    expect(snap.at).toBe(points[points.length - 1].y);
    expect(snap.guide).toMatchObject({ axis: 'y', at: snap.at });
    const res = dragSegment(conn, points, 0, true, snap.at, elements)!;
    const next = { ...conn, ...res.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(new Set(route.map((p) => p.y)).size).toBe(1);
  });

  it('refuses a straight segment between shapes that do not overlap', () => {
    const a = createShape('rect', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
    const b = createShape('rect', { x: 300, y: 0, w: 100, h: 60 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    const pts = connectorGeometryInDoc(conn, elements).points;
    expect(pts).toHaveLength(2);
    expect(dragSegment(conn, pts, 0, true, 45, elements)!.at).toBe(45);
    const far = { ...b, y: 200 };
    expect(dragSegment(conn, pts, 0, true, 45, { ...elements, [b.id]: far })).toBeNull();
  });
});
