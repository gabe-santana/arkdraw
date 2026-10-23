import type { LayoutAlgorithm } from './types';

const MODULES = import.meta.glob<{ layout?: LayoutAlgorithm }>(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true });

/** All layout algorithms, discovered from src/layout/*.ts. */
export const LAYOUTS: LayoutAlgorithm[] = Object.keys(MODULES)
  .sort()
  .map((k) => MODULES[k].layout)
  .filter((l): l is LayoutAlgorithm => !!l);

export type { LayoutAlgorithm, LayoutOptions } from './types';
