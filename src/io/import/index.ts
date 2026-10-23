import type { Importer } from './types';

const MODULES = import.meta.glob<{ importer?: Importer }>(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true });

/** All importers, discovered from src/io/import/*.ts. */
export const IMPORTERS: Importer[] = Object.keys(MODULES)
  .sort()
  .map((k) => MODULES[k].importer)
  .filter((i): i is Importer => !!i);

export function importerFor(fileName: string): Importer | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMPORTERS.find((i) => i.extensions.includes(ext));
}

export type { Importer, ImportResult, ImportedPage } from './types';
