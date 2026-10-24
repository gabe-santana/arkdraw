import { create } from 'zustand';

/** Floating panels and where they're docked (src/chrome/Dock.tsx). */
export type PanelId = 'shapes' | 'format' | 'layers';
export type DockSide = 'left' | 'right';
export type DockLayout = Record<DockSide, PanelId[]>;
export type ThemeMode = 'system' | 'light' | 'dark';
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
  /** Layers dock (right, under Format): expanded, and its height. */
  layersOpen: boolean;
  layersHeight: number;
  theme: ThemeMode;
  contextMenu: { x: number; y: number } | null;
  paletteOpen: boolean;
  exportOpen: boolean;
  shortcutsOpen: boolean;
  /** The right column shows the AI tab (instead of Design: Format + Layers). */
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
const panels = load(PANELS_KEY, { leftOpen: wide, rightOpen: true, layersOpen: true, layersHeight: 300, leftWidth: 264, rightWidth: 268, aiWidth: 360, aiOpen: true, dock: { left: ['shapes'], right: ['format', 'layers'] } as DockLayout });
// A saved layout must still contain each panel exactly once.
{
  const all = [...panels.dock.left, ...panels.dock.right];
  if (all.length !== 3 || new Set(all).size !== 3) panels.dock = { left: ['shapes'], right: ['format', 'layers'] };
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  ...panels,
  // Dark until the user picks a theme, like the site and the demos.
  theme: load(THEME_KEY, { theme: 'dark' as ThemeMode }).theme,
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
      if ('leftOpen' in patch || 'rightOpen' in patch || 'layersOpen' in patch || 'layersHeight' in patch || 'leftWidth' in patch || 'rightWidth' in patch || 'aiWidth' in patch || 'aiOpen' in patch || 'dock' in patch) {
        const { leftOpen, rightOpen, layersOpen, layersHeight, leftWidth, rightWidth, aiWidth, aiOpen, dock } = s;
        localStorage.setItem(PANELS_KEY, JSON.stringify({ leftOpen, rightOpen, layersOpen, layersHeight, leftWidth, rightWidth, aiWidth, aiOpen, dock }));
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
