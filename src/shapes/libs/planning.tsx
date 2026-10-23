/**
 * Planning & business helpers: Venn sets, Kanban boards, org charts,
 * timelines and Gantt bars.
 */
import type { ElementStyle } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { Body, Detail, RoundRect, fillOf, inset, strokeAttrs, topRounded } from '../kit';
import { TextLines } from '../TextLines';
import type { ShapeDef, ShapeLibrary } from '../types';
import { Ink, Label, Line, Oval, TONE, Tint, ink, item, pathOf, roundRectD, shape, solidTone } from './_kit2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Translucent circle used by the composite Venn shapes. */
const SetCircle = ({ cx, cy, r, s }: { cx: number; cy: number; r: number; s: ElementStyle }) => (
  <circle cx={cx} cy={cy} r={Math.max(0, r)} fill={fillOf(s)} fillOpacity={0.22} {...strokeAttrs(s)} />
);

/** Person silhouette (head + shoulders) inside a circle of radius r. */
function Avatar({ cx, cy, r, s }: { cx: number; cy: number; r: number; s: ElementStyle }) {
  const c = ink(s);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.12} stroke={c} strokeOpacity={0.35} strokeWidth={1} />
      <circle cx={cx} cy={cy - r * 0.22} r={r * 0.32} fill={c} fillOpacity={0.55} />
      <path
        d={`M${cx - r * 0.62},${cy + r * 0.62} C${cx - r * 0.55},${cy + r * 0.18} ${cx - r * 0.25},${cy + r * 0.12} ${cx},${cy + r * 0.12} C${cx + r * 0.25},${cy + r * 0.12} ${cx + r * 0.55},${cy + r * 0.18} ${cx + r * 0.62},${cy + r * 0.62} Z`}
        fill={c}
        fillOpacity={0.55}
      />
    </>
  );
}

/** "Name\nRole…" block: bold first line, smaller rest, centred vertically in the box. */
function NameRole({ x, y, w, h, text, s, anchor }: { x: number; y: number; w: number; h: number; text: string; s: ElementStyle; anchor: 'start' | 'middle' }) {
  const [name = '', ...rest] = text.split('\n');
  const nameS = { ...s, bold: true };
  const roleS = { ...s, bold: false, fontSize: Math.max(9, s.fontSize - 2) };
  const a = name ? wrapText(name, w, nameS) : [];
  const b = rest.length ? wrapText(rest.join('\n'), w, roleS) : [];
  const ha = a.length * lineHeight(nameS.fontSize);
  const total = ha + (b.length ? 2 + b.length * lineHeight(roleS.fontSize) : 0);
  const top = y + (h - total) / 2;
  const tx = anchor === 'middle' ? x + w / 2 : x;
  return (
    <>
      <TextLines lines={a} x={tx} y={top} anchor={anchor} style={nameS} bold />
      {b.length > 0 && (
        <g opacity={0.75}>
          <TextLines lines={b} x={tx} y={top + ha + 2} anchor={anchor} style={roleS} />
        </g>
      )}
    </>
  );
}

