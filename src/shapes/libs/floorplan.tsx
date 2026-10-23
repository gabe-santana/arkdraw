/**
 * Floorplan library (draw.io "Floorplan" parity): walls, openings, and
 * top-down furniture & fixtures in a clean architectural style.
 */
import type { ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import { Body, Detail } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Ink, Label, Tint, circleD, ellipseD, f, ink, item, pathOf, roundRectD, shape, solid } from './_kit2';

type R = (ctx: ShapeRenderContext) => ReactNode;

const WALL = '#334155';
const FURN = { fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 };

const B = ({ d, s }: { d: string; s: ElementStyle }) => <Body d={d} s={solid(s)} />;
/** Fine detail line (1px-ish, solid). */
const Fine = ({ d, s, k = 0.8 }: { d: string; s: ElementStyle; k?: number }) => <Detail d={d} s={solid(s, k)} />;
const dashed = (s: ElementStyle): ElementStyle => ({ ...solid(s, 0.75), strokeStyle: 'dashed' });
const rect = (x: number, y: number, w: number, h: number, r = 0) => roundRectD(x, y, Math.max(0, w), Math.max(0, h), r);

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

const wall: R = ({ w, h, style: s }) => <Body d={rect(0, 0, w, h)} s={{ ...solid(s), fill: s.fill === 'none' ? ink(s) : s.fill }} />;

const wallCorner: R = ({ w, h, style: s }) => {
  const t = Math.min(10, w / 2, h / 2);
  return <Body d={pathOf([[0, 0], [w, 0], [w, t], [t, t], [t, h], [0, h]])} s={{ ...solid(s), fill: s.fill === 'none' ? ink(s) : s.fill }} />;
};

const room: R = ({ w, h, style: s }) => {
  const t = Math.min(8, w / 4, h / 4);
  return (
    <>
      <path d={rect(0, 0, w, h)} fill={s.fill === 'none' ? 'none' : s.fill} stroke="none" />
      <path d={`${rect(0, 0, w, h)} ${rect(t, t, w - t * 2, h - t * 2)}`} fill={ink(s)} fillRule="evenodd" stroke="none" />
    </>
  );
};

/** Single door: hinge bottom-left, leaf open at 90°, dashed swing arc. */
const door: R = ({ w, h, style: s }) => {
  const r = Math.min(w, h);
  const t = Math.max(2, r * 0.05);
  return (
    <>
      <Detail s={dashed(s)} d={`M${f(r)},${h} A${f(r)},${f(r)} 0 0 0 0,${f(h - r)}`} />
      <Fine s={s} d={`M0,${h} H${f(r)}`} k={0.6} />
      <B s={{ ...s, fill: '#ffffff' }} d={rect(0, h - r, t, r)} />
    </>
  );
};

const doubleDoor: R = ({ w, h, style: s }) => {
  const r = Math.min(w / 2, h);
  const t = Math.max(2, r * 0.05);
  return (
    <>
      <Detail s={dashed(s)} d={`M${f(r)},${h} A${f(r)},${f(r)} 0 0 0 0,${f(h - r)} M${f(w - r)},${h} A${f(r)},${f(r)} 0 0 1 ${w},${f(h - r)}`} />
      <Fine s={s} d={`M0,${h} H${w}`} k={0.6} />
      <B s={{ ...s, fill: '#ffffff' }} d={rect(0, h - r, t, r)} />
      <B s={{ ...s, fill: '#ffffff' }} d={rect(w - t, h - r, t, r)} />
    </>
  );
};

const slidingDoor: R = ({ w, h, style: s }) => (
  <>
    <Line2 s={s} d={`M0,0 V${h} M${w},0 V${h}`} k={1.6} />
    <B s={{ ...s, fill: '#ffffff' }} d={rect(0, h * 0.18, w * 0.56, h * 0.32)} />
    <B s={{ ...s, fill: '#ffffff' }} d={rect(w * 0.44, h * 0.5, w * 0.56, h * 0.32)} />
  </>
);

const windowShape: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={rect(0, 0, w, h)} />
    <Fine s={s} d={`M0,${f(h * 0.38)} H${w} M0,${f(h * 0.62)} H${w}`} k={0.6} />
  </>
);

const opening: R = ({ w, h, style: s }) => (
  <>
    <Detail s={dashed(s)} d={`M0,0 H${w} M0,${h} H${w}`} />
    <Line2 s={s} d={`M0,0 V${h} M${w},0 V${h}`} k={2} />
  </>
);

