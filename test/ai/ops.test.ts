import { describe, expect, it } from 'vitest';
import { applyOps, validateOps } from '@/ai/generate/ops';
import { serializeDoc } from '@/ai/generate/serialize';
import { convertSpec } from '@/ai/generate/toElements';
import { isConnector, isShape, type Doc, type Rect, type ShapeElement } from '@/model/types';
import { awsSpec, flowSpec } from './fixtures';

function docOf(spec = flowSpec) {
  const { elements, idMap } = convertSpec(spec, { x: 0, y: 0 });
  const doc: Doc = { elements: Object.fromEntries(elements.map((e) => [e.id, e])), order: elements.map((e) => e.id) };
  return { doc, id: (s: string) => idMap.get(s)! };
}

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('serializeDoc', () => {
  it('lists nodes with containment, edges with endpoints, and selection', () => {
    const { doc, id } = docOf(awsSpec);
    const json = JSON.parse(serializeDoc(doc, [id('db')]));
    const db = json.nodes.find((n: { id: string }) => n.id === id('db'));
    expect(db).toMatchObject({ kind: 'icon', icon: 'aws/database/amazon-rds.svg', parent: id('priv'), selected: true });
    expect(db.box).toHaveLength(4);
    expect(json.edges.some((e: { from: string; to: string }) => e.from === id('alb') && e.to === id('web1'))).toBe(true);
  });
});

describe('edit operations', () => {
  it('validates ids against the document', () => {
    const { doc, id } = docOf();
    const bad = validateOps({ ops: [{ op: 'update_node', id: 'nope', text: 'x' }, { op: 'add_edge', edge: { from: id('start'), to: 'missing' } }, { op: 'fly' }] }, doc);
    expect(bad.ok).toBe(false);
    expect(bad.errors).toHaveLength(3);
    const dup = validateOps({ ops: [{ op: 'add_node', node: { id: id('start'), kind: 'rectangle', text: 'x' } }] }, doc);
    expect(dup.ok).toBe(false);
  });

  it('adds a node next to what it connects to without overlaps', () => {
    const { doc, id } = docOf();
    const v = validateOps(
      {
        ops: [
          { op: 'add_node', node: { id: 'audit', kind: 'rectangle', text: 'Write audit log' } },
          { op: 'add_edge', edge: { from: id('home'), to: 'audit', label: 'logs' } },
        ],
      },
      doc,
    );
    expect(v.ok).toBe(true);
    const res = applyOps(doc, v.ops);
    expect(res.added).toBe(2);
    const shapes = res.elements.filter(isShape);
    const audit = shapes.find((s) => s.text === 'Write audit log')!;
    for (const s of shapes) if (s.id !== audit.id) expect(overlap(audit, s), s.text).toBe(false);
    const conn = res.elements.filter(isConnector).find((c) => c.text === 'logs')!;
    expect(conn.source.elementId).toBe(id('home'));
    expect(conn.target.elementId).toBe(audit.id);
    // Placed near its neighbour.
    const home = shapes.find((s) => s.id === id('home'))!;
    expect(Math.hypot(audit.x - home.x, audit.y - home.y)).toBeLessThan(800);
  });

  it('updates, removes (with attached edges) and keeps positions', () => {
    const { doc, id } = docOf();
    const before = doc.elements[id('login')] as ShapeElement;
    const v = validateOps(
      {
        ops: [
          { op: 'update_node', id: id('login'), text: 'Sign in', style: { fill: '#fee2e2' } },
          { op: 'remove_node', id: id('err') },
        ],
      },
      doc,
    );
    expect(v.ok).toBe(true);
    const res = applyOps(doc, v.ops);
    const login = res.elements.find((e) => e.id === id('login')) as ShapeElement;
    expect(login.text).toBe('Sign in');
    expect(login.style.fill).toBe('#fee2e2');
    expect([login.x, login.y]).toEqual([before.x, before.y]);
    expect(before.text).toBe('Enter credentials'); // input not mutated
    expect(res.elements.some((e) => e.id === id('err'))).toBe(false);
    expect(res.elements.filter(isConnector).some((c) => c.source.elementId === id('err') || c.target.elementId === id('err'))).toBe(false);
    expect(res.removed).toBe(3); // node + 2 edges
  });

  it('places a new node inside an existing container and grows it', () => {
    const { doc, id } = docOf(awsSpec);
    const v = validateOps({ ops: [{ op: 'add_node', node: { id: 'cache', kind: 'rectangle', text: 'ElastiCache', parent: id('priv') } }] }, doc);
    expect(v.ok).toBe(true);
    const res = applyOps(doc, v.ops);
    const cache = res.elements.filter(isShape).find((s) => s.text === 'ElastiCache')!;
    const priv = res.elements.find((e) => e.id === id('priv')) as ShapeElement;
    expect(cache.containerId).toBe(priv.id);
    expect(cache.x >= priv.x && cache.y >= priv.y && cache.x + cache.w <= priv.x + priv.w && cache.y + cache.h <= priv.y + priv.h).toBe(true);
  });
});
