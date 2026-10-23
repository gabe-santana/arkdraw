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
  /** Parametric geometry values (see `ShapeDef.params`), defaults filled in. */
  params?: ParamValues;
  /** mxGraph stencil XML for `kind: 'stencil'`. */
  stencil?: string;
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
  textBox?: (w: number, h: number, params?: ParamValues) => Rect;
  textPlacement?: TextPlacement;
  /** Outline used for straight connectors that attach "auto". */
  perimeter?: 'rect' | 'ellipse' | 'diamond';
  /** Connection points as fractions of the box (defaults derive from `perimeter`). */
  connectionPoints?: Array<{ x: number; y: number }>;
  /** Whether the corner radius control applies. */
  rounded?: boolean;
  /** Containers carry the shapes dropped inside them. */
  container?: boolean;
  /** Grows to fit its text after editing. */
  autoGrow?: boolean;
  /** Clickable everywhere in its bounds (for line-art / icon shapes). */
  boxHit?: boolean;
  /** Base used by the .drawio exporter (and to map imports back). */
  drawio: string;
  /** Adjustable geometry parameters (mxGraph "yellow diamond" values), stored in `el.params`. */
  params?: ShapeParam[];
  /** On-canvas parameter handles, in local (unrotated, unflipped) coordinates. */
  handles?: (g: HandleGeometry) => ParamHandle[];
}

// ---------------------------------------------------------------------------
// Parametric geometry
// ---------------------------------------------------------------------------

/** Stored parameter values: numbers (px, fractions, 0/1 toggles) or strings (enums, colors). */
export type ParamValues = Record<string, number | string>;

export interface ShapeParam {
  /** Key in `el.params`. */
  key: string;
  label: string;
  /**
   * number: px · percent: fraction 0..1 shown as % · enum: one of `options` ·
   * boolean: 0/1 · color: CSS color or `none` (absent = automatic).
   */
  kind: 'number' | 'percent' | 'enum' | 'boolean' | 'color';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  /** key (defaults to `key`); `false` = not exported. */
  drawio?: string | false;
  /** mxGraph's own default, assumed on import when the key is absent (defaults to `default`). */
  drawioDefault?: number | string;
  /** Value is in px when mxGraph's `fixedSize=1`, otherwise a fraction of this dimension. */
  fixedSizeOf?: 'w' | 'h';
  /**
   * Enum that switches the shape kind instead of storing a value (option
   * value → kind), e.g. a pool's horizontal / vertical orientation.
   */
  kindOptions?: Record<string, string>;
}

/** Inputs for computing handle positions. */
export interface HandleGeometry {
  w: number;
  h: number;
  /** Resolved parameter values. */
  p: ParamValues;
  style: ElementStyle;
  /** World units per screen pixel (1 / zoom), to keep handles apart at any zoom. */
  px: number;
}

/** What a handle drag changes. */
export interface ParamPatch {
  params?: ParamValues;
  style?: Partial<ElementStyle>;
}

export interface ParamHandle {
  x: number;
  y: number;
  /** Maps the dragged local point to a patch (clamping is done by the caller via `ShapeParam` min/max). */
  drag: (pt: Vec) => ParamPatch;
  /** Param key whose value is shown in the drag tooltip (defaults to the first patched key). */
  show?: string;
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
