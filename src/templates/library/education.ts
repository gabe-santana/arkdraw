import type { DiagramSpec } from '@/ai/generate/spec';
import { Builder, INK, MUTED, TONES, solid, soft, specPage, type Tone } from '../kit';
import type { Template } from '../types';

const waterCycle: DiagramSpec = {
  type: 'generic',
  direction: 'LR',
  nodes: [
    { id: 'sun', kind: 'ellipse', text: 'Sun', style: { fill: '#fef3c7', stroke: '#d97706' } },
    { id: 'ocean', kind: 'rectangle', text: 'Oceans & lakes', style: { fill: '#dbeafe', stroke: '#2563eb' } },
    { id: 'vapour', kind: 'cloud', text: 'Water vapour', style: { fill: '#f1f5f9', stroke: '#64748b' } },
    { id: 'clouds', kind: 'cloud', text: 'Clouds', style: { fill: '#e0e7ff', stroke: '#4f46e5' } },
    { id: 'rain', kind: 'rectangle', text: 'Precipitation', style: { fill: '#ccfbf1', stroke: '#0d9488' } },
    { id: 'ground', kind: 'rectangle', text: 'Groundwater', style: { fill: '#ffedd5', stroke: '#ea580c' } },
    { id: 'rivers', kind: 'rectangle', text: 'Rivers & runoff', style: { fill: '#dbeafe', stroke: '#2563eb' } },
    { id: 'plants', kind: 'rectangle', text: 'Plants', style: { fill: '#dcfce7', stroke: '#16a34a' } },
  ],
  edges: [
    { from: 'sun', to: 'ocean', label: 'heats' },
    { from: 'ocean', to: 'vapour', label: 'evaporation' },
    { from: 'plants', to: 'vapour', label: 'transpiration' },
    { from: 'vapour', to: 'clouds', label: 'condensation' },
    { from: 'clouds', to: 'rain', label: 'falls as' },
    { from: 'rain', to: 'ground', label: 'infiltration' },
    { from: 'rain', to: 'rivers', label: 'collects in' },
    { from: 'ground', to: 'plants', label: 'absorbed by' },
    { from: 'rivers', to: 'ocean', label: 'flow back to', dashed: true },
  ],
};

function history() {
  const b = new Builder();
  b.title('A short history of computing', 0, 0, 1200, 'Timeline of milestones, 1936 – 2007');
  const events: Array<[string, string, Tone]> = [
    ['1936', 'Turing machine', TONES.indigo],
    ['1945', 'ENIAC', TONES.blue],
    ['1958', 'Integrated circuit', TONES.teal],
    ['1969', 'ARPANET', TONES.green],
    ['1971', 'Microprocessor', TONES.amber],
    ['1981', 'IBM PC', TONES.orange],
    ['1991', 'World Wide Web', TONES.rose],
    ['2007', 'Smartphones', TONES.violet],
  ];
  const step = 150;
  const axisY = 330;
  b.line({ x: 0, y: axisY }, { x: events.length * step + 40, y: axisY }, { stroke: '#475569', strokeWidth: 2.5, endArrow: 'triangle' });
  events.forEach(([year, text, tone], i) => {
    const up = i % 2 === 0;
    const x = 20 + i * step;
    const style = soft(tone, { radius: 10, fontSize: 13 });
    // Above: the event shape's own stem ends in a dot on the axis. Below: box + stem + dot.
    if (up) b.shape('timeline.event', { x, y: axisY - 172, w: 130, h: 178 }, style, `${year}\n${text}`);
    else {
      b.line({ x: x + 65, y: axisY }, { x: x + 65, y: axisY + 44 }, { stroke: tone.stroke, strokeWidth: 1.5 });
      b.shape('ellipse', { x: x + 59, y: axisY - 6, w: 12, h: 12 }, { fill: tone.stroke, stroke: '#ffffff', strokeWidth: 1.5 });
      b.shape('rectangle', { x, y: axisY + 44, w: 130, h: 100 }, style, `${year}\n${text}`);
    }
  });
  return [b.page('Timeline')];
}

