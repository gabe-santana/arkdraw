import type { ElementStyle, ShapeElement } from '@/model/types';
import { Builder, INK, MUTED, TONES, grid, soft, solid, type EdgeOptions, type Tone } from '../kit';
import type { Template } from '../types';

// ---------------------------------------------------------------------------
// Lane grid: steps sit in (lane, column) cells of a pool.
// ---------------------------------------------------------------------------

interface Step {
  id: string;
  lane: number;
  col: number;
  kind: string;
  text: string;
  style?: Partial<ElementStyle>;
  w?: number;
  h?: number;
}

interface LaneGrid {
  x: number;
  y: number;
  pool: string;
  poolKind: string;
  laneKind: string;
  lanes: string[];
  laneTones?: Tone[];
  laneH: number;
  colW: number;
  cols: number;
}

const BAND = 32;

function laneProcess(b: Builder, g: LaneGrid, steps: Step[], edges: Array<[string, string, EdgeOptions?]>) {
  const lead = 24;
  const laneW = g.cols * g.colW + lead * 2;
  const pool = b.shape(g.poolKind, { x: g.x, y: g.y, w: laneW + BAND, h: g.lanes.length * g.laneH }, { fill: '#ffffff', stroke: '#475569', bold: true, fontSize: 14, textColor: '#1e293b', radius: 0 }, g.pool);
  const lanes = g.lanes.map((name, i) =>
    b.shape(
      g.laneKind,
      { x: g.x + BAND, y: g.y + i * g.laneH, w: laneW, h: g.laneH },
      {
        fill: g.laneTones ? g.laneTones[i].fill : i % 2 ? '#f8fafc' : '#ffffff',
        fillOpacity: g.laneTones ? 0.35 : 1,
        stroke: '#94a3b8',
        bold: true,
        fontSize: 13,
        textColor: g.laneTones ? g.laneTones[i].text : '#334155',
        radius: 0,
      },
      name,
      { container: pool },
    ),
  );
  const byId = new Map<string, ShapeElement>();
  for (const s of steps) {
    const w = s.w ?? 130;
    const h = s.h ?? 64;
    const cx = g.x + BAND + lead + s.col * g.colW + g.colW / 2;
    const cy = g.y + s.lane * g.laneH + g.laneH / 2;
    const el = b.shape(s.kind, { x: cx - w / 2, y: cy - h / 2, w, h }, s.style ?? {}, s.text, { container: lanes[s.lane] });
    byId.set(s.id, el);
  }
  for (const [a, c, o] of edges) b.edge(byId.get(a)!, byId.get(c)!, { fontSize: 11, ...o });
  return { pool, lanes, byId };
}

const ev = (id: string, lane: number, col: number, kind: string, text: string): Step => ({ id, lane, col, kind, text, w: 40, h: 40 });
const gw = (id: string, lane: number, col: number, kind: string, text = ''): Step => ({ id, lane, col, kind, text, w: 50, h: 50 });
const task = (id: string, lane: number, col: number, kind: string, text: string): Step => ({ id, lane, col, kind, text, w: 128, h: 68 });

function bpmnPage() {
  const b = new Builder();
  b.title('Purchase order approval', 0, 0, 900, 'BPMN 2.0 collaboration with three lanes');
  laneProcess(
    b,
    { x: 0, y: 90, pool: 'Acme Corp.', poolKind: 'bpmn.pool', laneKind: 'bpmn.lane', lanes: ['Employee', 'Manager', 'Procurement'], laneH: 170, colW: 160, cols: 7 },
    [
      ev('start', 0, 0, 'bpmn.start', 'Need identified'),
      task('req', 0, 1, 'bpmn.taskUser', 'Create purchase request'),
      task('review', 1, 2, 'bpmn.taskUser', 'Review request'),
      gw('ok', 1, 3, 'bpmn.gatewayExclusive', 'Approved?'),
      task('revise', 0, 3, 'bpmn.taskUser', 'Revise request'),
      task('po', 2, 4, 'bpmn.taskService', 'Create purchase order'),
      task('send', 2, 5, 'bpmn.taskSend', 'Send PO to supplier'),
      ev('end', 2, 6, 'bpmn.endMessage', 'PO sent'),
      ev('rej', 1, 6, 'bpmn.endTerminate', 'Rejected'),
    ],
    [
      ['start', 'req'],
      ['req', 'review'],
      ['review', 'ok'],
      ['ok', 'po', { text: 'Yes' }],
      ['ok', 'revise', { text: 'Changes' }],
      ['revise', 'review'],
      ['ok', 'rej', { text: 'No' }],
      ['po', 'send'],
      ['send', 'end'],
    ],
  );
  return [b.page('BPMN')];
}

