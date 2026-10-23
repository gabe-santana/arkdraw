import { Builder, INK, MUTED, TONES, grid, solid, type Tone } from '../kit';
import type { Template } from '../types';

function venn() {
  const b = new Builder();
  b.title('Where innovation happens', 0, 0, 760, 'Three-set Venn diagram');
  const v = { x: 170, y: 120, w: 420, h: 400 };
  b.shape('venn.three', v, { fill: '#4f46e5', stroke: '#4f46e5', bold: true, fontSize: 15, textColor: '#1e1b4b' }, 'Innovation');
  const label = (t: string, sub: string, tone: Tone, x: number, y: number, align: 'left' | 'right' | 'center') => {
    b.text(t, { x, y, w: 170, h: 26 }, { fontSize: 18, bold: true, textColor: tone.stroke, textAlign: align });
    b.text(sub, { x, y: y + 26, w: 170, h: 40 }, { fontSize: 12, textColor: MUTED, textAlign: align, verticalAlign: 'top' });
  };
  label('Desirable', 'Do people want it?', TONES.rose, 0, 160, 'right');
  label('Viable', 'Can it sustain a business?', TONES.blue, 590, 160, 'left');
  label('Feasible', 'Can we build it?', TONES.green, 295, 530, 'center');
  return [b.page('Venn')];
}

function matrix() {
  const b = new Builder();
  b.title('Eisenhower matrix', 0, 0, 900, 'Prioritize by urgency and importance');
  const cells: Array<[string, string, Tone, string[]]> = [
    ['Do first', 'Urgent & important', TONES.red, ['Fix production outage', 'Tax filing due Friday']],
    ['Schedule', 'Not urgent & important', TONES.blue, ['Quarterly planning', 'Learn TypeScript generics', 'Health check-up']],
    ['Delegate', 'Urgent & not important', TONES.amber, ['Book team offsite venue', 'Reply to vendor emails']],
    ['Eliminate', 'Not urgent & not important', TONES.slate, ['Re-organize old folders', 'Endless social feeds']],
  ];
  const [cw, ch] = [400, 260];
  const ox = 70;
  const oy = 130;
  grid(4, 2, { w: cw, h: ch }, { x: 16, y: 16 }, { x: ox, y: oy }).forEach((r, i) => {
    const [name, sub, tone, items] = cells[i];
    const card = b.shape('lane.card', r, { fill: tone.fill, stroke: tone.stroke, fontSize: 17, bold: true, textColor: tone.text, radius: 14, textAlign: 'left' }, `${name}`);
    b.text(sub, { x: r.x + 16, y: r.y + 44, w: r.w - 32, h: 20 }, { fontSize: 12, textColor: tone.text, textAlign: 'left' }, { container: card });
    grid(items.length, 2, { w: 172, h: 64 }, { x: 14, y: 12 }, { x: r.x + 16, y: r.y + 80 }).forEach((nr, j) =>
      b.shape('sticky', nr, { fill: '#ffffff', stroke: 'none', shadow: true, fontSize: 13, textColor: INK, textAlign: 'left', verticalAlign: 'top' }, items[j], { container: card }),
    );
  });
  b.text('URGENT  →  NOT URGENT', { x: ox, y: oy - 34, w: cw * 2 + 16, h: 24 }, { fontSize: 12, bold: true, textColor: MUTED });
  b.text('IMPORTANT  →  NOT IMPORTANT', { x: 20, y: oy, w: 30, h: ch * 2 + 16 }, { fontSize: 12, bold: true, textColor: MUTED, verticalText: true });
  return [b.page('Matrix')];
}

function funnel() {
  const b = new Builder();
  b.title('Sales funnel', 0, 0, 900, 'Monthly conversion, October');
  const stages: Array<[string, string, string, Tone]> = [
    ['Visitors', '48,200', '', TONES.indigo],
    ['Leads', '6,140', '12.7%', TONES.blue],
    ['Qualified', '1,920', '31.3%', TONES.sky],
    ['Proposals', '410', '21.4%', TONES.teal],
    ['Customers', '128', '31.2%', TONES.green],
  ];
  const H = 64;
  let w = 600;
  const cx = 300;
  stages.forEach(([name, n, rate, tone], i) => {
    const y = 100 + i * H;
    b.shape('info.funnel', { x: cx - w / 2, y, w, h: H }, solid(tone, { radius: 3, fontSize: 15 }), name);
    b.text(n, { x: 640, y: y + 8, w: 120, h: 26 }, { fontSize: 20, bold: true, textColor: tone.stroke, textAlign: 'left' });
    b.text(rate ? `${rate} from previous stage` : 'Top of funnel', { x: 640, y: y + 34, w: 220, h: 20 }, { fontSize: 12, textColor: MUTED, textAlign: 'left' });
    w -= H;
  });
  b.line({ x: 620, y: 100 }, { x: 620, y: 100 + stages.length * H }, { stroke: '#e2e8f0', strokeWidth: 2 });
  b.shape('info.stat', { x: 880, y: 100, w: 170, h: 110 }, { fill: '#ffffff', stroke: TONES.green.stroke, radius: 12, fontSize: 13 }, '0.27%\nVisitor → customer');
  return [b.page('Funnel')];
}

