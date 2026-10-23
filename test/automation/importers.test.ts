import { describe, expect, it } from 'vitest';
import { isConnector, isShape } from '@/model/types';
import { importerFor } from '@/io/import';
import { parseDot, parseDotDiagram, dotColor } from '@/io/import/dot';
import { extractFromHtml, importHtml } from '@/io/import/html';
import { serializePages } from '@/io/fileFormat';
import { newPage } from '@/store/editor';
import { createShape } from '@/model/defaults';
import { base64Encode, utf8Encode } from '@/io/import/_shared';

describe('Graphviz DOT import', () => {
  it('parses nodes, chains, sets, defaults, attributes and clusters', () => {
    const g = parseDot(`
      // comment
      digraph "G" {
        rankdir=LR; node [shape=box];
        a -> b -> c [color=red];
        d -> {e f};
        subgraph cluster_x { label="X"; e; f [label="Eff"]; }
        subgraph plain { g }
        a [label="Alpha\\nline", fillcolor="#ff0000", style=filled];
      }`);
    expect(g.directed).toBe(true);
    expect(g.attrs.rankdir).toBe('LR');
    expect([...g.nodes.keys()].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(g.edges.map((e) => `${e.from}${e.to}`)).toEqual(['ab', 'bc', 'de', 'df']);
    expect(g.edges[0].attrs.color).toBe('red');
    expect(g.nodes.get('a')!.attrs).toMatchObject({ shape: 'box', label: 'Alpha\nline' });
    expect([...g.clusters.keys()]).toEqual(['cluster_x']);
    expect(g.nodes.get('f')!.cluster).toBe('cluster_x');
    expect(g.nodes.get('g')!.cluster).toBeUndefined();
  });

  it('builds a laid-out diagram with containers and styles', () => {
    const res = parseDotDiagram(`graph { subgraph cluster_1 { label=Team; a; b } a -- b; b -- c [style=dashed]; c [shape=cylinder, color=blue] }`);
    const els = Object.values(res.pages[0].doc.elements);
    const shapes = els.filter(isShape);
    const container = shapes.find((s) => s.kind === 'container');
    expect(container?.text).toBe('Team');
    expect(shapes.filter((s) => s.containerId === container?.id)).toHaveLength(2);
    const cyl = shapes.find((s) => s.text === 'c')!;
    expect(cyl.kind).toBe('cylinder');
    expect(cyl.style.stroke).toBe('#0000ff');
    const conns = els.filter(isConnector);
    expect(conns).toHaveLength(2);
    expect(conns.every((c) => c.endArrow === 'none')).toBe(true);
    expect(conns.some((c) => c.style.strokeStyle === 'dashed')).toBe(true);
  });

  it('is discovered and detects DOT text; colours parse', async () => {
    expect(importerFor('x.gv')?.id).toBe('dot');
    const imp = importerFor('x.dot')!;
    expect(imp.detect?.('/* x */ digraph { a -> b }')).toBe(true);
    expect(imp.detect?.('flowchart TD')).toBe(false);
    expect((await imp.run(imp.example!)).pages[0].doc.order.length).toBeGreaterThan(5);
    expect(dotColor('0.000 1.000 1.000')).toBe('#ff0000');
    expect(dotColor('red:blue')).toBe('#ff0000');
    expect(() => parseDot('flowchart')).toThrow();
  });
});

describe('editable HTML import', () => {
  it('reads the OpenDraw HTML payload', async () => {
    const json = serializePages([newPage('Hello', { elements: { s: { ...createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 }), id: 's' } }, order: ['s'] })]);
    const html = `<!doctype html><html><body><script type="application/vnd.opendraw+json" id="opendraw-diagram">${base64Encode(utf8Encode(json))}</script></body></html>`;
    expect(extractFromHtml(html)?.kind).toBe('opendraw');
    const res = await importHtml(html);
    expect(res.pages[0].name).toBe('Hello');
    expect(res.pages[0].doc.elements.s).toBeTruthy();
    expect(importerFor('x.html')?.id).toBe('html');
  });

  it('reads draw.io data-mxgraph HTML', async () => {
    const xml = '<mxfile><diagram name="D"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="v" value="Hi" vertex="1" parent="1"><mxGeometry x="10" y="10" width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>';
    const attr = JSON.stringify({ highlight: '#0000ff', xml }).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html><html><body><div class="mxgraph" style="max-width:100%" data-mxgraph="${attr}"></div></body></html>`;
    const res = await importHtml(html);
    expect(res.pages[0].name).toBe('D');
    expect(Object.values(res.pages[0].doc.elements).some((e) => e.text === 'Hi')).toBe(true);
    await expect(importHtml('<html><body>nothing</body></html>')).rejects.toThrow(/no embedded diagram/);
  });
});