function swimlanePage() {
  const b = new Builder();
  b.title('Customer onboarding', 0, 0, 900, 'Cross-functional (swimlane) flowchart');
  const tones = [TONES.blue, TONES.violet, TONES.teal, TONES.amber];
  const st = (i: number, extra: Partial<ElementStyle> = {}) => soft(tones[i], { radius: 10, fontSize: 13, ...extra });
  laneProcess(
    b,
    { x: 0, y: 90, pool: 'Onboarding', poolKind: 'lane.poolH', laneKind: 'lane.laneH', lanes: ['Customer', 'Sales', 'Operations', 'Finance'], laneTones: tones, laneH: 140, colW: 170, cols: 6 },
    [
      { id: 'sign', lane: 0, col: 0, kind: 'flow.terminator', text: 'Signs contract', style: st(0), w: 140, h: 52 },
      { id: 'kick', lane: 1, col: 1, kind: 'rectangle', text: 'Schedule kickoff call', style: st(1) },
      { id: 'acct', lane: 2, col: 1, kind: 'rectangle', text: 'Create account & workspace', style: st(2) },
      { id: 'inv', lane: 3, col: 2, kind: 'flow.document', text: 'Issue first invoice', style: st(3), h: 72 },
      { id: 'paid', lane: 3, col: 3, kind: 'diamond', text: 'Paid?', style: st(3), w: 110, h: 80 },
      { id: 'remind', lane: 3, col: 4, kind: 'rectangle', text: 'Send reminder', style: st(3) },
      { id: 'train', lane: 2, col: 4, kind: 'rectangle', text: 'Run training session', style: st(2) },
      { id: 'live', lane: 0, col: 5, kind: 'flow.terminator', text: 'Goes live', style: st(0), w: 140, h: 52 },
      { id: 'hand', lane: 1, col: 5, kind: 'rectangle', text: 'Hand over to success team', style: st(1) },
    ],
    [
      ['sign', 'kick'],
      ['kick', 'acct'],
      ['acct', 'inv'],
      ['inv', 'paid'],
      ['paid', 'train', { text: 'Yes' }],
      ['paid', 'remind', { text: 'No' }],
      ['train', 'hand'],
      ['hand', 'live'],
    ],
  );
  return [b.page('Swimlanes')];
}

