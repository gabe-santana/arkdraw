import { describe, expect, it } from 'vitest';
import { validateSpec, type DiagramSpec } from '@/ai/generate/spec';
import { convertSpec, prepareLayout } from '@/ai/generate/toElements';
import { buildSteps } from '@/ai/generate/buildSteps';
import { applyOps, validateOps } from '@/ai/generate/ops';
import { compactDoc } from '@/ai/generate/serialize';
import { createConnector, createShape } from '@/model/defaults';
import { isConnector, isShape, type DiagramElement, type Doc } from '@/model/types';

const docOf = (els: DiagramElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });

function spec(input: unknown): DiagramSpec {
  const v = validateSpec(input);
  if (!v.ok) throw new Error(v.errors.join('\n'));
  return v.spec;
}

const pipeline = {
  type: 'generic',
  direction: 'LR',
  nodes: [
    { id: 'users', kind: 'rectangle', text: 'Users' },
    { id: 'net', kind: 'container', text: 'VPC' },
    { id: 'api', kind: 'rectangle', text: 'API', parent: 'net', animation: 'glow' },
    { id: 'db', kind: 'cylinder', text: 'DB', parent: 'net' },
  ],
  edges: [
    { from: 'users', to: 'api', label: 'HTTPS', animation: 'flow' },
    { from: 'api', to: 'db', animation: { kind: 'dots', speed: 2, reverse: true } },
  ],
};

