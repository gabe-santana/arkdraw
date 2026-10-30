import { describe, expect, it } from 'vitest';
import type { ConnectorElement, DiagramElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { canDragSegment, dragSegment, segmentAt, snapSegment, uncrossConnector } from '@/interaction/segmentDrag';

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

  it('slides an attached end along its edge with the end segment, which stays straight', () => {
    const { a, conn, elements, points } = zRoute();
    const res = dragSegment(conn, points, 0, true, 40, elements)!;
    expect(res.at).toBe(40);
    const next = { ...conn, ...res.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    // Still on A's right edge, now level with the dragged segment: no stub, no extra bend.
    expect(route[0].x).toBe(a.x + a.w);
    expect(route[0].y).toBeCloseTo(40, 1);
    expect(route[1].y).toBeCloseTo(route[0].y, 1);
    expect(route).toHaveLength(points.length);
  });

  it('past the shape, the end segment turns into the side facing it, gradually (nothing jumps)', () => {
    const { a, conn, elements, points } = zRoute();
    const routeAt = (c: number) => {
      const next = { ...conn, ...dragSegment(conn, points, 0, true, c, elements)!.patch } as ConnectorElement;
      return connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    };
    // Far below A: leaves A's bottom (at most its middle), goes down, then on as before.
    const far = routeAt(150);
    expect(far[0]).toEqual({ x: a.x + a.w / 2, y: a.y + a.h });
    expect(far[1]).toEqual({ x: a.x + a.w / 2, y: 150 });
    // Just past the corner, the end has moved only as far as the segment did.
    const near = routeAt(a.y + a.h + 4);
    expect(near[0].x).toBeCloseTo(a.x + a.w - 4, 1);
    expect(near[0].y).toBe(a.y + a.h);
    // And never through A.
    for (const r of [far, near]) expect(r.every((p) => !(p.x > a.x + 1 && p.x < a.x + a.w - 1 && p.y > a.y + 1 && p.y < a.y + a.h - 1))).toBe(true);
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
    expect(res.patch.source).toEqual(conn.source);
    expect(res.patch.target).toEqual(conn.target);
    const next = { ...conn, ...res.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(route[0]).toEqual(pts[0]);
    expect(route[route.length - 1]).toEqual(pts[1]);
    expect(route.filter((p) => p.y === 120)).toHaveLength(2);
  });

  it('enters the shape from below when the segment beside its end moves under it (an L)', () => {
    const a = createShape('rect', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
    const b = createShape('rect', { x: 300, y: 0, w: 100, h: 60 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'left', x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    // First a detour under both shapes: A → down → across at y 150 → up → B.
    const detour = dragSegment(conn, connectorGeometryInDoc(conn, elements).points, 0, true, 150, elements)!;
    const c1 = { ...conn, ...detour.patch } as ConnectorElement;
    const route = connectorGeometryInDoc(c1, { ...elements, [conn.id]: c1 }).points;
    // The vertical segment rising into B's left side, dragged under B (x 330).
    const up = route.length - 3;
    const res = dragSegment(c1, route, up, false, 330, elements)!;
    expect(res.patch.target).toMatchObject({ elementId: b.id, fixed: { x: 0.3, y: 1 } });
    const c2 = { ...c1, ...res.patch } as ConnectorElement;
    const l = connectorGeometryInDoc(c2, { ...elements, [conn.id]: c2 }).points;
    expect(l[l.length - 1]).toEqual({ x: 330, y: 60 });
    expect(l[l.length - 2]).toEqual({ x: 330, y: 150 });
    // Back out from under B, the end returns to B's left side.
    expect(dragSegment(c1, route, up, false, 280, elements)!.patch.target).toEqual(c1.target);
  });

  it('enters the facing side when a middle segment is dragged level with the shape', () => {
    // The connector reaches B's right side by a hook around it; its lowest segment is dragged up level with B.
    const a = createShape('rect', { x: 0, y: 20, w: 100, h: 60 }, {}, 'A');
    const b = createShape('rect', { x: 300, y: 0, w: 100, h: 60 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'right', x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    const hook = { ...conn, waypoints: [{ x: 200, y: 50 }, { x: 200, y: 150 }, { x: 440, y: 150 }, { x: 440, y: 30 }] } as ConnectorElement;
    const route = connectorGeometryInDoc(hook, { ...elements, [conn.id]: hook }).points;
    const low = route.findIndex((p, i) => i < route.length - 1 && p.y === 150 && route[i + 1].y === 150);
    const res = dragSegment(hook, route, low, true, 20, elements)!;
    // Now it comes from the left at y 20: it enters B's left side there, the hook is gone.
    expect(res.patch.target).toMatchObject({ elementId: b.id, fixed: { x: 0, y: 0.3333 } });
    const next = { ...hook, ...res.patch } as ConnectorElement;
    const pts = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(pts[pts.length - 1].x).toBe(300);
    expect(pts[pts.length - 1].y).toBeCloseTo(20, 1);
    // A straight run in from the left: no point past B's left side, no tiny step before it.
    expect(pts.every((p) => p.x <= 300)).toBe(true);
    expect(pts[pts.length - 2].y).toBe(pts[pts.length - 1].y);
  });

  it('moves an end to the facing side when the segment before it is dragged past the shape', () => {
    // A leaves from its bottom, runs under B and climbs into B's right side; the climb is dragged left of B.
    const a = createShape('rect', { x: 0, y: 0, w: 80, h: 140 }, {}, 'A');
    const b = createShape('rect', { x: 400, y: 20, w: 140, h: 80 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, side: 'bottom', x: 0, y: 0 }, { elementId: b.id, side: 'right', x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    const hook = { ...conn, waypoints: [{ x: 40, y: 240 }, { x: 600, y: 240 }, { x: 600, y: 60 }] } as ConnectorElement;
    const route = connectorGeometryInDoc(hook, { ...elements, [conn.id]: hook }).points;
    const climb = route.findIndex((p, i) => i < route.length - 1 && p.x === 600 && route[i + 1].x === 600);
    const res = dragSegment(hook, route, climb, false, 300, elements)!;
    expect(res.patch.target).toMatchObject({ elementId: b.id, side: 'left' });
    const next = { ...hook, ...res.patch } as ConnectorElement;
    const pts = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(pts[pts.length - 1]).toEqual({ x: 400, y: 60 });
    // Nothing crosses B any more.
    expect(pts.every((p) => p.x <= 400)).toBe(true);
    // Dragged back to the right of B, the end returns to its right side.
    expect(dragSegment(hook, route, climb, false, 600, elements)!.patch.target).toEqual(hook.target);
  });

  it('never leaves the last stretch running through its end shape, however many bends', () => {
    // The user's route: out of A's right side, down, right, a short climb, back left, up, then right through B.
    const a = createShape('rect', { x: 0, y: 0, w: 80, h: 140 }, {}, 'A');
    const b = createShape('rect', { x: 560, y: 40, w: 140, h: 80 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'right', x: 0, y: 0 }, { routing: 'orthogonal' });
    const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [conn.id]: conn };
    const wps = [{ x: 120, y: 70 }, { x: 120, y: 300 }, { x: 620, y: 300 }, { x: 620, y: 270 }, { x: 760, y: 270 }, { x: 760, y: 80 }];
    const hook = { ...conn, waypoints: wps } as ConnectorElement;
    const route = connectorGeometryInDoc(hook, { ...elements, [conn.id]: hook }).points;
    // Drag the climb at x 760 to x 480, left of B.
    const climb = route.findIndex((p, i) => i < route.length - 1 && p.x === 760 && route[i + 1].x === 760);
    const res = dragSegment(hook, route, climb, false, 480, elements)!;
    expect(res.patch.target).toMatchObject({ elementId: b.id, side: 'left' });
    const next = { ...hook, ...res.patch } as ConnectorElement;
    const pts = connectorGeometryInDoc(next, { ...elements, [conn.id]: next }).points;
    expect(pts[pts.length - 1].x).toBe(560);
    // The last stretch comes from the left and stops at B's left side.
    const lastRun = pts.slice(-2);
    expect(lastRun[0].x).toBeLessThan(560);
    expect(lastRun[0].y).toBe(lastRun[1].y);
    // The old out-and-back under B is gone: right along the bottom, then straight up at x 480.
    expect(pts).toContainEqual({ x: 480, y: 300 });
    expect(pts.some((p) => p.x === 620)).toBe(false);
  });

  it('stops a connector where it first runs into its end shape after the shape moves', () => {
    // Out of A, up, then right across B's top half, down past B and back into its right side.
    const a = createShape('rect', { x: 0, y: 0, w: 80, h: 140 }, {}, 'A');
    const b = createShape('rect', { x: 400, y: 20, w: 200, h: 120 }, {}, 'B');
    const conn = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'right', x: 0, y: 0 }, { routing: 'orthogonal' });
    const route = [{ x: 120, y: 70 }, { x: 120, y: 50 }, { x: 620, y: 50 }, { x: 620, y: 80 }];
    const c = { ...conn, waypoints: route } as ConnectorElement;
    const elements: Record<string, DiagramElement> = { [a.id]: a, [b.id]: b, [c.id]: c };
    const fix = uncrossConnector(c, elements)!;
    // It reaches B's left edge at y 50 first: the arrow ends there.
    expect(fix.target).toMatchObject({ elementId: b.id, x: 400, y: 50 });
    const next = { ...c, ...fix } as ConnectorElement;
    const pts = connectorGeometryInDoc(next, { ...elements, [c.id]: next }).points;
    expect(pts[pts.length - 1]).toEqual({ x: 400, y: 50 });
    expect(pts.every((p) => p.x <= 400)).toBe(true);
    // A connector that only meets B at its end is left alone.
    const toLeft = { ...conn, target: { ...conn.target, side: 'left' }, waypoints: [{ x: 120, y: 70 }, { x: 120, y: 80 }] } as ConnectorElement;
    expect(uncrossConnector(toLeft, elements)).toBeNull();
  });

  it('lets a free end follow its segment', () => {
    const conn = createConnector({ x: 0, y: 0 }, { x: 200, y: 0 }, { routing: 'orthogonal' });
    const res = dragSegment(conn, [{ x: 0, y: 0 }, { x: 200, y: 0 }], 0, true, 40, { [conn.id]: conn })!;
    expect(res.patch.source).toMatchObject({ x: 0, y: 40 });
    expect(res.patch.target).toMatchObject({ x: 200, y: 40 });
  });
});
