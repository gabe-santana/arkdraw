import { makeRun } from './engine';
import { flowPlace } from './flow-core';
import type { LayoutAlgorithm } from './types';

export const layout: LayoutAlgorithm = {
  id: 'flow-horizontal',
  label: 'Horizontal Flow',
  description: 'Layered left-to-right layout following connector direction (handles cycles).',
  run: makeRun((g, o) => flowPlace(g, o, 'LR')),
};