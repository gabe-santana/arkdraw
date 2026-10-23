/**
 * Swimlanes & containers: pools and lanes (horizontal / vertical), lists,
 * cards, collapsible panels, titled frames and dashed groups.
 */
import type { ElementStyle } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { RoundRect, rr, strokeAttrs } from '../kit';
import { TextLines } from '../TextLines';
import type { ParamHandle, ParamValues, ShapeDef, ShapeLibrary, ShapeParam, ShapeRenderContext } from '../types';
import { handle, param, pn, ps } from '../params';
import { Line, TONE, Tint, f, ink, item, roundRectD, shape, solid } from './_kit2';

/** Header band size of a pool / lane (without a `startSize` param). */
export const bandSize = (len: number) => Math.min(32, len * 0.35);

/** Header band size: the `startSize` param (mxGraph swimlane) when present. */
const band = (len: number, p?: ParamValues) => (p && p.startSize !== undefined ? Math.max(0, Math.min(len, pn(p, 'startSize'))) : bandSize(len));

/** Swimlane params: header size and header fill (mxGraph startSize / swimlaneFillColor). */
export const SWIM_PARAMS = (startSize = 30, kinds?: { horizontal: string; vertical: string }): ShapeParam[] => [
  param.px('startSize', 'Header', startSize, { drawioDefault: 23 }),
  param.color('swimlaneFillColor', 'Header fill'),
  ...(kinds
    ? [{
        key: 'orientation', label: 'Header at', kind: 'enum', default: 'horizontal', drawio: false, kindOptions: kinds,
        options: [{ value: 'horizontal', label: 'Left' }, { value: 'vertical', label: 'Top' }],
      } satisfies ShapeParam]
    : []),
];

/** Header-size handle on the band edge: left band (`H`) or top band (`V`). */
export const swimHandles = (side: 'H' | 'V') => ({ w, h, p }: { w: number; h: number; p: ParamValues }): ParamHandle[] =>
  side === 'H'
    ? [handle(band(w, p), h / 2, (pt) => ({ params: { startSize: Math.round(Math.min(w, pt.x)) } }))]
    : [handle(w / 2, band(h, p), (pt) => ({ params: { startSize: Math.round(Math.min(h, pt.y)) } }))];

/** Header band: custom fill (opaque) or the default translucent tint. */
function HeaderBand({ d, style, params, tint }: { d: string; style: ElementStyle; params?: ParamValues; tint: number }) {
  const fill = ps(params, 'swimlaneFillColor');
  return fill ? <path d={d} fill={fill} stroke="none" /> : <Tint d={d} s={style} k={tint} />;
}

/** Text rotated -90Â° (reads bottom-to-top), centred at (cx, cy) within `len` px. */
export function RotatedText({ cx, cy, len, text, style }: { cx: number; cy: number; len: number; text: string; style: ElementStyle }) {
  if (!text) return null;
  const lines = wrapText(text, Math.max(1, len - 16), style);
  const total = lines.length * lineHeight(style.fontSize);
  return (
    <g transform={`translate(${f(cx)} ${f(cy)}) rotate(-90)`}>
      <TextLines lines={lines} x={0} y={-total / 2} anchor="middle" style={style} />
    </g>
  );
}

/** Left (`r` > 0 rounds the outer corners) or top header band path. */
const leftBand = (b: number, h: number, r: number) =>
  r > 0 ? `M${f(b)},0 H${f(r)} Q0,0 0,${f(r)} V${f(h - r)} Q0,${f(h)} ${f(r)},${f(h)} H${f(b)} Z` : `M0,0 H${f(b)} V${f(h)} H0 Z`;
const topBand = (w: number, b: number, r: number) =>
  r > 0 ? `M0,${f(b)} V${f(r)} Q0,0 ${f(r)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(b)} Z` : `M0,0 H${f(w)} V${f(b)} H0 Z`;

