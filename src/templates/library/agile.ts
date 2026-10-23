import { Builder, INK, LINE, MUTED, TONES, grid, soft, solid, type Tone } from '../kit';
import type { Template } from '../types';

function kanban() {
  const b = new Builder();
  b.title('Sprint 14 board', 0, 0, 1100, 'Kanban — drag cards between columns');
  type Card = [string, 'feature' | 'bug' | 'chore' | 'design'];
  const cols: Array<[string, Tone, Card[]]> = [
    ['Backlog', TONES.slate, [['Dark mode for exports', 'feature'], ['Keyboard shortcut cheatsheet', 'feature'], ['Upgrade build tooling', 'chore'], ['Onboarding illustrations', 'design']]],
    ['To do', TONES.indigo, [['Template gallery search', 'feature'], ['Crash when pasting SVG', 'bug'], ['Audit icon licences', 'chore']]],
    ['In progress', TONES.blue, [['Real-time cursors', 'feature'], ['Fix connector jitter', 'bug']]],
    ['Review', TONES.amber, [['Settings page redesign', 'design'], ['PDF font embedding', 'feature']]],
    ['Done', TONES.green, [['Auto-layout v2', 'feature'], ['Faster startup', 'chore'], ['Undo across pages', 'bug']]],
  ];
  const tag: Record<Card[1], Tone> = { feature: TONES.blue, bug: TONES.red, chore: TONES.slate, design: TONES.violet };
  const CW = 236;
  const H = 560;
  cols.forEach(([name, tone, cards], i) => {
    const x = i * (CW + 18);
    const col = b.shape('kanban.column', { x, y: 90, w: CW, h: H }, { fill: tone.fill, stroke: tone.stroke, textColor: tone.text, radius: 12, fontSize: 14, fillOpacity: 0.55 }, `${name}\n${cards.length}`);
    cards.forEach(([t, kind], j) => {
      const tt = tag[kind];
      b.shape('kanban.card', { x: x + 12, y: 90 + 54 + j * 108, w: CW - 24, h: 96 }, { fill: '#ffffff', stroke: tt.stroke, radius: 8, fontSize: 13, shadow: true, textAlign: 'left', verticalAlign: 'top', textColor: INK }, `${t}\n${kind}`, { container: col });
    });
  });
  return [b.page('Board')];
}

function roadmap() {
  const b = new Builder();
  b.title('Product roadmap 2026', 0, 0, 1000, 'Quarterly themes and key deliverables');
  const qs: Array<[string, string, Tone, string[]]> = [
    ['Q1', 'Foundations', TONES.teal, ['New rendering engine', 'Plugin API (alpha)', 'Performance budget']],
    ['Q2', 'Collaboration', TONES.blue, ['Real-time co-editing', 'Comments & mentions', 'Share links']],
    ['Q3', 'Intelligence', TONES.violet, ['AI diagram generation', 'Smart auto-layout', 'Template gallery']],
    ['Q4', 'Scale', TONES.orange, ['Enterprise SSO', 'Admin console', 'Audit logs']],
  ];
  const W = 250;
  qs.forEach(([q, theme, tone, items], i) => {
    const x = i * (W - 8);
    b.shape(i === 0 ? 'info.chevronStart' : 'info.chevron', { x, y: 96, w: W, h: 64 }, solid(tone, { fontSize: 16 }), `${q} · ${theme}`);
    items.forEach((t, j) => {
      b.shape('rectangle', { x: x + 18, y: 186 + j * 64, w: W - 52, h: 50 }, soft(tone, { radius: 10, fontSize: 13, fill: '#ffffff' }), t);
    });
  });
  const ms: Array<[string, number]> = [['Beta', 1.1], ['v2.0 launch', 2.0], ['Enterprise GA', 3.6]];
  const axisY = 400;
  const total = 4 * (W - 8) + 8;
  b.shape('timeline.axis', { x: 0, y: axisY, w: total, h: 20 }, { stroke: MUTED, strokeWidth: 1.5 });
  for (const [t, at] of ms) {
    b.shape('gantt.milestone', { x: at * (W - 8) - 11, y: axisY + 30, w: 22, h: 22 }, solid(TONES.red, { textColor: INK, fontSize: 12 }), t);
  }
  return [b.page('Roadmap')];
}

