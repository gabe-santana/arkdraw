import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from '@/store/ui';
import { columnInset, columnVisible, DEFAULT_DOCK, movePanel, resetDock, togglePanelColumn } from '@/chrome/Dock';

describe('panel dock', () => {
  beforeEach(() => resetDock());

  it('moves a panel to the other side and position, keeping each panel once', () => {
    movePanel('layers', 'left', 0);
    expect(useUi.getState().dock).toEqual({ left: ['layers', 'shapes'], right: ['format'] });
    movePanel('format', 'left', Infinity);
    expect(useUi.getState().dock).toEqual({ left: ['layers', 'shapes', 'format'], right: [] });
  });

  it('hides an empty column and gives the canvas its space back', () => {
    movePanel('format', 'left', 1);
    movePanel('layers', 'left', 2);
    const s = useUi.getState();
    expect(columnVisible(s, 'right')).toBe(false);
    expect(columnInset(s, 'right')).toBe(0);
    expect(columnInset(s, 'left')).toBe(s.leftWidth);
  });

  it('toggles the column that holds a panel, wherever it was moved', () => {
    movePanel('shapes', 'right', 0);
    togglePanelColumn('shapes');
    expect(useUi.getState().rightOpen).toBe(false);
    expect(useUi.getState().leftOpen).toBe(true);
  });

  it('resets to the default layout and widths', () => {
    movePanel('shapes', 'right', 0);
    useUi.getState().set({ leftWidth: 400 });
    resetDock();
    expect(useUi.getState().dock).toEqual(DEFAULT_DOCK);
    expect(useUi.getState().leftWidth).toBe(264);
  });
});