/** Solid line helper with butt caps. */
const Line2 = ({ d, s, k = 1 }: { d: string; s: ElementStyle; k?: number }) => <path d={d} fill="none" stroke={ink(s)} strokeWidth={solid(s, k).strokeWidth} strokeLinecap="butt" />;

const stairs: R = ({ w, h, style: s }) => {
  const n = Math.max(4, Math.round(h / 16));
  const step = h / n;
  let treads = '';
  for (let i = 1; i < n; i++) treads += ` M0,${f(step * i)} H${w}`;
  const ax = w / 2;
  const hs = Math.min(w * 0.18, 8);
  return (
    <>
      <B s={s} d={rect(0, 0, w, h)} />
      <Fine s={s} d={treads} k={0.7} />
      <Fine s={s} d={`M${f(ax)},${f(h - step * 0.5)} V${f(step * 0.6)}`} />
      <Ink s={s} d={pathOf([[ax, step * 0.25], [ax + hs * 0.6, step * 0.25 + hs], [ax - hs * 0.6, step * 0.25 + hs]])} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

const bed = (double: boolean): R => ({ w, h, style: s }) => {
  const m = Math.min(w, h) * 0.06;
  const ph = h * 0.14;
  const fold = h * 0.3;
  const pillows = double ? [[m, (w - m * 3) / 2], [m * 2 + (w - m * 3) / 2, (w - m * 3) / 2]] : [[m * 1.5, w - m * 3]];
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, 3)} />
      {pillows.map(([x, pw], i) => (
        <B key={i} s={{ ...s, fill: '#ffffff' }} d={rect(x, m, pw, ph, ph * 0.3)} />
      ))}
      <Tint s={s} k={0.1} d={rect(0, fold, w, h - fold, 0)} />
      <Fine s={s} d={`M0,${f(fold)} H${w} M0,${f(fold + h * 0.08)} H${w}`} k={0.6} />
    </>
  );
};

const sofa = (seats: number): R => ({ w, h, style: s }) => {
  const back = h * 0.26;
  const arm = Math.min(w * 0.12, h * 0.3);
  const cw = (w - arm * 2) / seats;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, 4)} />
      <Tint s={s} k={0.08} d={`${rect(0, 0, w, back, 4)}`} />
      <Fine s={s} d={`M${f(arm)},${f(back)} H${f(w - arm)} M${f(arm)},${f(back)} V${h} M${f(w - arm)},${f(back)} V${h}`} />
      {Array.from({ length: seats }, (_, i) => (
        <B key={i} s={{ ...s, fill: '#ffffff' }} d={rect(arm + cw * i + 1.5, back + 1.5, cw - 3, h - back - 4, 3)} />
      ))}
    </>
  );
};

/** A chair seen from above, back edge on top, fitted to (x, y, w, h). */
function chairD(x: number, y: number, w: number, h: number) {
  return { seat: rect(x, y + h * 0.22, w, h * 0.78, Math.min(w, h) * 0.18), back: rect(x, y, w, h * 0.24, h * 0.1) };
}
const Chair = ({ x, y, w, h, s, rot = 0, cx = 0, cy = 0 }: { x: number; y: number; w: number; h: number; s: ElementStyle; rot?: number; cx?: number; cy?: number }) => {
  const c = chairD(x, y, w, h);
  return (
    <g transform={rot ? `rotate(${rot} ${f(cx)} ${f(cy)})` : undefined}>
      <B s={{ ...s, fill: '#ffffff' }} d={c.seat} />
      <B s={s} d={c.back} />
    </g>
  );
};

const tableRect: R = ({ w, h, style: s }) => {
  const c = Math.min(w, h) * 0.2;
  const tw = w - c * 2;
  const th = h - c * 2;
  const cw = Math.min(tw * 0.3, c * 1.4);
  const xs = [c + tw * 0.28 - cw / 2, c + tw * 0.72 - cw / 2];
  const ch = Math.min(th * 0.4, cw);
  return (
    <>
      {xs.map((x, i) => (
        <Chair key={`t${i}`} x={x} y={0} w={cw} h={c * 1.15} s={s} />
      ))}
      {xs.map((x, i) => (
        <Chair key={`b${i}`} x={x} y={h - c * 1.15} w={cw} h={c * 1.15} s={s} rot={180} cx={x + cw / 2} cy={h - (c * 1.15) / 2} />
      ))}
      <Chair x={c * 0.575 - ch / 2} y={h / 2 - (c * 1.15) / 2} w={ch} h={c * 1.15} s={s} rot={-90} cx={c * 0.575} cy={h / 2} />
      <Chair x={w - c * 0.575 - ch / 2} y={h / 2 - (c * 1.15) / 2} w={ch} h={c * 1.15} s={s} rot={90} cx={w - c * 0.575} cy={h / 2} />
      <B s={s} d={rect(c, c, tw, th, 3)} />
    </>
  );
};

