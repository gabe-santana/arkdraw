import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { importGliffy, importer as gliffyImporter } from '@/io/import/gliffy';
import { importLucid, importer as lucidImporter } from '@/io/import/lucid';
import { isConnector, isShape, type Doc } from '@/model/types';

const shapes = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isShape);
const conns = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isConnector);

const text = (id: number, html: string) => ({
  x: 2, y: 0, rotation: 0, id, uid: null, width: 100, height: 20, order: 'auto',
  graphic: { type: 'Text', Text: { tid: null, valign: 'middle', html } }, children: [],
});
const shape = (id: number, uid: string, tid: string, x: number, y: number, label: string, extra: object = {}) => ({
  x, y, rotation: 0, id, uid, width: 120, height: 60, order: id,
  graphic: { type: 'Shape', Shape: { tid, strokeWidth: 2, strokeColor: '#333333', fillColor: '#FFFFFF', gradient: false, dropShadow: false, opacity: 1, ...extra } },
  children: label ? [text(id + 100, `<p style="text-align:center;"><span style="font-size:12px;">${label}</span></p>`)] : [],
});

const gliffyDoc = {
  contentType: 'application/gliffy+json',
  version: '1.3',
  stage: {
    background: '#FFFFFF',
    width: 800,
    height: 600,
    objects: [
      shape(0, 'com.gliffy.shape.flowchart.flowchart_v1.default.start_end', 'com.gliffy.stencil.start_end.flowchart_v1', 100, 20, 'Start'),
      shape(1, 'com.gliffy.shape.flowchart.flowchart_v1.default.decision', 'com.gliffy.stencil.diamond.basic_v1', 100, 140, 'Ready?', { fillColor: '#fff2cc' }),
      shape(2, 'com.gliffy.shape.flowchart.flowchart_v1.default.database', 'com.gliffy.stencil.database.flowchart_v1', 300, 140, 'DB'),
      shape(3, 'com.gliffy.shape.uml.uml_v2.sequence.actor', 'com.gliffy.stencil.actor.uml_v1', 500, 20, 'User'),
      shape(4, 'com.acme.weird', 'com.acme.stencil.thing.v1', 500, 200, 'Odd', { dashStyle: '4.0,4.0' }),
      {
        x: 100, y: 400, id: 5, uid: 'com.gliffy.shape.basic.basic_v1.default.group', width: 300, height: 80, rotation: 0, order: 5, graphic: null,
        children: [
          shape(6, 'com.gliffy.shape.basic.basic_v1.default.rectangle', 'com.gliffy.stencil.rectangle.basic_v1', 0, 0, 'In group A'),
          shape(7, 'com.gliffy.shape.basic.basic_v1.default.ellipse', 'com.gliffy.stencil.ellipse.basic_v1', 160, 10, 'In group B'),
        ],
      },
      {
        x: 0, y: 0, id: 8, uid: 'com.gliffy.shape.basic.basic_v1.default.line', width: 100, height: 100, rotation: 0, order: 8,
        graphic: { type: 'Line', Line: { strokeWidth: 2, strokeColor: '#000000', fillColor: 'none', dashStyle: null, startArrow: 0, endArrow: 1, interpolationType: 'linear', ortho: true, controlPath: [[160, 80], [160, 140]] } },
        children: [text(108, '<p>go</p>')],
        constraints: {
          constraints: [],
          startConstraint: { type: 'StartPositionConstraint', StartPositionConstraint: { nodeId: 0, py: 1, px: 0.5 } },
          endConstraint: { type: 'EndPositionConstraint', EndPositionConstraint: { nodeId: 1, py: 0, px: 0.5 } },
        },
      },
      {
        x: 220, y: 170, id: 9, uid: 'com.gliffy.shape.basic.basic_v1.default.line', width: 80, height: 0, rotation: 0, order: 9,
        graphic: { type: 'Line', Line: { strokeWidth: 1, strokeColor: '#ff0000', dashStyle: '4,4', startArrow: 0, endArrow: 0, controlPath: [[0, 0], [40, 30], [80, 0]] } },
        children: [],
        constraints: { constraints: [], startConstraint: { type: 'StartPositionConstraint', StartPositionConstraint: { nodeId: 1 } } },
      },
      { x: 600, y: 500, id: 10, uid: 'com.gliffy.shape.basic.basic_v1.default.text', width: 150, height: 30, rotation: 0, order: 10, graphic: { type: 'Text', Text: { html: '<p>Free <b>text</b></p>' } }, children: [] },
    ],
  },
  metadata: { title: 'untitled' },
};

