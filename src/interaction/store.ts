/**
 * Transient editing state for the interaction features in this folder:
 * group isolation, freehand point editing, table cell selection, brush
 * settings and keyboard traversal. Kept out of the editor store so it never
 * ends up in the document or the undo history.
 */
import { create } from 'zustand';

export interface Brush {
  /** Stroke width in px. */
  width: number;
  color: string;
  /** 0 (raw) … 1 (very smooth): simplification tolerance for new strokes. */
  smoothing: number;
  /** Vary the width with pen pressure. */
  pressure: boolean;
}

export interface CellRange {
  /** Table shape id. */
  id: string;
  /** Anchor cell. */
  r: number;
  c: number;
  /** Opposite corner (Shift-click extends). */
  r2: number;
  c2: number;
}

interface InteractionState {
  /** Entered groups, outermost first (draw.io "Enter group"). Empty = root. */
  isolation: string[];
  /** Freehand shape whose points are being edited. */
  editPointsId: string | null;
  /** Selected vertex in point-edit mode. */
  activePoint: number | null;
  /** Selected cell range inside the selected table. */
  cell: CellRange | null;
  /** Table cell being typed into. */
  editingCell: { id: string; r: number; c: number } | null;
  brush: Brush;
  /** The current selection was reached with Tab / Shift+Tab. */
  traversing: boolean;
  set: (patch: Partial<Omit<InteractionState, 'set' | 'setBrush'>>) => void;
  setBrush: (patch: Partial<Brush>) => void;
}

const BRUSH_KEY = 'opendraw:brush';
const DEFAULT_BRUSH: Brush = { width: 2, color: '#1e293b', smoothing: 0.5, pressure: true };

function loadBrush(): Brush {
  try {
    return { ...DEFAULT_BRUSH, ...JSON.parse(localStorage.getItem(BRUSH_KEY) || '{}') };
  } catch {
    return DEFAULT_BRUSH;
  }
}

export const useInteraction = create<InteractionState>((set, get) => ({
  isolation: [],
  editPointsId: null,
  activePoint: null,
  cell: null,
  editingCell: null,
  brush: loadBrush(),
  traversing: false,
  set: (patch) => set(patch),
  setBrush: (patch) => {
    const brush = { ...get().brush, ...patch };
    try {
      localStorage.setItem(BRUSH_KEY, JSON.stringify(brush));
    } catch {
      /* storage unavailable */
    }
    set({ brush });
  },
}));
