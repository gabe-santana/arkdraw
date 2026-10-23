/**
 * SysML: blocks & requirements (stereotyped compartments), ports and
 * activity-diagram nodes. Generic pieces (actor, package, note, frame,
 * initial/final) reuse the UML kinds.
 */
import type { ElementStyle } from '@/model/types';
import { lineHeight } from '@/lib/text';
import { Body, Detail, PAD, RoundRect, compartmentLayout, inset, rr, topRounded } from '../kit';
import { TextLines } from '../TextLines';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Line, Oval, Tint, item, pathOf, shape, solid } from './_kit2';

// ---------------------------------------------------------------------------
// Stereotyped compartment shapes («block», «requirement», ...)
// ---------------------------------------------------------------------------

function stereotyped(stereo: string) {
  return function Stereotyped({ w, h, style, text }: ShapeRenderContext) {
    const L = compartmentLayout(w, style, text);
    const sStyle: ElementStyle = { ...style, fontSize: Math.max(9, style.fontSize - 2), bold: false, italic: false };
    const sh = lineHeight(sStyle.fontSize);
    const headerH = Math.max(sh + L.lh * Math.max(L.header.length, 1) + PAD * 2, 40);
    const r = rr(w, h, style.radius);
    let y = headerH;
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        {style.stroke !== 'none' && <Tint d={topRounded(w, Math.min(headerH, h), r)} s={style} k={0.07} />}
        <TextLines lines={[`«${stereo}»`]} x={w / 2} y={PAD} anchor="middle" style={sStyle} />
        <TextLines lines={L.header} x={w / 2} y={PAD + sh} anchor="middle" style={style} bold />
        {L.body.map((lines, i) => {
          const top = y;
          y += L.heights[i];
          if (top >= h) return null;
          return (
            <g key={i}>
              <Detail d={`M0,${top} H${w}`} s={{ ...style, strokeStyle: 'solid' }} />
              <TextLines lines={lines} x={PAD + 2} y={top + PAD} anchor="start" style={style} />
            </g>
          );
        })}
        {/* Thumbnails carry no text: hint at the compartments anyway. */}
        {!text && <Detail d={`M0,${Math.min(headerH, h * 0.4)} H${w} M0,${h * 0.7} H${w}`} s={{ ...style, strokeStyle: 'solid' }} />}
      </>
    );
  };
}

const compartmentDrawio = (stereo: string) =>
  `swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=40;html=1;whiteSpace=wrap;stereotype=${stereo};`;

const STEREO: Array<[string, string, string]> = [
  ['block', 'Block', 'block'],
  ['interfaceBlock', 'Interface block', 'interfaceBlock'],
  ['constraintBlock', 'Constraint block', 'constraint'],
  ['valueType', 'Value type', 'valueType'],
  ['requirement', 'Requirement', 'requirement'],
  ['testCase', 'Test case', 'testCase'],
];

// ---------------------------------------------------------------------------
// Ports & activity nodes
// ---------------------------------------------------------------------------

const arrowD = (w: number, h: number, dir: 1 | -1) => {
  const [a, b] = dir > 0 ? [0.2, 0.8] : [0.8, 0.2];
  const head = dir > 0 ? 0.55 : 0.45;
  return `M${w * a},${h / 2} H${w * b} M${w * head},${h * 0.28} L${w * b},${h / 2} L${w * head},${h * 0.72}`;
};

function port(dir: 0 | 1 | -1) {
  return function Port({ w, h, style }: ShapeRenderContext) {
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={0} />
        {dir !== 0 && <Line s={style} k={0.8} d={arrowD(w, h, dir)} />}
      </>
    );
  };
}

const portBoth = ({ w, h, style }: ShapeRenderContext) => (
  <>
    <RoundRect w={w} h={h} s={style} r={0} />
    <Line
      s={style}
      k={0.8}
      d={`M${w * 0.2},${h / 2} H${w * 0.8} M${w * 0.4},${h * 0.3} L${w * 0.2},${h / 2} L${w * 0.4},${h * 0.7} M${w * 0.6},${h * 0.3} L${w * 0.8},${h / 2} L${w * 0.6},${h * 0.7}`}
    />
  </>
);

const actionR = (w: number, h: number) => Math.min(14, h * 0.3, w * 0.2);
const notch = (w: number, h: number) => Math.min(h * 0.35, w * 0.2);

