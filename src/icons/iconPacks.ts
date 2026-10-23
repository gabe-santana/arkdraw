/**
 * Vendor icon packs (AWS, Azure, GCP, OCI, Alibaba, IBM, Kubernetes, logos) and
 * generic UI icon sets (Material Symbols, Font Awesome Free, Fluent UI, Bootstrap Icons).
 * Produced by `npm run icons:fetch` into public/icons and bundled with the app,
 * so they work offline. Manifests are fetched lazily, one provider at a time.
 */
import { create } from 'zustand';
import type { ShapeElement, Vec } from '@/model/types';
import { createShape } from '@/model/defaults';
import { searchIconPacks } from '@/search/indexes';

export interface ProviderInfo {
  id: string;
  name: string;
  count: number;
  categories: string[];
}

export interface IconEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  keywords: string[];
}

export interface IconPack {
  provider: string;
  name: string;
  version: string;
  source: string;
  license: string;
  icons: IconEntry[];
}

const base = `${import.meta.env.BASE_URL}icons/`;

interface PackState {
  providers: ProviderInfo[] | null;
  packs: Record<string, IconPack>;
  error: string | null;
}

export const useIconPacks = create<PackState>(() => ({ providers: null, packs: {}, error: null }));

let providersPromise: Promise<ProviderInfo[]> | null = null;
const packPromises = new Map<string, Promise<IconPack>>();

export function loadProviders(): Promise<ProviderInfo[]> {
  providersPromise ??= fetch(`${base}providers.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Icon packs are not installed. Run `npm run icons:fetch`.');
      return r.json() as Promise<ProviderInfo[]>;
    })
    .then((providers) => {
      useIconPacks.setState({ providers });
      return providers;
    })
    .catch((e) => {
      providersPromise = null;
      useIconPacks.setState({ providers: [], error: String(e.message ?? e) });
      return [];
    });
  return providersPromise;
}

export function loadPack(provider: string): Promise<IconPack> {
  let p = packPromises.get(provider);
  if (!p) {
    p = fetch(`${base}${provider}/index.json`)
      .then((r) => r.json() as Promise<IconPack>)
      .then((pack) => {
        useIconPacks.setState((s) => ({ packs: { ...s.packs, [provider]: pack } }));
        return pack;
      });
    p.catch(() => packPromises.delete(provider));
    packPromises.set(provider, p);
  }
  return p;
}

/** Path stored on the element: "<provider>/<file>". */
export const iconPath = (provider: string, icon: IconEntry) => `${provider}/${icon.file}`;

/** Smart icon search (typos, acronyms, cross-cloud synonyms) — see src/search. */
export function searchIcons(packs: IconPack[], query: string, limit = 240): Array<{ provider: string; icon: IconEntry }> {
  if (!query.trim()) return [];
  return searchIconPacks(packs, query, limit);
}

/** Group/boundary icons (AWS "Groups", etc.) work better as labeled containers. */
export const ICON_SIZE = 64;

/** Style of a placed vendor icon: no box, the name as a small caption. */
export const ICON_STYLE = { fill: 'none', stroke: 'none', fontSize: 12, textColor: '#1e293b' };

export function createIconElement(provider: string, icon: IconEntry, at: Vec): ShapeElement {
  const el = createShape(
    'icon',
    { x: at.x - ICON_SIZE / 2, y: at.y - ICON_SIZE / 2, w: ICON_SIZE, h: ICON_SIZE },
    ICON_STYLE,
    icon.name,
  );
  el.icon = iconPath(provider, icon);
  return el;
}
