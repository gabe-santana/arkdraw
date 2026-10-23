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
    ],
  },
];

export { shapes, libraries };
