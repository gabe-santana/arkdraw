import type { ShapeElement } from '@/model/types';
import { Builder, TONES, soft, textWidth, type Tone } from '../kit';
import type { Template } from '../types';

/** `[name, role, reports?]` */
type Person = [string, string, Person[]?];

const LEVEL_TONES: Tone[] = [TONES.indigo, TONES.blue, TONES.teal, TONES.slate];

function orgChart(title: string, subtitle: string, root: Person) {
  const b = new Builder();
  const add = (p: Person, depth: number, parent?: ShapeElement) => {
    const [name, role, reports = []] = p;
    const tone = LEVEL_TONES[Math.min(depth, LEVEL_TONES.length - 1)];
    const vacancy = name === 'Open role';
    const style = vacancy
      ? { fill: '#f8fafc', stroke: '#94a3b8', strokeStyle: 'dashed' as const, radius: 10, fontSize: 13, textColor: '#475569' }
      : depth === 0
        ? { fill: tone.fill, stroke: tone.stroke, radius: 10, fontSize: 13, textColor: tone.text, strokeWidth: 2 }
        : soft(tone, { fill: '#ffffff', radius: 10, fontSize: 13 });
    const w = Math.max(200, textWidth(name, 13, true) + 80, textWidth(role, 13) + 80);
    const el = b.shape('org.person', { x: 0, y: 0, w, h: 64 }, style, `${name}\n${role}`);
    if (parent) b.edge(parent, el, { endArrow: 'none', stroke: '#94a3b8' });
    reports.forEach((r) => add(r, depth + 1, el));
  };
  add(root, 0);
  b.layout('org-chart', { nodeSpacing: 36, levelSpacing: 56, origin: { x: 0, y: 90 } });
  b.title(title, 0, 0, 600, subtitle);
  return [b.page('Org chart')];
}

/** Department view: units on top, people with photo cards beneath (vertical tree). */
function teamChart() {
  const b = new Builder();
  const ceo = b.shape('org.personTop', { x: 0, y: 0, w: 150, h: 136 }, soft(TONES.violet, { fill: '#ffffff', radius: 12, fontSize: 13 }), 'Maya Chen\nCEO');
  const depts: Array<[string, Tone, Array<[string, string]>]> = [
    ['Product', TONES.blue, [['Liam Ortiz', 'Head of Product'], ['Ava Patel', 'Designer']]],
    ['Engineering', TONES.teal, [['Noah Kim', 'CTO'], ['Emma Rossi', 'Backend'], ['Lucas Silva', 'Frontend']]],
    ['Go-to-market', TONES.amber, [['Sofia Novak', 'Marketing'], ['Ethan Brown', 'Sales']]],
  ];
  for (const [name, tone, people] of depts) {
    const unit = b.shape('org.unit', { x: 0, y: 0, w: 180, h: 54 }, soft(tone, { radius: 10, bold: true, fontSize: 14 }), name);
    b.edge(ceo, unit, { endArrow: 'none', stroke: '#94a3b8' });
    for (const [n, r] of people) {
      const p = b.shape('org.personTop', { x: 0, y: 0, w: 130, h: 126 }, soft(tone, { fill: '#ffffff', radius: 12, fontSize: 12 }), `${n}\n${r}`);
      b.edge(unit, p, { endArrow: 'none', stroke: '#94a3b8' });
    }
  }
  b.layout('tree-vertical', { nodeSpacing: 24, levelSpacing: 50, origin: { x: 0, y: 90 } });
  b.title('Startup team', 0, 0, 600, 'Departments and people');
  return [b.page('Team')];
}

export const ORG_TEMPLATES: Template[] = [
  {
    id: 'org-chart-company',
    name: 'Company org chart',
    category: 'Org charts',
    description: 'Executive team, managers and stacked reports with a vacancy, laid out automatically.',
    keywords: ['org chart', 'organization', 'hierarchy', 'company', 'reporting', 'hr', 'team'],
    build: () =>
      orgChart('Acme Inc. organization', 'Leadership and reporting lines', [
        'Grace Hopper',
        'Chief Executive Officer',
        [
          ['Alan Turing', 'CTO', [['Ada Lovelace', 'Eng. Manager', [['Linus T.', 'Senior Engineer'], ['Margaret H.', 'Engineer'], ['Open role', 'Engineer']]], ['Ken Thompson', 'Platform Lead', [['Dennis R.', 'SRE'], ['Barbara L.', 'SRE']]]]],
          ['Katherine Johnson', 'CFO', [['Annie Easley', 'Controller'], ['Mary Jackson', 'FP&A Analyst']]],
          ['Steve Wozniak', 'VP Sales', [['Hedy Lamarr', 'Account Exec.'], ['Radia Perlman', 'Sales Engineer'], ['Open role', 'SDR']]],
        ],
      ]),
  },
  {
    id: 'org-chart-team',
    name: 'Team structure',
    category: 'Org charts',
    description: 'Departments with photo cards for each team member.',
    keywords: ['org chart', 'team', 'departments', 'people', 'photo', 'structure'],
    build: teamChart,
  },
];
