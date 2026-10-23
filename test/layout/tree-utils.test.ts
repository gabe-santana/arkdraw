import { describe, expect, it } from 'vitest';
import { addChildNode, addSiblingNode } from '@/layout/tree-utils';
import { layout as mindmap } from '@/layout/mindmap';
import type { Doc } from '@/model/types';
import { applyPatch, makeDoc, overlaps } from './helpers';

const add = (doc: Doc, els: { id: string }[]): Doc => {
  const elements = { ...doc.elements };
  for (const e of els) elements[e.id] = e as Doc['elements'][string];
  return { elements, order: [...doc.order, ...els.map((e) => e.id)] };
};

describe('tree-utils', () => {
  const base = makeDoc(
    [
      { id: 'root', x: 0, y: 0, kind: 'ellipse' },
      { id: 'a', x: 200, y: -50 },
      { id: 'b', x: 200, y: 50 },
    ],
    [
      ['root', 'a'],
      ['root', 'b'],
    ],
  );

  it('addChildNode clones the parent and connects it', () => {
    const { shape, connector } = addChildNode(base, 'a', 'right');
    expect(shape.kind).toBe('rectangle');
    expect(shape.text).toBe('Topic');
    expect(shape.x).toBeGreaterThan(200 + 120);
    expect(connector?.source.elementId).toBe('a');
    expect(connector?.target.elementId).toBe(shape.id);
  });

  it('addChildNode goes below the last child (right) / right of it (down)', () => {
    const r = addChildNode(base, 'root', 'right');
    expect(r.shape.kind).toBe('ellipse');
    expect(r.shape.x).toBe(200);
    expect(r.shape.y).toBeGreaterThan(50);
    const d = addChildNode(base, 'root', 'down');
    expect(d.shape.x).toBeGreaterThan(200 + 120);
  });

  it('addSiblingNode inserts after / before, linked to the same parent', () => {
    const after = addSiblingNode(base, 'a', false);
    expect(after.connector?.source.elementId).toBe('root');
    expect(after.shape.y).toBeGreaterThan(-50);
    expect(after.shape.y).toBeLessThan(50); // stays between a and b
    const before = addSiblingNode(base, 'b', true);
    expect(before.shape.y).toBeLessThan(50);
    expect(before.shape.y).toBeGreaterThan(-50);
    const orphan = addSiblingNode(base, 'root', false);
    expect(orphan.connector).toBeNull();
  });

  it('mind map keeps the inserted sibling in its slot after re-layout', () => {
    const { shape, connector } = addSiblingNode(base, 'a', false);
    const doc = add(base, [shape, connector!]);
    const out = applyPatch(doc, mindmap.run(doc, [], { nodeSpacing: 20, levelSpacing: 60 }));
    expect(overlaps(out)).toEqual([]);
  });
});
