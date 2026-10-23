/**
 * Process engineering / P&ID symbols (draw.io "Proc. Eng." parity).
 *
 * In-line equipment (valves, pumps) keeps its pipe connections on the left and
 * right edges at mid-height so connectors attach where the pipe enters.
 */
import type { ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import { Body, Detail } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Ink, Line, circleD, f, fracBox, item, pathOf, shape, solid, waveD } from './_kit2';

type R = (ctx: ShapeRenderContext) => ReactNode;

const ART = { boxHit: true, textPlacement: 'below' as const };
const B = ({ d, s }: { d: string; s: ElementStyle }) => <Body d={d} s={solid(s)} />;
const thin = (s: ElementStyle): ElementStyle => ({ ...solid(s, 0.7) });

// ---------------------------------------------------------------------------
// Valves
// ---------------------------------------------------------------------------

/** The two body triangles of an in-line valve, centred at (cx, cy). */
function bowtie(cx: number, cy: number, hw: number, hh: number) {
  return {
    left: pathOf([[cx - hw, cy - hh], [cx, cy], [cx - hw, cy + hh]]),
    right: pathOf([[cx + hw, cy - hh], [cx, cy], [cx + hw, cy + hh]]),
  };
}

type ValveKind = 'gate' | 'globe' | 'ball' | 'check' | 'needle' | 'plug';
const valve = (kind: ValveKind): R => ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const hh = h * 0.42;
  const t = bowtie(cx, cy, w / 2, hh);
  return (
    <>
      <B s={s} d={t.left} />
      {kind === 'check' ? <Body d={t.right} s={{ ...solid(s), fill: solid(s).stroke }} /> : <B s={s} d={t.right} />}
      {kind === 'globe' && <Ink s={s} d={circleD(cx, cy, Math.min(w, h) * 0.15)} />}
      {kind === 'ball' && <B s={s} d={circleD(cx, cy, Math.min(w, h) * 0.2)} />}
      {kind === 'plug' && <B s={s} d={pathOf([[cx, cy - hh * 0.5], [cx + hh * 0.35, cy], [cx, cy + hh * 0.5], [cx - hh * 0.35, cy]])} />}
      {kind === 'needle' && <Line s={s} d={`M${f(cx)},${f(cy)} V${f(cy - hh * 1.15)}`} />}
    </>
  );
};

const butterfly: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const x0 = w * 0.12;
  const x1 = w * 0.88;
  return (
    <>
      <Line s={s} d={`M0,${f(cy)} H${f(x0)} M${f(x1)},${f(cy)} H${w}`} />
      <Line s={s} cap="butt" k={1.3} d={`M${f(x0)},${f(h * 0.06)} V${f(h * 0.94)} M${f(x1)},${f(h * 0.06)} V${f(h * 0.94)}`} />
      <Line s={s} d={`M${f(w * 0.32)},${f(h * 0.86)} L${f(w * 0.68)},${f(h * 0.14)}`} />
      <Ink s={s} d={circleD(w / 2, cy, Math.min(w, h) * 0.1)} />
    </>
  );
};

const controlValve: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const hh = h * 0.2;
  const t = bowtie(cx, cy, w / 2, hh);
  const top = h * 0.18;
  return (
    <>
      <Line s={s} d={`M${f(cx)},${f(cy)} V${f(top)}`} />
      <B s={s} d={`M${f(w * 0.18)},${f(top)} A${f(w * 0.32)},${f(h * 0.16)} 0 0 1 ${f(w * 0.82)},${f(top)} Z`} />
      <B s={s} d={t.left} />
      <B s={s} d={t.right} />
    </>
  );
};

const threeWay: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const hh = Math.min(h * 0.24, w * 0.24);
  const t = bowtie(cx, cy, w / 2, hh);
  return (
    <>
      <B s={s} d={t.left} />
      <B s={s} d={t.right} />
      <B s={s} d={pathOf([[cx, cy], [cx + hh, h], [cx - hh, h]])} />
    </>
  );
};

const reducer: R = ({ w, h, style: s }) => <B s={s} d={pathOf([[0, 0], [w, h * 0.25], [w, h * 0.75], [0, h]])} />;

// ---------------------------------------------------------------------------
// Rotating equipment
// ---------------------------------------------------------------------------

