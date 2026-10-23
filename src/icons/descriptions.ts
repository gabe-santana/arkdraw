/**
 * One-line descriptions for vendor icons (public/icons/<provider>/descriptions.json)
 * and for shape kinds (src/shapes/descriptions.ts), loaded lazily.
 */
import { create } from 'zustand';

const base = `${import.meta.env.BASE_URL}icons/`;

export const useIconDescriptions = create<Record<string, Record<string, string>>>(() => ({}));
const loading = new Set<string>();

/** Loads a provider's descriptions once (missing files are fine). */
export function loadIconDescriptions(provider: string) {
  if (loading.has(provider)) return;
  loading.add(provider);
  fetch(`${base}${provider}/descriptions.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((map: Record<string, string>) => useIconDescriptions.setState({ [provider]: map }))
    .catch(() => undefined);
}

// Shape descriptions ship with the app (optional module).
const SHAPE_MODULES = import.meta.glob<{ SHAPE_DESCRIPTIONS?: Record<string, string> }>('../shapes/descriptions.ts', { eager: true });
const SHAPE_DESCRIPTIONS: Record<string, string> = Object.values(SHAPE_MODULES)[0]?.SHAPE_DESCRIPTIONS ?? {};

export const shapeDescription = (kind: string): string | undefined => SHAPE_DESCRIPTIONS[kind];