export const shapes: ShapeDef[] = [
  ...STEREO.map(([k, label, stereo]) =>
    shape(`sysml.${k}`, label, compartmentDrawio(stereo), stereotyped(stereo), { rounded: true, textPlacement: 'custom' }),
  ),
  shape('sysml.port', 'Port', 'shape=mxgraph.sysml.port1;html=1;', port(0), { textPlacement: 'below', boxHit: true }),
  shape('sysml.flowPortRight', 'Flow port (right)', 'shape=mxgraph.sysml.port3;html=1;', port(1), { textPlacement: 'below', boxHit: true }),
  shape('sysml.flowPortLeft', 'Flow port (left)', 'shape=mxgraph.sysml.port3;direction=west;html=1;', port(-1), { textPlacement: 'below', boxHit: true }),
  shape('sysml.flowPortInOut', 'Flow port (in/out)', 'shape=mxgraph.sysml.port2;html=1;', portBoth, { textPlacement: 'below', boxHit: true }),
  shape(
    'sysml.callBehavior',
    'Call behavior action',
    'shape=mxgraph.sysml.callBehAct;html=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const z = Math.min(12, h * 0.25, w * 0.15);
      const x0 = w - 10 - z;
      const y0 = h - 8 - z;
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={actionR(w, h)} />
          <Line s={style} k={0.8} d={`M${x0 + z / 2},${y0} V${y0 + z} M${x0},${y0 + z} V${y0 + z / 2} H${x0 + z} V${y0 + z}`} />
        </>
      );
    },
    { textBox: (w, h) => inset(w, h, 10, 6) },
  ),
  shape(
    'sysml.acceptEvent',
    'Accept event action',
    'shape=mxgraph.sysml.accEvent;flipH=1;html=1;whiteSpace=wrap;',
    ({ w, h, style }) => <Body s={style} d={pathOf([[0, 0], [w, 0], [w, h], [0, h], [notch(w, h), h / 2]])} />,
    { textBox: (w, h) => ({ x: notch(w, h) + 4, y: 4, w: Math.max(1, w - notch(w, h) - 10), h: Math.max(1, h - 8) }) },
  ),
  shape(
    'sysml.sendSignal',
    'Send signal action',
    'shape=mxgraph.sysml.sendSigAct;html=1;whiteSpace=wrap;',
    ({ w, h, style }) => {
      const n = notch(w, h);
      return <Body s={style} d={pathOf([[0, 0], [w - n, 0], [w, h / 2], [w - n, h], [0, h]])} />;
    },
    { textBox: (w, h) => ({ x: 6, y: 4, w: Math.max(1, w - notch(w, h) - 10), h: Math.max(1, h - 8) }) },
  ),
  shape(
    'sysml.forkBar',
    'Fork / join',
    'shape=line;strokeWidth=6;html=1;',
    ({ w, h, style }) => <rect width={w} height={h} rx={Math.min(2, h / 2)} fill={solid(style).stroke} />,
    { boxHit: true, textPlacement: 'below' },
  ),
  shape(
    'sysml.flowFinal',
    'Flow final',
    'shape=mxgraph.sysml.flowFinal;html=1;',
    ({ w, h, style }) => {
      const k = Math.SQRT1_2;
      const [cx, cy, rx, ry] = [w / 2, h / 2, w / 2, h / 2];
      return (
        <>
          <Oval cx={cx} cy={cy} rx={rx} ry={ry} s={solid(style)} />
          <Line s={style} d={`M${cx - rx * k},${cy - ry * k} L${cx + rx * k},${cy + ry * k} M${cx + rx * k},${cy - ry * k} L${cx - rx * k},${cy + ry * k}`} />
        </>
      );
    },
    { perimeter: 'ellipse', textPlacement: 'below' },
  ),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const comp: Partial<ElementStyle> = { radius: 4, fontSize: 13, textAlign: 'left', verticalAlign: 'top' };
const black: Partial<ElementStyle> = { fill: '#1e293b', stroke: '#1e293b' };

