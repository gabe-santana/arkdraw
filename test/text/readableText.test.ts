import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { ConnectorElement, DiagramElement, Doc, ShapeElement } from '@/model/types';
import { checkLayout } from '@/lib/layoutCheck';
import { makeTextReadable } from '@/lib/readableText';
import { isDirtyState, newPage, useEditor } from '@/store/editor';
import { parsePages, serializePages } from '@/io/fileFormat';
import { makePageTextReadable } from '@/app/commands';

const doc = (...els: DiagramElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });
const text = (x: number, y: number, w: number, h: number, t: string, align: 'left' | 'center' = 'left'): ShapeElement =>
  createShape('text', { x, y, w, h }, { fill: 'none', stroke: 'none', fontSize: 12, wrap: false, textAlign: align, verticalAlign: 'top' }, t);
const card = (x: number, y: number, w: number, h: number, t = '', fill = '#ffffff') => createShape('rectangle', { x, y, w, h }, { fill, fontSize: 12 }, t);
const shape = (d: Doc, id: string) => d.elements[id] as ShapeElement;

describe('makeTextReadable', () => {
  it('grows a text element to its text, around its alignment', () => {
    const t = text(100, 0, 40, 20, 'A label much longer than its box', 'center');
    const d = makeTextReadable(doc(t));
    const f = shape(d, t.id);
    expect(f.w).toBeGreaterThan(40);
    expect(f.x + f.w / 2).toBeCloseTo(120, 5);
    expect(checkLayout(d)).toEqual([]);
  });

  it('grows a text element in a card only to the card edge, then wraps', () => {
    const c = card(0, 0, 240, 70);
    const t = text(12, 12, 200, 20, 'A description that is much longer than the card that holds it');
    const d = makeTextReadable(doc(c, t));
    const f = shape(d, t.id);
    expect(f.x + f.w).toBeLessThanOrEqual(240);
    expect(f.style.wrap).toBe(true);
    expect(checkLayout(d)).toEqual([]);
  });

  it('fits a label to its card without resizing the card: wraps, then a smaller font', () => {
    const c = card(0, 0, 120, 60, 'A cell label that is far too long for one line');
    const d = makeTextReadable(doc({ ...c, style: { ...c.style, wrap: false } }));
    const f = shape(d, c.id);
    expect([f.x, f.y, f.w, f.h]).toEqual([0, 0, 120, 60]);
    expect(f.style.wrap).toBe(true);
    expect(checkLayout(d)).toEqual([]);

    const tight = card(0, 0, 120, 24, 'Two lines of text here');
    const g = shape(makeTextReadable(doc(tight)), tight.id);
    expect(g.style.fontSize).toBeLessThan(12);
    expect(g.style.fontSize).toBeGreaterThanOrEqual(8);
    expect(checkLayout(doc(g))).toEqual([]);
  });

  it('moves a badge off text', () => {
    const t = text(0, 0, 200, 20, 'Covered label');
    const badge = card(10, 2, 30, 16, '', '#cc0000');
    const d = makeTextReadable(doc(t, badge));
    expect(shape(d, badge.id).y).not.toBe(2);
    expect(checkLayout(d)).toEqual([]);
  });

  it('brings text in front of a big shape drawn over it', () => {
    const t = text(0, 0, 200, 20, 'Label');
    const big = card(-20, -20, 300, 100);
    const d = makeTextReadable(doc(t, big));
    expect(d.order).toEqual([big.id, t.id]);
    expect(shape(d, big.id)).toEqual(big);
    expect(checkLayout(d)).toEqual([]);
  });

  it('moves overlapping text apart', () => {
    const a = text(0, 0, 200, 20, 'First label');
    const b = text(10, 6, 200, 20, 'Second label');
    const c = text(20, 12, 200, 20, 'Third label');
    const d = makeTextReadable(doc(a, b, c));
    expect(shape(d, a.id)).toEqual(a);
    expect(checkLayout(d)).toEqual([]);
  });

  it('turns avoidText on for connectors that have no say, and leaves an explicit choice', () => {
    const a = card(0, 0, 60, 60);
    const b = card(0, 300, 60, 60);
    const c1 = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { avoidText: undefined });
    const c2 = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { avoidText: false });
    const d = makeTextReadable(doc(a, b, c1, c2));
    expect((d.elements[c1.id] as ConnectorElement).avoidText).toBe(true);
    expect((d.elements[c2.id] as ConnectorElement).avoidText).toBe(false);
  });

  it('leaves a readable diagram as it is', () => {
    const c = card(0, 0, 300, 100, 'Title');
    const t = text(10, 60, 200, 20, 'Note');
    const d = doc(c, t);
    expect(makeTextReadable(d).elements).toEqual(d.elements);
  });
});

describe('readableText pages', () => {
  const overlapping = () => {
    const a = text(0, 0, 200, 20, 'First label');
    const b = text(10, 6, 200, 20, 'Second label');
    return doc(a, b);
  };

  it('a file without the flag opens exactly as saved', () => {
    const d = overlapping();
    const json = serializePages([{ ...newPage('P', d) }]);
    useEditor.getState().loadPages(parsePages(json), { path: null, name: 'old' });
    expect(useEditor.getState().doc.elements).toEqual(d.elements);
  });

  it('a file with the flag opens readable, not as an unsaved change, and keeps the flag when saved', () => {
    const p = newPage('P', overlapping());
    const json = serializePages([{ ...p, settings: { ...p.settings, readableText: true } }]);
    useEditor.getState().loadPages(parsePages(json), { path: null, name: 'generated' });
    const s = useEditor.getState();
    expect(checkLayout(s.doc)).toEqual([]);
    expect(isDirtyState(s)).toBe(false);
    expect(parsePages(serializePages(s.allPages()))[0].settings.readableText).toBe(true);
  });

  it('new pages are born with it', () => {
    const s = useEditor.getState();
    s.newDoc();
    s.addPage();
    expect(useEditor.getState().allPages().map((p) => p.settings.readableText)).toEqual([true, true]);
  });

  it('the command fixes the page in one undoable edit', () => {
    const s = useEditor.getState();
    s.loadPages([newPage('P', overlapping())], { path: null, name: 'x' });
    makePageTextReadable();
    expect(checkLayout(useEditor.getState().doc)).toEqual([]);
    useEditor.getState().undo();
    expect(checkLayout(useEditor.getState().doc).map((i) => i.kind)).toEqual(['text-overlap']);
  });
});
