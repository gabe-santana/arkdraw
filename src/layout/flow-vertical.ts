import { makeRun } from './engine';
import { flowPlace } from './flow-core';
import type { LayoutAlgorithm } from './types';

export const layout: LayoutAlgorithm = {
  id: 'flow-vertical',
  label: 'Vertical Flow',
  description: 'Layered top-to-bottom layout following connector direction (handles cycles).',
  run: makeRun((g, o) => flowPlace(g, o, 'TB')),
};