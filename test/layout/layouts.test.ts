import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '@/layout';
import type { LayoutAlgorithm } from '@/layout/types';
import type { Doc, ShapeElement } from '@/model/types';
import { applyPatch, makeDoc, overlaps, randomDag, randomGraph, randomTree, shapesOf, type NodeSpec } from './helpers';

const OPTS = { nodeSpacing: 30, levelSpacing: 50 };
const byId = (id: string): LayoutAlgorithm => {
  const l = LAYOUTS.find((x) => x.id === id);
  if (!l) throw new Error(`layout ${id} not found`);
  return l;
};
const ALL = ['flow-horizontal', 'flow-vertical', 'tree-horizontal', 'tree-vertical', 'tree-compact', 'tree-radial', 'org-chart', 'organic', 'circle', 'grid', 'mindmap'];

const sh = (doc: Doc, id: string) => doc.elements[id] as ShapeElement;
const cx = (s: ShapeElement) => s.x + s.w / 2;
const cy = (s: ShapeElement) => s.y + s.h / 2;
const edgesOf = (doc: Doc) =>
  doc.order.map((id) => doc.elements[id]).flatMap((e) => (e.type === 'connector' ? [[e.source.elementId!, e.target.elementId!] as const] : []));

function run(layoutId: string, doc: Doc, ids: string[] = [], opts = OPTS) {
  const patch = byId(layoutId).run(doc, ids, opts);
  return { patch, out: applyPatch(doc, patch) };
}

describe('layout discovery', () => {
  it('registers every algorithm', () => {
    for (const id of ALL) expect(byId(id).label).toBeTruthy();
    expect(LAYOUTS.find((l) => l.id === 'parallel-edges')).toBeUndefined();
  });
});

