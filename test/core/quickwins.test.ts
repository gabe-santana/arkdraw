import { beforeEach, describe, expect, it } from 'vitest';
import type { ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { layersOf, useEditor } from '@/store/editor';
import { nextFontSize, replaceShapes, stepFontSize, toggleTextStyle } from '@/app/commands';
import { startsTyping } from '@/app/useShortcuts';

const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
  ({ key: k, code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, ...extra }) as KeyboardEvent;

describe('text formatting', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('steps font sizes through the scale, including off-scale sizes', () => {
    expect(nextFontSize(14, 1)).toBe(16);
    expect(nextFontSize(14, -1)).toBe(12);
    expect(nextFontSize(13, 1)).toBe(14);
    expect(nextFontSize(13, -1)).toBe(12);
    expect(nextFontSize(120, 1)).toBe(120);
    expect(nextFontSize(6, -1)).toBe(6);
  });

  it('toggles bold on for mixed selections, off when all are bold; one undo step per size change', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 }, { bold: true });
    const b = createShape('rectangle', { x: 200, y: 0, w: 100, h: 60 });
    s.addElements([a, b]);
    s.select([a.id, b.id]);
    toggleTextStyle('bold');
    expect(useEditor.getState().doc.elements[b.id].style.bold).toBe(true);
    toggleTextStyle('bold');
    expect(useEditor.getState().doc.elements[a.id].style.bold).toBe(false);

    const before = useEditor.getState().past.length;
    stepFontSize(1);
    expect(useEditor.getState().past.length).toBe(before + 1);
  });
});

describe('type to edit', () => {
  it('accepts plain printable keys only', () => {
    expect(startsTyping(key('a'))).toBe(true);
    expect(startsTyping(key('A', { shiftKey: true, code: 'KeyA' }))).toBe(true);
    expect(startsTyping(key('ç'))).toBe(true);
    expect(startsTyping(key(' '))).toBe(false);
    expect(startsTyping(key('Enter'))).toBe(false);
    expect(startsTyping(key('a', { ctrlKey: true }))).toBe(false);
    expect(startsTyping(key('@', { shiftKey: true, code: 'Digit2' }))).toBe(false); // Shift+2 = zoom to selection
  });
});

describe('replace shape', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('keeps geometry, text and connections', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }, { fill: '#ff0000' }, 'Hello');
    const b = createShape('rectangle', { x: 300, y: 0, w: 120, h: 60 });
    const c = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'left', x: 0, y: 0 });
    s.addElements([a, b, c]);
    replaceShapes([a.id], { kind: 'ellipse', style: { strokeWidth: 3 } });
    const el = useEditor.getState().doc.elements[a.id] as ShapeElement;
    expect(el.kind).toBe('ellipse');
    expect(el.text).toBe('Hello');
    expect([el.x, el.y, el.w, el.h]).toEqual([0, 0, 120, 60]);
    expect(el.style.fill).toBe('#ff0000');
    expect(el.style.strokeWidth).toBe(3);
    expect(useEditor.getState().doc.elements[c.id]).toBeTruthy();
  });
});

describe('layers', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('duplicates a layer with its elements and selects everything on a layer', () => {
    const s = useEditor.getState();
    const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 });
    const b = createShape('rectangle', { x: 200, y: 0, w: 100, h: 60 });
    const c = createConnector({ elementId: a.id, side: 'right', x: 0, y: 0 }, { elementId: b.id, side: 'left', x: 0, y: 0 });
    s.addElements([a, b, c]);
    const base = layersOf(useEditor.getState().doc)[0];

    useEditor.getState().duplicateLayer(base.id);
    const st = useEditor.getState();
    const layers = layersOf(st.doc);
    expect(layers).toHaveLength(2);
    expect(layers[1].name).toBe(`${base.name} copy`);
    expect(st.doc.order).toHaveLength(6);
    expect(st.selection).toHaveLength(3);
    // The copied connector is glued to the copied shapes.
    const copy = st.selection.map((id) => st.doc.elements[id]).find((e) => e.type === 'connector');
    expect(copy && copy.type === 'connector' && st.selection.includes(copy.source.elementId!)).toBe(true);

    st.selectLayer(base.id);
    expect(useEditor.getState().selection.sort()).toEqual([a.id, b.id, c.id].sort());
  });
});
