/**
 * Custom shape files → library items:
 *
 * - draw.io / mxGraph stencil sets: `<shapes name="…"><shape …/>…</shapes>`
 *   (or a single `<shape>`), one item per shape.
 * - OpenDraw shape config JSON (`"format": "opendraw-shapes"`), documented in
 *   docs/extensibility.md: name, stencil XML, default style (OpenDraw keys or a
 *   draw.io style string), size, label, connection points and parameters.
 *
 * draw.io `<mxlibrary>` files whose entries use `shape=stencil(…)` need nothing
 * special: the .drawio importer turns those cells into stencil shapes.
 */
import type { ElementStyle, ShapeElement, Vec } from '@/model/types';
import { createShape } from '@/model/defaults';
import { uid } from '@/lib/id';
import { elementFromDrawioStyle } from '@/io/drawio';
import { parseStencil, splitStencilSet, stencilPoints } from './parse';
import { STENCIL_KIND } from './shape';

export interface ShapeConfigEntry {
  name: string;
  /** mxGraph stencil XML (`<shape>…</shape>`). */
  stencil: string;
  /** Default size; falls back to the stencil's design size. */
  w?: number;
  h?: number;
  /** Default style: OpenDraw `ElementStyle` keys, or a draw.io style string. */
  style?: Partial<ElementStyle> | string;
  /** Default label. */
  text?: string;
  /** Connection points as fractions of the box; defaults to the stencil's `<constraint>`s. */
  connectionPoints?: Vec[];
  /** Parametric values stored on the shape (`ShapeElement.params`). */
  params?: Record<string, number | string>;
  keywords?: string;
}

export interface ShapeConfig {
  format: 'opendraw-shapes';
  version?: number;
  name?: string;
  shapes: ShapeConfigEntry[];
}

export interface StencilLibraryItem {
  id: string;
  title: string;
  elements: ShapeElement[];
  w: number;
  h: number;
}

/** Builds a stencil shape element at (x, y) from a config entry. Throws on invalid stencil XML. */
export function shapeFromConfig(entry: ShapeConfigEntry, x = 0, y = 0): ShapeElement {
  const st = parseStencil(entry.stencil);
  const w = Math.max(1, Number(entry.w) || st.w);
  const h = Math.max(1, Number(entry.h) || st.h);
  let style: Partial<ElementStyle> = {};
  if (typeof entry.style === 'string') {
    const probe = createShape('rectangle', { x: 0, y: 0, w, h });
    style = elementFromDrawioStyle(entry.style, probe)?.style ?? {};
  } else if (entry.style && typeof entry.style === 'object') style = entry.style;
  const el = createShape(STENCIL_KIND, { x, y, w, h }, style, entry.text ?? '');
  el.stencil = entry.stencil;
  const points = entry.connectionPoints ?? stencilPoints(entry.stencil);
  if (points?.length) el.connectionPoints = points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (entry.params) el.params = { ...entry.params };
  if (entry.name) el.name = entry.name;
  return el;
}

const toItem = (entry: ShapeConfigEntry): StencilLibraryItem => {
  const el = shapeFromConfig(entry);
  return { id: uid(), title: entry.name || 'Custom shape', elements: [el], w: Math.round(el.w), h: Math.round(el.h) };
};

/** Validates and normalizes a parsed shape config object. */
export function readShapeConfig(data: unknown): ShapeConfig {
  const d = data as Partial<ShapeConfig> | ShapeConfigEntry[];
  const shapes = Array.isArray(d) ? d : d?.format === 'opendraw-shapes' && Array.isArray(d.shapes) ? d.shapes : null;
  if (!shapes) throw new Error('Not an OpenDraw shape config (expected "format": "opendraw-shapes").');
  for (const [i, s] of shapes.entries()) {
    if (!s || typeof s.stencil !== 'string') throw new Error(`Shape ${i + 1} has no "stencil" XML.`);
  }
  return { format: 'opendraw-shapes', version: 1, name: Array.isArray(d) ? undefined : d.name, shapes };
}

/**
 * Parses a stencil set XML or a shape config JSON into library items, or
 * returns null when the text is neither (so other parsers can try).
 */
export function parseStencilLibrary(text: string, fallbackName: string): { name: string; items: StencilLibraryItem[] } | null {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    let data: unknown;
    try {
      data = JSON.parse(t);
    } catch {
      return null;
    }
    const isConfig = Array.isArray(data) ? data.every((e) => e && typeof e === 'object' && 'stencil' in e) : (data as { format?: string })?.format === 'opendraw-shapes';
    if (!isConfig) return null;
    const cfg = readShapeConfig(data);
    return { name: cfg.name || fallbackName, items: cfg.shapes.map(toItem) };
  }
  if (!/^(<\?xml[^>]*>\s*)?<(shapes|shape)[\s>]/i.test(t)) return null;
  const setName = t.match(/<shapes[^>]*\sname="([^"]*)"/i)?.[1];
  const items = splitStencilSet(t).map((s) => toItem({ name: s.name, stencil: s.xml }));
  if (!items.length) throw new Error('No <shape> found in this stencil file.');
  return { name: setName || fallbackName, items };
}