const ganttBar = (pct: number) => ({ w, h, style }: { w: number; h: number; style: ElementStyle }) => {
  const r = Math.min(style.radius, h / 2);
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <Ink d={roundRectD(0, 0, Math.max(r * 2, w * pct), h, r)} s={style} opacity={0.3} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const shapes: ShapeDef[] = [
  // ----- Venn ---------------------------------------------------------------
  shape(
    'venn.set',
    'Set',
    'ellipse;whiteSpace=wrap;fillOpacity=25;',
    ({ w, h, style }) => <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />,
    { perimeter: 'ellipse', textBox: (w, h) => ({ x: w * 0.15, y: h * 0.2, w: w * 0.7, h: h * 0.6 }) },
  ),
  shape(
    'venn.two',
    'Venn (2 sets)',
    'ellipse;whiteSpace=wrap;fillOpacity=25;',
    ({ w, h, style }) => {
      const r = Math.min(h / 2, w * 0.31);
      return (
        <>
          <SetCircle cx={w / 2 - r * 0.6} cy={h / 2} r={r} s={style} />
          <SetCircle cx={w / 2 + r * 0.6} cy={h / 2} r={r} s={style} />
        </>
      );
    },
    {
      textBox: (w, h) => {
        const r = Math.min(h / 2, w * 0.31);
        return { x: w / 2 - r * 0.38, y: h / 2 - r * 0.6, w: r * 0.76, h: r * 1.2 };
      },
    },
  ),
  shape(
    'venn.three',
    'Venn (3 sets)',
    'ellipse;whiteSpace=wrap;fillOpacity=25;',
    ({ w, h, style }) => {
      const r = Math.min(w / 3.1, h / 2.95);
      const d = r * 0.62;
      const cy = h / 2 - r * 0.16;
      return (
        <>
          <SetCircle cx={w / 2 - d * 0.866} cy={cy - d * 0.5} r={r} s={style} />
          <SetCircle cx={w / 2 + d * 0.866} cy={cy - d * 0.5} r={r} s={style} />
          <SetCircle cx={w / 2} cy={cy + d} r={r} s={style} />
        </>
      );
    },
    {
      textBox: (w, h) => {
        const r = Math.min(w / 3.1, h / 2.95);
        const cy = h / 2 - r * 0.16;
        return { x: w / 2 - r * 0.4, y: cy - r * 0.3, w: r * 0.8, h: r * 0.6 };
      },
    },
  ),
  shape(
    'venn.quadrant',
    '2×2 matrix',
    'shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;',
    ({ w, h, style }) => (
      <>
        <RoundRect w={w} h={h} s={style} />
        <Tint d={`M${w / 2},0 H${w - Math.min(style.radius, w / 4)} Q${w},0 ${w},${Math.min(style.radius, h / 4)} V${h / 2} H${w / 2} Z`} s={style} k={0.08} />
        <Tint d={`M0,${h / 2} H${w / 2} V${h} H${Math.min(style.radius, w / 4)} Q0,${h} 0,${h - Math.min(style.radius, h / 4)} Z`} s={style} k={0.08} />
        <Detail d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} s={{ ...style, strokeStyle: 'solid' }} />
      </>
    ),
    { rounded: true, container: true, textBox: (w, h) => inset(w, h, 8) },
  ),

  // ----- Kanban -------------------------------------------------------------
  shape(
    'kanban.column',
    'Kanban column',
    'swimlane;startSize=40;rounded=1;arcSize=4;container=1;collapsible=0;horizontal=1;align=left;spacingLeft=12;',
    ({ w, h, style, text }) => {
      const H = Math.min(40, h);
      const r = Math.min(style.radius, w / 2, H);
      const [title = '', count = ''] = text.split('\n');
      const pw = Math.max(22, count.length * style.fontSize * 0.6 + 14);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Tint d={topRounded(w, H, r)} s={style} k={0.08} />
          <Detail d={`M0,${H} H${w}`} s={{ ...style, strokeStyle: 'solid', strokeWidth: Math.max(1, style.strokeWidth * 0.75) }} />
          <Label x={14} y={H / 2} text={title} s={style} anchor="start" bold />
          {count && (
            <>
              <Ink d={roundRectD(w - pw - 10, H / 2 - 10, pw, 20, 10)} s={style} opacity={0.14} />
              <Label x={w - pw / 2 - 10} y={H / 2} text={count} s={style} size={Math.max(9, style.fontSize - 2)} bold />
            </>
          )}
        </>
      );
    },
    { rounded: true, container: true, textPlacement: 'custom' },
  ),
  shape(
    'kanban.card',
    'Kanban card',
    'rounded=1;arcSize=8;whiteSpace=wrap;align=left;verticalAlign=top;spacingLeft=14;',
    ({ w, h, style }) => {
      const tag = Math.min(8, h * 0.1);
      const ty = h - 10 - tag;
      const ar = Math.min(9, h * 0.12);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Ink d={roundRectD(6, 7, 4, Math.max(4, h - 14), 2)} s={style} />
          <rect x={16} y={ty} width={Math.min(28, w * 0.18)} height={tag} rx={tag / 2} fill={TONE.blue.stroke} fillOpacity={0.85} />
          <rect x={16 + Math.min(28, w * 0.18) + 5} y={ty} width={Math.min(20, w * 0.14)} height={tag} rx={tag / 2} fill={TONE.amber.stroke} fillOpacity={0.85} />
          <circle cx={w - 10 - ar} cy={h - 8 - ar} r={ar} fill={ink(style)} fillOpacity={0.18} />
          <circle cx={w - 10 - ar} cy={h - 8 - ar - ar * 0.2} r={ar * 0.36} fill={ink(style)} fillOpacity={0.45} />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: 18, y: 8, w: Math.max(1, w - 28), h: Math.max(1, h - 32) }) },
  ),

  // ----- Org chart ----------------------------------------------------------
  shape(
    'org.person',
    'Person card',
    'rounded=1;whiteSpace=wrap;align=left;spacingLeft=56;',
    ({ w, h, style, text }) => {
      const r = Math.min(h * 0.32, w * 0.16);
      const ax = 12 + r;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Avatar cx={ax} cy={h / 2} r={r} s={style} />
          <NameRole x={ax + r + 10} y={4} w={Math.max(1, w - ax - r - 20)} h={h - 8} text={text} s={style} anchor="start" />
        </>
      );
    },
    { rounded: true, textPlacement: 'custom' },
  ),
  shape(
    'org.personTop',
    'Person card (photo top)',
    'rounded=1;whiteSpace=wrap;verticalAlign=bottom;spacingBottom=8;',
    ({ w, h, style, text }) => {
      const r = Math.min(h * 0.22, w * 0.22);
      const top = r;
      return (
        <>
          <RoundRect y={top} w={w} h={h - top} s={style} />
          <circle cx={w / 2} cy={r + 1} r={r + 2} fill={style.fill === 'none' ? '#ffffff' : style.fill} />
          <Avatar cx={w / 2} cy={r + 1} r={r} s={style} />
          <NameRole x={8} y={r * 2 + 6} w={Math.max(1, w - 16)} h={Math.max(1, h - r * 2 - 12)} text={text} s={style} anchor="middle" />
        </>
      );
    },
    { textPlacement: 'custom' },
  ),
  shape(
    'org.unit',
    'Org unit',
    'rounded=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const r = Math.min(style.radius, w / 2, h / 2);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Ink d={topRounded(w, Math.max(5, r), r)} s={style} />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: 8, y: 8, w: Math.max(1, w - 16), h: Math.max(1, h - 12) }) },
  ),

  // ----- Timeline -----------------------------------------------------------
  shape(
    'timeline.milestone',
    'Milestone',
    'rhombus;whiteSpace=wrap;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => {
      const s2 = Math.min(w, h) / 2;
      return (
        <>
          <Line d={`M0,${h / 2} H${w}`} s={style} />
          <Body d={pathOf([[w / 2, h / 2 - s2], [w / 2 + s2, h / 2], [w / 2, h / 2 + s2], [w / 2 - s2, h / 2]])} s={style} />
        </>
      );
    },
    { textPlacement: 'below', boxHit: true },
  ),
  shape(
    'timeline.event',
    'Timeline event',
    'rounded=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const bh = h * 0.56;
      const r = Math.min(6, w * 0.06, h * 0.06);
      return (
        <>
          <Line d={`M${w / 2},${bh} V${h - r * 2}`} s={style} />
          <circle cx={w / 2} cy={h - r - style.strokeWidth / 2} r={r} fill={ink(style)} stroke="#ffffff" strokeWidth={1.5} />
          <RoundRect w={w} h={bh} s={style} />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => inset(w, h * 0.56, 8, 4) },
  ),
  shape(
    'timeline.axis',
    'Timeline axis',
    'endArrow=block;html=1;shape=mxgraph.arrows2.arrow;',
    ({ w, h, style }) => {
      const y = h / 2;
      const a = Math.min(10, w * 0.08);
      const n = Math.max(2, Math.round((w - a) / 50));
      const step = (w - a * 2) / n;
      let ticks = '';
      for (let i = 0; i <= n; i++) ticks += `M${a / 2 + step * i},${y - 5} V${y + 5} `;
      return (
        <>
          <Line d={`M0,${y} H${w - a}`} s={style} k={1.3} />
          <Line d={ticks} s={style} />
          <Ink d={pathOf([[w - a * 1.2, y - a * 0.55], [w, y], [w - a * 1.2, y + a * 0.55]])} s={style} />
        </>
      );
    },
    { textPlacement: 'below', boxHit: true },
  ),
  shape(
    'timeline.span',
    'Period span',
    'shape=partialRectangle;top=0;whiteSpace=wrap;verticalAlign=top;',
    ({ w, h, style }) => {
      const y = h * 0.8;
      return <Line d={`M1,${h * 0.6} V${h} M1,${y} H${w - 1} M${w - 1},${h * 0.6} V${h}`} s={style} />;
    },
    { boxHit: true, textBox: (w, h) => ({ x: 0, y: 0, w, h: h * 0.62 }) },
  ),

  // ----- Gantt --------------------------------------------------------------
  ...([25, 50, 75] as const).map((p) =>
    shape(`gantt.bar${p}`, `Task bar ${p}%`, 'rounded=1;arcSize=30;whiteSpace=wrap;align=left;spacingLeft=8;', ganttBar(p / 100), {
      rounded: true,
      textBox: (w: number, h: number) => inset(w, h, 8, 2),
    }),
  ),
  shape(
    'gantt.milestone',
    'Gantt milestone',
    'rhombus;whiteSpace=wrap;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => <Body d={pathOf([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])} s={style} />,
    { perimeter: 'diamond', textPlacement: 'below' },
  ),
  shape(
    'gantt.summary',
    'Summary bar',
    'shape=mxgraph.lean_mapping.timeline2;verticalLabelPosition=top;verticalAlign=bottom;',
    ({ w, h, style }) => {
      const e = Math.min(h * 0.7, w * 0.1);
      return <Body d={pathOf([[0, 0], [w, 0], [w, h], [w - e, h * 0.55], [e, h * 0.55], [0, h]])} s={style} />;
    },
    { textPlacement: 'below', boxHit: true },
  ),
  shape(
    'gantt.today',
    'Today marker',
    'line;strokeWidth=2;direction=south;dashed=1;html=1;',
    ({ w, h, style }) => {
      const ph = Math.min(18, h * 0.2);
      return (
        <>
          <Detail d={`M${w / 2},${ph} V${h}`} s={{ ...style, strokeStyle: 'dashed', stroke: ink(style) }} />
          <Body d={roundRectD(0, 0, w, ph, ph / 2)} s={style} />
        </>
      );
    },
    { boxHit: true, textBox: (w, h) => ({ x: 0, y: 0, w, h: Math.min(18, h * 0.2) }) },
  ),
  shape(
    'gantt.scale',
    'Time scale',
    'shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;',
    ({ w, h, style }) => {
      const n = Math.max(1, Math.round(w / 48));
      let d = '';
      for (let i = 1; i < n; i++) d += `M${(w / n) * i},0 V${h} `;
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          {d && <Detail d={d} s={{ ...style, strokeStyle: 'solid', strokeWidth: Math.max(0.75, style.strokeWidth * 0.6) }} />}
        </>
      );
    },
    { textBox: (w, h) => inset(w, h, 6, 2) },
  ),
];

