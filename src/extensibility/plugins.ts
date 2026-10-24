/**
 * Plugin runtime (Extras → Plugins…). See docs/extensibility.md.
 *
 * A plugin is a script that calls `window.ArkDraw.registerPlugin({ id, name,
 * activate(ctx) })` (or an ES module whose default export is that object).
 * `activate` receives a context with:
 *
 *   actions  – commands for the palette, menus and shortcuts
 *   menus    – add actions to the title-bar menus
 *   shapes   – shape libraries and named stencils
 *   formats  – importers (File → Open / Import) and exporters (File menu)
 *   editor   – read/subscribe to the document, plus undoable mutations
 *   ui       – toasts and confirmations
 *
 * Everything a plugin registers is tracked and removed when it's disabled.
 *
 * Trust model: plugins run in the page with full access to
 * the editor and your diagrams. Only load plugins you trust; the dialog warns
 * before enabling one. Hosts that keep the default Content Security Policy
 * (`script-src 'self'`) can only load plugins served from the app's origin.
 */
import { create } from 'zustand';
import type { ConnectorElement, DiagramElement, Doc, ElementStyle, Page, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { t } from '@/i18n';
import { registerAction, runAction, type ActionGroup } from '@/app/actions';
import { IMPORTERS, type Importer } from '@/io/import';
import { readFile, saveFile } from '@/io/native';
import { isTauri } from '@/lib/platform';
import { viewportCenter } from '@/canvas/viewport';
import { dropLibrary, upsertLibrary } from '@/panels/userLibraries';
import { registerStencil } from '@/stencils/registry';
import { parseStencil, stencilPoints } from '@/stencils/parse';
import { compressStencil, decompressStencil } from '@/stencils/codec';
import { shapeFromConfig, type ShapeConfigEntry } from '@/stencils/library';
import { addMenuItem, type MenuName } from './menus';

type Disposer = () => void;

export interface PluginActionSpec {
  id: string;
  label: string;
  run: () => void;
  /** Menu group used by the palette and shortcuts dialog (default "Tools"). */
  group?: ActionGroup;
  /** e.g. "Mod+Shift+J". */
  shortcut?: string | string[];
  keywords?: string;
  enabled?: () => boolean;
  /** Also add the action to this menu. */
  menu?: MenuName;
}

export interface PluginExporter {
  id: string;
  label: string;
  /** File extension without dot. */
  extension: string;
  mime?: string;
  export: (input: { pages: Page[]; activePage: Page; fileName: string }) => string | Uint8Array | Promise<string | Uint8Array>;
}

export interface PluginShapeLibrary {
  id: string;
  name: string;
  shapes: ShapeConfigEntry[];
}

export interface PluginContext {
  /** The plugin's id. */
  id: string;
  app: { version: string; platform: 'desktop' | 'web' };
  actions: { register: (spec: PluginActionSpec) => Disposer; run: (id: string) => void };
  menus: { add: (menu: MenuName, actionId: string) => Disposer };
  shapes: {
    registerLibrary: (lib: PluginShapeLibrary) => Disposer;
    registerStencil: (name: string, xml: string) => Disposer;
  };
  formats: { registerImporter: (importer: Importer) => Disposer; registerExporter: (exporter: PluginExporter) => Disposer };
  editor: PluginEditorApi;
  ui: {
    toast: (message: string, kind?: 'info' | 'success' | 'error') => void;
    confirm: (title: string, message: string, confirmLabel?: string) => Promise<boolean>;
  };
  /** Runs when the plugin is disabled. */
  onDispose: (fn: Disposer) => void;
}

export interface PluginEditorApi {
  /** The current page's document. Treat it as read-only: change it through the methods below. */
  getDoc: () => Doc;
  getPages: () => Page[];
  getActivePageId: () => string;
  getSelection: () => string[];
  getElement: (id: string) => DiagramElement | undefined;
  /** Called whenever the document or the selection changes. */
  subscribe: (listener: (state: { doc: Doc; selection: string[] }) => void) => Disposer;
  /** Groups the changes made inside `fn` into one undo step. */
  transact: <T>(fn: () => T) => T;
  /** Adds a shape (default: rectangle at the viewport center) and returns its id. */
  addShape: (opts?: { kind?: string; x?: number; y?: number; w?: number; h?: number; text?: string; style?: Partial<ElementStyle>; stencil?: string; select?: boolean }) => string;
  /** Connects two shapes and returns the connector id. */
  connect: (sourceId: string, targetId: string, opts?: Partial<Pick<ConnectorElement, 'routing' | 'startArrow' | 'endArrow' | 'text'>>) => string;
  /** Patches an element (id and type can't change). */
  update: (id: string, patch: Partial<ShapeElement> | Partial<ConnectorElement>) => void;
  setStyle: (ids: string[], style: Partial<ElementStyle>) => void;
  remove: (ids: string[]) => void;
  select: (ids: string[]) => void;
}

export interface ArkDrawPlugin {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  activate: (ctx: PluginContext) => void | Disposer | Promise<void | Disposer>;
  deactivate?: () => void;
}

/** A persisted plugin source: a URL, a desktop file path, or a file added in the browser (code kept). */
export interface PluginEntry {
  source: string;
  name?: string;
  enabled: boolean;
  /** Source code for plugins added from a file in the browser. */
  code?: string;
  /** Plugin ids registered by this source (filled in once loaded). */
  ids?: string[];
}

export type PluginStatus = { state: 'loading' } | { state: 'active'; ids: string[] } | { state: 'disabled' } | { state: 'error'; error: string };

interface PluginsState {
  entries: PluginEntry[];
  status: Record<string, PluginStatus>;
  /** Active plugins (by id) → their display info. */
  active: Record<string, { name: string; version?: string; source?: string }>;
}

const KEY = 'arkdraw:plugins';

function loadEntries(): PluginEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((e) => e && typeof e.source === 'string') : [];
  } catch {
    return [];
  }
}

