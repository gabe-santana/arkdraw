/**
 * BPMN 2.0: events (every position × valid trigger), activities with task-type
 * and loop markers, gateways, data, pools & lanes, group and annotation.
 */
import type { ReactNode } from 'react';
import { Hand, Mail, ScrollText, Settings, User } from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { Body, RoundRect, inset, rr, strokeAttrs } from '../kit';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import {
  FillOnly, Glyph, Line, Oval, TONE, arcD, clamp, circleD, f, ink, item, paper, pathOf, polar, regularPts, roundRectD, shape, solid,
  type Pt,
} from './_kit2';
import { renderPoolH, renderPoolV, topBandBox } from './containers';

// ---------------------------------------------------------------------------
// Markers (event triggers & gateway symbols), drawn around a centre point
// ---------------------------------------------------------------------------

type Trigger =
  | 'none' | 'message' | 'timer' | 'error' | 'signal' | 'escalation' | 'terminate' | 'conditional'
  | 'compensation' | 'cancel' | 'link' | 'multiple' | 'parallelMultiple';

/** Unit-space points (−0.5..0.5) → absolute path. */
const unit = (cx: number, cy: number, k: number, pts: readonly Pt[]) => pathOf(pts.map(([x, y]) => [cx + x * k, cy + y * k] as const));

const X_PTS = (a: number, e: number): Pt[] =>
  (
    [
      [0, a], [a, 0], [0.5, 0.5 - a], [1 - a, 0], [1, a], [0.5 + a, 0.5], [1, 1 - a], [1 - a, 1], [0.5, 0.5 + a], [a, 1], [0, 1 - a], [0.5 - a, 0.5],
    ] as Pt[]
  ).map(([x, y]) => [(x - 0.5) * e * 2, (y - 0.5) * e * 2] as const);

const PLUS_PTS = (t: number, e: number): Pt[] => [
  [-t, -e], [t, -e], [t, -t], [e, -t], [e, t], [t, t], [t, e], [-t, e], [-t, t], [-e, t], [-e, -t], [-t, -t],
];

