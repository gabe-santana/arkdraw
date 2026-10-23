/**
 * Extras → Configuration…: a JSON document for app-wide settings, modelled on
 * draw.io's configuration keys where they exist. Validated, persisted
 * locally, and applied on save and at startup.
 *
 * {
 *   "defaultVertexStyle": { "fill": "#e0f2fe", "stroke": "#0284c7" },  // new shapes
 *   "defaultEdgeStyle": { "stroke": "#475569", "strokeWidth": 2 },     // new connectors
 *   "defaultFont": "sans" | "serif" | "mono" | "hand",
 *   "customPresetColors": ["#0ea5e9", "#f43f5e"],                       // colour pickers
 *   "defaultLibraries": "general;flowchart;uml",                        // expanded shape libraries
 *   "libraries": ["https://example.com/my-shapes.xml"],                 // custom library URLs
 *   "gridSize": 10,
 *   "autosave": true
 * }
 */
import type { ElementStyle, FontKey } from '@/model/types';
import { DEFAULT_STYLE, rememberConnectorStyle, setUserDefaultStyle } from '@/model/defaults';
import { usePreferences } from '@/app/preferences';
import { useEditor } from '@/store/editor';
import { LIBRARIES } from '@/shapes/libraries';

export interface AppConfig {
  defaultVertexStyle?: Partial<ElementStyle>;
  defaultEdgeStyle?: Partial<ElementStyle>;
  defaultFont?: FontKey;
  customPresetColors?: string[];
  /** `;`-separated shape library ids to show expanded (draw.io `libs`). */
  defaultLibraries?: string;
  /** Custom library URLs (draw.io `.xml` libraries or `.opendrawlib`). */
  libraries?: string[];
  gridSize?: number;
  autosave?: boolean;
}

const KEY = 'opendraw:configuration';
const FONTS: FontKey[] = ['sans', 'serif', 'mono', 'hand'];
/** Optional ElementStyle keys accepted besides those in DEFAULT_STYLE. */
const OPTIONAL_STYLE_KEYS = [
  'gradient', 'gradientDirection', 'fillOpacity', 'strokeOpacity', 'textOpacity', 'underline', 'strike', 'dashPattern', 'sketch', 'sketchFill',
  'glass', 'labelPosition', 'spacing', 'wrap', 'verticalText', 'labelBackground', 'placeholders', 'richText', 'math',
];
const KNOWN_KEYS: Array<keyof AppConfig> = ['defaultVertexStyle', 'defaultEdgeStyle', 'defaultFont', 'customPresetColors', 'defaultLibraries', 'libraries', 'gridSize', 'autosave'];

export const CONFIG_EXAMPLE: AppConfig = {
  defaultVertexStyle: { fill: '#e0f2fe', stroke: '#0284c7' },
  defaultEdgeStyle: { stroke: '#475569', strokeWidth: 2 },
  defaultFont: 'sans',
  customPresetColors: ['#0ea5e9', '#f43f5e', '#22c55e'],
  defaultLibraries: 'general;flowchart;uml',
  libraries: [],
  gridSize: 10,
  autosave: false,
};

function validateStyle(v: unknown, key: string, errors: string[]): Partial<ElementStyle> | undefined {
  if (v === undefined) return undefined;
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    errors.push(`"${key}" must be an object of style properties.`);
    return undefined;
  }
  const allowed = new Set([...Object.keys(DEFAULT_STYLE), ...OPTIONAL_STYLE_KEYS]);
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!allowed.has(k)) errors.push(`"${key}.${k}" is not a style property.`);
    else if (!['string', 'number', 'boolean'].includes(typeof val)) errors.push(`"${key}.${k}" must be a string, number or boolean.`);
    else {
      const expected = typeof (DEFAULT_STYLE as unknown as Record<string, unknown>)[k];
      if (expected !== 'undefined' && expected !== typeof val) errors.push(`"${key}.${k}" must be a ${expected}.`);
      else out[k] = val;
    }
  }
  return out as Partial<ElementStyle>;
}

