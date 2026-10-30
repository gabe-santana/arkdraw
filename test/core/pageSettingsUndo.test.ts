import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';

const ed = () => useEditor.getState();
const background = () => ed().pages.find((p) => p.id === ed().activePageId)!.settings.background;

describe('undo and redo of page settings', () => {
  beforeEach(() => {
    vi.useRealTimers();
    ed().loadPages([newPage('P')], { path: null, name: 'Doc' });
  });

  it('undoes and redoes a background color change', () => {
    const start = background();
    ed().updatePageSettings({ background: '#ff0000' });
    expect(background()).toBe('#ff0000');
    expect(ed().past.length).toBe(1);
    ed().undo();
    expect(background()).toBe(start);
    ed().redo();
    expect(background()).toBe('#ff0000');
  });

  it('makes one step of a burst of changes (dragging a color)', () => {
    const start = background();
    for (const c of ['#100000', '#200000', '#300000']) ed().updatePageSettings({ background: c });
    expect(ed().past.length).toBe(1);
    ed().undo();
    expect(background()).toBe(start);
  });

  it('keeps settings and drawing steps in order', () => {
    const start = background();
    ed().updatePageSettings({ background: '#00ff00' });
    ed().addElements([createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 })]);
    ed().undo();
    // The shape goes first, the color stays…
    expect(ed().doc.order).toHaveLength(0);
    expect(background()).toBe('#00ff00');
    ed().undo();
    // …then the color.
    expect(background()).toBe(start);
    ed().redo();
    ed().redo();
    expect(background()).toBe('#00ff00');
    expect(ed().doc.order).toHaveLength(1);
  });
});
