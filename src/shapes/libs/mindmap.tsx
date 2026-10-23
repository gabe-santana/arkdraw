/**
 * Mind map: central / main / sub topics, floating topics, notes, task topics,
 * summary braces and boundaries.
 */
import { RoundRect, inset } from '../kit';
import type { ShapeDef, ShapeLibrary } from '../types';
import { Line, TONE, Tint, item, roundRectD, shape, solidTone, withFill } from './_kit2';

const shapes: ShapeDef[] = [
  shape(
    'mind.central',
    'Central topic',
    'rounded=1;arcSize=50;whiteSpace=wrap;fontStyle=1;',
    ({ w, h, style }) => {
      const g = Math.min(5, w * 0.04, h * 0.08);
      return (
        <>
          <Tint d={roundRectD(0, 0, w, h, h / 2)} s={style} k={0.16} />
          <RoundRect x={g} y={g} w={w - g * 2} h={h - g * 2} s={style} r={(h - g * 2) / 2} />
        </>
      );
    },
    { textBox: (w, h) => inset(w, h, Math.min(h * 0.4, w * 0.2), 8) },
  ),
  shape(
    'mind.topic',
    'Topic',
    'rounded=1;whiteSpace=wrap;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />,
    { rounded: true, textBox: (w, h) => inset(w, h, Math.min(12, w * 0.12, h * 0.25 + 6), 6) },
  ),
  shape(
    'mind.branch',
    'Subtopic',
    'shape=partialRectangle;top=0;left=0;right=0;fillColor=none;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const y = h - Math.max(1, style.strokeWidth);
      return <Line d={`M${style.strokeWidth},${y} H${w - style.strokeWidth}`} s={style} k={1.4} />;
    },
    { boxHit: true, textBox: (w, h) => ({ x: 2, y: 0, w: Math.max(1, w - 4), h: Math.max(1, h - 4) }) },
  ),
  shape(
    'mind.task',
    'Task topic',
    'rounded=1;whiteSpace=wrap;align=left;spacingLeft=30;',
    ({ w, h, style }) => {
      const b = Math.min(14, h * 0.45);
      const x = Math.min(12, h * 0.3);
      const y = (h - b) / 2;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <RoundRect x={x} y={y} w={b} h={b} r={3} s={withFill({ ...style, strokeStyle: 'solid' }, '#ffffff')} />
          <Line d={`M${x + b * 0.25},${y + b * 0.52} L${x + b * 0.43},${y + b * 0.7} L${x + b * 0.76},${y + b * 0.3}`} s={style} k={1.1} />
        </>
      );
    },
    {
      rounded: true,
      textBox: (w, h) => {
        const left = Math.min(12, h * 0.3) + Math.min(14, h * 0.45) + 8;
        return { x: left, y: 4, w: Math.max(1, w - left - 8), h: Math.max(1, h - 8) };
      },
    },
  ),
  shape(
    'mind.summary',
    'Summary',
    'shape=curlyBracket;rounded=1;flipH=1;labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;',
    ({ w, h, style }) => {
      const bw = Math.min(16, w * 0.3);
      const q = bw / 2;
      return (
        <Line
          d={`M0,0 Q${q},0 ${q},${Math.min(q, h / 4)} V${h / 2 - q} Q${q},${h / 2} ${bw},${h / 2} Q${q},${h / 2} ${q},${h / 2 + q} V${h - Math.min(q, h / 4)} Q${q},${h} 0,${h}`}
          s={style}
        />
      );
    },
    {
      boxHit: true,
      textBox: (w, h) => {
        const bw = Math.min(16, w * 0.3) + 6;
        return { x: bw, y: 0, w: Math.max(1, w - bw), h };
      },
    },
  ),
  shape(
    'mind.boundary',
    'Boundary',
    'rounded=1;arcSize=20;dashed=1;container=1;whiteSpace=wrap;align=left;verticalAlign=top;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={style} r={Math.min(28, style.radius)} />,
    { rounded: true, container: true, textBox: (w) => ({ x: 14, y: 8, w: Math.max(1, w - 28), h: 22 }) },
  ),
];

const central = { ...solidTone('indigo'), bold: true, fontSize: 16 };

const libraries: ShapeLibrary[] = [
  {
    id: 'mindmap',
    name: 'Mind Map',
    items: [
      item('mind.central', 'Central topic', 180, 72, { text: 'Central idea', style: central, keywords: 'root main idea mindmap' }),
      item('ellipse', 'Central topic (ellipse)', 170, 90, { text: 'Central idea', style: { ...solidTone('violet'), bold: true, fontSize: 16 }, keywords: 'root mindmap' }),
      item('mind.topic', 'Main topic', 140, 48, { text: 'Main topic', style: { ...TONE.indigo, radius: 10, bold: true }, keywords: 'branch mindmap' }),
      item('mind.topic', 'Main topic (pill)', 140, 44, { text: 'Main topic', style: { ...TONE.teal, radius: 999, bold: true }, keywords: 'branch rounded mindmap' }),
      item('mind.topic', 'Subtopic (box)', 120, 36, { text: 'Subtopic', style: { ...TONE.slate, radius: 6, fontSize: 13 }, keywords: 'child mindmap' }),
      item('mind.branch', 'Subtopic (line)', 120, 30, { text: 'Subtopic', style: { fill: 'none', stroke: TONE.indigo.stroke, fontSize: 13 }, keywords: 'underline branch child mindmap' }),
      item('mind.topic', 'Floating topic', 130, 44, { text: 'Floating', style: { ...TONE.amber, radius: 999, strokeStyle: 'dashed' }, keywords: 'free detached mindmap' }),
      item('ellipse', 'Bubble topic', 120, 60, { text: 'Idea', style: { ...TONE.pink }, keywords: 'circle mindmap' }),
      item('mind.task', 'Task topic', 150, 40, { text: 'To do', style: { ...TONE.green, radius: 8, textAlign: 'left' }, keywords: 'checkbox todo mindmap' }),
      item('callout', 'Callout topic', 140, 80, { text: 'Callout', style: { ...TONE.amber, radius: 10 }, keywords: 'comment speech mindmap' }),
      item('uml.note', 'Note', 130, 80, { style: { ...TONE.amber, textAlign: 'left', verticalAlign: 'top', fontSize: 13 }, keywords: 'memo mindmap' }),
      item('mind.summary', 'Summary', 110, 120, { text: 'Summary', style: { fill: 'none', stroke: TONE.slate.stroke, textAlign: 'left' }, keywords: 'brace bracket mindmap' }),
      item('cloud', 'Cloud topic', 150, 95, { text: 'Cloud', style: { ...TONE.blue }, keywords: 'mindmap' }),
      item('mind.boundary', 'Boundary', 280, 180, {
        text: 'Boundary',
        style: { fill: 'rgba(79,70,229,0.06)', stroke: TONE.indigo.stroke, strokeStyle: 'dashed', radius: 24, fontSize: 12, bold: true, textAlign: 'left' },
        keywords: 'group region mindmap',
      }),
    ],
  },
];

export { shapes, libraries };