export const usePlugins = create<PluginsState>(() => ({ entries: loadEntries(), status: {}, active: {} }));

function saveEntries(entries: PluginEntry[]) {
  usePlugins.setState({ entries });
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota / storage unavailable */
  }
}

const setStatus = (source: string, st: PluginStatus) => usePlugins.setState((s) => ({ status: { ...s.status, [source]: st } }));

// ---------------------------------------------------------------------------
// Registry & activation
// ---------------------------------------------------------------------------

interface Registered {
  plugin: ArkDrawPlugin;
  source?: string;
  disposers: Disposer[];
  active: boolean;
}

const REGISTRY = new Map<string, Registered>();
/** Source being loaded, so `registerPlugin` calls can be attributed to it. */
let loadingSource: string | undefined;
const loadedBy = new Map<string, string[]>();

const ns = (pluginId: string, id: string) => (id.startsWith(`plugin.${pluginId}.`) ? id : `plugin.${pluginId}.${id}`);

function makeContext(rec: Registered): PluginContext {
  const pid = rec.plugin.id;
  const track = (d: Disposer): Disposer => {
    rec.disposers.push(d);
    return () => {
      d();
      rec.disposers = rec.disposers.filter((x) => x !== d);
    };
  };
  const ed = () => useEditor.getState();

  const registerPluginAction = (spec: PluginActionSpec): Disposer => {
    if (!spec || typeof spec.run !== 'function' || !spec.id || !spec.label) throw new Error('actions.register needs { id, label, run }.');
    const id = ns(pid, spec.id);
    const offs: Disposer[] = [
      registerAction({
        id,
        label: spec.label,
        group: spec.group ?? 'Tools',
        run: () => {
          try {
            spec.run();
          } catch (e) {
            useUi.getState().toast(t('plugins.commandFailed', { plugin: rec.plugin.name ?? pid, error: String((e as Error).message ?? e) }), 'error');
          }
        },
        shortcuts: spec.shortcut ? ([] as string[]).concat(spec.shortcut) : undefined,
        keywords: `${spec.keywords ?? ''} plugin ${rec.plugin.name ?? pid}`.trim(),
        enabled: spec.enabled,
      }),
    ];
    if (spec.menu) offs.push(addMenuItem(spec.menu, id));
    return track(() => offs.forEach((o) => o()));
  };

  const editor: PluginEditorApi = {
    getDoc: () => ed().doc,
    getPages: () => ed().allPages(),
    getActivePageId: () => ed().activePageId,
    getSelection: () => [...ed().selection],
    getElement: (id) => ed().doc.elements[id],
    subscribe: (listener) =>
      track(
        useEditor.subscribe((s, prev) => {
          if (s.doc !== prev.doc || s.selection !== prev.selection) listener({ doc: s.doc, selection: s.selection });
        }),
      ),
    transact: (fn) => {
      const s = ed();
      const outer = !s.interactionBase;
      if (outer) s.beginInteraction();
      try {
        return fn();
      } finally {
        if (outer) ed().endInteraction();
      }
    },
    addShape: (opts = {}) => {
      const c = viewportCenter();
      const w = opts.w ?? 120;
      const h = opts.h ?? 60;
      const el = createShape(opts.kind ?? (opts.stencil ? 'stencil' : 'rectangle'), { x: opts.x ?? Math.round(c.x - w / 2), y: opts.y ?? Math.round(c.y - h / 2), w, h }, opts.style ?? {}, opts.text ?? '');
      if (opts.stencil) {
        parseStencil(opts.stencil);
        el.stencil = opts.stencil;
        el.connectionPoints = stencilPoints(opts.stencil);
      }
      ed().addElements([el], { select: opts.select ?? false });
      return el.id;
    },
    connect: (sourceId, targetId, opts = {}) => {
      const a = ed().doc.elements[sourceId];
      const b = ed().doc.elements[targetId];
      if (!isShape(a) || !isShape(b)) throw new Error('connect() needs two shape ids.');
      const conn = createConnector(
        { elementId: a.id, side: 'auto', x: a.x + a.w / 2, y: a.y + a.h / 2 },
        { elementId: b.id, side: 'auto', x: b.x + b.w / 2, y: b.y + b.h / 2 },
        opts,
      );
      ed().addElements([conn], { select: false });
      return conn.id;
    },
    update: (id, patch) => {
      if (!ed().doc.elements[id]) throw new Error(`No element ${id}.`);
      const { id: _id, type: _type, ...rest } = patch as Record<string, unknown>;
      void _id;
      void _type;
      ed().updateElements({ [id]: rest as Partial<ShapeElement> });
    },
    setStyle: (ids, style) => ed().updateStyle(ids.filter((id) => ed().doc.elements[id]), style),
    remove: (ids) => ed().deleteElements(ids.filter((id) => ed().doc.elements[id])),
    select: (ids) => ed().select(ids.filter((id) => ed().doc.elements[id])),
  };

  return {
    id: pid,
    app: { version: __APP_VERSION__, platform: isTauri() ? 'desktop' : 'web' },
    actions: { register: registerPluginAction, run: (id) => runAction(resolveActionId(pid, id)) },
    menus: { add: (menu, actionId) => track(addMenuItem(menu, resolveActionId(pid, actionId))) },
    shapes: {
      registerLibrary: (lib) => {
        const id = `plugin:${pid}:${lib.id}`;
        const items = lib.shapes.map((entry) => {
          const el = shapeFromConfig(entry);
          return { id: `${id}:${entry.name}`, title: entry.name, elements: [el], w: Math.round(el.w), h: Math.round(el.h) };
        });
        upsertLibrary({ id, name: lib.name, items });
        return track(() => dropLibrary(id));
      },
      registerStencil: (name, xml) => track(registerStencil(name, xml)),
    },
    formats: {
      registerImporter: (importer) => {
        if (!importer?.id || typeof importer.run !== 'function') throw new Error('registerImporter needs { id, label, extensions, run }.');
        const imp: Importer = { ...importer, acceptsText: importer.acceptsText ?? false, extensions: importer.extensions ?? [], description: importer.description ?? '', id: ns(pid, importer.id) };
        IMPORTERS.push(imp);
        return track(() => {
          const i = IMPORTERS.indexOf(imp);
          if (i >= 0) IMPORTERS.splice(i, 1);
        });
      },
      registerExporter: (exp) => {
        if (!exp?.id || typeof exp.export !== 'function') throw new Error('registerExporter needs { id, label, extension, export }.');
        return registerPluginAction({
          id: `export.${exp.id}`,
          label: `Export as ${exp.label}…`,
          group: 'File',
          menu: 'File',
          keywords: `export save ${exp.extension}`,
          run: () => void runExporter(exp),
        });
      },
    },
    editor,
    ui: {
      toast: (message, kind) => useUi.getState().toast(String(message), kind),
      confirm: async (title, message, confirmLabel = t('common.ok')) => (await useUi.getState().ask({ title, message, confirmLabel })) === 'confirm',
    },
    onDispose: (fn) => void track(fn),
  };
}

