import type { ShapeElement } from '@/model/types';
import { Builder, TONES, solid, soft, textWidth, type Tone } from '../kit';
import type { Template } from '../types';

/** `[label, children?]` */
export type Tree = [string, Tree[]?];

const BRANCH_TONES: Tone[] = [TONES.indigo, TONES.teal, TONES.amber, TONES.rose, TONES.violet, TONES.green, TONES.sky, TONES.orange];

/** Balanced mind map: central topic, colored branches, underlined leaves. */
function mindMap(title: string, root: Tree) {
  const b = new Builder();
  const [label, kids = []] = root;
  const center = b.shape('mind.central', { x: 0, y: 0, w: Math.max(200, textWidth(label, 18, true) + 70), h: 76 }, solid(TONES.indigo, { fontSize: 18 }), label);
  kids.forEach(([text, leaves = []], i) => {
    const tone = BRANCH_TONES[i % BRANCH_TONES.length];
    const right = i < Math.ceil(kids.length / 2);
    const row = right ? i : i - Math.ceil(kids.length / 2);
    const w = Math.max(130, textWidth(text, 14, true) + 36);
    const topic = b.shape('mind.topic', { x: right ? 400 : -400, y: row * 160 - 200, w, h: 46 }, soft(tone, { radius: 23, bold: true, fontSize: 14 }), text);
    b.edge(center, topic, { routing: 'curved', endArrow: 'none', stroke: tone.stroke, strokeWidth: 3 });
    leaves.forEach(([leaf], j) => {
      const lw = Math.max(90, textWidth(leaf, 13) + 20);
      const node = b.shape('mind.branch', { x: right ? 700 : -700, y: row * 160 - 220 + j * 40, w: lw, h: 30 }, { fill: 'none', stroke: tone.stroke, strokeWidth: 2, fontSize: 13, textColor: '#1e293b' }, leaf);
      b.edge(topic, node, { routing: 'curved', endArrow: 'none', stroke: tone.stroke, strokeWidth: 2 });
    });
  });
  b.layout('mindmap', { nodeSpacing: 14, levelSpacing: 70, origin: { x: 0, y: 70 } });
  const bb = b.bounds();
  b.title(title, bb.x, 0, 600, undefined, 24);
  return [b.page('Mind map')];
}

/** Radial brainstorm: ellipse root, rings of bubbles. */
function radial(title: string, root: Tree) {
  const b = new Builder();
  const add = (node: Tree, depth: number, tone: Tone, parent?: ShapeElement, idx = 0) => {
    const [text, kids = []] = node;
    const t = depth === 1 ? BRANCH_TONES[idx % BRANCH_TONES.length] : tone;
    const style = depth === 0 ? solid(TONES.violet, { fontSize: 17 }) : depth === 1 ? solid(t, { fontSize: 14 }) : soft(t, { fontSize: 12 });
    const w = depth === 0 ? 170 : depth === 1 ? Math.max(120, textWidth(text, 14, true) + 30) : Math.max(96, textWidth(text, 12) + 26);
    const h = depth === 0 ? 96 : depth === 1 ? 56 : 40;
    const el = b.shape('ellipse', { x: 0, y: 0, w, h }, style, text);
    if (parent) b.edge(parent, el, { routing: 'straight', endArrow: 'none', stroke: t.stroke, strokeWidth: depth === 1 ? 2.5 : 1.5 });
    kids.forEach((k, i) => add(k, depth + 1, t, el, i));
  };
  add(root, 0, TONES.violet);
  b.layout('tree-radial', { nodeSpacing: 18, levelSpacing: 110, origin: { x: 0, y: 70 } });
  const bb = b.bounds();
  b.title(title, bb.x, 0, 600, undefined, 24);
  return [b.page('Brainstorm')];
}

export const MINDMAP_TEMPLATES: Template[] = [
  {
    id: 'mindmap-project',
    name: 'Project planning mind map',
    category: 'Mind maps',
    description: 'Balanced mind map with color-coded branches for goals, scope, team, timeline, risks and budget.',
    keywords: ['mind map', 'mindmap', 'project', 'planning', 'brainstorm', 'ideas'],
    build: () =>
      mindMap('Website relaunch', [
        'Website relaunch',
        [
          ['Goals', [['+30% sign-ups'], ['Faster pages'], ['New brand']]],
          ['Scope', [['Marketing site'], ['Docs portal'], ['Blog migration']]],
          ['Team', [['Design (2)'], ['Frontend (3)'], ['Content (1)']]],
          ['Timeline', [['Discovery — Jan'], ['Build — Feb–Mar'], ['Launch — April']]],
          ['Risks', [['Content delays'], ['SEO regressions']]],
          ['Budget', [['$80k total'], ['10% contingency']]],
        ],
      ]),
  },
  {
    id: 'mindmap-study',
    name: 'Study notes mind map',
    category: 'Mind maps',
    description: 'Revision mind map summarizing a topic into key concepts and facts.',
    keywords: ['mind map', 'study', 'notes', 'revision', 'education', 'learning', 'biology'],
    build: () =>
      mindMap('The cell', [
        'The cell',
        [
          ['Membrane', [['Phospholipid bilayer'], ['Selective transport']]],
          ['Nucleus', [['DNA & chromosomes'], ['Nucleolus → ribosomes']]],
          ['Organelles', [['Mitochondria — energy'], ['Ribosomes — proteins'], ['Golgi — packaging']]],
          ['Cell types', [['Prokaryotic'], ['Eukaryotic']]],
          ['Processes', [['Mitosis'], ['Respiration'], ['Protein synthesis']]],
        ],
      ]),
  },
  {
    id: 'brainstorm-radial',
    name: 'Radial brainstorm',
    category: 'Mind maps',
    description: 'Ideas radiating from a central question on concentric rings.',
    keywords: ['brainstorm', 'radial', 'ideas', 'mind map', 'bubble', 'ideation'],
    build: () =>
      radial('Product launch ideas', [
        'Launch ideas',
        [
          ['Marketing', [['Teaser video'], ['Influencers'], ['Launch blog']]],
          ['Community', [['Discord'], ['Beta program']]],
          ['Partners', [['Integrations'], ['Agencies']]],
          ['Events', [['Webinar'], ['Meetups'], ['Hackathon']]],
          ['Pricing', [['Early-bird'], ['Student plan']]],
        ],
      ]),
  },
];
