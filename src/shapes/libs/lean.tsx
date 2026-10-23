/**
 * Lean / Value Stream Mapping (VSM) symbols.
 */
import { lineHeight } from '@/lib/text';
import { Body, Detail, PAD, RoundRect, inset } from '../kit';
import { TextLines } from '../TextLines';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { FillOnly, Ink, Line, Oval, TONE, arcD, circleD, item, pathOf, shape, solid } from './_kit2';

const lm = (name: string, extra = '') => `shape=mxgraph.lean_mapping.${name};html=1;whiteSpace=wrap;${extra}`;
const below = { textPlacement: 'below' as const };

/** Filled arrow head at `deg` on a circle, pointing in the clockwise direction. */
function headAt(cx: number, cy: number, r: number, deg: number, size: number) {
  const a = (deg * Math.PI) / 180;
  const px = cx + r * Math.cos(a);
  const py = cy + r * Math.sin(a);
  const [tx, ty] = [-Math.sin(a), Math.cos(a)];
  const [nx, ny] = [Math.cos(a), Math.sin(a)];
  return pathOf([
    [px + tx * size, py + ty * size],
    [px + nx * size * 0.65, py + ny * size * 0.65],
    [px - nx * size * 0.65, py - ny * size * 0.65],
  ]);
}

const procHeader = (h: number) => Math.min(h * 0.32, 28);

function DataBox({ w, h, style, text }: ShapeRenderContext) {
  const lines = text ? text.split('\n') : ['', '', '', ''];
  const n = Math.max(1, lines.length);
  const rowH = h / n;
  const lh = lineHeight(style.fontSize);
  const seps = Array.from({ length: n - 1 }, (_, i) => `M0,${(i + 1) * rowH} H${w}`).join(' ');
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={0} />
      {seps && <Detail d={seps} s={{ ...style, strokeStyle: 'solid', strokeWidth: Math.max(0.75, style.strokeWidth * 0.7) }} />}
      {text &&
        lines.map((line, i) => (
          <TextLines key={i} lines={[line]} x={PAD} y={i * rowH + (rowH - lh) / 2} anchor="start" style={style} />
        ))}
    </>
  );
}