const centrifugalPump: R = ({ w, h, style: s }) => {
  const r = Math.min(w * 0.4, h * 0.4);
  const cx = r + w * 0.04;
  const cy = h / 2;
  return (
    <>
      <Line s={s} d={`M${f(cx - r * 0.55)},${f(cy + r * 0.8)} L${f(cx - r * 0.9)},${f(h)} H${f(cx + r * 0.9)} L${f(cx + r * 0.55)},${f(cy + r * 0.8)}`} />
      <B s={s} d={`M${f(cx)},${f(cy - r)} H${w} V${f(cy - r * 0.45)} H${f(cx)} Z`} />
      <B s={s} d={circleD(cx, cy, r)} />
      <Line s={s} d={`M${f(cx)},${f(cy - r)} H${f(cx + r * 0.95)}`} />
    </>
  );
};

/** ISO 10628 pump: circle with a triangle pointing to the discharge. */
const isoPump: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  return (
    <>
      <Line s={s} d={`M0,${f(cy)} H${f(cx - r)} M${f(cx + r)},${f(cy)} H${w}`} />
      <B s={s} d={circleD(cx, cy, r)} />
      <Line s={s} d={pathOf([[cx - r * 0.5, cy - r * 0.86], [cx + r, cy], [cx - r * 0.5, cy + r * 0.86]], false)} />
    </>
  );
};

const compressor: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  return (
    <>
      <Line s={s} d={`M0,${f(cy)} H${f(cx - r)} M${f(cx + r)},${f(cy)} H${w}`} />
      <B s={s} d={circleD(cx, cy, r)} />
      <Line
        s={s}
        d={`M${f(cx - r * 0.62)},${f(cy - r * 0.78)} L${f(cx + r * 0.9)},${f(cy - r * 0.38)} M${f(cx - r * 0.62)},${f(cy + r * 0.78)} L${f(cx + r * 0.9)},${f(cy + r * 0.38)}`}
      />
    </>
  );
};

const fan: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  const blades = [0, 120, 240]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const tip = [cx + ux * r * 0.78, cy + uy * r * 0.78];
      const side = [cx + (ux * 0.45 - uy * 0.38) * r, cy + (uy * 0.45 + ux * 0.38) * r];
      return `M${f(cx)},${f(cy)} Q${f(side[0])},${f(side[1])} ${f(tip[0])},${f(tip[1])} Q${f(cx + ux * r * 0.3)},${f(cy + uy * r * 0.3)} ${f(cx)},${f(cy)} Z`;
    })
    .join(' ');
  return (
    <>
      <B s={s} d={circleD(cx, cy, r)} />
      <Ink s={s} d={blades} opacity={0.85} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Vessels & columns
// ---------------------------------------------------------------------------

const verticalVessel: R = ({ w, h, style: s }) => {
  const hd = Math.min(w * 0.3, h * 0.2);
  return (
    <>
      <B s={s} d={`M0,${f(hd)} A${f(w / 2)},${f(hd)} 0 0 1 ${w},${f(hd)} V${f(h - hd)} A${f(w / 2)},${f(hd)} 0 0 1 0,${f(h - hd)} Z`} />
      <Detail s={thin(s)} d={`M0,${f(hd)} H${w} M0,${f(h - hd)} H${w}`} />
    </>
  );
};

const horizontalDrum: R = ({ w, h, style: s }) => {
  const hd = Math.min(h * 0.3, w * 0.2);
  return (
    <>
      <B s={s} d={`M${f(hd)},0 H${f(w - hd)} A${f(hd)},${f(h / 2)} 0 0 1 ${f(w - hd)},${h} H${f(hd)} A${f(hd)},${f(h / 2)} 0 0 1 ${f(hd)},0 Z`} />
      <Detail s={thin(s)} d={`M${f(hd)},0 V${h} M${f(w - hd)},0 V${h}`} />
    </>
  );
};

const openTank: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={`M0,0 V${h} H${w} V0`} />
    <Detail s={{ ...thin(s), strokeStyle: 'dashed' }} d={waveD(w * 0.08, w * 0.92, h * 0.3, h * 0.025, 4)} />
  </>
);