/** Pool / lane with a header band on the left and a rotated title. */
export function renderPoolH({ w, h, style, text, params }: ShapeRenderContext, opts: { rounded?: boolean; tint?: number } = {}) {
  const b = band(w, params);
  const r = opts.rounded ? rr(w, h, style.radius) : 0;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <HeaderBand d={leftBand(b, h, Math.min(r, b))} style={style} params={params} tint={opts.tint ?? 0.08} />
      <path d={`M${f(b)},0 V${f(h)}`} fill="none" {...strokeAttrs({ ...style, strokeStyle: 'solid' })} />
      <RotatedText cx={b / 2} cy={h / 2} len={h} text={text} style={style} />
    </>
  );
}

/** Pool / lane with a header band on top (text goes in the band via `textBox`). */
export function renderPoolV({ w, h, style, params }: ShapeRenderContext, opts: { rounded?: boolean; tint?: number } = {}) {
  const b = band(h, params);
  const r = opts.rounded ? rr(w, h, style.radius) : 0;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <HeaderBand d={topBand(w, b, Math.min(r, b))} style={style} params={params} tint={opts.tint ?? 0.08} />
      <path d={`M0,${f(b)} H${f(w)}`} fill="none" {...strokeAttrs({ ...style, strokeStyle: 'solid' })} />
    </>
  );
}

export const topBandBox = (w: number, h: number, p?: ParamValues) => ({ x: 8, y: 0, w: Math.max(1, w - 16), h: Math.max(1, band(h, p)) });

// ----- List ------------------------------------------------------------------

const listHeader = (style: ElementStyle) => Math.max(30, lineHeight(style.fontSize) + 12);
const listRow = (style: ElementStyle) => lineHeight(style.fontSize) + 12;

function renderList({ w, h, style, text }: ShapeRenderContext) {
  const [head = '', ...rows] = text.split('\n');
  const hh = Math.min(h, listHeader(style));
  const rh = listRow(style);
  const r = rr(w, h, style.radius);
  const slots = Math.max(rows.length, Math.floor((h - hh) / rh + 0.001));
  const lineS = { ...style, strokeStyle: 'solid' as const, strokeWidth: Math.max(1, style.strokeWidth * 0.66) };
  const anchor = style.textAlign === 'left' ? 'start' : style.textAlign === 'right' ? 'end' : 'middle';
  const hx = anchor === 'start' ? 10 : anchor === 'end' ? w - 10 : w / 2;
  const lh = lineHeight(style.fontSize);
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <Tint d={topBand(w, hh, Math.min(r, hh))} s={style} k={0.08} />
      <path d={`M0,${f(hh)} H${f(w)}`} fill="none" {...strokeAttrs({ ...style, strokeStyle: 'solid' })} />
      {head && <TextLines lines={[head]} x={hx} y={(hh - lh) / 2} anchor={anchor} style={style} bold />}
      {Array.from({ length: slots }, (_, i) => {
        const top = hh + rh * i;
        if (top >= h - 1) return null;
        return (
          <g key={i}>
            {i > 0 && <path d={`M0,${f(top)} H${f(w)}`} fill="none" {...strokeAttrs(lineS)} strokeOpacity={0.5} />}
            {rows[i] && <TextLines lines={[rows[i]]} x={10} y={top + (rh - lh) / 2} anchor="start" style={{ ...style, bold: false }} />}
          </g>
        );
      })}
    </>
  );
}

// ----- Card, collapsible, frame, group ---------------------------------------

