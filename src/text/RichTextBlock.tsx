/**
 * Formatted labels (mxGraph "Formatted Text"): Markdown subset + sanitized
 * inline HTML (see ./richFormat.ts), plus inline/display LaTeX math. Runs are
 * laid out explicitly (no text-anchor tricks) so mixed styles, sizes, images,
 * tables and formula boxes wrap and align correctly, and the result is plain
 * SVG — faithful in every export.
 */
import { Fragment, useSyncExternalStore } from 'react';
import type { ElementStyle, Rect } from '@/model/types';
import { lineHeight, measureText } from '@/lib/text';
import { mathSvg, splitMath, useMathVersion, type MathResult } from '@/lib/math';
import { fontStack } from './fonts';
import { isTableLine, parseInline, parseTable, splitLines, type InlineRun, type InlineStyle } from './richFormat';
import { isRtl } from './direction';

interface Run extends InlineRun {
  math?: MathResult;
  /** Raw TeX shown while MathJax loads. */
  tex?: string;
}

interface Placed extends Run {
  x: number;
  w: number;
}

interface TextLine {
  kind: 'text';
  runs: Placed[];
  width: number;
  height: number;
  ascent: number;
}

interface TableCellLayout {
  runs: Placed[];
  header: boolean;
}

interface TableLine {
  kind: 'table';
  width: number;
  height: number;
  cols: number[];
  rows: Array<{ h: number; ascent: number; cells: TableCellLayout[] }>;
  border: boolean;
}

export type RichLine = TextLine | TableLine;

const CELL_PAD_X = 6;
const CELL_PAD_Y = 3;

const effSize = (r: InlineStyle) => (r.script ? r.size * 0.7 : r.size);

const runFont = (r: InlineStyle, s: ElementStyle) => ({
  fontFamily: r.code ? ('mono' as const) : (r.font ?? s.fontFamily),
  fontSize: effSize(r),
  bold: r.bold,
  italic: r.italic,
});

function measureRun(r: Run, s: ElementStyle): number {
  if (r.math) return r.math.w;
  if (r.img) return r.img.w;
  return measureText(r.text, runFont(r, s)) + (r.code ? 6 : 0);
}

export const baseInline = (style: ElementStyle): InlineStyle => ({
  bold: style.bold, italic: style.italic, underline: !!style.underline, strike: !!style.strike, code: false, size: style.fontSize,
});

const runHeight = (r: Run) => (r.math ? r.math.h + 4 : r.img ? r.img.h + 2 : lineHeight(r.size));
const runAscent = (r: Run) => (r.math ? r.math.h - r.math.descent : r.img ? r.img.h : r.size * 0.8);

function lineMetrics(runs: Run[], size: number) {
  return {
    height: Math.max(lineHeight(size), ...runs.map(runHeight)),
    ascent: Math.max(size * 0.8, ...runs.map(runAscent)),
  };
}

function layoutTable(line: string, style: ElementStyle, base: InlineStyle): TableLine | null {
  const table = parseTable(line);
  if (!table) return null;
  const ncols = Math.max(...table.rows.map((r) => r.length));
  const cols = new Array<number>(ncols).fill(0);
  const rows = table.rows.map((row) => {
    const cells = row.map((c, ci) => {
      let x = 0;
      const runs: Placed[] = parseInline(c.text, c.header ? { ...base, bold: true } : base).map((r) => {
        const w = measureRun(r, style);
        const p = { ...r, x, w };
        x += w;
        return p;
      });
      cols[ci] = Math.max(cols[ci], x + CELL_PAD_X * 2);
      return { runs, header: c.header };
    });
    const all = cells.flatMap((c) => c.runs);
    const m = lineMetrics(all, base.size);
    return { h: m.height + CELL_PAD_Y * 2, ascent: m.ascent, cells };
  });
  return {
    kind: 'table',
    cols,
    rows,
    border: table.border,
    width: cols.reduce((a, b) => a + b, 0),
    height: rows.reduce((a, r) => a + r.h, 0),
  };
}

