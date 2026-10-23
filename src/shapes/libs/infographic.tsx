/**
 * Infographic: ribbons, number badges, roadmap chevrons, banners, progress
 * rings, pyramid / funnel bands, flags, pins, shields and icon circles.
 */
import type { ComponentType } from 'react';
import { Lightbulb, Rocket, Target, TrendingUp, Trophy, Users, type LucideProps } from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { wrapText } from '@/lib/text';
import { Body, RoundRect, inset } from '../kit';
import { TextBlock, TextLines } from '../TextLines';
import type { ShapeDef, ShapeLibrary } from '../types';
import {
  Glyph, Ink, Line, Oval, Shade, TONE, circleD, item, pathOf, polar, ringD, roundedPolyD, shape, solidTone,
} from './_kit2';

const ribbonDims = (w: number, h: number) => {
  const e = Math.min(w * 0.14, h * 0.9);
  return { e, f: e * 0.55, bh: h * 0.76 };
};

/** Splits "badge\nrest" text: first line goes in the badge, the rest in the body. */
const splitFirst = (text: string) => {
  const [first = '', ...rest] = text.split('\n');
  return [first, rest.join('\n')] as const;
};

function ringRender(pct: number) {
  return ({ w, h, style }: { w: number; h: number; style: ElementStyle }) => {
    const r1 = Math.min(w, h) / 2 - style.strokeWidth / 2;
    const r0 = r1 * 0.74;
    const cx = w / 2;
    const cy = h / 2;
    return (
      <>
        <circle cx={cx} cy={cy} r={r0} fill={style.fill === 'none' ? 'none' : style.fill} stroke="none" />
        <Ink d={`${circleD(cx, cy, r1)} ${circleD(cx, cy, r0)}`} s={style} opacity={0.14} />
        <Ink d={ringD(cx, cy, r0, r1, -90, -90 + 360 * pct)} s={style} />
      </>
    );
  };
}

const ringBox = (w: number, h: number) => {
  const r = (Math.min(w, h) / 2) * 0.74 * 0.72;
  return { x: w / 2 - r, y: h / 2 - r, w: r * 2, h: r * 2 };
};

const ICONS: Array<[string, string, ComponentType<LucideProps>]> = [
  ['info.iconIdea', 'Idea', Lightbulb],
  ['info.iconTarget', 'Target', Target],
  ['info.iconGrowth', 'Growth', TrendingUp],
  ['info.iconLaunch', 'Launch', Rocket],
  ['info.iconTeam', 'Team', Users],
  ['info.iconAward', 'Award', Trophy],
];

