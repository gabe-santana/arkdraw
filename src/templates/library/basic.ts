import type { ShapeElement } from '@/model/types';
import { Builder, INK, MUTED, TONES, grid, soft, solid, textWidth, type Tone } from '../kit';
import type { Template } from '../types';

function blockDiagram() {
  const b = new Builder();
  b.title('Closed-loop control system', 0, 0, 900, 'Block diagram with feedback');
  const y = 150;
  const blk = (t: string, x: number, tone: Tone, w = 150) => b.shape('rectangle', { x, y, w, h: 70 }, soft(tone, { radius: 10, bold: true, fontSize: 14 }), t);
  const setp = b.text('Setpoint r(t)', { x: 0, y: y + 22, w: 110, h: 26 }, { fontSize: 13, textAlign: 'left', bold: true });
  const sum = b.shape('misc.summing', { x: 150, y: y + 15, w: 40, h: 40 }, { fill: '#ffffff', stroke: INK });
  const ctrl = blk('Controller', 250, TONES.indigo);
  const act = blk('Actuator', 460, TONES.violet);
  const plant = blk('Plant / process', 670, TONES.teal, 170);
  const out = b.text('Output y(t)', { x: 950, y: y + 22, w: 110, h: 26 }, { fontSize: 13, textAlign: 'right', bold: true });
  const sensor = b.shape('rectangle', { x: 460, y: y + 160, w: 150, h: 70 }, soft(TONES.amber, { radius: 10, bold: true, fontSize: 14 }), 'Sensor');
  const arrow = { stroke: INK, strokeWidth: 1.75, fontSize: 12 };
  b.edge(setp, sum, { ...arrow, fromSide: 'right', toSide: 'left', text: '+' , labelT: 0.8 });
  b.edge(sum, ctrl, { ...arrow, fromSide: 'right', toSide: 'left', text: 'e(t)' });
  b.edge(ctrl, act, { ...arrow, fromSide: 'right', toSide: 'left', text: 'u(t)' });
  b.edge(act, plant, { ...arrow, fromSide: 'right', toSide: 'left' });
  b.edge(plant, out, { ...arrow, fromSide: 'right', toSide: 'left' });
  b.edge(plant, sensor, { ...arrow, fromSide: 'right', toSide: 'right', waypoints: [{ x: 890, y: y + 35 }, { x: 890, y: y + 195 }] });
  b.edge(sensor, sum, { ...arrow, fromSide: 'left', toSide: 'bottom', text: '−', labelT: 0.9 });
  b.text('Disturbance d(t)', { x: 670, y: y - 70, w: 170, h: 22 }, { fontSize: 12, textColor: MUTED });
  b.line({ x: 755, y: y - 44 }, { x: 755, y }, { stroke: MUTED, strokeWidth: 1.5, endArrow: 'triangle', dashed: true });
  return [b.page('Block diagram')];
}

function brainstorm() {
  const b = new Builder();
  b.title('Brainstorm — affinity map', 0, 0, 1000, 'How might we make onboarding delightful?');
  const groups: Array<[string, Tone, string, string[]]> = [
    ['Guidance', TONES.blue, '#bfdbfe', ['Interactive tour', 'Checklist widget', 'Sample project', 'Tips in empty states']],
    ['Speed', TONES.green, '#bbf7d0', ['Sign in with Google', 'Skip optional steps', 'Import existing diagrams']],
    ['Delight', TONES.pink, '#fbcfe8', ['Confetti on first diagram', 'Personal welcome email', 'Cute empty-state art', 'Achievements']],
    ['Support', TONES.amber, '#fde68a', ['Live chat in app', 'Video tutorials']],
  ];
  const GW = 340;
  groups.forEach(([name, tone, color, notes], i) => {
    const gx = (i % 2) * (GW + 30);
    const gy = 96 + Math.floor(i / 2) * 330;
    const g = b.shape('lane.group', { x: gx, y: gy, w: GW, h: 300 }, { fill: tone.fill, fillOpacity: 0.35, stroke: tone.stroke, strokeStyle: 'dashed', radius: 16, bold: true, fontSize: 15, textColor: tone.text, textAlign: 'left' }, name);
    grid(notes.length, 2, { w: 146, h: 108 }, { x: 16, y: 14 }, { x: gx + 16, y: gy + 44 }).forEach((r, j) =>
      b.shape('sticky', r, { fill: color, stroke: 'none', shadow: true, fontSize: 15, fontFamily: 'hand', textColor: '#1f2937', textAlign: 'left', verticalAlign: 'top' }, notes[j], { container: g }),
    );
  });
  b.shape('sticky', { x: 750, y: 96, w: 200, h: 170 }, { fill: '#fef08a', stroke: 'none', shadow: true, fontSize: 16, fontFamily: 'hand', textColor: '#422006', textAlign: 'left', verticalAlign: 'top' }, 'Rules\n• Quantity over quality\n• Build on ideas\n• No criticism');
  return [b.page('Brainstorm')];
}

function cycle() {
  const b = new Builder();
  const stages: Array<[string, Tone]> = [
    ['Plan', TONES.indigo],
    ['Design', TONES.violet],
    ['Build', TONES.blue],
    ['Test', TONES.teal],
    ['Release', TONES.green],
    ['Learn', TONES.amber],
  ];
  const nodes: ShapeElement[] = stages.map(([t, tone]) => b.shape('ellipse', { x: 0, y: 0, w: 130, h: 130 }, solid(tone, { fontSize: 17 }), t));
  nodes.forEach((n, i) => b.edge(n, nodes[(i + 1) % nodes.length], { routing: 'curved', stroke: '#94a3b8', strokeWidth: 2.5 }));
  b.layout('circle', { nodeSpacing: 70, origin: { x: 0, y: 90 } });
  const bb = b.bounds();
  const cx = bb.x + bb.w / 2;
  const cy = bb.y + bb.h / 2;
  const label = 'Continuous\nimprovement';
  const w = textWidth('improvement', 18, true) + 30;
  b.text(label, { x: cx - w / 2, y: cy - 28, w, h: 56 }, { fontSize: 18, bold: true, textColor: INK });
  b.title('Product development cycle', bb.x, 0, 600, 'Cycle diagram');
  return [b.page('Cycle')];
}

export const BASIC_TEMPLATES: Template[] = [
  {
    id: 'block-diagram',
    name: 'Block diagram',
    category: 'Basic',
    description: 'Closed-loop control system with summing junction, blocks and a feedback path.',
    keywords: ['block diagram', 'control system', 'feedback', 'loop', 'systems', 'basic'],
    build: blockDiagram,
  },
  {
    id: 'brainstorm-stickies',
    name: 'Sticky-note brainstorm',
    category: 'Basic',
    description: 'Affinity map: sticky notes clustered into themed groups.',
    keywords: ['brainstorm', 'sticky notes', 'whiteboard', 'affinity', 'ideas', 'workshop', 'post-it'],
    build: brainstorm,
  },
  {
    id: 'cycle-diagram',
    name: 'Cycle diagram',
    category: 'Basic',
    description: 'Six stages arranged in a loop with curved arrows.',
    keywords: ['cycle', 'loop', 'circular', 'process', 'lifecycle', 'iteration'],
    build: cycle,
  },
];
