import type { ElementStyle, Rect } from '@/model/types';
import { FONT_STACKS } from '@/model/defaults';
import { baselineOffset, lineHeight, measureText, wrapText } from '@/lib/text';
import { needsRich, RichTextBlock } from './RichText';

interface TextLinesProps {
  lines: string[];
  /** Anchor x (meaning depends on `anchor`). */
  x: number;
  /** Top of the first line box. */
  y: number;
  anchor: 'start' | 'middle' | 'end';
  style: ElementStyle;
  bold?: boolean;
}

/** Renders pre-wrapped lines as SVG text. Shared by the canvas and all exporters. */
export function TextLines({ lines, x, y, anchor, style, bold }: TextLinesProps) {
  const lh = lineHeight(style.fontSize);
  const base = baselineOffset(style.fontSize);
  const deco = [style.underline && 'underline', style.strike && 'line-through'].filter(Boolean).join(' ') || undefined;
  return (
    <text
      fontFamily={FONT_STACKS[style.fontFamily]}
      fontSize={style.fontSize}
      fontWeight={(bold ?? style.bold) ? 700 : 400}
      fontStyle={style.italic ? 'italic' : undefined}
      fill={style.textColor}
      fillOpacity={style.textOpacity}
      textAnchor={anchor}
      textDecoration={deco}
      xmlSpace="preserve"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={y + i * lh + base}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** Wraps `text` into `box` and aligns it per the element style. */
export function TextBlock({ box, text, style, wrap = true }: { box: Rect; text: string; style: ElementStyle; wrap?: boolean }) {
  if (!text) return null;
  if (needsRich(text, style)) return <RichTextBlock box={box} text={text} style={style} math={!!style.math} wrap={wrap} />;
  const lines = wrap ? wrapText(text, box.w, style) : text.split('\n');
  const lh = lineHeight(style.fontSize);
  const total = lines.length * lh;
  const y =
    style.verticalAlign === 'top'
      ? box.y
      : style.verticalAlign === 'bottom'
        ? box.y + box.h - total
        : box.y + (box.h - total) / 2;
  const [x, anchor] =
    style.textAlign === 'left'
      ? [box.x, 'start' as const]
      : style.textAlign === 'right'
        ? [box.x + box.w, 'end' as const]
        : [box.x + box.w / 2, 'middle' as const];
  let bg = null;
  if (style.labelBackground && style.labelBackground !== 'none') {
    const w = Math.max(...lines.map((l) => measureText(l, style)));
    const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    bg = <rect x={left - 4} y={y - 2} width={w + 8} height={total + 4} rx={3} fill={style.labelBackground} />;
  }
  return (
    <>
      {bg}
      <TextLines lines={lines} x={x} y={y} anchor={anchor} style={style} />
    </>
  );
}