const tableRound: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const m = Math.min(w, h);
  const c = m * 0.2;
  const r = m / 2 - c * 0.85;
  const cw = c * 1.25;
  return (
    <>
      {[0, 90, 180, 270].map((rot) => (
        <Chair key={rot} x={cx - cw / 2} y={cy - m / 2} w={cw} h={c * 1.2} s={s} rot={rot} cx={cx} cy={cy} />
      ))}
      <B s={s} d={circleD(cx, cy, r)} />
    </>
  );
};

const armchair: R = ({ w, h, style: s }) => {
  const back = h * 0.26;
  const arm = w * 0.18;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, Math.min(w, h) * 0.12)} />
      <Tint s={s} k={0.08} d={rect(0, 0, w, back, Math.min(w, h) * 0.12)} />
      <B s={{ ...s, fill: '#ffffff' }} d={rect(arm, back, w - arm * 2, h - back - 3, 3)} />
    </>
  );
};

const desk: R = ({ w, h, style: s }) => {
  const dh = h * 0.55;
  const cw = Math.min(w * 0.36, h * 0.42);
  const cx = w / 2;
  return (
    <>
      <Chair x={cx - cw / 2} y={h - cw * 1.05} w={cw} h={cw * 1.05} s={s} rot={180} cx={cx} cy={h - (cw * 1.05) / 2} />
      <B s={s} d={rect(0, 0, w, dh, 2)} />
      <B s={{ ...s, fill: '#ffffff' }} d={rect(cx - w * 0.2, dh * 0.18, w * 0.4, dh * 0.14, 1.5)} />
      <Fine s={s} k={0.6} d={rect(cx - w * 0.16, dh * 0.5, w * 0.32, dh * 0.26, 2)} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Bathroom & kitchen
// ---------------------------------------------------------------------------

const toilet: R = ({ w, h, style: s }) => {
  const th = h * 0.26;
  return (
    <>
      <B s={s} d={ellipseD(w / 2, th + (h - th) * 0.48, w * 0.4, (h - th) * 0.5)} />
      <Fine s={s} k={0.7} d={ellipseD(w / 2, th + (h - th) * 0.52, w * 0.26, (h - th) * 0.33)} />
      <B s={s} d={rect(0, 0, w, th, 3)} />
    </>
  );
};

const sink: R = ({ w, h, style: s }) => {
  const m = Math.min(w, h) * 0.14;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, Math.min(w, h) * 0.15)} />
      <Fine s={s} d={ellipseD(w / 2, h * 0.58, w / 2 - m, h * 0.42 - m * 0.6)} />
      <Ink s={s} d={circleD(w / 2, h * 0.12, Math.min(w, h) * 0.05)} />
      <Fine s={s} k={0.6} d={circleD(w / 2, h * 0.6, Math.min(w, h) * 0.05)} />
    </>
  );
};

const bathtub: R = ({ w, h, style: s }) => {
  const m = Math.min(w, h) * 0.1;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, 4)} />
      <Fine s={s} d={rect(m, m, w - m * 2, h - m * 2, Math.min(w, h) * 0.35)} />
      <Fine s={s} k={0.6} d={circleD(w / 2, h - m * 2.4, Math.min(w, h) * 0.05)} />
    </>
  );
};

const shower: R = ({ w, h, style: s }) => {
  const m = Math.min(w, h) * 0.08;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, 2)} />
      <Fine s={s} k={0.5} d={`M${f(m)},${f(m)} L${f(w - m)},${f(h - m)} M${f(w - m)},${f(m)} L${f(m)},${f(h - m)}`} />
      <B s={{ ...s, fill: '#ffffff' }} d={circleD(w / 2, h / 2, Math.min(w, h) * 0.07)} />
    </>
  );
};

