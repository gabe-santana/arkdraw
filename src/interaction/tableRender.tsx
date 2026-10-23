/**
 * Table shape renderer: per-cell fills and text styles, merged cells (grid
 * lines skip a merge's interior) and the optional header row.
 */
import type { ElementStyle, TableData } from '@/model/types';
import { Detail, RoundRect } from '@/shapes/kit';
import { TextBlock } from '@/shapes/TextLines';
import { cellKey, cellRect, colEdges, isCovered, mergeAt, rowEdges } from './table';

/** Grid-line segments along one internal edge, broken where a merge spans across it. */
function edgeSegments(n: number, crosses: (i: number) => boolean, edges: number[]): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < n; i++) {
    if (!crosses(i)) {
      if (start === null) start = edges[i];
    } else if (start !== null) {
      segs.push([start, edges[i]]);
      start = null;
    }
  }
  if (start !== null) segs.push([start, edges[n]]);
  return segs;
}

export function renderTable({ w, h, table, style }: { w: number; h: number; table?: TableData; style: ElementStyle }) {
  if (!table) return <RoundRect w={w} h={h} s={style} />;
  const xs = colEdges(table, w);
  const ys = rowEdges(table, h);
  const line = { ...style, strokeStyle: 'solid' as const };
  const nr = table.rows.length;
  const nc = table.cols.length;
  // Is the edge between column c-1 and c interrupted at row r (inside a merge)?
  const spansCol = (c: number) => (r: number) => {
    const m = mergeAt(table, r, c);
    return !!m && m.c < c;
  };
  const spansRow = (r: number) => (c: number) => {
    const m = mergeAt(table, r, c);
    return !!m && m.r < r;
  };
  const fills = Object.entries(table.cellStyles ?? {}).filter(([, v]) => v.fill && v.fill !== 'none');
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, 6)} />
      {table.header && <rect x={0} y={0} width={w} height={ys[1]} fill={style.stroke} fillOpacity={0.08} />}
      {fills.map(([k, v]) => {
        const [r, c] = k.split(',').map(Number);
        if (r >= nr || c >= nc || isCovered(table, r, c)) return null;
        const b = cellRect(table, w, h, r, c);
        return <rect key={`f${k}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={v.fill} />;
      })}
      {xs.slice(1, -1).map((x, i) =>
        edgeSegments(nr, spansCol(i + 1), ys).map(([a, b], j) => <Detail key={`c${i}-${j}`} d={`M${x},${a} V${b}`} s={line} />),
      )}
      {ys.slice(1, -1).map((y, i) =>
        edgeSegments(nc, spansRow(i + 1), xs).map(([a, b], j) => <Detail key={`r${i}-${j}`} d={`M${a},${y} H${b}`} s={line} />),
      )}
      {table.cells.map((row, r) =>
        row.map((cell, c) => {
          if (!cell || isCovered(table, r, c)) return null;
          const b = cellRect(table, w, h, r, c);
          const cs = table.cellStyles?.[cellKey(r, c)];
          const st: ElementStyle = {
            ...style,
            ...(table.header && r === 0 ? { bold: true } : {}),
            ...(cs?.textColor ? { textColor: cs.textColor } : {}),
            ...(cs?.bold !== undefined ? { bold: cs.bold } : {}),
            ...(cs?.italic !== undefined ? { italic: cs.italic } : {}),
            ...(cs?.textAlign ? { textAlign: cs.textAlign } : {}),
          };
          return <TextBlock key={`${r}-${c}`} box={{ x: b.x + 6, y: b.y + 2, w: Math.max(1, b.w - 12), h: Math.max(1, b.h - 4) }} text={cell} style={st} />;
        }),
      )}
      {/* Cell fills paint over the border; redraw it on top. */}
      {fills.length > 0 && <RoundRect w={w} h={h} s={{ ...style, fill: 'none', shadow: false }} r={Math.min(style.radius, 6)} />}
    </>
  );
}
