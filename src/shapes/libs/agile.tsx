/**
 * Atlassian style (Jira / Confluence): generic issue-tracker and wiki shapes —
 * issue-type and priority icons, issue cards, status lozenges, sprint and board
 * containers, wiki pages, info panels and source-control chips. Original
 * artwork; no product logos.
 */
import type { ComponentType } from 'react';
import {
  BookOpen, CalendarDays, FileText, GitBranch, GitCommitHorizontal, GitPullRequest, Info, Link, Newspaper, NotebookPen,
  Puzzle, Signpost, TriangleAlert, CircleCheck, CircleX, type LucideProps,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { RoundRect, rr, topRounded } from '../kit';
import { TextLines } from '../TextLines';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Label, Line, TONE, Tint, f, ink, item, roundRectD, shape } from './_kit2';

// ---------------------------------------------------------------------------
// Issue types & priorities (drawn in a 16-unit box)
// ---------------------------------------------------------------------------

type IssueType = 'story' | 'bug' | 'task' | 'epic' | 'subtask' | 'improvement' | 'spike';

const TYPE_COLOR: Record<IssueType, string> = {
  story: '#16a34a',
  bug: '#dc2626',
  task: '#2563eb',
  epic: '#7c3aed',
  subtask: '#0891b2',
  improvement: '#059669',
  spike: '#d97706',
};

/** White glyph inside the coloured type square (16-unit coordinates). */
const TYPE_MARK: Record<IssueType, { fill?: string; stroke?: string }> = {
  story: { fill: 'M5,3.5 H11 V12.6 L8,10.3 L5,12.6 Z' },
  bug: { fill: 'M8,4.6 A3.4,3.4 0 1 0 8,11.4 A3.4,3.4 0 1 0 8,4.6 Z' },
  task: { stroke: 'M4.4,8.4 L7,11 L11.8,5.4' },
  epic: { fill: 'M9.2,2.6 L4.6,9.2 H7.7 L6.8,13.4 L11.4,6.8 H8.3 Z' },
  subtask: { stroke: 'M3.8,3.8 H9 V9 H3.8 Z M7,7 H12.2 V12.2 H7 Z' },
  improvement: { fill: 'M8,3.2 L12.4,8 H9.6 V12.8 H6.4 V8 H3.6 Z' },
  spike: { stroke: 'M9.4,9.4 L12.6,12.6 M10,6.6 A3.4,3.4 0 1 1 3.2,6.6 A3.4,3.4 0 1 1 10,6.6 Z' },
};

/** Coloured rounded square with the issue-type glyph, top-left at (x, y). */
function TypeIcon({ x, y, size, type }: { x: number; y: number; size: number; type: IssueType }) {
  if (size <= 0) return null;
  const m = TYPE_MARK[type];
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(size / 16)})`}>
      <rect width={16} height={16} rx={3} fill={TYPE_COLOR[type]} />
      {m.fill && <path d={m.fill} fill="#ffffff" />}
      {m.stroke && <path d={m.stroke} fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
}

type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'blocker';
const PRIORITY: Record<Priority, { d: string; color: string }> = {
  highest: { d: 'M3.5,8.2 L8,4 L12.5,8.2 M3.5,12.4 L8,8.2 L12.5,12.4', color: '#dc2626' },
  high: { d: 'M3.5,10.4 L8,5.8 L12.5,10.4', color: '#ef4444' },
  medium: { d: 'M3.5,6.2 H12.5 M3.5,10 H12.5', color: '#f59e0b' },
  low: { d: 'M3.5,5.8 L8,10.4 L12.5,5.8', color: '#3b82f6' },
  lowest: { d: 'M3.5,3.8 L8,8 L12.5,3.8 M3.5,8 L8,12.2 L12.5,8', color: '#2563eb' },
  blocker: { d: 'M4.6,8 H11.4', color: '#dc2626' },
};

function PriorityIcon({ x, y, size, p }: { x: number; y: number; size: number; p: Priority }) {
  if (size <= 0) return null;
  const { d, color } = PRIORITY[p];
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(size / 16)})`}>
      {p === 'blocker' && <circle cx={8} cy={8} r={6.6} fill={color} />}
      <path d={d} fill="none" stroke={p === 'blocker' ? '#ffffff' : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Person silhouette in a coloured circle. */
function Avatar({ cx, cy, r, color = '#64748b' }: { cx: number; cy: number; r: number; color?: string }) {
  if (r <= 0) return null;
  return (
    <>
      <circle cx={f(cx)} cy={f(cy)} r={f(r)} fill={color} />
      <circle cx={f(cx)} cy={f(cy - r * 0.2)} r={f(r * 0.34)} fill="#ffffff" fillOpacity={0.92} />
      <path
        d={`M${f(cx - r * 0.62)},${f(cy + r * 0.66)} C${f(cx - r * 0.56)},${f(cy + r * 0.2)} ${f(cx - r * 0.26)},${f(cy + r * 0.16)} ${f(cx)},${f(cy + r * 0.16)} C${f(cx + r * 0.26)},${f(cy + r * 0.16)} ${f(cx + r * 0.56)},${f(cy + r * 0.2)} ${f(cx + r * 0.62)},${f(cy + r * 0.66)} Z`}
        fill="#ffffff"
        fillOpacity={0.92}
      />
    </>
  );
}

/** Rounded grey bar standing in for text. */
const Bar = ({ x, y, w, h, o = 1 }: { x: number; y: number; w: number; h: number; o?: number }) =>
  w > 0 && h > 0 ? <rect x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(h / 2)} fill="#cbd5e1" fillOpacity={o} /> : null;