function renderCard({ w, h, style }: ShapeRenderContext) {
  const r = rr(w, h, style.radius);
  const bar = Math.min(4, h * 0.1);
  // Accent strip that follows the rounded top corners down to y = bar.
  const accent =
    bar >= r
      ? `M0,${f(bar)} V${f(r)} A${f(r)},${f(r)} 0 0 1 ${f(r)},0 H${f(w - r)} A${f(r)},${f(r)} 0 0 1 ${f(w)},${f(r)} V${f(bar)} Z`
      : (() => {
          const dx = r - Math.sqrt(r * r - (r - bar) * (r - bar));
          return `M${f(dx)},${f(bar)} A${f(r)},${f(r)} 0 0 1 ${f(r)},0 H${f(w - r)} A${f(r)},${f(r)} 0 0 1 ${f(w - dx)},${f(bar)} Z`;
        })();
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <path d={accent} fill={ink(style)} stroke="none" />
      {h > 56 && <path d={`M12,40 H${f(w - 12)}`} fill="none" {...strokeAttrs(solid(style, 0.5))} strokeOpacity={0.3} />}
    </>
  );
}
function renderCollapsible({ w, h, style }: ShapeRenderContext) {
  const b = Math.min(32, h);
  const r = rr(w, h, style.radius);
  const c = b / 2;
  const k = Math.min(5, b * 0.16);
  const bx = w - 22;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <Tint d={topBand(w, b, Math.min(r, b))} s={style} k={0.08} />
      <path d={`M0,${f(b)} H${f(w)}`} fill="none" {...strokeAttrs({ ...style, strokeStyle: 'solid' })} />
      <Line d={`M${f(14 - k)},${f(c - k / 2)} L14,${f(c + k / 2)} L${f(14 + k)},${f(c - k / 2)}`} s={style} k={0.9} />
      {w > 60 && (
        <>
          <path d={roundRectD(bx, c - 6, 12, 12, 2.5)} fill="none" {...strokeAttrs(solid(style, 0.66))} />
          <Line d={`M${f(bx + 3)},${f(c)} H${f(bx + 9)}`} s={style} k={0.75} />
        </>
      )}
    </>
  );
}

function renderFrame({ w, h, style }: ShapeRenderContext) {
  const tw = Math.min(w * 0.45, 130);
  const th = Math.min(26, h * 0.3);
  const r = rr(w, h, style.radius);
  const tr = Math.min(6, th / 2);
  const tab =
    r > 0
      ? `M0,${f(th)} V${f(r)} Q0,0 ${f(r)},0 H${f(tw)} V${f(th - tr)} Q${f(tw)},${f(th)} ${f(tw - tr)},${f(th)} Z`
      : `M0,0 H${f(tw)} V${f(th - tr)} Q${f(tw)},${f(th)} ${f(tw - tr)},${f(th)} H0 Z`;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <path d={tab} fill={ink(style)} fillOpacity={0.1} {...strokeAttrs({ ...style, strokeStyle: 'solid', strokeWidth: Math.max(1, style.strokeWidth * 0.75) })} />
    </>
  );
}

function renderGroup({ w, h, style }: ShapeRenderContext) {
  return <RoundRect w={w} h={h} s={style} />;
}

const headerBox = (w: number) => ({ x: 12, y: 0, w: Math.max(1, w - 24), h: 32 });

const POOL_KINDS = { horizontal: 'lane.poolH', vertical: 'lane.poolV' };
const LANE_KINDS = { horizontal: 'lane.laneH', vertical: 'lane.laneV' };

