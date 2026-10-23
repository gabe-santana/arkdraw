/**
 * Formatted labels (draw.io "Formatted Text") using a Markdown subset, plus
 * inline/display LaTeX math. Runs are laid out explicitly (no text-anchor
 * tricks) so mixed styles and formula boxes wrap and align correctly, and
 * the result is plain SVG — faithful in every export.
 *
 * Inline: **bold**  *italic*  __underline__  ~~strike~~  `code`  [link](url)
 * Blocks: # Heading / ## / ###   - bullet / * bullet   1. numbered
 * Math:   $$display$$   \(inline\)   (when the element has math enabled)
 */
import { Fragment, useSyncExternalStore } from 'react';
import type { ElementStyle, Rect } from '@/model/types';
import { FONT_STACKS } from '@/model/defaults';
import { lineHeight, measureText } from '@/lib/text';
import { mathSvg, splitMath, useMathVersion, type MathResult } from '@/lib/math';

interface RunStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  href?: string;
  size: number;
}

interface Run extends RunStyle {
  text: string;
  math?: MathResult;
  /** Raw TeX shown while MathJax loads. */
  tex?: string;
}

interface Placed extends Run {
  x: number;
  w: number;
}

interface Line {
  runs: Placed[];
  width: number;
  height: number;
  ascent: number;
}

const INLINE = /(\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;

function parseInline(text: string, base: RunStyle, out: Run[]) {
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push({ ...base, text: rest });
      return;
    }
    if (m.index > 0) out.push({ ...base, text: rest.slice(0, m.index) });
    if (m[2] !== undefined) parseInline(m[2], { ...base, bold: true }, out);
    else if (m[3] !== undefined) parseInline(m[3], { ...base, underline: true }, out);
    else if (m[4] !== undefined) parseInline(m[4], { ...base, strike: true }, out);
    else if (m[5] !== undefined) parseInline(m[5], { ...base, italic: true }, out);
    else if (m[6] !== undefined) out.push({ ...base, code: true, text: m[6] });
    else if (m[7] !== undefined) parseInline(m[7], { ...base, href: m[8], underline: true }, out);
    rest = rest.slice(m.index + m[0].length);
  }
}

const runFont = (r: RunStyle, s: ElementStyle) => ({
  fontFamily: r.code ? ('mono' as const) : s.fontFamily,
  fontSize: r.size,
  bold: r.bold,
  italic: r.italic,
});

function measureRun(r: Run, s: ElementStyle): number {
  if (r.math) return r.math.w;
  return measureText(r.text, runFont(r, s)) + (r.code ? 6 : 0);
}

/** Lays out formatted text into lines that fit `maxWidth`. */
export function layoutRich(text: string, maxWidth: number, style: ElementStyle, math: boolean, wrap = true): Line[] {
  const lines: Line[] = [];
  const base: RunStyle = { bold: style.bold, italic: style.italic, underline: !!style.underline, strike: !!style.strike, code: false, size: style.fontSize };
  for (const para of text.split('\n')) {
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
      } else parseInline(seg.text, paraStyle, runs);
    }
    // Break runs into words so wrapping can happen inside runs.
    const tokens: Run[] = [];
    for (const r of runs) {
      if (r.math || r.code) tokens.push(r);
      else for (const part of r.text.split(/(\s+)/)) if (part) tokens.push({ ...r, text: part });
    }
    const indent = prefix ? measureText(prefix, runFont(paraStyle, style)) : 0;
    let cur: Placed[] = [];
    let x = 0;
    const flush = () => {
      // Trim trailing whitespace.
      while (cur.length && !cur[cur.length - 1].math && /^\s+$/.test(cur[cur.length - 1].text)) cur.pop();
      const width = cur.reduce((m, r) => Math.max(m, r.x + r.w), 0);
      const lh = Math.max(lineHeight(paraStyle.size), ...cur.map((r) => (r.math ? r.math.h + 4 : lineHeight(r.size))));
      const ascent = Math.max(paraStyle.size * 0.8, ...cur.map((r) => (r.math ? r.math.h - r.math.descent : r.size * 0.8)));
      lines.push({ runs: cur, width, height: lh, ascent });
      cur = [];
      x = indent;
    };
    for (const t of tokens) {
      const w = measureRun(t, style);
      const isSpace = !t.math && /^\s+$/.test(t.text);
      if (wrap && x + w > maxWidth && cur.length && !isSpace) flush();
      if (isSpace && !cur.length) continue;
      cur.push({ ...t, x, w });
      x += w;
    }
    flush();
  }
  return lines;
}

/** Re-renders when MathJax finishes loading. */
function useMathTick() {
  return useSyncExternalStore(useMathVersion.subscribe, () => useMathVersion.getState().v, () => 0);
}

export function RichTextBlock({ box, text, style, math, wrap = true }: { box: Rect; text: string; style: ElementStyle; math: boolean; wrap?: boolean }) {
  useMathTick();
  if (!text) return null;
  const lines = layoutRich(text, box.w, style, math, wrap);
  const total = lines.reduce((n, l) => n + l.height, 0);
  let y = style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - total : box.y + (box.h - total) / 2;
  return (
    <g fillOpacity={style.textOpacity}>
      {lines.map((line, li) => {
        const lineTop = y;
        y += line.height;
        const x0 = style.textAlign === 'left' ? box.x : style.textAlign === 'right' ? box.x + box.w - line.width : box.x + (box.w - line.width) / 2;
        const baseline = lineTop + (line.height - lineHeight(style.fontSize)) / 2 + line.ascent + (lineHeight(style.fontSize) - style.fontSize) / 2;
        return (
          <Fragment key={li}>
            {line.runs.map((r, ri) => {
              if (r.math) {
                return (
                  <image
                    key={ri}
                    href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.math.svg)}`}
                    x={x0 + r.x}
                    y={baseline - (r.math.h - r.math.descent)}
                    width={r.math.w}
                    height={r.math.h}
                  />
                );
              }
              if (/^\s+$/.test(r.text)) return null;
              const f = runFont(r, style);
              const deco = [r.underline && 'underline', r.strike && 'line-through'].filter(Boolean).join(' ') || undefined;
              return (
                <Fragment key={ri}>
                  {r.code && (
                    <rect x={x0 + r.x} y={baseline - r.size * 0.95} width={r.w} height={r.size * 1.3} rx={3} fill={style.textColor} fillOpacity={0.08} />
                  )}
                  <text
                    x={x0 + r.x + (r.code ? 3 : 0)}
                    y={baseline}
                    fontFamily={FONT_STACKS[f.fontFamily]}
                    fontSize={r.size}
                    fontWeight={r.bold ? 700 : 400}
                    fontStyle={r.italic ? 'italic' : undefined}
                    fill={r.href ? '#2563eb' : style.textColor}
                    textDecoration={deco}
                    xmlSpace="preserve"
                  >
                    {r.text}
                  </text>
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </g>
  );
}

/** True if a label needs the rich renderer. */
export const needsRich = (text: string, style: ElementStyle) => !!style.richText || (!!style.math && /\$\$|\\\(/.test(text));
