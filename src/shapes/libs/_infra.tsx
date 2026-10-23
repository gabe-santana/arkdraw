/**
 * Drawing helpers for the infrastructure-style libraries (Citrix-style VDI,
 * Veeam-style backup, OpenStack): glyph tiles with an optional corner badge,
 * two-level "name / caption" text and a few custom glyphs lucide doesn't have.
 *
 * Auto-discovered like any lib module, but exports no `shapes` / `libraries`.
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { RoundRect } from '../kit';
import { TextLines } from '../TextLines';
import type { ShapeRenderContext } from '../types';
import { f, ink } from './_kit2';

// ---------------------------------------------------------------------------
// Glyphs
// ---------------------------------------------------------------------------

/** A custom glyph drawn in lucide's 24×24 grid (stroke-only, round joins). */
export interface CustomGlyph {
  paths: string[];
  /** Paths filled with the glyph colour instead of stroked. */
  solid?: string[];
}

export type Art = ComponentType<LucideProps> | CustomGlyph;

const isCustom = (a: Art): a is CustomGlyph => typeof a === 'object' && a !== null && 'paths' in a;

/** Draws a lucide icon or a custom glyph centred at (cx, cy). */
export function ArtGlyph({ art, cx, cy, size, color, sw = 1.75 }: { art: Art; cx: number; cy: number; size: number; color: string; sw?: number }) {
  if (!(size > 0)) return null;
  if (!isCustom(art)) {
    const Icon = art;
    return <Icon x={f(cx - size / 2)} y={f(cy - size / 2)} size={f(size)} color={color} strokeWidth={sw} absoluteStrokeWidth />;
  }
  const k = size / 24;
  return (
    <g transform={`translate(${f(cx - size / 2)} ${f(cy - size / 2)}) scale(${f(k * 1000) / 1000})`}>
      {art.paths.map((d, i) => (
        <path key={`p${i}`} d={d} fill="none" stroke={color} strokeWidth={sw / k} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {art.solid?.map((d, i) => <path key={`s${i}`} d={d} fill={color} stroke="none" />)}
    </g>
  );
}

/** Tape library: a cabinet with cartridge slots and a robot rail. */
export const TAPE_LIBRARY: CustomGlyph = {
  paths: [
    'M5 2.5h14a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z',
    'M6.5 6h4.5v3H6.5z',
    'M13 6h4.5v3H13z',
    'M6.5 11.5h4.5v3H6.5z',
    'M13 11.5h4.5v3H13z',
    'M6.5 18h11',
  ],
};

/** Object-storage bucket. */
export const BUCKET: CustomGlyph = {
  paths: ['M4 6.5c0-1.5 3.6-2.7 8-2.7s8 1.2 8 2.7-3.6 2.7-8 2.7-8-1.2-8-2.7z', 'M4 6.5 6.2 19c.4 1.3 2.9 2.2 5.8 2.2s5.4-.9 5.8-2.2L20 6.5'],
};

/** Thin client: small box + monitor. */
export const THIN_CLIENT: CustomGlyph = {
  paths: [
    'M3 4.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z',
    'M9 14.5v3.5M5.5 19.5h7',
    'M18.5 6h3v13.5h-3z',
    'M20 9h0.01',
  ],
};

/** Snapshot / restore point: a disk with a clock hand. */
export const RESTORE_POINT: CustomGlyph = {
  paths: ['M12 3a9 9 0 1 1-8.5 6', 'M3 3.5v5.5h5.5', 'M12 7.5V12l3 2'],
};

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** True for dark colours (#rgb / #rrggbb); named colours and `none` count as light. */
export function isDark(color: string | undefined): boolean {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color ?? '');
  if (!m) return false;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

/** Glyph colour that stays readable: white on dark fills, the stroke otherwise. */
export const glyphInk = (s: ElementStyle) => (s.fill !== 'none' && isDark(s.fill) ? '#ffffff' : ink(s));

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

export interface TileOpts {
  /** Small secondary glyph in a disc at the bottom-right corner. */
  badge?: Art;
  /** Badge disc colour (defaults to the stroke). */
  badgeColor?: string;
  /** Glyph size relative to the tile's short side. */
  scale?: number;
  /** Draw a circle instead of a rounded square. */
  round?: boolean;
}

/** Rounded tile with a centred glyph and an optional corner badge (label goes below). */
export function glyphTile(art: Art, opts: TileOpts = {}) {
  return function GlyphTile({ w, h, style }: ShapeRenderContext) {
    const m = Math.min(w, h);
    const size = m * (opts.scale ?? 0.56);
    const color = glyphInk(style);
    const shift = opts.badge ? m * 0.04 : 0;
    const br = m * 0.17;
    const bx = w - br * 1.05;
    const by = h - br * 1.05;
    return (
      <>
        {opts.round ? (
          <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={style.fill === 'none' ? 'none' : style.fill} fillOpacity={style.fillOpacity} stroke={style.stroke === 'none' ? 'none' : style.stroke} strokeWidth={style.stroke === 'none' ? 0 : style.strokeWidth} />
        ) : (
          <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, w * 0.25, h * 0.25)} />
        )}
        <ArtGlyph art={art} cx={w / 2 - shift} cy={h / 2 - shift} size={size} color={color} />
        {opts.badge && br > 1 && (
          <>
            <circle cx={f(bx)} cy={f(by)} r={f(br)} fill={opts.badgeColor ?? ink(style)} stroke="#ffffff" strokeWidth={Math.max(0.75, Math.min(1.5, br * 0.14))} />
            <ArtGlyph art={opts.badge} cx={bx} cy={by} size={br * 1.15} color="#ffffff" sw={1.5} />
          </>
        )}
      </>
    );
  };
}

// ---------------------------------------------------------------------------
// Two-level text: first line = name (bold), the rest = caption (smaller, muted)
// ---------------------------------------------------------------------------

export function NameCaption({ box, text, style, align = 'middle' }: { box: Rect; text: string; style: ElementStyle; align?: 'start' | 'middle' }) {
  const [name = '', ...rest] = text.split('\n');
  const caption = rest.join(' ').trim();
  const nameStyle: ElementStyle = { ...style, fontSize: style.fontSize + 1, bold: true };
  const capStyle: ElementStyle = { ...style, fontSize: Math.max(8, style.fontSize - 2), bold: false };
  const width = Math.max(1, box.w);
  const nameLines = name ? wrapText(name, width, nameStyle) : [];
  const capLines = caption ? wrapText(caption, width, capStyle) : [];
  const nh = nameLines.length * lineHeight(nameStyle.fontSize);
  const ch = capLines.length * lineHeight(capStyle.fontSize);
  const gap = nameLines.length && capLines.length ? 1 : 0;
  const total = nh + gap + ch;
  const top =
    style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const x = align === 'start' ? box.x : box.x + box.w / 2;
  return (
    <>
      {nameLines.length > 0 && <TextLines lines={nameLines} x={x} y={top} anchor={align} style={nameStyle} />}
      {capLines.length > 0 && (
        <g opacity={0.72}>
          <TextLines lines={capLines} x={x} y={top + nh + gap} anchor={align} style={capStyle} />
        </g>
      )}
    </>
  );
}

/** Header height of a boundary frame. */
export const boundaryHead = (h: number) => Math.min(26, Math.max(0, h * 0.25));

/** Group / boundary frame: rounded outline with an optional glyph in the header (text goes in `boundaryText`). */
export function Boundary({ w, h, style, glyph: icon }: ShapeRenderContext & { glyph?: Art }) {
  const head = boundaryHead(h);
  const g = Math.min(head * 0.62, 16);
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, w / 2, h / 2)} />
      {icon && g > 2 && <ArtGlyph art={icon} cx={10 + g / 2} cy={head / 2 + 2} size={g} color={ink(style)} />}
    </>
  );
}

/** Text box for `Boundary`: the header strip, right of the glyph. */
export function boundaryText(icon: boolean) {
  return (w: number, h: number): Rect => {
    const head = boundaryHead(h);
    const x = icon ? 16 + Math.min(head * 0.62, 16) : 10;
    return { x, y: 2, w: Math.max(1, w - x - 8), h: Math.max(1, head) };
  };
}
