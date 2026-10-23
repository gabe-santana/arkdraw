/** Writing direction of labels (draw.io textDirection: ltr / rtl / auto). */
import type { ElementStyle } from '@/model/types';

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const STRONG = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿיִ-﷿ﹰ-﻿぀-ヿ一-鿿]/;

/** First strong character decides (Unicode bidi "auto"). */
export function detectRtl(text: string): boolean {
  const m = STRONG.exec(text);
  return !!m && RTL_CHAR.test(m[0]);
}

/** True when the label should be laid out right-to-left. */
export function isRtl(style: Pick<ElementStyle, 'textDirection'>, text: string): boolean {
  const d = style.textDirection;
  return d === 'rtl' || (d === 'auto' && detectRtl(text));
}

/** In RTL text, SVG `start` / `end` anchors swap sides; flip them so alignment stays visual. */
export const flipAnchor = (a: 'start' | 'middle' | 'end'): 'start' | 'middle' | 'end' => (a === 'start' ? 'end' : a === 'end' ? 'start' : a);
