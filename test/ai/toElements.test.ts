import { describe, expect, it } from 'vitest';
import { convertSpec, specToElements } from '@/ai/generate/toElements';
import { C4_COLORS } from '@/ai/generate/resolve';
import { isConnector, isShape, type ShapeElement } from '@/model/types';
import { awsSpec, c4Spec, flowSpec } from './fixtures';

describe('specToElements', () => {
  it('creates one shape per node and one connector per edge, attached by id', () => {
    const els = specToElements(flowSpec, { x: 0, y: 0 });
    const shapes = els.filter(isShape);
    const conns = els.filter(isConnector);
    expect(shapes).toHaveLength(flowSpec.nodes.length);
    expect(conns).toHaveLength(flowSpec.edges.length);
    const ids = new Set(shapes.map((s) => s.id));
    for (const c of conns) {
      expect(ids.has(c.source.elementId!)).toBe(true);
      expect(ids.has(c.target.elementId!)).toBe(true);
      expect(c.source.side).toBe('auto');
      expect(c.target.side).toBe('auto');
    }
    expect(new Set(els.map((e) => e.id)).size).toBe(els.length);
    expect(conns.find((c) => c.text === 'Yes')).toBeTruthy();
  });

  it('centers the diagram on the origin', () => {
    const { bounds } = convertSpec(flowSpec, { x: 1000, y: -500 });
    expect(bounds.x + bounds.w / 2).toBeCloseTo(1000, 0);
    expect(bounds.y + bounds.h / 2).toBeCloseTo(-500, 0);
    const tl = convertSpec(flowSpec, { x: 10, y: 20 }, { anchor: 'topLeft' });
    expect(tl.bounds.x).toBe(10);
    expect(tl.bounds.y).toBe(20);
  });

  it('sets containerId, icons, and puts containers behind their children', () => {
    const { elements, idMap } = convertSpec(awsSpec, { x: 0, y: 0 });
    const byId = new Map(elements.map((e) => [e.id, e]));
    const web1 = byId.get(idMap.get('web1')!) as ShapeElement;
    expect(web1.kind).toBe('icon');
    expect(web1.icon).toBe('aws/compute/amazon-ec2.svg');
    expect(web1.containerId).toBe(idMap.get('priv'));
    expect((byId.get(idMap.get('priv')!) as ShapeElement).containerId).toBe(idMap.get('vpc'));
    const order = elements.map((e) => e.id);
    for (const child of ['vpc', 'pub', 'web1', 'db']) {
      const parentSpecId = awsSpec.nodes.find((n) => n.id === child)!.parent!;
      expect(order.indexOf(idMap.get(parentSpecId)!)).toBeLessThan(order.indexOf(idMap.get(child)!));
    }
    // Connectors are on top.
    const firstConn = elements.findIndex(isConnector);
    expect(elements.slice(firstConn).every(isConnector)).toBe(true);
    // Provider-style container colors.
    expect((byId.get(idMap.get('vpc')!) as ShapeElement).style.stroke).toBe('#8C4FFF');
  });

  it('applies C4 conventions and text format', () => {
    const { elements, idMap } = convertSpec(c4Spec, { x: 0, y: 0 });
    const get = (id: string) => elements.find((e) => e.id === idMap.get(id)) as ShapeElement;
    expect(get('customer').kind).toBe('c4.person');
    expect(get('customer').style.fill).toBe(C4_COLORS.person.fill);
    expect(get('api').kind).toBe('c4.box');
    expect(get('api').style.fill).toBe(C4_COLORS.container.fill);
    expect(get('api').text).toBe('API\n[Container: Node.js]\n\nOrders and catalog.');
    expect(get('pay').style.fill).toBe(C4_COLORS.external.fill);
    expect(get('pay').text).toContain('[External System]');
    const boundary = get('shop');
    expect(boundary.kind).toBe('c4.boundary');
    expect(boundary.style.fill).toBe('none');
    expect(boundary.style.strokeStyle).toBe('dashed');
    expect(boundary.text).toBe('E-commerce\n[Software System]');
    expect(get('db').containerId).toBe(boundary.id);
  });

  it('formats UML classes and grows them to fit', () => {
    const els = specToElements(
      {
        type: 'class',
        nodes: [
          { id: 'u', kind: 'uml.class', text: 'User', attributes: ['- id: UUID', '- email: string'], methods: ['+ login(): void'] },
          { id: 'a', kind: 'uml.class', text: 'Admin' },
        ],
        edges: [{ from: 'a', to: 'u', endArrow: 'triangleOpen' }],
      },
      { x: 0, y: 0 },
    );
    const user = els.find((e) => isShape(e) && e.text.startsWith('User')) as ShapeElement;
    expect(user.text).toBe('User\n--\n- id: UUID\n- email: string\n--\n+ login(): void');
    expect(user.h).toBeGreaterThan(90);
    expect(els.find(isConnector)!.endArrow).toBe('triangleOpen');
  });

  it('uses crow-foot defaults for ERD edges', () => {
    const els = specToElements(
      {
        type: 'erd',
        nodes: [
          { id: 'a', kind: 'erd.entity', text: 'author', attributes: ['id PK'] },
          { id: 'p', kind: 'erd.entity', text: 'post', attributes: ['id PK', 'author_id FK'] },
        ],
        edges: [{ from: 'a', to: 'p' }],
      },
      { x: 0, y: 0 },
    );
    const c = els.find(isConnector)!;
    expect(c.startArrow).toBe('erOnlyOne');
    expect(c.endArrow).toBe('erZeroMany');
  });

  it('builds sequence diagrams from lifelines and ordered messages', () => {
    const els = specToElements(
      {
        type: 'sequence',
        nodes: [
          { id: 'u', kind: 'uml.lifeline', text: 'Browser' },
          { id: 's', kind: 'uml.lifeline', text: 'Server' },
        ],
        edges: [
          { from: 'u', to: 's', label: 'GET /' },
          { from: 's', to: 'u', label: '200 OK', dashed: true },
        ],
      },
      { x: 0, y: 0 },
    );
    const lifelines = els.filter(isShape);
    expect(lifelines.every((l) => l.kind === 'uml.lifeline')).toBe(true);
    const msgs = els.filter(isConnector);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].source.y).toBeLessThan(msgs[1].source.y);
    expect(msgs[1].style.strokeStyle).toBe('dashed');
    expect(msgs[0].source.x).toBeLessThan(msgs[0].target.x);
  });
});
