/** The side panels render (English) after string externalization, for the main selection states. */
import { afterAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createConnector, createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { LeftPanel } from '@/panels/LeftPanel';
import { LayersPanel } from '@/panels/LayersPanel';
import { ConnectionPointsDialog, useConnectionPointsDialog } from '@/panels/ConnectionPointsDialog';
import { richText } from '@/panels/sections';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
afterAll(() => act(() => root.unmount()));

const render = async (el: Parameters<typeof root.render>[0]) => {
  await act(async () => root.render(el));
  return host.textContent ?? '';
};

describe('panels i18n', () => {
  it('richText splices React nodes into a translated sentence', async () => {
    const text = await render(createElement('p', null, richText('Hold {key} to {verb}.', { key: createElement('b', null, 'Ctrl') })));
    expect(text).toBe('Hold Ctrl to {verb}.');
    expect(host.querySelector('b')?.textContent).toBe('Ctrl');
  });

  it('renders the Format panel for each selection state', async () => {
    const a = { ...createShape('rectangle', { x: 0, y: 0, w: 80, h: 40 }, {}, 'A'), id: 'a' };
    const b = { ...createShape('ellipse', { x: 200, y: 0, w: 80, h: 40 }, {}, 'B'), id: 'b' };
    const c = { ...createConnector({ elementId: 'a', x: 80, y: 20 }, { elementId: 'b', x: 200, y: 20 }), id: 'c' };
    useEditor.getState().loadPages([newPage('P', { elements: { a, b, c }, order: ['a', 'b', 'c'] })], { path: null, name: 'Doc' });
    const s = useEditor.getState();

    act(() => s.select([]));
    let text = await render(createElement(PropertiesPanel));
    expect(text).toContain('Nothing selected');
    expect(text).toContain('Snap to grid');
    expect(text).toContain('3 elements on canvas');
    expect(text).toContain('Hover a shape and drag from a blue dot to connect.');

    act(() => s.select(['a']));
    text = await render(createElement(PropertiesPanel));
    // Style, Text and Arrange tabs, Style first.
    expect(text).toContain('Drop shadow');
    expect(text).not.toContain('Connection points');
    act(() => useUi.getState().set({ formatTab: 'arrange' }));
    text = await render(createElement(PropertiesPanel));
    expect(text).toContain('Connection points');
    expect(text).not.toContain('Drop shadow');
    act(() => useUi.getState().set({ formatTab: 'style' }));

    act(() => s.select(['c']));
    text = await render(createElement(PropertiesPanel));
    expect(text).toContain('Swap direction');
    expect(text).toContain('Orthogonal (auto)');

    act(() => s.select(['a', 'b', 'c']));
    text = await render(createElement(PropertiesPanel));
    expect(text).toContain('3 elements');
    expect(text).toContain('2 shapes · 1 connector');
  });

  it('renders the Shapes and Layers panels and the connection-points dialog', async () => {
    act(() => useUi.getState().set({ layersOpen: true }));
    let text = await render(createElement(LeftPanel));
    expect(text).toContain('General');
    expect(text).toContain('New library');
    text = await render(createElement(LayersPanel));
    expect(text).toContain('Document layers');
    act(() => useConnectionPointsDialog.setState({ id: 'a' }));
    await render(createElement(ConnectionPointsDialog));
    expect(document.body.textContent).toContain('Edit connection points');
    act(() => useConnectionPointsDialog.setState({ id: null }));
  });
});
