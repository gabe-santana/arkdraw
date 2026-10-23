/**
 * Layout plugin contract. Each module in src/layout/*.ts (other than this file
 * and index.ts) exports `layout: LayoutAlgorithm`; they're discovered
 * automatically and listed in Arrange → Layout.
 */
import type { Doc, ShapeElement } from '@/model/types';

export interface LayoutOptions {
  /** Spacing between sibling nodes (px). */
  nodeSpacing: number;
  /** Spacing between ranks/levels (px). */
  levelSpacing: number;
}

export interface LayoutAlgorithm {
  id: string;
  label: string;
  description: string;
  /**
   * Computes new positions. `ids` = selection (empty = whole page). Must not
   * mutate `doc`; return position/size patches for shapes only — connectors
   * re-route by themselves.
   */
  run: (doc: Doc, ids: string[], options: LayoutOptions) => Record<string, Partial<Pick<ShapeElement, 'x' | 'y' | 'w' | 'h'>>>;
}