describe('Gliffy import', () => {
  const d = importGliffy(JSON.stringify(gliffyDoc)).pages[0].doc;

  it('maps stencils, text and styles', () => {
    const s = shapes(d);
    expect(s).toHaveLength(8);
    const by = (t: string) => s.find((x) => x.text === t)!;
    expect(by('Start').kind).toBe('flow.terminator');
    expect(by('Ready?').kind).toBe('diamond');
    expect(by('Ready?').style.fill).toBe('#fff2cc');
    expect(by('DB').kind).toBe('cylinder');
    expect(by('User').kind).toBe('uml.actor');
    expect(by('Odd').kind).toBe('rectangle');
    expect(by('Odd').style.strokeStyle).toBe('dashed');
    expect(by('Free text').kind).toBe('text');
    expect([by('Start').x, by('Start').y, by('Start').w, by('Start').h]).toEqual([100, 20, 120, 60]);
  });

  it('offsets and groups children', () => {
    const s = shapes(d);
    const a = s.find((x) => x.text === 'In group A')!;
    const b = s.find((x) => x.text === 'In group B')!;
    expect([a.x, a.y]).toEqual([100, 400]);
    expect([b.x, b.y]).toEqual([260, 410]);
    expect(a.groupIds).toHaveLength(1);
    expect(a.groupIds).toEqual(b.groupIds);
    expect(b.kind).toBe('ellipse');
  });

  it('creates connectors from constraints and control paths', () => {
    const s = shapes(d);
    const cs = conns(d);
    expect(cs).toHaveLength(2);
    const go = cs.find((c) => c.text === 'go')!;
    expect(go.source.elementId).toBe(s.find((x) => x.text === 'Start')!.id);
    expect(go.target.elementId).toBe(s.find((x) => x.text === 'Ready?')!.id);
    expect(go.endArrow).toBe('triangle');
    expect(go.routing).toBe('orthogonal');
    const red = cs.find((c) => c !== go)!;
    expect(red.target.elementId).toBeUndefined();
    expect([red.target.x, red.target.y]).toEqual([300, 170]);
    expect(red.waypoints).toEqual([{ x: 260, y: 200 }]);
    expect(red.style.stroke).toBe('#ff0000');
    expect(red.style.strokeStyle).toBe('dashed');
  });

  it('warns about unknown shapes and detects files', () => {
    const res = importGliffy(JSON.stringify(gliffyDoc));
    expect(res.warnings!.some((w) => /1 unsupported/.test(w))).toBe(true);
    expect(gliffyImporter.detect!(JSON.stringify(gliffyDoc))).toBe(true);
    expect(() => importGliffy('{"foo":1}')).toThrow(/not a Gliffy/);
  });
});