function processInfographic() {
  const b = new Builder();
  b.title('How it works', 0, 0, 1100, 'Five-step process infographic');
  const steps: Array<[string, string, string, Tone]> = [
    ['info.iconIdea', 'Discover', 'Research the problem and talk to users.', TONES.amber],
    ['info.iconTarget', 'Define', 'Frame the goal and success metrics.', TONES.red],
    ['info.iconTeam', 'Design', 'Sketch, prototype and test ideas.', TONES.blue],
    ['info.iconLaunch', 'Deliver', 'Build, ship and announce.', TONES.violet],
    ['info.iconGrowth', 'Measure', 'Learn from data and iterate.', TONES.green],
  ];
  const step = 220;
  steps.forEach(([icon, name, body, tone], i) => {
    const x = i * step;
    b.shape(i === 0 ? 'info.chevronStart' : 'info.chevron', { x, y: 100, w: step + 6, h: 46 }, solid(tone, { fontSize: 13 }), `0${i + 1}`);
    b.shape(icon, { x: x + step / 2 - 40, y: 176, w: 80, h: 80 }, solid(tone));
    b.text(name, { x: x + 10, y: 270, w: step - 20, h: 30 }, { fontSize: 18, bold: true, textColor: tone.stroke });
    b.text(body, { x: x + 20, y: 302, w: step - 40, h: 44 }, { fontSize: 13, textColor: MUTED, verticalAlign: 'top' });
  });
  const rings: Array<[string, string, Tone]> = [['info.ring90', '90%', TONES.green], ['info.ring75', '75%', TONES.blue], ['info.ring50', '50%', TONES.amber], ['info.ring25', '25%', TONES.red]];
  const caps = ['Customer satisfaction', 'Feature adoption', 'Trial conversion', 'Churn reduced'];
  rings.forEach(([k, t, tone], i) => {
    const x = 120 + i * 230;
    b.shape(k, { x, y: 380, w: 100, h: 100 }, { fill: '#ffffff', stroke: tone.stroke, bold: true, fontSize: 18 }, t);
    b.text(caps[i], { x: x - 40, y: 488, w: 180, h: 22 }, { fontSize: 13, textColor: INK });
  });
  return [b.page('Infographic')];
}

export const CHART_TEMPLATES: Template[] = [
  {
    id: 'venn-three',
    name: 'Venn diagram',
    category: 'Charts & Infographics',
    description: 'Three overlapping sets — desirable, viable, feasible — with labels and a highlighted center.',
    keywords: ['venn', 'sets', 'overlap', 'intersection', 'innovation', 'chart'],
    build: venn,
  },
  {
    id: 'eisenhower-matrix',
    name: 'Priority matrix',
    category: 'Charts & Infographics',
    description: 'Eisenhower 2×2 matrix: do first, schedule, delegate, eliminate — with sticky tasks.',
    keywords: ['matrix', '2x2', 'eisenhower', 'priority', 'quadrant', 'urgent important', 'productivity'],
    build: matrix,
  },
  {
    id: 'sales-funnel',
    name: 'Sales funnel',
    category: 'Charts & Infographics',
    description: 'Five-stage conversion funnel with volumes and stage-to-stage conversion rates.',
    keywords: ['funnel', 'sales', 'conversion', 'marketing', 'pipeline', 'chart'],
    build: funnel,
  },
  {
    id: 'process-infographic',
    name: 'Process infographic',
    category: 'Charts & Infographics',
    description: 'Five numbered steps with icons, plus progress rings for key metrics.',
    keywords: ['infographic', 'process', 'steps', 'icons', 'kpi', 'progress', 'presentation'],
    build: processInfographic,
  },
];
