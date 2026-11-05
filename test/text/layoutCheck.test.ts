import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { DiagramElement, Doc, ShapeElement } from '@/model/types';
import { checkLayout, labelInkBox, segmentHitsRect } from '@/lib/layoutCheck';

const doc = (...els: DiagramElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });
const text = (x: number, y: number, w: number, h: number, t: string, wrap = false): ShapeElement =>
  createShape('text', { x, y, w, h }, { fill: 'none', stroke: 'none', fontSize: 12, wrap, textAlign: 'left', verticalAlign: 'top' }, t);
const card = (x: number, y: number, w: number, h: number, fill = '#ffffff') => createShape('rectangle', { x, y, w, h }, { fill }, '');
const kinds = (d: Doc) => checkLayout(d).map((i) => i.kind);

describe('layout check', () => {
  it('finds nothing in a tidy layout', () => {
    const c = card(0, 0, 300, 100);
    const t = text(10, 10, 280, 20, 'Short title');
    expect(checkLayout(doc(c, t))).toEqual([]);
  });

  it('measures unwrapped text past its box', () => {
    const t = text(0, 0, 40, 20, 'A label much longer than its box');
    expect(labelInkBox(t)!.w).toBeGreaterThan(40);
    expect(kinds(doc(t))).toEqual(['text-overflow']);
  });

  it('flags text spilling over the card it sits in', () => {
    const c = card(0, 0, 100, 60);
    const t = text(10, 10, 300, 20, 'A label much longer than the card');
    expect(checkLayout(doc(c, t))).toContainEqual(expect.objectContaining({ kind: 'text-outside-container', ids: [t.id, c.id] }));
  });

  it('wrapping text grows down, not sideways', () => {
    const t = text(0, 0, 60, 20, 'one two three four five six', true);
    const ink = labelInkBox(t)!;
    expect(ink.w).toBeLessThanOrEqual(60);
    expect(ink.h).toBeGreaterThan(20);
  });

  it('flags overlapping labels', () => {
    const a = text(0, 0, 200, 20, 'First label');
    const b = text(20, 5, 200, 20, 'Second label');
    expect(kinds(doc(a, b))).toEqual(['text-overlap']);
  });

  it('flags a badge drawn over text, but not a card behind it', () => {
    const c = card(0, 0, 300, 100);
    const t = text(10, 10, 200, 20, 'Covered label');
    const badge = card(15, 8, 30, 20, '#cc0000');
    expect(checkLayout(doc(c, t, badge))).toEqual([expect.objectContaining({ kind: 'shape-over-text', ids: [t.id, badge.id] })]);
  });

  it('flags a connector running through a caption', () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const caption = text(-50, 100, 160, 20, 'Caption under nothing');
    const conn = createConnector({ elementId: a.id, side: 'bottom', x: 0, y: 0 }, { elementId: b.id, side: 'top', x: 0, y: 0 });
    expect(checkLayout(doc(a, b, caption, conn))).toContainEqual(expect.objectContaining({ kind: 'connector-crosses-text', ids: [caption.id, conn.id] }));
  });

  it('counts icon captions as text', () => {
    const icon = createShape('icon', { x: 0, y: 0, w: 48, h: 48 }, { fontSize: 12 }, 'Caption');
    const ink = labelInkBox(icon)!;
    expect(ink.y).toBeGreaterThan(48);
    const other = text(-20, ink.y, 100, 20, 'Neighbour');
    expect(kinds(doc(icon, other))).toEqual(['text-overlap']);
  });

  it('flags a connector label over a caption', () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const conn = createConnector({ elementId: a.id, side: 'bottom', x: 0, y: 0 }, { elementId: b.id, side: 'top', x: 0, y: 0 }, { text: 'calls' });
    const caption = text(200, 0, 160, 20, 'Far away');
    expect(kinds(doc(a, b, caption, conn))).toEqual([]);
    const near = text(10, 175, 60, 20, 'Near');
    expect(kinds(doc(a, b, near, conn))).toContain('connector-label-overlap');
  });

  it('flags a connector leaving an icon through its own caption', () => {
    const icon = createShape('icon', { x: 0, y: 0, w: 48, h: 48 }, { fontSize: 12 }, 'Caption');
    const b = card(-6, 300, 60, 60);
    const conn = createConnector({ elementId: icon.id, side: 'auto', x: 0, y: 0 }, { elementId: b.id, side: 'auto', x: 0, y: 0 });
    expect(checkLayout(doc(icon, b, conn))).toContainEqual(expect.objectContaining({ kind: 'connector-crosses-text', ids: [icon.id, conn.id] }));
  });

  it('routes around a shape in the way, but not around a text element (current behaviour)', () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const conn = createConnector({ elementId: a.id, side: 'auto', x: 0, y: 0 }, { elementId: b.id, side: 'auto', x: 0, y: 0 });
    const blocker = card(-20, 150, 100, 30);
    const caption = text(0, 150, 100, 30, 'Caption text');
    // routeObstacles (src/lib/connectorGeometry.ts) skips `kind: 'text'`, so the same box only deflects the route when it is a rectangle.
    expect(checkLayout(doc(a, b, blocker, conn)).map((i) => i.kind)).toEqual([]);
    expect(kinds(doc(a, b, caption, conn))).toContain('connector-crosses-text');
  });

  it('ignores inside labels that only use the padding', () => {
    const badge = createShape('rectangle', { x: 0, y: 0, w: 36, h: 22 }, { fontSize: 12 }, 'S1');
    expect(checkLayout(doc(badge))).toEqual([]);
  });

  it('clips segments against rects', () => {
    const r = { x: 0, y: 0, w: 10, h: 10 };
    expect(segmentHitsRect({ x: -5, y: 5 }, { x: 15, y: 5 }, r)).toBe(true);
    expect(segmentHitsRect({ x: -5, y: 15 }, { x: 15, y: 15 }, r)).toBe(false);
    expect(segmentHitsRect({ x: 5, y: -5 }, { x: 5, y: -1 }, r)).toBe(false);
  });
});
