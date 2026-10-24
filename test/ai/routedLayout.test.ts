import { describe, expect, it } from 'vitest';
import { convertSpec, prepareLayout } from '@/ai/generate/toElements';
import { connectorGeometry, connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { createConnector, createShape } from '@/model/defaults';
import { isConnector, isShape, type DiagramElement, type Vec } from '@/model/types';
import { awsSpec, flowSpec } from './fixtures';

const byId = (els: DiagramElement[]) => Object.fromEntries(els.map((e) => [e.id, e]));

/** Whether segment a→b passes through the inside of rect r (shrunk a little, so touching the border is fine). */
function crosses(a: Vec, b: Vec, r: { x: number; y: number; w: number; h: number }) {
  const x0 = r.x + 2;
  const x1 = r.x + r.w - 2;
  const y0 = r.y + 2;
  const y1 = r.y + r.h - 2;
  if (a.y === b.y) return a.y > y0 && a.y < y1 && Math.max(a.x, b.x) > x0 && Math.min(a.x, b.x) < x1;
  return a.x > x0 && a.x < x1 && Math.max(a.y, b.y) > y0 && Math.min(a.y, b.y) < y1;
}

describe('routed layout of generated diagrams', () => {
  it('routes every edge ahead of time, and the canvas draws exactly that route', async () => {
    const spec = structuredClone(awsSpec);
    await prepareLayout(spec);
    const { elements } = convertSpec(spec, { x: 0, y: 0 }, { anchor: 'topLeft' });
    const els = byId(elements);
    const conns = elements.filter(isConnector);
    expect(conns).toHaveLength(spec.edges.length);
    for (const c of conns) {
      expect(c.source.fixed).toBeTruthy();
      expect(c.target.fixed).toBeTruthy();
      expect(c.waypoints?.length).toBeGreaterThan(0);
      const pts = connectorGeometryInDoc(c, els).points;
      // Orthogonal, from the routed start to the routed end, through every bend.
      for (let i = 0; i < pts.length - 1; i++) expect(pts[i].x === pts[i + 1].x || pts[i].y === pts[i + 1].y).toBe(true);
      expect(pts[0]).toEqual({ x: c.source.x, y: c.source.y });
      expect(pts[pts.length - 1]).toEqual({ x: c.target.x, y: c.target.y });
      for (const w of c.waypoints!) expect(pts.some((p, i) => i < pts.length - 1 && onSegment(w, p, pts[i + 1]))).toBe(true);
    }
  });

  it('keeps edges out of shapes they do not connect', async () => {
    const spec = structuredClone(flowSpec);
    await prepareLayout(spec);
    const { elements } = convertSpec(spec, { x: 0, y: 0 }, { anchor: 'topLeft' });
    const els = byId(elements);
    const shapes = elements.filter(isShape).filter((s) => !elements.some((o) => isShape(o) && o.containerId === s.id));
    for (const c of elements.filter(isConnector)) {
      const pts = connectorGeometryInDoc(c, els).points;
      for (const s of shapes) {
        if (s.id === c.source.elementId || s.id === c.target.elementId) continue;
        for (let i = 0; i < pts.length - 1; i++) expect(crosses(pts[i], pts[i + 1], s)).toBe(false);
      }
    }
  });

  it('without a prepared layout, falls back to edges routed when drawn', () => {
    const { elements } = convertSpec(structuredClone(flowSpec), { x: 0, y: 0 });
    for (const c of elements.filter(isConnector)) {
      expect(c.source.side).toBe('auto');
      expect(c.waypoints).toBeUndefined();
    }
  });
});

function onSegment(p: Vec, a: Vec, b: Vec) {
  return (a.x === b.x && p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y))
    || (a.y === b.y && p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x));
}

describe('orthogonal routes through waypoints', () => {
  it('goes straight to a bend just ahead of the shape instead of overshooting it', () => {
    const a = createShape('rect', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
    const b = createShape('rect', { x: 0, y: 200, w: 100, h: 60 }, {}, 'B');
    // Leaves A's right side, bends 8px out (closer than the stub), goes down, enters B's right side.
    const c = createConnector(
      { elementId: a.id, fixed: { x: 1, y: 0.5 }, x: 100, y: 30 },
      { elementId: b.id, fixed: { x: 1, y: 0.5 }, x: 100, y: 230 },
      { routing: 'orthogonal', waypoints: [{ x: 108, y: 30 }, { x: 108, y: 230 }] },
    );
    const pts = connectorGeometry(c, (id) => ({ [a.id]: a, [b.id]: b })[id]).points;
    expect(pts).toEqual([{ x: 100, y: 30 }, { x: 108, y: 30 }, { x: 108, y: 230 }, { x: 100, y: 230 }]);
  });
});