describe('animation in the diagram spec', () => {
  it('parses edge and node animations, steps and build', () => {
    const v = validateSpec({
      ...pipeline,
      build: true,
      nodes: [...pipeline.nodes, { id: 'x', kind: 'rectangle', text: 'X', step: '3', animation: 'wiggle' }],
      edges: [...pipeline.edges, { from: 'db', to: 'x', animated: true, step: -1 }, { from: 'x', to: 'users', animation: 'none' }],
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.spec.build).toBe(true);
    expect(v.spec.edges[0].animation).toEqual({ kind: 'flow' });
    expect(v.spec.edges[1].animation).toEqual({ kind: 'dots', speed: 2, reverse: true });
    expect(v.spec.edges[2].animation).toEqual({ kind: 'flow' });
    expect(v.spec.edges[2].step).toBeUndefined();
    expect(v.spec.edges[3].animation).toBeUndefined();
    const api = v.spec.nodes.find((n) => n.id === 'api')!;
    expect(api.animation).toEqual({ kind: 'glow' });
    const x = v.spec.nodes.find((n) => n.id === 'x')!;
    expect(x.step).toBe(3);
    expect(x.animation).toBeUndefined();
    expect(v.warnings.some((w) => w.includes('wiggle'))).toBe(true);
    expect(v.warnings.some((w) => w.includes('step'))).toBe(true);
  });

  it('accepts friendly aliases', () => {
    const s = spec({ ...pipeline, edges: [{ from: 'users', to: 'api', animation: 'marching' }, { from: 'api', to: 'db', animation: 'particles' }] });
    expect(s.edges.map((e) => e.animation?.kind)).toEqual(['flow', 'dots']);
  });
});

describe('animation in converted elements', () => {
  it('sets connector and shape animations', () => {
    const els = convertSpec(spec(pipeline), { x: 0, y: 0 }).elements;
    const conns = els.filter(isConnector);
    expect(conns[0].animation).toEqual({ kind: 'flow', speed: 1 });
    expect(conns[1].animation).toEqual({ kind: 'dots', speed: 2, reverse: true });
    expect(els.filter(isShape).find((s) => s.text === 'API')!.animation).toEqual({ kind: 'glow', speed: 1 });
    expect(els.some((e) => e.reveal)).toBe(false);
  });

  it('builds step by step along the flow, containers with their first child', async () => {
    const s = spec({ ...pipeline, build: true });
    await prepareLayout(s);
    const shapes = convertSpec(s, { x: 0, y: 0 }).elements.filter(isShape);
    const step = (text: string) => shapes.find((sh) => sh.text === text)!.reveal!;
    expect(step('Users')).toBe(1);
    expect(step('API')).toBeGreaterThan(step('Users'));
    expect(step('DB')).toBeGreaterThan(step('API'));
    expect(step('VPC')).toBe(step('API'));
  });

  it('reveals sequence messages in order', () => {
    const s = spec({
      type: 'sequence',
      build: true,
      nodes: [
        { id: 'a', kind: 'uml.lifeline', text: 'Client' },
        { id: 'b', kind: 'uml.lifeline', text: 'Server' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'request', animation: 'flow' },
        { from: 'b', to: 'a', label: 'response', dashed: true },
      ],
    });
    const conns = convertSpec(s, { x: 0, y: 0 }).elements.filter(isConnector);
    expect(conns.map((c) => c.reveal)).toEqual([1, 2]);
    expect(conns[0].animation?.kind).toBe('flow');
  });
});

describe('buildSteps', () => {
  const r = (x: number, y = 0) => ({ x, y, w: 100, h: 60 });
  it('puts shapes of the same layer in the same step; explicit steps win', () => {
    const steps = buildSteps(
      [
        { id: 'a', rect: r(0) },
        { id: 'b', rect: r(200, 0) },
        { id: 'c', rect: r(205, 120) },
        { id: 'd', rect: r(400), step: 1 },
      ],
      'LR',
      true,
    );
    expect(steps.get('a')).toBe(1);
    expect(steps.get('b')).toBe(2);
    expect(steps.get('c')).toBe(2);
    expect(steps.get('d')).toBe(1);
  });

  it('follows TB and reversed directions', () => {
    const items = [
      { id: 'top', rect: r(0, 0) },
      { id: 'bottom', rect: r(0, 300) },
    ];
    expect(buildSteps(items, 'TB', true).get('top')).toBe(1);
    expect(buildSteps(items, 'BT', true).get('bottom')).toBe(1);
  });

  it('only numbers containers from explicit steps when not building', () => {
    const steps = buildSteps(
      [
        { id: 'box', rect: r(0) },
        { id: 'in', parent: 'box', rect: r(10), step: 4 },
        { id: 'free', rect: r(500) },
      ],
      'LR',
      false,
    );
    expect(steps.get('box')).toBe(4);
    expect(steps.has('free')).toBe(false);
  });
});

describe('animation in edit mode', () => {
  const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 }, {}, 'A');
  const b = createShape('rectangle', { x: 300, y: 0, w: 100, h: 60 }, {}, 'B');
  const c = createShape('rectangle', { x: 600, y: 0, w: 100, h: 60 }, {}, 'C');
  const ab = createConnector({ elementId: a.id, x: 100, y: 30 }, { elementId: b.id, x: 300, y: 30 });
  const bc = createConnector({ elementId: b.id, x: 400, y: 30 }, { elementId: c.id, x: 600, y: 30 }, { animation: { kind: 'pulse', speed: 1 } });
  const doc = docOf([a, b, c, ab, bc]);

  const run = (ops: unknown[], d = doc) => {
    const v = validateOps({ ops }, d);
    expect(v.errors).toEqual([]);
    const out = applyOps(d, v.ops);
    return docOf(out.elements);
  };

  it('animates every edge with one op, and removes animations', () => {
    const animated = run([{ op: 'animate_edges', edges: ['all'], animation: { kind: 'dots' } }]);
    expect(Object.values(animated.elements).filter(isConnector).map((e) => e.animation?.kind)).toEqual(['dots', 'dots']);
    const cleared = run([{ op: 'update_edge', id: bc.id, animation: { kind: 'none' } }]);
    expect((cleared.elements[bc.id] as typeof bc).animation).toBeUndefined();
  });

  it('rejects unknown edge ids and missing animations', () => {
    expect(validateOps({ ops: [{ op: 'animate_edges', edges: ['nope'], animation: 'flow' }] }, doc).ok).toBe(false);
    expect(validateOps({ ops: [{ op: 'animate_edges', edges: 'all' }] }, doc).ok).toBe(false);
  });

  it('sets node emphasis, steps, and builds or clears the whole sequence', () => {
    const pulsed = run([{ op: 'update_node', id: b.id, animation: 'bounce', step: 2 }]);
    expect((pulsed.elements[b.id] as typeof b).animation).toEqual({ kind: 'bounce', speed: 1 });
    expect(pulsed.elements[b.id].reveal).toBe(2);
    const built = run([{ op: 'set_build', enabled: true }]);
    expect([a, b, c].map((s) => built.elements[s.id].reveal)).toEqual([1, 2, 3]);
    const cleared = run([{ op: 'set_build', enabled: false }], built);
    expect(Object.values(cleared.elements).some((e) => e.reveal)).toBe(false);
  });

  it('adds animated edges and nodes', () => {
    const out = run([
      { op: 'add_node', node: { id: 'cache', kind: 'cylinder', text: 'Cache', animation: 'glow', step: 3 } },
      { op: 'add_edge', edge: { from: b.id, to: 'cache', animation: 'dots' } },
    ]);
    const cache = Object.values(out.elements).filter(isShape).find((s) => s.text === 'Cache')!;
    expect(cache.animation?.kind).toBe('glow');
    expect(cache.reveal).toBe(3);
    const edge = Object.values(out.elements).filter(isConnector).find((e) => e.target.elementId === cache.id)!;
    expect(edge.animation?.kind).toBe('dots');
  });

  it('tells the model about existing animation and steps', () => {
    const d = docOf([a, { ...b, reveal: 2 }, c, ab, bc]);
    const compact = compactDoc(d);
    expect(compact.nodes.find((n) => n.id === b.id)!.step).toBe(2);
    expect(compact.edges.find((e) => e.id === bc.id)!.animation).toBe('pulse');
  });
});
