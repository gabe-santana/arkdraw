/**
 * strings for Edit Style (Mod+E).
 *
 * Emitting reuses the .drawio exporter (`drawioStyleOf`), parsing reuses the
 * importer (`elementFromDrawioStyle`), so the dialog speaks exactly the
 * dialect the file format does. Applying is a diff: the original and edited
 * strings are both read back and only the fields that changed are written,
 * so OpenDraw-only properties (that a style string can't express) survive.
 * Keys neither side understands are kept in `data.__drawioStyle` and
 * re-emitted on export.
 */
import type { DiagramElement, ElementStyle } from '@/model/types';
import { drawioStyleOf, elementFromDrawioStyle } from '@/io/drawio';
import { EXTRA_STYLE_KEY, pairsToStyle, parseStylePairs } from './styleExtras';

/** Keys the mxGraph importer interprets (anything else is preserved verbatim). */
const IMPORT_KEYS = new Set(
  (
    'fillColor strokeColor strokeWidth dashed dashPattern opacity fillOpacity strokeOpacity textOpacity rounded absoluteArcSize arcSize shadow ' +
    'fontFamily fontSize fontStyle fontColor align verticalAlign shape text image rotation flipH flipV gradientColor gradientDirection ' +
    'sketch glass swimlane container collapsible edgeStyle curved elbow endArrow startArrow endFill startFill flowAnimation jumpStyle ' +
    'exitX exitY entryX entryY exitDx exitDy entryDx entryDy edgeLabel group ellipse rhombus html whiteSpace shadowColor shadowBlur ' +
    'shadowOffsetX shadowOffsetY shadowOpacity fillStyle jiggle curveFitting verticalLabelPosition labelPosition points'
  ).split(' '),
);

/** Fields that never come from a style string. */
const SKIP_FIELDS = new Set(['id', 'type', 'x', 'y', 'w', 'h', 'text', 'groupIds', 'style', 'data', 'source', 'target', 'waypoints', 'layerId', 'containerId', 'tooltip', 'link', 'tags', 'comments', 'name', 'locked', 'hidden']);

const withoutExtras = (el: DiagramElement): DiagramElement => {
  if (!el.data?.[EXTRA_STYLE_KEY]) return el;
  const data = { ...el.data };
  delete data[EXTRA_STYLE_KEY];
  return { ...el, data: Object.keys(data).length ? data : undefined };
};

/** The element's string, one `key=value;` per line. */
export function formatDrawioStyle(el: DiagramElement): string {
  return parseStylePairs(drawioStyleOf(el))
    .map(([k, v]) => (v === '' ? `${k};` : `${k}=${v};`))
    .join('\n');
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

export interface DrawioStylePatch {
  style: Partial<ElementStyle>;
  /** Style keys to remove (set back to "absent"). */
  removeStyle: Array<keyof ElementStyle>;
  /** Other element fields that changed (kind, rotation, routing, arrows…). */
  fields: Record<string, unknown>;
  /** Unknown keys to preserve, as a style string ('' = none). */
  extras: string;
}

/** Diffs the element's current style string against an edited one. */
export function diffDrawioStyle(el: DiagramElement, edited: string): DrawioStylePatch {
  const original = drawioStyleOf(el);
  const a = elementFromDrawioStyle(original, el);
  const b = elementFromDrawioStyle(pairsToStyle(parseStylePairs(edited.replace(/\n/g, ';'))), el);
  if (!a || !b) throw new Error('This style string could not be read.');
  const patch: DrawioStylePatch = { style: {}, removeStyle: [], fields: {}, extras: '' };
  const sa = a.style as unknown as Record<string, unknown>;
  const sb = b.style as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (same(sa[k], sb[k])) continue;
    if (sb[k] === undefined) patch.removeStyle.push(k as keyof ElementStyle);
    else (patch.style as Record<string, unknown>)[k] = sb[k];
  }
  const fa = a as unknown as Record<string, unknown>;
  const fb = b as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
    if (SKIP_FIELDS.has(k) || same(fa[k], fb[k])) continue;
    patch.fields[k] = fb[k];
  }
  const emitted = new Set(parseStylePairs(drawioStyleOf(withoutExtras(el))).map(([k]) => k));
  patch.extras = pairsToStyle(parseStylePairs(edited.replace(/\n/g, ';')).filter(([k]) => !emitted.has(k) && !IMPORT_KEYS.has(k)));
  return patch;
}

/** Applies a style patch to one element (only to elements of the same type as the one it came from). */
export function applyDrawioStylePatch(el: DiagramElement, p: DrawioStylePatch, fromType: DiagramElement['type']): Partial<DiagramElement> {
  const style = { ...el.style, ...p.style } as unknown as Record<string, unknown>;
  for (const k of p.removeStyle) delete style[k];
  const out: Record<string, unknown> = { style };
  if (el.type === fromType) Object.assign(out, p.fields);
  const data: Record<string, string> = { ...(el.data ?? {}) };
  if (p.extras) data[EXTRA_STYLE_KEY] = p.extras;
  else delete data[EXTRA_STYLE_KEY];
  out.data = Object.keys(data).length ? data : undefined;
  return out as Partial<DiagramElement>;
}
