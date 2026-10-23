/**
 * UI state for the extensibility features: the stencil editor (Edit shape /
 * Insert shape), the Plugins dialog and the editor UI mode.
 */
import { create } from 'zustand';

export type UiMode = 'default' | 'minimal' | 'sketch' | 'compact';
export const UI_MODES: Array<{ id: UiMode; label: string; hint: string }> = [
  { id: 'default', label: 'Default', hint: 'Floating panels' },
  { id: 'minimal', label: 'Minimal', hint: 'Panels tuck away until hovered' },
  { id: 'sketch', label: 'Sketch', hint: 'Hand-drawn look' },
  { id: 'compact', label: 'Compact', hint: 'Denser panels' },
];

const MODE_KEY = 'opendraw:ui-mode';

function loadMode(): UiMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return UI_MODES.some((m) => m.id === v) ? (v as UiMode) : 'default';
  } catch {
    return 'default';
  }
}

/** `edit`: the selected shape; `insert`: a new shape (Arrange → Insert → Shape…). */
export type StencilEditorMode = { mode: 'edit'; id: string } | { mode: 'insert' } | null;

interface ExtState {
  stencilEditor: StencilEditorMode;
  pluginsOpen: boolean;
  uiMode: UiMode;
  set: (patch: Partial<Omit<ExtState, 'set' | 'setUiMode'>>) => void;
  setUiMode: (mode: UiMode) => void;
}

export const useExt = create<ExtState>((set) => ({
  stencilEditor: null,
  pluginsOpen: false,
  uiMode: loadMode(),
  set: (patch) => set(patch),
  setUiMode: (uiMode) => {
    set({ uiMode });
    try {
      localStorage.setItem(MODE_KEY, uiMode);
    } catch {
      /* storage unavailable */
    }
  },
}));
