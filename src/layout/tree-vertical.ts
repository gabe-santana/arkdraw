import { makeRun } from './engine';
import { buildForest, tidyTree } from './tree-core';
import type { LayoutAlgorithm } from './types';

export const layout: LayoutAlgorithm = {
  id: 'tree-vertical',
  label: 'Vertical Tree',
  description: 'Tidy tree growing downwards from the root(s); multiple roots side by side.',
  run: makeRun((g, o) => tidyTree(buildForest(g, 'x'), new Map(g.nodes.map((n) => [n.id, n])), false, o.nodeSpacing, o.levelSpacing)),
};