export const libraries: ShapeLibrary[] = [
  {
    id: 'sysml',
    name: 'SysML',
    items: [
      item('sysml.block', 'Block', 200, 140, {
        text: 'Vehicle\n--\nparts\n  engine: Engine\n  wheels: Wheel[4]\n--\nvalues\n  mass: kg',
        style: comp,
        keywords: 'sysml bdd block definition',
      }),
      item('sysml.interfaceBlock', 'Interface block', 200, 110, {
        text: 'FuelInterface\n--\nflow properties\n  in fuel: Fuel',
        style: comp,
        keywords: 'sysml interface block',
      }),
      item('sysml.constraintBlock', 'Constraint block', 200, 150, {
        text: 'Newton\n--\nconstraints\n  {F = m * a}\n--\nparameters\n  F: N\n  m: kg',
        style: comp,
        keywords: 'sysml parametric constraint',
      }),
      item('sysml.valueType', 'Value type', 170, 90, { text: 'Speed\n--\nunit = m/s', style: comp, keywords: 'sysml value type unit' }),
      item('sysml.requirement', 'Requirement', 220, 120, {
        text: 'MaxSpeed\n--\nid = "REQ-001"\ntext = "The vehicle shall reach 200 km/h."',
        style: { ...comp, fill: '#f8fafc' },
        keywords: 'sysml requirement req',
      }),
      item('sysml.testCase', 'Test case', 200, 90, { text: 'SpeedTest\n--\nverifies REQ-001', style: comp, keywords: 'sysml test case verify' }),
      item('rectangle', 'Part property', 150, 60, { text: 'engine: Engine', style: { radius: 0 }, keywords: 'sysml ibd part' }),
      item('rectangle', 'Reference property', 150, 60, {
        text: 'driver: Person',
        style: { radius: 0, strokeStyle: 'dashed' },
        keywords: 'sysml ibd reference',
      }),
      item('sysml.port', 'Port', 20, 20, { keywords: 'sysml ibd port proxy full' }),
      item('sysml.flowPortRight', 'Flow port (right)', 22, 22, { keywords: 'sysml flow port in out proxy direction' }),
      item('sysml.flowPortLeft', 'Flow port (left)', 22, 22, { keywords: 'sysml flow port in out proxy direction' }),
      item('sysml.flowPortInOut', 'Flow port (in/out)', 22, 22, { keywords: 'sysml flow port inout bidirectional' }),
      item('rectangle', 'Action', 140, 60, { text: 'Action', style: { radius: 14 }, keywords: 'sysml activity action' }),
      item('sysml.callBehavior', 'Call behavior action', 150, 64, { text: 'Drive', keywords: 'sysml activity call behavior rake' }),
      item('sysml.acceptEvent', 'Accept event action', 150, 60, { text: 'Signal received', keywords: 'sysml activity accept event' }),
      item('sysml.sendSignal', 'Send signal action', 150, 60, { text: 'Send signal', keywords: 'sysml activity send signal' }),
      item('uml.initial', 'Initial node', 26, 26, { keywords: 'sysml activity start' }),
      item('uml.final', 'Activity final', 28, 28, { keywords: 'sysml activity end' }),
      item('sysml.flowFinal', 'Flow final', 28, 28, { keywords: 'sysml activity flow end' }),
      item('diamond', 'Decision / merge', 44, 44, { keywords: 'sysml activity decision merge' }),
      item('sysml.forkBar', 'Fork / join', 120, 8, { style: black, keywords: 'sysml activity fork join bar' }),
      item('rectangle', 'State', 140, 60, { text: 'State', style: { radius: 18 }, keywords: 'sysml stm state machine' }),
      item('uml.actor', 'Actor', 40, 76, { text: 'Actor', keywords: 'sysml use case actor' }),
      item('ellipse', 'Use case', 150, 70, { text: 'Use case', keywords: 'sysml uc use case' }),
      item('uml.package', 'Package', 180, 120, { text: 'Package', style: { bold: true }, keywords: 'sysml pkg package' }),
      item('uml.frame', 'Diagram frame', 360, 220, {
        text: 'bdd Model',
        style: { fill: 'none', bold: true, fontSize: 12, textAlign: 'left' },
        keywords: 'sysml frame diagram header bdd ibd act',
      }),
      item('uml.note', 'Comment', 150, 80, {
        text: 'Comment',
        style: { fill: '#fefce8', stroke: '#a16207', textAlign: 'left', verticalAlign: 'top' },
        keywords: 'sysml comment note rationale',
      }),
    ],
  },
];
