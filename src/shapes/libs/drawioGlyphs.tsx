/**
 * Redrawn versions of small draw.io vendor stencils (person, check, red X,
 * clock, JSON logo) so imported diagrams keep their meaning instead of falling
 * back to plain boxes. Filled glyphs take the shape's fill, like in draw.io.
 */
import { Body } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { circleD, ellipseD, f, ink, item, normPath, shape } from './_kit2';

const base = 'verticalLabelPosition=bottom;verticalAlign=top;';

function User({ w, h, style }: ShapeRenderContext) {
  const head = ellipseD(w * 0.5, h * 0.25, w * 0.24, h * 0.25);
  const body = `M0,${f(h)} V${f(h * 0.82)} C0,${f(h * 0.62)} ${f(w * 0.2)},${f(h * 0.55)} ${f(w * 0.5)},${f(h * 0.55)} C${f(w * 0.8)},${f(h * 0.55)} ${f(w)},${f(h * 0.62)} ${f(w)},${f(h * 0.82)} V${f(h)} Z`;
  return <Body d={`${head} ${body}`} s={style} />;
}

const CHECK = [[0, 0.55], [0.15, 0.4], [0.38, 0.62], [0.85, 0.1], [1, 0.25], [0.38, 0.9]] as const;
const RED_X = [[0, 0.14], [0.14, 0], [0.5, 0.36], [0.86, 0], [1, 0.14], [0.64, 0.5], [1, 0.86], [0.86, 1], [0.5, 0.64], [0.14, 1], [0, 0.86], [0.36, 0.5]] as const;

function Clock({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <>
      <Body d={circleD(cx, cy, r)} s={style} />
      <path d={`M${f(cx)},${f(cy - r * 0.6)} V${f(cy)} H${f(cx + r * 0.45)}`} fill="none" stroke="#ffffff" strokeWidth={f(r * 0.14)} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Json({ w, h, style }: ShapeRenderContext) {
  const brace = (x0: number, dir: 1 | -1) => {
    const x1 = x0 + dir * w * 0.12;
    return `M${f(x1)},${f(h * 0.1)} Q${f(x0)},${f(h * 0.1)} ${f(x0)},${f(h * 0.3)} V${f(h * 0.42)} Q${f(x0)},${f(h * 0.5)} ${f(x0 - dir * w * 0.08)},${f(h * 0.5)} Q${f(x0)},${f(h * 0.5)} ${f(x0)},${f(h * 0.58)} V${f(h * 0.7)} Q${f(x0)},${f(h * 0.9)} ${f(x1)},${f(h * 0.9)}`;
  };
  return (
    <path
      d={`${brace(w * 0.25, 1)} ${brace(w * 0.75, -1)}`}
      fill="none"
      stroke={ink(style)}
      strokeWidth={f(Math.max(1.5, Math.min(w, h) * 0.08))}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export const shapes: ShapeDef[] = [
  shape('drawio.user', 'User', `shape=mxgraph.azure.user;${base}`, User),
  shape('drawio.check', 'Check', `shape=mxgraph.gcp2.check;${base}`, ({ w, h, style }) => <Body d={normPath(w, h, CHECK)} s={style} />),
  shape('drawio.redX', 'Red X', `shape=mxgraph.mockup.markup.redX;${base}`, ({ w, h, style }) => <Body d={normPath(w, h, RED_X)} s={style} />),
  shape('drawio.clock', 'Clock', `shape=mxgraph.office.concepts.clock;${base}`, Clock),
  shape('drawio.json', 'JSON', `shape=mxgraph.weblogos.json;${base}`, Json),
];

const glyph = { stroke: 'none', labelPosition: 'bottom' as const };

export const libraries: ShapeLibrary[] = [
  {
    id: 'drawioGlyphs',
    name: 'Glyphs',
    items: [
      item('drawio.user', 'User', 40, 46, { style: { ...glyph, fill: '#00BEF2' }, text: 'User', keywords: 'person account member actor azure' }),
      item('drawio.check', 'Check', 40, 32, { style: { ...glyph, fill: '#2D9C5E' }, keywords: 'tick ok done approved valid' }),
      item('drawio.redX', 'Red X', 36, 36, { style: { ...glyph, fill: '#ff0000' }, keywords: 'cross error fail delete wrong' }),
      item('drawio.clock', 'Clock', 40, 40, { style: { ...glyph, fill: '#505050' }, keywords: 'time schedule timer cron' }),
      item('drawio.json', 'JSON', 40, 40, { style: { ...glyph, fill: 'none', stroke: '#1e293b' }, keywords: 'data format braces payload' }),
    ],
  },
];