const column: R = ({ w, h, style: s }) => {
  const hd = Math.min(w * 0.45, h * 0.1);
  const n = Math.max(3, Math.floor((h - hd * 2) / 18));
  const gap = (h - hd * 2) / (n + 1);
  let trays = '';
  for (let i = 1; i <= n; i++) {
    const y = hd + gap * i;
    trays += i % 2 ? ` M0,${f(y)} H${f(w * 0.72)}` : ` M${f(w * 0.28)},${f(y)} H${w}`;
  }
  return (
    <>
      <B s={s} d={`M0,${f(hd)} A${f(w / 2)},${f(hd)} 0 0 1 ${w},${f(hd)} V${f(h - hd)} A${f(w / 2)},${f(hd)} 0 0 1 0,${f(h - hd)} Z`} />
      <Detail s={{ ...thin(s), strokeStyle: 'dashed' }} d={trays} />
    </>
  );
};

const coolingTower: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={`M${f(w * 0.2)},0 Q${f(w * 0.38)},${f(h * 0.55)} ${f(w * 0.04)},${h} H${f(w * 0.96)} Q${f(w * 0.62)},${f(h * 0.55)} ${f(w * 0.8)},0 Z`} />
    <Detail s={thin(s)} d={`M${f(w * 0.1)},${f(h * 0.82)} H${f(w * 0.9)}`} />
  </>
);

// ---------------------------------------------------------------------------
// Heat transfer
// ---------------------------------------------------------------------------

const shellTube: R = ({ w, h, style: s }) => {
  const r = Math.min(h * 0.5, w * 0.15);
  const ts = w * 0.12;
  const tr = h * 0.2;
  return (
    <>
      <B s={s} d={`M0,0 H${f(w - r)} A${f(r)},${f(h / 2)} 0 0 1 ${f(w - r)},${h} H0 Z`} />
      <Line s={s} cap="butt" d={`M${f(ts)},0 V${h}`} />
      <Detail
        s={thin(s)}
        d={`M${f(ts)},${f(h / 2 - tr)} H${f(w - r - tr * 0.2)} A${f(tr)},${f(tr)} 0 0 1 ${f(w - r - tr * 0.2)},${f(h / 2 + tr)} H${f(ts)}`}
      />
    </>
  );
};

const plateHx: R = ({ w, h, style: s }) => {
  const n = Math.max(3, Math.floor(w / 9));
  let plates = '';
  for (let i = 1; i < n; i++) plates += ` M${f((w / n) * i)},${f(h * 0.08)} V${f(h * 0.92)}`;
  return (
    <>
      <B s={s} d={`M0,0 H${w} V${h} H0 Z`} />
      <Detail s={thin(s)} d={plates} />
    </>
  );
};

const hxCircle: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  return (
    <>
      <B s={s} d={circleD(cx, cy, r)} />
      <Line
        s={s}
        d={`M0,${f(cy)} H${f(cx - r * 0.75)} L${f(cx - r * 0.4)},${f(cy - r * 0.45)} L${f(cx)},${f(cy + r * 0.45)} L${f(cx + r * 0.4)},${f(cy - r * 0.45)} L${f(cx + r * 0.75)},${f(cy)} H${w}`}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Instruments & misc
// ---------------------------------------------------------------------------

type Mount = 'field' | 'panel' | 'dcs' | 'plc';
const instrument = (mount: Mount): R => ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const line = <Line s={s} cap="butt" d={`M${f(cx - r)},${f(cy)} H${f(cx + r)}`} />;
  if (mount === 'plc') {
    return (
      <>
        <B s={s} d={`M${f(cx - r)},${f(cy - r)} H${f(cx + r)} V${f(cy + r)} H${f(cx - r)} Z`} />
        <B s={s} d={pathOf([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]])} />
        {line}
      </>
    );
  }
  return (
    <>
      {mount === 'dcs' && <B s={s} d={`M${f(cx - r)},${f(cy - r)} H${f(cx + r)} V${f(cy + r)} H${f(cx - r)} Z`} />}
      <B s={s} d={circleD(cx, cy, mount === 'dcs' ? r * 0.98 : r)} />
      {mount !== 'field' && line}
    </>
  );
};

const filter: R = ({ w, h, style: s }) => (
  <>
    <B s={s} d={pathOf([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])} />
    <Detail s={{ ...thin(s), strokeStyle: 'dashed' }} d={`M${f(w * 0.08)},${f(h / 2)} H${f(w * 0.92)}`} />
  </>
);