/** Lets plugins refer to their own actions by short id, and to built-in ones by full id. */
function resolveActionId(pid: string, id: string): string {
  const own = ns(pid, id);
  return REGISTRY.get(pid) && id.indexOf('.') < 0 ? own : id;
}

async function runExporter(exp: PluginExporter) {
  const s = useEditor.getState();
  const pages = s.allPages();
  const activePage = pages.find((p) => p.id === s.activePageId) ?? pages[0];
  const base = s.file.name.replace(/\.[^.]+$/, '') || 'diagram';
  try {
    const data = await exp.export({ pages, activePage, fileName: s.file.name });
    const saved = await saveFile(data, {
      defaultName: `${base}.${exp.extension}`,
      filters: [{ name: exp.label, extensions: [exp.extension] }],
      mime: exp.mime ?? 'application/octet-stream',
    });
    if (saved) useUi.getState().toast(t('plugins.exported', { name: saved.name }), 'success');
  } catch (e) {
    useUi.getState().toast(t('plugins.exportFailed', { format: exp.label, error: String((e as Error).message ?? e) }), 'error');
  }
}

async function activate(rec: Registered) {
  if (rec.active) return;
  rec.active = true;
  try {
    const off = await rec.plugin.activate(makeContext(rec));
    if (typeof off === 'function') rec.disposers.push(off);
    usePlugins.setState((s) => ({ active: { ...s.active, [rec.plugin.id]: { name: rec.plugin.name ?? rec.plugin.id, version: rec.plugin.version, source: rec.source } } }));
  } catch (e) {
    deactivate(rec);
    throw e;
  }
}

