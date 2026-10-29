/** While a connector is dragged out, the overlay draws the connector itself, not a guide line. */
import { afterAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { OverlayLayer } from '@/canvas/OverlayLayer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
afterAll(() => act(() => root.unmount()));

const a = { ...createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 }), id: 'a' };
const b = { ...createShape('rectangle', { x: 300, y: 200, w: 100, h: 60 }), id: 'b' };

async function draw(draft: ReturnType<typeof useEditor.getState>['connectDraft']) {
  useEditor.getState().loadPages([newPage('P', { elements: { a, b }, order: ['a', 'b'] })], { path: null, name: 'Doc' });
  useEditor.setState({ connectDraft: draft, camera: { x: 0, y: 0, z: 1 } });
  await act(async () => root.render(createElement(OverlayLayer)));
  return host;
}

describe('connect preview', () => {
  it('draws the routed connector with its arrowhead between the two ends', async () => {
    const el = await draw({
      from: { x: 100, y: 30 },
      to: { x: 300, y: 230 },
      targetId: 'b',
      source: { elementId: 'a', side: 'right', x: 100, y: 30 },
      target: { elementId: 'b', side: 'left', x: 300, y: 230 },
    });
    // No dashed guide line: the connector body instead, an orthogonal route (several bends) plus its arrowhead.
    expect(el.querySelector('line[stroke-dasharray]')).toBeNull();
    const route = [...el.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '').find((d) => /^M\s*100[ ,]30/.test(d));
    expect(route).toBeTruthy();
    expect(route!.match(/L/g)!.length).toBeGreaterThan(1);
    expect(el.querySelectorAll('path').length).toBeGreaterThan(1);
  });

  it('falls back to a guide line before the ends are known', async () => {
    const el = await draw({ from: { x: 100, y: 30 }, to: { x: 200, y: 90 }, targetId: null });
    expect(el.querySelector('line[stroke-dasharray]')).not.toBeNull();
  });
});
