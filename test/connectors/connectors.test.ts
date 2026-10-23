import { beforeEach, describe, expect, it } from 'vitest';
import type { ConnectorElement, Doc, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import {
  ARROW_ORDER, ARROW_LABELS, arrowFilled, arrowInset, arrowParts, arrowSize, connectorGeometry, connectorGeometryInDoc,
  endpointPositions, polylinePath,
} from '@/lib/connectorGeometry';
import {
  attachToShape, connectionPointsOf, connectorAtPoint, defaultConnectionPoints, dependentConnectors, fractionToWorld,
  outlineFraction, worldToFraction,
} from '@/lib/connectionPoints';
import { resolveDrop } from '@/canvas/connectorDrop';
import { bandOutline, offsetPolyline } from '@/canvas/connectorShapes';
import { moveExtraLabel } from '@/canvas/ExtraLabelEditor';
import { CONNECTOR_PRESETS, presetPatch } from '@/panels/connectorPresets';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import { parsePages, serializePages } from '@/io/fileFormat';
import { newPage, useEditor } from '@/store/editor';

const docOf = (...els: Array<ShapeElement | ConnectorElement>): Doc => ({
  elements: Object.fromEntries(els.map((e) => [e.id, e])),
  order: els.map((e) => e.id),
});
const close = (a: { x: number; y: number }, b: { x: number; y: number }, eps = 0.01) => Math.hypot(a.x - b.x, a.y - b.y) < eps;

describe('connection points', () => {
  it('defaults per outline: 16 on rects, 8 on ellipses and diamonds', () => {
    expect(defaultConnectionPoints('rectangle')).toHaveLength(16);
    expect(defaultConnectionPoints('ellipse')).toHaveLength(8);
    expect(defaultConnectionPoints('diamond')).toHaveLength(8);
    const s = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 });
    s.connectionPoints = [{ x: 0.1, y: 0 }];
    expect(connectionPointsOf(s)).toEqual([{ x: 0.1, y: 0 }]);
  });

  it('maps fractions through rotation and flips, and back', () => {
    const s = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 });
    s.rotation = 90;
    s.flipH = true;
    const w = fractionToWorld(s, { x: 0, y: 0 });
    expect(close(worldToFraction(s, w), { x: 0, y: 0 })).toBe(true);
  });

  it('snaps to a nearby point (fixed or side), Shift attaches exactly on the outline, else floats', () => {
    const s = createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 });
    expect(attachToShape(s, { x: 2, y: 1 }, 18)).toMatchObject({ elementId: s.id, fixed: { x: 0, y: 0 } });
    expect(attachToShape(s, { x: 51, y: -2 }, 18)).toMatchObject({ elementId: s.id, side: 'top' });
    expect(attachToShape(s, { x: 40, y: 30 }, 5)).toMatchObject({ elementId: s.id, side: 'auto' });
    const exact = attachToShape(s, { x: 40, y: 57 }, 5, true);
    expect(exact.fixed).toEqual({ x: 0.4, y: 1 });
  });

  it('projects onto ellipse outlines', () => {
    const e = createShape('ellipse', { x: 0, y: 0, w: 100, h: 100 });
    const f = outlineFraction(e, { x: 90, y: 50 });
    expect(close(f, { x: 1, y: 0.5 }, 1e-3)).toBe(true);
  });
});

describe('fixed endpoints and spacing', () => {
  it('resolves exitX/exitY-style fixed points, offsets and perimeter spacing', () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 100 });
    const b = createShape('rectangle', { x: 300, y: 0, w: 100, h: 100 });
    const c = createConnector({ elementId: a.id, fixed: { x: 1, y: 0.25 }, x: 0, y: 0 }, { elementId: b.id, fixed: { x: 0, y: 0.75 }, fixedOffset: { x: 0, y: 5 }, x: 0, y: 0 }, { routing: 'straight' });
    const doc = docOf(a, b, c);
    const { a: s, b: t } = endpointPositions(c, (id) => doc.elements[id]);
    expect(s.point).toEqual({ x: 100, y: 25 });
    expect(t.point).toEqual({ x: 300, y: 80 });
    const spaced = { ...c, perimeterSpacing: 10 };
    const p = endpointPositions(spaced, (id) => doc.elements[id]);
    expect(p.a.point.x).toBeCloseTo(110);
  });
});