const agitator: R = ({ w, h, style: s }) => {
  const cx = w / 2;
  const by = h * 0.86;
  const blade = (dir: 1 | -1) =>
    `M${f(cx)},${f(by)} Q${f(cx + dir * w * 0.2)},${f(by - h * 0.08)} ${f(cx + dir * w * 0.42)},${f(by + h * 0.01)} Q${f(cx + dir * w * 0.2)},${f(by + h * 0.09)} ${f(cx)},${f(by)} Z`;
  return (
    <>
      <B s={s} d={`M${f(w * 0.3)},0 H${f(w * 0.7)} V${f(h * 0.18)} H${f(w * 0.3)} Z`} />
      <Line s={s} d={`M${f(cx)},${f(h * 0.18)} V${f(by)}`} />
      <B s={s} d={`${blade(1)} ${blade(-1)}`} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const P = 'shape=mxgraph.pid.';
const sym = (kind: string, label: string, drawio: string, render: R, extra: Partial<ShapeDef> = {}) =>
  shape(`pid.${kind}`, label, `${P}${drawio};html=1;pointerEvents=1;`, render, { ...ART, ...extra });
/** Equipment that carries its tag inside. */
const tagged = (box: (w: number, h: number) => ReturnType<typeof fracBox>): Partial<ShapeDef> => ({
  boxHit: false,
  textPlacement: 'inside',
  textBox: box,
});

export const shapes: ShapeDef[] = [
  sym('gateValve', 'Gate valve', 'valves.gate_valve', valve('gate')),
  sym('globeValve', 'Globe valve', 'valves.globe_valve', valve('globe')),
  sym('ballValve', 'Ball valve', 'valves.ball_valve', valve('ball')),
  sym('checkValve', 'Check valve', 'valves.check_valve', valve('check')),
  sym('needleValve', 'Needle valve', 'valves.needle_valve', valve('needle')),
  sym('plugValve', 'Plug valve', 'valves.plug_valve', valve('plug')),
  sym('butterflyValve', 'Butterfly valve', 'valves.butterfly_valve', butterfly),
  sym('controlValve', 'Control valve', 'valves.globe_valve;actuator=diaphragm', controlValve),
  sym('threeWayValve', '3-way valve', 'valves.three-way_valve', threeWay),
  sym('reducer', 'Reducer', 'piping.concentric_reducer', reducer),
  sym('centrifugalPump', 'Centrifugal pump', 'pumps.centrifugal_pump_1', centrifugalPump),
  sym('pump', 'Pump (ISO)', 'pumps.pump', isoPump),
  sym('compressor', 'Compressor', 'compressors.centrifugal_compressor', compressor),
  sym('fan', 'Fan / blower', 'compressors.blower', fan),
  sym('vessel', 'Vertical vessel', 'vessels.tank', verticalVessel, tagged((w, h) => fracBox(w, h, 0.08, 0.25, 0.92, 0.75))),
  sym('drum', 'Horizontal drum', 'vessels.drum_or_condenser', horizontalDrum, tagged((w, h) => fracBox(w, h, 0.2, 0.15, 0.8, 0.85))),
  sym('openTank', 'Open tank', 'vessels.tank_(open_top)', openTank, tagged((w, h) => fracBox(w, h, 0.08, 0.38, 0.92, 0.94))),
  sym('column', 'Column / tower', 'vessels.column', column),
  sym('coolingTower', 'Cooling tower', 'misc.cooling_tower', coolingTower),
  sym('shellTube', 'Shell & tube exchanger', 'heat_exchangers.shell_and_tube_heat_exchanger_1', shellTube),
  sym('plateHx', 'Plate exchanger', 'heat_exchangers.plate_heat_exchanger', plateHx),
  sym('heatExchanger', 'Heat exchanger', 'heat_exchangers.heat_exchanger_(straight_tubes)', hxCircle),
  sym('instField', 'Instrument (field)', 'instruments.discrete_instrument;mounting=field', instrument('field'), tagged((w, h) => fracBox(w, h, 0.14, 0.14, 0.86, 0.86))),
  sym('instPanel', 'Instrument (panel)', 'instruments.discrete_instrument;mounting=room', instrument('panel'), tagged((w, h) => fracBox(w, h, 0.14, 0.14, 0.86, 0.86))),
  sym('instDcs', 'Instrument (DCS)', 'instruments.shared_control', instrument('dcs'), tagged((w, h) => fracBox(w, h, 0.14, 0.14, 0.86, 0.86))),
  sym('instPlc', 'Instrument (PLC)', 'instruments.programmable_logic_control', instrument('plc'), tagged((w, h) => fracBox(w, h, 0.22, 0.2, 0.78, 0.8))),
  sym('filter', 'Filter', 'filters.filter', filter),
  sym('agitator', 'Mixer / agitator', 'agitators.agitator_(propeller)', agitator),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const art = { fill: 'none', fontSize: 12 };
const boxed = { fill: '#ffffff', fontSize: 12 };
const tag = { fill: '#ffffff', fontSize: 11, bold: true };

export const libraries: ShapeLibrary[] = [
  {
    id: 'pid',
    name: 'Process Engineering (P&ID)',
    items: [
      item('pid.gateValve', 'Gate valve', 50, 30, { style: boxed, keywords: 'valve pid' }),
      item('pid.globeValve', 'Globe valve', 50, 30, { style: boxed, keywords: 'valve pid' }),
      item('pid.ballValve', 'Ball valve', 50, 30, { style: boxed, keywords: 'valve pid' }),
      item('pid.checkValve', 'Check valve', 50, 30, { style: boxed, keywords: 'valve non-return pid' }),
      item('pid.butterflyValve', 'Butterfly valve', 40, 34, { style: art, keywords: 'valve pid' }),
      item('pid.needleValve', 'Needle valve', 50, 36, { style: boxed, keywords: 'valve pid' }),
      item('pid.plugValve', 'Plug valve', 50, 30, { style: boxed, keywords: 'valve cock pid' }),
      item('pid.controlValve', 'Control valve', 50, 60, { style: boxed, keywords: 'valve actuator diaphragm pid' }),
      item('pid.threeWayValve', '3-way valve', 50, 50, { style: boxed, keywords: 'valve three diverter pid' }),
      item('pid.reducer', 'Reducer', 30, 30, { style: boxed, keywords: 'pipe fitting' }),
      item('pid.centrifugalPump', 'Centrifugal pump', 56, 50, { style: boxed, keywords: 'pump' }),
      item('pid.pump', 'Pump (ISO)', 50, 44, { style: boxed, keywords: 'pump positive displacement' }),
      item('pid.compressor', 'Compressor', 56, 50, { style: boxed }),
      item('pid.fan', 'Fan / blower', 50, 50, { style: boxed, keywords: 'blower ventilator' }),
      item('pid.vessel', 'Vertical vessel', 60, 120, { style: tag, text: 'V-101', keywords: 'tank drum pressure vessel' }),
      item('pid.drum', 'Horizontal drum', 120, 56, { style: tag, text: 'D-101', keywords: 'tank vessel' }),
      item('pid.openTank', 'Open tank', 80, 70, { style: tag, text: 'T-101', keywords: 'basin vessel' }),
      item('pid.column', 'Column / tower', 50, 150, { style: boxed, keywords: 'distillation tower trays' }),
      item('pid.coolingTower', 'Cooling tower', 70, 80, { style: boxed }),
      item('pid.shellTube', 'Shell & tube', 120, 50, { style: boxed, keywords: 'heat exchanger' }),
      item('pid.plateHx', 'Plate exchanger', 50, 70, { style: boxed, keywords: 'heat exchanger' }),
      item('pid.heatExchanger', 'Heat exchanger', 60, 50, { style: boxed, keywords: 'heater cooler' }),
      item('pid.instField', 'Field instrument', 46, 46, { style: tag, text: 'PT\n101', keywords: 'instrument bubble transmitter' }),
      item('pid.instPanel', 'Panel instrument', 46, 46, { style: tag, text: 'PI\n101', keywords: 'instrument bubble control room' }),
      item('pid.instDcs', 'DCS instrument', 46, 46, { style: tag, text: 'FIC\n101', keywords: 'instrument shared display control' }),
      item('pid.instPlc', 'PLC instrument', 46, 46, { style: { ...tag, fontSize: 10 }, text: 'PLC', keywords: 'instrument logic' }),
      item('pid.filter', 'Filter', 40, 50, { style: boxed, keywords: 'strainer' }),
      item('pid.agitator', 'Mixer / agitator', 50, 80, { style: boxed, keywords: 'mixer stirrer' }),
    ],
  },
];
