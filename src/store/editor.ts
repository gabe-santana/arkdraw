/**
 * Editor store (Zustand).
 *
 * Undo/redo is snapshot based: the document is immutable and updates share
 * structure, so a snapshot is just a reference to the previous `Doc`. That
 * makes history O(1) per step and trivially correct. Continuous gestures
 * (drag, resize) call `beginInteraction()` / `endInteraction()` so a whole
 * gesture becomes a single undo step.
 */
import { create } from 'zustand';
import type { ConnectorElement, DiagramElement, Doc, DocumentMeta, ElementStyle, Endpoint, Layer, Page, PageSettings, Rect, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { uid } from '@/lib/id';
import { rememberConnectorStyle } from '@/model/defaults';
import { clamp, rotatedBounds, unionRects } from '@/lib/geometry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { boundsOfPoints } from '@/lib/geometry';
import { effectiveSettings, pageGridPatch } from '@/styling/pageGrid';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Guide {
  /** `x`: vertical line at x = at; `y`: horizontal line at y = at. */
  axis: 'x' | 'y';
  /** `gap` guides are equal-spacing distance markers. */
  kind?: 'align' | 'gap';
  /** World coordinate of the line. */
  at: number;
  from: number;
  to: number;
}

export interface Settings {
  grid: boolean;
  snap: boolean;
  guides: boolean;
  gridSize: number;
  /** Re-tint diagram colors in dark mode (exports keep real colors). */
  adaptColors: boolean;
  /** Show connection points / quick-connect arrows on hover. */
  connectionPoints: boolean;
  /** Grid dot color (absent = theme default). Per page via src/styling/pageGrid.ts. */
  gridColor?: string;
  /** View → Scrollbars: overlay scrollbars on the canvas. */
  scrollbars?: boolean;
}

/** `select` | `hand` | `connector` | `shape:<preset id>` */
export type ToolId = string;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const HISTORY_LIMIT = 200;

const EMPTY_DOC: Doc = { elements: {}, order: [] };

const SETTINGS_KEY = 'arkdraw:settings';
function loadSettings(): Settings {
  const defaults: Settings = { grid: true, snap: true, guides: true, gridSize: 10, adaptColors: true, connectionPoints: true };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

export interface FileState {
  path: string | null;
  name: string;
  /** The active page's doc as last saved/opened. */
  savedDoc: Doc;
  /** Every page's doc as last saved, keyed by page id. */
  savedDocs: Record<string, Doc>;
  /** Signature of page names/order/settings at save time. */
  savedMeta: string;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = { background: null, paper: 'A4', landscape: false, pageView: false };

interface PageHistory {
  past: Doc[];
  future: Doc[];
  camera: Camera;
}

export interface EditorState {
  doc: Doc;
  selection: string[];
  editingId: string | null;
  camera: Camera;
  viewport: { w: number; h: number };
  tool: ToolId;
  settings: Settings;
  guides: Guide[];
  marquee: Rect | null;
  hoverId: string | null;
  dropTargetId: string | null;
  /**
   * Preview while dragging a new connector. With both ends known (`source`,
   * `target`) the overlay draws the connector itself, routed and styled as it
   * will be created; otherwise a line from `from` to `to`.
   */
  connectDraft: { from: Vec; to: Vec; targetId: string | null; source?: Endpoint; target?: Endpoint; made?: boolean } | null;
  past: Doc[];
  future: Doc[];
  interactionBase: Doc | null;
  file: FileState;
  clipboard: DiagramElement[] | null;
  /** Animation preview running (docs/specs/animation.md). */
  playing: boolean;
  /** All pages. The active page's `doc` field is stale — the live doc is `doc`. */
  pages: Page[];
  activePageId: string;
  /** Layer new elements go into (null = the page's first layer). */
  activeLayerId: string | null;
  pageHistory: Record<string, PageHistory>;
  /** File properties (File → Properties); replaced whenever a document is loaded. */
  docMeta: DocumentMeta;
  /** The AI conversation saved with the file (src/ai owns its shape); replaced whenever a document is loaded. */
  aiHistory: unknown[];
  /** View filter: when non-empty, only shapes carrying one of these tags are shown. */
  tagFilter: string[];
  /** Brief visual feedback after group / ungroup (cleared automatically). */
  flash: { kind: 'group' | 'ungroup'; rects: Rect[]; count: number; at: number } | null;

  // --- view
  setTool: (tool: ToolId) => void;
  setCamera: (camera: Camera) => void;
  setViewport: (w: number, h: number) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screen: Vec, z: number) => void;
  animateCamera: (target: Camera) => void;
  zoomBy: (factor: number) => void;
  zoomToFit: (ids?: string[], insets?: { left: number; right: number; top: number; bottom: number }) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  // --- selection
  select: (ids: string[], additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setEditing: (id: string | null) => void;

  // --- document
  addElements: (els: DiagramElement[], opts?: { select?: boolean }) => void;
  updateElements: (patches: Record<string, Partial<ShapeElement> | Partial<ConnectorElement>>) => void;
  updateStyle: (ids: string[], style: Partial<ElementStyle>) => void;
  /** Deletes elements. Connectors attached to deleted shapes are detached, or removed with `withConnections`. */
  deleteElements: (ids: string[], withConnections?: boolean) => void;
  deleteSelection: (withConnections?: boolean) => void;
  toggleCollapse: (id: string) => void;
  duplicateSelection: () => void;
  copySelection: () => DiagramElement[];
  cutSelection: () => void;
  paste: (els?: DiagramElement[], at?: Vec) => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  reorder: (mode: 'forward' | 'backward' | 'front' | 'back') => void;
  moveElement: (id: string, toIndex: number) => void;
  align: (mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
  distribute: (axis: 'h' | 'v') => void;
  toggleLock: () => void;
  nudge: (dx: number, dy: number) => void;

  // --- history
  undo: () => void;
  redo: () => void;
  beginInteraction: () => void;
  endInteraction: () => void;
  /** Mutate without recording history (used inside interactions). */
  setDoc: (doc: Doc) => void;

  // --- file
  loadDoc: (doc: Doc, file: { path: string | null; name: string }) => void;
  newDoc: () => void;
  markSaved: (path: string | null, name: string) => void;

  setPlaying: (playing: boolean) => void;

  // --- pages
  /** Pages with the live doc merged in (for saving/exporting). */
  allPages: () => Page[];
  loadPages: (pages: Page[], file: { path: string | null; name: string; meta?: DocumentMeta; assistant?: unknown[] }) => void;
  /** Replace the saved AI conversation (marks the file unsaved). */
  setAiHistory: (runs: unknown[]) => void;
  addPage: (name?: string, doc?: Doc) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  movePage: (id: string, toIndex: number) => void;
  switchPage: (id: string) => void;
  updatePageSettings: (patch: Partial<PageSettings>) => void;

  // --- layers
  ensureLayers: () => Layer[];
  addLayer: (name?: string) => void;
  renameLayer: (id: string, name: string) => void;
  /** Merges a patch into a layer (e.g. its Edit Data properties) as one undo step. */
  updateLayer: (id: string, patch: Partial<Omit<Layer, 'id'>>) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  deleteLayer: (id: string) => void;
  moveLayerTo: (id: string, toIndex: number) => void;
  setActiveLayer: (id: string | null) => void;
  moveSelectionToLayer: (layerId: string) => void;
  /** Copies a layer and its elements, placed above it. */
  duplicateLayer: (id: string) => void;
  /** Selects every visible, unlocked element on a layer. */
  selectLayer: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export const shapeRect = (s: ShapeElement): Rect => ({ x: s.x, y: s.y, w: s.w, h: s.h });

/** Bounds of an element (connectors: their route). */
export function elementBounds(el: DiagramElement, doc: Doc): Rect {
  if (isShape(el)) return rotatedBounds(el);
  const g = connectorGeometryInDoc(el, doc.elements);
  return boundsOfPoints(g.samples);
}

export function selectionBounds(doc: Doc, ids: string[]): Rect | null {
  return unionRects(ids.map((id) => doc.elements[id]).filter(Boolean).map((el) => elementBounds(el, doc)));
}

/** All element ids sharing `id`'s outermost group (or just `id`). */
export function groupMembers(doc: Doc, id: string): string[] {
  const el = doc.elements[id];
  if (!el || !el.groupIds.length) return [id];
  const outer = el.groupIds[el.groupIds.length - 1];
  return doc.order.filter((oid) => doc.elements[oid]?.groupIds.includes(outer));
}

/** Shapes contained (recursively) in the given containers. */
export function containedShapes(doc: Doc, containerIds: Iterable<string>): string[] {
  const out = new Set<string>();
  const queue = [...containerIds];
  while (queue.length) {
    const cid = queue.pop()!;
    for (const id of doc.order) {
      const el = doc.elements[id];
      if (isShape(el) && el.containerId === cid && !out.has(id)) {
        out.add(id);
        queue.push(id);
      }
    }
  }
  return [...out];
}

function withElements(doc: Doc, patches: Record<string, DiagramElement>): Doc {
  return { ...doc, elements: { ...doc.elements, ...patches } };
}

/** Deep-copies elements with fresh ids, remapping references between them. */
export function cloneElements(els: DiagramElement[], offset: Vec): DiagramElement[] {
  const idMap = new Map(els.map((e) => [e.id, uid()]));
  const groupMap = new Map<string, string>();
  const mapGroup = (g: string) => {
    if (!groupMap.has(g)) groupMap.set(g, uid());
    return groupMap.get(g)!;
  };
  return els.map((el) => {
    const base = { ...el, id: idMap.get(el.id)!, groupIds: el.groupIds.map(mapGroup), style: { ...el.style } };
    if (isShape(el)) {
      return {
        ...(base as ShapeElement),
        x: el.x + offset.x,
        y: el.y + offset.y,
        containerId: el.containerId && idMap.has(el.containerId) ? idMap.get(el.containerId) : undefined,
      };
    }
    const remap = (e: ConnectorElement['source']) => ({
      ...e,
      x: e.x + offset.x,
      y: e.y + offset.y,
      elementId: e.elementId && idMap.has(e.elementId) ? idMap.get(e.elementId) : undefined,
      side: e.elementId && idMap.has(e.elementId) ? e.side : undefined,
    });
    return { ...(base as ConnectorElement), source: remap(el.source), target: remap(el.target) };
  });
}

/** Refresh the cached endpoint positions of connectors (used when detaching). */
function bakeEndpoints(doc: Doc, conn: ConnectorElement): ConnectorElement {
  const g = connectorGeometryInDoc(conn, doc.elements);
  return { ...conn, source: { ...conn.source, x: g.start.x, y: g.start.y }, target: { ...conn.target, x: g.end.x, y: g.end.y } };
}

export const DEFAULT_LAYER_ID = 'layer-1';

/** Layers of a doc (an implicit single layer when none are defined). */
export const layersOf = (doc: Doc): Layer[] => doc.layers ?? [{ id: DEFAULT_LAYER_ID, name: 'Background', visible: true, locked: false }];

/** The layer an element lives on. */
export function layerOf(doc: Doc, el: DiagramElement): Layer {
  const layers = layersOf(doc);
  return layers.find((l) => l.id === el.layerId) ?? layers[0];
}

/** True if the element can't be edited (its own lock or its layer's). */
export const isLocked = (doc: Doc, el: DiagramElement | undefined): boolean => !!el && (!!el.locked || layerOf(doc, el).locked);

/** True if the element is hidden (layer hidden or inside a collapsed container). */
export function isHidden(doc: Doc, el: DiagramElement | undefined): boolean {
  if (!el) return true;
  if (el.hidden) return true;
  if (!layerOf(doc, el).visible) return true;
  let parentId = el.type === 'shape' ? el.containerId : undefined;
  let guard = 0;
  while (parentId && guard++ < 50) {
    const parent = doc.elements[parentId];
    if (!parent || parent.type !== 'shape') break;
    if (parent.collapsed) return true;
    parentId = parent.containerId;
  }
  return false;
}

/** Render order: element order, grouped by layer (bottom layer first). */
export function renderOrder(doc: Doc): string[] {
  if (!doc.layers || doc.layers.length < 2) return doc.order;
  const rank = new Map(doc.layers.map((l, i) => [l.id, i]));
  const first = doc.layers[0].id;
  return doc.order
    .map((id, i) => ({ id, i, r: rank.get(doc.elements[id]?.layerId ?? first) ?? 0 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.id);
}

export const newPage = (name: string, doc: Doc = EMPTY_DOC): Page => ({ id: uid(), name, doc, settings: { ...DEFAULT_PAGE_SETTINGS } });

const pagesMeta = (pages: Page[]) => JSON.stringify(pages.map((p) => [p.id, p.name, p.settings, p.data]));

const FIRST_PAGE = newPage('Page 1');

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let cameraAnim = 0;
let flashTimer = 0;

/** Shows a short-lived visual confirmation, then clears it. */
function flashFeedback(set: (p: Partial<EditorState>) => void, f: { kind: 'group' | 'ungroup'; rects: Rect[]; count: number }) {
  window.clearTimeout(flashTimer);
  set({ flash: { ...f, at: performance.now() } });
  flashTimer = window.setTimeout(() => set({ flash: null }), 700);
}

/**
 * The page settings (background, paper, grid…) in force at each history step,
 * so undo and redo restore them along with the document. Keyed by the
 * history entry (a document snapshot), so the history stays a list of documents.
 */
const settingsAt = new WeakMap<Doc, PageSettings>();
/** Settings changes this close together (dragging a color) are one undo step. */
const SETTINGS_COALESCE_MS = 600;

export const useEditor = create<EditorState>((set, get) => {
  const pageSettings = () => get().pages.find((p) => p.id === get().activePageId)?.settings;
  /** A history entry for `doc`, remembering the page settings that go with it. */
  const remember = (doc: Doc, settings = pageSettings()) => {
    if (settings) settingsAt.set(doc, settings);
    return doc;
  };
  let lastSettingsStep: { entry: Doc; at: number } | null = null;

  /** Apply a document change, recording history unless inside an interaction. */
  const commit = (next: Doc, extra: Partial<EditorState> = {}) => {
    const s = get();
    if (next === s.doc) return;
    if (s.interactionBase) {
      set({ doc: next, ...extra });
      return;
    }
    set({ doc: next, past: [...s.past.slice(-HISTORY_LIMIT + 1), remember(s.doc)], future: [], ...extra });
  };

  /** Puts the page settings recorded with a history entry back on the active page. */
  const restoreSettings = (entry: Doc) => {
    const saved = settingsAt.get(entry);
    const { pages, activePageId } = get();
    if (!saved || saved === pageSettings()) return {};
    return {
      pages: pages.map((p) => (p.id === activePageId ? { ...p, settings: saved } : p)),
      settings: effectiveSettings(loadSettings(), saved),
    };
  };

  const selected = () => {
    const { doc, selection } = get();
    return selection.map((id) => doc.elements[id]).filter(Boolean);
  };

  return {
    doc: EMPTY_DOC,
    selection: [],
    editingId: null,
    camera: { x: 0, y: 0, z: 1 },
    viewport: { w: 1200, h: 800 },
    tool: 'select',
    settings: loadSettings(),
    guides: [],
    marquee: null,
    hoverId: null,
    dropTargetId: null,
    connectDraft: null,
    past: [],
    future: [],
    interactionBase: null,
    file: { path: null, name: 'Untitled', savedDoc: EMPTY_DOC, savedDocs: { [FIRST_PAGE.id]: EMPTY_DOC }, savedMeta: pagesMeta([FIRST_PAGE]) },
    clipboard: null,
    playing: false,
    pages: [FIRST_PAGE],
    activePageId: FIRST_PAGE.id,
    activeLayerId: null,
    pageHistory: {},
    docMeta: {},
    aiHistory: [],
    tagFilter: [],
    flash: null,

    // --- view ---------------------------------------------------------------
    setTool: (tool) => set({ tool, editingId: null }),
    setCamera: (camera) => {
      cancelAnimationFrame(cameraAnim);
      set({ camera });
    },
    setViewport: (w, h) => set({ viewport: { w, h } }),
    panBy: (dx, dy) => {
      const c = get().camera;
      get().setCamera({ ...c, x: c.x + dx, y: c.y + dy });
    },
    zoomAt: (p, z) => {
      const c = get().camera;
      const nz = clamp(z, MIN_ZOOM, MAX_ZOOM);
      const wx = (p.x - c.x) / c.z;
      const wy = (p.y - c.y) / c.z;
      get().setCamera({ x: p.x - wx * nz, y: p.y - wy * nz, z: nz });
    },
    animateCamera: (target) => {
      cancelAnimationFrame(cameraAnim);
      const from = get().camera;
      // Timed on the frame clock alone: it can differ from performance.now() (e.g. animations slowed down in DevTools).
      let t0: number | undefined;
      const duration = 260;
      const step = (now: number) => {
        t0 ??= now;
        const t = Math.min(1, (now - t0) / duration);
        const k = 1 - Math.pow(1 - t, 3); // ease-out cubic
        // Interpolate zoom geometrically so it feels uniform.
        const z = from.z * Math.pow(target.z / from.z, k);
        set({ camera: { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, z } });
        if (t < 1) cameraAnim = requestAnimationFrame(step);
      };
      cameraAnim = requestAnimationFrame(step);
    },
    zoomBy: (factor) => {
      const { camera: c, viewport: v } = get();
      const z = clamp(c.z * factor, MIN_ZOOM, MAX_ZOOM);
      const cx = v.w / 2;
      const cy = v.h / 2;
      const wx = (cx - c.x) / c.z;
      const wy = (cy - c.y) / c.z;
      get().animateCamera({ x: cx - wx * z, y: cy - wy * z, z });
    },
    zoomToFit: (ids, insets = { left: 300, right: 300, top: 40, bottom: 90 }) => {
      const { doc, viewport: v } = get();
      const target = ids?.length ? ids : doc.order;
      const b = selectionBounds(doc, target);
      if (!b) {
        get().animateCamera({ x: v.w / 2, y: v.h / 2, z: 1 });
        return;
      }
      const availW = Math.max(100, v.w - insets.left - insets.right);
      const availH = Math.max(100, v.h - insets.top - insets.bottom);
      const z = clamp(Math.min(availW / (b.w + 80), availH / (b.h + 80), 1.5), MIN_ZOOM, MAX_ZOOM);
      get().animateCamera({
        x: insets.left + availW / 2 - (b.x + b.w / 2) * z,
        y: insets.top + availH / 2 - (b.y + b.h / 2) * z,
        z,
      });
    },
    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      try {
        // Persist the global defaults (not the active page's grid overrides).
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...patch }));
      } catch {
        /* storage unavailable */
      }
      set({ settings });
      // Grid & snap are per page as well (src/styling/pageGrid.ts).
      const pagePatch = pageGridPatch(patch, settings);
      if (pagePatch) get().updatePageSettings(pagePatch);
    },

    // --- selection ----------------------------------------------------------
    select: (ids, additive = false) => {
      const cur = get().selection;
      if (!additive) {
        set({ selection: [...new Set(ids)], editingId: null });
        return;
      }
      const allIn = ids.every((id) => cur.includes(id));
      set({ selection: allIn ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])] });
    },
    selectAll: () => {
      const { doc } = get();
      set({ selection: doc.order.filter((id) => !isLocked(doc, doc.elements[id]) && !isHidden(doc, doc.elements[id]) && doc.elements[id].behavior?.selectable !== false) });
    },
    clearSelection: () => set({ selection: [], editingId: null }),
    setEditing: (id) => set({ editingId: id }),

    // --- document -----------------------------------------------------------
    addElements: (els, opts = { select: true }) => {
      const { doc, activeLayerId } = get();
      if (doc.layers && activeLayerId) els = els.map((e) => (e.layerId ? e : { ...e, layerId: activeLayerId }));
      const patches = Object.fromEntries(els.map((e) => [e.id, e]));
      commit(
        { ...doc, elements: { ...doc.elements, ...patches }, order: [...doc.order, ...els.map((e) => e.id)] },
        opts.select ? { selection: els.map((e) => e.id) } : {},
      );
    },
    updateElements: (patches) => {
      const { doc } = get();
      const next: Record<string, DiagramElement> = {};
      for (const [id, patch] of Object.entries(patches)) {
        const el = doc.elements[id];
        if (el) next[id] = { ...el, ...patch } as DiagramElement;
        if (el?.type === 'connector' && !get().interactionBase) {
          const p = patch as Partial<ConnectorElement>;
          if (p.routing || p.startArrow || p.endArrow || 'connectorShape' in p || 'lineJumps' in p) rememberConnectorStyle(p);
        }
      }
      commit(withElements(doc, next));
    },
    updateStyle: (ids, style) => {
      const { doc } = get();
      const next: Record<string, DiagramElement> = {};
      for (const id of ids) {
        const el = doc.elements[id];
        if (el) next[id] = { ...el, style: { ...el.style, ...style } };
        if (el?.type === 'connector') rememberConnectorStyle({ style: { ...el.style, ...style } });
      }
      commit(withElements(doc, next));
    },
    deleteElements: (ids, withConnections = false) => {
      const { doc, selection } = get();
      const kill = new Set(ids.filter((id) => doc.elements[id] && !isLocked(doc, doc.elements[id]) && doc.elements[id].behavior?.deletable !== false));
      if (!kill.size) return;
      const elements: Record<string, DiagramElement> = {};
      if (withConnections) {
        for (const id of doc.order) {
          const el = doc.elements[id];
          if (isConnector(el) && ((el.source.elementId && kill.has(el.source.elementId)) || (el.target.elementId && kill.has(el.target.elementId)))) kill.add(id);
        }
      }
      for (const id of doc.order) {
        if (kill.has(id)) continue;
        let el = doc.elements[id];
        // Children of a deleted container are released, not deleted.
        if (isShape(el) && el.containerId && kill.has(el.containerId)) el = { ...el, containerId: undefined };
        // Connectors whose shape went away keep their last position as a free end.
        if (isConnector(el) && ((el.source.elementId && kill.has(el.source.elementId)) || (el.target.elementId && kill.has(el.target.elementId)))) {
          const baked = bakeEndpoints(doc, el);
          el = {
            ...baked,
            source: baked.source.elementId && kill.has(baked.source.elementId) ? { x: baked.source.x, y: baked.source.y } : baked.source,
            target: baked.target.elementId && kill.has(baked.target.elementId) ? { x: baked.target.x, y: baked.target.y } : baked.target,
          };
        }
        elements[id] = el;
      }
      commit({ ...doc, elements, order: doc.order.filter((id) => !kill.has(id)) }, { selection: selection.filter((id) => !kill.has(id)), editingId: null });
    },
    deleteSelection: (withConnections = false) => get().deleteElements(get().selection, withConnections),
    toggleCollapse: (id) => {
      const { doc } = get();
      const el = doc.elements[id];
      if (!isShape(el)) return;
      const HEADER = 36;
      if (el.collapsed) {
        const h = Number(el.data?.__expandedH) || Math.max(el.h, 120);
        const data = { ...el.data };
        delete data.__expandedH;
        get().updateElements({ [id]: { collapsed: false, h, data: Object.keys(data).length ? data : undefined } });
      } else {
        get().updateElements({ [id]: { collapsed: true, h: HEADER, data: { ...el.data, __expandedH: String(el.h) } } });
      }
    },
    copySelection: () => {
      const { doc, selection } = get();
      const ids = new Set(selection);
      // Bring along the contents of copied containers.
      for (const id of containedShapes(doc, selection)) ids.add(id);
      const els = doc.order.filter((id) => ids.has(id)).map((id) => {
        const el = doc.elements[id];
        return isConnector(el) ? bakeEndpoints(doc, el) : el;
      });
      set({ clipboard: els });
      return els;
    },
    cutSelection: () => {
      get().copySelection();
      get().deleteSelection();
    },
    paste: (els, at) => {
      const src = els ?? get().clipboard;
      if (!src?.length) return;
      let offset: Vec = { x: 24, y: 24 };
      if (at) {
        const tmp: Doc = { elements: Object.fromEntries(src.map((e) => [e.id, e])), order: src.map((e) => e.id) };
        const b = selectionBounds(tmp, tmp.order);
        if (b) offset = { x: at.x - (b.x + b.w / 2), y: at.y - (b.y + b.h / 2) };
      }
      const clones = cloneElements(src, offset);
      get().addElements(clones);
      // Next paste lands further along, like Figma.
      if (!els) set({ clipboard: cloneElements(src, { x: 24, y: 24 }) });
    },
    duplicateSelection: () => {
      const els = get().copySelection();
      if (els.length) get().addElements(cloneElements(els, { x: 24, y: 24 }));
    },
    groupSelection: () => {
      const { doc, selection } = get();
      if (selection.length < 2) return;
      const gid = uid();
      const next: Record<string, DiagramElement> = {};
      for (const id of selection) next[id] = { ...doc.elements[id], groupIds: [...doc.elements[id].groupIds, gid] };
      commit(withElements(doc, next));
      const b = selectionBounds(get().doc, selection);
      if (b) flashFeedback(set, { kind: 'group', rects: [b], count: selection.length });
    },
    ungroupSelection: () => {
      const { doc, selection } = get();
      const next: Record<string, DiagramElement> = {};
      for (const id of selection) {
        const el = doc.elements[id];
        if (el.groupIds.length) next[id] = { ...el, groupIds: el.groupIds.slice(0, -1) };
      }
      if (!Object.keys(next).length) return;
      commit(withElements(doc, next));
      const after = get().doc;
      const rects = Object.keys(next).map((id) => elementBounds(after.elements[id], after));
      flashFeedback(set, { kind: 'ungroup', rects, count: rects.length });
    },
    reorder: (mode) => {
      const { doc, selection } = get();
      if (!selection.length) return;
      const sel = new Set(selection);
      let order = doc.order.slice();
      if (mode === 'front') order = [...order.filter((id) => !sel.has(id)), ...order.filter((id) => sel.has(id))];
      else if (mode === 'back') order = [...order.filter((id) => sel.has(id)), ...order.filter((id) => !sel.has(id))];
      else if (mode === 'forward') {
        for (let i = order.length - 2; i >= 0; i--) {
          if (sel.has(order[i]) && !sel.has(order[i + 1])) [order[i], order[i + 1]] = [order[i + 1], order[i]];
        }
      } else {
        for (let i = 1; i < order.length; i++) {
          if (sel.has(order[i]) && !sel.has(order[i - 1])) [order[i], order[i - 1]] = [order[i - 1], order[i]];
        }
      }
      commit({ ...doc, order });
    },
    moveElement: (id, toIndex) => {
      const { doc } = get();
      const order = doc.order.filter((o) => o !== id);
      order.splice(clamp(toIndex, 0, order.length), 0, id);
      commit({ ...doc, order });
    },
    align: (mode) => {
      const { doc, selection } = get();
      const shapes = selection.map((id) => doc.elements[id]).filter(isShape);
      if (shapes.length < 2) return;
      const b = unionRects(shapes.map(shapeRect))!;
      const next: Record<string, DiagramElement> = {};
      for (const s of shapes) {
        const p = { x: s.x, y: s.y };
        if (mode === 'left') p.x = b.x;
        if (mode === 'hcenter') p.x = b.x + (b.w - s.w) / 2;
        if (mode === 'right') p.x = b.x + b.w - s.w;
        if (mode === 'top') p.y = b.y;
        if (mode === 'vcenter') p.y = b.y + (b.h - s.h) / 2;
        if (mode === 'bottom') p.y = b.y + b.h - s.h;
        next[s.id] = { ...s, ...p };
      }
      commit(withElements(doc, next));
    },
    distribute: (axis) => {
      const { doc, selection } = get();
      const shapes = selection.map((id) => doc.elements[id]).filter(isShape);
      if (shapes.length < 3) return;
      const key = axis === 'h' ? 'x' : 'y';
      const size = axis === 'h' ? 'w' : 'h';
      const sorted = shapes.slice().sort((a, b) => a[key] - b[key]);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const span = last[key] + last[size] - first[key];
      const total = sorted.reduce((acc, s) => acc + s[size], 0);
      const gap = (span - total) / (sorted.length - 1);
      let cursor = first[key];
      const next: Record<string, DiagramElement> = {};
      for (const s of sorted) {
        next[s.id] = { ...s, [key]: cursor };
        cursor += s[size] + gap;
      }
      commit(withElements(doc, next));
    },
    toggleLock: () => {
      const els = selected();
      if (!els.length) return;
      const lock = !els.every((e) => e.locked);
      get().updateElements(Object.fromEntries(els.map((e) => [e.id, { locked: lock }])));
    },
    nudge: (dx, dy) => {
      const { doc, selection } = get();
      const ids = new Set(selection.filter((id) => !doc.elements[id]?.locked));
      for (const id of containedShapes(doc, ids)) ids.add(id);
      const next: Record<string, DiagramElement> = {};
      for (const id of ids) {
        const el = doc.elements[id];
        if (isShape(el)) next[id] = { ...el, x: el.x + dx, y: el.y + dy };
        else if (isConnector(el)) {
          next[id] = {
            ...el,
            source: el.source.elementId ? el.source : { ...el.source, x: el.source.x + dx, y: el.source.y + dy },
            target: el.target.elementId ? el.target : { ...el.target, x: el.target.x + dx, y: el.target.y + dy },
          };
        }
      }
      commit(withElements(doc, next));
    },

    // --- history ------------------------------------------------------------
    undo: () => {
      const { past, doc, future, selection } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      lastSettingsStep = null;
      set({
        doc: prev,
        past: past.slice(0, -1),
        future: [remember(doc), ...future],
        selection: selection.filter((id) => prev.elements[id]),
        editingId: null,
        ...restoreSettings(prev),
      });
    },
    redo: () => {
      const { past, doc, future, selection } = get();
      if (!future.length) return;
      const next = future[0];
      lastSettingsStep = null;
      set({ doc: next, past: [...past, remember(doc)], future: future.slice(1), selection: selection.filter((id) => next.elements[id]), ...restoreSettings(next) });
    },
    beginInteraction: () => set({ interactionBase: get().doc }),
    endInteraction: () => {
      const { interactionBase, doc, past } = get();
      if (!interactionBase) return;
      if (interactionBase !== doc) {
        set({ interactionBase: null, past: [...past.slice(-HISTORY_LIMIT + 1), remember(interactionBase)], future: [] });
      } else set({ interactionBase: null });
    },
    setDoc: (doc) => set({ doc }),

    // --- file ---------------------------------------------------------------
    loadDoc: (doc, file) => get().loadPages([newPage('Page 1', doc)], file),
    newDoc: () => {
      get().loadPages([newPage('Page 1')], { path: null, name: 'Untitled' });
      const v = get().viewport;
      set({ camera: { x: v.w / 2, y: v.h / 2, z: 1 } });
    },
    markSaved: (path, name) => {
      const pages = get().allPages();
      set({
        file: {
          path,
          name,
          savedDoc: get().doc,
          savedDocs: Object.fromEntries(pages.map((p) => [p.id, p.doc])),
          savedMeta: pagesMeta(pages),
        },
      });
    },

    setPlaying: (playing) => set({ playing }),

    // --- pages --------------------------------------------------------------
    allPages: () => {
      const { pages, activePageId, doc } = get();
      return pages.map((p) => (p.id === activePageId ? { ...p, doc } : p));
    },
    loadPages: (pages, file) => {
      const list = pages.length ? pages : [newPage('Page 1')];
      const first = list[0];
      set({
        pages: list,
        activePageId: first.id,
        doc: first.doc,
        settings: effectiveSettings(loadSettings(), first.settings),
        activeLayerId: null,
        pageHistory: {},
        docMeta: file.meta ?? {},
        aiHistory: file.assistant ?? [],
        past: [],
        future: [],
        selection: [],
        editingId: null,
        file: {
          path: file.path,
          name: file.name,
          savedDoc: first.doc,
          savedDocs: Object.fromEntries(list.map((p) => [p.id, p.doc])),
          savedMeta: pagesMeta(list),
        },
      });
    },
    setAiHistory: (runs) => set({ aiHistory: runs, file: { ...get().file, savedMeta: '' } }),
    addPage: (name, doc) => {
      const pages = get().allPages();
      const page = newPage(name ?? `Page ${pages.length + 1}`, doc);
      set({ pages: [...pages, page] });
      get().switchPage(page.id);
    },
    duplicatePage: (id) => {
      const pages = get().allPages();
      const src = pages.find((p) => p.id === id);
      if (!src) return;
      const clones = cloneElements(src.doc.order.map((oid) => src.doc.elements[oid]), { x: 0, y: 0 });
      const doc: Doc = { elements: Object.fromEntries(clones.map((e) => [e.id, e])), order: clones.map((e) => e.id), layers: src.doc.layers };
      const copy: Page = { id: uid(), name: `${src.name} copy`, doc, settings: { ...src.settings }, ...(src.data ? { data: { ...src.data } } : {}) };
      const idx = pages.indexOf(src);
      set({ pages: [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)] });
      get().switchPage(copy.id);
    },
    deletePage: (id) => {
      const pages = get().allPages();
      if (pages.length <= 1) return;
      const idx = pages.findIndex((p) => p.id === id);
      const rest = pages.filter((p) => p.id !== id);
      if (get().activePageId === id) {
        const next = rest[Math.max(0, idx - 1)];
        set({ pages: rest, activePageId: next.id, doc: next.doc, past: [], future: [], selection: [], activeLayerId: null, settings: effectiveSettings(loadSettings(), next.settings) });
      } else set({ pages: rest });
    },
    renamePage: (id, name) => set({ pages: get().pages.map((p) => (p.id === id ? { ...p, name } : p)) }),
    movePage: (id, toIndex) => {
      const page = get().pages.find((p) => p.id === id);
      if (!page) return;
      const pages = get().pages.filter((p) => p.id !== id);
      pages.splice(clamp(toIndex, 0, pages.length), 0, page);
      set({ pages });
    },
    switchPage: (id) => {
      const s = get();
      if (id === s.activePageId) return;
      const target = s.pages.find((p) => p.id === id);
      if (!target) return;
      const history = { ...s.pageHistory, [s.activePageId]: { past: s.past, future: s.future, camera: s.camera } };
      const restored = history[id];
      set({
        pages: s.allPages(),
        pageHistory: history,
        activePageId: id,
        doc: target.doc,
        settings: effectiveSettings(loadSettings(), target.settings),
        past: restored?.past ?? [],
        future: restored?.future ?? [],
        camera: restored?.camera ?? s.camera,
        selection: [],
        editingId: null,
        activeLayerId: null,
        interactionBase: null,
      });
    },
    updatePageSettings: (patch) => {
      const { pages, activePageId, past, doc } = get();
      const before = pageSettings();
      if (!before || Object.entries(patch).every(([k, v]) => before[k as keyof PageSettings] === v)) return;
      const settings = { ...before, ...patch };
      // One undo step (coalescing a burst, like dragging a color), unless a drag is recording its own.
      const now = Date.now();
      const coalesce = lastSettingsStep && past[past.length - 1] === lastSettingsStep.entry && now - lastSettingsStep.at < SETTINGS_COALESCE_MS;
      let history = {};
      if (!get().interactionBase && !coalesce) {
        // A copy of the document marks the step: same drawing, the settings before the change.
        const entry = remember({ ...doc }, before);
        lastSettingsStep = { entry, at: now };
        history = { past: [...past.slice(-HISTORY_LIMIT + 1), entry], future: [] };
      } else if (coalesce) lastSettingsStep!.at = now;
      set({ pages: pages.map((p) => (p.id === activePageId ? { ...p, settings } : p)), ...history });
    },

    // --- layers -------------------------------------------------------------
    ensureLayers: () => {
      const { doc } = get();
      if (doc.layers) return doc.layers;
      const layers = layersOf(doc);
      set({ doc: { ...doc, layers } });
      return layers;
    },
    addLayer: (name) => {
      const layers = get().ensureLayers();
      const layer: Layer = { id: uid(), name: name ?? `Layer ${layers.length + 1}`, visible: true, locked: false };
      commit({ ...get().doc, layers: [...layers, layer] }, { activeLayerId: layer.id });
    },
    renameLayer: (id, name) => {
      const layers = get().ensureLayers();
      commit({ ...get().doc, layers: layers.map((l) => (l.id === id ? { ...l, name } : l)) });
    },
    updateLayer: (id, patch) => {
      const layers = get().ensureLayers();
      commit({ ...get().doc, layers: layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
    },
    setLayerVisible: (id, visible) => {
      const layers = get().ensureLayers();
      const doc = { ...get().doc, layers: layers.map((l) => (l.id === id ? { ...l, visible } : l)) };
      commit(doc, { selection: get().selection.filter((sid) => !isHidden(doc, doc.elements[sid])) });
    },
    setLayerLocked: (id, locked) => {
      const layers = get().ensureLayers();
      commit({ ...get().doc, layers: layers.map((l) => (l.id === id ? { ...l, locked } : l)) });
    },
    deleteLayer: (id) => {
      const layers = get().ensureLayers();
      if (layers.length <= 1) return;
      const doc = get().doc;
      const kill = new Set(doc.order.filter((eid) => layerOf(doc, doc.elements[eid]).id === id));
      const elements = { ...doc.elements };
      for (const k of kill) delete elements[k];
      commit(
        { elements, order: doc.order.filter((eid) => !kill.has(eid)), layers: layers.filter((l) => l.id !== id) },
        {
          activeLayerId: get().activeLayerId === id ? null : get().activeLayerId,
          selection: get().selection.filter((sid) => !kill.has(sid)),
        },
      );
    },
    moveLayerTo: (id, toIndex) => {
      const layers = get().ensureLayers().slice();
      const from = layers.findIndex((l) => l.id === id);
      if (from < 0) return;
      const [l] = layers.splice(from, 1);
      layers.splice(clamp(toIndex, 0, layers.length), 0, l);
      commit({ ...get().doc, layers });
    },
    setActiveLayer: (id) => set({ activeLayerId: id }),
    moveSelectionToLayer: (layerId) => {
      get().ensureLayers();
      const { doc, selection } = get();
      const next: Record<string, DiagramElement> = {};
      for (const id of selection) if (doc.elements[id]) next[id] = { ...doc.elements[id], layerId };
      commit(withElements(doc, next));
    },
    duplicateLayer: (id) => {
      const layers = get().ensureLayers();
      const doc = get().doc;
      const src = layers.find((l) => l.id === id);
      if (!src) return;
      const layer: Layer = { ...src, id: uid(), name: `${src.name} copy` };
      // Connectors glued to shapes on other layers keep their current end positions.
      const els = doc.order.map((eid) => doc.elements[eid]).filter((el) => layerOf(doc, el).id === id);
      const clones = cloneElements(els.map((el) => (el.type === 'connector' ? bakeEndpoints(doc, el) : el)), { x: 0, y: 0 }).map((el) => ({ ...el, layerId: layer.id }));
      const at = layers.indexOf(src) + 1;
      commit(
        {
          elements: { ...doc.elements, ...Object.fromEntries(clones.map((el) => [el.id, el])) },
          order: [...doc.order, ...clones.map((el) => el.id)],
          layers: [...layers.slice(0, at), layer, ...layers.slice(at)],
        },
        { activeLayerId: layer.id, selection: clones.map((el) => el.id) },
      );
    },
    selectLayer: (id) => {
      const doc = get().doc;
      get().select(doc.order.filter((eid) => {
        const el = doc.elements[eid];
        return layerOf(doc, el).id === id && !isHidden(doc, el) && !isLocked(doc, el);
      }));
    },
  };
});

/** Convenience selectors. */
export const useIsDirty = () => useEditor(isDirtyState);

/** Unsaved changes anywhere in the file (any page, page names/order/settings). */
export function isDirtyState(s: EditorState): boolean {
  if (s.doc !== s.file.savedDocs[s.activePageId]) return true;
  if (pagesMeta(s.pages) !== s.file.savedMeta) return true;
  return s.pages.some((p) => p.id !== s.activePageId && p.doc !== s.file.savedDocs[p.id]);
}

// Dev server only: an edit to this store reloads the page instead of hot-swapping the module,
// which would leave part of the app on a new, empty copy of the store (a blank screen on the next click).
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
