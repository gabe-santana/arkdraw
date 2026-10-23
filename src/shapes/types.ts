import type { ReactNode } from 'react';
import type { ElementStyle, ImageCrop, Rect, TableData, Vec } from '@/model/types';

export interface ShapeRenderContext {
  w: number;
  h: number;
  style: ElementStyle;
  text: string;
  /** Icon pack path / image URL for `kind: 'icon' | 'image'`. */
  icon?: string;
  /** Freehand points normalized to 0..1. */
  points?: Vec[];
  table?: TableData;
  crop?: ImageCrop;
  collapsed?: boolean;
}

export type TextPlacement =
  /** Wrapped inside `textBox` (default). */
  | 'inside'
  /** Label centered below the shape (actors, icons). */
  | 'below'
  /** The shape draws its own text (UML class / ERD entity compartments). */
  | 'custom';

export interface ShapeDef {
  kind: string;
  label: string;
  /** Draws the geometry in local coordinates (0,0)-(w,h). */
  render: (ctx: ShapeRenderContext) => ReactNode;
  /** Where text goes, in local coordinates. Defaults to the bounds inset by 8px. */
  textBox?: (w: number, h: number) => Rect;
  textPlacement?: TextPlacement;
  /** Outline used for straight connectors that attach "auto". */
  perimeter?: 'rect' | 'ellipse' | 'diamond';
  /** Whether the corner radius control applies. */
  rounded?: boolean;
  /** Containers carry the shapes dropped inside them. */
  container?: boolean;
  /** Grows to fit its text after editing. */
  autoGrow?: boolean;
  /** Clickable everywhere in its bounds (for line-art / icon shapes). */
  boxHit?: boolean;
  /** Base draw.io style used by the .drawio exporter (and to map imports back). */
  drawio: string;
}

/** An entry in a shape library palette: a shape kind plus preset style/text. */
export interface LibraryItem {
  kind: string;
  label: string;
  w: number;
  h: number;
  style?: Partial<ElementStyle>;
  text?: string;
  keywords?: string;
}

export interface ShapeLibrary {
  id: string;
  name: string;
  items: LibraryItem[];
}
