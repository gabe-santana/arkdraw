/** The rulers render with a selection (they used to loop forever and blank the screen). */
import { afterAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { Rulers } from '@/chrome/Rulers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
afterAll(() => act(() => root.unmount()));

describe('rulers', () => {
  it('render with an element selected and follow selection changes', async () => {
    const a = { ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), id: 'a' };
    const b = { ...createShape('rectangle', { x: 200, y: 100, w: 80, h: 40 }), id: 'b' };
    useEditor.getState().loadPages([newPage('P', { elements: { a, b }, order: ['a', 'b'] })], { path: null, name: 'Doc' });
    useUi.getState().set({ rulers: true });
    await act(async () => root.render(createElement(Rulers)));
    await act(async () => useEditor.getState().select(['a']));
    await act(async () => useEditor.getState().select(['a', 'b']));
    expect(host.innerHTML.length).toBeGreaterThan(0);
  });
});