export const shapes: ShapeDef[] = [
  shape(
    'vsm.process',
    'Process',
    lm('manufacturing_process'),
    ({ w, h, style }) => (
      <>
        <RoundRect w={w} h={h} s={style} r={0} />
        <Detail d={`M0,${procHeader(h)} H${w}`} s={{ ...style, strokeStyle: 'solid' }} />
      </>
    ),
    { textBox: (w, h) => ({ x: 6, y: 0, w: Math.max(1, w - 12), h: procHeader(h) }) },
  ),
  shape(
    'vsm.factory',
    'Supplier / customer',
    lm('outside_sources'),
    ({ w, h, style }) => (
      <Body
        s={style}
        d={pathOf([[0, h], [0, h * 0.3], [w / 3, 0], [w / 3, h * 0.3], [(2 * w) / 3, 0], [(2 * w) / 3, h * 0.3], [w, 0], [w, h]])}
      />
    ),
    { textBox: (w, h) => ({ x: 6, y: h * 0.34, w: Math.max(1, w - 12), h: h * 0.62 }) },
  ),
  shape(
    'vsm.inventory',
    'Inventory',
    lm('inventory_box'),
    ({ w, h, style }) => {
      const t = Math.max(1.5, Math.min(w, h) * 0.07);
      const sw = w * 0.22;
      const cx = w / 2;
      return (
        <>
          <Body s={style} d={pathOf([[cx, 0], [w, h], [0, h]])} />
          <Ink
            s={style}
            d={
              `M${cx - sw / 2},${h * 0.4} h${sw} v${t} h${-sw} Z ` +
              `M${cx - t / 2},${h * 0.4} h${t} V${h * 0.86} h${-t} Z ` +
              `M${cx - sw / 2},${h * 0.86 - t} h${sw} v${t} h${-sw} Z`
            }
          />
        </>
      );
    },
    below,
  ),
  shape(
    'vsm.pushArrow',
    'Push arrow',
    lm('push_arrow'),
    ({ w, h, style }) => {
      const hl = Math.min(w * 0.3, h * 0.9);
      const bh = h * 0.5;
      const y0 = (h - bh) / 2;
      const outline = pathOf([[0, y0], [w - hl, y0], [w - hl, 0], [w, h / 2], [w - hl, h], [w - hl, y0 + bh], [0, y0 + bh]]);
      const bodyW = w - hl;
      const n = Math.max(3, Math.round(bodyW / Math.max(6, h * 0.28)));
      const sw = bodyW / n;
      const stripes = Array.from({ length: n }, (_, i) => i)
        .filter((i) => i % 2 === 0)
        .map((i) => `M${i * sw},${y0} h${sw} v${bh} h${-sw} Z`)
        .join(' ');
      return (
        <>
          <FillOnly d={outline} s={style} />
          <Ink s={style} d={stripes} />
          <Detail d={outline} s={style} />
        </>
      );
    },
    below,
  ),
  shape(
    'vsm.pullArrow',
    'Pull arrow',
    lm('physical_pull'),
    ({ w, h, style }) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.36;
      return (
        <>
          <Line s={style} k={1.4} d={arcD(cx, cy, r, r, -40, 210)} />
          <Ink s={style} d={headAt(cx, cy, r, 210, Math.min(w, h) * 0.22)} />
        </>
      );
    },
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.kaizen',
    'Kaizen burst',
    lm('kaizen_lightening_burst'),
    ({ w, h, style }) => {
      const n = 12;
      const pts = Array.from({ length: n * 2 }, (_, i) => {
        const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
        const k = i % 2 ? 0.7 : i % 4 === 0 ? 1 : 0.88;
        return [w / 2 + (w / 2) * k * Math.cos(a), h / 2 + (h / 2) * k * Math.sin(a)] as const;
      });
      return <Body s={style} d={pathOf(pts)} />;
    },
    { textBox: (w, h) => ({ x: w * 0.22, y: h * 0.26, w: w * 0.56, h: h * 0.48 }) },
  ),
  shape(
    'vsm.operator',
    'Operator',
    lm('operator'),
    ({ w, h, style }) => {
      const r = Math.min(w * 0.22, h * 0.22);
      return (
        <>
          <Body s={style} d={`M0,${h} A${w / 2},${h * 0.52} 0 0 1 ${w},${h} Z`} />
          <Oval cx={w / 2} cy={r + 1} rx={r} s={style} />
        </>
      );
    },
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.truck',
    'Truck shipment',
    lm('truck_shipment'),
    ({ w, h, style }) => {
      const wr = Math.min(w, h) * 0.12;
      const wy = h - wr - 1;
      const wheel = { ...solid(style), fill: '#ffffff' };
      return (
        <>
          <Body s={style} d={pathOf([[0, h * 0.06], [w * 0.68, h * 0.06], [w * 0.68, wy], [0, wy]])} />
          <Body s={style} d={pathOf([[w * 0.71, wy], [w * 0.71, h * 0.3], [w * 0.86, h * 0.3], [w, h * 0.52], [w, wy]])} />
          <Line s={style} k={0.8} d={`M${w * 0.78},${h * 0.36} V${h * 0.5} H${w * 0.93}`} />
          {[w * 0.15, w * 0.52, w * 0.86].map((x) => (
            <Oval key={x} cx={x} cy={wy} rx={wr} s={wheel} />
          ))}
        </>
      );
    },
    { textBox: (w, h) => ({ x: 4, y: h * 0.08, w: Math.max(1, w * 0.68 - 8), h: h * 0.62 }) },
  ),
  shape('vsm.dataBox', 'Data box', lm('data_box'), DataBox, { textPlacement: 'custom' }),
  shape(
    'vsm.supermarket',
    'Supermarket',
    lm('supermarket'),
    ({ w, h, style }) => (
      <>
        <FillOnly d={pathOf([[0, 0], [w, 0], [w, h], [0, h]])} s={style} />
        <Line s={style} d={`M0,0 H${w} V${h} H0 M0,${h / 3} H${w} M0,${(2 * h) / 3} H${w}`} cap="butt" />
      </>
    ),
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.fifo',
    'FIFO lane',
    lm('fifo_lane'),
    ({ w, h, style }) => (
      <>
        <FillOnly d={pathOf([[0, 0], [w, 0], [w, h], [0, h]])} s={style} />
        <Line s={style} d={`M0,0 H${w} M0,${h} H${w}`} cap="butt" />
      </>
    ),
    { boxHit: true, textBox: (w, h) => inset(w, h, 6, 3) },
  ),
  shape(
    'vsm.buffer',
    'Buffer / safety stock',
    lm('buffer_or_safety_stock'),
    ({ w, h, style }) => {
      const t = h / 3;
      return (
        <>
          <FillOnly d={pathOf([[0, 0], [w, 0], [w, h], [0, h]])} s={style} />
          <Line s={style} d={`M${w},0 H0 V${h} H${w} M0,${t} H${w} M0,${2 * t} H${w}`} cap="butt" />
        </>
      );
    },
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.signalKanban',
    'Signal kanban',
    lm('signal_kanban'),
    ({ w, h, style }) => <Body s={style} d={pathOf([[0, 0], [w, 0], [w / 2, h]])} />,
    { textBox: (w, h) => ({ x: w * 0.2, y: 3, w: w * 0.6, h: h * 0.45 }) },
  ),
  shape(
    'vsm.productionKanban',
    'Production kanban',
    lm('production_kanban'),
    ({ w, h, style }) => {
      const c = Math.min(w, h) * 0.28;
      return <Body s={style} d={pathOf([[0, 0], [w - c, 0], [w, c], [w, h], [0, h]])} />;
    },
    { textBox: (w, h) => inset(w, h, 5, 5) },
  ),
  shape(
    'vsm.withdrawalKanban',
    'Withdrawal kanban',
    lm('withdrawal_kanban'),
    ({ w, h, style }) => {
      const c = Math.min(w, h) * 0.28;
      const r = Math.min(w, h) * 0.07;
      return (
        <>
          <Body s={style} d={pathOf([[0, 0], [w - c, 0], [w, c], [w, h], [0, h]])} />
          <Line s={style} k={0.8} d={circleD(w * 0.2, h * 0.78, r) + circleD(w * 0.38, h * 0.78, r)} />
        </>
      );
    },
    { textBox: (w, h) => ({ x: 5, y: 4, w: Math.max(1, w - 10), h: h * 0.6 }) },
  ),
  shape(
    'vsm.kanbanPost',
    'Kanban post',
    lm('kanban_post'),
    ({ w, h, style }) => (
      <>
        <Body s={style} d={pathOf([[w * 0.12, 0], [w * 0.88, 0], [w * 0.88, h * 0.42], [w * 0.12, h * 0.42]])} />
        <Line s={style} d={`M${w * 0.12},${h * 0.14} H${w * 0.88} M${w / 2},${h * 0.42} V${h} M${w * 0.2},${h} H${w * 0.8}`} />
      </>
    ),
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.goSee',
    'Go see',
    lm('go_see_production_scheduling'),
    ({ w, h, style }) => {
      const r = Math.min(w * 0.2, h * 0.36);
      const cy = h * 0.58;
      const [c1, c2] = [w * 0.28, w * 0.72];
      return (
        <>
          <Line
            s={style}
            d={`M${c1 + r},${cy} Q${w / 2},${cy - r * 0.6} ${c2 - r},${cy} M${c1 - r},${cy - r * 0.2} L${w * 0.02},${cy - r * 1.1} M${c2 + r},${cy - r * 0.2} L${w * 0.98},${cy - r * 1.1}`}
          />
          <Oval cx={c1} cy={cy} rx={r} s={style} />
          <Oval cx={c2} cy={cy} rx={r} s={style} />
        </>
      );
    },
    { boxHit: true, ...below },
  ),
  shape(
    'vsm.loadLeveling',
    'Load leveling',
    lm('load_leveling'),
    ({ w, h, style }) => {
      const cw = w / 4;
      const z = Math.min(cw, h) * 0.26;
      const cy = h / 2;
      const glyphs = [0, 1, 2, 3]
        .map((i) => {
          const cx = cw * (i + 0.5);
          return i % 2
            ? circleD(cx, cy, z)
            : `M${cx - z},${cy - z} L${cx + z},${cy + z} M${cx + z},${cy - z} L${cx - z},${cy + z}`;
        })
        .join(' ');
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Line s={style} k={1.1} d={glyphs} />
        </>
      );
    },
    below,
  ),
  shape(
    'vsm.timeline',
    'Timeline segment',
    lm('timeline'),
    ({ w, h, style }) => <Line s={style} d={`M0,${h * 0.1} H${w / 2} V${h * 0.9} H${w}`} cap="butt" />,
    { boxHit: true, textBox: (w, h) => ({ x: 2, y: h * 0.15, w: Math.max(1, w / 2 - 4), h: h * 0.7 }) },
  ),
];

