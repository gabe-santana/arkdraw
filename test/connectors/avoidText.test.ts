/**
 * Regression fixtures for text that must stay readable: connectors never over
 * text or through cards they don't connect, labels never over nodes, text never
 * spilling out of its box. Each scene is checked with the layout lint
 * (src/lib/layoutCheck.ts): without `avoidText` the old routing still shows the
 * problem (files keep their look), with it the problem is gone.
 */
import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { ConnectorElement, DiagramElement, Doc, ShapeElement } from '@/model/types';
import { checkLayout, type LayoutIssueKind } from '@/lib/layoutCheck';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { labelInkBox } from '@/text/labelLayout';
import { useEditor } from '@/store/editor';
import { autosizeSelection } from '@/app/commands';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import { ConnectorBody } from '@/canvas/ElementBodies';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const doc = (...els: DiagramElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });
const text = (x: number, y: number, w: number, h: number, t: string): ShapeElement =>
  createShape('text', { x, y, w, h }, { fill: 'none', stroke: 'none', fontSize: 12, wrap: false, textAlign: 'left', verticalAlign: 'top' }, t);
const card = (x: number, y: number, w: number, h: number) => createShape('rectangle', { x, y, w, h }, { fill: '#ffffff' }, '');
const icon = (x: number, y: number, caption: string) => createShape('icon', { x, y, w: 48, h: 48 }, { fontSize: 12 }, caption);
const link = (a: ShapeElement, b: ShapeElement, extra: Partial<ConnectorElement> = {}) =>
  createConnector({ elementId: a.id, side: 'auto', x: 0, y: 0 }, { elementId: b.id, side: 'auto', x: 0, y: 0 }, extra);
const BAD: LayoutIssueKind[] = ['connector-crosses-text', 'connector-crosses-shape', 'connector-label-overlap'];
const problems = (d: Doc) => checkLayout(d).filter((i) => BAD.includes(i.kind)).map((i) => i.kind);

/** The same scene as an existing file (no flag) and as a new diagram (connectors are born with `avoidText`). */
function both(scene: (extra: Partial<ConnectorElement>) => Doc) {
  return { before: problems(scene({ avoidText: undefined })), after: problems(scene({})) };
}

describe('avoidText', () => {
  it('leaves an icon past its own caption', () => {
    const r = both((x) => {
      const a = icon(0, 0, 'Source caption');
      const b = icon(0, 300, 'Target caption');
      return doc(a, b, link(a, b, x));
    });
    expect(r.before).toContain('connector-crosses-text');
    expect(r.after).toEqual([]);
  });

  it('routes around a text element in the way', () => {
    const r = both((x) => {
      const a = card(0, 0, 60, 60);
      const b = card(0, 300, 60, 60);
      return doc(a, b, text(0, 150, 100, 30, 'Caption text'), link(a, b, x));
    });
    expect(r.before).toEqual(['connector-crosses-text']);
    expect(r.after).toEqual([]);
  });

  it("routes around a container's title", () => {
    const r = both((x) => {
      const box = createShape('container', { x: 0, y: 0, w: 400, h: 300 }, {}, '');
      const title = text(20, 40, 300, 20, 'A container title that runs wide');
      const inner = icon(180, 120, '');
      const outer = card(170, -200, 60, 60);
      return doc(box, title, inner, outer, link(outer, inner, x));
    });
    expect(r.before).toEqual(['connector-crosses-text']);
    expect(r.after).toEqual([]);
  });

  it('still routes around cards that are not its ends', () => {
    const r = both((x) => {
      const a = card(0, 0, 60, 60);
      const b = card(0, 300, 60, 60);
      return doc(a, b, card(-20, 150, 100, 30), link(a, b, x));
    });
    expect(r).toEqual({ before: [], after: [] });
  });

  it('moves the label off a node next to the line', () => {
    const r = both((x) => {
      const a = card(0, 0, 60, 60);
      const b = card(0, 400, 60, 60);
      return doc(a, b, card(50, 220, 60, 30), link(a, b, { text: 'a longer label', ...x }));
    });
    expect(r.before).toEqual(['connector-label-overlap']);
    expect(r.after).toEqual([]);
  });

  it('keeps a label placed by hand', () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 400, 60, 60);
    const c = link(a, b, { text: 'label', labelT: 0.5 });
    const g = connectorGeometryInDoc(c, doc(a, b, card(50, 220, 60, 30), c).elements);
    expect(g.label.y).toBeCloseTo(230, 0);
  });

  it('changes nothing for connectors without it', () => {
    const a = icon(0, 0, 'Source caption');
    const b = icon(0, 300, '');
    const c = link(a, b, { avoidText: undefined });
    const g = connectorGeometryInDoc(c, doc(a, b, c).elements);
    // Straight down from the bottom of the icon, through its caption, as before.
    expect(g.points[0]).toEqual({ x: 24, y: 48 });
  });
});

