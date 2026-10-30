import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { Doc } from '@/model/types';
import { resolveSelfDrop } from '@/canvas/connectorDrop';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';

const a = { ...createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 }), id: 'a' };
const doc: Doc = { elements: { a }, order: ['a'] };
// The connector leaves A from the middle of its right side.
const start = { x: 100, y: 30 };

describe('self-loops', () => {
  it('connects back to the same shape at another connection point', () => {
    const drop = resolveSelfDrop(doc, { x: 52, y: 2 }, a, start, { z: 1 })!;
    expect(drop.targetId).toBe('a');
    expect(drop.ep.side).toBe('top');
  });

  it('makes a point where the end is dropped on the outline', () => {
    const drop = resolveSelfDrop(doc, { x: 75, y: 59 }, a, start, { z: 1 })!;
    expect(drop.ep.fixed).toEqual({ x: 0.75, y: 1 });
  });

  it('does not loop when the drop is next to the start or deep inside the shape', () => {
    expect(resolveSelfDrop(doc, { x: 99, y: 34 }, a, start, { z: 1 })).toBeNull();
    expect(resolveSelfDrop(doc, { x: 40, y: 30 }, a, start, { z: 1 })).toBeNull();
  });

  it('routes the loop around the shape', () => {
    const c = { ...createConnector({ elementId: 'a', side: 'right', x: 100, y: 30 }, { elementId: 'a', side: 'top', x: 50, y: 0 }), id: 'c' };
    const pts = connectorGeometryInDoc(c, { a, c }).points;
    expect(pts[0]).toEqual({ x: 100, y: 30 });
    expect(pts[pts.length - 1]).toEqual({ x: 50, y: 0 });
    // Never through the box: every bend is outside it.
    for (const q of pts.slice(1, -1)) expect(q.x > 100 || q.y < 0 || q.x < 0 || q.y > 60).toBe(true);
  });
});
