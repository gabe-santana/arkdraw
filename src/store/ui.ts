import { create } from 'zustand';

export type LeftTab = 'shapes' | 'icons';
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
  leftTab: LeftTab;
  /** Layers dock (right, under Format): expanded, and its height. */
  layersOpen: boolean;
  layersHeight: number;
  theme: ThemeMode;
  contextMenu: { x: number; y: number } | null;
  paletteOpen: boolean;
  exportOpen: boolean;
  shortcutsOpen: boolean;
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

const THEME_KEY = 'opendraw:theme';
const PANELS_KEY = 'opendraw:panels';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const panels = load(PANELS_KEY, { leftOpen: true, rightOpen: true, leftTab: 'shapes' as LeftTab, layersOpen: true, layersHeight: 300 });
// Layers used to be a left tab.
if ((panels.leftTab as string) === 'layers') panels.leftTab = 'shapes';

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  ...panels,
  theme: load(THEME_KEY, { theme: 'system' as ThemeMode }).theme,
  contextMenu: null,
  paletteOpen: false,
  exportOpen: false,
  shortcutsOpen: false,
  aiOpen: false,
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
  rulers: load('opendraw:rulers', { rulers: false }).rulers,
  commentsOpen: false,
  revisionsOpen: false,
  prefsOpen: false,
  units: load('opendraw:units', { units: 'px' as UiUnits }).units,
  toasts: [],
  confirm: null,

  set: (patch) => {
    set(patch);
    const s = get();
    try {
      if ('theme' in patch) localStorage.setItem(THEME_KEY, JSON.stringify({ theme: s.theme }));
      if ('rulers' in patch) localStorage.setItem('opendraw:rulers', JSON.stringify({ rulers: s.rulers }));
      if ('units' in patch) localStorage.setItem('opendraw:units', JSON.stringify({ units: s.units }));
      if ('leftOpen' in patch || 'rightOpen' in patch || 'leftTab' in patch || 'layersOpen' in patch || 'layersHeight' in patch) {
        const { leftOpen, rightOpen, leftTab, layersOpen, layersHeight } = s;
        localStorage.setItem(PANELS_KEY, JSON.stringify({ leftOpen, rightOpen, leftTab, layersOpen, layersHeight }));
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