/** Square icon shape (issue type / priority) that keeps its aspect ratio. */
const squareOf = (w: number, h: number) => {
  const side = Math.min(w, h);
  return { x: (w - side) / 2, y: (h - side) / 2, side };
};

// ---------------------------------------------------------------------------
// Issue card: first line "KEY | points", remaining lines = summary
// ---------------------------------------------------------------------------

function issueCard(type: IssueType) {
  return function IssueCard({ w, h, style, text }: ShapeRenderContext) {
    const pad = Math.min(10, w * 0.08, h * 0.12);
    const [first = '', ...rest] = text.split('\n');
    const [key = '', pts = ''] = first.split('|').map((t) => t.trim());
    const summary = rest.join('\n').trim();
    const footer = Math.min(22, h * 0.32);
    const fy = h - pad - footer / 2;
    const icon = Math.min(14, footer * 0.75);
    const lh = lineHeight(style.fontSize);
    const room = Math.max(0, h - pad * 2 - footer - 2);
    const maxLines = Math.floor(room / lh);
    let lines = summary ? wrapText(summary, Math.max(1, w - pad * 2), style) : [];
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      if (lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\s*\S{0,2}$/, '')}…`;
    }
    const ar = Math.min(9, footer * 0.42);
    const ax = w - pad - ar;
    const px = ax - ar - 4 - icon;
    const small = Math.max(8, style.fontSize - 3);
    const chipW = pts ? Math.max(16, pts.length * small * 0.62 + 10) : 0;
    const cx = px - 4 - chipW;
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        {lines.length ? (
          <TextLines lines={lines} x={pad} y={pad} anchor="start" style={style} />
        ) : (
          !summary && (
            <>
              <Bar x={pad} y={pad + 2} w={(w - pad * 2) * 0.9} h={Math.min(6, room * 0.2)} />
              <Bar x={pad} y={pad + 12} w={(w - pad * 2) * 0.6} h={Math.min(6, room * 0.2)} o={room > 16 ? 1 : 0} />
            </>
          )
        )}
        <TypeIcon x={pad} y={fy - icon / 2} size={icon} type={type} />
        {key ? (
          <Label x={pad + icon + 5} y={fy} text={key} s={style} size={small} anchor="start" bold color="#64748b" />
        ) : (
          <Bar x={pad + icon + 5} y={fy - 2.5} w={Math.max(0, Math.min(46, px - pad - icon - 12))} h={5} />
        )}
        {pts && chipW > 0 && cx > pad + icon + 40 && (
          <>
            <rect x={f(cx)} y={f(fy - 8)} width={f(chipW)} height={16} rx={8} fill="#e2e8f0" />
            <Label x={cx + chipW / 2} y={fy} text={pts} s={style} size={small} bold color="#334155" />
          </>
        )}
        <PriorityIcon x={px} y={fy - icon / 2} size={icon} p={type === 'bug' ? 'high' : 'medium'} />
        <Avatar cx={ax} cy={fy} r={ar} color="#6366f1" />
      </>
    );
  };
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

/** Chip: rounded box with a glyph on the left, text to its right. */
function chip(Icon: ComponentType<LucideProps>) {
  return function Chip({ w, h, style }: ShapeRenderContext) {
    const g = Math.min(h * 0.56, w * 0.3, 18);
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        <Glyph Icon={Icon} cx={Math.min(h / 2, w * 0.18) + 2} cy={h / 2} size={g} s={style} />
      </>
    );
  };
}
const chipText = (w: number, h: number) => {
  const x = Math.min(h / 2, w * 0.18) * 2 + 4;
  return { x, y: 0, w: Math.max(1, w - x - 6), h };
};

/** Coloured message panel (info / note / warning / success / error). */
function panel(Icon: ComponentType<LucideProps>) {
  return function Panel({ w, h, style }: ShapeRenderContext) {
    const g = Math.min(18, h * 0.5, w * 0.2);
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        <Glyph Icon={Icon} cx={8 + g / 2} cy={Math.min(h / 2, 8 + g / 2)} size={g} s={style} color={style.stroke === 'none' ? style.textColor : style.stroke} />
      </>
    );
  };
}
const panelText = (w: number, h: number) => {
  const g = Math.min(18, h * 0.5, w * 0.2);
  return { x: 14 + g, y: 6, w: Math.max(1, w - 22 - g), h: Math.max(1, h - 12) };
};

/** Folded-corner page outline. */
const pagePath = (w: number, h: number, c: number) => `M0,0 H${f(w - c)} L${f(w)},${f(c)} V${f(h)} H0 Z`;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const TYPES: Array<[IssueType, string, string]> = [
  ['story', 'Story', 'mxgraph.atlassian.story'],
  ['bug', 'Bug', 'mxgraph.atlassian.bug'],
  ['task', 'Task', 'mxgraph.atlassian.task'],
  ['epic', 'Epic', 'mxgraph.atlassian.epic'],
  ['subtask', 'Sub-task', 'mxgraph.atlassian.subtask'],
  ['improvement', 'Improvement', 'mxgraph.atlassian.improvement'],
  ['spike', 'Spike', 'mxgraph.atlassian.spike'],
];

const PRIORITIES: Array<[Priority, string, string]> = [
  ['highest', 'Highest', 'priorityHighest'],
  ['high', 'High', 'priorityHigh'],
  ['medium', 'Medium', 'priorityMedium'],
  ['low', 'Low', 'priorityLow'],
  ['lowest', 'Lowest', 'priorityLowest'],
  ['blocker', 'Blocker', 'blocker'],
];

const iconOpts = { textPlacement: 'below', boxHit: true } as const;

const shapes: ShapeDef[] = [
  ...TYPES.map(([t, label, stencil]) =>
    shape(`agile.${t}`, label, `shape=${stencil};verticalLabelPosition=bottom;verticalAlign=top;html=1;`, ({ w, h }) => {
      const q = squareOf(w, h);
      return <TypeIcon x={q.x} y={q.y} size={q.side} type={t} />;
    }, iconOpts),
  ),
  ...PRIORITIES.map(([p, label, kind]) =>
    shape(`agile.${kind}`, `Priority: ${label}`, `shape=mxgraph.atlassian.${kind};verticalLabelPosition=bottom;verticalAlign=top;html=1;`, ({ w, h }) => {
      const q = squareOf(w, h);
      return <PriorityIcon x={q.x} y={q.y} size={q.side} p={p} />;
    }, iconOpts),
  ),

  // ----- Cards ----------------------------------------------------------------
  shape('agile.storyCard', 'Story card', 'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;arcSize=4;', issueCard('story'), { rounded: true, textPlacement: 'custom' }),
  shape('agile.bugCard', 'Bug card', 'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;arcSize=4;', issueCard('bug'), { rounded: true, textPlacement: 'custom' }),
  shape('agile.taskCard', 'Task card', 'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;arcSize=4;', issueCard('task'), { rounded: true, textPlacement: 'custom' }),
  shape(
    'agile.epicCard',
    'Epic card',
    'rounded=1;whiteSpace=wrap;html=1;align=left;arcSize=6;',
    ({ w, h, style }) => {
      const r = rr(w, h, style.radius);
      const k = Math.min(5, w * 0.06);
      const g = Math.min(16, h * 0.4, w * 0.2);
      const by = h - Math.min(12, h * 0.2);
      const bw = Math.max(0, w - k - 34);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <path d={roundRectD(0, 0, Math.max(k, r * 2), h, r)} fill={TYPE_COLOR.epic} />
          <rect x={f(k)} y={0.75} width={f(Math.max(0, r * 2 - k + 0.5))} height={f(Math.max(0, h - 1.5))} fill={style.fill === 'none' ? '#ffffff' : style.fill} />
          <TypeIcon x={k + 8} y={Math.max(4, (by - g) / 2)} size={g} type="epic" />
          <rect x={f(k + 30)} y={f(by - 2)} width={f(bw)} height={4} rx={2} fill="#e2e8f0" />
          <rect x={f(k + 30)} y={f(by - 2)} width={f(bw * 0.6)} height={4} rx={2} fill={TYPE_COLOR.epic} fillOpacity={0.75} />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: Math.min(5, w * 0.06) + 30, y: 4, w: Math.max(1, w - Math.min(5, w * 0.06) - 38), h: Math.max(1, h - Math.min(12, h * 0.2) - 8) }) },
  ),
  shape('agile.lozenge', 'Status lozenge', 'rounded=1;whiteSpace=wrap;html=1;fontStyle=1;arcSize=20;', ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />, {
    rounded: true,
    textBox: (w, h) => ({ x: 4, y: 0, w: Math.max(1, w - 8), h }),
  }),
  shape(
    'agile.roadmapBar',
    'Roadmap bar',
    'rounded=1;whiteSpace=wrap;html=1;arcSize=30;',
    ({ w, h, style }) => {
      const r = Math.min(style.radius, h / 2);
      const g = Math.min(14, h * 0.6);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={r} />
          <path d={roundRectD(0, 0, Math.max(r * 2, w * 0.6), h, r)} fill={ink(style)} fillOpacity={0.22} />
          <TypeIcon x={Math.min(8, h * 0.25)} y={(h - g) / 2} size={g} type="epic" />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: Math.min(8, h * 0.25) + Math.min(14, h * 0.6) + 6, y: 0, w: Math.max(1, w - Math.min(14, h * 0.6) - 24), h }) },
  ),

  // ----- Containers ----------------------------------------------------------
  shape(
    'agile.sprint',
    'Sprint',
    'swimlane;startSize=40;rounded=1;arcSize=4;html=1;align=left;spacingLeft=12;container=1;collapsible=0;',
    ({ w, h, style }) => {
      const hh = Math.min(40, h * 0.4);
      const r = rr(w, h, style.radius);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Tint d={topRounded(w, hh, r)} s={style} k={0.08} />
          <Line d={`M0,${f(hh)} H${f(w)}`} s={style} k={0.5} />
          <Glyph Icon={CalendarDays} cx={w - 18} cy={hh / 2} size={Math.min(16, hh * 0.5, w * 0.1)} s={style} />
        </>
      );
    },
    { rounded: true, container: true, textBox: (w, h) => ({ x: 12, y: 2, w: Math.max(1, w - 44), h: Math.max(1, Math.min(40, h * 0.4) - 4) }) },
  ),
  shape(
    'agile.column',
    'Board column',
    'swimlane;startSize=32;rounded=1;arcSize=4;html=1;fillColor=#F4F5F7;strokeColor=none;container=1;collapsible=0;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />,
    { rounded: true, container: true, textBox: (w, h) => ({ x: 10, y: 2, w: Math.max(1, w - 20), h: Math.max(1, Math.min(30, h * 0.3)) }) },
  ),
  shape(
    'agile.space',
    'Space',
    'swimlane;startSize=44;rounded=1;arcSize=4;html=1;align=left;spacingLeft=48;container=1;collapsible=0;',
    ({ w, h, style }) => {
      const hh = Math.min(44, h * 0.4);
      const r = rr(w, h, style.radius);
      const a = Math.min(26, hh * 0.62, w * 0.2);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Tint d={topRounded(w, hh, r)} s={style} k={0.07} />
          <Line d={`M0,${f(hh)} H${f(w)}`} s={style} k={0.5} />
          <rect x={10} y={f((hh - a) / 2)} width={f(a)} height={f(a)} rx={f(a * 0.2)} fill={ink(style)} />
          <Glyph Icon={BookOpen} cx={10 + a / 2} cy={hh / 2} size={a * 0.62} s={style} color="#ffffff" />
        </>
      );
    },
    { rounded: true, container: true, textBox: (w, h) => ({ x: 18 + Math.min(26, Math.min(44, h * 0.4) * 0.62, w * 0.2), y: 2, w: Math.max(1, w - 64), h: Math.max(1, Math.min(44, h * 0.4) - 4) }) },
  ),

  // ----- Planning markers ------------------------------------------------------
  shape(
    'agile.release',
    'Release',
    'rhombus;whiteSpace=wrap;html=1;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => {
      const q = squareOf(w, h);
      const c = q.side / 2;
      const cx = q.x + c;
      const cy = q.y + c;
      return (
        <>
          <path d={`M${f(cx)},${f(q.y)} L${f(q.x + q.side)},${f(cy)} L${f(cx)},${f(q.y + q.side)} L${f(q.x)},${f(cy)} Z`} fill={ink(style)} stroke={ink(style)} strokeWidth={style.strokeWidth} strokeLinejoin="round" />
          <path d={`M${f(cx - c * 0.36)},${f(cy + c * 0.02)} L${f(cx - c * 0.08)},${f(cy + c * 0.3)} L${f(cx + c * 0.38)},${f(cy - c * 0.26)}`} fill="none" stroke="#ffffff" strokeWidth={Math.max(1, q.side * 0.08)} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    },
    { perimeter: 'diamond', textPlacement: 'below' },
  ),
  shape('agile.component', 'Component', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=26;', chip(Puzzle), { rounded: true, textBox: chipText }),
  shape('agile.label', 'Label', 'rounded=1;whiteSpace=wrap;html=1;arcSize=20;', ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />, {
    rounded: true,
    textBox: (w, h) => ({ x: 4, y: 0, w: Math.max(1, w - 8), h }),
  }),
  shape('agile.dependency', 'Dependency', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=26;', chip(Link), { rounded: true, textBox: chipText }),

  // ----- People ------------------------------------------------------------
  shape(
    'agile.avatar',
    'Avatar',
    'ellipse;whiteSpace=wrap;html=1;fontStyle=1;',
    ({ w, h, style }) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={style.fill === 'none' ? 'none' : style.fill} stroke={style.stroke === 'none' ? 'none' : style.stroke} strokeWidth={style.strokeWidth} />,
    { perimeter: 'ellipse' },
  ),
  shape(
    'agile.assignee',
    'Assignee',
    'shape=label;whiteSpace=wrap;html=1;align=left;spacingLeft=34;',
    ({ w, h, style }) => {
      const r = Math.max(0, Math.min(h / 2, w * 0.25) - 1);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={h / 2} />
          <Avatar cx={r + 1} cy={h / 2} r={r} color={ink(style)} />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: Math.min(h, w * 0.5) + 6, y: 0, w: Math.max(1, w - Math.min(h, w * 0.5) - 12), h }) },
  ),
  shape(
    'agile.comment',
    'Comment',
    'shape=callout;whiteSpace=wrap;html=1;align=left;',
    ({ w, h, style }) => {
      const r = Math.min(13, h * 0.3, w * 0.12);
      const bx = r * 2 + 8;
      const bw = Math.max(1, w - bx);
      const k = Math.min(style.radius, bw / 2, h / 2);
      const ty = Math.min(r + 2, h / 2);
      const d =
        `M${f(bx + k)},0 H${f(w - k)} Q${f(w)},0 ${f(w)},${f(k)} V${f(h - k)} Q${f(w)},${f(h)} ${f(w - k)},${f(h)} H${f(bx + k)} Q${f(bx)},${f(h)} ${f(bx)},${f(h - k)} ` +
        `V${f(Math.min(h - k, ty + 6))} L${f(bx - 6)},${f(ty)} L${f(bx)},${f(Math.max(k, ty - 4))} V${f(k)} Q${f(bx)},0 ${f(bx + k)},0 Z`;
      return (
        <>
          <Avatar cx={r} cy={r} r={r} color="#0ea5e9" />
          <path d={d} fill={style.fill === 'none' ? 'none' : style.fill} stroke={style.stroke === 'none' ? 'none' : style.stroke} strokeWidth={style.strokeWidth} strokeLinejoin="round" />
        </>
      );
    },
    { textBox: (w, h) => { const x = Math.min(13, h * 0.3, w * 0.12) * 2 + 16; return { x, y: 6, w: Math.max(1, w - x - 8), h: Math.max(1, h - 12) }; } },
  ),

  // ----- Wiki ------------------------------------------------------------------
  shape(
    'agile.page',
    'Page',
    'shape=note;whiteSpace=wrap;html=1;size=14;align=left;verticalAlign=top;spacingLeft=10;fontStyle=1;',
    ({ w, h, style }) => {
      const c = Math.min(14, w * 0.2, h * 0.2);
      const top = Math.min(36, h * 0.35);
      const rows = Math.max(0, Math.floor((h - top - 10) / 11));
      return (
        <>
          <path d={pagePath(w, h, c)} fill={style.fill === 'none' ? 'none' : style.fill} stroke={style.stroke === 'none' ? 'none' : style.stroke} strokeWidth={style.strokeWidth} strokeLinejoin="round" />
          <Line d={`M${f(w - c)},0 V${f(c)} H${f(w)}`} s={style} k={0.6} />
          {Array.from({ length: Math.min(rows, 12) }, (_, i) => (
            <Bar key={i} x={10} y={top + i * 11} w={(w - 20) * (i % 3 === 2 ? 0.55 : 0.92)} h={4} o={0.8} />
          ))}
        </>
      );
    },
    { textBox: (w, h) => ({ x: 10, y: 4, w: Math.max(1, w - 10 - Math.min(14, w * 0.2) - 4), h: Math.max(1, Math.min(36, h * 0.35) - 6) }) },
  ),
  shape(
    'agile.blogPost',
    'Blog post',
    'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;arcSize=4;',
    ({ w, h, style }) => {
      const band = Math.min(26, h * 0.3);
      const r = rr(w, h, style.radius);
      const top = band + Math.min(30, h * 0.25) + 6;
      const rows = Math.max(0, Math.floor((h - top - 6) / 11));
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Tint d={topRounded(w, band, r)} s={style} k={0.1} />
          <Glyph Icon={Newspaper} cx={14} cy={band / 2} size={Math.min(14, band * 0.6)} s={style} />
          <Bar x={28} y={band / 2 - 2.5} w={Math.min(60, w * 0.35)} h={5} o={0.9} />
          {Array.from({ length: Math.min(rows, 10) }, (_, i) => (
            <Bar key={i} x={10} y={top + i * 11} w={(w - 20) * (i % 3 === 2 ? 0.5 : 0.9)} h={4} o={0.8} />
          ))}
        </>
      );
    },
    { rounded: true, textBox: (w, h) => ({ x: 10, y: Math.min(26, h * 0.3) + 4, w: Math.max(1, w - 20), h: Math.max(1, Math.min(30, h * 0.25)) }) },
  ),
  shape(
    'agile.pageTree',
    'Page tree item',
    'text;html=1;align=left;spacingLeft=36;',
    ({ w, h, style }) => {
      const g = Math.min(14, h * 0.7);
      const cy = h / 2;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Line d={`M${f(6)},${f(cy - g * 0.28)} L${f(6 + g * 0.28)},${f(cy)} L${f(6)},${f(cy + g * 0.28)}`} s={{ ...style, stroke: '#64748b' }} k={0.9} />
          <Glyph Icon={FileText} cx={14 + g / 2 + 2} cy={cy} size={g} s={style} color="#2563eb" />
        </>
      );
    },
    { rounded: true, textBox: (w, h) => { const x = 22 + Math.min(14, h * 0.7); return { x, y: 0, w: Math.max(1, w - x - 4), h }; } },
  ),
  shape(
    'agile.whiteboard',
    'Whiteboard',
    'rounded=1;whiteSpace=wrap;html=1;verticalLabelPosition=bottom;verticalAlign=top;',
    ({ w, h, style }) => {
      const s = Math.min(w, h) * 0.22;
      const pts: Array<[number, number, string]> = [
        [0.14, 0.18, '#fde68a'],
        [0.56, 0.14, '#fbcfe8'],
        [0.3, 0.56, '#bfdbfe'],
        [0.66, 0.56, '#bbf7d0'],
      ];
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <path
            d={`M${f(w * 0.14 + s)},${f(h * 0.18 + s / 2)} C${f(w * 0.4)},${f(h * 0.18 + s / 2)} ${f(w * 0.3)},${f(h * 0.14 + s / 2)} ${f(w * 0.56)},${f(h * 0.14 + s / 2)} M${f(w * 0.3 + s / 2)},${f(h * 0.18 + s)} V${f(h * 0.56)}`}
            fill="none"
            stroke={ink(style)}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          {pts.map(([x, y, c], i) => (
            <rect key={i} x={f(w * x)} y={f(h * y)} width={f(s)} height={f(s)} rx={f(s * 0.08)} fill={c} stroke="#0f172a" strokeOpacity={0.12} strokeWidth={0.75} />
          ))}
        </>
      );
    },
    { rounded: true, textPlacement: 'below' },
  ),
  shape('agile.panelInfo', 'Info panel', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=32;fillColor=#DEEBFF;strokeColor=none;', panel(Info), { rounded: true, textBox: panelText }),
  shape('agile.panelNote', 'Note panel', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=32;fillColor=#EAE6FF;strokeColor=none;', panel(NotebookPen), { rounded: true, textBox: panelText }),
  shape('agile.panelWarning', 'Warning panel', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=32;fillColor=#FFFAE6;strokeColor=none;', panel(TriangleAlert), { rounded: true, textBox: panelText }),
  shape('agile.panelSuccess', 'Success panel', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=32;fillColor=#E3FCEF;strokeColor=none;', panel(CircleCheck), { rounded: true, textBox: panelText }),
  shape('agile.panelError', 'Error panel', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=32;fillColor=#FFEBE6;strokeColor=none;', panel(CircleX), { rounded: true, textBox: panelText }),
  shape(
    'agile.decision',
    'Decision',
    'shape=label;whiteSpace=wrap;html=1;align=left;spacingLeft=30;',
    ({ w, h, style }) => {
      const g = Math.min(h * 0.62, w * 0.3, 18);
      const cx = Math.min(h / 2, w * 0.18) + 2;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <circle cx={f(cx)} cy={f(h / 2)} r={f(g * 0.62)} fill="#16a34a" />
          <Glyph Icon={Signpost} cx={cx} cy={h / 2} size={g * 0.75} s={style} color="#ffffff" />
        </>
      );
    },
    { rounded: true, textBox: chipText },
  ),
  shape(
    'agile.action',
    'Action item',
    'shape=label;whiteSpace=wrap;html=1;align=left;spacingLeft=26;',
    ({ w, h, style }) => {
      const b = Math.min(14, h * 0.6, w * 0.3);
      const x = Math.min(h / 2, w * 0.18) + 2 - b / 2;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <rect x={f(x)} y={f((h - b) / 2)} width={f(b)} height={f(b)} rx={f(b * 0.2)} fill="#ffffff" stroke="#64748b" strokeWidth={1.25} />
        </>
      );
    },
    { rounded: true, textBox: chipText },
  ),
  shape(
    'agile.actionDone',
    'Action item (done)',
    'shape=label;whiteSpace=wrap;html=1;align=left;spacingLeft=26;',
    ({ w, h, style }) => {
      const b = Math.min(14, h * 0.6, w * 0.3);
      const x = Math.min(h / 2, w * 0.18) + 2 - b / 2;
      const y = (h - b) / 2;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <rect x={f(x)} y={f(y)} width={f(b)} height={f(b)} rx={f(b * 0.2)} fill="#2563eb" />
          <path d={`M${f(x + b * 0.24)},${f(y + b * 0.52)} L${f(x + b * 0.43)},${f(y + b * 0.72)} L${f(x + b * 0.78)},${f(y + b * 0.3)}`} fill="none" stroke="#ffffff" strokeWidth={Math.max(1, b * 0.13)} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    },
    { rounded: true, textBox: chipText },
  ),

  // ----- Source control --------------------------------------------------------
  shape('agile.pullRequest', 'Pull request', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=26;', chip(GitPullRequest), { rounded: true, textBox: chipText }),
  shape('agile.branch', 'Branch', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=26;', chip(GitBranch), { rounded: true, textBox: chipText }),
  shape('agile.commit', 'Commit', 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=26;', chip(GitCommitHorizontal), { rounded: true, textBox: chipText }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const left: Partial<ElementStyle> = { textAlign: 'left' };
const card: Partial<ElementStyle> = { fill: '#ffffff', stroke: '#dfe1e6', strokeWidth: 1, radius: 4, fontSize: 13, textColor: '#172b4d', shadow: true };
const chipStyle = (k: keyof typeof TONE): Partial<ElementStyle> => ({ ...TONE[k], strokeWidth: 1, radius: 4, fontSize: 12, ...left });
const plain: Partial<ElementStyle> = { fill: 'none', stroke: 'none', fontSize: 13, textColor: '#172b4d', ...left };
const lozenge = (fill: string, color: string): Partial<ElementStyle> => ({ fill, stroke: 'none', textColor: color, bold: true, fontSize: 11, radius: 3 });
/** Panels colour their glyph with the stroke; a zero width keeps the outline hidden. */
const panelStyle = (fill: string, stroke: string): Partial<ElementStyle> => ({ fill, stroke, strokeWidth: 0, textColor: '#172b4d', radius: 4, fontSize: 13, ...left });

const typeItems: LibraryItem[] = TYPES.map(([t, label]) =>
  item(`agile.${t}`, label, 24, 24, { text: label, style: { fontSize: 11 }, keywords: `jira issue type icon ${t} ${t === 'spike' ? 'research investigation' : ''}`.trim() }),
);
const priorityItems: LibraryItem[] = PRIORITIES.map(([p, label, kind]) =>
  item(`agile.${kind}`, `Priority ${label}`, 22, 22, { text: label, style: { fontSize: 11 }, keywords: `jira priority ${p} severity importance` }),
);

const libraries: ShapeLibrary[] = [
  {
    id: 'agile',
    name: 'Atlassian style (Jira / Confluence)',
    items: [
      ...typeItems,
      ...priorityItems,
      item('agile.storyCard', 'Story card', 240, 96, { text: 'PROJ-123 | 3\nAs a user I can sign in with SSO', style: card, keywords: 'jira issue card ticket user story board kanban scrum' }),
      item('agile.bugCard', 'Bug card', 240, 96, { text: 'PROJ-207 | 2\nCheckout fails when the cart is empty', style: card, keywords: 'jira issue card ticket defect bug board' }),
      item('agile.taskCard', 'Task card', 240, 96, { text: 'PROJ-311 | 1\nUpdate API documentation', style: card, keywords: 'jira issue card ticket task todo board' }),
      item('agile.epicCard', 'Epic card', 240, 64, { text: 'Checkout redesign', style: { ...card, bold: true, ...left }, keywords: 'jira epic initiative feature card progress' }),
      item('agile.roadmapBar', 'Roadmap bar', 220, 28, { text: 'Checkout redesign', style: { ...TONE.violet, strokeWidth: 1, radius: 6, fontSize: 12, bold: true, ...left }, keywords: 'jira roadmap timeline epic bar plan gantt' }),
      item('agile.lozenge', 'To do', 64, 20, { text: 'TO DO', style: lozenge('#e2e8f0', '#334155'), keywords: 'jira status lozenge todo backlog open' }),
      item('agile.lozenge', 'In progress', 92, 20, { text: 'IN PROGRESS', style: lozenge('#dbeafe', '#1d4ed8'), keywords: 'jira status lozenge in progress doing wip' }),
      item('agile.lozenge', 'Done', 56, 20, { text: 'DONE', style: lozenge('#dcfce7', '#15803d'), keywords: 'jira status lozenge done resolved closed complete' }),
      item('agile.lozenge', 'Blocked', 72, 20, { text: 'BLOCKED', style: lozenge('#fee2e2', '#b91c1c'), keywords: 'jira status lozenge blocked impediment stuck' }),
      item('agile.sprint', 'Sprint', 340, 240, { text: 'Sprint 14\n3 Mar – 17 Mar · 24 points', style: { fill: '#ffffff', stroke: '#c1c7d0', strokeWidth: 1, radius: 6, fontSize: 12, bold: true, textColor: '#172b4d', ...left }, keywords: 'jira sprint iteration scrum backlog container timebox' }),
      item('agile.column', 'Board column', 260, 360, { text: 'IN PROGRESS  3', style: { fill: '#f4f5f7', stroke: 'none', radius: 6, fontSize: 11, bold: true, textColor: '#5e6c84', ...left, verticalAlign: 'middle' }, keywords: 'jira kanban board column swimlane lane status' }),
      item('agile.release', 'Release', 28, 28, { text: 'v2.4', style: { stroke: '#16a34a', fontSize: 11 }, keywords: 'jira release version milestone ship fix version' }),
      item('agile.component', 'Component', 120, 26, { text: 'payments', style: chipStyle('slate'), keywords: 'jira component module area tag' }),
      item('agile.label', 'Label', 72, 22, { text: 'frontend', style: { fill: '#e2e8f0', stroke: 'none', radius: 3, fontSize: 11, textColor: '#334155' }, keywords: 'jira label tag chip' }),
      item('agile.dependency', 'Dependency', 120, 26, { text: 'blocks PROJ-9', style: chipStyle('red'), keywords: 'jira dependency blocks blocked by link relates issue link' }),
      item('agile.avatar', 'Avatar', 32, 32, { text: 'JD', style: { fill: '#6366f1', stroke: 'none', textColor: '#ffffff', bold: true, fontSize: 12 }, keywords: 'user person initials profile' }),
      item('agile.assignee', 'Assignee', 150, 30, { text: 'Jane Doe', style: { ...plain, fill: '#f4f5f7', stroke: '#4f46e5', strokeWidth: 0 }, keywords: 'jira assignee user person reporter owner' }),
      item('agile.comment', 'Comment', 240, 70, { text: 'Looks good — merging after QA.', style: { fill: '#ffffff', stroke: '#c1c7d0', strokeWidth: 1, radius: 8, fontSize: 12, textColor: '#172b4d', ...left }, keywords: 'jira confluence comment reply discussion feedback' }),
      item('agile.page', 'Page', 160, 200, { text: 'Architecture overview', style: { fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, fontSize: 13, bold: true, textColor: '#172b4d', ...left }, keywords: 'confluence wiki page document doc article' }),
      item('agile.blogPost', 'Blog post', 180, 180, { text: 'Release notes – March', style: { fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, radius: 6, fontSize: 13, bold: true, textColor: '#172b4d', ...left }, keywords: 'confluence blog post news announcement article' }),
      item('agile.space', 'Space', 360, 260, { text: 'Engineering', style: { fill: '#ffffff', stroke: '#0052cc', strokeWidth: 1, radius: 6, fontSize: 14, bold: true, textColor: '#172b4d', ...left }, keywords: 'confluence space wiki team container knowledge base' }),
      item('agile.pageTree', 'Page tree item', 180, 24, { text: 'Getting started', style: { ...plain, fontSize: 12 }, keywords: 'confluence page tree hierarchy sidebar navigation child page' }),
      item('agile.whiteboard', 'Whiteboard', 120, 80, { text: 'Whiteboard', style: { fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, radius: 6, fontSize: 12 }, keywords: 'confluence whiteboard brainstorm sticky notes canvas' }),
      item('agile.panelInfo', 'Info panel', 260, 48, { text: 'Info: this page is maintained by the platform team.', style: panelStyle('#dbeafe', '#2563eb'), keywords: 'confluence macro panel info information callout' }),
      item('agile.panelNote', 'Note panel', 260, 48, { text: 'Note: review before the release.', style: panelStyle('#ede9fe', '#7c3aed'), keywords: 'confluence macro panel note callout' }),
      item('agile.panelWarning', 'Warning panel', 260, 48, { text: 'Warning: this API is deprecated.', style: panelStyle('#fef3c7', '#d97706'), keywords: 'confluence macro panel warning caution callout' }),
      item('agile.panelSuccess', 'Success panel', 260, 48, { text: 'Success: migration completed.', style: panelStyle('#dcfce7', '#16a34a'), keywords: 'confluence macro panel success tip check callout' }),
      item('agile.panelError', 'Error panel', 260, 48, { text: 'Error: do not run in production.', style: panelStyle('#fee2e2', '#dc2626'), keywords: 'confluence macro panel error danger callout' }),
      item('agile.decision', 'Decision', 220, 30, { text: 'Use PostgreSQL for orders', style: plain, keywords: 'confluence decision log choice adr' }),
      item('agile.action', 'Action item', 200, 26, { text: 'Write migration plan', style: plain, keywords: 'confluence action item task checkbox todo' }),
      item('agile.actionDone', 'Action item (done)', 200, 26, { text: 'Book meeting room', style: { ...plain, strike: true, textColor: '#64748b' } as Partial<ElementStyle>, keywords: 'confluence action item task checkbox done completed' }),
      item('agile.pullRequest', 'Pull request', 150, 26, { text: 'PR #42', style: chipStyle('green'), keywords: 'bitbucket git pull request merge request pr code review' }),
      item('agile.branch', 'Branch', 170, 26, { text: 'feature/PROJ-123', style: chipStyle('blue'), keywords: 'bitbucket git branch feature' }),
      item('agile.commit', 'Commit', 120, 26, { text: 'a1b2c3d', style: { ...chipStyle('slate'), fontFamily: 'mono' } as Partial<ElementStyle>, keywords: 'bitbucket git commit hash changeset' }),
    ],
  },
];

export { shapes, libraries };
