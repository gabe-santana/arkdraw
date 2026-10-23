/**
 * Shared, lazily-built search indexes for the app's catalogs.
 */
import { LIBRARIES } from '@/shapes/libraries';
import type { LibraryItem } from '@/shapes/types';
import type { IconEntry, IconPack } from '@/icons/iconPacks';
import { SearchIndex } from './engine';

export interface LibraryHit {
  item: LibraryItem;
  library: string;
  libraryId: string;
}

let shapeIndex: SearchIndex<LibraryHit> | null = null;

export function searchShapes(query: string, limit = 120): LibraryHit[] {
  shapeIndex ??= new SearchIndex(
    LIBRARIES.flatMap((lib) => lib.items.map((item) => ({ item, library: lib.name, libraryId: lib.id }))),
    (h) => [
      { text: h.item.label, weight: 3 },
      { text: h.item.keywords ?? '', weight: 1.6 },
      { text: h.library, weight: 1 },
      { text: h.item.kind.replace(/[.]/g, ' '), weight: 0.8 },
    ],
  );
  return shapeIndex.search(query, limit).map((r) => r.item);
}

const PROVIDER_NAMES: Record<string, string> = {
  aws: 'aws amazon web services',
  azure: 'azure microsoft',
  gcp: 'gcp google cloud',
  oci: 'oci oracle cloud',
  alibaba: 'alibaba aliyun',
  ibm: 'ibm cloud',
  kubernetes: 'kubernetes k8s',
  logos: 'logo brand tech',
};

let iconIndex: { key: string; index: SearchIndex<{ provider: string; icon: IconEntry }> } | null = null;

export function searchIconPacks(packs: IconPack[], query: string, limit = 240): Array<{ provider: string; icon: IconEntry }> {
  const key = packs.map((p) => `${p.provider}:${p.icons.length}`).join('|');
  if (!iconIndex || iconIndex.key !== key) {
    iconIndex = {
      key,
      index: new SearchIndex(
        packs.flatMap((p) => p.icons.map((icon) => ({ provider: p.provider, icon }))),
        ({ provider, icon }) => [
          { text: icon.name, weight: 3 },
          { text: icon.keywords.join(' '), weight: 1.5 },
          { text: icon.category, weight: 1 },
          { text: PROVIDER_NAMES[provider] ?? provider, weight: 1.2 },
        ],
      ),
    };
  }
  // On near-ties, the vendor's official icon beats a brand logo of the same service.
  return iconIndex.index
    .search(query, limit)
    .map((r) => ({ item: r.item, score: r.score - (r.item.provider === 'logos' ? 0.05 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
