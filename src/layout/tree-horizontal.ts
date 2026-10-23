import { makeRun } from './engine';
import { buildForest, tidyTree } from './tree-core';
import type { LayoutAlgorithm } from './types';

export const layout: LayoutAlgorithm = {
  id: 'tree-horizontal',
  label: 'Horizontal Tree',
  description: 'Tidy tree growing to the right from the root(s); multiple roots stacked.',
  run: makeRun((g, o) => tidyTree(buildForest(g, 'y'), new Map(g.nodes.map((n) => [n.id, n])), true, o.nodeSpacing, o.levelSpacing)),
};