import { describe, expect, it } from 'vitest';
import { layoutDiagram } from '@/ai/generate/layout';
import { resolveSpec } from '@/ai/generate/resolve';
import type { DiagramSpec } from '@/ai/generate/spec';
import type { Rect } from '@/model/types';
import { awsSpec, c4Spec, flowSpec } from './fixtures';

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

function run(spec: DiagramSpec) {
  const nodes = resolveSpec(spec);
  const res = layoutDiagram(nodes, spec.edges, { direction: spec.direction ?? 'TB' });
  return { nodes, ...res };
}

/** Box a node occupies, including its label below. */
function footprint(spec: DiagramSpec, id: string) {
  const { nodes, rects } = run(spec);
  const n = nodes.find((x) => x.id === id)!;
  const r = rects.get(id)!;
  return { x: r.x + (r.w - n.boxW) / 2, y: r.y, w: n.boxW, h: r.h + n.labelBelow };
}

function checkInvariants(spec: DiagramSpec) {
  const { nodes, rects, width, height } = run(spec);
  expect(rects.size).toBe(spec.nodes.length);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const box = (id: string): Rect => {
    const n = byId.get(id)!;
    const r = rects.get(id)!;
    return n.container ? r : { x: r.x + (r.w - n.boxW) / 2, y: r.y, w: n.boxW, h: r.h + n.labelBelow };
  };
  // Children inside their containers (including the header/padding).
  for (const n of nodes) {
    if (!n.parent) continue;
    const parent = byId.get(n.parent)!;
    const pr = rects.get(n.parent)!;
    const content = { x: pr.x + parent.padding.left - 0.5, y: pr.y + parent.padding.top - 0.5, w: pr.w - parent.padding.left - parent.padding.right + 1, h: pr.h - parent.padding.top - parent.padding.bottom + 1 };
    expect(inside(box(n.id), content), `${n.id} inside ${n.parent}`).toBe(true);
  }
  // Siblings never overlap.
  for (const a of nodes)
    for (const b of nodes) {
      if (a.id >= b.id || (a.parent ?? '') !== (b.parent ?? '')) continue;
      expect(overlap(box(a.id), box(b.id)), `${a.id} vs ${b.id}`).toBe(false);
    }
  // Everything within the reported bounds.
  for (const n of nodes) expect(inside(box(n.id), { x: -0.5, y: -0.5, w: width + 1, h: height + 1 })).toBe(true);
}

describe('layoutDiagram', () => {
  it('lays out a flowchart without overlaps, top to bottom', () => {
    checkInvariants(flowSpec);
    const { rects } = run(flowSpec);
    expect(rects.get('start')!.y).toBeLessThan(rects.get('login')!.y);
    expect(rects.get('login')!.y).toBeLessThan(rects.get('ok')!.y);
  });

  it('respects LR direction', () => {
    const spec = { ...flowSpec, direction: 'LR' as const };
    const { rects } = run(spec);
    expect(rects.get('start')!.x).toBeLessThan(rects.get('login')!.x);
  });

  it('nests cloud containers and keeps children inside', () => {
    checkInvariants(awsSpec);
    const { rects } = run(awsSpec);
    expect(inside(rects.get('web1')!, rects.get('priv')!)).toBe(true);
    expect(inside(rects.get('priv')!, rects.get('vpc')!)).toBe(true);
    expect(inside(rects.get('vpc')!, rects.get('region')!)).toBe(true);
    expect(inside(rects.get('region')!, rects.get('cloud')!)).toBe(true);
    expect(overlap(rects.get('users')!, rects.get('cloud')!)).toBe(false);
  });

  it('reserves room for labels below icons', () => {
    const a = footprint(awsSpec, 'web1');
    const b = footprint(awsSpec, 'web2');
    expect(overlap(a, b)).toBe(false);
  });

  it('handles C4 boundaries with the label at the bottom', () => {
    checkInvariants(c4Spec);
  });

  it('grid-packs many unconnected nodes', () => {
    const spec: DiagramSpec = {
      type: 'erd',
      nodes: Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, kind: 'erd.entity', text: `table_${i}`, attributes: ['id: uuid PK', 'name: text'] })),
      edges: [],
    };
    checkInvariants(spec);
    const { width, height } = run(spec);
    expect(width / height).toBeLessThan(6); // not one long row
  });

  it('copes with edges into containers and empty containers', () => {
    const spec: DiagramSpec = {
      type: 'generic',
      nodes: [
        { id: 'g', kind: 'container', text: 'Group' },
        { id: 'a', kind: 'rectangle', text: 'A', parent: 'g' },
        { id: 'e', kind: 'container', text: 'Empty' },
        { id: 'x', kind: 'rectangle', text: 'X' },
      ],
      edges: [
        { from: 'x', to: 'g' },
        { from: 'x', to: 'a' },
        { from: 'a', to: 'a' },
        { from: 'e', to: 'x' },
      ],
    };
    checkInvariants(spec);
  });
});