// ---------------------------------------------------------------------------
// Libraries
// ---------------------------------------------------------------------------

const translucent = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const vennSet = (k: keyof typeof TONE) => ({ fill: translucent(TONE[k].stroke, 0.2), stroke: TONE[k].stroke, bold: true });
const left: Partial<ElementStyle> = { textAlign: 'left', verticalAlign: 'top' };

const libraries: ShapeLibrary[] = [
  {
    id: 'venn',
    name: 'Venn & Matrix',
    items: [
      item('venn.set', 'Set (blue)', 140, 140, { text: 'A', style: vennSet('blue'), keywords: 'circle venn translucent' }),
      item('venn.set', 'Set (pink)', 140, 140, { text: 'B', style: vennSet('pink'), keywords: 'circle venn translucent' }),
      item('venn.set', 'Set (amber)', 140, 140, { text: 'C', style: vennSet('amber'), keywords: 'circle venn translucent' }),
      item('venn.set', 'Set (green)', 140, 140, { text: 'D', style: vennSet('green'), keywords: 'circle venn translucent' }),
      item('venn.two', 'Venn (2 sets)', 220, 140, { text: 'A ∩ B', style: { fill: TONE.indigo.stroke, stroke: TONE.indigo.stroke, bold: true, fontSize: 12 }, keywords: 'intersection overlap' }),
      item('venn.three', 'Venn (3 sets)', 200, 190, { text: 'All', style: { fill: TONE.teal.stroke, stroke: TONE.teal.stroke, bold: true, fontSize: 12 }, keywords: 'intersection overlap' }),
      item('venn.quadrant', '2×2 matrix', 200, 200, { style: { ...TONE.white, stroke: TONE.slate.stroke, radius: 8 }, keywords: 'swot quadrant grid eisenhower' }),
    ],
  },
  {
    id: 'kanban',
    name: 'Kanban',
    items: [
      item('kanban.column', 'Column', 220, 360, { text: 'To do\n3', style: { fill: '#f8fafc', stroke: '#cbd5e1', textColor: '#334155', radius: 12, fontSize: 13 }, keywords: 'board lane list scrum' }),
      item('kanban.column', 'Column (in progress)', 220, 360, { text: 'In progress\n2', style: { fill: '#eff6ff', stroke: TONE.blue.stroke, textColor: '#1e3a8a', radius: 12, fontSize: 13 }, keywords: 'board lane doing' }),
      item('kanban.column', 'Column (done)', 220, 360, { text: 'Done\n5', style: { fill: '#f0fdf4', stroke: TONE.green.stroke, textColor: '#14532d', radius: 12, fontSize: 13 }, keywords: 'board lane complete' }),
      item('kanban.card', 'Card', 190, 90, { text: 'Task title', style: { ...TONE.white, stroke: '#cbd5e1', radius: 8, fontSize: 13, shadow: true, ...left }, keywords: 'ticket story issue' }),
      item('kanban.card', 'Card (urgent)', 190, 90, { text: 'Fix outage', style: { fill: '#ffffff', stroke: TONE.red.stroke, radius: 8, fontSize: 13, ...left }, keywords: 'ticket bug priority' }),
      item('sticky', 'Sticky card', 140, 110, { style: { fill: '#fef08a', stroke: 'none', shadow: true, fontSize: 13, textColor: '#422006', ...left }, keywords: 'post-it note' }),
    ],
  },
  {
    id: 'orgchart',
    name: 'Org Chart',
    items: [
      item('org.person', 'Person', 210, 64, { text: 'Jane Doe\nCEO', style: { ...TONE.white, stroke: TONE.indigo.stroke, radius: 10, fontSize: 13 }, keywords: 'employee manager staff profile' }),
      item('org.person', 'Person (tinted)', 210, 64, { text: 'John Smith\nEngineer', style: { ...TONE.blue, radius: 10, fontSize: 13 }, keywords: 'employee staff profile' }),
      item('org.personTop', 'Person (photo top)', 140, 130, { text: 'Jane Doe\nCTO', style: { ...TONE.white, stroke: TONE.teal.stroke, radius: 10, fontSize: 13 }, keywords: 'employee avatar profile' }),
      item('org.person', 'Vacancy', 210, 64, { text: 'Open role\nHiring', style: { fill: '#f8fafc', stroke: TONE.slate.stroke, strokeStyle: 'dashed', radius: 10, fontSize: 13 }, keywords: 'hiring empty position' }),
      item('org.unit', 'Department', 180, 64, { text: 'Engineering', style: { ...TONE.white, stroke: TONE.violet.stroke, radius: 8, bold: true }, keywords: 'team unit division' }),
      item('org.unit', 'Team', 160, 54, { text: 'Team', style: { ...TONE.green, radius: 8 }, keywords: 'group unit' }),
    ],
  },
  {
    id: 'timeline',
    name: 'Timeline & Gantt',
    items: [
      item('timeline.axis', 'Timeline axis', 320, 20, { style: { stroke: TONE.slate.stroke }, keywords: 'line ticks arrow time' }),
      item('timeline.milestone', 'Milestone', 120, 20, { text: 'Milestone', style: { ...solidTone('violet'), textColor: '#0f172a', fontSize: 12 }, keywords: 'diamond event' }),
      item('timeline.event', 'Event', 120, 110, { text: '2025\nKick-off', style: { ...TONE.blue, radius: 8, fontSize: 12 }, keywords: 'date point marker' }),
      item('timeline.span', 'Period span', 200, 40, { text: 'Q1', style: { stroke: TONE.slate.stroke, fontSize: 12 }, keywords: 'bracket range duration' }),
      item('gantt.bar25', 'Task 25%', 200, 28, { text: 'Design', style: { ...TONE.blue, radius: 6, fontSize: 12, textAlign: 'left' }, keywords: 'gantt task progress' }),
      item('gantt.bar50', 'Task 50%', 200, 28, { text: 'Build', style: { ...TONE.violet, radius: 6, fontSize: 12, textAlign: 'left' }, keywords: 'gantt task progress' }),
      item('gantt.bar75', 'Task 75%', 200, 28, { text: 'Test', style: { ...TONE.green, radius: 6, fontSize: 12, textAlign: 'left' }, keywords: 'gantt task progress' }),
      item('rectangle', 'Task bar', 200, 28, { style: { ...solidTone('orange'), radius: 6, fontSize: 12 }, keywords: 'gantt task' }),
      item('gantt.summary', 'Summary bar', 260, 16, { text: 'Phase 1', style: { fill: '#334155', stroke: '#334155', fontSize: 12 }, keywords: 'gantt group parent' }),
      item('gantt.milestone', 'Gantt milestone', 22, 22, { text: 'Release', style: { ...solidTone('red'), textColor: '#0f172a', fontSize: 12 }, keywords: 'diamond deadline' }),
      item('gantt.today', 'Today marker', 52, 220, { text: 'Today', style: { ...solidTone('red'), fontSize: 10, bold: true }, keywords: 'now current date line' }),
      item('gantt.scale', 'Time scale', 384, 28, { style: { fill: '#f1f5f9', stroke: '#cbd5e1', fontSize: 12 }, keywords: 'gantt header weeks months grid' }),
    ],
  },
];

export { shapes, libraries };