const counter: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={rect(0, 0, w, h)} />
    <Fine s={s} k={0.6} d={`M0,${f(h * 0.82)} H${w}`} />
  </>
);

const counterSink: R = ({ w, h, style: s }) => {
  const bw = Math.min(w * 0.22, h * 0.9);
  const x0 = w * 0.62;
  return (
    <>
      <B s={s} d={rect(0, 0, w, h)} />
      <Fine s={s} k={0.6} d={`M0,${f(h * 0.82)} H${w}`} />
      <Fine s={s} d={`${rect(x0, h * 0.14, bw, h * 0.6, 3)} ${rect(x0 + bw + 3, h * 0.14, bw * 0.7, h * 0.6, 3)}`} />
    </>
  );
};

const stove: R = ({ w, h, style: s }) => {
  const m = Math.min(w, h);
  const burners: Array<[number, number, number]> = [
    [0.3, 0.3, 0.16],
    [0.7, 0.3, 0.12],
    [0.3, 0.7, 0.12],
    [0.7, 0.7, 0.16],
  ];
  return (
    <>
      <B s={s} d={rect(0, 0, w, h, 2)} />
      {burners.map(([x, y, r], i) => (
        <g key={i}>
          <Fine s={s} d={circleD(w * x, h * y, m * r)} />
          <Fine s={s} k={0.6} d={circleD(w * x, h * y, m * r * 0.55)} />
        </g>
      ))}
    </>
  );
};

const fridge: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={rect(0, 0, w, h, 2)} />
    <Fine s={s} k={0.6} d={`M0,${f(h * 0.85)} H${w} M${f(w * 0.5)},${f(h * 0.85)} V${h}`} />
    <Label x={w / 2} y={h * 0.44} text="REF" s={s} size={Math.max(7, Math.min(w, h) * 0.18)} bold color={ink(s)} opacity={0.7} />
  </>
);

