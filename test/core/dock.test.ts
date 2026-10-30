import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from '@/store/ui';
import { activeRightPanel, columnInset, columnVisible, DEFAULT_DOCK, movePanel, panelColumnOpen, resetDock, togglePanelColumn } from '@/chrome/Dock';

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
    // The AI tab keeps the right column even with no panels docked there.
    useUi.getState().set({ aiOpen: true });
    expect(columnVisible(useUi.getState(), 'right')).toBe(true);
    useUi.getState().set({ aiOpen: false });
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

  it('shows the panels docked on the right as tabs, one at a time, AI aside', () => {
    useUi.getState().set({ aiOpen: false, rightPanel: 'format', rightOpen: true });
    expect(panelColumnOpen('format')).toBe(true);
    expect(panelColumnOpen('layers')).toBe(false);
    // View → Layers shows its tab…
    togglePanelColumn('layers');
    expect(useUi.getState().rightPanel).toBe('layers');
    expect(panelColumnOpen('layers')).toBe(true);
    expect(panelColumnOpen('format')).toBe(false);
    // …and moving a tab away falls back to the one that's left.
    movePanel('layers', 'left', Infinity);
    expect(activeRightPanel(useUi.getState())).toBe('format');
    // Dropping a panel on the right opens its tab.
    movePanel('layers', 'right', Infinity);
    expect(useUi.getState()).toMatchObject({ rightPanel: 'layers', aiOpen: false, rightOpen: true });
  });

  it('resets to the default layout and widths', () => {
    movePanel('shapes', 'right', 0);
    useUi.getState().set({ leftWidth: 400 });
    resetDock();
    expect(useUi.getState().dock).toEqual(DEFAULT_DOCK);
    expect(useUi.getState().leftWidth).toBe(264);
  });
});