describe('connect to edges', () => {
  it('resolves an end attached to another connector, and survives cycles', () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 100 });
    const b = createShape('rectangle', { x: 400, y: 0, w: 100, h: 100 });
    const base = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'left', x: 0, y: 0 }, { routing: 'straight' });
    const branch = createConnector({ elementId: base.id, edgeT: 0.5, x: 0, y: 0 }, { x: 250, y: 300 }, { routing: 'straight' });
    const doc = docOf(a, b, base, branch);
    const g = connectorGeometryInDoc(branch, doc.elements);
    expect(g.start).toEqual({ x: 250, y: 50 });
    // A ↔ B attached to each other: depth-limited, no stack overflow.
    const x = createConnector({ elementId: 'y', edgeT: 0.5, x: 0, y: 0 }, { x: 100, y: 100 }, { routing: 'straight' });
    const y = createConnector({ elementId: x.id, edgeT: 0.5, x: 50, y: 50 }, { x: 200, y: 0 }, { routing: 'straight' });
    x.id = 'x';
    y.source.elementId = 'x';
    x.source.elementId = y.id;
    const loop = docOf(x, y);
    expect(() => connectorGeometryInDoc(x, loop.elements)).not.toThrow();
    expect(dependentConnectors(doc, base.id)).toEqual(new Set([base.id, branch.id]));
  });

  it('drops onto a connector (and not onto itself or its dependents)', () => {
    const base = createConnector({ x: 0, y: 0 }, { x: 200, y: 0 }, { routing: 'straight' });
    const other = createConnector({ x: 100, y: 100 }, { x: 100, y: 300 }, { routing: 'straight' });
    const doc = docOf(base, other);
    expect(connectorAtPoint(doc, { x: 50, y: 3 }, 5)?.t).toBeCloseTo(0.25);
    const drop = resolveDrop(doc, { x: 150, y: 2 }, null, { z: 1, selfConn: other.id });
    expect(drop.ep).toMatchObject({ elementId: base.id });
    expect(drop.ep.edgeT).toBeCloseTo(0.75);
    expect(resolveDrop(doc, { x: 150, y: 2 }, null, { z: 1, selfConn: base.id }).targetId).toBeNull();
  });
});

describe('arrowheads', () => {
  it('covers every draw.io marker with a label and geometry', () => {
    expect(ARROW_ORDER.length).toBe(Object.keys(ARROW_LABELS).length);
    for (const k of ARROW_ORDER) {
      if (k === 'none') continue;
      expect(arrowParts(k, { x: 0, y: 0 }, { x: 1, y: 0 }, 1).length).toBeGreaterThan(0);
    }
  });

  it('scales with size and honors the fill override', () => {
    expect(arrowSize(1)).toBe(11);
    expect(arrowSize(1, 12)).toBe(20);
    expect(arrowInset('triangle', 1, 12)).toBe(20);
    expect(arrowParts('triangle', { x: 0, y: 0 }, { x: 1, y: 0 }, 1, 6, false)[0].fill).toBe('none');
    expect(arrowParts('triangleOpen', { x: 0, y: 0 }, { x: 1, y: 0 }, 1, 6, true)[0].fill).toBe('solid');
    expect(arrowFilled('classic')).toBe(true);
    expect(arrowFilled('arrow', true)).toBe(false);
  });
});

describe('line jumps', () => {
  it('uses the configured jump size', () => {
    const d6 = polylinePath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0, [{ x: 50, y: 0 }], 'arc');
    const d12 = polylinePath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0, [{ x: 50, y: 0 }], 'arc', 12);
    expect(d6).toContain('L44,0 A6,6');
    expect(d12).toContain('L38,0 A12,12');
  });
});

describe('connector shapes', () => {
  it('offsets polylines and builds a closed arrow band', () => {
    const off = offsetPolyline([{ x: 0, y: 0 }, { x: 100, y: 0 }], 5);
    expect(off[0].y).toBeCloseTo(5);
    const d = bandOutline([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10, 20, 15, false, true);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('100,0'); // the tip
  });

  it('renders every connector shape without throwing', () => {
    const shapes = ['line', 'pipe', 'wire', 'link', 'arrow', 'flexArrow', 'filledEdge'] as const;
    for (const connectorShape of shapes) {
      const c = createConnector({ x: 0, y: 0 }, { x: 200, y: 100 }, { connectorShape });
      expect(() => connectorGeometry(c, () => undefined)).not.toThrow();
    }
  });
});

describe('presets', () => {
  it('applies routing, heads and dash in one patch', () => {
    const c = createConnector({ x: 0, y: 0 }, { x: 1, y: 1 });
    c.waypoints = [{ x: 5, y: 5 }];
    const dep = CONNECTOR_PRESETS.find((p) => p.id === 'dependency')!;
    const patch = presetPatch(c, dep);
    expect(patch).toMatchObject({ routing: 'straight', endArrow: 'arrow' });
    expect(patch.style?.strokeStyle).toBe('dashed');
  });
});

describe('extra labels', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('drags along the path', () => {
    const c = createConnector({ x: 0, y: 0 }, { x: 200, y: 0 }, { routing: 'straight' });
    c.labels = [{ id: 'l1', text: 'one', t: 0.25 }];
    useEditor.getState().addElements([c]);
    moveExtraLabel(useEditor.getState().doc.elements[c.id] as ConnectorElement, 0, { x: 150, y: 20 });
    const l = (useEditor.getState().doc.elements[c.id] as ConnectorElement).labels![0];
    expect(l.t).toBeCloseTo(0.75);
    expect(Math.abs(l.offset!)).toBe(20);
  });
});