function deactivate(rec: Registered) {
  for (const d of rec.disposers.splice(0).reverse()) {
    try {
      d();
    } catch {
      /* keep disposing */
    }
  }
  try {
    if (rec.active) rec.plugin.deactivate?.();
  } catch {
    /* ignore */
  }
  rec.active = false;
  usePlugins.setState((s) => {
    const active = { ...s.active };
    delete active[rec.plugin.id];
    return { active };
  });
}

/**
 * Registers and activates a plugin. Called by plugin scripts through
 * `window.ArkDraw.registerPlugin`. Re-registering an id replaces the old one.
 */
export async function registerPlugin(plugin: ArkDrawPlugin): Promise<void> {
  if (!plugin || typeof plugin.id !== 'string' || !/^[\w.-]+$/.test(plugin.id) || typeof plugin.activate !== 'function') {
    throw new Error('registerPlugin needs { id: "my-plugin", activate(ctx) { … } } (id: letters, digits, . _ -).');
  }
  const old = REGISTRY.get(plugin.id);
  if (old) deactivate(old);
  const rec: Registered = { plugin, source: loadingSource ?? old?.source, disposers: [], active: false };
  REGISTRY.set(plugin.id, rec);
  if (loadingSource) loadedBy.set(loadingSource, [...(loadedBy.get(loadingSource) ?? []).filter((i) => i !== plugin.id), plugin.id]);
  await activate(rec);
}

/** Disables (and unregisters) a plugin by id. */
export function unregisterPlugin(id: string) {
  const rec = REGISTRY.get(id);
  if (!rec) return;
  deactivate(rec);
  REGISTRY.delete(id);
}

export const registeredPlugins = () => [...REGISTRY.values()].map((r) => ({ id: r.plugin.id, name: r.plugin.name ?? r.plugin.id, version: r.plugin.version, source: r.source, active: r.active }));

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const isDesktopPath = (s: string) => /^[a-z]:[\\/]/i.test(s) || s.startsWith('\\\\') || (isTauri() && s.startsWith('/')) || s.startsWith('file:');

