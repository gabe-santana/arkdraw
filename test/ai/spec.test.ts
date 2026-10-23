import { describe, expect, it } from 'vitest';
import { validateSpec } from '@/ai/generate/spec';

describe('validateSpec', () => {
  it('accepts a well-formed spec and normalises aliases', () => {
    const r = validateSpec({
      type: 'flowchart',
      direction: 'lr',
      nodes: [
        { id: 'a', kind: 'start', text: 'Start' },
        { id: 'b', kind: 'decision', label: 'OK?' },
        { id: 'c', kind: 'process', text: 'Do it' },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { from: 'b', to: 'c', label: 'Yes', endArrow: 'arrow' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.direction).toBe('LR');
    expect(r.spec.nodes.map((n) => n.kind)).toEqual(['flow.terminator', 'diamond', 'rectangle']);
    expect(r.spec.nodes[1].text).toBe('OK?');
    expect(r.spec.edges[0]).toEqual({ from: 'a', to: 'b' });
    expect(r.spec.edges[1].endArrow).toBe('arrow');
  });

  it('accepts a JSON string and a { spec } wrapper', () => {
    const spec = { type: 'generic', nodes: [{ id: 'x', kind: 'rectangle', text: 'X' }], edges: [] };
    expect(validateSpec(JSON.stringify(spec)).ok).toBe(true);
    expect(validateSpec({ spec }).ok).toBe(true);
  });

  it('reports hard errors the model must fix', () => {
    const r = validateSpec({
      type: 'generic',
      nodes: [
        { id: 'a', kind: 'rectangle', text: 'A' },
        { id: 'a', kind: 'rectangle', text: 'dup' },
        { id: 'b', kind: 'rectangle', text: 'B', parent: 'ghost' },
        { kind: 'rectangle', text: 'no id' },
      ],
      edges: [{ from: 'a', to: 'zzz' }, { from: 'a' }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toMatch(/Duplicate node id "a"/);
    expect(r.errors.join('\n')).toMatch(/unknown parent "ghost"/);
    expect(r.errors.join('\n')).toMatch(/needs an `id`/);
    expect(r.errors.join('\n')).toMatch(/unknown node "zzz"/);
    expect(r.errors.join('\n')).toMatch(/needs `from` and `to`/);
  });

  it('rejects empty specs and containment cycles', () => {
    expect(validateSpec({ nodes: [], edges: [] }).ok).toBe(false);
    const r = validateSpec({
      nodes: [
        { id: 'a', kind: 'container', text: 'A', parent: 'b' },
        { id: 'b', kind: 'container', text: 'B', parent: 'a' },
      ],
      edges: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/cycle/);
  });

  it('repairs soft problems with warnings', () => {
    const r = validateSpec({
      type: 'weird',
      nodes: [
        { id: 'a', kind: 'blob', text: 'A', style: { fill: 'red', stroke: '#123456' } },
        { id: 'g', kind: 'rectangle', text: 'Group' },
        { id: 'b', kind: 'icon', text: 'No icon', parent: 'g' },
      ],
      edges: [{ from: 'a', to: 'b', endArrow: 'bogus', routing: 'zigzag' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.type).toBe('generic');
    expect(r.spec.nodes[0].kind).toBe('rectangle');
    expect(r.spec.nodes[0].style).toEqual({ stroke: '#123456' });
    expect(r.spec.nodes[1].kind).toBe('container'); // has children
    expect(r.spec.nodes[2].kind).toBe('rectangle'); // icon without icon path
    expect(r.spec.edges[0].endArrow).toBeUndefined();
    expect(r.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it('checks icons against the installed packs', () => {
    const known = new Set(['aws/compute/amazon-ec2.svg']);
    const r = validateSpec(
      {
        type: 'cloud',
        nodes: [
          { id: 'a', kind: 'icon', text: 'EC2', icon: 'aws/compute/amazon-ec2' },
          { id: 'b', kind: 'icon', text: 'Fake', icon: 'aws/compute/made-up.svg' },
        ],
        edges: [],
      },
      { knownIcons: known },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.nodes[0]).toMatchObject({ kind: 'icon', icon: 'aws/compute/amazon-ec2.svg' });
    expect(r.spec.nodes[1].kind).toBe('rectangle');
    expect(r.spec.nodes[1].icon).toBeUndefined();
  });

  it('maps c4.external to an external system', () => {
    const r = validateSpec({ type: 'c4', nodes: [{ id: 'p', kind: 'c4.external', text: 'Stripe' }], edges: [] });
    expect(r.ok && r.spec.nodes[0]).toMatchObject({ kind: 'c4.system', external: true });
  });
});