describe('autosize', () => {
  it('measures formatted text as drawn, not its markup', () => {
    const s = useEditor.getState();
    s.newDoc();
    const t = createShape('text', { x: 0, y: 0, w: 20, h: 20 }, { fontSize: 12, richText: true, wrap: false }, '<span style="font-weight:bold">Title</span>\nsecond line');
    s.addElements([t]);
    s.select([t.id]);
    autosizeSelection();
    const fitted = useEditor.getState().doc.elements[t.id] as ShapeElement;
    // Fits the text it draws…
    const ink = labelInkBox(fitted)!;
    expect(ink.w).toBeLessThanOrEqual(fitted.w);
    expect(ink.h).toBeLessThanOrEqual(fitted.h);
    // …and is not as wide as the raw markup.
    expect(fitted.w).toBeLessThan(150);
    expect(checkLayout(doc(fitted))).toEqual([]);
  });
});

describe('new vs existing diagrams', () => {
  it('new connectors are born with avoidText', () => {
    expect(createConnector({ x: 0, y: 0 }, { x: 10, y: 10 }).avoidText).toBe(true);
  });

  it('a .drawio file keeps its routing, and ArkDraw-made connectors keep theirs through .drawio', async () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const legacy = `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="a" vertex="1" parent="1" style="rounded=0;"><mxGeometry x="0" y="0" width="60" height="60" as="geometry"/></mxCell>
      <mxCell id="b" vertex="1" parent="1" style="rounded=0;"><mxGeometry x="0" y="300" width="60" height="60" as="geometry"/></mxCell>
      <mxCell id="e" edge="1" parent="1" source="a" target="b" style="edgeStyle=orthogonalEdgeStyle;"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`;
    const [old] = await importDrawioPages(legacy);
    expect((old.doc.elements.e as ConnectorElement).avoidText).toBeUndefined();

    const c = link(a, b);
    const [back] = await importDrawioPages(await exportDrawioPages([{ name: 'P', doc: doc(a, b, c) }]));
    expect((back.doc.elements[c.id] as ConnectorElement).avoidText).toBe(true);
  });
});

describe('text holes', () => {
  // Waypoints force the line through the caption: there is no way around it.
  const scene = (extra: Partial<ConnectorElement>) => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const caption = text(0, 150, 100, 30, 'Caption text');
    const c = link(a, b, { waypoints: [{ x: 30, y: 160 }], ...extra });
    return { d: doc(a, b, caption, c), c, caption };
  };

  it('cuts the line where it still runs through text', () => {
    const { d, c, caption } = scene({});
    const g = connectorGeometryInDoc(c, d.elements);
    expect(g.holes).toHaveLength(1);
    expect(g.holes![0].x).toBeLessThanOrEqual(labelInkBox(caption)!.x);
    const svg = renderToStaticMarkup(createElement(ConnectorBody, { el: c, lookup: (id: string) => d.elements[id], geometry: g }));
    expect(svg).toContain(`mask="url(#text-holes-${c.id})"`);
    // Readable: the lint no longer counts it.
    expect(problems(d)).toEqual([]);
  });

  it('leaves existing connectors uncut', () => {
    const { d, c } = scene({ avoidText: undefined });
    expect(connectorGeometryInDoc(c, d.elements).holes).toBeUndefined();
    expect(problems(d)).toEqual(['connector-crosses-text']);
  });
});