/** Parses and validates configuration JSON. */
export function parseConfig(text: string): { config: AppConfig | null; errors: string[] } {
  let data: unknown;
  try {
    data = text.trim() ? JSON.parse(text) : {};
  } catch (e) {
    return { config: null, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { config: null, errors: ['The configuration must be a JSON object.'] };
  const o = data as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of Object.keys(o)) if (!KNOWN_KEYS.includes(k as keyof AppConfig)) errors.push(`Unknown key "${k}".`);
  const config: AppConfig = {};
  const vs = validateStyle(o.defaultVertexStyle, 'defaultVertexStyle', errors);
  if (vs) config.defaultVertexStyle = vs;
  const es = validateStyle(o.defaultEdgeStyle, 'defaultEdgeStyle', errors);
  if (es) config.defaultEdgeStyle = es;
  if (o.defaultFont !== undefined) {
    if (FONTS.includes(o.defaultFont as FontKey)) config.defaultFont = o.defaultFont as FontKey;
    else errors.push(`"defaultFont" must be one of ${FONTS.join(', ')}.`);
  }
  if (o.customPresetColors !== undefined) {
    const list = Array.isArray(o.customPresetColors) ? o.customPresetColors : null;
    if (!list || list.some((c) => typeof c !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(c))) errors.push('"customPresetColors" must be a list of hex colours like "#0ea5e9".');
    else config.customPresetColors = list as string[];
  }
  if (o.defaultLibraries !== undefined) {
    if (typeof o.defaultLibraries === 'string') config.defaultLibraries = o.defaultLibraries;
    else errors.push('"defaultLibraries" must be a string like "general;uml".');
  }
  if (o.libraries !== undefined) {
    const list = Array.isArray(o.libraries) ? o.libraries : null;
    if (!list || list.some((u) => typeof u !== 'string' || !/^https?:\/\//i.test(u))) errors.push('"libraries" must be a list of http(s) URLs.');
    else config.libraries = list as string[];
  }
  if (o.gridSize !== undefined) {
    if (typeof o.gridSize === 'number' && o.gridSize >= 1 && o.gridSize <= 200) config.gridSize = o.gridSize;
    else errors.push('"gridSize" must be a number between 1 and 200.');
  }
  if (o.autosave !== undefined) {
    if (typeof o.autosave === 'boolean') config.autosave = o.autosave;
    else errors.push('"autosave" must be true or false.');
  }
  return { config: errors.length ? null : config, errors };
}

export function loadConfig(): AppConfig {
  try {
    return parseConfig(localStorage.getItem(KEY) || '{}').config ?? {};
  } catch {
    return {};
  }
}

export function saveConfig(config: AppConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config, null, 2));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Shape libraries (also used by the `libs` / `clibs` URL parameters)
// ---------------------------------------------------------------------------

/** draw.io library names → OpenDraw library ids. */
const LIB_ALIASES: Record<string, string> = {
  er: 'erd', arrows2: 'arrows', basic: 'basic', lean_mapping: 'lean', android: 'mobile', ios: 'mobile', ios7: 'mobile', archimate3: 'archimate',
  networks: 'network', cisco19: 'cisco', cisco_safe: 'cisco', office: 'office', rack: 'rack', pid: 'pid', mockups: 'mockups', bootstrap: 'bootstrap',
};

export function resolveLibraryIds(spec: string): string[] {
  const ids = new Set(LIBRARIES.map((l) => l.id));
  const out: string[] = [];
  for (const raw of spec.split(/[;,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const id = LIB_ALIASES[raw] ?? raw;
    const hit = ids.has(id) ? id : LIBRARIES.find((l) => l.id.startsWith(id) || l.name.toLowerCase() === id)?.id;
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

const COLLAPSE_KEY = 'opendraw:collapsed-libraries';

/** Expands exactly these shape libraries in the Shapes panel (others collapse). Takes effect when the panel mounts. */
export function showOnlyLibraries(ids: string[]) {
  if (!ids.length) return;
  try {
    const prev = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') as Record<string, boolean>;
    for (const l of LIBRARIES) prev[l.id] = !ids.includes(l.id);
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(prev));
  } catch {
    /* storage unavailable */
  }
}

const LOADED_KEY = 'opendraw:loaded-library-urls';

/** Fetches custom libraries by URL into the user libraries (once per URL). Returns how many were added. */
export async function loadLibraryUrls(urls: string[], opts: { force?: boolean } = {}): Promise<{ added: number; failed: string[] }> {
  const { parseLibrary, useUserLibraries } = await import('@/panels/userLibraries');
  let loaded: Record<string, string> = {};
  try {
    loaded = JSON.parse(localStorage.getItem(LOADED_KEY) || '{}');
  } catch {
    /* fresh */
  }
  const libs = useUserLibraries.getState();
  let added = 0;
  const failed: string[] = [];
  for (const url of urls) {
    if (!opts.force && loaded[url] && libs.libraries.some((l) => l.id === loaded[url])) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Library');
      const lib = await parseLibrary(await res.text(), name);
      loaded[url] = useUserLibraries.getState().createLibrary(lib.name, lib.items);
      added++;
    } catch {
      failed.push(url);
    }
  }
  try {
    localStorage.setItem(LOADED_KEY, JSON.stringify(loaded));
  } catch {
    /* ignore */
  }
  return { added, failed };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/** Applies a configuration. `startup` skips settings that are already persisted elsewhere. */
export async function applyConfig(config: AppConfig, opts: { startup?: boolean } = {}): Promise<string[]> {
  const notes: string[] = [];
  if (config.defaultEdgeStyle) rememberConnectorStyle({ style: { ...DEFAULT_STYLE, ...config.defaultEdgeStyle } as ElementStyle });
  if (!opts.startup) {
    if (config.defaultVertexStyle) setUserDefaultStyle(config.defaultVertexStyle);
    const prefs = usePreferences.getState();
    const patch: Record<string, unknown> = {};
    if (config.defaultFont) patch.defaultFont = config.defaultFont;
    if (config.customPresetColors) patch.customColors = config.customPresetColors;
    if (config.autosave !== undefined) patch.autosave = config.autosave;
    if (Object.keys(patch).length) prefs.update(patch as Parameters<typeof prefs.update>[0]);
    if (config.gridSize) useEditor.getState().updateSettings({ gridSize: config.gridSize });
    if (config.defaultLibraries) {
      showOnlyLibraries(resolveLibraryIds(config.defaultLibraries));
      notes.push('Shape library selection applies the next time the Shapes panel opens.');
    }
  }
  if (config.libraries?.length) {
    const { added, failed } = await loadLibraryUrls(config.libraries);
    if (added) notes.push(`Loaded ${added} custom librar${added === 1 ? 'y' : 'ies'}.`);
    if (failed.length) notes.push(`Could not load ${failed.length} librar${failed.length === 1 ? 'y' : 'ies'} (network or CORS).`);
  }
  return notes;
}
