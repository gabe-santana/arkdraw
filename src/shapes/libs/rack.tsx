/**
 * Rack: 19" cabinet (container) and rack-mount equipment. One rack unit (1U)
 * is 16px tall and 160px wide, so equipment drops neatly into the cabinet.
 */
import type { ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import type { ShapeDef, ShapeLibrary } from '../types';
import { ink, item, roundRectD, shape } from './_kit2';
import { fillOf, strokeAttrs } from '../kit';

const U = 16;
const LIGHT = '#cbd5e1';
const DARK = '#0f172a';
const LED_ON = '#22c55e';
const LED_WARN = '#f59e0b';

const units = (h: number) => Math.max(1, Math.round(h / U));
const ear = (w: number) => Math.min(8, w * 0.05);

/** Rack-mount chassis: face plate + mounting ears with screws. Calls `inner` with the face box. */
function chassis(inner?: (b: { x: number; y: number; w: number; h: number; u: number }, s: ElementStyle) => ReactNode) {
  return function Chassis({ w, h, style }: { w: number; h: number; style: ElementStyle }) {
    const e = ear(w);
    const u = units(h);
    const uh = h / u;
    const sr = Math.max(0.8, Math.min(1.6, e * 0.2));
    const screws = [];
    for (let i = 0; i < u; i++) {
      screws.push(<circle key={`l${i}`} cx={e / 2} cy={uh * (i + 0.5)} r={sr} fill={LIGHT} fillOpacity={0.7} />);
      screws.push(<circle key={`r${i}`} cx={w - e / 2} cy={uh * (i + 0.5)} r={sr} fill={LIGHT} fillOpacity={0.7} />);
    }
    const face = { x: e, y: 0, w: w - e * 2, h, u };
    return (
      <>
        <rect x={0} y={0} width={w} height={h} rx={1.5} fill={fillOf(style)} {...strokeAttrs(style)} />
        <rect x={e} y={0.5} width={Math.max(0, w - e * 2)} height={Math.max(0, h - 1)} fill="#ffffff" fillOpacity={0.06} />
        <path d={`M${e},0 V${h} M${w - e},0 V${h}`} stroke={DARK} strokeOpacity={0.6} strokeWidth={0.75} />
        {screws}
        {inner?.(face, style)}
      </>
    );
  };
}

const faceText = (w: number, h: number) => ({ x: ear(w) + 4, y: 0, w: Math.max(1, w - ear(w) * 2 - 8), h });

/** A row of small rects across [x0, x1]. */
function row(x0: number, x1: number, y: number, n: number, pw: number, ph: number, fill: string, gap = 0, rx = 0.6, opacity = 1) {
  const span = (x1 - x0 - gap) / n;
  return Array.from({ length: n }, (_, i) => {
    const extra = gap && i >= n / 2 ? gap : 0;
    return <rect key={`${y}-${i}`} x={x0 + span * i + (span - pw) / 2 + extra} y={y} width={pw} height={ph} rx={rx} fill={fill} fillOpacity={opacity} />;
  });
}

const leds = (x: number, cy: number, r: number, colors: string[]) =>
  colors.map((c, i) => <circle key={`led${i}`} cx={x + i * r * 3} cy={cy} r={r} fill={c} />);

function vents(x0: number, x1: number, y0: number, y1: number, step = 3.5) {
  let d = '';
  for (let x = x0; x <= x1; x += step) d += `M${x},${y0} V${y1} `;
  return <path d={d} stroke={DARK} strokeOpacity={0.55} strokeWidth={1} strokeLinecap="round" />;
}

const shapes: ShapeDef[] = [
  shape(
    'rack.cabinet',
    'Rack cabinet',
    'shape=mxgraph.rackGeneral.rackCabinet3;container=1;collapsible=0;childLayout=rack;allowGaps=1;marginLeft=20;marginRight=20;marginTop=20;marginBottom=12;rackUnitSize=16;numDisp=off;',
    ({ w, h, style }) => {
      const rail = Math.min(20, w * 0.1);
      const top = Math.min(20, h * 0.1);
      const bottom = Math.min(12, h * 0.06);
      const ih = Math.max(0, h - top - bottom);
      const n = Math.floor(ih / U);
      const frame = ink(style);
      const holes = [];
      for (let i = 0; i < n; i++) {
        const y = top + U * i + U / 2 - 1.5;
        holes.push(<rect key={`a${i}`} x={rail - 6} y={y} width={3} height={3} rx={0.5} fill={fillOf(style)} fillOpacity={0.55} />);
        holes.push(<rect key={`b${i}`} x={w - rail + 3} y={y} width={3} height={3} rx={0.5} fill={fillOf(style)} fillOpacity={0.55} />);
      }
      return (
        <>
          <path d={roundRectD(0, 0, w, h, 4)} fill={frame} stroke={frame} strokeWidth={style.strokeWidth} strokeLinejoin="round" />
          <rect x={rail} y={top} width={Math.max(0, w - rail * 2)} height={ih} fill={fillOf(style)} />
          <path d={`M${rail - 8},${top} V${top + ih} M${w - rail + 8},${top} V${top + ih}`} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1} />
          {holes}
          <rect x={rail * 0.6} y={h - bottom * 0.55} width={rail} height={bottom * 0.35} rx={1} fill="#ffffff" fillOpacity={0.15} />
          <rect x={w - rail * 1.6} y={h - bottom * 0.55} width={rail} height={bottom * 0.35} rx={1} fill="#ffffff" fillOpacity={0.15} />
        </>
      );
    },
    { container: true, textBox: (w, h) => ({ x: 8, y: 0, w: Math.max(1, w - 16), h: Math.min(20, h * 0.1) }) },
  ),
  shape('rack.unit', 'Rack unit', 'shape=mxgraph.rackGeneral.plate;html=1;', chassis(), { textBox: faceText }),
  shape(
    'rack.blank',
    'Blank plate',
    'shape=mxgraph.rackGeneral.plate;html=1;',
    chassis((b) => {
      let d = '';
      for (let i = 0; i < b.u; i++) d += `M${b.x + 6},${(b.h / b.u) * (i + 0.5)} H${b.x + b.w - 6} `;
      return <path d={d} stroke={DARK} strokeOpacity={0.35} strokeWidth={0.75} />;
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.server1',
    'Server 1U',
    'shape=mxgraph.rack.general.1u_rack_server;html=1;',
    chassis((b) => {
      const ph = b.h * 0.56;
      const y = (b.h - ph) / 2;
      const bw = b.w * 0.42;
      return (
        <>
          {row(b.x + 3, b.x + 3 + bw, y, 4, bw / 4 - 2, ph, DARK, 0, 0.8, 0.55)}
          {row(b.x + 3, b.x + 3 + bw, y + ph * 0.2, 4, 1.5, 1.5, LED_ON)}
          {vents(b.x + bw + 12, b.x + b.w * 0.8, y + 1, y + ph - 1)}
          {leds(b.x + b.w * 0.86, b.h / 2, Math.min(1.4, b.h * 0.09), [LED_ON, LED_WARN])}
          <circle cx={b.x + b.w - 6} cy={b.h / 2} r={Math.min(2.6, b.h * 0.16)} fill="none" stroke={LIGHT} strokeWidth={0.9} />
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.server2',
    'Server 2U',
    'shape=mxgraph.rack.general.2u_rack_server;html=1;',
    chassis((b) => {
      const rh = b.h / 2;
      const ph = rh * 0.62;
      const bw = b.w * 0.5;
      return (
        <>
          {[0, 1].map((r) => (
            <g key={r}>
              {row(b.x + 3, b.x + 3 + bw, r * rh + (rh - ph) / 2, 6, bw / 6 - 2, ph, DARK, 0, 0.8, 0.55)}
              {row(b.x + 3, b.x + 3 + bw, r * rh + (rh - ph) / 2 + ph * 0.25, 6, 1.5, 1.5, LED_ON)}
            </g>
          ))}
          {vents(b.x + bw + 12, b.x + b.w * 0.82, b.h * 0.2, b.h * 0.8)}
          {leds(b.x + b.w * 0.87, b.h * 0.3, Math.min(1.6, b.h * 0.05), [LED_ON, LED_ON])}
          <circle cx={b.x + b.w - 7} cy={b.h * 0.68} r={Math.min(3, b.h * 0.1)} fill="none" stroke={LIGHT} strokeWidth={1} />
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.switch',
    'Switch',
    'shape=mxgraph.rack.general.switches_1;html=1;',
    chassis((b) => {
      const ph = b.h * 0.28;
      const x0 = b.x + b.w * 0.2;
      const x1 = b.x + b.w - 6;
      const pw = ((x1 - x0) / 12) * 0.72;
      return (
        <>
          {leds(b.x + 5, b.h / 2, Math.min(1.4, b.h * 0.09), [LED_ON, LED_ON, LED_WARN])}
          {row(x0, x1, b.h * 0.14, 12, pw, ph, DARK, 4, 0.5, 0.75)}
          {row(x0, x1, b.h * 0.58, 12, pw, ph, DARK, 4, 0.5, 0.75)}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.patch',
    'Patch panel',
    'shape=mxgraph.rack.general.cat5e_rack_mount_patch_panel_24_ports;html=1;',
    chassis((b) => {
      const x0 = b.x + 6;
      const x1 = b.x + b.w - 6;
      const pw = ((x1 - x0) / 24) * 0.66;
      return (
        <>
          <rect x={x0} y={b.h * 0.12} width={x1 - x0} height={b.h * 0.18} rx={0.5} fill="#ffffff" fillOpacity={0.75} />
          {row(x0, x1, b.h * 0.42, 24, pw, b.h * 0.4, DARK, 6, 0.5, 0.75)}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.storage',
    'Storage array',
    'shape=mxgraph.rack.general.storage_1;html=1;',
    chassis((b) => {
      const rows = Math.max(2, b.u);
      const rh = b.h / rows;
      const bw = (b.w - 8) / 6;
      const out = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 6; c++) {
          const x = b.x + 4 + c * bw;
          const y = r * rh + rh * 0.14;
          out.push(<rect key={`d${r}-${c}`} x={x + 1} y={y} width={bw - 2} height={rh * 0.72} rx={0.8} fill={DARK} fillOpacity={0.5} />);
          out.push(<circle key={`l${r}-${c}`} cx={x + bw - 4} cy={y + rh * 0.36} r={Math.min(1.2, rh * 0.1)} fill={c === 5 && r === 0 ? LED_WARN : LED_ON} />);
          out.push(<path key={`h${r}-${c}`} d={`M${x + 4},${y + rh * 0.36} H${x + bw * 0.55}`} stroke={LIGHT} strokeOpacity={0.6} strokeWidth={0.75} />);
        }
      }
      return <>{out}</>;
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.ups',
    'UPS',
    'shape=mxgraph.rack.apc.apc_smart_ups_1000-3000_va_2u;html=1;',
    chassis((b) => {
      const lh = b.h * 0.42;
      return (
        <>
          <rect x={b.x + 8} y={(b.h - lh) / 2} width={b.w * 0.22} height={lh} rx={1.5} fill="#5eead4" fillOpacity={0.9} />
          <path d={`M${b.x + 11},${b.h / 2} H${b.x + 8 + b.w * 0.15}`} stroke={DARK} strokeOpacity={0.5} strokeWidth={1} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={b.x + b.w * 0.32 + i * 6} cy={b.h / 2} r={Math.min(1.8, b.h * 0.07)} fill={LIGHT} fillOpacity={0.8} />
          ))}
          {vents(b.x + b.w * 0.45, b.x + b.w - 8, b.h * 0.22, b.h * 0.78, 3)}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.pdu',
    'PDU',
    'shape=mxgraph.rack.general.power_strip;html=1;',
    chassis((b) => {
      const n = 8;
      const x0 = b.x + b.w * 0.16;
      const x1 = b.x + b.w - 4;
      const step = (x1 - x0) / n;
      const ow = step * 0.7;
      const oh = b.h * 0.6;
      return (
        <>
          <circle cx={b.x + 6} cy={b.h / 2} r={Math.min(1.6, b.h * 0.1)} fill={LED_ON} />
          <rect x={b.x + 11} y={b.h * 0.3} width={Math.max(1, b.w * 0.16 - 14)} height={b.h * 0.4} rx={1} fill={LIGHT} fillOpacity={0.5} />
          {Array.from({ length: n }, (_, i) => {
            const x = x0 + step * i + (step - ow) / 2;
            return (
              <g key={i}>
                <rect x={x} y={(b.h - oh) / 2} width={ow} height={oh} rx={1.2} fill={DARK} fillOpacity={0.6} />
                <path d={`M${x + ow * 0.32},${b.h / 2 - oh * 0.16} v${oh * 0.32} M${x + ow * 0.68},${b.h / 2 - oh * 0.16} v${oh * 0.32}`} stroke={LIGHT} strokeWidth={0.9} />
              </g>
            );
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.kvm',
    'KVM drawer',
    'shape=mxgraph.rack.general.kvm_1u;html=1;',
    chassis((b) => {
      const hh = b.h * 0.32;
      return (
        <>
          <rect x={b.x + 8} y={b.h * 0.2} width={b.h * 0.85} height={b.h * 0.6} rx={1} fill="none" stroke={LIGHT} strokeWidth={0.9} />
          <rect x={b.x + b.w * 0.3} y={(b.h - hh) / 2} width={b.w * 0.4} height={hh} rx={hh / 2} fill={LIGHT} fillOpacity={0.55} />
          {leds(b.x + b.w - 12, b.h / 2, Math.min(1.4, b.h * 0.09), [LED_ON, LED_ON])}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.cable',
    'Cable manager',
    'shape=mxgraph.rack.general.cable_management_1u;html=1;',
    chassis((b) => {
      const sh = b.h * 0.44;
      let d = '';
      for (let x = b.x + 12; x < b.x + b.w - 10; x += 4) d += `M${x},${(b.h - sh) / 2 + 1} V${(b.h + sh) / 2 - 1} `;
      return (
        <>
          <rect x={b.x + 8} y={(b.h - sh) / 2} width={b.w - 16} height={sh} rx={sh / 2} fill={DARK} fillOpacity={0.7} />
          <path d={d} stroke={LIGHT} strokeOpacity={0.35} strokeWidth={0.75} />
        </>
      );
    }),
    { textBox: faceText },
  ),
];

// ---------------------------------------------------------------------------
// Vendor-style equipment: generic front panels with drive bays, ports,
// displays and controls (no brand artwork).
// ---------------------------------------------------------------------------

const BAY = '#1e293b';
const LCD = '#5eead4';
const FIBER = '#22d3ee';
const SFP = '#94a3b8';
const pos = (v: number) => Math.max(0, v);

/** Drive-bay grid; `tall` = 2.5" SFF slots standing upright, else 3.5" LFF bays lying flat. */
function bays(x0: number, x1: number, y0: number, y1: number, cols: number, rows: number, tall: boolean, warn = -1) {
  const out: ReactNode[] = [];
  const cw = (x1 - x0) / cols;
  const rh = (y1 - y0) / rows;
  if (cw <= 0 || rh <= 0) return out;
  const g = Math.min(1, cw * 0.1, rh * 0.1);
  const lr = Math.max(0.3, Math.min(0.9, cw * 0.12, rh * 0.12));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * cw + g / 2;
      const y = y0 + r * rh + g / 2;
      const bw = pos(cw - g);
      const bh = pos(rh - g);
      const k = `${r}-${c}`;
      out.push(<rect key={`d${k}`} x={x} y={y} width={bw} height={bh} rx={0.6} fill={BAY} fillOpacity={0.75} />);
      out.push(
        tall ? (
          <path key={`h${k}`} d={`M${x + bw / 2},${y + bh * 0.32} V${y + bh * 0.88}`} stroke={LIGHT} strokeOpacity={0.45} strokeWidth={0.6} />
        ) : (
          <path key={`h${k}`} d={`M${x + bw * 0.08},${y + bh / 2} H${x + bw * 0.7}`} stroke={LIGHT} strokeOpacity={0.45} strokeWidth={0.6} />
        ),
      );
      const fill = r * cols + c === warn ? LED_WARN : LED_ON;
      out.push(<circle key={`l${k}`} cx={tall ? x + bw / 2 : x + bw * 0.86} cy={tall ? y + bh * 0.14 : y + bh * 0.5} r={lr} fill={fill} />);
    }
  }
  return out;
}

/** Ports in `rows` rows, split into `groups` blocks with small gaps. */
function ports(x0: number, x1: number, y0: number, y1: number, cols: number, rows: number, groups = 1, fill = DARK, op = 0.8) {
  const out: ReactNode[] = [];
  const gap = groups > 1 ? Math.min(4, (x1 - x0) * 0.025) : 0;
  const cw = (x1 - x0 - gap * (groups - 1)) / cols;
  const rh = (y1 - y0) / rows;
  if (cw <= 0 || rh <= 0) return out;
  const per = Math.max(1, Math.ceil(cols / groups));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * cw + Math.floor(c / per) * gap;
      out.push(<rect key={`p${r}-${c}`} x={x + cw * 0.12} y={y0 + r * rh + rh * 0.12} width={cw * 0.76} height={rh * 0.76} rx={0.4} fill={fill} fillOpacity={op} />);
    }
  }
  return out;
}

/** SFP cages: light frame with a dark mouth. */
function sfps(x0: number, x1: number, y0: number, y1: number, n: number, rows = 1) {
  const out: ReactNode[] = [];
  const cw = (x1 - x0) / n;
  const rh = (y1 - y0) / rows;
  if (cw <= 0 || rh <= 0) return out;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * cw + cw * 0.1;
      const y = y0 + r * rh + rh * 0.1;
      out.push(<rect key={`s${r}-${i}`} x={x} y={y} width={cw * 0.8} height={rh * 0.8} rx={0.4} fill={SFP} fillOpacity={0.85} />);
      out.push(<rect key={`m${r}-${i}`} x={x + cw * 0.14} y={y + rh * 0.2} width={cw * 0.52} height={rh * 0.4} fill={DARK} fillOpacity={0.85} />);
    }
  }
  return out;
}

/** Small backlit display. */
const lcd = (x: number, y: number, w: number, h: number, color = LCD) => (
  <g>
    <rect x={x} y={y} width={pos(w)} height={pos(h)} rx={1} fill={DARK} fillOpacity={0.8} />
    <rect x={x + 1} y={y + 1} width={pos(w - 2)} height={pos(h - 2)} rx={0.6} fill={color} fillOpacity={0.85} />
    <path d={`M${x + w * 0.15},${y + h * 0.4} H${x + w * 0.7} M${x + w * 0.15},${y + h * 0.65} H${x + w * 0.5}`} stroke={DARK} strokeOpacity={0.55} strokeWidth={Math.max(0.4, h * 0.08)} />
  </g>
);

/** Round buttons in a row. */
const buttons = (x: number, cy: number, r: number, n: number, color = LIGHT) =>
  Array.from({ length: n }, (_, i) => <circle key={`bt${i}`} cx={x + r + i * r * 3} cy={cy} r={r} fill={color} fillOpacity={0.75} />);

/** Front I/O block: USB, VGA and power button between xa and xb, centred on cy. */
function frontIO(xa: number, xb: number, cy: number, m: number) {
  const s = Math.max(0.5, m * 0.16);
  return (
    <g>
      <rect x={xa} y={cy - s * 0.5} width={s * 2.2} height={s} rx={0.3} fill={LIGHT} fillOpacity={0.75} />
      <path d={`M${xa + s * 2.8},${cy - s * 0.6} H${xa + s * 5.2} L${xa + s * 4.9},${cy + s * 0.6} H${xa + s * 3.1} Z`} fill="#1d4ed8" fillOpacity={0.9} />
      <circle cx={xb - s * 1.4} cy={cy} r={s} fill="none" stroke={LIGHT} strokeWidth={0.8} />
      <circle cx={xb - s * 1.4} cy={cy} r={s * 0.35} fill={LED_ON} />
    </g>
  );
}

/** Rack server front: drive bays + front I/O panel on the right. */
function serverFront(cols: number, rowsPerU: number, tall: boolean) {
  return chassis((b) => {
    const cp = Math.min(b.w * 0.2, 36);
    const x1 = b.x + b.w - cp - 2;
    const pad = Math.min(2, b.h * 0.1);
    const rows = Math.max(1, Math.round(rowsPerU * b.u));
    return (
      <>
        {bays(b.x + 2, x1, pad, b.h - pad, Math.ceil(cols / rows), rows, tall, 2)}
        {frontIO(x1 + 3, b.x + b.w - 2, Math.min(b.h / 2, U / 2), Math.min(b.h, U))}
        {b.u > 1 && vents(x1 + 4, b.x + b.w - 4, U * 0.8, b.h - 3, 3)}
      </>
    );
  });
}

function nasFront(cols: number) {
  return chassis((b) => {
    const lw = Math.min(b.w * 0.22, 34);
    const m = Math.min(b.h, U);
    return (
      <>
        {lcd(b.x + 3, m * 0.18, lw - 6, m * 0.5)}
        {buttons(b.x + 3, m * 0.84, Math.min(1.2, m * 0.08), 3)}
        {b.u > 1 && leds(b.x + 5, b.h - 5, 1.1, [LED_ON, LED_ON, LED_WARN])}
        {bays(b.x + lw, b.x + b.w - 3, 1.5, b.h - 1.5, cols, b.u, false)}
      </>
    );
  });
}

function upsFront(battery: boolean) {
  return chassis((b) => {
    const m = Math.min(b.h, U * 2);
    const lw = b.w * 0.24;
    const y = (b.h - m * 0.5) / 2;
    if (battery) {
      return (
        <>
          {vents(b.x + 8, b.x + b.w * 0.72, b.h * 0.18, b.h * 0.82, 3)}
          <rect x={b.x + b.w * 0.77} y={b.h * 0.3} width={b.w * 0.17} height={b.h * 0.4} rx={1} fill={LIGHT} fillOpacity={0.55} />
          {leds(b.x + b.w * 0.8, b.h * 0.82, Math.min(1.3, b.h * 0.05), [LED_ON])}
        </>
      );
    }
    return (
      <>
        {lcd(b.x + 8, y, lw, m * 0.5)}
        {buttons(b.x + 10 + lw, b.h / 2, Math.min(1.8, m * 0.06), 3)}
        {leds(b.x + 8, y + m * 0.5 + 3, Math.min(1.2, m * 0.04), [LED_ON, LED_ON, LED_WARN])}
        {vents(b.x + b.w * 0.5, b.x + b.w - 8, b.h * 0.2, b.h * 0.8, 3)}
      </>
    );
  });
}

/** 1U fixed-port appliance (firewall / ADC) with a display or status block on the left. */
function appliance(kind: 'fw' | 'adc') {
  return chassis((b) => {
    const m = Math.min(b.h, U);
    const y0 = b.h / 2 - m * 0.32;
    const y1 = b.h / 2 + m * 0.32;
    const lw = b.w * 0.22;
    return (
      <>
        {kind === 'fw' ? (
          <>
            <rect x={b.x + 3} y={y0} width={2} height={pos(y1 - y0)} rx={0.6} fill="#f97316" />
            {leds(b.x + 8, b.h / 2, Math.min(1.2, m * 0.08), [LED_ON, LED_ON, LED_WARN, LED_ON])}
            <rect x={b.x + lw - 6} y={y0 + 1} width={5} height={pos(y1 - y0 - 2)} rx={0.5} fill="#38bdf8" fillOpacity={0.8} />
          </>
        ) : (
          <>
            {lcd(b.x + 3, y0, lw * 0.62, y1 - y0)}
            {buttons(b.x + 5 + lw * 0.62, b.h / 2, Math.min(1.1, m * 0.07), 2)}
          </>
        )}
        {ports(b.x + lw + 2, b.x + b.w * 0.74, y0, y1, 8, 2, 2)}
        {sfps(b.x + b.w * 0.76, b.x + b.w - 3, y0, y1, kind === 'fw' ? 2 : 4)}
      </>
    );
  });
}

function routerFront(slots: number) {
  return chassis((b) => {
    const m = Math.min(b.h, U);
    const cols = slots > 2 ? 2 : slots;
    const rows = slots > 2 ? 2 : 1;
    const sx1 = b.x + b.w * 0.68;
    const sw = (sx1 - b.x - 4) / cols;
    const sh = (b.h - 3) / rows;
    const out: ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = b.x + 3 + c * sw;
        const y = 1.5 + r * sh;
        out.push(<rect key={`s${r}${c}`} x={x} y={y} width={pos(sw - 2)} height={pos(sh - 1.5)} rx={0.8} fill={BAY} fillOpacity={0.6} stroke={LIGHT} strokeOpacity={0.3} strokeWidth={0.6} />);
        out.push(<circle key={`a${r}${c}`} cx={x + 2.2} cy={y + sh / 2} r={0.7} fill={LIGHT} />);
        out.push(<circle key={`b${r}${c}`} cx={x + sw - 4.2} cy={y + sh / 2} r={0.7} fill={LIGHT} />);
        if (r === 0 && c === 0) out.push(<g key="np">{ports(x + 5, x + sw * 0.6, y + sh * 0.25, y + sh * 0.75, 4, 1, 1, DARK, 0.9)}</g>);
      }
    }
    const py = Math.min(b.h / 2, U / 2);
    return (
      <>
        {out}
        {ports(sx1 + 2, b.x + b.w * 0.9, py - m * 0.25, py + m * 0.25, 4, 1)}
        <rect x={b.x + b.w * 0.92} y={py - m * 0.15} width={m * 0.3} height={m * 0.3} rx={0.4} fill="#60a5fa" fillOpacity={0.9} />
        {b.u > 1 && leds(sx1 + 4, b.h - 6, 1.1, [LED_ON, LED_ON, LED_ON])}
      </>
    );
  });
}

const gear: ShapeDef[] = [
  shape('rack.server1u4', 'Server 1U (4 LFF)', 'shape=mxgraph.rack.general.1u_rack_server;html=1;', serverFront(4, 1, false), { textBox: faceText }),
  shape('rack.server1u8', 'Server 1U (8 SFF)', 'shape=mxgraph.rack.dell.poweredge_r630;html=1;', serverFront(8, 1, true), { textBox: faceText }),
  shape('rack.server1u10', 'Server 1U (10 SFF)', 'shape=mxgraph.rack.hpe_aruba.servers.proliant_dl360_gen10;html=1;', serverFront(10, 1, true), { textBox: faceText }),
  shape('rack.server2u12', 'Server 2U (12 LFF)', 'shape=mxgraph.rack.dell.poweredge_r730xd;html=1;', serverFront(12, 1.5, false), { textBox: faceText }),
  shape('rack.server2u24', 'Server 2U (24 SFF)', 'shape=mxgraph.rack.dell.poweredge_r730;html=1;', serverFront(24, 0.5, true), { textBox: faceText }),
  shape(
    'rack.jbod',
    'Storage shelf / JBOD',
    'shape=mxgraph.rack.general.storage_2;html=1;',
    chassis((b) => (
      <>
        {leds(b.x + 4, Math.min(5, b.h * 0.05), 1.2, [LED_ON, LED_ON])}
        {bays(b.x + 2, b.x + b.w - 2, Math.min(9, b.h * 0.1), b.h - 2, 6, Math.max(1, b.u), false, 9)}
      </>
    )),
    { textBox: faceText },
  ),
  shape(
    'rack.blade',
    'Blade chassis',
    'shape=mxgraph.rack.hp.c7000;html=1;',
    chassis((b) => {
      const psu = Math.min(b.h * 0.14, 22);
      const gap = Math.min(3, b.h * 0.02);
      const bh = pos((b.h - psu - gap * 3) / 2);
      const n = 8;
      const cw = (b.w - 6) / n;
      const out: ReactNode[] = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < n; c++) {
          const x = b.x + 3 + c * cw;
          const y = gap + r * (bh + gap);
          out.push(<rect key={`b${r}${c}`} x={x + 0.5} y={y} width={pos(cw - 1)} height={bh} rx={0.8} fill={BAY} fillOpacity={0.7} />);
          out.push(<rect key={`d${r}${c}`} x={x + cw * 0.2} y={y + bh * 0.08} width={pos(cw * 0.6)} height={pos(bh * 0.16)} rx={0.5} fill={LIGHT} fillOpacity={0.25} />);
          out.push(<path key={`h${r}${c}`} d={`M${x + cw / 2},${y + bh * 0.35} V${y + bh * 0.88}`} stroke={LIGHT} strokeOpacity={0.5} strokeWidth={0.8} />);
          out.push(<circle key={`l${r}${c}`} cx={x + cw * 0.3} cy={y + bh * 0.3} r={Math.max(0.3, Math.min(1, cw * 0.08))} fill={r === 1 && c === 5 ? LED_WARN : LED_ON} />);
        }
      }
      const py = b.h - psu - gap / 2;
      const pw = (b.w - 6) / 6;
      for (let i = 0; i < 6; i++) {
        const x = b.x + 3 + i * pw;
        out.push(<rect key={`p${i}`} x={x + 0.5} y={py} width={pos(pw - 1)} height={pos(psu)} rx={0.8} fill={DARK} fillOpacity={0.45} />);
        out.push(<circle key={`f${i}`} cx={x + pw * 0.3} cy={py + psu / 2} r={pos(Math.min(psu * 0.32, pw * 0.2))} fill="none" stroke={LIGHT} strokeOpacity={0.5} strokeWidth={0.7} />);
        out.push(<circle key={`g${i}`} cx={x + pw * 0.8} cy={py + psu / 2} r={0.9} fill={LED_ON} />);
      }
      return <>{out}</>;
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.tape',
    'Tape library',
    'shape=mxgraph.rack.general.tape_library;html=1;',
    chassis((b) => {
      const lw = b.w * 0.2;
      const mx0 = b.x + lw + 8;
      const mx1 = b.x + b.w * 0.72;
      const dh = pos((b.h - 6) / 2);
      return (
        <>
          {lcd(b.x + 4, b.h * 0.14, lw, b.h * 0.38)}
          {buttons(b.x + 4, b.h * 0.72, Math.min(1.6, b.h * 0.05), 4)}
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x={mx0} y={2 + i * (dh + 2)} width={pos(mx1 - mx0)} height={dh} rx={1} fill={BAY} fillOpacity={0.55} />
              <path d={`M${mx0 + (mx1 - mx0) * 0.35},${2 + i * (dh + 2) + dh / 2} H${mx0 + (mx1 - mx0) * 0.65}`} stroke={LIGHT} strokeWidth={1.2} strokeLinecap="round" />
            </g>
          ))}
          <rect x={b.x + b.w * 0.76} y={b.h * 0.42} width={b.w * 0.16} height={b.h * 0.14} rx={0.5} fill={DARK} fillOpacity={0.9} />
          <circle cx={b.x + b.w * 0.95} cy={b.h * 0.49} r={Math.min(1.5, b.h * 0.05)} fill={LIGHT} />
          {leds(b.x + b.w * 0.77, b.h * 0.25, Math.min(1.1, b.h * 0.04), [LED_ON, LED_WARN])}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape('rack.firewall', 'Firewall appliance', 'shape=mxgraph.rack.general.firewall;html=1;', appliance('fw'), { textBox: faceText }),
  shape('rack.adc', 'Load balancer / ADC', 'shape=mxgraph.rack.f5.big_ip_1600;html=1;', appliance('adc'), { textBox: faceText }),
  shape('rack.router1', 'Router 1U', 'shape=mxgraph.rack.cisco.cisco_1905_serial_integrated_services_router;html=1;', routerFront(2), { textBox: faceText }),
  shape('rack.router2', 'Router 2U', 'shape=mxgraph.rack.cisco.cisco_2911_integrated_services_router;html=1;', routerFront(4), { textBox: faceText }),
  shape(
    'rack.switch48',
    'Switch 48-port',
    'shape=mxgraph.rack.general.switches_2;html=1;',
    chassis((b) => {
      const m = Math.min(b.h, U);
      const y0 = b.h / 2 - m * 0.38;
      const y1 = b.h / 2 + m * 0.38;
      return (
        <>
          {leds(b.x + 4, b.h / 2, Math.min(1.1, m * 0.07), [LED_ON, LED_ON])}
          {ports(b.x + 12, b.x + b.w * 0.83, y0, y1, 24, 2, 4)}
          {sfps(b.x + b.w * 0.85, b.x + b.w - 2, y0, y1, 2, 2)}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.coreSwitch',
    'Chassis switch',
    'shape=mxgraph.rack.cisco.cisco_catalyst_6509_switch;html=1;',
    chassis((b) => {
      const fan = Math.min(b.h * 0.12, 16);
      const slots = Math.max(2, b.u - 1);
      const sh = (b.h - fan - 3) / slots;
      const sup = Math.floor(slots / 2);
      const out: ReactNode[] = [];
      for (let i = 0; i < slots; i++) {
        const y = 1.5 + i * sh;
        out.push(<rect key={`c${i}`} x={b.x + 2} y={y} width={pos(b.w - 4)} height={pos(sh - 1)} rx={0.8} fill={BAY} fillOpacity={0.5} />);
        out.push(<rect key={`e${i}`} x={b.x + 3} y={y + sh * 0.2} width={2} height={pos(sh * 0.6 - 1)} rx={0.5} fill={LIGHT} fillOpacity={0.5} />);
        out.push(<rect key={`f${i}`} x={b.x + b.w - 5} y={y + sh * 0.2} width={2} height={pos(sh * 0.6 - 1)} rx={0.5} fill={LIGHT} fillOpacity={0.5} />);
        if (i === sup - 1 || i === sup) {
          out.push(<g key={`s${i}`}>{lcd(b.x + 9, y + sh * 0.2, b.w * 0.14, sh * 0.6 - 1)}</g>);
          out.push(<g key={`p${i}`}>{ports(b.x + b.w * 0.3, b.x + b.w * 0.5, y + sh * 0.2, y + sh * 0.8 - 1, 4, 1)}</g>);
          out.push(<g key={`q${i}`}>{sfps(b.x + b.w * 0.55, b.x + b.w * 0.75, y + sh * 0.2, y + sh * 0.8 - 1, 4)}</g>);
        } else {
          out.push(<g key={`p${i}`}>{ports(b.x + 9, b.x + b.w - 8, y + sh * 0.1, y + sh * 0.9 - 1, 24, 2, 4)}</g>);
        }
      }
      return (
        <>
          {out}
          {vents(b.x + 6, b.x + b.w - 6, b.h - fan, b.h - 2, 3)}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.fiberPanel',
    'Fibre patch panel',
    'shape=mxgraph.rack.general.fibre_patch_panel;html=1;',
    chassis((b) => {
      const n = 12;
      const x0 = b.x + 6;
      const step = (b.w - 12) / n;
      return (
        <>
          <rect x={x0} y={b.h * 0.1} width={pos(b.w - 12)} height={b.h * 0.18} rx={0.5} fill="#ffffff" fillOpacity={0.7} />
          {Array.from({ length: n }, (_, i) => {
            const x = x0 + i * step + step * 0.12;
            const pw = step * 0.36;
            return (
              <g key={i}>
                <rect x={x} y={b.h * 0.42} width={pw} height={b.h * 0.42} rx={0.4} fill={FIBER} fillOpacity={0.9} />
                <rect x={x + pw + step * 0.04} y={b.h * 0.42} width={pw} height={b.h * 0.42} rx={0.4} fill={FIBER} fillOpacity={0.9} />
              </g>
            );
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.patch48',
    'Patch panel 48-port',
    'shape=mxgraph.rack.general.cat5e_rack_mount_patch_panel_48_ports;html=1;',
    chassis((b) => {
      const rh = b.h / b.u;
      return (
        <>
          {Array.from({ length: b.u }, (_, r) => (
            <g key={r}>
              <rect x={b.x + 6} y={r * rh + rh * 0.08} width={pos(b.w - 12)} height={rh * 0.16} rx={0.5} fill="#ffffff" fillOpacity={0.7} />
              {ports(b.x + 6, b.x + b.w - 6, r * rh + rh * 0.34, r * rh + rh * 0.88, 24, 1, 4)}
            </g>
          ))}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.cableRings',
    'Cable manager (D-rings)',
    'shape=mxgraph.rack.general.cable_management_2u;html=1;',
    chassis((b) => {
      const n = 5;
      const step = (b.w - 16) / n;
      const rw = pos(step * 0.55);
      return (
        <>
          <rect x={b.x + 4} y={b.h * 0.3} width={pos(b.w - 8)} height={b.h * 0.4} fill={DARK} fillOpacity={0.5} />
          {Array.from({ length: n }, (_, i) => {
            const x = b.x + 8 + i * step + (step - rw) / 2;
            return <rect key={i} x={x} y={b.h * 0.1} width={rw} height={b.h * 0.8} rx={Math.min(rw, b.h) * 0.4} fill="none" stroke={LIGHT} strokeOpacity={0.8} strokeWidth={Math.max(0.8, Math.min(2, b.h * 0.06))} />;
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.brush',
    'Brush panel',
    'shape=mxgraph.rack.general.brush_strip;html=1;',
    chassis((b) => {
      const sh = b.h * 0.5;
      const y0 = (b.h - sh) / 2;
      let d = '';
      for (let x = b.x + 10; x < b.x + b.w - 9; x += 2) d += `M${x},${y0} V${b.h / 2 - 0.4} M${x + 1},${y0 + sh} V${b.h / 2 + 0.4} `;
      return (
        <>
          <rect x={b.x + 8} y={y0} width={pos(b.w - 16)} height={sh} rx={sh * 0.2} fill={DARK} fillOpacity={0.85} />
          {d && <path d={d} stroke="#64748b" strokeWidth={0.7} />}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.pduVertical',
    'Vertical PDU (0U)',
    'shape=mxgraph.rack.apc.apc_switched_rack_pdu_ap7900;html=1;',
    ({ w, h, style }) => {
      const top = Math.min(h * 0.12, w * 2.4);
      const ow = w * 0.56;
      const oh = ow * 0.75;
      const step = Math.max(1, oh * 1.7);
      const n = Math.max(0, Math.min(200, Math.floor((h - top - 6) / step)));
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={Math.min(3, w * 0.2)} fill={fillOf(style)} {...strokeAttrs(style)} />
          <rect x={w * 0.18} y={top * 0.12} width={w * 0.64} height={top * 0.36} rx={0.8} fill={DARK} fillOpacity={0.85} />
          <rect x={w * 0.26} y={top * 0.18} width={w * 0.48} height={top * 0.24} rx={0.5} fill="#ef4444" fillOpacity={0.8} />
          <rect x={w * 0.3} y={top * 0.6} width={w * 0.4} height={top * 0.28} rx={0.8} fill={LIGHT} fillOpacity={0.6} />
          {Array.from({ length: n }, (_, i) => {
            const y = top + 3 + i * step;
            return (
              <g key={i}>
                <rect x={(w - ow) / 2} y={y} width={ow} height={oh} rx={oh * 0.2} fill={DARK} fillOpacity={0.75} />
                <path d={`M${w / 2 - ow * 0.2},${y + oh * 0.3} v${oh * 0.4} M${w / 2 + ow * 0.2},${y + oh * 0.3} v${oh * 0.4}`} stroke={LIGHT} strokeWidth={0.7} />
              </g>
            );
          })}
        </>
      );
    },
    { textBox: (w, h) => ({ x: 0, y: Math.max(0, h - 16), w, h: Math.min(h, 14) }) },
  ),
  shape(
    'rack.pduMetered',
    'Metered PDU',
    'shape=mxgraph.rack.apc.apc_metered_rack_pdu;html=1;',
    chassis((b) => {
      const dw = b.w * 0.14;
      const n = 8;
      const x0 = b.x + dw + 10;
      const step = (b.x + b.w - 4 - x0) / n;
      const ow = pos(step * 0.68);
      const oh = b.h * 0.56;
      return (
        <>
          <rect x={b.x + 4} y={b.h * 0.22} width={pos(dw)} height={b.h * 0.56} rx={0.8} fill={DARK} fillOpacity={0.9} />
          <rect x={b.x + 5} y={b.h * 0.3} width={pos(dw - 2)} height={b.h * 0.4} rx={0.4} fill="#ef4444" fillOpacity={0.85} />
          {Array.from({ length: n }, (_, i) => {
            const x = x0 + step * i + (step - ow) / 2;
            return (
              <g key={i}>
                <rect x={x} y={(b.h - oh) / 2} width={ow} height={oh} rx={1} fill={DARK} fillOpacity={0.7} />
                <path d={`M${x + ow * 0.3},${b.h / 2 - oh * 0.18} v${oh * 0.36} M${x + ow * 0.7},${b.h / 2 - oh * 0.18} v${oh * 0.36}`} stroke={LIGHT} strokeWidth={0.8} />
              </g>
            );
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape('rack.upsLcd', 'UPS with display', 'shape=mxgraph.rack.apc.apc_smart_ups_3000_va_2u;html=1;', upsFront(false), { textBox: faceText }),
  shape('rack.battery', 'UPS battery pack', 'shape=mxgraph.rack.apc.apc_smart_ups_rt_battery_pack;html=1;', upsFront(true), { textBox: faceText }),
  shape(
    'rack.ats',
    'Transfer switch (ATS)',
    'shape=mxgraph.rack.apc.apc_rack_automatic_transfer_switch;html=1;',
    chassis((b) => {
      const m = Math.min(b.h, U);
      const n = 6;
      const x0 = b.x + b.w * 0.42;
      const step = (b.x + b.w - 4 - x0) / n;
      return (
        <>
          {lcd(b.x + 4, b.h / 2 - m * 0.28, b.w * 0.14, m * 0.56, '#fca5a5')}
          <circle cx={b.x + b.w * 0.24} cy={b.h / 2} r={Math.min(1.6, m * 0.1)} fill={LED_ON} />
          <circle cx={b.x + b.w * 0.31} cy={b.h / 2} r={Math.min(1.6, m * 0.1)} fill={LED_WARN} />
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={x0 + i * step + step * 0.16} y={b.h / 2 - m * 0.28} width={pos(step * 0.68)} height={m * 0.56} rx={1} fill={DARK} fillOpacity={0.7} />
          ))}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.kvmSwitch',
    'KVM switch',
    'shape=mxgraph.rack.general.kvm_switch;html=1;',
    chassis((b) => {
      const m = Math.min(b.h, U);
      const n = 8;
      const x0 = b.x + b.w * 0.3;
      const step = (b.x + b.w - 6 - x0) / n;
      return (
        <>
          {lcd(b.x + 4, b.h / 2 - m * 0.28, b.w * 0.18, m * 0.56)}
          {Array.from({ length: n }, (_, i) => {
            const x = x0 + i * step;
            return (
              <g key={i}>
                <rect x={x + step * 0.15} y={b.h / 2 - m * 0.06} width={pos(step * 0.7)} height={m * 0.36} rx={1} fill={LIGHT} fillOpacity={0.7} />
                <circle cx={x + step / 2} cy={b.h / 2 - m * 0.24} r={Math.min(0.9, m * 0.06)} fill={i === 2 ? LED_ON : '#475569'} />
              </g>
            );
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.console',
    'Console drawer (LCD)',
    'shape=mxgraph.rack.general.1u_kvm_console;html=1;',
    chassis((b) => {
      const hw = Math.min(14, b.w * 0.1);
      const y0 = b.h * 0.18;
      const y1 = b.h * 0.82;
      return (
        <>
          {[b.x + 3, b.x + b.w - 3 - hw].map((x, i) => (
            <rect key={i} x={x} y={y0} width={pos(hw)} height={pos(y1 - y0)} rx={Math.min(3, (y1 - y0) / 2)} fill="none" stroke={LIGHT} strokeOpacity={0.75} strokeWidth={1} />
          ))}
          <path d={`M${b.x + hw + 8},${b.h * 0.66} H${b.x + b.w - hw - 8}`} stroke={DARK} strokeOpacity={0.8} strokeWidth={0.8} />
          <rect x={b.x + b.w / 2 - 6} y={b.h * 0.28} width={12} height={b.h * 0.22} rx={1} fill={LIGHT} fillOpacity={0.55} />
          {leds(b.x + hw + 10, b.h * 0.36, Math.min(0.9, b.h * 0.06), [LED_ON, LED_ON])}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape(
    'rack.shelf',
    'Shelf',
    'shape=mxgraph.rack.general.shelf;html=1;container=1;',
    ({ w, h, style }) => {
      const e = ear(w);
      const t = Math.min(4, h * 0.25);
      return (
        <>
          <rect x={e} y={0} width={pos(w - e * 2)} height={h} fill={fillOf(style)} fillOpacity={0.12} stroke="none" />
          <rect x={0} y={0} width={e} height={h} rx={1} fill={fillOf(style)} {...strokeAttrs(style)} />
          <rect x={w - e} y={0} width={e} height={h} rx={1} fill={fillOf(style)} {...strokeAttrs(style)} />
          <rect x={e} y={h - t} width={pos(w - e * 2)} height={t} fill={fillOf(style)} {...strokeAttrs(style)} />
        </>
      );
    },
    { container: true, textBox: faceText },
  ),
  shape(
    'rack.fanTray',
    'Fan tray',
    'shape=mxgraph.rack.general.fan_1;html=1;',
    chassis((b) => {
      const n = 4;
      const step = b.w / n;
      const r = pos(Math.min(step * 0.4, b.h * 0.42));
      return (
        <>
          {Array.from({ length: n }, (_, i) => {
            const cx = b.x + step * (i + 0.5);
            const cy = b.h / 2;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill={DARK} fillOpacity={0.7} stroke={LIGHT} strokeOpacity={0.5} strokeWidth={0.7} />
                <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={LIGHT} strokeOpacity={0.35} strokeWidth={0.6} />
                <path d={`M${cx - r},${cy} H${cx + r} M${cx},${cy - r} V${cy + r}`} stroke={LIGHT} strokeOpacity={0.35} strokeWidth={0.6} />
              </g>
            );
          })}
        </>
      );
    }),
    { textBox: faceText },
  ),
  shape('rack.nas1', 'NAS 1U', 'shape=mxgraph.rack.synology.synology_rackstation_rs819;html=1;', nasFront(4), { textBox: faceText }),
  shape('rack.nas2', 'NAS 2U', 'shape=mxgraph.rack.synology.synology_rackstation_rs2418;html=1;', nasFront(6), { textBox: faceText }),
  shape(
    'rack.sensor',
    'Environment monitor',
    'shape=mxgraph.rack.apc.apc_netbotz_rack_monitor_250;html=1;',
    chassis((b) => {
      const m = Math.min(b.h, U);
      const y0 = b.h / 2 - m * 0.3;
      const y1 = b.h / 2 + m * 0.3;
      return (
        <>
          {lcd(b.x + 4, y0, b.w * 0.2, y1 - y0, '#86efac')}
          <circle cx={b.x + b.w * 0.32} cy={b.h / 2} r={Math.min(2.4, m * 0.16)} fill="#38bdf8" fillOpacity={0.9} />
          {leds(b.x + b.w * 0.39, b.h / 2, Math.min(1, m * 0.07), [LED_ON, LED_ON, LED_WARN])}
          {ports(b.x + b.w * 0.55, b.x + b.w - 5, y0, y1, 6, 1, 2)}
        </>
      );
    }),
    { textBox: faceText },
  ),
];
shapes.push(...gear);

const unit: Partial<ElementStyle> = { fill: '#334155', stroke: DARK, strokeWidth: 1, textColor: '#e2e8f0', fontSize: 10, bold: true };

const libraries: ShapeLibrary[] = [
  {
    id: 'rack',
    name: 'Rack',
    items: [
      item('rack.cabinet', 'Rack cabinet', 200, 352, {
        text: 'Rack A',
        style: { fill: '#e2e8f0', stroke: '#1e293b', textColor: '#f8fafc', fontSize: 11, bold: true },
        keywords: '19 inch cabinet enclosure 20u',
      }),
      item('rack.unit', '1U unit', 160, 16, { text: '1U', style: unit, keywords: 'rack device generic' }),
      item('rack.unit', '2U unit', 160, 32, { text: '2U', style: unit, keywords: 'rack device generic' }),
      item('rack.unit', '4U unit', 160, 64, { text: '4U', style: unit, keywords: 'rack device generic' }),
      item('rack.server1', 'Server 1U', 160, 16, { style: unit, keywords: 'rack server compute' }),
      item('rack.server2', 'Server 2U', 160, 32, { style: unit, keywords: 'rack server compute' }),
      item('rack.switch', 'Switch', 160, 16, { style: unit, keywords: 'network ethernet ports' }),
      item('rack.patch', 'Patch panel', 160, 16, { style: unit, keywords: 'cat5 cat6 ports cabling' }),
      item('rack.storage', 'Storage array', 160, 32, { style: unit, keywords: 'san nas disks raid' }),
      item('rack.ups', 'UPS', 160, 32, { style: unit, keywords: 'power battery backup' }),
      item('rack.pdu', 'PDU', 160, 16, { style: unit, keywords: 'power distribution outlets' }),
      item('rack.kvm', 'KVM drawer', 160, 16, { style: unit, keywords: 'console keyboard monitor' }),
      item('rack.cable', 'Cable manager', 160, 16, { style: unit, keywords: 'brush cable organizer' }),
      item('rack.blank', 'Blank plate', 160, 16, { style: { ...unit, fill: '#475569' }, keywords: 'filler panel cover' }),
      item('rack.server1u4', 'Server 1U, 4 LFF bays', 160, 16, { style: unit, keywords: 'rack server 1u 3.5 drives hdd dell poweredge hp proliant lenovo thinksystem supermicro' }),
      item('rack.server1u8', 'Server 1U, 8 SFF bays', 160, 16, { style: unit, keywords: 'rack server 1u 2.5 drives ssd dell poweredge r640 hp proliant dl360 lenovo' }),
      item('rack.server1u10', 'Server 1U, 10 SFF bays', 160, 16, { style: unit, keywords: 'rack server 1u 2.5 nvme ssd dell poweredge hpe proliant dl360 supermicro' }),
      item('rack.server2u12', 'Server 2U, 12 LFF bays', 160, 32, { style: unit, keywords: 'rack server 2u 3.5 storage server dell r740xd hpe dl380 supermicro' }),
      item('rack.server2u24', 'Server 2U, 24 SFF bays', 160, 32, { style: unit, keywords: 'rack server 2u 2.5 ssd nvme dell poweredge r740 hpe proliant dl380 lenovo' }),
      item('rack.jbod', 'Storage shelf / JBOD 4U', 160, 64, { style: unit, keywords: 'jbod disk shelf enclosure san storage array netapp dell powervault hpe msa' }),
      item('rack.blade', 'Blade chassis 10U', 160, 160, { style: unit, keywords: 'blade enclosure chassis hpe c7000 synergy dell mx7000 cisco ucs compute' }),
      item('rack.tape', 'Tape library 2U', 160, 32, { style: unit, keywords: 'tape autoloader lto backup library archive ibm hpe quantum' }),
      item('rack.firewall', 'Firewall appliance 1U', 160, 16, { style: unit, keywords: 'firewall utm ngfw security appliance fortigate palo alto checkpoint sophos' }),
      item('rack.adc', 'Load balancer / ADC 1U', 160, 16, { style: unit, keywords: 'load balancer adc application delivery f5 big-ip citrix netscaler a10' }),
      item('rack.router1', 'Router 1U', 160, 16, { style: unit, keywords: 'router branch wan edge cisco isr juniper modular' }),
      item('rack.router2', 'Router 2U modular', 160, 32, { style: unit, keywords: 'router modular nim slots wan cisco isr 4000 juniper mx' }),
      item('rack.switch48', 'Switch 48-port + SFP', 160, 16, { style: unit, keywords: 'switch 48 port access ethernet sfp uplink cisco catalyst aruba juniper ex' }),
      item('rack.coreSwitch', 'Chassis switch 8U', 160, 128, { style: unit, keywords: 'core switch chassis line cards modular supervisor cisco nexus catalyst 9400 arista' }),
      item('rack.fiberPanel', 'Fibre patch panel (LC)', 160, 16, { style: unit, keywords: 'fiber fibre optic lc duplex patch panel om3 om4 singlemode' }),
      item('rack.patch48', 'Patch panel 48-port 2U', 160, 32, { style: unit, keywords: 'patch panel 48 port cat6 cat6a rj45 copper cabling' }),
      item('rack.cableRings', 'Cable manager (D-rings)', 160, 32, { style: unit, keywords: 'cable management d-ring horizontal organizer finger duct' }),
      item('rack.brush', 'Brush panel', 160, 16, { style: unit, keywords: 'brush strip cable pass-through grommet panel' }),
      item('rack.pduVertical', 'Vertical PDU (0U)', 18, 320, { style: { ...unit, fontSize: 8 }, keywords: 'pdu 0u zero u vertical power strip outlets c13 apc raritan' }),
      item('rack.pduMetered', 'Metered PDU 1U', 160, 16, { style: unit, keywords: 'pdu metered monitored power distribution amp display apc' }),
      item('rack.upsLcd', 'UPS 2U with display', 160, 32, { style: unit, keywords: 'ups uninterruptible power supply battery lcd apc smart-ups eaton' }),
      item('rack.upsLcd', 'UPS 3U with display', 160, 48, { style: unit, keywords: 'ups uninterruptible power supply battery lcd apc eaton 3u' }),
      item('rack.battery', 'UPS battery pack 2U', 160, 32, { style: unit, keywords: 'battery extension pack ebm external ups runtime' }),
      item('rack.ats', 'Transfer switch (ATS) 1U', 160, 16, { style: unit, keywords: 'ats automatic transfer switch dual power redundancy apc' }),
      item('rack.kvmSwitch', 'KVM switch 1U', 160, 16, { style: unit, keywords: 'kvm switch keyboard video mouse ports console' }),
      item('rack.console', 'Console drawer (LCD) 1U', 160, 16, { style: unit, keywords: 'kvm console drawer lcd monitor keyboard tray folded' }),
      item('rack.shelf', 'Shelf 2U', 160, 32, { style: { ...unit, fill: '#64748b' }, keywords: 'shelf tray cantilever fixed shelf' }),
      item('rack.fanTray', 'Fan tray 1U', 160, 16, { style: unit, keywords: 'fan tray cooling ventilation blower' }),
      item('rack.nas1', 'NAS 1U', 160, 16, { style: unit, keywords: 'nas network attached storage synology qnap rackstation' }),
      item('rack.nas2', 'NAS 2U', 160, 32, { style: unit, keywords: 'nas network attached storage 12 bay synology qnap' }),
      item('rack.sensor', 'Environment monitor 1U', 160, 16, { style: unit, keywords: 'environmental monitoring temperature humidity sensor netbotz probe' }),
    ],
  },
];

export { shapes, libraries };
