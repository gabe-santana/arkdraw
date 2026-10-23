/**
 * Parametric shape geometry (draw.io's "yellow diamond" values).
 *
 * A ShapeDef may declare `params` (corner size, arrow width, header size…)
 * whose values live in `el.params`. `withParams` wraps a definition so its
 * `render` and `textBox` always receive a complete, clamped value map — shape
 * code can read `params.size` without worrying about missing or bad values.
 */
import type { ShapeElement, Vec } from '@/model/types';
import type { HandleGeometry, ParamHandle, ParamPatch, ParamValues, ShapeDef, ShapeParam } from './types';

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** Clamps / normalizes one value for `param` (null when unusable). */
export function normalizeParam(param: ShapeParam, v: unknown): number | string | null {
  if (param.kind === 'enum') return typeof v === 'string' && param.options?.some((o) => o.value === v) ? v : null;
  if (param.kind === 'color') return typeof v === 'string' ? v : null;
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  if (param.kind === 'boolean') return n ? 1 : 0;
  const lo = param.min ?? (param.kind === 'percent' ? 0 : -Infinity);
  const hi = param.max ?? (param.kind === 'percent' ? 1 : Infinity);
  let out = Math.max(lo, Math.min(hi, n));
  if (param.step && param.step >= 1) out = Math.round(out);
  return out;
}

/** Every declared param, from `values` when valid, else its default. */
export function resolveParams(defs: ShapeParam[] | undefined, values?: ParamValues | null): ParamValues {
  const out: ParamValues = {};
  for (const p of defs ?? []) {
    const v = values && p.key in values ? normalizeParam(p, values[p.key]) : null;
    out[p.key] = v ?? p.default;
  }
  return out;
}

/** Resolved params of a shape element. */
export function paramsOf(def: ShapeDef, el: Pick<ShapeElement, 'params'>): ParamValues {
  return resolveParams(def.params, el.params);
}

