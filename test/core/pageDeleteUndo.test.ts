import { beforeEach, describe, expect, it } from 'vitest';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';

const ed = () => useEditor.getState();

describe('deleting a page keeps the undo history of the page you land on', () => {
  beforeEach(() => {
    ed().loadPages([newPage('A'), newPage('B'), newPage('C')], { path: null, name: 'Doc' });
  });

  it('restores the next page history and drops the deleted page history', () => {
    const [a, b, c] = ed().pages.map((p) => p.id);
    // B gets one drawing step.
    ed().switchPage(b);
    ed().addElements([createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 })]);
    // C gets one too, then we go back to A (which has no history).
    ed().switchPage(c);
    ed().addElements([createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 })]);
    ed().switchPage(a);
    expect(ed().past.length).toBe(0);
    // Deleting A lands on B, whose undo step must survive.
    ed().deletePage(a);
    expect(ed().activePageId).toBe(b);
    expect(ed().past.length).toBe(1);
    expect(ed().pageHistory[a]).toBeUndefined();
    ed().undo();
    expect(ed().doc.order).toHaveLength(0);
    expect(ed().pages.map((p) => p.id)).toEqual([b, c]);
  });
});
