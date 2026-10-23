/**
 * Parametric shapes: param resolution, handles, the Format-panel patch path,
 * mxGraph round-trip and pools that grow with their lanes.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Doc, ShapeElement } from '@/model/types';
import { createShape, DEFAULT_STYLE } from '@/model/defaults';
import { SHAPES, getShapeDef, textBoxOf } from '@/shapes/registry';
import { applyParamPatch, handlesOf, localToWorld, normalizeParam, paramsOf, resolveParams, worldToLocal } from '@/shapes/params';
import { exportDrawio, importDrawio } from '@/io/drawio';
import { installLaneLayout, layoutPools } from '@/store/laneLayout';
import { useEditor } from '@/store/editor';

const PARAMETRIC = Object.values(SHAPES).filter((d) => d.params?.length);

const shapeOf = (kind: string, params?: ShapeElement['params'], rect = { x: 0, y: 0, w: 140, h: 90 }): ShapeElement => {
  const el = createShape(kind, rect, {}, 'Label');
  if (params) el.params = params;
  return el;
};

const docOf = (...els: ShapeElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });

describe('param values', () => {
  it('covers the mxGraph parametric shapes', () => {
    const kinds = new Set(PARAMETRIC.map((d) => d.kind));
    for (const k of [
      'hexagon', 'parallelogram', 'trapezoid', 'cylinder', 'callout', 'blockArrow', 'container', 'flow.document', 'flow.predefined',
      'uml.note', 'uml.node', 'basic.cube', 'basic.step', 'basic.tape', 'basic.card', 'basic.plus', 'basic.star5', 'basic.pentagon',
      'basic.partialTB', 'misc.curlyLeft', 'arrows.right', 'arrows.up', 'arrows.doubleH', 'arrows.chevron', 'lane.poolH', 'lane.laneV',
    ]) expect(kinds.has(k), k).toBe(true);
  });

  it('fills defaults and clamps out-of-range values', () => {
    const def = getShapeDef('hexagon');
    expect(resolveParams(def.params, undefined)).toEqual({ size: 0.25 });
    expect(resolveParams(def.params, { size: 3 })).toEqual({ size: 0.5 });
    expect(resolveParams(def.params, { size: 'junk' })).toEqual({ size: 0.25 });
    const star = getShapeDef('basic.star5').params!.find((p) => p.key === 'points')!;
    expect(normalizeParam(star, 6.6)).toBe(7);
    expect(normalizeParam(star, 1)).toBe(3);
  });

  it('applyParamPatch normalizes and drops cleared values', () => {
    const def = getShapeDef('container');
    const el = shapeOf('container', { startSize: 20, swimlaneFillColor: '#ff0000' });
    const next = applyParamPatch(def, el, { params: { startSize: -5, swimlaneFillColor: '' } });
    expect(next.params).toEqual({ startSize: 0 });
  });

  it('renders every parametric shape with defaults and extreme values', () => {
    for (const def of PARAMETRIC) {
      for (const params of [undefined, Object.fromEntries(def.params!.map((p) => [p.key, p.max ?? 1])), Object.fromEntries(def.params!.map((p) => [p.key, p.min ?? 0]))]) {
        for (const [w, h] of [[140, 90], [12, 200]]) {
          const html = renderToStaticMarkup(createElement(Fragment, null, def.render({ w, h, style: DEFAULT_STYLE, text: 'x', params })));
          expect(html, def.kind).not.toContain('NaN');
          const tb = textBoxOf(def, w, h, params);
          expect(Number.isFinite(tb.x + tb.y + tb.w + tb.h), def.kind).toBe(true);
        }
      }
    }
  });

  it('changes the geometry when a param changes', () => {
    const def = getShapeDef('hexagon');
    const a = renderToStaticMarkup(createElement(Fragment, null, def.render({ w: 100, h: 60, style: DEFAULT_STYLE, text: '', params: { size: 0.1 } })));
    const b = renderToStaticMarkup(createElement(Fragment, null, def.render({ w: 100, h: 60, style: DEFAULT_STYLE, text: '', params: { size: 0.4 } })));
    expect(a).toContain('M10,0');
    expect(b).toContain('M40,0');
  });
});

describe('handles', () => {
  it('dragging a handle onto itself keeps the values (every shape)', () => {
    for (const def of PARAMETRIC.filter((d) => d.handles)) {
      const el = shapeOf(def.kind, undefined, { x: 0, y: 0, w: 160, h: 100 });
      const before = paramsOf(def, el);
      for (const h of handlesOf(def, el, 0.01)) {
        const patch = h.drag({ x: h.x, y: h.y });
        const after = paramsOf(def, { ...el, ...applyParamPatch(def, el, patch) });
        for (const k of Object.keys(patch.params ?? {})) expect(Number(after[k]), `${def.kind}.${k}`).toBeCloseTo(Number(before[k]), 1);
      }
    }
  });

  it('maps a drag to the param (hexagon, arrow, callout)', () => {
    const hex = getShapeDef('hexagon');
    const [h] = handlesOf(hex, shapeOf('hexagon'), 1);
    expect(h.drag({ x: 42, y: 0 }).params!.size).toBeCloseTo(0.3);
    const up = getShapeDef('arrows.up');
    const el = shapeOf('arrows.up', undefined, { x: 0, y: 0, w: 70, h: 140 });
    const [a] = handlesOf(up, el, 1);
    // Head 40% of the length (from the top), shaft 50% of the width.
    expect(a.x).toBeCloseTo(17.5);
    expect(a.y).toBeCloseTo(56);
    const p = a.drag({ x: 7, y: 28 }).params!;
    expect(p.arrowSize).toBeCloseTo(0.2);
    expect(p.arrowWidth).toBeCloseTo(0.8);
  });

  it('rectangle handle edits the corner radius', () => {
    const def = getShapeDef('rectangle');
    const [h] = handlesOf(def, shapeOf('rectangle'), 1);
    expect(h.drag({ x: 12, y: 0 }).style).toEqual({ radius: 12 });
  });

  it('local ↔ world honours rotation and flips', () => {
    const el = { ...shapeOf('hexagon'), x: 30, y: 40, rotation: 33, flipH: true, flipV: true };
    const p = { x: 17, y: 5 };
    const back = worldToLocal(el, localToWorld(el, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});

describe('mxGraph round-trip', () => {
  it('exports and re-imports params', async () => {
    const els = [
      shapeOf('hexagon', { size: 0.35 }),
      shapeOf('cylinder', { size: 24 }),
      shapeOf('callout', { size: 22, position: 0.6, base: 14, position2: 0.8 }),
      shapeOf('blockArrow', { arrowWidth: 0.7, arrowSize: 0.25 }),
      shapeOf('basic.partialTB', { left: 1 }),
      shapeOf('basic.card', { size: 24 }),
      shapeOf('arrows.chevron', { size: 0.3 }),
      shapeOf('basic.star5', { points: 7, inner: 0.3 }),
    ];
    const xml = await exportDrawio(docOf(...els));
    expect(xml).toContain('arrowWidth=0.7');
    expect(xml).toMatch(/shape=hexagon;[^"]*size=0.35/);
    const back = await importDrawio(xml);
    for (const el of els) {
      const got = back.elements[el.id] as ShapeElement;
      const def = getShapeDef(got.kind);
      const want = paramsOf(getShapeDef(el.kind), el);
      const have = paramsOf(def, got);
      for (const [k, v] of Object.entries(el.params!)) expect(have[k], `${el.kind}.${k}`).toBe(want[k] ?? v);
    }
  });

  it('reads mxGraph defaults and fixedSize values', async () => {
    const xml = `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="a" value="" style="shape=hexagon;fixedSize=1;size=20;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
      <mxCell id="b" value="" style="shape=callout;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="80" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`;
    const doc = await importDrawio(xml);
    expect((doc.elements.a as ShapeElement).params).toEqual({ size: 0.2 });
    expect((doc.elements.b as ShapeElement).params).toMatchObject({ size: 30, position: 0.5, position2: 0.5, base: 20 });
  });

  it('maps mxGraph swimlanes to pools and lanes with header size and fill', async () => {
    const xml = `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="pool" value="Pool" style="swimlane;horizontal=0;startSize=40;swimlaneFillColor=#fde68a;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="400" height="200" as="geometry"/></mxCell>
      <mxCell id="lane" value="Lane" style="swimlane;horizontal=0;startSize=20;" vertex="1" parent="pool"><mxGeometry x="40" y="0" width="360" height="100" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`;
    const doc = await importDrawio(xml);
    const pool = doc.elements.pool as ShapeElement;
    const lane = doc.elements.lane as ShapeElement;
    expect(pool.kind).toBe('lane.poolH');
    expect(pool.params).toEqual({ startSize: 40, swimlaneFillColor: '#fde68a' });
    expect(lane.kind).toBe('lane.laneH');
    expect(lane.containerId).toBe('pool');
  });
});

describe('pools grow with lanes', () => {
  const pool = () => ({ ...shapeOf('lane.poolH', { startSize: 30 }, { x: 0, y: 0, w: 400, h: 100 }), id: 'pool' });
  const lane = (id: string, y: number, h: number, w = 370) => ({ ...shapeOf('lane.laneH', undefined, { x: 30, y, w, h }), id, containerId: 'pool' });

  it('stacks lanes and sums their heights', () => {
    const doc = docOf(pool(), lane('a', 0, 100), lane('b', 60, 80));
    const p = layoutPools(doc)!;
    expect(p.pool).toEqual({ w: 400, h: 180 });
    expect(p.b).toMatchObject({ x: 30, y: 100, w: 370, h: 80 });
  });

  it('widening the pool widens the lanes; resizing the pool resizes the last lane', () => {
    const before = docOf(pool(), lane('a', 0, 50), lane('b', 50, 50));
    const wider = docOf({ ...pool(), w: 500, h: 140 }, lane('a', 0, 50), lane('b', 50, 50));
    const p = layoutPools(wider, before)!;
    expect(p.a).toMatchObject({ w: 470 });
    expect(p.b).toMatchObject({ w: 470, h: 90 });
    expect(p.pool).toBeUndefined();
  });

  it('moves lane content along with the lane', () => {
    const child = { ...shapeOf('rectangle', undefined, { x: 100, y: 70, w: 40, h: 20 }), id: 'c', containerId: 'b' };
    const p = layoutPools(docOf(pool(), lane('a', 0, 50), lane('b', 60, 50), child))!;
    expect(p.b).toMatchObject({ y: 50 });
    expect(p.c).toEqual({ x: 100, y: 60 });
  });

  describe('in the editor', () => {
    beforeEach(() => {
      installLaneLayout();
      useEditor.getState().newDoc();
    });

    it('adding a lane grows the pool in the same undo step', () => {
      const s = useEditor.getState();
      s.addElements([pool(), lane('a', 0, 100)]);
      expect((useEditor.getState().doc.elements.pool as ShapeElement).h).toBe(100);
      useEditor.getState().addElements([lane('b', 100, 60)]);
      expect((useEditor.getState().doc.elements.pool as ShapeElement).h).toBe(160);
      useEditor.getState().undo();
      expect((useEditor.getState().doc.elements.pool as ShapeElement).h).toBe(100);
    });

    it('resizing a lane resizes the pool', () => {
      const s = useEditor.getState();
      s.addElements([pool(), lane('a', 0, 50), lane('b', 50, 50)]);
      s.beginInteraction();
      s.updateElements({ a: { h: 120 } });
      s.endInteraction();
      const d = useEditor.getState().doc;
      expect((d.elements.pool as ShapeElement).h).toBe(170);
      expect((d.elements.b as ShapeElement).y).toBe(120);
    });
  });
});
