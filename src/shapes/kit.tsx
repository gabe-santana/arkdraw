/**
 * Shape-drawing kit: paint helpers and reusable geometry for shape definitions.
 *
 * Library modules in ./libs import from here (never from the registry) so the
 * registry can auto-discover them without import cycles.
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { TextLines } from './TextLines';
import type { ShapeRenderContext } from './types';

// ---------------------------------------------------------------------------
// Paint helpers
// ---------------------------------------------------------------------------

export function strokeAttrs(s: ElementStyle) {
  const none = s.stroke === 'none' || s.strokeWidth <= 0;
  return {
    stroke: none ? 'none' : s.stroke,
    strokeWidth: none ? 0 : s.strokeWidth,
    strokeOpacity: s.strokeOpacity,
    strokeDasharray: s.dashPattern
      ? s.dashPattern
      : s.strokeStyle === 'dashed'
        ? `${s.strokeWidth * 4} ${s.strokeWidth * 3}`
        : s.strokeStyle === 'dotted'
          ? `0 ${s.strokeWidth * 2.5}`
          : undefined,
    strokeLinecap: s.strokeStyle === 'dotted' ? ('round' as const) : ('butt' as const),
    strokeLinejoin: 'round' as const,
  };
}

export const fillOf = (s: ElementStyle) => (s.fill === 'none' ? 'none' : s.fill);

/** A closed, filled & stroked path. */
export const Body = ({ d, s }: { d: string; s: ElementStyle }) => <path d={d} fill={fillOf(s)} fillOpacity={s.fillOpacity} {...strokeAttrs(s)} />;
/** An unfilled detail line. */
export const Detail = ({ d, s }: { d: string; s: ElementStyle }) => <path d={d} fill="none" {...strokeAttrs(s)} />;

export const rr = (w: number, h: number, r: number) => Math.max(0, Math.min(r, w / 2, h / 2));
export const inset = (w: number, h: number, dx: number, dy = dx): Rect => ({ x: dx, y: dy, w: Math.max(1, w - dx * 2), h: Math.max(1, h - dy * 2) });

export function RoundRect({ w, h, s, r = s.radius, x = 0, y = 0 }: { w: number; h: number; s: ElementStyle; r?: number; x?: number; y?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rr(w, h, r)} fill={fillOf(s)} fillOpacity={s.fillOpacity} {...strokeAttrs(s)} />;
}

/** Path for a rect with only the top corners rounded (headers). */
export const topRounded = (w: number, h: number, r: number) =>
  `M0,${h} V${r} Q0,0 ${r},0 H${w - r} Q${w},0 ${w},${r} V${h} Z`;

// ---------------------------------------------------------------------------
// Compartment shapes (UML class, ERD entity)
// ---------------------------------------------------------------------------

/** Splits text on separator lines (`--`) into sections of lines. */
export function splitSections(text: string): string[][] {
  const sections: string[][] = [[]];
  for (const line of text.split('\n')) {
    if (/^\s*-{2,}\s*$/.test(line)) sections.push([]);
    else sections[sections.length - 1].push(line);
  }
  return sections;
}

export const PAD = 8;

export function compartmentLayout(w: number, style: ElementStyle, text: string) {
  const lh = lineHeight(style.fontSize);
  const sections = splitSections(text);
  const header = sections[0].flatMap((l) => wrapText(l, w - PAD * 2, { ...style, bold: true }));
  const headerH = Math.max(lh * Math.max(header.length, 1) + PAD * 2, 34);
  const body = sections.slice(1).map((sec) => sec.flatMap((l) => wrapText(l, w - PAD * 2 - 4, style)));
  const heights = body.map((lines) => lines.length * lh + PAD * 2);
  return { lh, header, headerH, body, heights, total: headerH + heights.reduce((a, b) => a + b, 0) };
}

export function Compartments({ w, h, style, text }: ShapeRenderContext) {
  const L = compartmentLayout(w, style, text);
  const r = rr(w, h, style.radius);
  let y = L.headerH;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      {style.stroke !== 'none' && (
        <path d={topRounded(w, L.headerH, r)} fill={style.stroke} fillOpacity={0.08} stroke="none" />
      )}
      <TextLines lines={L.header} x={w / 2} y={PAD} anchor="middle" style={style} bold />
      {L.body.map((lines, i) => {
        const top = y;
        y += L.heights[i];
        return (
          <g key={i}>
            <Detail d={`M0,${top} H${w}`} s={{ ...style, strokeStyle: 'solid' }} />
            <TextLines lines={lines} x={PAD + 2} y={top + PAD} anchor="start" style={style} />
          </g>
        );
      })}
    </>
  );
}

/** Minimum height a compartment shape needs for its text. */
export const compartmentHeight = (w: number, style: ElementStyle, text: string) =>
  compartmentLayout(w, style, text).total;

