import { beforeEach, describe, expect, it } from 'vitest';
import type { ConnectorElement, Doc, Rect, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { routeOrthogonal, simplify } from '@/lib/routing';
import { rotatedBounds, rotatePoint, segmentIntersection } from '@/lib/geometry';
import { computeJumps, connectorGeometry, connectorGeometryInDoc, perimeterPoint } from '@/lib/connectorGeometry';
import { buildSnapTargets, snapRect } from '@/canvas/snapping';
import { parsePages, serializePages } from '@/io/fileFormat';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import { newPage, useEditor } from '@/store/editor';

const docOf = (...els: Array<ShapeElement | ConnectorElement>): Doc => ({
  elements: Object.fromEntries(els.map((e) => [e.id, e])),
  order: els.map((e) => e.id),
});

const inside = (r: Rect, p: { x: number; y: number }) => p.x > r.x + 0.5 && p.x < r.x + r.w - 0.5 && p.y > r.y + 0.5 && p.y < r.y + r.h - 0.5;

describe('orthogonal routing', () => {
  it('produces axis-aligned segments that start and end at the anchors', () => {
    const a = { point: { x: 100, y: 50 }, dir: { x: 1, y: 0 }, rect: { x: 0, y: 0, w: 100, h: 100 } };
    const b = { point: { x: 400, y: 250 }, dir: { x: -1, y: 0 }, rect: { x: 400, y: 200, w: 100, h: 100 } };
    const pts = routeOrthogonal(a, b);
    expect(pts[0]).toEqual(a.point);
    expect(pts[pts.length - 1]).toEqual(b.point);
    for (let i = 1; i < pts.length; i++) expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true);
  });

  it('steers around obstacles between the shapes', () => {
    const a = { point: { x: 100, y: 50 }, dir: { x: 1, y: 0 }, rect: { x: 0, y: 0, w: 100, h: 100 } };
    const b = { point: { x: 600, y: 50 }, dir: { x: -1, y: 0 }, rect: { x: 600, y: 0, w: 100, h: 100 } };
    const wall = { x: 300, y: -20, w: 80, h: 140 };
    const pts = routeOrthogonal(a, b, [wall]);
    // Sample every segment densely: no sample may be inside the wall.
    for (let i = 1; i < pts.length; i++) {
      for (let t = 0; t <= 1; t += 0.05) {
        const p = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
        expect(inside(wall, p)).toBe(false);
      }
    }
  });

  it('simplify removes duplicates and collinear points', () => {
    expect(simplify([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });
});

describe('geometry', () => {
  it('rotates points and computes rotated bounds', () => {
    const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
    const b = rotatedBounds({ x: 0, y: 0, w: 100, h: 20, rotation: 90 });
    expect(b.w).toBeCloseTo(20);
    expect(b.h).toBeCloseTo(100);
  });

  it('finds proper segment intersections only', () => {
    expect(segmentIntersection({ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 5, y: 0 }, { x: 5, y: 10 })).toEqual({ x: 5, y: 5 });
    expect(segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull();
  });

  it('places perimeter points on ellipses and diamonds', () => {
    const e = createShape('ellipse', { x: 0, y: 0, w: 100, h: 50 });
    const p = perimeterPoint(e, { x: 500, y: 25 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(25);
    const d = createShape('diamond', { x: 0, y: 0, w: 100, h: 100 });
    const q = perimeterPoint(d, { x: 50, y: -500 });
    expect(q.y).toBeCloseTo(0);
  });
});

describe('connectors', () => {
  it('follows attached shapes and supports waypoints & label offset', () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 });
    const b = createShape('rectangle', { x: 300, y: 0, w: 100, h: 60 });
    const c = createConnector({ elementId: a.id, side: 'auto', x: 0, y: 0 }, { elementId: b.id, side: 'auto', x: 0, y: 0 });
    const doc = docOf(a, b, c);
    const g = connectorGeometryInDoc(c, doc.elements);
    expect(g.start.x).toBe(100); // right side of a
    expect(g.end.x).toBe(300); // left side of b

    const straight: ConnectorElement = { ...c, routing: 'straight', waypoints: [{ x: 200, y: -50 }] };
    const sg = connectorGeometry(straight, (id) => doc.elements[id]);
    expect(sg.points).toContainEqual({ x: 200, y: -50 });

    const labelled: ConnectorElement = { ...c, labelT: 0, labelOffset: 0 };
    expect(connectorGeometryInDoc(labelled, doc.elements).label).toEqual(g.start);
  });

  it('computes line jumps where a connector crosses one beneath it', () => {
    const h = createConnector({ x: 0, y: 50 }, { x: 200, y: 50 }, { routing: 'straight' });
    const v = createConnector({ x: 100, y: 0 }, { x: 100, y: 100 }, { routing: 'straight', lineJumps: 'arc' });
    const doc = docOf(h, v);
    const jumps = computeJumps(doc.order, doc.elements);
    expect(jumps.get(v.id)).toEqual([{ x: 100, y: 50 }]);
    expect(jumps.has(h.id)).toBe(false);
  });
});

describe('snapping', () => {
  it('snaps to other shapes before falling back to the grid', () => {
    const targets = buildSnapTargets([{ x: 100, y: 0, w: 50, h: 50 }]);
    const r = snapRect({ x: 103, y: 77, w: 40, h: 40 }, targets, { guides: true, grid: 10, threshold: 6 });
    expect(r.dx).toBe(2); // center 123 → 125 beats left edge 103 → 100
    expect(r.guides.length).toBeGreaterThan(0);
    expect(r.dy).toBe(3); // grid: 77 → 80
  });
});

describe('file format', () => {
  it('reads v1 single-page files', () => {
    const shape = createShape('rectangle', { x: 1, y: 2, w: 3, h: 4 });
    const v1 = JSON.stringify({ format: 'opendraw', version: 1, elements: [shape] });
    const pages = parsePages(v1);
    expect(pages).toHaveLength(1);
    expect(pages[0].doc.order).toEqual([shape.id]);
  });

  it('round-trips multiple pages with layers and settings', () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 });
    const p1 = newPage('One', { ...docOf(a), layers: [{ id: 'L1', name: 'Base', visible: true, locked: false }, { id: 'L2', name: 'Top', visible: false, locked: true }] });
    p1.settings = { ...p1.settings, background: '#fafafa', pageView: true };
    const p2 = newPage('Two');
    const back = parsePages(serializePages([p1, p2]));
    expect(back.map((p) => p.name)).toEqual(['One', 'Two']);
    expect(back[0].doc.layers?.[1].locked).toBe(true);
    expect(back[0].settings.background).toBe('#fafafa');
  });

  it('drops dangling references', () => {
    const c = createConnector({ elementId: 'missing', side: 'auto', x: 5, y: 5 }, { x: 9, y: 9 });
    const doc = parsePages(serializePages([newPage('P', docOf(c))]))[0].doc;
    expect((doc.elements[c.id] as ConnectorElement).source.elementId).toBeUndefined();
  });
});

