import { afterEach, describe, expect, it } from 'vitest';
import { startLibraryDrag, type LibraryDragSource } from '@/panels/libraryDrag';
import { useEditor } from '@/store/editor';

const src: LibraryDragSource = {
  size: { w: 100, h: 60 },
  create: (at) => [
    {
      id: 'lib-test-1',
      type: 'shape',
      kind: 'rect',
      x: at.x - 50,
      y: at.y - 30,
      w: 100,
      h: 60,
    } as never,
  ],
};

describe('library tile pointer gesture', () => {
  afterEach(() => {
    useEditor.setState({ doc: { ...useEditor.getState().doc, elements: {}, order: [] } } as never);
  });

  it('does not insert after pointercancel (touch scroll) followed by a later tap', () => {
    const tile = document.createElement('button');
    document.body.appendChild(tile);
    const before = useEditor.getState().doc.order.length;

    startLibraryDrag(
      { button: 0, currentTarget: tile, clientX: 10, clientY: 10, altKey: false, shiftKey: false } as never,
      src,
    );
    window.dispatchEvent(new PointerEvent('pointercancel', { clientX: 10, clientY: 10 }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 200 }));

    expect(useEditor.getState().doc.order.length - before).toBe(0);
    tile.remove();
  });
});
