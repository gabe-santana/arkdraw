import { create } from 'zustand';

/** Floating panels and where they're docked (src/chrome/Dock.tsx). */
export type PanelId = 'shapes' | 'format' | 'layers';
export type DockSide = 'left' | 'right';
export type DockLayout = Record<DockSide, PanelId[]>;
export type ThemeMode = 'system' | 'light' | 'dark';
export type FormatTab = 'style' | 'text' | 'arrange';
type UiUnits = 'px' | 'pt' | 'in' | 'mm' | 'm';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  /** Optional third, destructive choice (e.g. "Don't save"). */
  denyLabel?: string;
  resolve: (choice: 'confirm' | 'deny' | 'cancel') => void;
}

interface UiState {
  leftOpen: boolean;
  rightOpen: boolean;
  /** Floating panel widths in px (user-resizable). */
  leftWidth: number;
  rightWidth: number;
  /** Width of the right column while its AI tab is showing (chat wants more room). */
  aiWidth: number;
  dock: DockLayout;
  /** The right column's tab when it isn't showing AI: one of the panels docked there. */
  rightPanel: PanelId;
  /** The Design panel's tab for a selection: Style, Text or Arrange. */
  formatTab: FormatTab;
  /** Layers docked on the left (stacked under Shapes): expanded, and its height. */
  layersOpen: boolean;
  layersHeight: number;
  theme: ThemeMode;
  contextMenu: { x: number; y: number } | null;
  paletteOpen: boolean;
  exportOpen: boolean;
  shortcutsOpen: boolean;
  /** The right column shows the AI tab (instead of one of its panels, `rightPanel`). */
  aiOpen: boolean;
  aiSettingsOpen: boolean;
  /** Quick shape picker (double-click on empty canvas). */
  shapePicker: { clientX: number; clientY: number; worldX: number; worldY: number; connectFrom?: string; /** Replace these shapes instead of inserting. */ replaceIds?: string[] } | null;
  findOpen: boolean;
  outlineOpen: boolean;
  editDataId: string | null;
  editStyleOpen: boolean;
  editDiagramOpen: boolean;
  importOpen: boolean;
  templatesOpen: boolean;
  layoutOpen: boolean;
  rulers: boolean;
  commentsOpen: boolean;
  revisionsOpen: boolean;
  prefsOpen: boolean;
  units: 'px' | 'pt' | 'in' | 'mm' | 'm';
  toasts: Toast[];
  confirm: ConfirmRequest | null;

  set: (patch: Partial<Omit<UiState, 'set' | 'toast' | 'ask'>>) => void;
  toast: (message: string, kind?: Toast['kind']) => void;
  ask: (req: Omit<ConfirmRequest, 'resolve'>) => Promise<'confirm' | 'deny' | 'cancel'>;
}

const THEME_KEY = 'arkdraw:theme';
const PANELS_KEY = 'arkdraw:panels';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

// First visit (nothing saved yet): the AI tab open, the library only where there's room for it.
const wide = typeof window === 'undefined' || window.innerWidth >= 1500;
const panels = load(PANELS_KEY, { leftOpen: wide, rightOpen: true, layersOpen: true, layersHeight: 300, leftWidth: 264, rightWidth: 268, aiWidth: 360, aiOpen: true, rightPanel: 'format' as PanelId, dock: { left: ['shapes'], right: ['format', 'layers'] } as DockLayout });
// A saved layout must still contain each panel exactly once.
{
  const all = [...panels.dock.left, ...panels.dock.right];
  if (all.length !== 3 || new Set(all).size !== 3) panels.dock = { left: ['shapes'], right: ['format', 'layers'] };
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  ...panels,
  // Light until the user picks a theme (View → Theme, or the toolbar toggle).
  theme: load(THEME_KEY, { theme: 'light' as ThemeMode }).theme,
  formatTab: 'style',
  contextMenu: null,
  paletteOpen: false,
  exportOpen: false,
  shortcutsOpen: false,
  aiSettingsOpen: false,
  shapePicker: null,
  findOpen: false,
  outlineOpen: false,
  editDataId: null,
  editStyleOpen: false,
  editDiagramOpen: false,
  importOpen: false,
  templatesOpen: false,
  layoutOpen: false,
  rulers: load('arkdraw:rulers', { rulers: false }).rulers,
  commentsOpen: false,
  revisionsOpen: false,
  prefsOpen: false,
  units: load('arkdraw:units', { units: 'px' as UiUnits }).units,
  toasts: [],
  confirm: null,

  set: (patch) => {
    set(patch);
    const s = get();
    try {
      if ('theme' in patch) localStorage.setItem(THEME_KEY, JSON.stringify({ theme: s.theme }));
      if ('rulers' in patch) localStorage.setItem('arkdraw:rulers', JSON.stringify({ rulers: s.rulers }));
      if ('units' in patch) localStorage.setItem('arkdraw:units', JSON.stringify({ units: s.units }));
      if (['leftOpen', 'rightOpen', 'layersOpen', 'layersHeight', 'leftWidth', 'rightWidth', 'aiWidth', 'aiOpen', 'rightPanel', 'dock'].some((k) => k in patch)) {
        const { leftOpen, rightOpen, layersOpen, layersHeight, leftWidth, rightWidth, aiWidth, aiOpen, rightPanel, dock } = s;
        localStorage.setItem(PANELS_KEY, JSON.stringify({ leftOpen, rightOpen, layersOpen, layersHeight, leftWidth, rightWidth, aiWidth, aiOpen, rightPanel, dock }));
      }
    } catch {
      /* storage unavailable */
    }
  },
  toast: (message, kind = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, message, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), kind === 'error' ? 6000 : 3200);
  },
  ask: (req) =>
    new Promise((resolve) => {
      set({
        confirm: {
          ...req,
          resolve: (choice) => {
            set({ confirm: null });
            resolve(choice);
          },
        },
      });
    }),
}));

// Dev server only: an edit to this store reloads the page instead of hot-swapping the module,
// which would leave part of the app on a new, empty copy of the store (a blank screen on the next click).
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