const shapes: ShapeDef[] = [
  shape(
    'info.ribbon',
    'Ribbon banner',
    'shape=mxgraph.infographic.ribbonFrontFolded;dx=20;dy=10;notch=15;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const { e, f, bh } = ribbonDims(w, h);
      const ty = h - bh;
      const left = pathOf([[0, ty], [e + f, ty], [e + f, h], [0, h], [e * 0.5, ty + bh / 2]]);
      const right = pathOf([[w, ty], [w - e - f, ty], [w - e - f, h], [w, h], [w - e * 0.5, ty + bh / 2]]);
      const folds = `${pathOf([[e, bh], [e + f, bh], [e + f, h]])} ${pathOf([[w - e, bh], [w - e - f, bh], [w - e - f, h]])}`;
      return (
        <>
          <Body d={left} s={style} />
          <Body d={right} s={style} />
          <Shade d={`${left} ${right}`} k={0.14} />
          <Body d={folds} s={style} />
          <Shade d={folds} k={0.32} />
          <Body d={pathOf([[e, 0], [w - e, 0], [w - e, bh], [e, bh]])} s={style} />
        </>
      );
    },
    {
      textBox: (w, h) => {
        const { e, bh } = ribbonDims(w, h);
        return { x: e + 6, y: 2, w: Math.max(1, w - e * 2 - 12), h: Math.max(1, bh - 4) };
      },
    },
  ),
  shape(
    'info.ribbonTail',
    'Ribbon (notched)',
    'shape=mxgraph.infographic.ribbonSimple;notch1=15;notch2=15;notch=0;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const n = Math.min(h * 0.4, w * 0.15);
      return <Body d={pathOf([[0, 0], [w, 0], [w - n, h / 2], [w, h], [0, h], [n, h / 2]])} s={style} />;
    },
    { textBox: (w, h) => inset(w, h, Math.min(h * 0.4, w * 0.15) + 6, 4) },
  ),
  shape(
    'info.cornerRibbon',
    'Corner ribbon',
    'shape=mxgraph.infographic.ribbonCorner;whiteSpace=wrap;',
    ({ w, h, style, text }) => {
      const s = Math.min(w, h);
      const a = s * 0.32;
      const b = s * 0.62;
      const band = pathOf([[w - b, 0], [w - a, 0], [w, a], [w, b]]);
      const mid = (a + b) / 2;
      const len = mid * Math.SQRT2;
      const lines = wrapText(text, len * 0.7, style).slice(0, 1);
      return (
        <>
          <Shade d={pathOf([[w - b, 0], [w - b - s * 0.06, 0], [w - b, s * 0.06]])} k={0.3} />
          <Shade d={pathOf([[w, b], [w, b + s * 0.06], [w - s * 0.06, b]])} k={0.3} />
          <Body d={band} s={style} />
          <g transform={`translate(${w - mid / 2},${mid / 2}) rotate(45)`}>
            <TextLines lines={lines} x={0} y={-style.fontSize * 0.65} anchor="middle" style={style} />
          </g>
        </>
      );
    },
    { textPlacement: 'custom', boxHit: true },
  ),
  shape(
    'info.numberCircle',
    'Number circle',
    'ellipse;shape=doubleEllipse;margin=8;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const k = Math.min(w, h) * 0.1;
      return (
        <>
          <Ink d={`${circleD(w / 2, h / 2, Math.min(w, h) / 2)}`} s={style} opacity={0.16} />
          <Oval cx={w / 2} cy={h / 2} rx={w / 2 - k} ry={h / 2 - k} s={style} />
        </>
      );
    },
    { perimeter: 'ellipse', textBox: (w, h) => ({ x: w * 0.18, y: h * 0.18, w: w * 0.64, h: h * 0.64 }) },
  ),
  shape(
    'info.numberedEntry',
    'Numbered entry',
    'shape=mxgraph.infographic.numberedEntryVert;dy=40;whiteSpace=wrap;',
    ({ w, h, style, text }) => {
      const r = h / 2;
      const bh = h * 0.72;
      const [num, body] = splitFirst(text);
      return (
        <>
          <Body d={roundedPolyD([[r, (h - bh) / 2], [w, (h - bh) / 2], [w, (h + bh) / 2], [r, (h + bh) / 2]], Math.min(8, bh / 2))} s={style} />
          <Ink d={circleD(r, r, r)} s={style} />
          <circle cx={r} cy={r} r={r * 0.8} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.25} />
          <TextBlock box={{ x: 0, y: 0, w: h, h }} text={num} style={{ ...style, textColor: '#ffffff', bold: true, fontSize: Math.max(10, Math.min(h * 0.36, style.fontSize + 6)), textAlign: 'center', verticalAlign: 'middle' }} />
          <TextBlock box={{ x: h + 8, y: (h - bh) / 2 + 2, w: Math.max(1, w - h - 16), h: bh - 4 }} text={body} style={style} />
        </>
      );
    },
    { textPlacement: 'custom' },
  ),
  shape(
    'info.chevronStart',
    'Roadmap start',
    'shape=mxgraph.arrows2.arrow;dy=0;dx=20;notch=0;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const p = Math.min(h * 0.45, w * 0.3);
      return <Body d={pathOf([[0, 0], [w - p, 0], [w, h / 2], [w - p, h], [0, h]])} s={style} />;
    },
    { textBox: (w, h) => ({ x: 8, y: 4, w: Math.max(1, w - Math.min(h * 0.45, w * 0.3) - 12), h: h - 8 }) },
  ),
  shape(
    'info.chevron',
    'Roadmap step',
    'shape=mxgraph.arrows2.arrow;dy=0;dx=20;notch=20;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const p = Math.min(h * 0.45, w * 0.3);
      return <Body d={pathOf([[0, 0], [w - p, 0], [w, h / 2], [w - p, h], [0, h], [p, h / 2]])} s={style} />;
    },
    { textBox: (w, h) => { const p = Math.min(h * 0.45, w * 0.3); return { x: p + 4, y: 4, w: Math.max(1, w - p * 2 - 8), h: h - 8 }; } },
  ),
  shape(
    'info.arrowStep',
    'Step (down arrow)',
    'shape=offPageConnector;size=0.25;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const p = Math.min(h * 0.28, w * 0.4);
      return <Body d={roundedPolyD([[0, 0], [w, 0], [w, h - p], [w / 2, h], [0, h - p]], Math.min(6, style.radius))} s={style} />;
    },
    { rounded: true, textBox: (w, h) => ({ x: 8, y: 6, w: Math.max(1, w - 16), h: Math.max(1, h - Math.min(h * 0.28, w * 0.4) - 8) }) },
  ),
  shape(
    'info.banner',
    'Callout banner',
    'shape=callout;perimeter=calloutPerimeter;position2=0.5;base=20;size=14;position=0.43;rounded=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const p = Math.min(14, h * 0.25);
      const bh = h - p;
      const r = Math.min(style.radius, bh / 2, w / 2);
      const t = Math.min(12, w * 0.12);
      return (
        <Body
          d={`M${r},0 H${w - r} Q${w},0 ${w},${r} V${bh - r} Q${w},${bh} ${w - r},${bh} H${w / 2 + t} L${w / 2},${h} L${w / 2 - t},${bh} H${r} Q0,${bh} 0,${bh - r} V${r} Q0,0 ${r},0 Z`}
          s={style}
        />
      );
    },
    { rounded: true, textBox: (w, h) => inset(w, h - Math.min(14, h * 0.25), 10, 4) },
  ),
  shape(
    'info.circleCallout',
    'Circle callout',
    'shape=mxgraph.infographic.circularCallout2;dy=15;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const r = Math.min(w, h) * 0.44;
      const cx = w - r - style.strokeWidth;
      const cy = r + style.strokeWidth;
      const [ax, ay] = polar(cx, cy, r, r, 160);
      const [bx, by] = polar(cx, cy, r, r, 110);
      return <Body d={`M${ax},${ay} A${r},${r} 0 1 1 ${bx},${by} L${style.strokeWidth},${h - style.strokeWidth} Z`} s={style} />;
    },
    {
      textBox: (w, h) => {
        const r = Math.min(w, h) * 0.44;
        return { x: w - r * 1.75, y: r * 0.3, w: r * 1.5, h: r * 1.4 };
      },
    },
  ),
  ...([25, 50, 75, 90] as const).map((p) =>
    shape(`info.ring${p}`, `Progress ring ${p}%`, `shape=mxgraph.basic.partConcEllipse;startAngle=0;endAngle=${p / 100};arcWidth=0.26;`, ringRender(p / 100), {
      perimeter: 'ellipse',
      textBox: ringBox,
    }),
  ),
  shape(
    'info.level',
    'Pyramid level',
    'shape=trapezoid;perimeter=trapezoidPerimeter;fixedSize=1;size=25;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const o = Math.min(h * 0.5, w * 0.45);
      return <Body d={roundedPolyD([[o, 0], [w - o, 0], [w, h], [0, h]], Math.min(4, style.radius))} s={style} />;
    },
    { rounded: true, textBox: (w, h) => inset(w, h, Math.min(h * 0.5, w * 0.45) + 4, 4) },
  ),
  shape(
    'info.funnel',
    'Funnel stage',
    'shape=trapezoid;perimeter=trapezoidPerimeter;fixedSize=1;size=25;flipV=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const o = Math.min(h * 0.5, w * 0.45);
      return <Body d={roundedPolyD([[0, 0], [w, 0], [w - o, h], [o, h]], Math.min(4, style.radius))} s={style} />;
    },
    { rounded: true, textBox: (w, h) => inset(w, h, Math.min(h * 0.5, w * 0.45) + 4, 4) },
  ),
  shape(
    'info.flag',
    'Milestone flag',
    'shape=mxgraph.signs.travel.flag;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => {
      const x = Math.max(style.strokeWidth, w * 0.08);
      const fh = h * 0.52;
      return (
        <>
          <Body d={roundedPolyD([[x, h * 0.04], [w, h * 0.04], [w - w * 0.2, h * 0.04 + fh / 2], [w, h * 0.04 + fh], [x, h * 0.04 + fh]], 2)} s={style} />
          <Line d={`M${x},${h * 0.02} V${h}`} s={style} k={1.6} />
        </>
      );
    },
    { textPlacement: 'below', boxHit: true },
  ),
  shape(
    'info.pin',
    'Map pin',
    'shape=mxgraph.signs.travel.map_location;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => {
      const r = Math.min(w / 2, h * 0.38) - style.strokeWidth / 2;
      const cx = w / 2;
      const cy = r + style.strokeWidth / 2;
      return (
        <>
          <Body
            d={`M${cx},${h} C${cx - r * 0.45},${cy + r * 1.35} ${cx - r},${cy + r * 0.75} ${cx - r},${cy} A${r},${r} 0 1 1 ${cx + r},${cy} C${cx + r},${cy + r * 0.75} ${cx + r * 0.45},${cy + r * 1.35} ${cx},${h} Z`}
            s={style}
          />
          <circle cx={cx} cy={cy} r={r * 0.4} fill="#ffffff" stroke="none" />
        </>
      );
    },
    { textPlacement: 'below', boxHit: true },
  ),
  shape(
    'info.shield',
    'Shield badge',
    'shape=mxgraph.infographic.shield1;whiteSpace=wrap;',
    ({ w, h, style }) => (
      <Body
        d={`M${w / 2},0 C${w * 0.68},${h * 0.08} ${w * 0.85},${h * 0.12} ${w},${h * 0.12} V${h * 0.5} C${w},${h * 0.76} ${w * 0.72},${h * 0.92} ${w / 2},${h} C${w * 0.28},${h * 0.92} 0,${h * 0.76} 0,${h * 0.5} V${h * 0.12} C${w * 0.15},${h * 0.12} ${w * 0.32},${h * 0.08} ${w / 2},0 Z`}
        s={style}
      />
    ),
    { textBox: (w, h) => ({ x: w * 0.14, y: h * 0.16, w: w * 0.72, h: h * 0.56 }) },
  ),
  shape(
    'info.stat',
    'Stat card',
    'rounded=1;whiteSpace=wrap;',
    ({ w, h, style, text }) => {
      const [big, caption] = splitFirst(text);
      const bar = Math.min(5, h * 0.06);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Ink d={`M${Math.min(style.radius, 12)},0 H${w - Math.min(style.radius, 12)} V${bar} H${Math.min(style.radius, 12)} Z`} s={style} />
          <TextBlock box={{ x: 10, y: bar + 4, w: w - 20, h: h * 0.55 - bar }} text={big} style={{ ...style, bold: true, fontSize: Math.max(12, Math.min(h * 0.3, style.fontSize * 2)), verticalAlign: 'bottom' }} />
          <TextBlock box={{ x: 10, y: h * 0.58, w: w - 20, h: h * 0.38 }} text={caption} style={{ ...style, fontSize: Math.max(9, style.fontSize - 2), verticalAlign: 'top' }} />
        </>
      );
    },
    { rounded: true, textPlacement: 'custom' },
  ),
  ...ICONS.map(([kind, label, Icon]) =>
    shape(
      kind,
      label,
      'ellipse;whiteSpace=wrap;verticalLabelPosition=bottom;verticalAlign=top;',
      ({ w, h, style }) => (
        <>
          <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />
          <Glyph Icon={Icon} cx={w / 2} cy={h / 2} size={Math.min(w, h) * 0.5} s={style} color={style.fill === 'none' || style.fill === '#ffffff' ? undefined : style.textColor} sw={2} />
        </>
      ),
      { perimeter: 'ellipse', textPlacement: 'below' },
    ),
  ),
];