// ---------------------------------------------------------------------------
// C4 model text: **Name** / [Type: Technology] / description
// ---------------------------------------------------------------------------

export function c4Layout(text: string, width: number, style: ElementStyle) {
  const [name = '', ...rest] = text.split('\n');
  let typeLine = '';
  if (rest[0]?.trim().startsWith('[')) typeLine = rest.shift()!;
  const desc = rest.join('\n').replace(/^\n+/, '');
  const nameStyle = { ...style, fontSize: style.fontSize + 2, bold: true };
  const typeStyle = { ...style, fontSize: Math.max(9, style.fontSize - 2), bold: false };
  const descStyle = { ...style, fontSize: Math.max(10, style.fontSize - 1), bold: false };
  const blocks = [
    { lines: wrapText(name, width, nameStyle), style: nameStyle, gap: 2 },
    ...(typeLine ? [{ lines: wrapText(typeLine, width, typeStyle), style: typeStyle, gap: desc ? 10 : 0 }] : []),
    ...(desc ? [{ lines: wrapText(desc, width, descStyle), style: descStyle, gap: 0 }] : []),
  ];
  const height = blocks.reduce((acc, b) => acc + b.lines.length * lineHeight(b.style.fontSize) + b.gap, 0);
  return { blocks, height };
}

export function C4Text({ box, text, style }: { box: Rect; text: string; style: ElementStyle }) {
  const { blocks, height } = c4Layout(text, box.w, style);
  let y =
    style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - height : box.y + (box.h - height) / 2;
  const [x, anchor] =
    style.textAlign === 'left'
      ? [box.x, 'start' as const]
      : style.textAlign === 'right'
        ? [box.x + box.w, 'end' as const]
        : [box.x + box.w / 2, 'middle' as const];
  return (
    <>
      {blocks.map((b, i) => {
        const top = y;
        y += b.lines.length * lineHeight(b.style.fontSize) + b.gap;
        return <TextLines key={i} lines={b.lines} x={x} y={top} anchor={anchor} style={b.style} />;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Network icon tiles (lucide glyphs)
// ---------------------------------------------------------------------------

export function iconTile(Icon: ComponentType<LucideProps>) {
  return function IconTile({ w, h, style }: ShapeRenderContext) {
    const size = Math.min(w, h) * 0.56;
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, w * 0.25, h * 0.25)} />
        <Icon
          x={(w - size) / 2}
          y={(h - size) / 2}
          size={size}
          color={style.stroke === 'none' ? style.textColor : style.stroke}
          strokeWidth={1.75}
          absoluteStrokeWidth
        />
      </>
    );
  };
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const cloudPath = (w: number, h: number) =>
  `M${0.25 * w},${0.25 * h} C${0.05 * w},${0.25 * h} 0,${0.5 * h} ${0.16 * w},${0.55 * h} ` +
  `C0,${0.66 * h} ${0.18 * w},${0.9 * h} ${0.31 * w},${0.8 * h} ` +
  `C${0.4 * w},${h} ${0.7 * w},${h} ${0.8 * w},${0.8 * h} ` +
  `C${w},${0.8 * h} ${w},${0.6 * h} ${0.875 * w},${0.5 * h} ` +
  `C${w},${0.3 * h} ${0.8 * w},${0.1 * h} ${0.625 * w},${0.2 * h} ` +
  `C${0.5 * w},${0.05 * h} ${0.3 * w},${0.05 * h} ${0.25 * w},${0.25 * h} Z`;

/** Cap radius of a cylinder: the `size` param in px (mxGraph cylinder3) when set, else proportional. */
export const cylRy = (w: number, h: number, size?: number | string) =>
  size === undefined || !Number.isFinite(Number(size)) ? Math.min(h * 0.15, w * 0.2, 16) : Math.max(0, Math.min(Number(size), h / 2));

/** Cap radius of a horizontal cylinder (see `cylRy`). */
export const hCylRx = (w: number, h: number, size?: number | string) =>
  size === undefined || !Number.isFinite(Number(size)) ? Math.min(w * 0.12, h * 0.2, 16) : Math.max(0, Math.min(Number(size), w / 2));

export function Cylinder({ w, h, style, params }: ShapeRenderContext) {
  const ry = cylRy(w, h, params?.size);
  return (
    <>
      <Body d={`M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry} V${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z`} s={style} />
      <Detail d={`M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`} s={style} />
    </>
  );
}

export function HorizontalCylinder({ w, h, style, params }: ShapeRenderContext) {
  const rx = hCylRx(w, h, params?.size);
  return (
    <>
      <Body d={`M${rx},0 H${w - rx} A${rx},${h / 2} 0 0 1 ${w - rx},${h} H${rx} A${rx},${h / 2} 0 0 1 ${rx},0 Z`} s={style} />
      <Detail d={`M${w - rx},0 A${rx},${h / 2} 0 0 0 ${w - rx},${h}`} s={style} />
    </>
  );
}