function valueStreamPage() {
  const b = new Builder();
  b.title('Value stream map — bracket production', 0, 0, 1100, 'Current state');
  const procs = [
    ['Stamping', 'C/T = 1 s\nC/O = 1 h\nUptime = 85%\n27,600 s avail.', 4600, 1],
    ['Welding', 'C/T = 39 s\nC/O = 10 min\nUptime = 100%\n2 shifts', 1100, 39],
    ['Assembly', 'C/T = 62 s\nC/O = 0\nUptime = 100%\n2 shifts', 1600, 62],
    ['Shipping', 'C/T = 40 s\nC/O = 0\nUptime = 100%\n2 shifts', 2700, 40],
  ] as const;
  const gap = 230;
  const x0 = 60;
  const py = 330;
  const supplier = b.shape('vsm.factory', { x: 0, y: 100, w: 130, h: 84 }, { fontSize: 12 }, 'Steel Co.');
  const control = b.shape('vsm.process', { x: 380, y: 96, w: 180, h: 84 }, { fontSize: 12, bold: true, fill: '#f8fafc' }, 'Production Control\nMRP');
  const customer = b.shape('vsm.factory', { x: x0 + gap * 3 + 120 + 110, y: 100, w: 130, h: 84 }, { fontSize: 12 }, 'Assembly Plant\n18,400 pcs/month');
  b.edge(customer, control, { dashed: true, text: '90/60/30 day forecasts', endArrow: 'arrow', fromSide: 'left', toSide: 'right' });
  b.edge(control, supplier, { dashed: true, text: '6-week forecast', endArrow: 'arrow', fromSide: 'left', toSide: 'right' });
  const pBoxes: ShapeElement[] = [];
  procs.forEach(([name, data, inv], i) => {
    const x = x0 + i * gap + 70;
    const p = b.shape('vsm.process', { x, y: py, w: 130, h: 90 }, { fontSize: 13, bold: true, fill: '#ffffff' }, name);
    b.shape('vsm.dataBox', { x, y: py + 104, w: 130, h: 88 }, { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }, data);
    const tri = b.shape('vsm.inventory', { x: x - 82, y: py + 22, w: 56, h: 48 }, { fill: '#fef3c7', fontSize: 11 }, `${inv.toLocaleString('en-US')} pcs`);
    if (pBoxes.length) b.edge(pBoxes[pBoxes.length - 1], tri, { strokeWidth: 3, endArrow: 'none', stroke: INK });
    b.edge(tri, p, { strokeWidth: 3, stroke: INK });
    b.edge(control, p, { dashed: true, endArrow: 'arrow', fromSide: 'bottom', toSide: 'top', text: i === 0 ? 'weekly schedule' : '' });
    pBoxes.push(p);
  });
  const truckIn = b.shape('vsm.truck', { x: 10, y: 228, w: 100, h: 58 }, {}, 'Tues + Thurs');
  b.edge(supplier, truckIn, { strokeWidth: 2.5, stroke: INK, fromSide: 'bottom', toSide: 'top' });
  b.edge(truckIn, pBoxes[0], { strokeWidth: 2.5, stroke: INK, fromSide: 'bottom', toSide: 'left' });
  const truckOut = b.shape('vsm.truck', { x: customer.x + 15, y: 228, w: 100, h: 58 }, {}, 'Daily');
  b.edge(pBoxes[3], truckOut, { strokeWidth: 2.5, stroke: INK, fromSide: 'right', toSide: 'bottom' });
  b.edge(truckOut, customer, { strokeWidth: 2.5, stroke: INK, fromSide: 'top', toSide: 'bottom' });
  // Timeline: waiting days (upper) / processing seconds (lower).
  const ty = py + 220;
  const days = ['5 days', '7.6 days', '1.8 days', '2.7 days'];
  procs.forEach(([, , , ct], i) => {
    const x = x0 + i * gap - 20;
    b.shape('vsm.timeline', { x, y: ty, w: gap, h: 54 }, { fontSize: 12, bold: true }, days[i]);
    b.text(`${ct} s`, { x: x + gap / 2, y: ty + 54, w: gap / 2, h: 22 }, { fontSize: 12, textColor: MUTED });
  });
  b.shape('rectangle', { x: x0 + 4 * gap - 10, y: ty - 6, w: 170, h: 66 }, soft(TONES.slate, { fontSize: 12, textAlign: 'left', radius: 6 }), 'Lead time = 17.1 days\nProcessing = 142 s');
  return [b.page('Value stream')];
}

function swotPage() {
  const b = new Builder();
  b.title('SWOT analysis', 0, 0, 900, 'Product: ArkDraw desktop — Q3 review');
  const cells: Array<[string, Tone, string, string]> = [
    ['Strengths', TONES.green, 'S', '• Fast native performance\n• Works fully offline\n• Open file format, imports common formats\n• Free and open source'],
    ['Weaknesses', TONES.amber, 'W', '• Small template library\n• No real-time collaboration yet\n• Limited brand awareness'],
    ['Opportunities', TONES.blue, 'O', '• Teams leaving SaaS lock-in\n• AI-assisted diagramming\n• Education & universities\n• Plugin marketplace'],
    ['Threats', TONES.red, 'T', '• Established incumbents\n• Browser tools improving fast\n• Vendor icon licensing changes'],
  ];
  const [cw, ch, gap] = [420, 250, 20];
  grid(4, 2, { w: cw, h: ch }, { x: gap, y: gap }, { x: 40, y: 120 }).forEach((r, i) => {
    const [name, tone, letter, body] = cells[i];
    const card = b.shape('lane.card', r, { fill: tone.fill, stroke: tone.stroke, fontSize: 18, bold: true, textColor: tone.text, radius: 14, shadow: false, textAlign: 'left' }, name);
    b.shape('ellipse', { x: r.x + r.w - 64, y: r.y + 16, w: 44, h: 44 }, solid(tone, { fontSize: 20 }), letter, { container: card });
    b.text(body, { x: r.x + 20, y: r.y + 64, w: r.w - 100, h: r.h - 84 }, { fontSize: 15, textAlign: 'left', verticalAlign: 'top', textColor: tone.text }, { container: card });
  });
  b.text('Internal', { x: 0, y: 120, w: 30, h: ch }, { fontSize: 13, bold: true, textColor: MUTED, verticalText: true });
  b.text('External', { x: 0, y: 120 + ch + gap, w: 30, h: ch }, { fontSize: 13, bold: true, textColor: MUTED, verticalText: true });
  b.text('Helpful', { x: 40, y: 92, w: cw, h: 24 }, { fontSize: 13, bold: true, textColor: MUTED });
  b.text('Harmful', { x: 40 + cw + gap, y: 92, w: cw, h: 24 }, { fontSize: 13, bold: true, textColor: MUTED });
  return [b.page('SWOT')];
}