export const shapes: ShapeDef[] = [
  shape('lane.poolH', 'Pool (horizontal)', 'swimlane;horizontal=0;startSize=30;html=1;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolH(ctx, { rounded: true }), {
    container: true,
    rounded: true,
    textPlacement: 'custom',
    params: SWIM_PARAMS(30, POOL_KINDS),
    handles: swimHandles('H'),
  }),
  shape('lane.poolV', 'Pool (vertical)', 'swimlane;startSize=30;html=1;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolV(ctx, { rounded: true }), {
    container: true,
    rounded: true,
    textBox: topBandBox,
    params: SWIM_PARAMS(30, POOL_KINDS),
    handles: swimHandles('V'),
  }),
  shape('lane.laneH', 'Lane (horizontal)', 'swimlane;horizontal=0;startSize=30;swimlaneLine=1;html=1;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolH(ctx, { tint: 0.04 }), {
    container: true,
    textPlacement: 'custom',
    params: SWIM_PARAMS(30, LANE_KINDS),
    handles: swimHandles('H'),
  }),
  shape('lane.laneV', 'Lane (vertical)', 'swimlane;startSize=30;swimlaneLine=1;html=1;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolV(ctx, { tint: 0.04 }), {
    container: true,
    textBox: topBandBox,
    params: SWIM_PARAMS(30, LANE_KINDS),
    handles: swimHandles('V'),
  }),
  shape(
    'lane.list',
    'List',
    'swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=30;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;',
    renderList,
    { rounded: true, textPlacement: 'custom' },
  ),
  shape('lane.card', 'Card container', 'rounded=1;arcSize=6;container=1;collapsible=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;', renderCard, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 12, y: Math.min(4, h * 0.1), w: Math.max(1, w - 24), h: Math.min(36, h) }),
  }),
  shape('lane.collapsible', 'Collapsible container', 'swimlane;startSize=32;rounded=1;arcSize=6;container=1;collapsible=1;html=1;whiteSpace=wrap;align=left;spacingLeft=26;', renderCollapsible, {
    container: true,
    rounded: true,
    textBox: (w) => ({ x: 26, y: 0, w: Math.max(1, w - 56), h: 32 }),
  }),
  shape('lane.frame', 'Titled frame', 'shape=umlFrame;width=130;height=26;container=1;whiteSpace=wrap;html=1;', renderFrame, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 8, y: 0, w: Math.max(1, Math.min(w * 0.45, 130) - 14), h: Math.min(26, h * 0.3) }),
  }),
  shape('lane.group', 'Group', 'rounded=1;arcSize=4;dashed=1;fillColor=none;container=1;html=1;whiteSpace=wrap;verticalAlign=top;align=left;spacingLeft=10;', renderGroup, {
    container: true,
    rounded: true,
    textBox: headerBox,
  }),
];

const lane: Partial<ElementStyle> = { fill: '#ffffff', stroke: '#64748b', bold: true, fontSize: 13, textColor: '#334155', radius: 6 };

export const libraries: ShapeLibrary[] = [
  {
    id: 'containers',
    name: 'Swimlanes & Containers',
    items: [
      item('lane.poolH', 'Pool (horizontal)', 560, 200, { text: 'Pool', style: lane, keywords: 'swimlane pool horizontal participant' }),
      item('lane.poolV', 'Pool (vertical)', 220, 420, { text: 'Pool', style: lane, keywords: 'swimlane pool vertical column' }),
      item('lane.laneH', 'Lane (horizontal)', 540, 140, { text: 'Lane', style: { ...lane, radius: 0, bold: false }, keywords: 'swimlane lane row' }),
      item('lane.laneV', 'Lane (vertical)', 180, 400, { text: 'Lane', style: { ...lane, radius: 0, bold: false }, keywords: 'swimlane lane column' }),
      item('lane.list', 'List', 180, 122, {
        text: 'List\nItem 1\nItem 2\nItem 3',
        style: { fill: '#ffffff', stroke: '#64748b', radius: 6, fontSize: 13, textColor: '#1e293b' },
        keywords: 'list rows items table header',
      }),
      item('lane.card', 'Card container', 260, 180, {
        text: 'Card',
        style: { fill: '#ffffff', stroke: TONE.indigo.stroke, radius: 10, shadow: true, bold: true, fontSize: 13, textAlign: 'left', textColor: '#1e293b' },
        keywords: 'card panel container',
      }),
      item('lane.collapsible', 'Collapsible container', 280, 180, {
        text: 'Section',
        style: { fill: '#ffffff', stroke: '#64748b', radius: 8, bold: true, fontSize: 13, textAlign: 'left', textColor: '#334155' },
        keywords: 'collapsible expander accordion panel container',
      }),
      item('lane.frame', 'Titled frame', 320, 200, {
        text: 'Frame',
        style: { fill: 'none', stroke: '#475569', radius: 4, bold: true, fontSize: 12, textAlign: 'left', textColor: '#1e293b' },
        keywords: 'frame title fieldset container',
      }),
      item('lane.group', 'Dashed group', 320, 200, {
        text: 'Group',
        style: { fill: 'none', stroke: '#94a3b8', strokeStyle: 'dashed', radius: 12, fontSize: 12, textAlign: 'left', textColor: '#475569' },
        keywords: 'group boundary dashed container',
      }),
    ],
  },
];
