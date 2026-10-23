/**
 * Enterprise Integration Patterns (Hohpe & Woolf): the pattern vocabulary as
 * light boxes (or channel pipes) holding a small schematic — message tokens,
 * arrows, routers, stores — with the pattern name below. Every schematic is
 * drawn in a 100×60 design space and scaled uniformly into the frame.
 */
import type { ReactNode } from 'react';
import { fontStack } from '@/text/fonts';
import { HorizontalCylinder, RoundRect } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { f, ink, item, shape } from './_kit2';

const TOKEN = { g: '#22c55e', o: '#f59e0b', b: '#3b82f6', v: '#8b5cf6', r: '#ef4444', k: '#94a3b8' } as const;
type Tone = keyof typeof TOKEN;
const ENDPOINT = '#3b82f6';

/** Drawing kit bound to a scale (stroke widths stay ~constant on screen). */
function makeKit(c: string, sw: number, font: string) {
  const L = (d: string, dash = false, w = 1) => (
    <path d={d} fill="none" stroke={c} strokeWidth={sw * w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash ? `${f(sw * 3)} ${f(sw * 2.5)}` : undefined} />
  );
  const A = (x1: number, y1: number, x2: number, y2: number, dash = false) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const hl = Math.min(6, Math.hypot(x2 - x1, y2 - y1) * 0.6);
    const hw = hl * 0.55;
    const bx = x2 - hl * Math.cos(a);
    const by = y2 - hl * Math.sin(a);
    const px = -Math.sin(a) * hw;
    const py = Math.cos(a) * hw;
    return (
      <>
        {L(`M${f(x1)},${f(y1)} L${f(bx)},${f(by)}`, dash)}
        <path d={`M${f(x2)},${f(y2)} L${f(bx + px)},${f(by + py)} L${f(bx - px)},${f(by - py)} Z`} fill={c} stroke={c} strokeWidth={sw * 0.5} strokeLinejoin="round" />
      </>
    );
  };
  const Tx = (x: number, y: number, t: string, size = 10, color = c) => (
    <text x={f(x)} y={f(y + size * 0.36)} fontSize={size} fontFamily={font} fontWeight={700} textAnchor="middle" fill={color}>
      {t}
    </text>
  );
  const B = (x: number, y: number, w: number, h: number, fill = '#ffffff', dash = false) => (
    <rect x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(Math.min(2.5, w / 4, h / 4))} fill={fill} stroke={c} strokeWidth={sw} strokeDasharray={dash ? `${f(sw * 3)} ${f(sw * 2.5)}` : undefined} />
  );
  /** Message token centred at (x, y) with side `s` and an optional white mark. */
  const T = (x: number, y: number, s = 12, tone: Tone = 'g', mark?: string) => {
    const h = s / 2;
    const m = (k: number) => f(s * k);
    let inner: ReactNode = null;
    if (mark === 'lines') inner = <path d={`M${f(x - h * 0.55)},${f(y - h * 0.4)} H${f(x + h * 0.55)} M${f(x - h * 0.55)},${f(y)} H${f(x + h * 0.55)} M${f(x - h * 0.55)},${f(y + h * 0.4)} H${f(x + h * 0.25)}`} stroke="#fff" strokeWidth={m(0.09)} strokeLinecap="round" />;
    else if (mark === 'x') inner = <path d={`M${f(x - h * 0.42)},${f(y - h * 0.42)} L${f(x + h * 0.42)},${f(y + h * 0.42)} M${f(x + h * 0.42)},${f(y - h * 0.42)} L${f(x - h * 0.42)},${f(y + h * 0.42)}`} stroke="#fff" strokeWidth={m(0.11)} strokeLinecap="round" />;
    else if (mark === 'check') inner = <path d={`M${f(x - h * 0.5)},${f(y + h * 0.02)} L${f(x - h * 0.12)},${f(y + h * 0.4)} L${f(x + h * 0.5)},${f(y - h * 0.38)}`} fill="none" stroke="#fff" strokeWidth={m(0.11)} strokeLinecap="round" strokeLinejoin="round" />;
    else if (mark === 'tri') inner = <path d={`M${f(x)},${f(y - h * 0.5)} L${f(x + h * 0.52)},${f(y + h * 0.42)} H${f(x - h * 0.52)} Z`} fill="#fff" />;
    else if (mark === 'circ') inner = <circle cx={f(x)} cy={f(y)} r={f(h * 0.45)} fill="#fff" />;
    else if (mark === 'sq') inner = <rect x={f(x - h * 0.42)} y={f(y - h * 0.42)} width={f(h * 0.84)} height={f(h * 0.84)} fill="#fff" />;
    else if (mark) inner = Tx(x, y, mark, s * 0.62, '#fff');
    return (
      <>
        <rect x={f(x - h)} y={f(y - h)} width={f(s)} height={f(s)} rx={f(s * 0.18)} fill={TOKEN[tone]} stroke={c} strokeWidth={sw * 0.8} />
        {inner}
      </>
    );
  };
  /** Small horizontal pipe (channel). */
  const P = (x: number, y: number, w: number, h: number) => {
    const rx = Math.min(w * 0.12, h * 0.3);
    return (
      <>
        <path d={`M${f(x + rx)},${f(y)} H${f(x + w - rx)} A${f(rx)},${f(h / 2)} 0 0 1 ${f(x + w - rx)},${f(y + h)} H${f(x + rx)} A${f(rx)},${f(h / 2)} 0 0 1 ${f(x + rx)},${f(y)} Z`} fill="#ffffff" stroke={c} strokeWidth={sw} />
        {L(`M${f(x + w - rx)},${f(y)} A${f(rx)},${f(h / 2)} 0 0 0 ${f(x + w - rx)},${f(y + h)}`, false, 0.8)}
      </>
    );
  };
  /** Small vertical disk (store). */
  const D = (x: number, y: number, w: number, h: number) => {
    const ry = Math.min(h * 0.18, w * 0.25);
    return (
      <>
        <path d={`M${f(x)},${f(y + ry)} A${f(w / 2)},${f(ry)} 0 0 1 ${f(x + w)},${f(y + ry)} V${f(y + h - ry)} A${f(w / 2)},${f(ry)} 0 0 1 ${f(x)},${f(y + h - ry)} Z`} fill="#ffffff" stroke={c} strokeWidth={sw} />
        {L(`M${f(x)},${f(y + ry)} A${f(w / 2)},${f(ry)} 0 0 0 ${f(x + w)},${f(y + ry)}`, false, 0.8)}
      </>
    );
  };
  const Funnel = (x: number, y: number, s: number) => (
    <path d={`M${f(x - s)},${f(y - s * 0.7)} H${f(x + s)} L${f(x + s * 0.22)},${f(y + s * 0.1)} V${f(y + s * 0.75)} L${f(x - s * 0.22)},${f(y + s * 0.55)} V${f(y + s * 0.1)} Z`} fill="#ffffff" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
  );
  const Dot = (x: number, y: number, r = 3, fill = c) => <circle cx={f(x)} cy={f(y)} r={f(r)} fill={fill} stroke={c} strokeWidth={sw} />;
  const Diamond = (x: number, y: number, s: number) => (
    <path d={`M${f(x)},${f(y - s)} L${f(x + s)},${f(y)} L${f(x)},${f(y + s)} L${f(x - s)},${f(y)} Z`} fill="#ffffff" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
  );
  const Gear = (x: number, y: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const rr = i % 2 ? r * 0.72 : r;
      pts.push(`${i ? 'L' : 'M'}${f(x + rr * Math.cos(a))},${f(y + rr * Math.sin(a))}`);
    }
    return (
      <>
        <path d={`${pts.join(' ')} Z`} fill={TOKEN.k} stroke={c} strokeWidth={sw} strokeLinejoin="round" />
        <circle cx={f(x)} cy={f(y)} r={f(r * 0.3)} fill="#ffffff" stroke={c} strokeWidth={sw * 0.8} />
      </>
    );
  };
  /** Application box with "text" lines. */
  const App = (x: number, y: number, w: number, h: number) => (
    <>
      {B(x, y, w, h)}
      {L(`M${f(x + 5)},${f(y + 7)} H${f(x + w * 0.6)} M${f(x + 5)},${f(y + 12)} H${f(x + w * 0.45)}`, false, 0.8)}
    </>
  );
  /** Closed white-filled outline. */
  const S = (d: string) => <path d={d} fill="#ffffff" stroke={c} strokeWidth={sw} strokeLinejoin="round" />;
  return { c, L, A, Tx, B, T, P, D, S, Funnel, Dot, Diamond, Gear, App };
}
type Kit = ReturnType<typeof makeKit>;
type Frame = 'box' | 'pipe';