const lucidDoc = {
  version: 1,
  pages: [
    {
      id: 'p1',
      title: 'Main Plan',
      shapes: [
        { id: 'c1', type: 'roundedRectangleContainer', boundingBox: { x: 0, y: 0, w: 600, h: 400 }, containerTitle: { text: 'Cluster' } },
        { id: 's1', type: 'terminator', boundingBox: { x: 40, y: 60, w: 160, h: 60 }, text: '<b>Start</b>' },
        {
          id: 's2', type: 'process', boundingBox: { x: 40, y: 200, w: 160, h: 70, rotation: 15 }, text: 'Work',
          style: { fill: { type: 'color', color: '#DBEAFE' }, stroke: { color: '#2563eb', width: 3, style: 'dashed' }, rounding: 20, textColor: '#111111' },
        },
        { id: 's3', type: 'database', boundingBox: { x: 700, y: 200, w: 100, h: 120 }, text: 'Store', opacity: 50 },
        { id: 's4', type: 'mysteryBlock', boundingBox: { x: 700, y: 0, w: 100, h: 50 }, text: '?' },
      ],
      lines: [
        {
          id: 'l1', lineType: 'elbow',
          endpoint1: { type: 'shapeEndpoint', style: 'none', shapeId: 's1', position: { x: 0.5, y: 1 } },
          endpoint2: { type: 'shapeEndpoint', style: 'arrow', shapeId: 's2', position: { x: 0.5, y: 0 } },
          text: [{ text: 'next', position: 0.3, side: 'middle' }],
        },
        {
          id: 'l2', lineType: 'straight',
          endpoint1: { type: 'shapeEndpoint', style: 'exactlyOne', shapeId: 's2' },
          endpoint2: { type: 'shapeEndpoint', style: 'zeroOrMore', shapeId: 's3' },
          stroke: { color: '#ff0000', width: 2 },
        },
        {
          id: 'l3', lineType: 'curved',
          endpoint1: { type: 'lineEndpoint', style: 'none', lineId: 'l2', position: 0.5 },
          endpoint2: { type: 'positionEndpoint', style: 'hollowArrow', position: { x: 500, y: 600 } },
        },
      ],
      groups: [{ id: 'g1', items: ['s1', 'g2'] }, { id: 'g2', items: ['s2', 'l1'] }],
    },
    { id: 'p2', title: '', shapes: [{ id: 'x', type: 'circle', boundingBox: { x: 0, y: 0, w: 50, h: 50 } }], lines: [] },
  ],
};

describe('Lucid Standard Import', () => {
  const res = importLucid(JSON.stringify(lucidDoc));

  it('reads pages, shapes, styles and containment', () => {
    expect(res.pages.map((p) => p.name)).toEqual(['Main Plan', 'Page 2']);
    const s = shapes(res.pages[0].doc);
    const by = (t: string) => s.find((x) => x.text === t)!;
    const cluster = by('Cluster');
    expect(cluster.kind).toBe('container');
    expect(res.pages[0].doc.order[0]).toBe(cluster.id);
    expect(by('Start').kind).toBe('flow.terminator');
    expect(by('Start').containerId).toBe(cluster.id);
    const work = by('Work');
    expect(work.kind).toBe('rectangle');
    expect(work.style).toMatchObject({ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 3, strokeStyle: 'dashed', radius: 10, textColor: '#111111' });
    expect(work.rotation).toBe(15);
    expect(by('Store').kind).toBe('cylinder');
    expect(by('Store').style.opacity).toBe(0.5);
    expect(by('Store').containerId).toBeUndefined();
    expect(by('?').kind).toBe('rectangle');
    expect(res.warnings!.some((w) => /unsupported Lucid shape/.test(w))).toBe(true);
    expect(shapes(res.pages[1].doc)[0].kind).toBe('ellipse');
  });

  it('maps lines, arrowheads, labels and groups', () => {
    const d = res.pages[0].doc;
    const s = shapes(d);
    const cs = conns(d);
    expect(cs).toHaveLength(3);
    const [l1, l2, l3] = cs;
    expect(l1.routing).toBe('orthogonal');
    expect(l1.source.side).toBe('bottom');
    expect(l1.target.side).toBe('top');
    expect(l1.endArrow).toBe('triangle');
    expect(l1.text).toBe('next');
    expect(l1.labelT).toBe(0.3);
    expect([l2.startArrow, l2.endArrow]).toEqual(['erOnlyOne', 'erZeroMany']);
    expect(l2.style.stroke).toBe('#ff0000');
    expect(l3.routing).toBe('curved');
    expect(l3.source.elementId).toBeUndefined();
    expect([l3.target.x, l3.target.y]).toEqual([500, 600]);
    expect(l3.endArrow).toBe('triangleOpen');
    const start = s.find((x) => x.text === 'Start')!;
    const work = s.find((x) => x.text === 'Work')!;
    expect(start.groupIds).toEqual(['g1']);
    expect(work.groupIds).toEqual(['g2', 'g1']);
    expect(l1.groupIds).toEqual(['g2', 'g1']);
  });

  it('opens .lucid zips', () => {
    const zip = zipSync({ 'document.json': strToU8(JSON.stringify(lucidDoc)), 'images/': new Uint8Array() });
    expect(importLucid(zip).pages).toHaveLength(2);
    expect(lucidImporter.detect!(zip, 'a.lucid')).toBe(true);
    expect(lucidImporter.detect!(JSON.stringify(lucidDoc))).toBe(true);
  });
});