/** Numeric param value (0 when absent). */
export const pn = (p: ParamValues | undefined, key: string): number => {
  const v = p?.[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** String param value ('' when absent). */
export const ps = (p: ParamValues | undefined, key: string): string => {
  const v = p?.[key];
  return typeof v === 'string' ? v : v === undefined ? '' : String(v);
};

/** Applies a handle/field patch: params are normalized against their definitions. */
export function applyParamPatch(def: ShapeDef, el: Pick<ShapeElement, 'params' | 'style'>, patch: ParamPatch): Partial<ShapeElement> {
  const out: Partial<ShapeElement> = {};
  if (patch.params) {
    const next: ParamValues = { ...el.params };
    for (const [k, v] of Object.entries(patch.params)) {
      const param = def.params?.find((p) => p.key === k);
      const nv = param ? normalizeParam(param, v) : v;
      if (nv === null || nv === '') delete next[k];
      else next[k] = typeof nv === 'number' ? Math.round(nv * 1e4) / 1e4 : nv;
    }
    out.params = Object.keys(next).length ? next : undefined;
  }
  if (patch.style) out.style = { ...el.style, ...patch.style };
  return out;
}

/** Display string for a value ("25%", "18 px", "On"). */
export function formatParam(param: ShapeParam, v: number | string): string {
  if (param.kind === 'percent') return `${Math.round(Number(v) * 100)}%`;
  if (param.kind === 'boolean') return Number(v) ? 'On' : 'Off';
  if (param.kind === 'number') return `${Math.round(Number(v) * 10) / 10}${param.step && param.step >= 1 ? '' : ' px'}`;
  if (param.kind === 'enum') return param.options?.find((o) => o.value === v)?.label ?? String(v);
  return String(v || 'Auto');
}

// ---------------------------------------------------------------------------
// Definition wrapping
// ---------------------------------------------------------------------------

const wrapped = new WeakSet<ShapeDef>();

/**
 * Makes `render` / `textBox` resolve params (defaults + clamping) before
 * running, so callers that pass none (thumbnails, exports) still work.
 */
export function withParams(def: ShapeDef): ShapeDef {
  if (!def.params?.length || wrapped.has(def)) return def;
  const { render, textBox } = def;
  const out: ShapeDef = {
    ...def,
    render: (ctx) => render({ ...ctx, params: resolveParams(def.params, ctx.params) }),
    textBox: textBox ? (w, h, p) => textBox(w, h, resolveParams(def.params, p)) : undefined,
  };
  wrapped.add(out);
  return out;
}

// ---------------------------------------------------------------------------
// Builders (keep shape definitions terse)
// ---------------------------------------------------------------------------

type Extra = Partial<Omit<ShapeParam, 'key' | 'label' | 'kind' | 'default'>>;

export const param = {
  /** A length in px. */
  px: (key: string, label: string, def: number, extra: Extra = {}): ShapeParam => ({ key, label, kind: 'number', default: def, min: 0, max: 1000, ...extra }),
  /** A fraction 0..1 (shown as %). */
  pct: (key: string, label: string, def: number, extra: Extra = {}): ShapeParam => ({ key, label, kind: 'percent', default: def, min: 0, max: 1, ...extra }),
  /** An integer count. */
  count: (key: string, label: string, def: number, min: number, max: number, extra: Extra = {}): ShapeParam => ({ key, label, kind: 'number', default: def, min, max, step: 1, ...extra }),
  bool: (key: string, label: string, def: boolean, extra: Extra = {}): ShapeParam => ({ key, label, kind: 'boolean', default: def ? 1 : 0, ...extra }),
  color: (key: string, label: string, extra: Extra = {}): ShapeParam => ({ key, label, kind: 'color', default: '', ...extra }),
};

/** Handle shorthand. */
export const handle = (x: number, y: number, drag: (pt: Vec) => ParamPatch, show?: string): ParamHandle => ({ x, y, drag, show });

/**
 * Corner-radius handle on the top edge (edits `style.radius`), kept clear of
 * the corner resize handle.
 */
export function radiusHandle(w: number, h: number, r: number, px: number): ParamHandle {
  const max = Math.min(w, h) / 2;
  const off = Math.min(w / 2, 16 * px);
  return handle(Math.max(Math.min(r, max), off), 0, (pt) => ({ style: { radius: Math.round(Math.max(0, Math.min(max, pt.x))) } }));
}

/** Local → world for a shape (flip about the centre, then rotation), as the canvas renders it. */
export function localToWorld(el: Pick<ShapeElement, 'x' | 'y' | 'w' | 'h' | 'rotation' | 'flipH' | 'flipV'>, p: Vec): Vec {
  const lx = el.flipH ? el.w - p.x : p.x;
  const ly = el.flipV ? el.h - p.y : p.y;
  const cx = el.w / 2;
  const cy = el.h / 2;
  const a = ((el.rotation ?? 0) * Math.PI) / 180;
  const dx = lx - cx;
  const dy = ly - cy;
  return { x: el.x + cx + dx * Math.cos(a) - dy * Math.sin(a), y: el.y + cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** World → local (inverse of `localToWorld`). */
export function worldToLocal(el: Pick<ShapeElement, 'x' | 'y' | 'w' | 'h' | 'rotation' | 'flipH' | 'flipV'>, p: Vec): Vec {
  const cx = el.w / 2;
  const cy = el.h / 2;
  const a = (-(el.rotation ?? 0) * Math.PI) / 180;
  const dx = p.x - el.x - cx;
  const dy = p.y - el.y - cy;
  const lx = cx + dx * Math.cos(a) - dy * Math.sin(a);
  const ly = cy + dx * Math.sin(a) + dy * Math.cos(a);
  return { x: el.flipH ? el.w - lx : lx, y: el.flipV ? el.h - ly : ly };
}

/** Handles of a shape element (empty when its kind has none). */
export function handlesOf(def: ShapeDef, el: ShapeElement, px = 1): ParamHandle[] {
  if (!def.handles) return [];
  const g: HandleGeometry = { w: el.w, h: el.h, p: paramsOf(def, el), style: el.style, px };
  return def.handles(g);
}