function eipRender(frame: Frame, draw: (k: Kit) => ReactNode[]) {
  return function Eip(ctx: ShapeRenderContext) {
    const { w, h, style } = ctx;
    let ix: number, iy: number, iw: number, ih: number;
    if (frame === 'pipe') {
      const rx = Math.min(w * 0.12, h * 0.2, 16);
      ix = rx * 0.6;
      iw = Math.max(1, w - rx * 2.4);
      iy = h * 0.14;
      ih = Math.max(1, h * 0.72);
    } else {
      const p = Math.min(w, h) * 0.1;
      ix = p;
      iy = p;
      iw = Math.max(1, w - p * 2);
      ih = Math.max(1, h - p * 2);
    }
    // Channel schematics only use the middle band (y 8..52) of the design space.
    const [y0, gh] = frame === 'pipe' ? [8, 44] : [0, 60];
    const k = Math.max(1e-3, Math.min(iw / 100, ih / gh));
    const tx = ix + (iw - 100 * k) / 2;
    const ty = iy + (ih - gh * k) / 2 - y0 * k;
    const kit = makeKit(ink(style), Math.max(0.6, style.strokeWidth * 0.85) / k, fontStack(style.fontFamily));
    return (
      <>
        {frame === 'pipe' ? <HorizontalCylinder {...ctx} /> : <RoundRect w={w} h={h} s={style} />}
        <g transform={`translate(${f(tx)} ${f(ty)}) scale(${f(k)})`}>
          {draw(kit).map((n, i) => (
            <g key={i}>{n}</g>
          ))}
        </g>
      </>
    );
  };
}