const plant: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const leaves = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const tip = [cx + ux * r, cy + uy * r];
    const l = [cx + (ux * 0.55 - uy * 0.28) * r, cy + (uy * 0.55 + ux * 0.28) * r];
    const rr2 = [cx + (ux * 0.55 + uy * 0.28) * r, cy + (uy * 0.55 - ux * 0.28) * r];
    return `M${f(cx)},${f(cy)} Q${f(l[0])},${f(l[1])} ${f(tip[0])},${f(tip[1])} Q${f(rr2[0])},${f(rr2[1])} ${f(cx)},${f(cy)} Z`;
  }).join(' ');
  return (
    <>
      <B s={s} d={leaves} />
      <B s={s} d={circleD(cx, cy, r * 0.22)} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const F = 'shape=mxgraph.floorplan.';
const furn = { boxHit: true };
const sym = (kind: string, label: string, drawio: string, render: R, extra: Partial<ShapeDef> = { ...furn }) =>
  shape(`floor.${kind}`, label, `${F}${drawio};html=1;`, render, extra);

export const shapes: ShapeDef[] = [
  sym('wall', 'Wall', 'wall;wallThickness=10', wall),
  sym('wallCorner', 'Wall corner', 'wallCorner;wallThickness=10', wallCorner),
  shape('floor.room', 'Room', 'shape=mxgraph.floorplan.room;html=1;strokeWidth=8;container=1;collapsible=0;', room, {
    container: true,
    textBox: (w, h) => ({ x: 14, y: 12, w: Math.max(1, w - 28), h: Math.max(1, h - 24) }),
  }),
  sym('door', 'Door', 'doorLeft;aspect=fixed', door),
  sym('doubleDoor', 'Double door', 'doorDouble;aspect=fixed', doubleDoor),
  sym('slidingDoor', 'Sliding door', 'doorSlidingGlass', slidingDoor),
  sym('window', 'Window', 'window', windowShape),
  sym('opening', 'Opening', 'doorway', opening),
  sym('stairs', 'Stairs', 'stairs', stairs),
  sym('bedSingle', 'Single bed', 'bed_single', bed(false)),
  sym('bedDouble', 'Double bed', 'bed_double', bed(true)),
  sym('sofa', 'Sofa', 'sofa', sofa(3)),
  sym('loveseat', 'Loveseat', 'couch', sofa(2)),
  sym('armchair', 'Armchair', 'chair', armchair),
  sym('table', 'Dining table', 'table;tableRows=2', tableRect),
  sym('tableRound', 'Round table', 'table_round', tableRound),
  sym('desk', 'Desk & chair', 'office_desk', desk),
  sym('toilet', 'Toilet', 'toilet', toilet),
  sym('sink', 'Sink', 'sink_1', sink),
  sym('bathtub', 'Bathtub', 'bathtub', bathtub),
  sym('shower', 'Shower', 'shower', shower),
  sym('counter', 'Kitchen counter', 'counter', counter),
  sym('counterSink', 'Counter with sink', 'sink_double', counterSink),
  sym('stove', 'Stove / cooktop', 'range_2', stove),
  sym('fridge', 'Refrigerator', 'refrigerator', fridge),
  sym('plant', 'Plant', 'plant', plant),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const wallStyle = { fill: WALL, stroke: WALL, strokeWidth: 1 };
const thin = { fill: '#ffffff', stroke: '#475569', strokeWidth: 1 };
const room2 = {
  fill: '#ffffff', stroke: WALL, strokeWidth: 1, fontSize: 13, bold: true, textColor: '#334155', verticalAlign: 'top' as const,
};

export const libraries: ShapeLibrary[] = [
  {
    id: 'floorplan',
    name: 'Floorplan',
    items: [
      item('floor.wall', 'Wall (horizontal)', 160, 10, { style: wallStyle, keywords: 'partition' }),
      item('floor.wall', 'Wall (vertical)', 10, 160, { style: wallStyle, keywords: 'partition' }),
      item('floor.wallCorner', 'Wall corner', 100, 100, { style: wallStyle, keywords: 'l-shape' }),
      item('floor.room', 'Room', 260, 200, { style: room2, text: 'Room', keywords: 'space area walls' }),
      item('floor.door', 'Door', 80, 80, { style: thin, keywords: 'swing entrance' }),
      item('floor.doubleDoor', 'Double door', 160, 80, { style: thin, keywords: 'french swing entrance' }),
      item('floor.slidingDoor', 'Sliding door', 120, 14, { style: thin, keywords: 'patio glass' }),
      item('floor.window', 'Window', 120, 12, { style: thin, keywords: 'glass glazing' }),
      item('floor.opening', 'Opening', 100, 10, { style: thin, keywords: 'doorway passage' }),
      item('floor.stairs', 'Stairs', 80, 160, { style: thin, keywords: 'staircase steps' }),
      item('floor.bedSingle', 'Single bed', 90, 180, { style: FURN, keywords: 'bedroom furniture' }),
      item('floor.bedDouble', 'Double bed', 150, 180, { style: FURN, keywords: 'bedroom queen king furniture' }),
      item('floor.sofa', 'Sofa', 190, 80, { style: FURN, keywords: 'couch living room' }),
      item('floor.loveseat', 'Loveseat', 130, 80, { style: FURN, keywords: 'couch sofa' }),
      item('floor.armchair', 'Armchair', 80, 80, { style: FURN, keywords: 'chair seat' }),
      item('floor.table', 'Dining table', 160, 120, { style: FURN, keywords: 'table chairs dining' }),
      item('floor.tableRound', 'Round table', 120, 120, { style: FURN, keywords: 'table chairs dining' }),
      item('floor.desk', 'Desk & chair', 140, 110, { style: FURN, keywords: 'office workstation computer' }),
      item('floor.toilet', 'Toilet', 40, 64, { style: FURN, keywords: 'wc bathroom' }),
      item('floor.sink', 'Sink', 56, 44, { style: FURN, keywords: 'basin washbasin bathroom' }),
      item('floor.bathtub', 'Bathtub', 76, 170, { style: FURN, keywords: 'bath tub bathroom' }),
      item('floor.shower', 'Shower', 90, 90, { style: FURN, keywords: 'bathroom' }),
      item('floor.counter', 'Kitchen counter', 180, 60, { style: FURN, keywords: 'worktop cabinet kitchen' }),
      item('floor.counterSink', 'Counter with sink', 180, 60, { style: FURN, keywords: 'kitchen sink' }),
      item('floor.stove', 'Stove', 60, 60, { style: FURN, keywords: 'cooktop range oven hob kitchen' }),
      item('floor.fridge', 'Refrigerator', 70, 70, { style: FURN, keywords: 'fridge kitchen' }),
      item('floor.plant', 'Plant', 50, 50, { style: { fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 1 }, keywords: 'tree pot decor' }),
    ],
  },
];