const kaizen = { fill: TONE.amber.fill, stroke: TONE.amber.stroke, textColor: '#78350f', fontSize: 12 };
const small = { fontSize: 12 };

export const libraries: ShapeLibrary[] = [
  {
    id: 'lean',
    name: 'Lean / Value Stream',
    items: [
      item('vsm.process', 'Process', 120, 90, { text: 'Process', style: { ...small, bold: true }, keywords: 'vsm lean manufacturing process' }),
      item('vsm.process', 'Production control', 140, 80, {
        text: 'Production Control',
        style: { ...small, bold: true },
        keywords: 'vsm lean planning mrp',
      }),
      item('vsm.factory', 'Supplier', 120, 80, { text: 'Supplier', style: small, keywords: 'vsm lean outside source factory' }),
      item('vsm.factory', 'Customer', 120, 80, { text: 'Customer', style: small, keywords: 'vsm lean outside source factory' }),
      item('vsm.dataBox', 'Data box', 120, 80, {
        text: 'C/T = 45 s\nC/O = 30 min\nUptime = 85%\nShifts = 2',
        style: { fontSize: 11, textAlign: 'left', verticalAlign: 'top' },
        keywords: 'vsm lean data cycle time',
      }),
      item('vsm.inventory', 'Inventory', 60, 52, { style: { fill: TONE.amber.fill, ...small }, keywords: 'vsm lean inventory triangle stock' }),
      item('vsm.pushArrow', 'Push arrow', 140, 40, { keywords: 'vsm lean push material flow' }),
      item('vsm.pullArrow', 'Pull arrow', 56, 56, { keywords: 'vsm lean pull circular' }),
      item('vsm.supermarket', 'Supermarket', 50, 60, { style: small, keywords: 'vsm lean supermarket pull stock' }),
      item('vsm.fifo', 'FIFO lane', 120, 30, { text: 'FIFO', style: { ...small, bold: true }, keywords: 'vsm lean first in first out' }),
      item('vsm.buffer', 'Buffer / safety stock', 40, 60, { style: small, keywords: 'vsm lean buffer safety stock' }),
      item('vsm.truck', 'Truck shipment', 110, 64, { style: small, keywords: 'vsm lean shipment truck delivery' }),
      item('vsm.operator', 'Operator', 44, 44, { style: { fill: TONE.slate.fill, ...small }, keywords: 'vsm lean operator person worker' }),
      item('vsm.kaizen', 'Kaizen burst', 130, 90, { text: 'Kaizen', style: kaizen, keywords: 'vsm lean kaizen improvement burst' }),
      item('vsm.productionKanban', 'Production kanban', 60, 44, { style: small, keywords: 'vsm lean kanban card production' }),
      item('vsm.withdrawalKanban', 'Withdrawal kanban', 60, 44, { style: small, keywords: 'vsm lean kanban card withdrawal' }),
      item('vsm.signalKanban', 'Signal kanban', 56, 48, { style: small, keywords: 'vsm lean kanban signal triangle' }),
      item('vsm.kanbanPost', 'Kanban post', 44, 60, { style: small, keywords: 'vsm lean kanban post' }),
      item('vsm.loadLeveling', 'Load leveling', 100, 30, { style: small, keywords: 'vsm lean heijunka load leveling xoxo' }),
      item('vsm.goSee', 'Go see', 70, 36, { style: small, keywords: 'vsm lean go see glasses scheduling' }),
      item('vsm.timeline', 'Timeline segment', 120, 50, { style: small, keywords: 'vsm lean timeline lead time value added' }),
    ],
  },
];
