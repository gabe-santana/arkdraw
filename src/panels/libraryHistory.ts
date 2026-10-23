/**
 * Favorites and recently used library items (draw.io parity). Entries are
 * serializable references resolved against the built-in libraries / icon packs
 * at render time, so they survive library updates (unresolvable ones are
 * skipped). Persisted locally, like user libraries.
 */
import { create } from 'zustand';

export type LibraryRef =
  | { type: 'shape'; libraryId: string; label: string }
  | { type: 'icon'; provider: string; iconId: string };

export const RECENT_LIMIT = 12;
const RECENT_KEY = 'opendraw:library-recent';
const FAVORITES_KEY = 'opendraw:library-favorites';

export const refKey = (r: LibraryRef) => (r.type === 'shape' ? `shape:${r.libraryId}:${r.label}` : `icon:${r.provider}:${r.iconId}`);

/** Moves `ref` to the front, dropping duplicates and anything past `limit`. */
export function pushRecent(list: LibraryRef[], ref: LibraryRef, limit = RECENT_LIMIT): LibraryRef[] {
  const key = refKey(ref);
  return [ref, ...list.filter((r) => refKey(r) !== key)].slice(0, limit);
}

/** Adds `ref` at the end, or removes it if already there. */
export function toggleRef(list: LibraryRef[], ref: LibraryRef): LibraryRef[] {
  const key = refKey(ref);
  return list.some((r) => refKey(r) === key) ? list.filter((r) => refKey(r) !== key) : [...list, ref];
}

export const hasRef = (list: LibraryRef[], ref: LibraryRef) => {
  const key = refKey(ref);
  return list.some((r) => refKey(r) === key);
};

function isRef(r: unknown): r is LibraryRef {
  const o = r as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return false;
  if (o.type === 'shape') return typeof o.libraryId === 'string' && typeof o.label === 'string';
  if (o.type === 'icon') return typeof o.provider === 'string' && typeof o.iconId === 'string';
  return false;
}

/** Parses a stored list, dropping malformed and duplicate entries. */
export function parseRefs(json: string | null): LibraryRef[] {
  try {
    const data = JSON.parse(json || '[]');
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data.filter(isRef).filter((r) => !seen.has(refKey(r)) && !!seen.add(refKey(r)));
  } catch {
    return [];
  }
}

function read(key: string): LibraryRef[] {
  try {
    return parseRefs(localStorage.getItem(key));
  } catch {
    return [];
  }
}

function write(key: string, list: LibraryRef[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota exceeded / storage unavailable */
  }
}

interface HistoryState {
  recent: LibraryRef[];
  favorites: LibraryRef[];
  recordUse: (ref: LibraryRef) => void;
  clearRecent: () => void;
  toggleFavorite: (ref: LibraryRef) => void;
}

export const useLibraryHistory = create<HistoryState>((set, get) => ({
  recent: read(RECENT_KEY),
  favorites: read(FAVORITES_KEY),
  recordUse: (ref) => {
    const recent = pushRecent(get().recent, ref);
    set({ recent });
    write(RECENT_KEY, recent);
  },
  clearRecent: () => {
    set({ recent: [] });
    write(RECENT_KEY, []);
  },
  toggleFavorite: (ref) => {
    const favorites = toggleRef(get().favorites, ref);
    set({ favorites });
    write(FAVORITES_KEY, favorites);
  },
}));