describe('round trips', () => {
  const build = () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 100 }, {}, 'A');
    const b = createShape('rectangle', { x: 400, y: 0, w: 100, h: 100 }, {}, 'B');
    const c = createConnector(
      { elementId: a.id, fixed: { x: 1, y: 0.25 }, x: 100, y: 25 },
      { elementId: b.id, fixed: { x: 0, y: 0.75 }, fixedOffset: { x: 0, y: 4 }, x: 400, y: 79 },
      { routing: 'straight', startArrow: 'diamondThin', endArrow: 'classic', text: 'main' },
    );
    Object.assign(c, {
      endSize: 12, startFill: false, lineJumps: 'gap', jumpSize: 10, connectorShape: 'flexArrow', bandWidth: 14, headWidth: 30, perimeterSpacing: 4,
      labels: [{ id: 'x', text: 'extra', t: 0.25, offset: 10 }],
    });
    const branch = createConnector({ elementId: c.id, edgeT: 0.5, x: 250, y: 52 }, { x: 250, y: 300 }, { routing: 'straight' });
    return { a, b, c, branch };
  };

  it('survives draw.io export → import', async () => {
    const { a, b, c, branch } = build();
    a.connectionPoints = [{ x: 0.2, y: 0 }, { x: 1, y: 0.8 }];
    const xml = await exportDrawioPages([{ name: 'P', doc: docOf(a, b, c, branch) }]);
    expect(xml).toContain('exitX=1');
    expect(xml).toContain('entryDy=4');
    expect(xml).toContain('endSize=12');
    expect(xml).toContain('jumpSize=10');
    expect(xml).toContain('shape=flexArrow');
    expect(xml).toContain('edgeLabel');
    expect(xml).toContain(`source="${c.id}"`);
    const back = (await importDrawioPages(xml))[0].doc;
    expect((back.elements[a.id] as ShapeElement).connectionPoints).toEqual([{ x: 0.2, y: 0 }, { x: 1, y: 0.8 }]);
    const c2 = back.elements[c.id] as ConnectorElement;
    expect(c2.source.fixed).toEqual({ x: 1, y: 0.25 });
    expect(c2.target.fixedOffset).toEqual({ x: 0, y: 4 });
    expect(c2.startArrow).toBe('diamondThin');
    expect(c2.startFill).toBe(false);
    expect(c2.endArrow).toBe('classic');
    expect(c2.endSize).toBe(12);
    expect(c2.lineJumps).toBe('gap');
    expect(c2.jumpSize).toBe(10);
    expect(c2.connectorShape).toBe('flexArrow');
    expect(c2.bandWidth).toBe(14);
    expect(c2.headWidth).toBe(30);
    expect(c2.perimeterSpacing).toBe(4);
    expect(c2.text).toBe('main');
    expect(c2.labels?.map((l) => [l.text, l.t, l.offset])).toEqual([['extra', 0.25, 10]]);
    const br = back.elements[branch.id] as ConnectorElement;
    expect(br.source.elementId).toBe(c.id);
    expect(br.source.edgeT).toBeCloseTo(0.5, 1);
  });

  it('imports hollow block markers as the open twin and side midpoints as sides', async () => {
    const xml = `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="a" vertex="1" parent="1" style="rounded=0;"><mxGeometry x="0" y="0" width="100" height="100" as="geometry"/></mxCell>
      <mxCell id="b" vertex="1" parent="1" style="rounded=0;"><mxGeometry x="300" y="0" width="100" height="100" as="geometry"/></mxCell>
      <mxCell id="e" edge="1" parent="1" source="a" target="b" style="endArrow=block;endFill=0;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`;
    const e = (await importDrawioPages(xml))[0].doc.elements.e as ConnectorElement;
    expect(e.endArrow).toBe('triangleOpen');
    expect(e.source.side).toBe('right');
  });

  it('survives the .opendraw format (including elbow routings)', () => {
    const { a, b, c, branch } = build();
    c.routing = 'elbow-v';
    const page = newPage('P', docOf(a, b, c, branch));
    const back = parsePages(serializePages([page]))[0].doc;
    const c2 = back.elements[c.id] as ConnectorElement;
    expect(c2.routing).toBe('elbow-v');
    expect(c2.target.fixedOffset).toEqual({ x: 0, y: 4 });
    expect((back.elements[branch.id] as ConnectorElement).source.edgeT).toBe(0.5);
    expect(c2.labels).toHaveLength(1);
  });
});
