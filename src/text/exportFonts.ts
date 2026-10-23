/**
 * Web fonts in exports: collects the Google Fonts a set of elements uses
 * (element font + per-run fonts in formatted labels) with the characters
 * drawn in each, and fetches subset @font-face rules with inlined files so
 * exported SVG/PNG/HTML render the same font offline.
 */
import type { DiagramElement } from '@/model/types';
import { embedWebFonts, isFontKey, isGoogleFont } from './fonts';
import { stripFormatting } from './richFormat';
import { translationLangs } from './translations';

/** font name → characters drawn with it. */
export function webFontsUsed(els: DiagramElement[]): Map<string, string> {
  const out = new Map<string, string>();
  const add = (name: string, text: string) => {
    if (!isGoogleFont(name)) return;
    out.set(name, (out.get(name) ?? '') + text);
  };
  for (const el of els) {
    if (!el.text) continue;
    const texts = [el.text, ...translationLangs(el).map((l) => el.data?.[`label_${l}`] ?? '')];
    const all = texts.join('');
    if (!isFontKey(el.style.fontFamily)) add(el.style.fontFamily, el.style.richText ? texts.map(stripFormatting).join('') : all);
    if (el.style.richText) {
      // Per-run fonts: draw every character of the label with them (cheap and safe).
      for (const m of all.matchAll(/font-family:\s*(?:&quot;|["'])?([^;"'&<>]+)|face="([^"]+)"/gi)) add((m[1] ?? m[2]).split(',')[0].trim(), texts.map(stripFormatting).join(''));
    }
  }
  return out;
}

let cache: { key: string; css: string } | null = null;
const keyOf = (fonts: Map<string, string>) => [...fonts].map(([n, t]) => `${n}:${[...new Set(t)].sort().join('')}`).join('|');

/** Fetches the subset fonts for `els` (call before the synchronous renderer). */
export async function loadWebFonts(els: DiagramElement[]): Promise<void> {
  const fonts = webFontsUsed(els);
  if (!fonts.size) return;
  const key = keyOf(fonts);
  if (cache?.key === key) return;
  cache = { key, css: await embedWebFonts(fonts) };
}

/** @font-face rules loaded by `loadWebFonts` for exactly these elements ('' otherwise). */
export function webFontCss(els: DiagramElement[]): string {
  const fonts = webFontsUsed(els);
  return fonts.size && cache?.key === keyOf(fonts) ? cache.css : '';
}
