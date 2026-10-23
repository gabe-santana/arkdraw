/**
 * Per-page grid & snap (mxGraph keeps grid/gridSize per diagram page).
 *
 * The store's `settings` always holds the *effective* values for the active
 * page: the page's own overrides on top of the global settings, which act as
 * the fallback (and as the default for pages that never changed them).
 * Changing a grid setting writes it to the active page and to the global
 * default, so new pages inherit the user's last choice.
 */
import type { PageSettings } from '@/model/types';
import type { Settings } from '@/store/editor';

export const PAGE_GRID_KEYS = ['grid', 'gridSize', 'snap', 'gridColor'] as const;
export type PageGridKey = (typeof PAGE_GRID_KEYS)[number];

/**
 * What to store on the page for a settings change, or null when the patch has
 * no grid keys. Touching any grid key pins all of them (from the resulting
 * `settings`), so the page keeps its look even when another page later changes
 * the global default.
 */
export function pageGridPatch(patch: Partial<Settings>, settings?: Settings): Partial<PageSettings> | null {
  if (!PAGE_GRID_KEYS.some((k) => k in patch)) return null;
  const src: Partial<Settings> = settings ? { ...settings, ...patch } : patch;
  const out: Partial<PageSettings> = {};
  for (const k of PAGE_GRID_KEYS) if (k in src) (out as Record<string, unknown>)[k] = src[k];
  return out;
}

/** Global settings with the page's grid overrides applied. */
export function effectiveSettings(global: Settings, page: PageSettings | undefined): Settings {
  if (!page) return global;
  const out: Settings = { ...global };
  for (const k of PAGE_GRID_KEYS) {
    const v = page[k];
    if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}