function fishbone() {
  const b = new Builder();
  b.title('Cause & effect (fishbone)', 0, 0, 1000, 'Why are customer support tickets increasing?');
  const spineY = 340;
  const x0 = 40;
  const x1 = 900;
  b.shape('rectangle', { x: x1, y: spineY - 50, w: 200, h: 100 }, solid(TONES.red, { radius: 12, fontSize: 15 }), 'Support tickets up 40%');
  b.line({ x: x0, y: spineY }, { x: x1, y: spineY }, { stroke: INK, strokeWidth: 3, endArrow: 'triangle' });
  const cats: Array<[string, Tone, string[]]> = [
    ['People', TONES.blue, ['New agents not trained', 'Understaffed weekends']],
    ['Process', TONES.violet, ['No escalation path', 'Slow refunds']],
    ['Product', TONES.teal, ['Confusing onboarding', 'Bug in password reset']],
    ['Tools', TONES.amber, ['Help center outdated', 'No in-app chat']],
    ['Policy', TONES.orange, ['Strict return window', 'Unclear pricing page']],
    ['Environment', TONES.green, ['Holiday peak season', 'Competitor outage']],
  ];
  const cols = 3;
  const span = (x1 - x0 - 60) / cols;
  cats.forEach(([name, tone, causes], i) => {
    const top = i < cols;
    const c = i % cols;
    const bx = x0 + 60 + c * span + span * 0.55;
    const tipY = top ? spineY - 200 : spineY + 200;
    b.shape('rectangle', { x: bx - 150 - 60, y: top ? tipY - 44 : tipY, w: 120, h: 40 }, soft(tone, { radius: 8, bold: true, fontSize: 14 }), name);
    const sx = bx - 150;
    b.line({ x: sx, y: tipY }, { x: bx, y: spineY }, { stroke: tone.stroke, strokeWidth: 2 });
    causes.forEach((cause, j) => {
      const t = (j + 1) / (causes.length + 1);
      const py = tipY + (spineY - tipY) * t;
      const px = sx + (bx - sx) * t;
      b.line({ x: px - 100, y: py }, { x: px, y: py }, { stroke: tone.stroke, strokeWidth: 1.25, endArrow: 'arrow' });
      b.text(cause, { x: px - 210, y: py - 13, w: 106, h: 26 }, { fontSize: 11.5, textAlign: 'right', textColor: INK });
    });
  });
  return [b.page('Fishbone')];
}

function bloom() {
  const b = new Builder();
  b.title('Bloom’s taxonomy', 0, 0, 900, 'Levels of learning objectives, from simple to complex');
  const levels: Array<[string, string, Tone]> = [
    ['Create', 'design, assemble, construct, develop', TONES.violet],
    ['Evaluate', 'argue, defend, judge, critique', TONES.indigo],
    ['Analyze', 'compare, organize, examine, test', TONES.blue],
    ['Apply', 'use, solve, demonstrate, interpret', TONES.teal],
    ['Understand', 'explain, classify, summarize', TONES.green],
    ['Remember', 'define, list, recall, repeat', TONES.amber],
  ];
  const H = 62;
  const cx = 330;
  const top = 100;
  const tri = 2 * H; // apex triangle width (base) — slope matches the levels
  b.shape('triangle', { x: cx - tri / 2, y: top, w: tri, h: H }, solid(levels[0][2], { fontSize: 13, radius: 2 }), '');
  levels.forEach(([name, verbs, tone], i) => {
    const w = tri + (i + 1) * 2 * H;
    const y = top + H + i * H;
    b.shape('info.level', { x: cx - w / 2, y, w, h: H }, solid(tone, { radius: 2, fontSize: 16 }), name);
    b.text(verbs, { x: cx + w / 2 + 24 - 0, y: y + 18, w: 300, h: 26 }, { fontSize: 13, textColor: MUTED, textAlign: 'left', italic: true });
    b.line({ x: cx + w / 2 - H / 2 + 8, y: y + 31 }, { x: cx + w / 2 + 18, y: y + 31 }, { stroke: '#cbd5e1', strokeWidth: 1 });
  });
  b.text('Higher-order thinking ↑', { x: 0, y: top + 10, w: 200, h: 24 }, { fontSize: 12, bold: true, textColor: TONES.violet.stroke, textAlign: 'left' });
  b.text('Lower-order thinking ↓', { x: cx - 4 * H - 2 * H, y: top + H * 7 + 10, w: 200, h: 24 }, { fontSize: 12, bold: true, textColor: TONES.amber.stroke, textAlign: 'left' });
  return [b.page('Pyramid')];
}

export const EDUCATION_TEMPLATES: Template[] = [
  {
    id: 'concept-map',
    name: 'Concept map',
    category: 'Education & Other',
    description: 'The water cycle as a concept map with labeled relationships.',
    keywords: ['concept map', 'education', 'science', 'water cycle', 'learning', 'relationships'],
    build: () => specPage('Concept map', 'The water cycle', 'Concept map with labeled relationships', waterCycle),
  },
  {
    id: 'history-timeline',
    name: 'History timeline',
    category: 'Education & Other',
    description: 'Alternating events along a horizontal timeline — great for history lessons and project retros.',
    keywords: ['timeline', 'history', 'events', 'chronology', 'education', 'dates'],
    build: history,
  },
  {
    id: 'fishbone',
    name: 'Fishbone diagram',
    category: 'Education & Other',
    description: 'Ishikawa cause-and-effect diagram with six cause categories.',
    keywords: ['fishbone', 'ishikawa', 'cause and effect', 'root cause', 'quality', 'six sigma', 'problem solving'],
    build: fishbone,
  },
  {
    id: 'bloom-pyramid',
    name: 'Pyramid diagram',
    category: 'Education & Other',
    description: 'Bloom’s taxonomy as a layered pyramid with example verbs for each level.',
    keywords: ['pyramid', 'hierarchy', 'bloom', 'taxonomy', 'education', 'levels', 'maslow'],
    build: bloom,
  },
];