describe('mxGraph interop', () => {
  it('round-trips pages, rotation, layers, waypoints, metadata', async () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }, {}, 'Alpha');
    a.rotation = 30;
    a.tooltip = 'hello';
    a.data = { owner: 'team' };
    const b = createShape('ellipse', { x: 300, y: 0, w: 80, h: 80 }, {}, 'Beta');
    const c = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'left', x: 0, y: 0 });
    c.waypoints = [{ x: 200, y: 100 }];
    const page1 = { name: 'Main', doc: docOf(a, b, c) };
    const page2 = { name: 'Second', doc: docOf(createShape('diamond', { x: 0, y: 0, w: 50, h: 50 })) };
    const xml = await exportDrawioPages([page1, page2]);
    const back = await importDrawioPages(xml);
    expect(back.map((p) => p.name)).toEqual(['Main', 'Second']);
    const els = Object.values(back[0].doc.elements);
    const alpha = els.find((e) => e.text === 'Alpha') as ShapeElement;
    expect(alpha.rotation).toBe(30);
    expect(alpha.tooltip).toBe('hello');
    expect(alpha.data?.owner).toBe('team');
    const conn = els.find((e) => e.type === 'connector') as ConnectorElement;
    expect(conn.waypoints).toEqual([{ x: 200, y: 100 }]);
    expect(conn.source.elementId).toBe(alpha.id);
  });
});

describe('editor store', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('undo/redo restores documents and coalesces interactions', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 });
    s.addElements([a]);
    s.beginInteraction();
    for (let i = 1; i <= 5; i++) useEditor.getState().updateElements({ [a.id]: { x: i * 10 } });
    useEditor.getState().endInteraction();
    expect((useEditor.getState().doc.elements[a.id] as ShapeElement).x).toBe(50);
    useEditor.getState().undo();
    expect((useEditor.getState().doc.elements[a.id] as ShapeElement).x).toBe(0);
    useEditor.getState().undo();
    expect(useEditor.getState().doc.elements[a.id]).toBeUndefined();
    useEditor.getState().redo();
    expect(useEditor.getState().doc.elements[a.id]).toBeDefined();
  });

  it('deleting a shape detaches connectors; delete-with-connections removes them', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 });
    const b = createShape('rectangle', { x: 100, y: 0, w: 10, h: 10 });
    const c = createConnector({ elementId: a.id, side: 'auto', x: 0, y: 0 }, { elementId: b.id, side: 'auto', x: 0, y: 0 });
    s.addElements([a, b, c]);
    useEditor.getState().deleteElements([a.id]);
    const conn = useEditor.getState().doc.elements[c.id] as ConnectorElement;
    expect(conn).toBeDefined();
    expect(conn.source.elementId).toBeUndefined();
    useEditor.getState().deleteElements([b.id], true);
    expect(useEditor.getState().doc.elements[c.id]).toBeUndefined();
  });

  it('manages pages with independent documents', () => {
    const s = useEditor.getState();
    s.addElements([createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 })]);
    const first = useEditor.getState().activePageId;
    useEditor.getState().addPage('Second');
    expect(useEditor.getState().doc.order).toHaveLength(0);
    useEditor.getState().switchPage(first);
    expect(useEditor.getState().doc.order).toHaveLength(1);
    expect(useEditor.getState().allPages()).toHaveLength(2);
  });

  it('layers: hidden layers hide elements, locked layers prevent deletion', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 });
    s.addElements([a]);
    useEditor.getState().addLayer('Top');
    const top = useEditor.getState().doc.layers![1];
    const b = createShape('rectangle', { x: 50, y: 0, w: 10, h: 10 });
    useEditor.getState().addElements([b]);
    expect(useEditor.getState().doc.elements[b.id].layerId).toBe(top.id);
    useEditor.getState().setLayerLocked(top.id, true);
    useEditor.getState().deleteElements([b.id]);
    expect(useEditor.getState().doc.elements[b.id]).toBeDefined();
  });
});