describe.each(ALL)('%s', (layoutId) => {
  const docs: [string, Doc][] = [
    ['tree 25', randomTree(1, 25)],
    ['tree 60', randomTree(2, 60)],
    ['graph 30', randomGraph(3, 30, 40)],
    ['dag 40', randomDag(4, 40, 60)],
    ['graph 12 dense', randomGraph(5, 12, 40)],
  ];

  it.each(docs)('no overlaps, whole pixels, deterministic (%s)', (_name, doc) => {
    const before = JSON.stringify(doc);
    const a = run(layoutId, doc);
    const b = run(layoutId, doc);
    expect(JSON.stringify(doc)).toBe(before); // never mutates
    expect(a.patch).toEqual(b.patch);
    expect(overlaps(a.out)).toEqual([]);
    for (const s of shapesOf(a.out)) {
      expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true);
      if (layoutId === 'grid') expect(s.x % 10 === 0 && s.y % 10 === 0).toBe(true);
    }
  });

  it('keeps the selection anchored and leaves other shapes alone', () => {
    const doc = randomTree(7, 20);
    const ids = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
    const { patch, out } = run(layoutId, doc, ids);
    for (const id of Object.keys(patch)) expect(ids).toContain(id);
    const minX = (d: Doc) => Math.min(...ids.map((id) => sh(d, id).x));
    const minY = (d: Doc) => Math.min(...ids.map((id) => sh(d, id).y));
    expect(Math.abs(minX(out) - minX(doc))).toBeLessThanOrEqual(layoutId === 'grid' ? 5 : 0);
    expect(Math.abs(minY(out) - minY(doc))).toBeLessThanOrEqual(layoutId === 'grid' ? 5 : 0);
    const sel = makeDoc(
      ids.map((id) => ({ ...sh(out, id) })),
      [],
    );
    expect(overlaps(sel)).toEqual([]);
  });

  it('never moves locked shapes and avoids them', () => {
    const doc = randomTree(8, 15);
    const locked = { ...sh(doc, 'n3'), locked: true, x: 0, y: 0 };
    const lockedDoc = { ...doc, elements: { ...doc.elements, n3: locked } };
    const { patch, out } = run(layoutId, lockedDoc);
    expect(patch.n3).toBeUndefined();
    expect(sh(out, 'n3')).toMatchObject({ x: 0, y: 0 });
    expect(overlaps(out)).toEqual([]);
  });

  it('lays out container children inside their (resized) containers', () => {
    const nodes: NodeSpec[] = [
      { id: 'c1', kind: 'container', x: 0, y: 0, w: 200, h: 120 },
      { id: 'c2', kind: 'container', x: 400, y: 400, w: 150, h: 100, containerId: 'c1' },
      { id: 'f', kind: 'uml.frame', x: 900, y: 0, w: 200, h: 200 },
      { id: 'a', x: 10, y: 50, containerId: 'c1' },
      { id: 'b', x: 30, y: 60, containerId: 'c1' },
      { id: 'c', x: 50, y: 70, containerId: 'c1' },
      { id: 'd', x: 500, y: 500, containerId: 'c2' },
      { id: 'e', x: 520, y: 520, containerId: 'c2' },
      { id: 'g', x: 920, y: 20, containerId: 'f' },
      { id: 'h', x: 940, y: 40, containerId: 'f' },
      { id: 'top1', x: 300, y: 300 },
      { id: 'top2', x: 320, y: 320 },
    ];
    const doc = makeDoc(nodes, [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'd'],
      ['d', 'e'],
      ['g', 'h'],
      ['top1', 'c1'],
      ['top1', 'top2'],
      ['top2', 'f'],
    ]);
    const { out } = run(layoutId, doc);
    expect(overlaps(out)).toEqual([]);
    for (const s of shapesOf(out)) {
      if (!s.containerId) continue;
      const c = sh(out, s.containerId);
      const header = c.kind === 'container' ? 36 : c.kind === 'uml.frame' ? 24 : 0;
      expect(s.x).toBeGreaterThanOrEqual(c.x);
      expect(s.y).toBeGreaterThanOrEqual(c.y + header);
      expect(s.x + s.w).toBeLessThanOrEqual(c.x + c.w);
      expect(s.y + s.h).toBeLessThanOrEqual(c.y + c.h);
    }
  });

  it('lays out a selected container group and grows the container to fit', () => {
    const doc = makeDoc(
      [
        { id: 'c1', kind: 'container', x: 0, y: 0, w: 160, h: 100 },
        { id: 'a', x: 20, y: 50, containerId: 'c1' },
        { id: 'b', x: 25, y: 55, containerId: 'c1' },
        { id: 'c', x: 30, y: 60, containerId: 'c1' },
      ],
      [
        ['a', 'b'],
        ['a', 'c'],
      ],
    );
    const { out } = run(layoutId, doc, ['a', 'b', 'c']);
    expect(overlaps(out)).toEqual([]);
    const c = sh(out, 'c1');
    for (const id of ['a', 'b', 'c']) {
      const s = sh(out, id);
      expect(s.x >= c.x && s.y >= c.y + 36 && s.x + s.w <= c.x + c.w && s.y + s.h <= c.y + c.h).toBe(true);
    }
  });
});

