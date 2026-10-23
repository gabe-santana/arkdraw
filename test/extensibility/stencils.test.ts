/**
 * mxGraph stencil XML: parsing, rendering, conversion of built-ins, mxGraph
 * `shape=stencil(…)` round trip and stencil libraries.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createShape, DEFAULT_STYLE } from '@/model/defaults';
import type { ShapeElement } from '@/model/types';
import { parseStencil, splitStencilSet, StencilError, stencilPoints } from '@/stencils/parse';
import { renderStencil } from '@/stencils/render';
import { compressStencil, decompressStencil, stencilFromStyleValue, stencilStyleValue } from '@/stencils/codec';
import { STENCIL_SHAPE, renderStencilXml } from '@/stencils/shape';
import { stencilFromShape, svgPathToStencil } from '@/stencils/convert';
import { parseStencilLibrary } from '@/stencils/library';
import { registerStencil, resolveStencil } from '@/stencils/registry';
import { SAMPLE_STENCIL } from '@/stencils/StencilEditorDialog';
import { SHAPES } from '@/shapes/registry';
import { exportDrawio, importDrawio } from '@/io/drawio';
import { parseLibrary } from '@/panels/userLibraries';

const STYLE = { ...DEFAULT_STYLE, fill: '#ffffff', stroke: '#111111', strokeWidth: 2 };

const BOX = `<shape name="Box" w="100" h="50" aspect="variable" strokewidth="inherit">
  <connections>
    <constraint x="0.5" y="0" perimeter="1" name="N"/>
    <constraint x="1" y="0.5" perimeter="0" name="E"/>
  </connections>
  <background>
    <path><move x="0" y="0"/><line x="100" y="0"/><quad x1="100" y1="50" x2="50" y2="50"/><curve x1="25" y1="50" x2="0" y2="40" x3="0" y3="25"/><close/></path>
  </background>
  <foreground>
    <fillstroke/>
    <save/>
    <strokecolor color="#ff0000"/>
    <strokewidth width="1" fixed="1"/>
    <dashed dashed="1"/>
    <dashpattern pattern="2 2"/>
    <path><move x="10" y="10"/><arc rx="10" ry="5" x-axis-rotation="0" large-arc-flag="0" sweep-flag="1" x="30" y="10"/></path>
    <stroke/>
    <restore/>
    <roundrect x="60" y="10" w="30" h="20" arcsize="25"/>
    <fill/>
    <ellipse x="40" y="30" w="10" h="10"/>
    <fillstroke/>
    <fontsize size="10"/>
    <text str="Hi" x="50" y="5" align="center" valign="top"/>
    <bogus/>
  </foreground>
</shape>`;

describe('stencil parser', () => {
  it('reads the shape header, connections and op lists', () => {
    const st = parseStencil(BOX);
    expect(st).toMatchObject({ name: 'Box', w: 100, h: 50, aspect: 'variable', strokewidth: 'inherit' });
    expect(st.connections).toEqual([
      { x: 0.5, y: 0, perimeter: true, name: 'N' },
      { x: 1, y: 0.5, perimeter: false, name: 'E' },
    ]);
    expect(st.background).toHaveLength(1);
    expect(st.background[0]).toMatchObject({ op: 'path' });
    expect(st.foreground.map((o) => o.op)).toEqual([
      'fillstroke', 'save', 'strokecolor', 'strokewidth', 'dashed', 'dashpattern', 'path', 'stroke', 'restore',
      'roundrect', 'fill', 'ellipse', 'fillstroke', 'fontsize', 'text',
    ]);
    expect(st.unsupported).toEqual(['bogus']);
  });

  it('reports bad XML and missing shapes', () => {
    expect(() => parseStencil('<shape')).toThrow(StencilError);
    expect(() => parseStencil('<foo/>')).toThrow(/<shape>/);
  });

  it('takes the first shape of a <shapes> set, and splits sets', () => {
    const set = `<shapes name="Set"><shape name="A" w="10" h="10"><background><rect x="0" y="0" w="10" h="10"/></background><foreground><fillstroke/></foreground></shape><shape name="B" w="20" h="5"/></shapes>`;
    expect(parseStencil(set).name).toBe('A');
    expect(splitStencilSet(set).map((s) => [s.name, s.w, s.h])).toEqual([
      ['A', 10, 10],
      ['B', 20, 5],
    ]);
  });

  it('maps constraints to connection points', () => {
    expect(stencilPoints(BOX)).toEqual([{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }]);
    expect(stencilPoints('<shape w="1" h="1"/>')).toBeUndefined();
  });
});

describe('stencil renderer', () => {
  it('produces stable primitives (snapshot)', () => {
    expect(renderStencil(parseStencil(BOX), 200, 100, STYLE)).toMatchSnapshot();
  });

  it('scales variable stencils to the box and keeps fixed ones centered', () => {
    const rect = (aspect: string) => `<shape w="100" h="50" aspect="${aspect}" strokewidth="inherit"><background><rect x="0" y="0" w="100" h="50"/></background><foreground><fillstroke/></foreground></shape>`;
    expect((renderStencil(parseStencil(rect('variable')), 200, 200, STYLE)[0] as { d: string }).d).toBe('M0,0 H200 V200 H0 Z');
    expect((renderStencil(parseStencil(rect('fixed')), 200, 200, STYLE)[0] as { d: string }).d).toBe('M0,50 H200 V150 H0 Z');
  });

  it('honors save/restore, inherit vs. scaled stroke width and none colors', () => {
    const prims = renderStencil(parseStencil(BOX), 200, 100, STYLE);
    const paths = prims.filter((p) => p.type === 'path') as Array<{ stroke: string; strokeWidth: number; dash?: string; fill: string }>;
    expect(paths[0]).toMatchObject({ fill: '#ffffff', stroke: '#111111', strokeWidth: 2 });
    expect(paths[1]).toMatchObject({ fill: 'none', stroke: '#ff0000', strokeWidth: 1, dash: '2 2' });
    // After <restore/>: style colors again; <fill/> has no stroke.
    expect(paths[2]).toMatchObject({ fill: '#ffffff', stroke: 'none' });
    expect(paths[3]).toMatchObject({ stroke: '#111111', strokeWidth: 2 });
    const scaled = `<shape w="10" h="10" strokewidth="2"><background><rect x="0" y="0" w="10" h="10"/></background><foreground><fillstroke/></foreground></shape>`;
    expect(renderStencil(parseStencil(scaled), 30, 50, STYLE)[0]).toMatchObject({ strokeWidth: 6 });
    const noFill = `<shape w="10" h="10"><background><rect x="0" y="0" w="10" h="10"/></background><foreground><fillcolor color="none"/><fillstroke/></foreground></shape>`;
    expect(renderStencil(parseStencil(noFill), 10, 10, STYLE)[0]).toMatchObject({ fill: 'none' });
  });

  it('resolves include-shape through the named registry', () => {
    const off = registerStencil('test.dot', '<shape w="10" h="10"><background><ellipse x="0" y="0" w="10" h="10"/></background><foreground><fillstroke/></foreground></shape>');
    const host = '<shape w="100" h="100"><foreground><include-shape name="test.dot" x="50" y="50" w="20" h="20"/></foreground></shape>';
    const prims = renderStencil(parseStencil(host), 100, 100, STYLE, resolveStencil);
    expect(prims).toHaveLength(1);
    expect((prims[0] as { d: string }).d).toBe('M50,60 A10,10 0 1 0 70,60 A10,10 0 1 0 50,60 Z');
    off();
  });

  it('renders as SVG through the registered `stencil` shape kind', () => {
    expect(SHAPES.stencil).toBe(STENCIL_SHAPE);
    const markup = renderToStaticMarkup(createElement('svg', null, STENCIL_SHAPE.render({ w: 120, h: 60, style: STYLE, text: '', stencil: SAMPLE_STENCIL })));
    expect(markup).toContain('<path');
    expect(markup).not.toMatch(/NaN|undefined/);
    // Missing / invalid XML falls back to a dashed placeholder.
    const fallback = renderToStaticMarkup(createElement('svg', null, STENCIL_SHAPE.render({ w: 10, h: 10, style: STYLE, text: '', stencil: '<oops' })));
    expect(fallback).toContain('stroke-dasharray');
    expect(renderStencilXml('<oops', 1, 1, STYLE)).toBeNull();
  });
});

describe('mxGraph stencil encoding', () => {
  it('round-trips through compress / decompress and the style value', () => {
    const packed = compressStencil(BOX);
    expect(packed).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(decompressStencil(packed)).toBe(BOX);
    expect(stencilFromStyleValue(stencilStyleValue(BOX))).toBe(BOX);
    expect(stencilFromStyleValue('mxgraph.basic.rect')).toBeNull();
    expect(decompressStencil('  <shape/>')).toBe('<shape/>');
  });

  it('imports shape=stencil(…) cells as stencil shapes and exports them back', async () => {
    const xml = `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="s" value="Hello" style="shape=${stencilStyleValue(BOX)};whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1"><mxGeometry x="10" y="20" width="200" height="100" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`;
    const doc = await importDrawio(xml);
    const el = doc.elements.s as ShapeElement;
    expect(el.kind).toBe('stencil');
    expect(el.stencil).toBe(BOX);
    expect(el.style.fill).toBe('#dae8fc');
    expect(el.connectionPoints).toEqual([{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }]);
    const out = await exportDrawio(doc);
    const style = new DOMParser().parseFromString(out, 'text/xml').querySelector('mxCell[id="s"]')!.getAttribute('style')!;
    const shape = style.split(';').find((p) => p.startsWith('shape='))!.slice(6);
    expect(stencilFromStyleValue(shape)).toBe(BOX);
    const again = await importDrawio(out);
    expect((again.elements.s as ShapeElement).stencil).toBe(BOX);
  });
});

describe('convert built-in shapes to stencils', () => {
  it('converts SVG path data, including relative and smooth commands', () => {
    expect(svgPathToStencil('M0,0 h10 v10 q5,5 10,0 t10,0 c1,1 2,2 3,3 s4,4 5,5 a2,2 0 0 1 4,0 Z').join('')).toBe(
      '<move x="0" y="0"/><line x="10" y="0"/><line x="10" y="10"/>' +
        '<quad x1="15" y1="15" x2="20" y2="10"/><quad x1="25" y1="5" x2="30" y2="10"/>' +
        '<curve x1="31" y1="11" x2="32" y2="12" x3="33" y3="13"/><curve x1="34" y1="14" x2="37" y2="17" x3="38" y3="18"/>' +
        '<arc rx="2" ry="2" x-axis-rotation="0" large-arc-flag="0" sweep-flag="1" x="42" y="18"/><close/>',
    );
  });

  it.each(['rectangle', 'ellipse', 'diamond', 'hexagon', 'cylinder', 'flow.document', 'uml.note'])('converts %s and renders the same outline size', (kind) => {
    const el = createShape(kind, { x: 0, y: 0, w: 120, h: 80 }, { radius: 6 });
    const res = stencilFromShape(el);
    expect(res.ok, JSON.stringify(res)).toBe(true);
    if (!res.ok) return;
    const st = parseStencil(res.xml);
    expect([st.w, st.h]).toEqual([120, 80]);
    expect(st.connections).toHaveLength(4);
    const prims = renderStencil(st, 120, 80, el.style);
    expect(prims.length).toBeGreaterThan(0);
    expect(JSON.stringify(prims)).not.toMatch(/NaN/);
  });

  it('explains shapes it cannot represent', () => {
    const cls = createShape('uml.class', { x: 0, y: 0, w: 160, h: 100 }, {}, 'Name\n--\n+ a');
    const res = stencilFromShape(cls);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/text/);
    expect(stencilFromShape(createShape('text', { x: 0, y: 0, w: 10, h: 10 })).ok).toBe(false);
  });
});

describe('stencil libraries', () => {
  it('reads <shapes> stencil sets as library items', () => {
    const set = `<shapes name="Mine"><shape name="A" w="40" h="20"><background><rect x="0" y="0" w="40" h="20"/></background><foreground><fillstroke/></foreground></shape><shape name="B" w="10" h="10"/></shapes>`;
    const lib = parseStencilLibrary(set, 'file')!;
    expect(lib.name).toBe('Mine');
    expect(lib.items.map((i) => [i.title, i.w, i.h, i.elements[0].kind])).toEqual([
      ['A', 40, 20, 'stencil'],
      ['B', 10, 10, 'stencil'],
    ]);
  });

  it('reads OpenDraw shape configs (OpenDraw or mxGraph style, size, points, params)', async () => {
    const cfg = {
      format: 'opendraw-shapes',
      name: 'Config',
      shapes: [
        { name: 'One', stencil: SAMPLE_STENCIL, w: 60, h: 30, style: { fill: '#fef3c7' }, text: 'Hi', params: { size: 3 } },
        { name: 'Two', stencil: SAMPLE_STENCIL, style: 'fillColor=#ff0000;strokeColor=#00ff00;dashed=1;', connectionPoints: [{ x: 0, y: 0 }] },
      ],
    };
    const lib = await parseLibrary(JSON.stringify(cfg), 'x.json');
    expect(lib.name).toBe('Config');
    const [a, b] = lib.items.map((i) => i.elements[0] as ShapeElement);
    expect(a).toMatchObject({ kind: 'stencil', w: 60, h: 30, text: 'Hi', params: { size: 3 } });
    expect(a.style.fill).toBe('#fef3c7');
    expect(a.connectionPoints).toEqual([{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]);
    expect(b).toMatchObject({ w: 120, h: 60, connectionPoints: [{ x: 0, y: 0 }] });
    expect(b.style).toMatchObject({ fill: '#ff0000', stroke: '#00ff00', strokeStyle: 'dashed' });
    expect(() => parseStencilLibrary(JSON.stringify({ format: 'opendraw-shapes', shapes: [{ name: 'x' }] }), 'f')).toThrow(/stencil/);
  });

  it('leaves other library formats to the existing parser', async () => {
    expect(parseStencilLibrary('{"format":"opendraw-library","items":[]}', 'f')).toBeNull();
    expect(parseStencilLibrary('<mxlibrary>[]</mxlibrary>', 'f')).toBeNull();
    const lib = await parseLibrary('{"format":"opendraw-library","version":1,"name":"L","items":[]}', 'L.opendrawlib');
    expect(lib.name).toBe('L');
  });
});
