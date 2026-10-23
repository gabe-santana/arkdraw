/**
 * User libraries: the Scratchpad plus any number of custom libraries. Items
 * are snapshots of elements (one shape or a whole group with connectors) that
 * can be dropped back onto the canvas. Persisted locally; libraries can be
 * exported/imported as `.opendrawlib` files, and draw.io `<mxlibrary>` files
 * can be imported.
 */
import { create } from 'zustand';
import type { DiagramElement, Doc } from '@/model/types';
import { uid } from '@/lib/id';
import { selectionBounds } from '@/store/editor';
import { importDrawio } from '@/io/drawio';

export interface UserLibraryItem {
  id: string;
  title: string;
  /** Elements with coordinates relative to the item's top-left. */
  elements: DiagramElement[];
  w: number;
  h: number;
}

export interface UserLibrary {
  id: string;
  name: string;
  items: UserLibraryItem[];
}

export const SCRATCHPAD_ID = 'scratchpad';
const KEY = 'opendraw:user-libraries';

function load(): UserLibrary[] {
  try {
    const libs = JSON.parse(localStorage.getItem(KEY) || '[]') as UserLibrary[];
    if (!libs.some((l) => l.id === SCRATCHPAD_ID)) libs.unshift({ id: SCRATCHPAD_ID, name: 'Scratchpad', items: [] });
    return libs;
  } catch {
    return [{ id: SCRATCHPAD_ID, name: 'Scratchpad', items: [] }];
  }
}

interface LibState {
  libraries: UserLibrary[];
  addItem: (libraryId: string, elements: DiagramElement[], title?: string) => void;
  removeItem: (libraryId: string, itemId: string) => void;
  renameItem: (libraryId: string, itemId: string, title: string) => void;
  createLibrary: (name: string, items?: UserLibraryItem[]) => string;
  removeLibrary: (libraryId: string) => void;
  renameLibrary: (libraryId: string, name: string) => void;
}

export const useUserLibraries = create<LibState>((set, get) => {
  const persist = (libraries: UserLibrary[]) => {
    set({ libraries });
    try {
      localStorage.setItem(KEY, JSON.stringify(libraries));
    } catch {
      /* quota exceeded */
    }
  };
  return {
    libraries: load(),
    addItem: (libraryId, elements, title) => {
      if (!elements.length) return;
      const doc: Doc = { elements: Object.fromEntries(elements.map((e) => [e.id, e])), order: elements.map((e) => e.id) };
      const b = selectionBounds(doc, doc.order) ?? { x: 0, y: 0, w: 100, h: 60 };
      const moved = elements.map((e) => translate(e, -b.x, -b.y));
      const item: UserLibraryItem = {
        id: uid(),
        title: title ?? (elements.find((e) => e.text)?.text.split('\n')[0] || `${elements.length} element${elements.length > 1 ? 's' : ''}`),
        elements: moved,
        w: Math.max(1, Math.round(b.w)),
        h: Math.max(1, Math.round(b.h)),
      };
      persist(get().libraries.map((l) => (l.id === libraryId ? { ...l, items: [...l.items, item] } : l)));
    },
    removeItem: (libraryId, itemId) => persist(get().libraries.map((l) => (l.id === libraryId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l))),
    renameItem: (libraryId, itemId, title) =>
      persist(get().libraries.map((l) => (l.id === libraryId ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, title } : i)) } : l))),
    createLibrary: (name, items = []) => {
      const id = uid();
      persist([...get().libraries, { id, name, items }]);
      return id;
    },
    removeLibrary: (libraryId) => persist(get().libraries.filter((l) => l.id !== libraryId || l.id === SCRATCHPAD_ID)),
    renameLibrary: (libraryId, name) => persist(get().libraries.map((l) => (l.id === libraryId ? { ...l, name } : l))),
  };
});

export function translate(e: DiagramElement, dx: number, dy: number): DiagramElement {
  if (e.type === 'shape') return { ...e, x: e.x + dx, y: e.y + dy };
  return {
    ...e,
    source: { ...e.source, x: e.source.x + dx, y: e.source.y + dy },
    target: { ...e.target, x: e.target.x + dx, y: e.target.y + dy },
    waypoints: e.waypoints?.map((w) => ({ x: w.x + dx, y: w.y + dy })),
  };
}

// --- Files ---------------------------------------------------------------------------------

export function serializeLibrary(lib: UserLibrary): string {
  return JSON.stringify({ format: 'opendraw-library', version: 1, name: lib.name, items: lib.items }, null, 2) + '\n';
}

/** Parses an `.opendrawlib` file or a draw.io `<mxlibrary>` file. */
export async function parseLibrary(text: string, fileName: string): Promise<{ name: string; items: UserLibraryItem[] }> {
  const name = fileName.replace(/\.[^.]+$/, '');
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    if (data?.format !== 'opendraw-library' || !Array.isArray(data.items)) throw new Error('Not an OpenDraw library.');
    return { name: data.name || name, items: data.items.map((i: UserLibraryItem) => ({ ...i, id: uid() })) };
  }
  const m = trimmed.match(/<mxlibrary[^>]*>([\s\S]*)<\/mxlibrary>/);
  if (!m) throw new Error('Unsupported library file.');
  const entries = JSON.parse(m[1]) as Array<{ xml?: string; title?: string; w?: number; h?: number; data?: string }>;
  const items: UserLibraryItem[] = [];
  for (const entry of entries) {
    if (!entry.xml) continue;
    try {
      const xml = entry.xml.trim().startsWith('<') ? entry.xml : `<mxfile><diagram>${entry.xml}</diagram></mxfile>`;
      const doc = await importDrawio(xml);
      const els = doc.order.map((id) => doc.elements[id]);
      const b = selectionBounds(doc, doc.order) ?? { x: 0, y: 0, w: entry.w ?? 100, h: entry.h ?? 60 };
      items.push({ id: uid(), title: entry.title ?? 'Shape', elements: els.map((e) => translate(e, -b.x, -b.y)), w: Math.round(b.w), h: Math.round(b.h) });
    } catch {
      /* skip unreadable entries */
    }
  }
  return { name, items };
}