const libraries: ShapeLibrary[] = [
  {
    id: 'infographic',
    name: 'Infographic',
    items: [
      item('info.ribbon', 'Ribbon banner', 220, 56, { text: 'Ribbon', style: { ...solidTone('red'), bold: true }, keywords: 'banner title header' }),
      item('info.ribbonTail', 'Ribbon (notched)', 180, 44, { text: 'Label', style: { ...solidTone('indigo'), bold: true }, keywords: 'banner tag swallowtail' }),
      item('info.cornerRibbon', 'Corner ribbon', 90, 90, { text: 'NEW', style: { ...solidTone('orange'), bold: true, fontSize: 11 }, keywords: 'badge sale' }),
      item('info.numberCircle', 'Number circle', 80, 80, { text: '1', style: { ...solidTone('blue'), bold: true, fontSize: 28 }, keywords: 'step badge digit' }),
      item('info.numberedEntry', 'Numbered entry', 240, 56, { text: '01\nList entry', style: { ...TONE.blue, radius: 8, textAlign: 'left' }, keywords: 'list item step' }),
      item('info.chevronStart', 'Roadmap start', 150, 56, { text: 'Phase 1', style: { ...solidTone('teal'), bold: true }, keywords: 'chevron arrow step process' }),
      item('info.chevron', 'Roadmap step', 150, 56, { text: 'Phase 2', style: { ...solidTone('blue'), bold: true }, keywords: 'chevron arrow step process' }),
      item('info.chevron', 'Roadmap step (soft)', 150, 56, { text: 'Phase 3', style: { ...TONE.indigo, bold: true }, keywords: 'chevron arrow step process' }),
      item('info.arrowStep', 'Step (down arrow)', 120, 100, { text: 'Step', style: { ...solidTone('violet'), radius: 6, bold: true }, keywords: 'process vertical' }),
      item('info.banner', 'Callout banner', 180, 70, { text: 'Callout', style: { ...solidTone('amber'), radius: 10, bold: true }, keywords: 'speech bubble label' }),
      item('info.circleCallout', 'Circle callout', 90, 90, { text: 'Hi!', style: { ...TONE.pink, bold: true }, keywords: 'speech bubble' }),
      item('info.ring25', 'Progress 25%', 90, 90, { text: '25%', style: { ...TONE.white, stroke: TONE.red.stroke, bold: true, fontSize: 16 }, keywords: 'percent donut gauge kpi' }),
      item('info.ring50', 'Progress 50%', 90, 90, { text: '50%', style: { ...TONE.white, stroke: TONE.amber.stroke, bold: true, fontSize: 16 }, keywords: 'percent donut gauge kpi' }),
      item('info.ring75', 'Progress 75%', 90, 90, { text: '75%', style: { ...TONE.white, stroke: TONE.blue.stroke, bold: true, fontSize: 16 }, keywords: 'percent donut gauge kpi' }),
      item('info.ring90', 'Progress 90%', 90, 90, { text: '90%', style: { ...TONE.white, stroke: TONE.green.stroke, bold: true, fontSize: 16 }, keywords: 'percent donut gauge kpi' }),
      item('triangle', 'Pyramid top', 100, 60, { style: { ...solidTone('indigo') }, keywords: 'apex' }),
      item('info.level', 'Pyramid level', 200, 50, { text: 'Level', style: { ...solidTone('blue'), radius: 2, bold: true }, keywords: 'trapezoid layer hierarchy' }),
      item('info.funnel', 'Funnel stage', 200, 50, { text: 'Stage', style: { ...solidTone('teal'), radius: 2, bold: true }, keywords: 'trapezoid sales conversion' }),
      item('info.stat', 'Stat card', 150, 100, { text: '42%\nGrowth this year', style: { ...TONE.white, stroke: TONE.indigo.stroke, radius: 10 }, keywords: 'kpi metric number' }),
      item('info.flag', 'Milestone flag', 44, 64, { text: 'Launch', style: { fill: TONE.red.stroke, stroke: TONE.red.stroke }, keywords: 'goal finish' }),
      item('info.pin', 'Map pin', 40, 56, { text: 'Location', style: { fill: TONE.red.stroke, stroke: TONE.red.stroke }, keywords: 'marker location place' }),
      item('info.shield', 'Shield badge', 80, 92, { text: 'A+', style: { ...solidTone('green'), bold: true, fontSize: 20 }, keywords: 'security award emblem' }),
      ...ICONS.map(([kind, label], i) =>
        item(kind, `${label} icon`, 64, 64, {
          style: solidTone((['amber', 'red', 'green', 'violet', 'blue', 'orange'] as const)[i]),
          keywords: 'icon circle infographic',
        }),
      ),
    ],
  },
];

export { shapes, libraries };