function canvasPage() {
  const b = new Builder();
  b.title('Business Model Canvas', 0, 0, 1200, 'Designed for: a design-tool startup · Iteration 1');
  // 10 columns × 3 rows grid unit; blocks span cells as in the original canvas.
  const U = { w: 116, h: 210 };
  const ox = 0;
  const oy = 96;
  const blocks: Array<[string, string, number, number, number, number, Tone]> = [
    ['Key Partners', 'Cloud icon vendors\nUniversities\nOpen-source contributors', 0, 0, 2, 2, TONES.violet],
    ['Key Activities', 'Product development\nCommunity building\nTemplate curation', 2, 0, 2, 1, TONES.indigo],
    ['Key Resources', 'Engineering team\nShape & icon library\nBrand', 2, 1, 2, 1, TONES.indigo],
    ['Value Propositions', 'Fast, offline, private diagramming\nOpen format, no lock-in\nBeautiful defaults', 4, 0, 2, 2, TONES.rose],
    ['Customer Relationships', 'Self-service\nCommunity forum\nPriority support (Pro)', 6, 0, 2, 1, TONES.amber],
    ['Channels', 'Website & app stores\nGitHub\nConference talks', 6, 1, 2, 1, TONES.amber],
    ['Customer Segments', 'Software engineers\nIT & network admins\nStudents & teachers\nConsultants', 8, 0, 2, 2, TONES.orange],
    ['Cost Structure', 'Salaries · Hosting for sync · Code signing & distribution · Marketing', 0, 2, 5, 1, TONES.slate],
    ['Revenue Streams', 'Pro licences · Team sync subscriptions · Enterprise support contracts', 5, 2, 5, 1, TONES.green],
  ];
  for (const [name, body, c, r, cs, rs, tone] of blocks) {
    const rect = { x: ox + c * U.w, y: oy + r * U.h, w: cs * U.w, h: rs * U.h };
    const card = b.shape('lane.card', rect, { fill: '#ffffff', stroke: tone.stroke, fontSize: 14, bold: true, textColor: tone.text, radius: 6, textAlign: 'left' }, name);
    const notes = body.split(/\n| · /);
    const cols = cs >= 5 ? 4 : 1;
    const nw = cols === 1 ? rect.w - 28 : (rect.w - 28 - (cols - 1) * 10) / cols;
    grid(notes.length, cols, { w: nw, h: 40 }, { x: 10, y: 8 }, { x: rect.x + 14, y: rect.y + 52 }).forEach((nr, i) =>
      b.shape('sticky', nr, { fill: tone.fill, stroke: 'none', shadow: false, fontSize: 12, textColor: tone.text, textAlign: 'left', verticalAlign: 'middle' }, notes[i], { container: card }),
    );
  }
  return [b.page('Canvas')];
}

export const BUSINESS_TEMPLATES: Template[] = [
  {
    id: 'bpmn-approval',
    name: 'BPMN approval process',
    category: 'Business',
    description: 'BPMN 2.0 pool with lanes, user/service/send tasks, an exclusive gateway and end events.',
    keywords: ['bpmn', 'process', 'workflow', 'approval', 'pool', 'lanes', 'gateway', 'purchase order'],
    build: bpmnPage,
  },
  {
    id: 'swimlane-onboarding',
    name: 'Swimlane process',
    category: 'Business',
    description: 'Cross-functional flowchart with color-coded lanes for each department.',
    keywords: ['swimlane', 'cross functional', 'process', 'departments', 'onboarding', 'flowchart'],
    build: swimlanePage,
  },
  {
    id: 'value-stream-map',
    name: 'Value stream map',
    category: 'Business',
    description: 'Lean VSM with supplier, production control, processes, inventory, data boxes and a lead-time ladder.',
    keywords: ['value stream', 'vsm', 'lean', 'manufacturing', 'kaizen', 'six sigma'],
    build: valueStreamPage,
  },
  {
    id: 'swot',
    name: 'SWOT analysis',
    category: 'Business',
    description: 'Strengths, weaknesses, opportunities and threats in a color-coded 2×2 grid.',
    keywords: ['swot', 'strategy', 'analysis', 'matrix', 'planning'],
    build: swotPage,
  },
  {
    id: 'business-model-canvas',
    name: 'Business model canvas',
    category: 'Business',
    description: 'The nine building blocks of a business model with sticky notes.',
    keywords: ['business model', 'canvas', 'bmc', 'strategy', 'startup', 'lean canvas'],
    build: canvasPage,
  },
];
