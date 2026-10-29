import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { DiagramElement, Doc, ShapeElement } from '@/model/types';
import { straightenMove, straightenResize } from '@/assistants/straighten';
import { connectionPointFor } from '@/assistants/connectionPoint';
import { resolveDrop } from '@/canvas/connectorDrop';

const box = (id: string, x: number, y: number, w = 100, h = 60): ShapeElement => ({ ...createShape('rectangle', { x, y, w, h }), id });

/** `a` on the left, `b` to its right and slightly lower: the connector between them has a 5 px jog. */
function scene(): Doc {
  const a = box('a', 0, 0);
  const b = box('b', 300, 5);
  const c = { ...createConnector({ elementId: 'a', side: 'auto', x: 100, y: 30 }, { elementId: 'b', side: 'auto', x: 300, y: 35 }), id: 'c' };
  return { elements: { a, b, c } as Record<string, DiagramElement>, order: ['a', 'b', 'c'] };
}

describe('micro-assistant: straight connectors', () => {
  it('pulls a moved shape so its connector runs straight, with a guide along it', () => {
    const doc = scene();
    const pull = straightenMove(doc, new Map([['b', doc.elements.b]]), 0, 0, 1);
    expect(pull.dy).toBe(-5);
    expect(pull.dx).toBe(0);
    expect(pull.guides).toEqual([{ axis: 'y', at: 30, from: 100, to: 300 }]);
  });

  it('lets go when the connector is far from straight', () => {
    const doc = scene();
    expect(straightenMove(doc, new Map([['b', doc.elements.b]]), 0, 30, 1).dy).toBe(0);
  });

  it('stops a resized edge where the connector runs straight', () => {
    const doc = scene();
    const b = doc.elements.b as ShapeElement;
    // Dragging the bottom edge: the side midpoint moves half as fast, so the edge goes 10 px for a 5 px jog.
    const { rect, guides } = straightenResize(doc, b, { x: 300, y: 5, w: 100, h: 60 }, 's', 1);
    expect(rect).toEqual({ x: 300, y: 5, w: 100, h: 50 });
    expect(guides).toHaveLength(1);
  });
});

describe('micro-assistant: connection point made to measure', () => {
  const target = box('t', 300, 100);

  it('puts the point level with the other end when it faces a side', () => {
    const ep = connectionPointFor(target, { x: 330, y: 140 }, { x: 100, y: 120 }, 1)!;
    expect(ep.elementId).toBe('t');
    expect(ep.fixed).toEqual({ x: 0, y: 0.3333 });
  });

  it('uses the side midpoint when that is where the connector runs straight', () => {
    expect(connectionPointFor(target, { x: 330, y: 140 }, { x: 100, y: 130 }, 1)!.side).toBe('left');
  });

  it('makes a point right where the end is dropped on the outline, or none deep inside', () => {
    expect(connectionPointFor(target, { x: 398, y: 150 }, undefined, 1)!.fixed).toEqual({ x: 1, y: 0.8333 });
    expect(connectionPointFor(target, { x: 350, y: 130 }, undefined, 1)).toBeNull();
  });

  it('keeps an existing point that is already straight, and stays off with Alt', () => {
    const doc: Doc = { elements: { t: target }, order: ['t'] };
    // The left midpoint (y 130) is level with the other end: it is used as is, nothing made.
    const level = resolveDrop(doc, { x: 302, y: 131 }, target, { z: 1, other: { x: 100, y: 130 } });
    expect(level.made).toBeFalsy();
    expect(level.ep.side).toBe('left');
    const made = resolveDrop(doc, { x: 350, y: 140 }, target, { z: 1, other: { x: 100, y: 120 } });
    expect(made.made).toBe(true);
    expect(resolveDrop(doc, { x: 350, y: 140 }, target, { z: 1, other: { x: 100, y: 120 }, assist: false }).made).toBeFalsy();
  });

  it('moves a drop off a point a few px from straight onto the straight line', () => {
    const doc: Doc = { elements: { t: target }, order: ['t'] };
    // Dropped on the left midpoint (y 130) with the other end at y 127: 3 px of jog, so the point moves to 127.
    const drop = resolveDrop(doc, { x: 302, y: 131 }, target, { z: 1, other: { x: 100, y: 127 } });
    expect(drop.made).toBe(true);
    expect(drop.preview.y).toBeCloseTo(127, 1);
    // With Alt the existing point is kept.
    expect(resolveDrop(doc, { x: 302, y: 131 }, target, { z: 1, other: { x: 100, y: 127 }, assist: false }).ep.side).toBe('left');
  });
});