/** Lays out formatted text into lines that fit `maxWidth`. */
export function layoutRich(text: string, maxWidth: number, style: ElementStyle, math: boolean, wrap = true): RichLine[] {
  const lines: RichLine[] = [];
  const base = baseInline(style);
  for (const para of splitLines(text)) {
    if (isTableLine(para)) {
      const t = layoutTable(para, style, base);
      if (t) {
        lines.push(t);
        continue;
      }
    }
    let paraStyle = base;
    let prefix = '';
    let body = para;
    const h = /^(#{1,3})\s+(.*)$/.exec(para);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(para);
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(para);
    if (h) {
      paraStyle = { ...base, bold: true, size: style.fontSize * [1.6, 1.3, 1.12][h[1].length - 1] };
      body = h[2];
    } else if (bullet) {
      prefix = '•  ';
      body = bullet[1];
    } else if (numbered) {
      prefix = `${numbered[1]}.  `;
      body = numbered[2];
    }
    const runs: Run[] = [];
    if (prefix) runs.push({ ...paraStyle, text: prefix });
    for (const seg of math ? splitMath(body) : [{ math: false, display: false, text: body }]) {
      if (seg.math) {
        const res = mathSvg(seg.text, seg.display, paraStyle.size, style.textColor);
        runs.push(res ? { ...paraStyle, text: '', math: res } : { ...paraStyle, text: seg.display ? `$$${seg.text}$$` : `\\(${seg.text}\\)`, tex: seg.text, code: true });
      } else runs.push(...parseInline(seg.text, paraStyle));
    }
    // Break runs into words so wrapping can happen inside runs.
    const tokens: Run[] = [];
    for (const r of runs) {
      if (r.math || r.code || r.img) tokens.push(r);
      else for (const part of r.text.split(/(\s+)/)) if (part) tokens.push({ ...r, text: part });
    }
    const indent = prefix ? measureText(prefix, runFont(paraStyle, style)) : 0;
    let cur: Placed[] = [];
    let x = 0;
    const flush = () => {
      // Trim trailing whitespace.
      while (cur.length && !cur[cur.length - 1].math && !cur[cur.length - 1].img && /^\s+$/.test(cur[cur.length - 1].text)) cur.pop();
      const width = cur.reduce((m, r) => Math.max(m, r.x + r.w), 0);
      lines.push({ kind: 'text', runs: cur, width, ...lineMetrics(cur, paraStyle.size) });
      cur = [];
      x = indent;
    };
    for (const t of tokens) {
      const w = measureRun(t, style);
      const isSpace = !t.math && !t.img && /^\s+$/.test(t.text);
      if (wrap && x + w > maxWidth && cur.length && !isSpace) flush();
      if (isSpace && !cur.length) continue;
      cur.push({ ...t, x, w });
      x += w;
    }
    flush();
  }
  return lines;
}

/** Size of a laid-out formatted label. */
export function richSize(text: string, maxWidth: number, style: ElementStyle, wrap = true): { w: number; h: number } {
  const lines = layoutRich(text, maxWidth, style, !!style.math, wrap);
  return { w: Math.max(0, ...lines.map((l) => l.width)), h: lines.reduce((n, l) => n + l.height, 0) };
}

/** Re-renders when MathJax finishes loading. */
function useMathTick() {
  return useSyncExternalStore(useMathVersion.subscribe, () => useMathVersion.getState().v, () => 0);
}

function RunNode({ r, x, baseline, style }: { r: Placed; x: number; baseline: number; style: ElementStyle }) {
  if (r.math) {
    return (
      <image
        href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.math.svg)}`}
        x={x}
        y={baseline - (r.math.h - r.math.descent)}
        width={r.math.w}
        height={r.math.h}
      />
    );
  }
  if (r.img) return <image href={r.img.src} x={x} y={baseline - r.img.h} width={r.img.w} height={r.img.h} preserveAspectRatio="xMidYMid meet" />;
  if (/^\s+$/.test(r.text) && !r.highlight) return null;
  const size = effSize(r);
  const shift = r.script === 'sup' ? -r.size * 0.36 : r.script === 'sub' ? r.size * 0.18 : 0;
  const deco = [r.underline && 'underline', r.strike && 'line-through'].filter(Boolean).join(' ') || undefined;
  const f = runFont(r, style);
  return (
    <>
      {r.highlight && <rect x={x} y={baseline + shift - size * 0.95} width={r.w} height={size * 1.3} fill={r.highlight} />}
      {r.code && <rect x={x} y={baseline - r.size * 0.95} width={r.w} height={r.size * 1.3} rx={3} fill={style.textColor} fillOpacity={0.08} />}
      {!/^\s+$/.test(r.text) && (
        <text
          x={x + (r.code ? 3 : 0)}
          y={baseline + shift}
          fontFamily={fontStack(f.fontFamily)}
          fontSize={size}
          fontWeight={r.bold ? 700 : 400}
          fontStyle={r.italic ? 'italic' : undefined}
          fill={r.color ?? (r.href ? '#2563eb' : style.textColor)}
          textDecoration={deco}
          xmlSpace="preserve"
        >
          {r.text}
        </text>
      )}
    </>
  );
}

export function RichTextBlock({ box, text, style, math, wrap = true }: { box: Rect; text: string; style: ElementStyle; math: boolean; wrap?: boolean }) {
  useMathTick();
  if (!text) return null;
  const lines = layoutRich(text, box.w, style, math, wrap);
  const rtl = isRtl(style, text);
  const total = lines.reduce((n, l) => n + l.height, 0);
  const top = style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const lineX = (w: number) => (style.textAlign === 'left' ? box.x : style.textAlign === 'right' ? box.x + box.w - w : box.x + (box.w - w) / 2);
  // Runs are placed left to right; RTL mirrors them inside the line.
  const runX = (l: { width: number }, r: Placed) => (rtl ? l.width - r.x - r.w : r.x);
  let y = top;
  let frame = null;
  if ((style.labelBackground && style.labelBackground !== 'none') || style.labelBorderColor) {
    const w = Math.max(0, ...lines.map((l) => l.width));
    const left = Math.min(...lines.map((l) => lineX(l.width)));
    frame = (
      <rect
        x={left - 4}
        y={top - 2}
        width={w + 8}
        height={total + 4}
        rx={3}
        fill={style.labelBackground && style.labelBackground !== 'none' ? style.labelBackground : 'none'}
        stroke={style.labelBorderColor}
      />
    );
  }
  return (
    <g fillOpacity={style.textOpacity}>
      {frame}
      {lines.map((line, li) => {
        const lineTop = y;
        y += line.height;
        const x0 = lineX(line.width);
        if (line.kind === 'table') {
          let ry = lineTop;
          return (
            <g key={li}>
              {line.rows.map((row, ri) => {
                const rowTop = ry;
                ry += row.h;
                let cx = x0;
                const baseline = rowTop + CELL_PAD_Y + (row.h - CELL_PAD_Y * 2 - lineHeight(style.fontSize)) / 2 + row.ascent + (lineHeight(style.fontSize) - style.fontSize) / 2;
                return (
                  <Fragment key={ri}>
                    {line.cols.map((cw, ci) => {
                      const cell = row.cells[ci];
                      const left = cx;
                      cx += cw;
                      const cellW = cell ? cell.runs.reduce((m, r) => Math.max(m, r.x + r.w), 0) : 0;
                      return (
                        <Fragment key={ci}>
                          {(line.border || cell?.header) && (
                            <rect
                              x={left}
                              y={rowTop}
                              width={cw}
                              height={row.h}
                              fill={cell?.header ? style.textColor : 'none'}
                              fillOpacity={cell?.header ? 0.06 : undefined}
                              stroke={line.border ? style.textColor : undefined}
                              strokeOpacity={0.5}
                              strokeWidth={1}
                            />
                          )}
                          {cell?.runs.map((r, k) => (
                            <RunNode key={k} r={r} x={left + CELL_PAD_X + (rtl ? cellW - r.x - r.w : r.x)} baseline={baseline} style={style} />
                          ))}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </g>
          );
        }
        const baseline = lineTop + (line.height - lineHeight(style.fontSize)) / 2 + line.ascent + (lineHeight(style.fontSize) - style.fontSize) / 2;
        return (
          <Fragment key={li}>
            {line.runs.map((r, ri) => (
              <RunNode key={ri} r={r} x={x0 + runX(line, r)} baseline={baseline} style={style} />
            ))}
          </Fragment>
        );
      })}
    </g>
  );
}

/** True if a label needs the rich renderer. */
export const needsRich = (text: string, style: ElementStyle) => !!style.richText || (!!style.math && /\$\$|\\\(/.test(text));