function gantt() {
  const b = new Builder();
  b.title('Website redesign — schedule', 0, 0, 1000, 'Gantt chart · 12 weeks starting Jan 5');
  const LW = 220;
  const WK = 56;
  const RH = 36;
  const weeks = 12;
  const x0 = LW;
  const y0 = 96;
  const months: Array<[string, number]> = [['January', 4], ['February', 4], ['March', 4]];
  let mx = x0;
  for (const [m, n] of months) {
    b.shape('rectangle', { x: mx, y: y0, w: n * WK, h: 28 }, { fill: '#f1f5f9', stroke: '#cbd5e1', radius: 0, fontSize: 12, bold: true, textColor: '#334155', strokeWidth: 1 }, m);
    mx += n * WK;
  }
  for (let w = 0; w < weeks; w++) {
    b.shape('rectangle', { x: x0 + w * WK, y: y0 + 28, w: WK, h: 24 }, { fill: '#ffffff', stroke: '#cbd5e1', radius: 0, fontSize: 11, textColor: MUTED, strokeWidth: 1 }, `W${w + 1}`);
  }
  b.shape('rectangle', { x: 0, y: y0, w: LW, h: 52 }, { fill: '#f1f5f9', stroke: '#cbd5e1', radius: 0, fontSize: 12, bold: true, textColor: '#334155', textAlign: 'left', strokeWidth: 1 }, 'Task');
  type Row = [label: string, start: number, len: number, kind: 'phase' | 'task' | 'milestone', tone: Tone, progress?: 25 | 50 | 75];
  const rows: Row[] = [
    ['Discovery', 0, 3, 'phase', TONES.slate],
    ['Stakeholder interviews', 0, 2, 'task', TONES.teal, 75],
    ['Analytics review', 1, 2, 'task', TONES.teal, 75],
    ['Design', 2, 5, 'phase', TONES.slate],
    ['Wireframes', 2, 2, 'task', TONES.blue, 75],
    ['Visual design', 4, 3, 'task', TONES.blue, 50],
    ['Design sign-off', 7, 0, 'milestone', TONES.red],
    ['Build', 6, 6, 'phase', TONES.slate],
    ['Frontend', 6, 4, 'task', TONES.violet, 25],
    ['CMS integration', 7, 4, 'task', TONES.violet, 25],
    ['QA & launch', 10, 2, 'task', TONES.orange, 25],
    ['Go live', 12, 0, 'milestone', TONES.red],
  ];
  const top = y0 + 52;
  rows.forEach(([label, start, len, kind, tone, p], i) => {
    const y = top + i * RH;
    b.text(label, { x: kind === 'phase' ? 12 : 28, y, w: LW - 32, h: RH }, { fontSize: 13, bold: kind === 'phase', textAlign: 'left', textColor: kind === 'milestone' ? tone.stroke : INK });
    if (kind === 'phase') b.shape('gantt.summary', { x: x0 + start * WK + 2, y: y + 12, w: len * WK - 4, h: 14 }, { fill: '#334155', stroke: '#334155' });
    else if (kind === 'milestone') b.shape('gantt.milestone', { x: x0 + start * WK - 10, y: y + 8, w: 20, h: 20 }, solid(tone));
    else b.shape(`gantt.bar${p}`, { x: x0 + start * WK + 2, y: y + 5, w: len * WK - 4, h: RH - 10 }, soft(tone, { radius: 6, fontSize: 11, textAlign: 'left' }), `${p}%`);
  });
  const bottom = top + rows.length * RH;
  for (let w = 0; w <= weeks; w++) b.line({ x: x0 + w * WK, y: top }, { x: x0 + w * WK, y: bottom }, { stroke: '#e2e8f0', strokeWidth: 1 });
  b.line({ x: 0, y: bottom }, { x: x0 + weeks * WK, y: bottom }, { stroke: '#cbd5e1', strokeWidth: 1 });
  const today = x0 + 5.4 * WK;
  b.line({ x: today, y: y0 + 52 }, { x: today, y: bottom + 8 }, { stroke: TONES.red.stroke, strokeWidth: 2, dashed: true });
  b.shape('rectangle', { x: today - 26, y: bottom + 10, w: 52, h: 20 }, solid(TONES.red, { radius: 10, fontSize: 11 }), 'Today');
  return [b.page('Gantt')];
}

