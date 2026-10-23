/**
 * keys OpenDraw doesn't model, kept on the element so they
 * survive Edit Style and .drawio export. Stored in the hidden data key
 * `__drawioStyle` ("key=value;key2=value2;"), which Edit Data doesn't show.
 */
import type { DiagramElement } from '@/model/types';

export const EXTRA_STYLE_KEY = '__drawioStyle';

/** Parses `a=1;b;c=x` into ordered pairs (bare keys get an empty value). */
export function parseStylePairs(style: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const raw of style.split(';')) {
    const part = raw.trim();
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq < 0) out.push([part, '']);
    else out.push([part.slice(0, eq).trim(), part.slice(eq + 1).trim()]);
  }
  return out;
}

export const pairsToStyle = (pairs: Array<[string, string]>) => (pairs.length ? pairs.map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join(';') + ';' : '');

/** Preserved extra keys of an element. */
export const styleExtrasOf = (el: DiagramElement): Array<[string, string]> => parseStylePairs(el.data?.[EXTRA_STYLE_KEY] ?? '');

/** Adds an element's preserved keys to an export style map (never overriding mapped keys). */
export function mergeStyleExtras(m: Map<string, string>, el: DiagramElement) {
  for (const [k, v] of styleExtrasOf(el)) if (!m.has(k)) m.set(k, v);
}
