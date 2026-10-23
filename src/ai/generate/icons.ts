/**
 * Vendor icon search over the local icon-pack manifests:
 *   /icons/providers.json        → [{ id, name, count, categories }]
 *   /icons/<provider>/index.json → { provider, name, icons: [{ id, name, category, file, keywords }] }
 * A shape's `icon` is `<provider>/<file>`. Missing manifests degrade to "no icons".
 */
import { searchIconPacks } from '@/search/indexes';
import type { IconEntry as PackIcon } from '@/icons/iconPacks';

export interface IconProviderInfo {
  id: string;
  name: string;
  count?: number;
  categories?: string[];
}

export interface IconEntry {
  id: string;
  name: string;
  category?: string;
  file: string;
  keywords?: string[];
}

export interface IconHit {
  /** Value for a node's `icon` field. */
  icon: string;
  name: string;
  provider: string;
  category?: string;
}

const base = () => {
  try {
    return (import.meta.env?.BASE_URL as string | undefined) ?? '/';
  } catch {
    return '/';
  }
};

let providersPromise: Promise<IconProviderInfo[]> | null = null;
const indexPromises = new Map<string, Promise<IconEntry[]>>();

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${base()}icons/${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function loadIconProviders(): Promise<IconProviderInfo[]> {
  providersPromise ??= fetchJson<IconProviderInfo[]>('providers.json').then((list) =>
    Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string') : [],
  );
  return providersPromise;
}

export function loadIconIndex(provider: string): Promise<IconEntry[]> {
  let p = indexPromises.get(provider);
  if (!p) {
    p = fetchJson<{ icons?: IconEntry[] }>(`${provider}/index.json`).then((idx) =>
      Array.isArray(idx?.icons) ? idx.icons.filter((i) => i && typeof i.file === 'string') : [],
    );
    indexPromises.set(provider, p);
  }
  return p;
}

/** Clears the manifest cache (tests, or after packs are installed). */
export function resetIconCache() {
  providersPromise = null;
  indexPromises.clear();
}

/**
 * Ranks icons for a free-text query, optionally within one provider. Uses the
 * app's smart search (typos, acronyms like "vnet"/"k8s", cross-cloud synonyms).
 */
export async function searchIcons(query: string, provider?: string, limit = 8): Promise<IconHit[]> {
  if (!query.trim()) return [];
  const providers = await loadIconProviders();
  const wanted = provider?.toLowerCase().trim();
  const targets = wanted ? providers.filter((p) => p.id.toLowerCase() === wanted) : providers;
  const packs = await Promise.all(
    targets.map(async (p) => ({ provider: p.id, name: p.name ?? p.id, version: '', source: '', license: '', icons: (await loadIconIndex(p.id)) as unknown as PackIcon[] })),
  );
  return searchIconPacks(packs, query, limit).map(({ provider: pid, icon }) => ({
    icon: `${pid}/${icon.file}`,
    name: icon.name,
    provider: pid,
    category: icon.category,
  }));
}

/**
 * The subset of `paths` that exist in the installed packs (only the packs
 * those paths reference are loaded). `undefined` when no manifests are
 * installed, meaning "can't verify".
 */
export async function knownIconPaths(paths: string[]): Promise<Set<string> | undefined> {
  const providers = await loadIconProviders();
  if (!providers.length) return undefined;
  const ids = new Set(providers.map((p) => p.id));
  const wanted = new Set(paths.map((p) => p.split('/')[0]).filter((p) => ids.has(p)));
  const set = new Set<string>();
  for (const p of wanted) for (const e of await loadIconIndex(p)) set.add(`${p}/${e.file}`);
  return set;
}
