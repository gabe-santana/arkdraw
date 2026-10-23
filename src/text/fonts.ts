/**
 * Label fonts beyond the four built-in stacks: a curated set of Google Fonts
 * (loaded on demand from fonts.googleapis.com) and any installed system font
 * by name. `style.fontFamily` holds either a built-in key (`sans`, `serif`,
 * `mono`, `hand`) or the font's family name.
 */
import type { FontFamily, FontKey } from '@/model/types';
import { FONT_LABELS, FONT_STACKS } from '@/model/defaults';

export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'display';

/** Curated Google Fonts offered in the font picker (all have 400/700 + italics or close). */
export const GOOGLE_FONTS: Array<{ name: string; category: FontCategory }> = [
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },
  { name: 'IBM Plex Sans', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Ubuntu', category: 'sans-serif' },
  { name: 'Fira Sans', category: 'sans-serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Roboto Slab', category: 'serif' },
  { name: 'PT Serif', category: 'serif' },
  { name: 'Noto Serif', category: 'serif' },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'Roboto Mono', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Architects Daughter', category: 'cursive' },
  { name: 'Indie Flower', category: 'cursive' },
  { name: 'Patrick Hand', category: 'cursive' },
  { name: 'Permanent Marker', category: 'cursive' },
  { name: 'Kalam', category: 'cursive' },
  { name: 'Oswald', category: 'display' },
  { name: 'Bebas Neue', category: 'display' },
];

const GOOGLE = new Map(GOOGLE_FONTS.map((f) => [f.name.toLowerCase(), f]));

/** Common system fonts (mxGraph's default list); used as-is, never downloaded. */
export const SYSTEM_FONTS = ['Helvetica', 'Arial', 'Verdana', 'Times New Roman', 'Garamond', 'Comic Sans MS', 'Courier New', 'Georgia', 'Lucida Console', 'Tahoma'];

const GENERIC: Record<FontCategory, string> = {
  'sans-serif': 'sans-serif',
  serif: 'serif',
  monospace: 'monospace',
  cursive: 'cursive',
  display: 'sans-serif',
};

export const isFontKey = (f: string | undefined): f is FontKey => !!f && f in FONT_STACKS;
export const googleFont = (name: string) => GOOGLE.get(name.trim().toLowerCase());
export const isGoogleFont = (name: string) => GOOGLE.has(name.trim().toLowerCase());

/** Generic family to fall back on (also what PDF viewers map the font to). */
function genericFor(name: string): string {
  const g = googleFont(name);
  if (g) return GENERIC[g.category];
  if (/mono|courier|consol|code/i.test(name)) return 'monospace';
  if (/comic|hand|script|marker|print/i.test(name)) return 'cursive';
  if (/serif|times|georgia|garamond|roman|book/i.test(name) && !/sans/i.test(name)) return 'serif';
  return 'sans-serif';
}

/** Strips characters that could break out of a CSS font-family value. */
export const cleanFontName = (name: string) => name.replace(/["'\\;{}<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 64);

/** CSS font-family stack for a style's font (built-in key or font name). */
export function fontStack(family: FontFamily | undefined): string {
  if (!family) return FONT_STACKS.sans;
  if (isFontKey(family)) return FONT_STACKS[family];
  const name = cleanFontName(family);
  if (!name) return FONT_STACKS.sans;
  if (isGoogleFont(name)) ensureWebFont(name);
  return `"${name}", ${genericFor(name)}`;
}

/** Display name for the font picker. */
export const fontLabel = (family: FontFamily) => (isFontKey(family) ? FONT_LABELS[family] : family);

/** Monospace-ish width estimate for headless measuring. */
export const isMonoFamily = (family: FontFamily) => family === 'mono' || genericFor(String(family)) === 'monospace';

// ---------------------------------------------------------------------------
// On-demand loading (browser)
// ---------------------------------------------------------------------------

const GOOGLE_CSS = 'https://fonts.googleapis.com/css2';

/** Google Fonts css2 URL; `text` subsets the font to those characters (exports). */
export function googleFontCssUrl(name: string, text?: string): string {
  const family = encodeURIComponent(cleanFontName(name)).replace(/%20/g, '+');
  return `${GOOGLE_CSS}?family=${family}:ital,wght@0,400;0,700;1,400;1,700&display=swap${text ? `&text=${encodeURIComponent(text)}` : ''}`;
}

const requested = new Set<string>();
const listeners = new Set<() => void>();

/** Called whenever a web font finishes loading (text must be re-measured). */
export function onWebFontLoaded(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Injects the Google Fonts stylesheet for `name` once, then waits for its faces. */
export function ensureWebFont(name: string): void {
  const key = name.toLowerCase();
  if (requested.has(key) || typeof document === 'undefined' || !document.head) return;
  requested.add(key);
  if (import.meta.env?.MODE === 'test') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontCssUrl(name);
  link.dataset.webFont = name;
  link.onload = () => {
    const fam = `"${cleanFontName(name)}"`;
    Promise.all(['400', '700', 'italic 400', 'italic 700'].map((v) => document.fonts?.load(`${v} 16px ${fam}`).catch(() => [])))
      .then(() => listeners.forEach((cb) => cb()))
      .catch(() => {});
  };
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Export embedding
// ---------------------------------------------------------------------------

const embedCache = new Map<string, string>();

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Self-contained @font-face rules for Google Fonts, subset to `text`, with the
 * font files inlined as data URLs. Fonts that can't be fetched (offline, CSP)
 * are skipped: the exported SVG then falls back to the generic family.
 */
export async function embedWebFonts(fonts: Map<string, string>): Promise<string> {
  const parts = await Promise.all(
    [...fonts].map(async ([name, text]) => {
      if (!isGoogleFont(name)) return '';
      const chars = [...new Set(text.replace(/\s/g, ''))].sort().join('') || 'A';
      const key = `${name}\u0000${chars}`;
      const hit = embedCache.get(key);
      if (hit !== undefined) return hit;
      try {
        const res = await fetch(googleFontCssUrl(name, chars));
        if (!res.ok) throw new Error(res.statusText);
        let css = await res.text();
        const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+)\)/g)].map((m) => m[1]))];
        const data = await Promise.all(urls.map(toDataUrl));
        urls.forEach((u, i) => (css = css.split(u).join(data[i])));
        // Keep only @font-face blocks (no comments / other rules).
        css = (css.match(/@font-face\s*{[^}]*}/g) ?? []).join('');
        embedCache.set(key, css);
        return css;
      } catch {
        return '';
      }
    }),
  );
  return parts.join('');
}