describe('tree structure', () => {
  const doc = randomTree(11, 40);
  const edges = edgesOf(doc);

  it('vertical tree / org chart: parents above children', () => {
    for (const id of ['tree-vertical', 'org-chart']) {
      const { out } = run(id, doc);
      for (const [p, c] of edges) expect(sh(out, p).y + sh(out, p).h).toBeLessThanOrEqual(sh(out, c).y);
    }
  });

  it('vertical tree centers parents over their children', () => {
    const { out } = run('tree-vertical', doc);
    const kids = new Map<string, string[]>();
    for (const [p, c] of edges) kids.set(p, [...(kids.get(p) ?? []), c]);
    for (const [p, cs] of kids) {
      const xs = cs.map((c) => cx(sh(out, c)));
      expect(Math.abs(cx(sh(out, p)) - (Math.min(...xs) + Math.max(...xs)) / 2)).toBeLessThanOrEqual(1);
    }
  });

  it('horizontal tree: parents left of children', () => {
    const { out } = run('tree-horizontal', doc);
    for (const [p, c] of edges) expect(sh(out, p).x + sh(out, p).w).toBeLessThanOrEqual(sh(out, c).x);
  });

  it('compact tree: parents above and left of children', () => {
    const { out } = run('tree-compact', doc);
    for (const [p, c] of edges) {
      expect(sh(out, p).y + sh(out, p).h).toBeLessThanOrEqual(sh(out, c).y);
      expect(sh(out, p).x).toBeLessThan(sh(out, c).x);
    }
  });

  it('radial tree: children farther from the root than their parent', () => {
    const { out } = run('tree-radial', doc);
    const root = sh(out, 'n0');
    const dist = (s: ShapeElement) => Math.hypot(cx(s) - cx(root), cy(s) - cy(root));
    for (const [p, c] of edges) expect(dist(sh(out, c))).toBeGreaterThan(dist(sh(out, p)));
  });

  it('mind map: balanced sides growing outwards from the root', () => {
    const { out } = run('mindmap', doc);
    const root = sh(out, 'n0');
    const side = (s: ShapeElement) => Math.sign(cx(s) - cx(root));
    for (const [p, c] of edges) {
      if (p === 'n0') continue;
      expect(side(sh(out, c))).toBe(side(sh(out, p)));
      expect(Math.abs(cx(sh(out, c)) - cx(root))).toBeGreaterThan(Math.abs(cx(sh(out, p)) - cx(root)));
    }
    const shapes = shapesOf(out).filter((s) => s.id !== 'n0');
    const right = shapes.filter((s) => side(s) > 0).length;
    const left = shapes.filter((s) => side(s) < 0).length;
    expect(right).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);
  });

  it('org chart stacks leaf reports in a column', () => {
    const d = makeDoc(
      [{ id: 'm' }, { id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        ['m', 'a'],
        ['m', 'b'],
        ['m', 'c'],
      ],
    );
    const { out } = run('org-chart', d);
    expect(new Set(['a', 'b', 'c'].map((id) => sh(out, id).x)).size).toBe(1);
    expect(sh(out, 'a').y).toBeLessThan(sh(out, 'b').y);
  });

  it('uses the first selected shape as root', () => {
    const d = makeDoc([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [
      ['a', 'b'],
      ['b', 'c'],
    ]);
    const { out } = run('tree-vertical', d, ['b', 'a', 'c']);
    expect(sh(out, 'b').y).toBeLessThan(sh(out, 'c').y);
    expect(sh(out, 'b').y).toBeLessThan(sh(out, 'a').y + 1);
  });

  it('multiple roots sit side by side', () => {
    const d = makeDoc([{ id: 'r1' }, { id: 'r2' }, { id: 'a' }, { id: 'b' }], [
      ['r1', 'a'],
      ['r2', 'b'],
    ]);
    const { out } = run('tree-vertical', d);
    expect(sh(out, 'r1').y).toBe(sh(out, 'r2').y);
    expect(overlaps(out)).toEqual([]);
  });
});

describe('flow', () => {
  it('respects edge direction on DAGs', () => {
    const doc = randomDag(21, 30, 45);
    const v = run('flow-vertical', doc).out;
    const h = run('flow-horizontal', doc).out;
    for (const [a, b] of edgesOf(doc)) {
      expect(cy(sh(v, a))).toBeLessThan(cy(sh(v, b)));
      expect(cx(sh(h, a))).toBeLessThan(cx(sh(h, b)));
    }
  });

  it('handles cycles', () => {
    const doc = makeDoc([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ]);
    expect(overlaps(run('flow-vertical', doc).out)).toEqual([]);
  });
});

describe('circle', () => {
  it('places nodes on a circle', () => {
    const doc = randomGraph(31, 10, 12);
    const { out } = run('circle', doc);
    const s = shapesOf(out);
    const mx = s.reduce((a, b) => a + cx(b), 0) / s.length;
    const my = s.reduce((a, b) => a + cy(b), 0) / s.length;
    const r = s.map((x) => Math.hypot(cx(x) - mx, cy(x) - my));
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(3);
  });
});
