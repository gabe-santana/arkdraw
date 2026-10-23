import { memo } from 'react';
import type { ShapeElement } from '@/model/types';
import { DEFAULT_STYLE } from '@/model/defaults';
import { ShapeBody } from '@/canvas/ElementBodies';
import type { LibraryItem } from '@/shapes/types';

/** Library thumbnail: the real renderer, scaled into a square. */
export const ShapePreview = memo(function ShapePreview({ item, size = 40 }: { item: LibraryItem; size?: number }) {
  const el: ShapeElement = {
    id: 'preview',
    type: 'shape',
    kind: item.kind,
    x: 0,
    y: 0,
    w: item.w,
    h: item.h,
    // Text is unreadable at thumbnail size, except where it *is* the shape.
    text: item.kind === 'text' ? 'Aa' : '',
    style: { ...DEFAULT_STYLE, ...item.style, ...(item.kind === 'text' ? { fontSize: item.h * 0.95, bold: true } : {}) },
    groupIds: [],
  };
  // Big items (pools, frames) shrink a lot; keep their strokes visible.
  const shrink = Math.max(item.w, item.h) / size;
  if (shrink > 3 && el.style.strokeWidth > 0) el.style = { ...el.style, strokeWidth: el.style.strokeWidth * Math.min(shrink / 2.5, 8) };
  const sw = el.style.strokeWidth;
  const pad = sw + 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${item.w + pad * 2} ${item.h + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <ShapeBody el={el} />
    </svg>
  );
});