function retro() {
  const b = new Builder();
  b.title('Sprint retrospective', 0, 0, 1000, 'Sprint 13 · What went well, what to improve, and actions');
  const cols: Array<[string, Tone, string, string[]]> = [
    ['What went well', TONES.green, '#bbf7d0', ['Shipped auto-layout on time', 'Great pairing sessions', 'Fewer flaky tests', 'Clear sprint goal']],
    ['What to improve', TONES.amber, '#fde68a', ['Too many meetings', 'PR reviews waited 2+ days', 'Unclear design hand-off']],
    ['Action items', TONES.blue, '#bfdbfe', ['No-meeting Wednesdays — Sam', 'Review SLA: 24 h — team', 'Design QA checklist — Ava']],
  ];
  const CW = 320;
  cols.forEach(([name, tone, sticky, notes], i) => {
    const x = i * (CW + 24);
    const col = b.shape('lane.collapsible', { x, y: 96, w: CW, h: 470 }, { fill: tone.fill, stroke: tone.stroke, textColor: tone.text, bold: true, fontSize: 15, radius: 14, fillOpacity: 0.5, textAlign: 'left' }, name);
    grid(notes.length, 2, { w: 136, h: 120 }, { x: 16, y: 16 }, { x: x + 16, y: 96 + 52 }).forEach((r, j) =>
      b.shape('sticky', r, { fill: sticky, stroke: 'none', shadow: true, fontSize: 14, textColor: '#1f2937', textAlign: 'left', verticalAlign: 'top', fontFamily: 'hand' }, notes[j], { container: col }),
    );
  });
  b.text('Vote with dots · timebox 45 min', { x: 0, y: 580, w: 600, h: 22 }, { fontSize: 12, textColor: MUTED, textAlign: 'left' });
  b.line({ x: 0, y: 574 }, { x: 3 * CW + 48, y: 574 }, { stroke: LINE, strokeWidth: 1 });
  return [b.page('Retro')];
}

export const AGILE_TEMPLATES: Template[] = [
  {
    id: 'kanban-board',
    name: 'Kanban board',
    category: 'Agile',
    description: 'Five-column sprint board with color-tagged cards for features, bugs, chores and design.',
    keywords: ['kanban', 'board', 'scrum', 'sprint', 'agile', 'tasks', 'trello', 'backlog'],
    build: kanban,
  },
  {
    id: 'product-roadmap',
    name: 'Product roadmap',
    category: 'Agile',
    description: 'Quarterly roadmap with themed chevrons, deliverables and milestones on a timeline.',
    keywords: ['roadmap', 'timeline', 'quarters', 'product', 'planning', 'milestones', 'sprint timeline'],
    build: roadmap,
  },
  {
    id: 'gantt-chart',
    name: 'Gantt chart',
    category: 'Agile',
    description: '12-week project schedule with phases, progress bars, milestones and a today marker.',
    keywords: ['gantt', 'schedule', 'project', 'timeline', 'plan', 'tasks', 'milestones'],
    build: gantt,
  },
  {
    id: 'sprint-retro',
    name: 'Sprint retrospective',
    category: 'Agile',
    description: 'Went well / to improve / action items board with sticky notes.',
    keywords: ['retrospective', 'retro', 'sprint', 'agile', 'sticky notes', 'scrum', 'team'],
    build: retro,
  },
];
