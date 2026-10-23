/**
 * Glyph tiles with an optional corner badge, shared by the Office, Active
 * Directory and Threat Modeling libraries: a rounded tile carrying a lucide
 * pictogram, plus a small solid disc with a second glyph (e.g. user + shield
 * = admin). Exports no `shapes` / `libraries`, so it contributes nothing alone.
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { RoundRect } from '../kit';
import type { ShapeDef, ShapeRenderContext } from '../types';
import { Glyph, f, ink, paper, shape } from './_kit2';

type Icon = ComponentType<LucideProps>;

/** Rounded tile with a centred glyph and an optional badge glyph at the bottom-right. */
export function glyphTile(Icon: Icon, Badge?: Icon, badgeColor?: string) {
  return function GlyphTile({ w, h, style }: ShapeRenderContext) {
    const m = Math.min(w, h);
    const r = Math.min(style.radius, w * 0.25, h * 0.25);
    const size = m * (Badge ? 0.5 : 0.56);
    const cx = w / 2 - (Badge ? m * 0.04 : 0);
    const cy = h / 2 - (Badge ? m * 0.04 : 0);
    const br = m * 0.16;
    const bx = Math.min(w - br - m * 0.06, cx + size * 0.46);
    const by = Math.min(h - br - m * 0.06, cy + size * 0.42);
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={r} />
        <Glyph Icon={Icon} cx={cx} cy={cy} size={size} s={style} />
        {Badge && br > 1 && (
          <>
            <circle cx={f(bx)} cy={f(by)} r={f(br)} fill={badgeColor ?? ink(style)} stroke={paper(style)} strokeWidth={f(Math.max(1, m * 0.035))} />
            <Glyph Icon={Badge} cx={bx} cy={by} size={br * 1.25} s={style} color="#ffffff" sw={1.5} />
          </>
        )}
      </>
    );
  };
}

/** Shape definition for a glyph tile (label below, rounded tile). */
export const tileShape = (kind: string, label: string, drawio: string, Icon: Icon, Badge?: Icon, badgeColor?: string): ShapeDef =>
  shape(kind, label, `${drawio}verticalLabelPosition=bottom;verticalAlign=top;html=1;`, glyphTile(Icon, Badge, badgeColor), {
    rounded: true,
    textPlacement: 'below',
  });