function envelope(x: number, y: number, w: number, h: number, s: ElementStyle, filled: boolean, key?: string) {
  const ms = { ...solid(s, 0.85), fill: filled ? ink(s) : paper(s) };
  return (
    <g key={key}>
      <Body d={`M${f(x)},${f(y)} H${f(x + w)} V${f(y + h)} H${f(x)} Z`} s={ms} />
      <path
        d={`M${f(x)},${f(y)} L${f(x + w / 2)},${f(y + h * 0.55)} L${f(x + w)},${f(y)}`}
        fill="none"
        stroke={filled ? paper(s) : ink(s)}
        strokeWidth={ms.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function triggerMarker(t: Trigger, cx: number, cy: number, k: number, s: ElementStyle, filled: boolean): ReactNode {
  const ms: ElementStyle = { ...solid(s, 0.85), fill: filled ? ink(s) : 'none' };
  const U = (pts: readonly Pt[]) => <Body d={unit(cx, cy, k, pts)} s={ms} />;
  switch (t) {
    case 'none':
      return null;
    case 'message':
      return envelope(cx - 0.36 * k, cy - 0.25 * k, 0.72 * k, 0.5 * k, s, filled);
    case 'timer': {
      const r = 0.4 * k;
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const [x0, y0] = polar(cx, cy, r * 0.78, r * 0.78, i * 30);
        const [x1, y1] = polar(cx, cy, r, r, i * 30);
        return `M${f(x0)},${f(y0)} L${f(x1)},${f(y1)}`;
      }).join(' ');
      return (
        <>
          <Body d={circleD(cx, cy, r)} s={{ ...ms, fill: paper(s) }} />
          <Line d={ticks} s={s} k={0.5} />
          <Line d={`M${f(cx)},${f(cy)} L${f(cx)},${f(cy - r * 0.62)} M${f(cx)},${f(cy)} L${f(cx + r * 0.45)},${f(cy + r * 0.15)}`} s={s} k={0.8} />
        </>
      );
    }
    case 'error':
      return U([[-0.36, 0.38], [-0.14, -0.34], [0.08, 0.06], [0.36, -0.38], [0.16, 0.34], [-0.06, -0.04]]);
    case 'signal':
      return U([[0, -0.38], [0.38, 0.3], [-0.38, 0.3]]);
    case 'escalation':
      return U([[0, -0.4], [0.3, 0.36], [0, 0.08], [-0.3, 0.36]]);
    case 'terminate':
      return <path d={circleD(cx, cy, 0.38 * k)} fill={ink(s)} stroke="none" />;
    case 'conditional': {
      const lines = [-0.2, -0.07, 0.07, 0.2].map((y) => `M${f(cx - 0.18 * k)},${f(cy + y * k)} H${f(cx + 0.18 * k)}`).join(' ');
      return (
        <>
          <Body d={unit(cx, cy, k, [[-0.28, -0.36], [0.28, -0.36], [0.28, 0.36], [-0.28, 0.36]])} s={{ ...ms, fill: paper(s) }} />
          <Line d={lines} s={s} k={0.6} />
        </>
      );
    }
    case 'compensation':
      return (
        <>
          {U([[-0.42, 0], [-0.02, -0.28], [-0.02, 0.28]])}
          {U([[0.02, 0], [0.42, -0.28], [0.42, 0.28]])}
        </>
      );
    case 'cancel':
      return U(X_PTS(0.15, 0.34));
    case 'link':
      return U([[-0.38, -0.14], [0.06, -0.14], [0.06, -0.32], [0.4, 0], [0.06, 0.32], [0.06, 0.14], [-0.38, 0.14]]);
    case 'multiple':
      return <Body d={pathOf(regularPts(cx, cy + 0.04 * k, 0.4 * k, 0.4 * k, 5))} s={ms} />;
    case 'parallelMultiple':
      return U(PLUS_PTS(0.12, 0.38));
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

type Pos = 'start' | 'startNI' | 'catch' | 'catchNI' | 'throw' | 'end';

const POSITIONS: Record<Pos, { label: string; outline: string; triggers: Trigger[]; keywords: string }> = {
  start: {
    label: 'Start',
    outline: 'standard',
    triggers: ['none', 'message', 'timer', 'conditional', 'signal', 'multiple', 'parallelMultiple', 'error', 'escalation', 'compensation'],
    keywords: 'start event begin trigger',
  },
  startNI: {
    label: 'Start (non-interrupting)',
    outline: 'eventNonint',
    triggers: ['message', 'timer', 'conditional', 'signal', 'multiple', 'parallelMultiple', 'escalation'],
    keywords: 'start event non-interrupting event sub-process dashed',
  },
  catch: {
    label: 'Intermediate catch',
    outline: 'catching',
    triggers: ['message', 'timer', 'conditional', 'link', 'signal', 'multiple', 'parallelMultiple', 'error', 'escalation', 'cancel', 'compensation'],
    keywords: 'intermediate catching boundary event wait',
  },
  catchNI: {
    label: 'Boundary (non-interrupting)',
    outline: 'boundNonint',
    triggers: ['message', 'timer', 'conditional', 'signal', 'multiple', 'parallelMultiple', 'escalation'],
    keywords: 'boundary intermediate event non-interrupting dashed',
  },
  throw: {
    label: 'Intermediate throw',
    outline: 'throwing',
    triggers: ['none', 'message', 'escalation', 'link', 'compensation', 'signal', 'multiple'],
    keywords: 'intermediate throwing event send',
  },
  end: {
    label: 'End',
    outline: 'end',
    triggers: ['none', 'message', 'error', 'escalation', 'cancel', 'compensation', 'signal', 'terminate', 'multiple'],
    keywords: 'end event finish stop',
  },
};

const TRIGGER_LABEL: Record<Trigger, string> = {
  none: '', message: 'message', timer: 'timer', error: 'error', signal: 'signal', escalation: 'escalation', terminate: 'terminate',
  conditional: 'conditional', compensation: 'compensation', cancel: 'cancel', link: 'link', multiple: 'multiple', parallelMultiple: 'parallel multiple',
};

const DRAWIO_SYMBOL: Record<Trigger, string> = {
  none: 'general', message: 'message', timer: 'timer', error: 'error', signal: 'signal', escalation: 'escalation', terminate: 'terminate',
  conditional: 'conditional', compensation: 'compensation', cancel: 'cancel', link: 'link', multiple: 'multiple', parallelMultiple: 'parallelMultiple',
};

const eventKind = (pos: Pos, t: Trigger) => `bpmn.${pos}${t === 'none' ? '' : t[0].toUpperCase() + t.slice(1)}`;
const eventLabel = (pos: Pos, t: Trigger) => {
  const P = POSITIONS[pos];
  const base = t === 'none' ? `${P.label} event` : `${TRIGGER_LABEL[t][0].toUpperCase()}${TRIGGER_LABEL[t].slice(1)} ${P.label.toLowerCase()}`;
  return t === 'none' && pos === 'throw' ? 'Intermediate event' : base;
};

function renderEvent(pos: Pos, t: Trigger) {
  return function EventShape({ w, h, style }: ShapeRenderContext) {
    const cx = w / 2;
    const cy = h / 2;
    const m = Math.min(w, h);
    const sw = style.strokeWidth || 1.5;
    const ni = pos === 'startNI' || pos === 'catchNI';
    const ring: ElementStyle = ni ? { ...style, strokeStyle: 'dashed' } : style;
    const double = pos === 'catch' || pos === 'catchNI' || pos === 'throw';
    const filled = pos === 'throw' || pos === 'end';
    let rings: ReactNode;
    if (pos === 'end') {
      const thick = sw * 2.4;
      const d = (thick - sw) / 2;
      rings = <Oval cx={cx} cy={cy} rx={Math.max(1, w / 2 - d)} ry={Math.max(1, h / 2 - d)} s={{ ...style, strokeWidth: thick }} />;
    } else if (double) {
      const g = Math.max(2.5, m * 0.08);
      rings = (
        <>
          <Oval cx={cx} cy={cy} rx={w / 2} ry={h / 2} s={ring} />
          <Oval cx={cx} cy={cy} rx={Math.max(1, w / 2 - g)} ry={Math.max(1, h / 2 - g)} s={{ ...ring, fill: 'none' }} />
        </>
      );
    } else {
      rings = <Oval cx={cx} cy={cy} rx={w / 2} ry={h / 2} s={ring} />;
    }
    return (
      <>
        {rings}
        {triggerMarker(t, cx, cy, m * (double ? 0.52 : 0.58), style, filled)}
      </>
    );
  };
}

const EVENTS: ShapeDef[] = [];
const EVENT_ITEMS: LibraryItem[] = [];
const eventStyle = (pos: Pos): Partial<ElementStyle> =>
  pos === 'start' || pos === 'startNI'
    ? { fill: TONE.green.fill, stroke: TONE.green.stroke, fontSize: 12 }
    : pos === 'end'
      ? { fill: TONE.red.fill, stroke: TONE.red.stroke, fontSize: 12 }
      : { fill: TONE.blue.fill, stroke: TONE.blue.stroke, fontSize: 12 };

for (const pos of Object.keys(POSITIONS) as Pos[]) {
  const P = POSITIONS[pos];
  for (const t of P.triggers) {
    const kind = eventKind(pos, t);
    EVENTS.push(
      shape(
        kind,
        eventLabel(pos, t),
        `shape=mxgraph.bpmn.event;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;outline=${P.outline};symbol=${DRAWIO_SYMBOL[t]};`,
        renderEvent(pos, t),
        { perimeter: 'ellipse', textPlacement: 'below' },
      ),
    );
    EVENT_ITEMS.push(item(kind, eventLabel(pos, t), 40, 40, { style: eventStyle(pos), keywords: `bpmn ${P.keywords} ${TRIGGER_LABEL[t]}` }));
  }
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

type TaskMarker = 'none' | 'user' | 'service' | 'script' | 'send' | 'receive' | 'manual' | 'businessRule';
type BottomMarker = 'none' | 'loop' | 'parallelMI' | 'sequentialMI' | 'subprocess';

const topMarkerSize = (w: number, h: number) => clamp(Math.min(w, h) * 0.22, 10, 18);
const bottomMarkerSize = (w: number, h: number) => clamp(Math.min(w, h) * 0.17, 8, 14);

function topMarker(m: TaskMarker, x: number, y: number, sz: number, s: ElementStyle): ReactNode {
  const cx = x + sz / 2;
  const cy = y + sz / 2;
  switch (m) {
    case 'none':
      return null;
    case 'user':
      return <Glyph Icon={User} cx={cx} cy={cy} size={sz} s={s} sw={1.4} />;
    case 'service':
      return <Glyph Icon={Settings} cx={cx} cy={cy} size={sz} s={s} sw={1.4} />;
    case 'script':
      return <Glyph Icon={ScrollText} cx={cx} cy={cy} size={sz} s={s} sw={1.4} />;
    case 'receive':
      return <Glyph Icon={Mail} cx={cx} cy={cy} size={sz} s={s} sw={1.4} />;
    case 'manual':
      return <Glyph Icon={Hand} cx={cx} cy={cy} size={sz} s={s} sw={1.4} />;
    case 'send':
      return envelope(x + sz * 0.05, y + sz * 0.2, sz * 0.9, sz * 0.6, s, true);
    case 'businessRule': {
      const w = sz * 0.95;
      const h = sz * 0.72;
      const x0 = x + (sz - w) / 2;
      const y0 = y + (sz - h) / 2;
      const hb = h * 0.28;
      return (
        <>
          <Body d={`M${f(x0)},${f(y0)} H${f(x0 + w)} V${f(y0 + h)} H${f(x0)} Z`} s={{ ...solid(s, 0.8), fill: paper(s) }} />
          <path d={`M${f(x0)},${f(y0)} H${f(x0 + w)} V${f(y0 + hb)} H${f(x0)} Z`} fill={ink(s)} fillOpacity={0.75} stroke="none" />
          <Line d={`M${f(x0)},${f(y0 + hb + (h - hb) / 2)} H${f(x0 + w)} M${f(x0 + w * 0.3)},${f(y0 + hb)} V${f(y0 + h)}`} s={s} k={0.6} />
        </>
      );
    }
  }
}

function bottomMarker(m: BottomMarker, cx: number, cy: number, sz: number, s: ElementStyle): ReactNode {
  const r = sz / 2;
  switch (m) {
    case 'none':
      return null;
    case 'subprocess':
      return (
        <>
          <path d={roundRectD(cx - r, cy - r, sz, sz, 1.5)} fill={paper(s)} {...strokeAttrs(solid(s, 0.8))} />
          <Line d={`M${f(cx - r * 0.55)},${f(cy)} H${f(cx + r * 0.55)} M${f(cx)},${f(cy - r * 0.55)} V${f(cy + r * 0.55)}`} s={s} k={0.85} />
        </>
      );
    case 'loop': {
      const rr0 = r * 0.82;
      const [ex, ey] = polar(cx, cy, rr0, rr0, 400);
      const a = r * 0.45;
      return (
        <>
          <Line d={arcD(cx, cy, rr0, rr0, 120, 400)} s={s} k={0.85} />
          <Line d={`M${f(ex - a)},${f(ey - a * 0.15)} L${f(ex)},${f(ey)} L${f(ex - a * 0.1)},${f(ey - a)}`} s={s} k={0.85} />
        </>
      );
    }
    case 'parallelMI':
      return <Line d={[-0.6, 0, 0.6].map((d) => `M${f(cx + d * r)},${f(cy - r * 0.85)} V${f(cy + r * 0.85)}`).join(' ')} s={s} k={1.1} cap="butt" />;
    case 'sequentialMI':
      return <Line d={[-0.6, 0, 0.6].map((d) => `M${f(cx - r * 0.85)},${f(cy + d * r)} H${f(cx + r * 0.85)}`).join(' ')} s={s} k={1.1} cap="butt" />;
  }
}

function renderTask(top: TaskMarker, bottom: BottomMarker, opts: { thick?: boolean } = {}) {
  return function TaskShape({ w, h, style }: ShapeRenderContext) {
    const sz = topMarkerSize(w, h);
    const bs = bottomMarkerSize(w, h);
    const s = opts.thick ? { ...style, strokeWidth: (style.strokeWidth || 1.5) * 2.4 } : style;
    return (
      <>
        <RoundRect w={w} h={h} s={s} />
        {topMarker(top, 7, 6, sz, style)}
        {bottomMarker(bottom, w / 2, h - 5 - bs / 2, bs, style)}
      </>
    );
  };
}

const taskBox = (top: boolean, bottom: boolean) => (w: number, h: number) => {
  const y = top ? 6 + topMarkerSize(w, h) * 0.6 : 8;
  const b = bottom ? bottomMarkerSize(w, h) + 8 : 8;
  return { x: 10, y, w: Math.max(1, w - 20), h: Math.max(1, h - y - b) };
};

const TASK_DRAWIO = 'shape=mxgraph.bpmn.task;rectStyle=rounded;size=10;whiteSpace=wrap;html=1;';

const TASKS: Array<[string, string, TaskMarker, BottomMarker, string, string]> = [
  ['bpmn.task', 'Task', 'none', 'none', 'taskMarker=abstract;', 'activity task'],
  ['bpmn.taskUser', 'User task', 'user', 'none', 'taskMarker=user;', 'human person'],
  ['bpmn.taskService', 'Service task', 'service', 'none', 'taskMarker=service;', 'automated system gear'],
  ['bpmn.taskScript', 'Script task', 'script', 'none', 'taskMarker=script;', 'code automation'],
  ['bpmn.taskSend', 'Send task', 'send', 'none', 'taskMarker=send;', 'message send email'],
  ['bpmn.taskReceive', 'Receive task', 'receive', 'none', 'taskMarker=receive;', 'message receive wait email'],
  ['bpmn.taskManual', 'Manual task', 'manual', 'none', 'taskMarker=manual;', 'hand manual offline'],
  ['bpmn.taskBusinessRule', 'Business rule task', 'businessRule', 'none', 'taskMarker=businessRule;', 'decision dmn table rule'],
  ['bpmn.taskLoop', 'Loop task', 'none', 'loop', 'taskMarker=abstract;isLoopStandard=1;', 'loop repeat standard'],
  ['bpmn.taskParallelMI', 'Parallel multi-instance task', 'none', 'parallelMI', 'taskMarker=abstract;isLoopMultiParallel=1;', 'multi instance parallel'],
  ['bpmn.taskSequentialMI', 'Sequential multi-instance task', 'none', 'sequentialMI', 'taskMarker=abstract;isLoopMultiSeq=1;', 'multi instance sequential'],
  ['bpmn.subprocess', 'Sub-process (collapsed)', 'none', 'subprocess', 'taskMarker=abstract;isLoopSub=1;', 'subprocess collapsed plus'],
];

const ACTIVITIES: ShapeDef[] = [
  ...TASKS.map(([kind, label, top, bottom, extra]) =>
    shape(kind, label, TASK_DRAWIO + extra, renderTask(top, bottom), { rounded: true, textBox: taskBox(top !== 'none', bottom !== 'none') }),
  ),
  shape('bpmn.callActivity', 'Call activity', TASK_DRAWIO + 'taskMarker=abstract;bpmnShapeType=call;isLoopSub=1;', renderTask('none', 'subprocess', { thick: true }), {
    rounded: true,
    textBox: taskBox(false, true),
  }),
  shape(
    'bpmn.subprocessExpanded',
    'Sub-process (expanded)',
    'rounded=1;arcSize=4;container=1;collapsible=0;verticalAlign=top;align=left;spacingLeft=10;whiteSpace=wrap;html=1;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />,
    { rounded: true, container: true, textBox: (w) => ({ x: 12, y: 6, w: Math.max(1, w - 24), h: 22 }) },
  ),
  shape(
    'bpmn.eventSubprocess',
    'Event sub-process',
    'rounded=1;arcSize=4;dashed=1;dashPattern=1 2;container=1;collapsible=0;verticalAlign=top;align=left;spacingLeft=10;whiteSpace=wrap;html=1;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={{ ...style, strokeStyle: 'dotted' }} />,
    { rounded: true, container: true, textBox: (w) => ({ x: 12, y: 6, w: Math.max(1, w - 24), h: 22 }) },
  ),
  shape(
    'bpmn.transaction',
    'Transaction',
    'shape=ext;double=1;rounded=1;arcSize=4;container=1;collapsible=0;verticalAlign=top;align=left;spacingLeft=10;whiteSpace=wrap;html=1;',
    ({ w, h, style }) => {
      const g = 4;
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <rect
            x={g}
            y={g}
            width={Math.max(1, w - g * 2)}
            height={Math.max(1, h - g * 2)}
            rx={rr(w - g * 2, h - g * 2, Math.max(0, style.radius - g))}
            fill="none"
            {...strokeAttrs(style)}
          />
        </>
      );
    },
    { rounded: true, container: true, textBox: (w) => ({ x: 14, y: 8, w: Math.max(1, w - 28), h: 22 }) },
  ),
];

// ---------------------------------------------------------------------------
// Gateways
// ---------------------------------------------------------------------------

type Gw = 'none' | 'exclusive' | 'parallel' | 'inclusive' | 'eventBased' | 'parallelEventBased' | 'complex';

function renderGateway(g: Gw) {
  return function GatewayShape({ w, h, style }: ShapeRenderContext) {
    const cx = w / 2;
    const cy = h / 2;
    const k = Math.min(w, h) * 0.5;
    const sw = style.strokeWidth || 1.5;
    const filled = { ...solid(style, 0.6), fill: ink(style) };
    const ring = (r: number, kk = 0.85) => <path d={circleD(cx, cy, r)} fill="none" {...strokeAttrs(solid(style, kk))} />;
    let marker: ReactNode = null;
    switch (g) {
      case 'exclusive':
        marker = <Body d={unit(cx, cy, k, X_PTS(0.13, 0.3))} s={filled} />;
        break;
      case 'parallel':
        marker = <Body d={unit(cx, cy, k, PLUS_PTS(0.075, 0.38))} s={filled} />;
        break;
      case 'inclusive':
        marker = <path d={circleD(cx, cy, k * 0.32)} fill="none" stroke={ink(style)} strokeWidth={sw * 2} />;
        break;
      case 'eventBased':
        marker = (
          <>
            {ring(k * 0.4, 0.7)}
            {ring(k * 0.32, 0.7)}
            <Body d={pathOf(regularPts(cx, cy + k * 0.02, k * 0.19, k * 0.19, 5))} s={{ ...solid(style, 0.7), fill: 'none' }} />
          </>
        );
        break;
      case 'parallelEventBased':
        marker = (
          <>
            {ring(k * 0.4, 0.7)}
            <Body d={unit(cx, cy, k, PLUS_PTS(0.06, 0.24))} s={{ ...solid(style, 0.7), fill: 'none' }} />
          </>
        );
        break;
      case 'complex': {
        const e = k * 0.34;
        const d = e * Math.SQRT1_2;
        marker = (
          <Line
            d={`M${f(cx)},${f(cy - e)} V${f(cy + e)} M${f(cx - e)},${f(cy)} H${f(cx + e)} M${f(cx - d)},${f(cy - d)} L${f(cx + d)},${f(cy + d)} M${f(cx + d)},${f(cy - d)} L${f(cx - d)},${f(cy + d)}`}
            s={style}
            k={2}
            cap="butt"
          />
        );
        break;
      }
      case 'none':
        break;
    }
    return (
      <>
        <Body d={`M${f(cx)},0 L${f(w)},${f(cy)} L${f(cx)},${f(h)} L0,${f(cy)} Z`} s={style} />
        {marker}
      </>
    );
  };
}

const GW_DRAWIO = 'shape=mxgraph.bpmn.gateway2;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=rhombusPerimeter;outlineConnect=0;';
const GATEWAYS: Array<[string, string, Gw, string, string]> = [
  ['bpmn.gateway', 'Gateway', 'none', 'outline=none;symbol=none;', 'gateway decision'],
  ['bpmn.gatewayExclusive', 'Exclusive gateway', 'exclusive', 'outline=none;symbol=none;gwType=exclusive;', 'xor decision exclusive'],
  ['bpmn.gatewayParallel', 'Parallel gateway', 'parallel', 'outline=none;symbol=none;gwType=parallel;', 'and fork join parallel'],
  ['bpmn.gatewayInclusive', 'Inclusive gateway', 'inclusive', 'outline=end;symbol=general;', 'or inclusive'],
  ['bpmn.gatewayEvent', 'Event-based gateway', 'eventBased', 'outline=catching;symbol=multiple;', 'event based gateway'],
  ['bpmn.gatewayParallelEvent', 'Parallel event-based gateway', 'parallelEventBased', 'outline=standard;symbol=parallelMultiple;', 'parallel event based gateway'],
  ['bpmn.gatewayComplex', 'Complex gateway', 'complex', 'outline=none;symbol=none;gwType=complex;', 'complex gateway asterisk'],
];

// ---------------------------------------------------------------------------
// Data, artifacts, pools
// ---------------------------------------------------------------------------

type DataVariant = 'none' | 'input' | 'output' | 'collection';

function renderData(v: DataVariant) {
  return function DataShape({ w, h, style }: ShapeRenderContext) {
    const fo = Math.min(w, h) * 0.3;
    const a = Math.min(w, h) * 0.34;
    const arrow: Pt[] = [[0, 0.3], [0.5, 0.3], [0.5, 0], [1, 0.5], [0.5, 1], [0.5, 0.7], [0, 0.7]];
    const bs = Math.min(w, h) * 0.26;
    return (
      <>
        <Body d={`M0,0 H${f(w - fo)} L${f(w)},${f(fo)} V${f(h)} H0 Z`} s={style} />
        <path d={`M${f(w - fo)},0 V${f(fo)} H${f(w)}`} fill="none" {...strokeAttrs(style)} />
        {(v === 'input' || v === 'output') && (
          <Body
            d={pathOf(arrow.map(([x, y]) => [5 + x * a, 5 + y * a * 0.8] as const))}
            s={{ ...solid(style, 0.7), fill: v === 'output' ? ink(style) : paper(style) }}
          />
        )}
        {v === 'collection' && (
          <Line d={[-0.55, 0, 0.55].map((d) => `M${f(w / 2 + d * bs * 0.5)},${f(h - 4 - bs)} V${f(h - 4)}`).join(' ')} s={style} k={1.1} cap="butt" />
        )}
      </>
    );
  };
}

function renderDataStore({ w, h, style }: ShapeRenderContext) {
  const ry = Math.min(h * 0.14, w * 0.2, 12);
  const g = ry * 0.55;
  const front = (y: number) => `M0,${f(y)} A${f(w / 2)},${f(ry)} 0 0 0 ${f(w)},${f(y)}`;
  return (
    <>
      <Body d={`M0,${f(ry)} A${f(w / 2)},${f(ry)} 0 0 1 ${f(w)},${f(ry)} V${f(h - ry)} A${f(w / 2)},${f(ry)} 0 0 1 0,${f(h - ry)} Z`} s={style} />
      <path d={`${front(ry)} ${front(ry + g)} ${front(ry + g * 2)}`} fill="none" {...strokeAttrs(style)} />
    </>
  );
}

function renderGroup({ w, h, style }: ShapeRenderContext) {
  const sw = style.strokeWidth || 1.5;
  return (
    <rect
      width={w}
      height={h}
      rx={rr(w, h, style.radius)}
      fill={style.fill === 'none' ? 'none' : style.fill}
      stroke={ink(style)}
      strokeWidth={sw}
      strokeDasharray={`${sw * 5} ${sw * 2.4} ${sw * 0.2} ${sw * 2.4}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function renderAnnotation({ w, h, style }: ShapeRenderContext) {
  const bw = Math.min(14, w * 0.2);
  return (
    <>
      <FillOnly d={`M0,0 H${f(w)} V${f(h)} H0 Z`} s={style} />
      <path d={`M${f(bw)},0 H0 V${f(h)} H${f(bw)}`} fill="none" {...strokeAttrs(style)} strokeLinecap="round" />
    </>
  );
}

const OTHER: ShapeDef[] = [
  ...GATEWAYS.map(([kind, label, g, extra]) =>
    shape(kind, label, GW_DRAWIO + extra, renderGateway(g), { perimeter: 'diamond', textPlacement: 'below' }),
  ),
  ...(
    [
      ['bpmn.dataObject', 'Data object', 'none', 'bpmnTransferType=none;'],
      ['bpmn.dataInput', 'Data input', 'input', 'bpmnTransferType=input;'],
      ['bpmn.dataOutput', 'Data output', 'output', 'bpmnTransferType=output;'],
      ['bpmn.dataCollection', 'Data collection', 'collection', 'bpmnTransferType=none;isCollection=1;'],
    ] as const
  ).map(([kind, label, v, extra]) =>
    shape(
      kind,
      label,
      `shape=mxgraph.bpmn.data;html=1;labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;size=15;${extra}`,
      renderData(v),
      { textPlacement: 'below' },
    ),
  ),
  shape('bpmn.dataStore', 'Data store', 'shape=datastore;html=1;labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;', renderDataStore, {
    textPlacement: 'below',
  }),
  shape('bpmn.pool', 'Pool', 'swimlane;html=1;horizontal=0;startSize=30;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolH(ctx), {
    container: true,
    textPlacement: 'custom',
  }),
  shape('bpmn.poolV', 'Pool (vertical)', 'swimlane;html=1;startSize=30;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolV(ctx), {
    container: true,
    textBox: topBandBox,
  }),
  shape('bpmn.lane', 'Lane', 'swimlane;html=1;horizontal=0;swimlaneLine=1;startSize=30;container=1;collapsible=0;whiteSpace=wrap;', (ctx) => renderPoolH(ctx, { tint: 0.03 }), {
    container: true,
    textPlacement: 'custom',
  }),
  shape('bpmn.group', 'Group', 'rounded=1;arcSize=10;dashed=1;dashPattern=8 3 1 3;fillColor=none;container=1;verticalAlign=top;html=1;whiteSpace=wrap;', renderGroup, {
    container: true,
    rounded: true,
    textBox: (w) => ({ x: 10, y: 4, w: Math.max(1, w - 20), h: 24 }),
  }),
  shape('bpmn.annotation', 'Text annotation', 'shape=mxgraph.flowchart.annotation_1;align=left;pointerEvents=1;whiteSpace=wrap;html=1;spacingLeft=6;', renderAnnotation, {
    boxHit: true,
    textBox: (w, h) => inset(w, h, 10, 4),
  }),
];

export const shapes: ShapeDef[] = [...EVENTS, ...ACTIVITIES, ...OTHER];

// ---------------------------------------------------------------------------
// Libraries
// ---------------------------------------------------------------------------

const task: Partial<ElementStyle> = { fill: '#ffffff', stroke: '#1e293b', radius: 10, fontSize: 13 };
const gateway: Partial<ElementStyle> = { fill: TONE.amber.fill, stroke: TONE.amber.stroke, fontSize: 12 };
const pool: Partial<ElementStyle> = { fill: '#ffffff', stroke: '#475569', radius: 0, bold: true, fontSize: 13, textColor: '#1e293b' };
const ev = (kind: string) => EVENT_ITEMS.find((i) => i.kind === kind)!;

export const libraries: ShapeLibrary[] = [
  {
    id: 'bpmn',
    name: 'BPMN 2.0',
    items: [
      ev('bpmn.start'),
      ev('bpmn.startMessage'),
      ev('bpmn.startTimer'),
      ev('bpmn.throw'),
      ev('bpmn.catchMessage'),
      ev('bpmn.catchTimer'),
      ev('bpmn.catchError'),
      ev('bpmn.end'),
      ev('bpmn.endMessage'),
      ev('bpmn.endError'),
      ev('bpmn.endTerminate'),
      ...TASKS.map(([kind, label, , , , kw]) => item(kind, label, 130, 80, { text: kind === 'bpmn.subprocess' ? 'Sub-process' : 'Task', style: task, keywords: `bpmn ${kw}` })),
      item('bpmn.callActivity', 'Call activity', 130, 80, { text: 'Call activity', style: task, keywords: 'bpmn call activity reusable global' }),
      item('bpmn.subprocessExpanded', 'Sub-process (expanded)', 360, 220, {
        text: 'Sub-process',
        style: { ...task, textAlign: 'left', radius: 12 },
        keywords: 'bpmn subprocess expanded container',
      }),
      item('bpmn.eventSubprocess', 'Event sub-process', 360, 220, {
        text: 'Event sub-process',
        style: { ...task, textAlign: 'left', radius: 12 },
        keywords: 'bpmn event subprocess dotted container',
      }),
      item('bpmn.transaction', 'Transaction', 360, 220, {
        text: 'Transaction',
        style: { ...task, textAlign: 'left', radius: 12 },
        keywords: 'bpmn transaction double border container',
      }),
      ...GATEWAYS.map(([kind, label, , , kw]) => item(kind, label, 50, 50, { style: gateway, keywords: `bpmn ${kw}` })),
      item('bpmn.dataObject', 'Data object', 40, 52, { style: { fontSize: 12 }, keywords: 'bpmn data object document artifact' }),
      item('bpmn.dataInput', 'Data input', 40, 52, { style: { fontSize: 12 }, keywords: 'bpmn data input' }),
      item('bpmn.dataOutput', 'Data output', 40, 52, { style: { fontSize: 12 }, keywords: 'bpmn data output' }),
      item('bpmn.dataCollection', 'Data collection', 40, 52, { style: { fontSize: 12 }, keywords: 'bpmn data collection list' }),
      item('bpmn.dataStore', 'Data store', 56, 52, { style: { fontSize: 12 }, keywords: 'bpmn data store database' }),
      item('bpmn.pool', 'Pool', 600, 220, { text: 'Pool', style: pool, keywords: 'bpmn pool participant swimlane' }),
      item('bpmn.lane', 'Lane', 570, 120, { text: 'Lane', style: { ...pool, bold: false }, keywords: 'bpmn lane swimlane' }),
      item('bpmn.poolV', 'Pool (vertical)', 220, 480, { text: 'Pool', style: pool, keywords: 'bpmn pool vertical swimlane' }),
      item('bpmn.group', 'Group', 300, 200, {
        text: 'Group',
        style: { fill: 'none', stroke: '#475569', radius: 12, fontSize: 12, textColor: '#334155' },
        keywords: 'bpmn group category',
      }),
      item('bpmn.annotation', 'Text annotation', 140, 60, {
        text: 'Annotation',
        style: { fill: 'none', stroke: '#475569', fontSize: 12, textAlign: 'left', textColor: '#334155' },
        keywords: 'bpmn text annotation comment note',
      }),
    ],
  },
  { id: 'bpmn-events', name: 'BPMN 2.0 Events', items: EVENT_ITEMS },
];
