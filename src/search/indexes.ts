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

export interface Scored<T> {
  item: T;
  score: number;
}

export function searchShapes(query: string, limit = 120): LibraryHit[] {
  return searchShapesScored(query, limit).map((r) => r.item);
}

export function searchShapesScored(query: string, limit = 120): Array<Scored<LibraryHit>> {
  shapeIndex ??= new SearchIndex(
    LIBRARIES.flatMap((lib) => lib.items.map((item) => ({ item, library: lib.name, libraryId: lib.id }))),
    (h) => [
      { text: h.item.label, weight: 3 },
      { text: h.item.keywords ?? '', weight: 1.6 },
      { text: h.library, weight: 1 },
      { text: h.item.kind.replace(/[.]/g, ' '), weight: 0.8 },
    ],
  );
  return shapeIndex.search(query, limit).map((r) => ({ item: r.item, score: r.score }));
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
  material: 'material google symbols ui icon',
  fontawesome: 'font awesome fa ui icon',
  fluent: 'fluent microsoft ui icon',
  'bootstrap-icons': 'bootstrap bi ui icon',
};

/** Generic UI glyph sets rank just below vendor icons and logos on near-ties. */
const GENERIC_UI_PACKS = new Set(['material', 'fontawesome', 'fluent', 'bootstrap-icons']);

let iconIndex: { key: string; index: SearchIndex<{ provider: string; icon: IconEntry }> } | null = null;

export function searchIconPacks(packs: IconPack[], query: string, limit = 240): Array<{ provider: string; icon: IconEntry }> {
  return searchIconPacksScored(packs, query, limit).map((r) => r.item);
}

export function searchIconPacksScored(packs: IconPack[], query: string, limit = 240): Array<Scored<{ provider: string; icon: IconEntry }>> {
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
    .map((r) => ({ item: r.item, score: r.score - (r.item.provider === 'logos' ? 0.05 : GENERIC_UI_PACKS.has(r.item.provider) ? 0.08 : 0) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Shapes and icons for one query, as the library panel lists them: the
 * stronger catalog first, and results far weaker than the best match on
 * either side dropped (a fuzzy circle for "lambda" when Lambda icons exist).
 */
export function searchLibrary(query: string, packs: IconPack[]) {
  const shapes = searchShapesScored(query, 96);
  const icons = packs.length ? searchIconPacksScored(packs, query, 240) : [];
  const top = Math.max(shapes[0]?.score ?? 0, icons[0]?.score ?? 0);
  const keep = <T,>(list: Array<Scored<T>>) => list.filter((r) => r.score >= top * 0.5).map((r) => r.item);
  return { shapes: keep(shapes), icons: keep(icons), iconsFirst: (icons[0]?.score ?? 0) > (shapes[0]?.score ?? 0) };
}