async function importCode(code: string): Promise<Record<string, unknown>> {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function explain(e: unknown): string {
  const msg = String((e as Error)?.message ?? e);
  if (/content security policy|csp|refused|failed to fetch dynamically imported module|importing a module script failed/i.test(msg)) {
    return t('plugins.cspHint', { error: msg });
  }
  return msg;
}

/** Loads one plugin source (URL, desktop path, or stored code) and returns the ids it registered. */
async function loadSource(entry: PluginEntry): Promise<string[]> {
  const { source } = entry;
  setStatus(source, { state: 'loading' });
  loadingSource = source;
  loadedBy.set(source, []);
  try {
    let mod: Record<string, unknown>;
    if (entry.code) mod = await importCode(entry.code);
    else if (isDesktopPath(source) && isTauri()) mod = await importCode((await readFile(source.replace(/^file:\/\//, ''))).contents);
    else mod = await import(/* @vite-ignore */ new URL(source, location.href).href);
    // ES modules may export the plugin instead of calling registerPlugin.
    const exported = (mod.default ?? mod.plugin) as ArkDrawPlugin | undefined;
    if (exported && typeof exported === 'object' && typeof exported.activate === 'function' && !REGISTRY.has(exported.id)) await registerPlugin(exported);
    const ids = loadedBy.get(source) ?? [];
    if (!ids.length) throw new Error('The script ran but registered no plugin (call ArkDraw.registerPlugin or export default { id, activate }).');
    setStatus(source, { state: 'active', ids });
    return ids;
  } catch (e) {
    setStatus(source, { state: 'error', error: explain(e) });
    throw new Error(explain(e));
  } finally {
    loadingSource = undefined;
  }
}

/**
 * Loads plugins from URLs (web, same-origin by default) or file paths
 * (desktop). Used by the desktop shell for plugins listed in its config file,
 * and by `?plugins=`-style integrations. Sources load sequentially; failures
 * are reported per source and don't stop the others.
 */
export async function loadPluginsFrom(urlsOrPaths: string[]): Promise<Array<{ source: string; ids?: string[]; error?: string }>> {
  const out: Array<{ source: string; ids?: string[]; error?: string }> = [];
  for (const source of urlsOrPaths) {
    if (!source || typeof source !== 'string') continue;
    try {
      out.push({ source, ids: await loadSource({ source, enabled: true }) });
    } catch (e) {
      out.push({ source, error: String((e as Error).message ?? e) });
    }
  }
  return out;
}

/** Loads the enabled plugins saved in Extras → Plugins (once, at startup). */
let startedUp = false;
export async function loadSavedPlugins() {
  if (startedUp) return;
  startedUp = true;
  for (const entry of usePlugins.getState().entries) {
    if (!entry.enabled) {
      setStatus(entry.source, { state: 'disabled' });
      continue;
    }
    try {
      const ids = await loadSource(entry);
      saveEntries(usePlugins.getState().entries.map((e) => (e.source === entry.source ? { ...e, ids } : e)));
    } catch {
      /* status shows the error in the dialog */
    }
  }
}

// ---------------------------------------------------------------------------
// Managing saved plugins (the dialog)
// ---------------------------------------------------------------------------

/** Asks before running third-party code. */
export async function confirmTrust(what: string): Promise<boolean> {
  const choice = await useUi.getState().ask({ title: t('plugins.trustTitle'), message: t('plugins.trustMessage', { what }), confirmLabel: t('plugins.trustConfirm') });
  return choice === 'confirm';
}

/** Adds a plugin by URL/path or from file contents, after a trust warning. */
export async function addPlugin(source: string, code?: string, name?: string): Promise<boolean> {
  const src = source.trim();
  if (!src) return false;
  if (usePlugins.getState().entries.some((e) => e.source === src)) {
    useUi.getState().toast(t('plugins.duplicate'));
    return false;
  }
  if (!(await confirmTrust(name ?? src))) return false;
  const entry: PluginEntry = { source: src, enabled: true, ...(code ? { code } : {}), ...(name ? { name } : {}) };
  saveEntries([...usePlugins.getState().entries, entry]);
  try {
    const ids = await loadSource(entry);
    saveEntries(usePlugins.getState().entries.map((e) => (e.source === src ? { ...e, ids, name: name ?? REGISTRY.get(ids[0])?.plugin.name ?? e.name } : e)));
    useUi.getState().toast(t('plugins.enabled', { name: REGISTRY.get(ids[0])?.plugin.name ?? ids[0] }), 'success');
    return true;
  } catch (e) {
    useUi.getState().toast(String((e as Error).message ?? e), 'error');
    return false;
  }
}

const idsOf = (entry: PluginEntry) => loadedBy.get(entry.source) ?? entry.ids ?? [];

export async function setPluginEnabled(source: string, enabled: boolean) {
  const entry = usePlugins.getState().entries.find((e) => e.source === source);
  if (!entry) return;
  if (enabled && !(await confirmTrust(entry.name ?? entry.source))) return;
  saveEntries(usePlugins.getState().entries.map((e) => (e.source === source ? { ...e, enabled } : e)));
  if (!enabled) {
    for (const id of idsOf(entry)) {
      const rec = REGISTRY.get(id);
      if (rec) deactivate(rec);
    }
    setStatus(source, { state: 'disabled' });
    return;
  }
  // Re-enable: reactivate already-loaded plugin objects (modules aren't re-evaluated), else load.
  const recs = idsOf(entry).map((id) => REGISTRY.get(id)).filter((r): r is Registered => !!r);
  try {
    if (recs.length) {
      for (const r of recs) await activate(r);
      setStatus(source, { state: 'active', ids: recs.map((r) => r.plugin.id) });
    } else await loadSource({ ...entry, enabled: true });
  } catch (e) {
    setStatus(source, { state: 'error', error: explain(e) });
  }
}

export function removePlugin(source: string) {
  const entry = usePlugins.getState().entries.find((e) => e.source === source);
  if (entry) for (const id of idsOf(entry)) unregisterPlugin(id);
  saveEntries(usePlugins.getState().entries.filter((e) => e.source !== source));
  usePlugins.setState((s) => {
    const status = { ...s.status };
    delete status[source];
    return { status };
  });
}

// ---------------------------------------------------------------------------
// window.ArkDraw
// ---------------------------------------------------------------------------

export interface ArkDrawGlobal {
  version: string;
  registerPlugin: (plugin: ArkDrawPlugin) => Promise<void>;
  loadPluginsFrom: typeof loadPluginsFrom;
  plugins: typeof registeredPlugins;
  stencils: { parse: typeof parseStencil; compress: typeof compressStencil; decompress: typeof decompressStencil; register: typeof registerStencil };
}

declare global {
  interface Window {
    ArkDraw?: ArkDrawGlobal;
    /** Plugins queued before ArkDraw finished loading (picked up on install). */
    ArkDrawPlugins?: ArkDrawPlugin[];
  }
}

/** Installs `window.ArkDraw` (idempotent) and registers any queued plugins. */
// The global delegates to the latest evaluation of this module, so dev hot reloads
// (which re-run this file with a fresh registry) keep plugins attributed correctly.
const RUNTIME_KEY = '__arkDrawPluginRuntime';
(globalThis as Record<string, unknown>)[RUNTIME_KEY] = { registerPlugin, loadPluginsFrom, registeredPlugins };
const runtime = () =>
  (globalThis as Record<string, unknown>)[RUNTIME_KEY] as { registerPlugin: typeof registerPlugin; loadPluginsFrom: typeof loadPluginsFrom; registeredPlugins: typeof registeredPlugins };

export function installPluginGlobal() {
  if (typeof window === 'undefined' || window.ArkDraw) return;
  const api: ArkDrawGlobal = {
    version: __APP_VERSION__,
    registerPlugin: (p) =>
      runtime()
        .registerPlugin(p)
        .catch((e) => {
          useUi.getState().toast(t('plugins.failed', { id: p?.id ?? '', error: String((e as Error).message ?? e) }), 'error');
          throw e;
        }),
    loadPluginsFrom: (sources) => runtime().loadPluginsFrom(sources),
    plugins: () => runtime().registeredPlugins(),
    stencils: { parse: parseStencil, compress: compressStencil, decompress: decompressStencil, register: registerStencil },
  };
  const frozen = Object.freeze(api);
  Object.defineProperty(window, 'ArkDraw', { value: frozen, configurable: false, writable: false });
  for (const p of window.ArkDrawPlugins ?? []) void api.registerPlugin(p).catch(() => {});
}
