/**
 * Favorites and recently used library items (). Entries are
 * serializable references resolved against the built-in libraries / icon packs
 * at render time, so they survive library updates (unresolvable ones are
 * skipped). Persisted locally, like user libraries.
 */
import { create } from 'zustand';
import type { DiagramElement } from '@/model/types';
import { LIBRARIES } from '@/shapes/libraries';
import { loadPack } from '@/icons/iconPacks';

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

/** Kinds that aren't worth a Recent entry (plain text, group boxes). */
const UNTRACKED_KINDS = new Set(['text', 'group', 'container']);

/**
 * Records what a batch of new elements used (e.g. a diagram the AI drew),
 * so its icons and shapes show up in Recent like ones the user dragged in.
 * The first element ends up first.
 */
export async function recordElementsUse(elements: DiagramElement[]): Promise<void> {
  const refs: LibraryRef[] = [];
  const seen = new Set<string>();
  const add = (ref: LibraryRef) => {
    const key = refKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  };
  for (const el of elements) {
    if (el.type !== 'shape' || UNTRACKED_KINDS.has(el.kind)) continue;
    if (el.kind === 'icon' && el.icon && !/^(data|https?|blob):/.test(el.icon)) {
      const slash = el.icon.indexOf('/');
      const provider = el.icon.slice(0, slash);
      const pack = await loadPack(provider).catch(() => null);
      const entry = pack?.icons.find((i) => i.file === el.icon!.slice(slash + 1));
      if (entry) add({ type: 'icon', provider, iconId: entry.id });
    } else if (el.kind !== 'icon') {
      const lib = LIBRARIES.find((l) => l.items.some((i) => i.kind === el.kind));
      const item = lib?.items.find((i) => i.kind === el.kind);
      if (lib && item) add({ type: 'shape', libraryId: lib.id, label: item.label });
    }
  }
  const { recordUse } = useLibraryHistory.getState();
  for (const ref of refs.slice(0, RECENT_LIMIT).reverse()) recordUse(ref);
}
