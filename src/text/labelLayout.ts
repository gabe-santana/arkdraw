/**
 * Where a shape's label box sits: inside (honouring the shape's text box) or
 * outside on one of the 8 compass positions (mxGraph labelPosition ×
 * verticalLabelPosition), padded by the global and per-side spacing.
 * Shared by the renderer (ElementBodies) and the in-place editor.
 */
import type { ConnectorElement, ElementStyle, LabelPosition, Rect, ShapeElement } from '@/model/types';
import { getShapeDef, textBoxOf } from '@/shapes/registry';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { needsRich, richSize } from './RichTextBlock';

/** Positions in 3×3 grid order (row by row) — the Format panel picker. */
export const LABEL_GRID: LabelPosition[] = ['top-left', 'top', 'top-right', 'left', 'inside', 'right', 'bottom-left', 'bottom', 'bottom-right'];

export const LABEL_POSITION_NAMES: Record<LabelPosition, string> = {
  'top-left': 'Top left',
  top: 'Top',
  'top-right': 'Top right',
  left: 'Left',
  inside: 'Inside',
  right: 'Right',
  'bottom-left': 'Bottom left',
  bottom: 'Bottom',
  'bottom-right': 'Bottom right',
};

/** Padding per side: global `spacing` + per-side extras. */
export function labelPadding(st: Pick<ElementStyle, 'spacing' | 'spacingTop' | 'spacingRight' | 'spacingBottom' | 'spacingLeft'>) {
  const p = st.spacing ?? 0;
  return { top: p + (st.spacingTop ?? 0), right: p + (st.spacingRight ?? 0), bottom: p + (st.spacingBottom ?? 0), left: p + (st.spacingLeft ?? 0) };
}

const OUTSIDE_W = 200;
const GAP = 6;

/** Label box (world coordinates, unrotated shape) and the style to lay the text out with. */
export function shapeLabelBox(el: ShapeElement): { box: Rect; style: ElementStyle } | null {
  const def = getShapeDef(el.kind);
  const placement = def.textPlacement ?? 'inside';
  if (placement === 'custom') return null;
  const st = el.style;
  const pad = labelPadding(st);
  const pos: LabelPosition = st.labelPosition ?? (placement === 'below' ? 'bottom' : 'inside');
  const [v, h] = pos === 'inside' ? ['middle', 'center'] : pos.includes('-') ? pos.split('-') : pos === 'top' || pos === 'bottom' ? [pos, 'center'] : ['middle', pos];
  if (pos === 'inside') {
    const b = textBoxOf(def, el.w, el.h, el.params);
    return {
      box: { x: b.x + el.x + pad.left, y: b.y + el.y + pad.top, w: Math.max(1, b.w - pad.left - pad.right), h: Math.max(1, b.h - pad.top - pad.bottom) },
      style: st,
    };
  }
  // Horizontal: centered labels get a box wider than the shape; side labels a fixed-width column.
  let x: number;
  let w: number;
  let textAlign = st.textAlign;
  if (h === 'center') {
    x = el.x - 60 + pad.left - pad.right;
    w = el.w + 120;
    textAlign = 'center';
  } else if (h === 'left') {
    w = OUTSIDE_W;
    x = el.x - w - (v === 'middle' ? 8 : GAP) - pad.right;
    textAlign = 'right';
  } else {
    w = OUTSIDE_W;
    x = el.x + el.w + (v === 'middle' ? 8 : GAP) + pad.left;
    textAlign = 'left';
  }
  let y: number;
  let bh: number;
  let verticalAlign = st.verticalAlign;
  if (v === 'top') {
    y = el.y - GAP - pad.bottom;
    bh = 0;
    verticalAlign = 'bottom';
  } else if (v === 'bottom') {
    y = el.y + el.h + GAP + pad.top;
    bh = 0;
    verticalAlign = 'top';
  } else {
    y = el.y + pad.top;
    bh = Math.max(1, el.h - pad.top - pad.bottom);
  }
  return { box: { x, y, w, h: bh }, style: { ...st, textAlign, verticalAlign } };
}

/** Whether a shape's label sits outside it (icon captions, labels moved to a side). */
export function hasOutsideLabel(el: ShapeElement): boolean {
  const placement = getShapeDef(el.kind).textPlacement ?? 'inside';
  return placement !== 'custom' && (el.style.labelPosition ?? (placement === 'below' ? 'bottom' : 'inside')) !== 'inside';
}

/** Width and height `text` takes when laid out `maxWidth` wide, as TextBlock / RichTextBlock draw it. */
export function textSize(text: string, maxWidth: number, style: ElementStyle, wrap = true): { w: number; h: number } {
  if (needsRich(text, style)) return richSize(text, maxWidth, style, wrap);
  const lines = wrap ? wrapText(text, maxWidth, style) : text.split('\n');
  return { w: Math.max(0, ...lines.map((l) => measureText(l, style))), h: lines.length * lineHeight(style.fontSize) };
}

/**
 * Bounds of the text a shape's label actually draws (not its box): aligned in
 * the label box like TextBlock / RichTextBlock do, so unwrapped or too-long
 * text sticks out of the box. Unrotated shapes only; null when nothing shows.
 */
export function labelInkBox(el: ShapeElement): Rect | null {
  if (!el.text || el.hidden || el.rotation) return null;
  const layout = shapeLabelBox(el);
  if (!layout || layout.style.verticalText) return null;
  const { box, style } = layout;
  const { w, h } = textSize(el.text, box.w, style, style.wrap !== false);
  if (w <= 0 || h <= 0) return null;
  const x = style.textAlign === 'left' ? box.x : style.textAlign === 'right' ? box.x + box.w - w : box.x + (box.w - w) / 2;
  const y = style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - h : box.y + (box.h - h) / 2;
  return { x, y, w, h };
}

/** Connector labels wrap at this width. */
export const LABEL_MAX_WIDTH = 220;

/** Wrapped lines and size of a connector label. */
export function connectorLabelLayout(el: ConnectorElement, text = el.text) {
  if (needsRich(text, el.style)) {
    const r = richSize(text, LABEL_MAX_WIDTH, el.style);
    return { lines: [] as string[], w: Math.max(r.w, 4), h: r.h };
  }
  const lines = wrapText(text, LABEL_MAX_WIDTH, el.style);
  const w = Math.max(...lines.map((l) => measureText(l, el.style)), 4);
  const h = lines.length * lineHeight(el.style.fontSize);
  return { lines, w, h };
}

/** A connector label's background box (padded like ConnectorLabel draws it) centred on `at`. */
export function connectorLabelBox(el: ConnectorElement, at: { x: number; y: number }): Rect {
  const { w, h } = connectorLabelLayout(el);
  return { x: at.x - w / 2 - 6, y: at.y - h / 2 - 3, w: w + 12, h: h + 6 };
}