/** [kind, label, frame, mxGraph stencil, keywords, schematic] */
type Def = [string, string, Frame, string, string, (k: Kit) => ReactNode[]];

const DEFS: Def[] = [
  // ----- Messages ----------------------------------------------------------------
  ['message', 'Message', 'box', 'message', 'data packet payload', (k) => [k.T(50, 30, 28, 'g', 'lines')]],
  ['commandMessage', 'Command message', 'box', 'command_message', 'rpc invoke procedure', (k) => [k.T(50, 30, 28, 'b', 'C')]],
  ['documentMessage', 'Document message', 'box', 'document_message', 'data transfer', (k) => [k.T(50, 30, 28, 'o', 'D')]],
  ['eventMessage', 'Event message', 'box', 'event_message', 'notification event', (k) => [k.T(50, 30, 28, 'v', 'E')]],
  ['requestReply', 'Request-reply', 'box', 'request_reply', 'request response two-way', (k) => [
    k.A(10, 19, 90, 19), k.T(36, 19, 13, 'g'), k.A(90, 41, 10, 41), k.T(64, 41, 13, 'o'),
  ]],
  ['returnAddress', 'Return address', 'box', 'return_address', 'reply to channel', (k) => [
    k.T(42, 30, 26, 'g'), k.B(52, 12, 18, 12), k.L('M55,16 H67 M55,20 H63', false, 0.8), k.L('M70,18 C92,18 92,46 80,46'), k.A(80, 46, 58, 46),
  ]],
  ['correlationId', 'Correlation identifier', 'box', 'correlation_identifier', 'correlation id match reply', (k) => [
    k.L('M38,30 H62', true), k.T(26, 30, 22, 'g', '#'), k.T(74, 30, 22, 'o', '#'),
  ]],
  ['messageSequence', 'Message sequence', 'box', 'message_sequence', 'ordered chunks parts', (k) => [
    k.T(24, 30, 18, 'g', '1'), k.T(50, 30, 18, 'g', '2'), k.T(76, 30, 18, 'g', '3'),
  ]],
  ['messageExpiration', 'Message expiration', 'box', 'message_expiration', 'ttl timeout time to live', (k) => [
    k.T(40, 34, 26, 'g'), k.Dot(68, 20, 11, '#ffffff'), k.L('M68,13 V20 L73,23'),
  ]],

  // ----- Channels ----------------------------------------------------------------
  ['messageChannel', 'Message channel', 'pipe', 'messageChannel', 'queue topic pipe', (k) => [k.T(28, 30, 16, 'g'), k.T(50, 30, 16, 'g'), k.T(72, 30, 16, 'g')]],
  ['pointToPoint', 'Point-to-point channel', 'pipe', 'point_to_point_channel', 'queue single consumer', (k) => [k.A(8, 30, 92, 30), k.T(50, 30, 18, 'g')]],
  ['publishSubscribe', 'Publish-subscribe channel', 'pipe', 'publish_subscribe_channel', 'pubsub topic broadcast fanout', (k) => [
    k.L('M8,30 H50'), k.A(50, 30, 90, 8), k.A(50, 30, 92, 30), k.A(50, 30, 90, 52), k.Dot(50, 30, 3), k.T(26, 30, 16, 'g'),
  ]],
  ['datatypeChannel', 'Datatype channel', 'pipe', 'datatype_channel', 'typed channel schema', (k) => [k.T(28, 30, 16, 'b', 'tri'), k.T(50, 30, 16, 'b', 'tri'), k.T(72, 30, 16, 'b', 'tri')]],
  ['invalidMessage', 'Invalid message channel', 'pipe', 'invalid_message_channel', 'error malformed', (k) => [k.T(35, 30, 18, 'o', '!'), k.T(65, 30, 18, 'o', '!')]],
  ['deadLetter', 'Dead letter channel', 'pipe', 'dead_letter_channel', 'dlq undeliverable poison', (k) => [k.T(35, 30, 18, 'k', 'x'), k.T(65, 30, 18, 'k', 'x')]],
  ['guaranteedDelivery', 'Guaranteed delivery', 'box', 'guaranteed_delivery', 'persistent durable store and forward', (k) => [
    k.P(8, 4, 84, 24), k.T(50, 16, 13, 'g'), k.A(50, 29, 50, 37), k.D(36, 37, 28, 22),
  ]],
  ['channelAdapter', 'Channel adapter', 'box', 'channel_adapter', 'connector integration adapter', (k) => [
    k.App(6, 14, 30, 32), k.B(36, 24, 7, 12, k.c), k.A(43, 30, 52, 30), k.P(52, 18, 44, 24), k.T(72, 30, 11, 'g'),
  ]],
  ['messagingBridge', 'Messaging bridge', 'box', 'messaging_bridge', 'bridge connect brokers', (k) => [
    k.P(4, 8, 36, 18), k.P(60, 34, 36, 18), k.L('M40,17 H50 V43'), k.A(50, 43, 60, 43), k.Dot(50, 30, 3),
  ]],
  ['messageBus', 'Message bus', 'box', 'message_bus', 'esb backbone service bus', (k) => [
    k.L('M4,42 H96 M4,50 H96', false, 1.2), k.B(8, 8, 20, 16), k.B(40, 8, 20, 16), k.B(72, 8, 20, 16), k.L('M18,24 V42 M50,24 V42 M82,24 V42'),
  ]],

  // ----- Routing -----------------------------------------------------------------
  ['pipesAndFilters', 'Pipes and filters', 'box', 'pipes_and_filters', 'filter pipeline processing step', (k) => [
    k.A(4, 30, 28, 30), k.B(30, 14, 40, 32), k.Funnel(50, 28, 10), k.A(72, 30, 96, 30),
  ]],
  ['messageRouter', 'Message router', 'box', 'message_router', 'route switch', (k) => [
    k.A(6, 30, 40, 30), k.A(51, 27, 90, 10), k.A(51, 33, 90, 50), k.Dot(46, 30, 6, '#ffffff'),
  ]],
  ['contentBasedRouter', 'Content-based router', 'box', 'content_based_router', 'cbr route by content decision', (k) => [
    k.A(22, 30, 39, 30), k.A(57, 30, 92, 30), k.A(54, 25, 90, 8), k.A(54, 35, 90, 52), k.Diamond(48, 30, 9), k.Tx(48, 30, '?', 9), k.T(13, 30, 14, 'g'),
  ]],
  ['messageFilter', 'Message filter', 'box', 'message_filter', 'filter discard drop', (k) => [
    k.T(13, 28, 14, 'g'), k.A(21, 28, 36, 28), k.Funnel(50, 26, 12), k.A(63, 28, 92, 28), k.T(50, 51, 10, 'o', 'x'),
  ]],
  ['dynamicRouter', 'Dynamic router', 'box', 'dynamic_router', 'rules control routing table', (k) => [
    k.B(38, 1, 20, 12), k.L('M42,5 H54 M42,9 H50', false, 0.8), k.L('M48,13 V23', true), k.A(6, 30, 42, 30), k.A(53, 27, 92, 12), k.A(53, 33, 92, 48), k.Dot(48, 30, 6, '#ffffff'),
  ]],
  ['recipientList', 'Recipient list', 'box', 'recipient_list', 'multicast list of receivers', (k) => [
    k.A(4, 30, 25, 30), k.B(26, 12, 26, 36), k.L('M31,20 H47 M31,27 H47 M31,34 H47 M31,41 H43', false, 0.8), k.A(52, 30, 92, 30), k.A(52, 22, 92, 8), k.A(52, 38, 92, 52),
  ]],
  ['splitter', 'Splitter', 'box', 'splitter', 'split debatch iterate', (k) => [
    k.A(31, 26, 66, 13), k.A(32, 30, 66, 30), k.A(31, 34, 66, 47), k.T(18, 30, 24, 'g', 'lines'), k.T(78, 13, 11, 'g'), k.T(78, 30, 11, 'g'), k.T(78, 47, 11, 'g'),
  ]],
  ['aggregator', 'Aggregator', 'box', 'aggregator', 'combine merge batch collect', (k) => [
    k.A(34, 13, 68, 26), k.A(34, 30, 68, 30), k.A(34, 47, 68, 34), k.T(22, 13, 11, 'g'), k.T(22, 30, 11, 'g'), k.T(22, 47, 11, 'g'), k.T(82, 30, 24, 'g', 'lines'),
  ]],
  ['resequencer', 'Resequencer', 'box', 'resequencer', 'reorder sort sequence', (k) => [
    k.T(9, 30, 12, 'g', '3'), k.T(23, 30, 12, 'g', '1'), k.T(37, 30, 12, 'g', '2'), k.A(45, 30, 56, 30), k.T(63, 30, 12, 'g', '1'), k.T(77, 30, 12, 'g', '2'), k.T(91, 30, 12, 'g', '3'),
  ]],
  ['composedProcessor', 'Composed message processor', 'box', 'composed_message_processor', 'split route aggregate', (k) => [
    k.L('M16,30 H28'), k.A(28, 30, 43, 13), k.A(28, 30, 43, 30), k.A(28, 30, 43, 47), k.Diamond(50, 12, 6), k.Diamond(50, 30, 6), k.Diamond(50, 48, 6),
    k.A(57, 13, 73, 27), k.A(57, 30, 73, 30), k.A(57, 47, 73, 33), k.T(9, 30, 12, 'g', 'lines'), k.T(85, 30, 14, 'g', 'lines'),
  ]],
  ['scatterGather', 'Scatter-gather', 'box', 'scatter_gather', 'broadcast collect best quote', (k) => [
    k.A(17, 28, 39, 12), k.A(17, 30, 39, 30), k.A(17, 32, 39, 48), k.B(40, 6, 16, 12), k.B(40, 24, 16, 12), k.B(40, 42, 16, 12),
    k.A(57, 12, 75, 26), k.A(57, 30, 75, 30), k.A(57, 48, 75, 34), k.B(76, 20, 18, 20), k.Tx(85, 30, 'Σ', 11), k.Dot(12, 30, 5, '#ffffff'),
  ]],
  ['routingSlip', 'Routing slip', 'box', 'routing_slip', 'itinerary steps sequence', (k) => [
    k.A(26, 26, 39, 26), k.A(54, 26, 61, 26), k.A(76, 26, 83, 26), k.L('M16,35 V40'), k.B(8, 40, 16, 17), k.L('M11,45 H21 M11,49 H21 M11,53 H17', false, 0.7),
    k.T(16, 26, 18, 'g'), k.B(40, 19, 14, 14), k.Tx(47, 26, 'A', 8), k.B(62, 19, 14, 14), k.Tx(69, 26, 'B', 8), k.B(84, 19, 14, 14), k.Tx(91, 26, 'C', 8),
  ]],
  ['processManager', 'Process manager', 'box', 'process_manager', 'orchestration saga workflow state', (k) => [
    k.L('M38,25 L24,14 M62,25 L76,14 M38,35 L24,46 M62,35 L76,46'), k.B(38, 20, 24, 20), k.Tx(50, 30, 'PM', 9), k.B(6, 6, 18, 12), k.B(76, 6, 18, 12), k.B(6, 42, 18, 12), k.B(76, 42, 18, 12),
  ]],
  ['messageBroker', 'Message broker', 'box', 'message_broker', 'hub and spoke broker mediator', (k) => [
    k.L('M50,30 L16,11 M50,30 L84,11 M50,30 L16,49 M50,30 L84,49 M50,30 L10,30 M50,30 L90,30'), k.B(8, 6, 16, 10), k.B(76, 6, 16, 10), k.B(8, 44, 16, 10), k.B(76, 44, 16, 10),
    k.B(1, 25, 12, 10), k.B(87, 25, 12, 10), k.Dot(50, 30, 9, '#ffffff'), k.Dot(50, 30, 3),
  ]],

  // ----- Transformation ----------------------------------------------------------
  ['messageTranslator', 'Message translator', 'box', 'message_translator', 'transform map convert format', (k) => [
    k.A(26, 30, 37, 30), k.B(38, 16, 24, 28), k.L('M43,26 H56 M53,23 L56,26 L53,29 M57,34 H44 M47,31 L44,34 L47,37'), k.A(63, 30, 74, 30), k.T(16, 30, 18, 'g', 'circ'), k.T(84, 30, 18, 'o', 'sq'),
  ]],
  ['envelopeWrapper', 'Envelope wrapper', 'box', 'envelope_wrapper', 'wrap unwrap header envelope', (k) => [
    k.B(22, 8, 56, 44), k.L('M22,8 L50,30 L78,8'), k.T(50, 41, 12, 'g'),
  ]],
  ['contentEnricher', 'Content enricher', 'box', 'content_enricher', 'enrich augment lookup add data', (k) => [
    k.A(23, 24, 37, 24), k.B(38, 12, 24, 24), k.Tx(50, 24, '+', 14), k.A(50, 44, 50, 37), k.D(42, 44, 16, 15), k.A(63, 24, 73, 24), k.T(14, 24, 16, 'g'), k.T(85, 24, 20, 'g', 'lines'),
  ]],
  ['contentFilter', 'Content filter', 'box', 'content_filter', 'remove fields simplify', (k) => [
    k.A(26, 30, 37, 30), k.B(38, 18, 24, 24), k.Funnel(50, 29, 7), k.A(63, 30, 75, 30), k.T(14, 30, 22, 'g', 'lines'), k.T(84, 30, 12, 'g'),
  ]],
  ['claimCheck', 'Claim check', 'box', 'claim_check', 'store payload reference ticket', (k) => [
    k.A(22, 22, 35, 22), k.B(36, 10, 24, 24), k.Tx(48, 22, 'CC', 8), k.A(61, 22, 76, 22), k.A(48, 35, 48, 42), k.D(40, 42, 16, 16), k.T(12, 22, 18, 'g', 'lines'), k.T(85, 22, 10, 'o'),
  ]],
  ['normalizer', 'Normalizer', 'box', 'normalizer', 'common format canonical convert', (k) => [
    k.A(19, 12, 39, 26), k.A(19, 30, 39, 30), k.A(19, 48, 39, 34), k.B(40, 20, 20, 20), k.Diamond(50, 30, 5), k.A(61, 30, 76, 30),
    k.T(12, 12, 11, 'b', 'circ'), k.T(12, 30, 11, 'o', 'tri'), k.T(12, 48, 11, 'v', 'sq'), k.T(86, 30, 14, 'g', 'sq'),
  ]],
  ['canonicalModel', 'Canonical data model', 'box', 'canonical_data_model', 'cdm shared schema common model', (k) => [
    k.L('M20,15 L40,25 M80,15 L60,25 M20,45 L40,35 M80,45 L60,35'), k.T(50, 30, 20, 'g', 'sq'), k.T(14, 12, 12, 'b', 'circ'), k.T(86, 12, 12, 'o', 'tri'), k.T(14, 48, 12, 'v', 'circ'), k.T(86, 48, 12, 'r', 'tri'),
  ]],

  // ----- Endpoints ---------------------------------------------------------------
  ['messageEndpoint', 'Message endpoint', 'box', 'message_endpoint', 'application connect send receive', (k) => [k.App(12, 10, 46, 40), k.B(58, 21, 12, 18, ENDPOINT), k.A(70, 30, 94, 30)]],
  ['messagingGateway', 'Messaging gateway', 'box', 'messaging_gateway', 'api facade encapsulate', (k) => [k.App(8, 10, 40, 40), k.B(48, 14, 16, 32, '#c7d2fe'), k.Tx(56, 30, 'GW', 7), k.A(64, 30, 94, 30)]],
  ['messagingMapper', 'Messaging mapper', 'box', 'messaging_mapper', 'object mapping serialize', (k) => [
    k.B(6, 10, 36, 40), k.L('M23,20 H27 M18,24 V32', false, 0.8), k.B(11, 16, 12, 8), k.B(27, 16, 10, 8), k.B(11, 32, 12, 8), k.B(27, 32, 10, 8),
    k.A(42, 30, 50, 30), k.B(50, 20, 16, 20), k.Tx(58, 30, 'M', 9), k.A(66, 30, 76, 30), k.T(86, 30, 16, 'g'),
  ]],
  ['transactionalClient', 'Transactional client', 'box', 'transactional_client', 'transaction commit rollback tx', (k) => [
    k.B(4, 5, 92, 50, 'none', true), k.App(12, 14, 32, 32), k.B(44, 22, 10, 16, ENDPOINT), k.A(54, 30, 88, 30), k.Tx(70, 21, 'TX', 8),
  ]],
  ['pollingConsumer', 'Polling consumer', 'box', 'polling_consumer', 'poll pull synchronous receiver', (k) => [
    k.A(4, 30, 30, 30), k.B(30, 22, 10, 16, ENDPOINT), k.B(40, 10, 44, 40), k.L('M62,22 A8,8 0 1 1 54,30'), k.L('M51,27 L54,31 L57,27'),
  ]],
  ['eventDrivenConsumer', 'Event-driven consumer', 'box', 'event_driven_consumer', 'push asynchronous listener callback', (k) => [
    k.A(4, 30, 30, 30), k.B(30, 22, 10, 16, ENDPOINT), k.B(40, 10, 44, 40), <path d="M66,15 L55,32 H62 L58,45 L70,27 H63 Z" fill={TOKEN.o} stroke={k.c} strokeWidth={0.5} strokeLinejoin="round" />,
  ]],
  ['competingConsumers', 'Competing consumers', 'box', 'competing_consumers', 'workers scale out load balance', (k) => [
    k.A(34, 30, 60, 10), k.A(34, 30, 60, 30), k.A(34, 30, 60, 50), k.P(2, 22, 32, 16), k.App(62, 4, 32, 12), k.App(62, 24, 32, 12), k.App(62, 44, 32, 12),
  ]],
  ['messageDispatcher', 'Message dispatcher', 'box', 'message_dispatcher', 'dispatch performers workers', (k) => [
    k.P(2, 22, 28, 16), k.A(30, 30, 40, 30), k.B(40, 20, 20, 20), k.Tx(50, 30, 'D', 10), k.A(60, 27, 80, 10), k.A(60, 30, 80, 30), k.A(60, 33, 80, 50), k.B(82, 4, 14, 12), k.B(82, 24, 14, 12), k.B(82, 44, 14, 12),
  ]],
  ['selectiveConsumer', 'Selective consumer', 'box', 'selective_consumer', 'selector filter receive', (k) => [
    k.A(16, 30, 31, 30), k.T(9, 20, 10, 'b'), k.T(9, 40, 10, 'o'), k.Funnel(40, 29, 8), k.B(50, 22, 10, 16, ENDPOINT), k.App(60, 10, 34, 40),
  ]],
  ['durableSubscriber', 'Durable subscriber', 'box', 'durable_subscriber', 'persistent subscription offline', (k) => [
    k.A(4, 23, 26, 23), k.B(26, 15, 10, 16, ENDPOINT), k.App(36, 4, 44, 30), k.L('M31,31 V49 H46'), k.D(46, 40, 20, 18),
  ]],
  ['idempotentReceiver', 'Idempotent receiver', 'box', 'idempotent_receiver', 'deduplicate duplicates exactly once', (k) => [
    k.T(10, 30, 12, 'k', 'x'), k.T(26, 30, 12, 'g', '1'), k.A(33, 30, 46, 30), k.B(46, 22, 10, 16, ENDPOINT), k.App(56, 10, 38, 40),
  ]],
  ['serviceActivator', 'Service activator', 'box', 'service_activator', 'invoke service handler', (k) => [
    k.A(4, 30, 26, 30), k.B(26, 22, 10, 16, ENDPOINT), k.B(36, 10, 42, 40), k.Gear(57, 30, 10), k.A(78, 30, 96, 30),
  ]],

  // ----- System management -------------------------------------------------------
  ['controlBus', 'Control bus', 'box', 'control_bus', 'management monitoring admin', (k) => [
    k.L('M4,46 H96 M4,53 H96', false, 1.2), k.L('M38,8 H17 V20 M62,8 H83 V20', true), k.B(8, 20, 18, 12), k.B(41, 20, 18, 12), k.B(74, 20, 18, 12), k.L('M17,32 V46 M50,32 V46 M83,32 V46'), k.B(38, 2, 24, 12, '#c7d2fe'),
  ]],
  ['detour', 'Detour', 'box', 'detour', 'bypass validation route around', (k) => [
    k.A(4, 22, 96, 22), k.L('M24,22 V46 H38 M62,46 H76 V22'), k.B(38, 38, 24, 16), k.Dot(24, 22, 3), k.Dot(76, 22, 3),
  ]],
  ['wireTap', 'Wire tap', 'box', 'wire_tap', 'tap copy inspect log', (k) => [k.A(4, 22, 96, 22), k.A(56, 22, 56, 39), k.B(44, 40, 24, 16), k.T(26, 22, 12, 'g'), k.Dot(56, 22, 3)]],
  ['messageHistory', 'Message history', 'box', 'message_history', 'audit trail trace path', (k) => [
    k.L('M43,30 H50'), k.T(30, 30, 26, 'g'), k.B(50, 10, 42, 40), ...[0, 1, 2, 3].map((i) => k.Dot(57, 18 + i * 8, 1.8)), k.L('M62,18 H86 M62,26 H84 M62,34 H86 M62,42 H80', false, 0.8),
  ]],
  ['messageStore', 'Message store', 'box', 'message_store', 'persist archive log database', (k) => [k.P(4, 4, 92, 24), k.T(30, 16, 12, 'g'), k.T(70, 16, 12, 'g'), k.A(50, 29, 50, 38), k.D(40, 38, 20, 21)]],
  ['smartProxy', 'Smart proxy', 'box', 'smart_proxy', 'proxy intercept request reply', (k) => [
    k.A(22, 25, 40, 25), k.A(60, 25, 78, 25), k.A(78, 35, 60, 35), k.A(40, 35, 22, 35), k.B(4, 20, 18, 20), k.B(40, 16, 20, 28, '#c7d2fe'), k.Tx(50, 30, 'P', 10), k.B(78, 20, 18, 20),
  ]],
  ['testMessage', 'Test message', 'box', 'test_message', 'health check probe test', (k) => [k.A(4, 30, 96, 30), k.T(18, 30, 14, 'g'), k.T(40, 30, 14, 'g'), k.T(62, 30, 14, 'v', 'check'), k.T(84, 30, 14, 'g')]],
  ['channelPurger', 'Channel purger', 'box', 'channel_purger', 'purge clear empty queue', (k) => [
    k.P(4, 16, 56, 28), k.T(22, 30, 12, 'g'), k.T(42, 30, 12, 'g'), k.A(61, 30, 73, 30), k.L('M74,21 H92 M79,21 V18 H87 V21'), k.S('M76,23 L78.5,46 H87.5 L90,23 Z'), k.L('M81,27 V42 M85,27 V42', false, 0.9),
  ]],
];

const shapes: ShapeDef[] = DEFS.map(([name, label, frame, stencil, , draw]) =>
  shape(`eip.${name}`, label, `shape=mxgraph.eip.${stencil};html=1;verticalLabelPosition=bottom;verticalAlign=top;`, eipRender(frame, draw), {
    rounded: frame === 'box',
    textPlacement: 'below',
  }),
);

const box = { fill: '#f8fafc', stroke: '#475569', strokeWidth: 1.25, radius: 6, fontSize: 12 };

const libraries: ShapeLibrary[] = [
  {
    id: 'eip',
    name: 'Enterprise Integration Patterns',
    items: DEFS.map(([name, label, frame, , keywords]) =>
      item(`eip.${name}`, label, frame === 'pipe' ? 110 : 90, frame === 'pipe' ? 44 : 56, {
        text: label,
        style: box,
        keywords: `eip integration pattern messaging ${keywords}`,
      }),
    ),
  },
];

export { shapes, libraries };
