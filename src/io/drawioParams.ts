/**
 * mxGraph round-trip of parametric shape values (`el.params`): `size`,
 * `arcSize`-like keys, `arrowWidth` / `arrowSize`, `startSize`,
 * `swimlaneFillColor`, callout `position` / `position2` / `base`,
 * partialRectangle sides… Each `ShapeParam` names its style key; this module
 * converts units (mxGraph's `fixedSize=1` switches some keys between a
 * fraction of the size and px) and maps swimlanes back to pools / lanes.
 */
import type { ShapeElement } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { normalizeParam, paramsOf } from '@/shapes/params';
import type { ParamValues, ShapeParam } from '@/shapes/types';

type StyleMap = Map<string, string>;

const exported = (p: ShapeParam) => p.drawio !== false && !p.kindOptions;
const styleKey = (p: ShapeParam) => (typeof p.drawio === 'string' ? p.drawio : p.key);
const num = (v: number) => String(Math.round(v * 1e4) / 1e4);

/** Writes the element's params into a map (overriding the shape's base style). */
export function exportShapeParams(el: ShapeElement, m: StyleMap) {
  const def = getShapeDef(el.kind);
  if (!def.params?.length || def.kind !== el.kind) return;
  const values = paramsOf(def, el);
  for (const p of def.params) {
    if (!exported(p)) continue;
    const key = styleKey(p);
    const v = values[p.key];
    if (p.kind === 'color') {
      if (typeof v === 'string' && v) m.set(key, v);
      continue;
    }
    if (p.kind === 'enum') {
      m.set(key, String(v));
      continue;
    }
    if (p.kind === 'boolean') {
      m.set(key, Number(v) ? '1' : '0');
      continue;
    }
    // A fraction param must not be read as px, and a px param must be.
    if (p.fixedSizeOf) {
      if (p.kind === 'percent') m.delete('fixedSize');
      else m.set('fixedSize', '1');
    }
    m.set(key, num(Number(v)));
  }
}

/** Parses one mxGraph value for `p` (converting fraction ↔ px for `fixedSizeOf`). */
function parseValue(p: ShapeParam, raw: string | number, m: StyleMap, el: ShapeElement): number | string | null {
  if (p.kind === 'color') return typeof raw === 'string' && raw !== 'default' && raw !== '' ? raw : null;
  if (p.kind === 'enum') return normalizeParam(p, String(raw));
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (p.kind === 'boolean') return n ? 1 : 0;
  if (p.fixedSizeOf) {
    const dim = p.fixedSizeOf === 'w' ? el.w : el.h;
    const fixed = m.get('fixedSize') === '1';
    if (p.kind === 'percent' && fixed) n = dim ? n / dim : 0;
    if (p.kind === 'number' && !fixed) n = n * dim;
  }
  return normalizeParam(p, n);
}

export interface ParamImportContext {
  /** Style of the parent cell, if it is a vertex. */
  parentStyle?: StyleMap;
  /** Styles of the child cells (computed lazily). */
  childStyles: () => StyleMap[];
}

/**
 * Reads params from a into `el.params`, after the importer
 * picked the kind. Plain mxGraph swimlanes become pools / lanes here: a
 * `horizontal=0` swimlane is a pool with a left header (a lane when nested
 * in another swimlane); a top-header swimlane holding swimlanes is a vertical pool.
 */
export function importShapeParams(el: ShapeElement, m: StyleMap, ctx: ParamImportContext) {
  if (m.has('swimlane') && el.kind === 'container' && !m.has('childLayout')) {
    const inSwimlane = !!ctx.parentStyle?.has('swimlane');
    if (m.get('horizontal') === '0') el.kind = inSwimlane ? 'lane.laneH' : 'lane.poolH';
    else if (inSwimlane) el.kind = 'lane.laneV';
    else if (ctx.childStyles().some((s) => s.has('swimlane'))) el.kind = 'lane.poolV';
  }
  const def = getShapeDef(el.kind);
  if (!def.params?.length || def.kind !== el.kind) return;
  const out: ParamValues = {};
  for (const p of def.params) {
    if (!exported(p)) continue;
    const raw = m.get(styleKey(p)) ?? p.drawioDefault;
    if (raw === undefined) continue;
    const v = parseValue(p, raw, m, el);
    if (v === null || v === p.default) continue;
    out[p.key] = typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v;
  }
  if (Object.keys(out).length) el.params = { ...el.params, ...out };
}
