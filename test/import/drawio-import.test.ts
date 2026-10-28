import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import type { ConnectorElement, ShapeElement } from '@/model/types';

const cell = (id: string, image: string) =>
  `<mxCell id="${id}" value="" style="aspect=fixed;html=1;image;image=${image};" vertex="1" parent="1"><mxGeometry width="64" height="64" as="geometry"/></mxCell>`;
const file = (...cells: string[]) =>
  `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`;

describe('draw.io built-in images', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps azure2 images to the bundled pack and others to app.diagrams.net', async () => {
    const pack = readFileSync('public/icons/azure/index.json', 'utf8');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pack)));
    const [{ doc }] = await importDrawioPages(file(
      cell('vnet', 'img/lib/azure2/networking/Virtual_Networks.svg'),
      cell('moved', 'img/lib/azure2/management_governance/Application_Insights.svg'),
      cell('gone', 'img/lib/azure2/networking/Private_Endpoint.svg'),
      cell('old', 'img/lib/mscae/Key.svg'),
      cell('abs', 'https://example.com/a.svg'),
    ));
    const icon = (id: string) => (doc.elements[id] as ShapeElement).icon;
    expect(icon('vnet')).toBe('azure/networking/virtual-networks.svg');
    expect(icon('moved')).toBe('azure/dev-ops/application-insights.svg');
    expect(icon('gone')).toBe('https://app.diagrams.net/img/lib/azure2/networking/Private_Endpoint.svg');
    expect(icon('old')).toBe('https://app.diagrams.net/img/lib/mscae/Key.svg');
    expect(icon('abs')).toBe('https://example.com/a.svg');
  });
});

describe('draw.io vendor shapes', () => {
  afterEach(() => vi.unstubAllGlobals());
  const vertex = (id: string, style: string) =>
    `<mxCell id="${id}" value="" style="${style}" vertex="1" parent="1"><mxGeometry width="48" height="48" as="geometry"/></mxCell>`;

  it('maps aws4 resource icons to the bundled AWS pack and keeps unknown ones as boxes', async () => {
    const pack = readFileSync('public/icons/aws/index.json', 'utf8');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pack)));
    const [{ doc }] = await importDrawioPages(file(
      vertex('lambda', 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;fillColor=#ED7100;'),
      vertex('sqs', 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;'),
      vertex('nope', 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.not_a_service;'),
    ));
    const el = (id: string) => doc.elements[id] as ShapeElement;
    expect(el('lambda').icon).toBe('aws/compute/aws-lambda.svg');
    expect(el('sqs').icon).toBe('aws/application-integration/amazon-simple-queue-service.svg');
    expect([el('nope').kind, el('nope').icon]).toEqual(['rectangle', undefined]);
  });

  it('maps redrawn draw.io stencils to their kinds', async () => {
    const [{ doc }] = await importDrawioPages(file(
      vertex('u', 'shape=mxgraph.azure.user;fillColor=#00BEF2;'),
      vertex('c', 'shape=mxgraph.gcp2.check;'),
      vertex('x', 'shape=mxgraph.mockup.markup.redX;'),
      vertex('k', 'shape=mxgraph.office.concepts.clock;'),
      vertex('j', 'shape=mxgraph.weblogos.json'),
      vertex('cl', 'shape=mxgraph.azure.cloud;'),
      vertex('ic', 'shape=mxgraph.ios7.icons.cloud;'),
    ));
    const kinds = ['u', 'c', 'x', 'k', 'j', 'cl', 'ic'].map((id) => (doc.elements[id] as ShapeElement).kind);
    expect(kinds).toEqual(['drawio.user', 'drawio.check', 'drawio.redX', 'drawio.clock', 'drawio.json', 'cloud', 'cloud']);
  });
});

describe('draw.io geometry and labels', () => {
  const vertex = (id: string, style: string, w = 200, h = 100, x = 0, y = 0, parent = '1', value = '') =>
    `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;

  it('scales relative arcSize with the shape and keeps absolute ones', async () => {
    const [{ doc }] = await importDrawioPages(file(
      vertex('def', 'rounded=1;'),
      vertex('pct', 'rounded=1;arcSize=20;'),
      vertex('abs', 'rounded=1;absoluteArcSize=1;arcSize=20;'),
      vertex('sq', 'whiteSpace=wrap;'),
      vertex('ext', 'shape=ext;double=1;rounded=1;dashed=1;'),
    ));
    const r = (id: string) => (doc.elements[id] as ShapeElement).style.radius;
    expect([r('def'), r('pct'), r('abs'), r('sq'), r('ext')]).toEqual([15, 20, 10, 0, 15]);
  });

  it('only wraps labels with whiteSpace=wrap, and exports wrapping back', async () => {
    const [{ doc }] = await importDrawioPages(file(vertex('nw', 'text;html=1;'), vertex('w', 'text;html=1;whiteSpace=wrap;')));
    expect((doc.elements.nw as ShapeElement).style.wrap).toBe(false);
    expect((doc.elements.w as ShapeElement).style.wrap).toBeUndefined();
    const [{ doc: back }] = await importDrawioPages(await exportDrawioPages([{ name: 'P', doc }]));
    expect((back.elements.nw as ShapeElement).style.wrap).toBe(false);
    expect((back.elements.w as ShapeElement).style.wrap).toBeUndefined();
  });

  it('offsets edge points by a vertex parent and keeps child label formatting', async () => {
    const [{ doc }] = await importDrawioPages(file(
      vertex('box', 'container=1;', 400, 300, 100, 50),
      `<mxCell id="e" value="" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="box"><mxGeometry relative="1" as="geometry">` +
        `<mxPoint x="10" y="20" as="sourcePoint"/><mxPoint x="60" y="20" as="targetPoint"/><Array as="points"><mxPoint x="30" y="40"/></Array></mxGeometry></mxCell>`,
      vertex('lbl', 'edgeLabel;html=1;', 1, 1, 0, 0, 'e', '&lt;font style=&quot;font-size: 30px;&quot;&gt;PEERING&lt;/font&gt;'),
    ));
    const e = doc.elements.e as ConnectorElement;
    expect([e.source.x, e.source.y, e.target.x, e.target.y]).toEqual([110, 70, 160, 70]);
    expect(e.waypoints).toEqual([{ x: 130, y: 90 }]);
    expect(e.style.richText).toBe(true);
    expect(e.text).toContain('30');
  });
});
