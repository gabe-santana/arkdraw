/**
 * Where a shape's label box sits: inside (honouring the shape's text box) or
 * outside on one of the 8 compass positions (draw.io labelPosition ×
 * verticalLabelPosition), padded by the global and per-side spacing.
 * Shared by the renderer (ElementBodies) and the in-place editor.
 */
import type { ElementStyle, LabelPosition, Rect, ShapeElement } from '@/model/types';
import { getShapeDef, textBoxOf } from '@/shapes/registry';

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
