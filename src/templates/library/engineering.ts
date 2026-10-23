import type { Vec } from '@/model/types';
import { Builder, INK, MUTED, TONES, soft } from '../kit';
import type { Template } from '../types';

const WIRE = { stroke: INK, strokeWidth: 1.75 };

/** A wire through absolute points (first/last are the terminals). */
function wire(b: Builder, pts: Vec[]) {
  b.line(pts[0], pts[pts.length - 1], { ...WIRE, waypoints: pts.slice(1, -1) });
}

function dot(b: Builder, p: Vec) {
  b.shape('ellipse', { x: p.x - 4, y: p.y - 4, w: 8, h: 8 }, { fill: INK, stroke: INK, strokeWidth: 1 });
}

const label = (b: Builder, text: string, x: number, y: number, w = 90, align: 'left' | 'center' | 'right' = 'center') =>
  b.text(text, { x, y, w, h: 34 }, { fontSize: 12, textAlign: align, textColor: INK, fontFamily: 'mono' });

function ledDriver() {
  const b = new Builder();
  b.title('LED driver — transistor switch', 0, 0, 640, 'NPN low-side switch with base and LED current limiting');
  const oy = 40;
  const part = { fill: 'none', stroke: INK, strokeWidth: 1.75 };
  // Supply
  b.shape('elec.dcSource', { x: 40, y: oy + 200, w: 40, h: 70 }, { ...part, fill: '#ffffff' });
  label(b, 'V1\n9 V', -46, oy + 218, 80, 'right');
  // Top rail → R2 → LED → collector
  b.shape('elec.resistor', { x: 170, y: oy + 108, w: 80, h: 24 }, part);
  label(b, 'R2  470 Ω', 165, oy + 72);
  b.shape('elec.led', { x: 300, y: oy + 98, w: 60, h: 44 }, part);
  label(b, 'D1  red LED', 285, oy + 62);
  const q = { x: 400, y: oy + 220, w: 56, h: 60 };
  b.shape('elec.npn', q, part);
  label(b, 'Q1\n2N2222', q.x + q.w + 4, q.y + 12, 80, 'left');
  const col = { x: q.x + q.w * 0.74, y: q.y };
  const base = { x: q.x, y: q.y + q.h / 2 };
  const emit = { x: q.x + q.w * 0.74, y: q.y + q.h };
  // Input: switch + base resistor
  b.shape('elec.switch', { x: 130, y: oy + 235, w: 70, h: 30 }, part);
  label(b, 'S1', 120, oy + 270);
  b.shape('elec.resistor', { x: 250, y: oy + 238, w: 80, h: 24 }, part);
  label(b, 'R1  10 kΩ', 245, oy + 270);
  const gnd = { x: col.x - 18, y: oy + 350, w: 36, h: 30 };
  b.shape('elec.ground', gnd, part);

  wire(b, [{ x: 60, y: oy + 200 }, { x: 60, y: oy + 120 }, { x: 170, y: oy + 120 }]);
  wire(b, [{ x: 250, y: oy + 120 }, { x: 300, y: oy + 120 }]);
  wire(b, [{ x: 360, y: oy + 120 }, { x: col.x, y: oy + 120 }, col]);
  wire(b, [{ x: 100, y: oy + 120 }, { x: 100, y: oy + 250 }, { x: 130, y: oy + 250 }]);
  dot(b, { x: 100, y: oy + 120 });
  wire(b, [{ x: 200, y: oy + 250 }, { x: 250, y: oy + 250 }]);
  wire(b, [{ x: 330, y: oy + 250 }, base]);
  wire(b, [emit, { x: emit.x, y: oy + 350 }]);
  wire(b, [{ x: 60, y: oy + 270 }, { x: 60, y: oy + 330 }, { x: emit.x, y: oy + 330 }]);
  dot(b, { x: emit.x, y: oy + 330 });
  b.shape('uml.note', { x: 560, y: oy + 96, w: 230, h: 120 }, soft(TONES.amber, { fontSize: 12, textAlign: 'left', verticalAlign: 'top' }), 'How it works\nClosing S1 drives ~0.8 mA into the base, saturating Q1. Collector current (≈15 mA) flows through R2 and lights D1.');
  return [b.page('Circuit')];
}

function halfAdder() {
  const b = new Builder();
  b.title('Half adder', 0, 0, 640, 'Logic circuit: S = A ⊕ B, C = A · B');
  const part = { fill: '#ffffff', stroke: INK, strokeWidth: 1.75 };
  const xor = { x: 300, y: 110, w: 80, h: 56 };
  const and = { x: 300, y: 250, w: 80, h: 56 };
  b.shape('elec.xor', xor, part);
  b.shape('elec.and', and, part);
  label(b, 'XOR', xor.x, xor.y - 30, xor.w);
  label(b, 'AND', and.x, and.y - 30, and.w);
  const pin = (g: typeof xor, k: number) => ({ x: g.x, y: g.y + g.h * k });
  const out = (g: typeof xor) => ({ x: g.x + g.w, y: g.y + g.h / 2 });
  const inA = { x: 120, y: pin(xor, 0.3).y };
  const inB = { x: 120, y: pin(xor, 0.7).y };
  b.text('A', { x: 70, y: inA.y - 10, w: 40, h: 20 }, { fontSize: 18, bold: true, textAlign: 'right' });
  b.text('B', { x: 70, y: inB.y - 10, w: 40, h: 20 }, { fontSize: 18, bold: true, textAlign: 'right' });
  wire(b, [inA, pin(xor, 0.3)]);
  wire(b, [inB, pin(xor, 0.7)]);
  wire(b, [{ x: 190, y: inA.y }, { x: 190, y: pin(and, 0.3).y }, pin(and, 0.3)]);
  wire(b, [{ x: 230, y: inB.y }, { x: 230, y: pin(and, 0.7).y }, pin(and, 0.7)]);
  dot(b, { x: 190, y: inA.y });
  dot(b, { x: 230, y: inB.y });
  const so = out(xor);
  const co = out(and);
  wire(b, [so, { x: 500, y: so.y }]);
  wire(b, [co, { x: 500, y: co.y }]);
  b.text('Sum (S)', { x: 510, y: so.y - 14, w: 100, h: 28 }, { fontSize: 16, bold: true, textAlign: 'left' });
  b.text('Carry (C)', { x: 510, y: co.y - 14, w: 100, h: 28 }, { fontSize: 16, bold: true, textAlign: 'left' });
  b.shape(
    'table',
    { x: 660, y: 110, w: 240, h: 196 },
    { fill: '#ffffff', stroke: TONES.indigo.stroke, fontSize: 14, radius: 8, strokeWidth: 1, textAlign: 'center' },
    '',
    { table: { cols: [60, 60, 60, 60], rows: [36, 40, 40, 40, 40], header: true, cells: [['A', 'B', 'S', 'C'], ['0', '0', '0', '0'], ['0', '1', '1', '0'], ['1', '0', '1', '0'], ['1', '1', '0', '1']] } },
  );
  b.text('Truth table', { x: 660, y: 316, w: 240, h: 22 }, { fontSize: 12, textColor: MUTED });
  return [b.page('Half adder')];
}

function pid() {
  const b = new Builder();
  b.title('P&ID — feed preheat section', 0, 0, 900, 'Tank, pump, flow control, heat exchanger and separator');
  const Y = 330;
  const eq = { fill: '#ffffff', stroke: INK, strokeWidth: 1.5, fontSize: 11, bold: true };
  const at = (w: number, h: number, x: number, dy = 0) => ({ x, y: Y - h / 2 + dy, w, h });
  const tank = b.shape('pid.openTank', at(100, 90, 0), eq, 'T-101');
  const v1 = b.shape('pid.gateValve', at(50, 30, 150), eq);
  const pump = b.shape('pid.centrifugalPump', at(60, 54, 240), eq);
  const cv = b.shape('pid.checkValve', at(50, 30, 340), eq);
  const fv = b.shape('pid.controlValve', at(50, 60, 470, -15), eq);
  const hx = b.shape('pid.shellTube', at(130, 54, 590), eq);
  const sep = b.shape('pid.vessel', at(64, 150, 800), eq, 'V-101');
  const v2 = b.shape('pid.globeValve', { x: 807, y: 470, w: 50, h: 30 }, eq);
  const pipe = { stroke: INK, strokeWidth: 2.25, endArrow: 'none' as const, fromSide: 'right' as const, toSide: 'left' as const };
  b.edge(tank, v1, pipe);
  b.edge(v1, pump, pipe);
  b.edge(pump, cv, pipe);
  // The control valve body sits low in its box: pipe to it with free lines at the pipe level.
  b.line({ x: cv.x + cv.w, y: Y }, { x: fv.x, y: Y }, { stroke: INK, strokeWidth: 2.25 });
  b.line({ x: fv.x + fv.w, y: Y }, { x: hx.x, y: Y }, { stroke: INK, strokeWidth: 2.25 });
  b.edge(hx, sep, { ...pipe, endArrow: 'triangle' });
  b.edge(sep, v2, { ...pipe, fromSide: 'bottom', toSide: 'top' });
  b.line({ x: 857, y: 485 }, { x: 960, y: 485 }, { stroke: INK, strokeWidth: 2.25, endArrow: 'triangle' });
  b.text('To storage', { x: 966, y: 472, w: 90, h: 26 }, { fontSize: 12, textAlign: 'left', textColor: MUTED });
  b.line({ x: 870, y: Y - 75 }, { x: 870, y: Y - 140 }, { stroke: INK, strokeWidth: 2.25, waypoints: [], endArrow: 'triangle' });
  b.text('Vapour to flare', { x: 880, y: Y - 150, w: 120, h: 24 }, { fontSize: 12, textAlign: 'left', textColor: MUTED });
  // Cooling / heating medium
  b.line({ x: 610, y: Y + 110 }, { x: 610, y: Y + 27 }, { stroke: TONES.blue.stroke, strokeWidth: 2, endArrow: 'triangle' });
  b.line({ x: 700, y: Y + 27 }, { x: 700, y: Y + 110 }, { stroke: TONES.blue.stroke, strokeWidth: 2, endArrow: 'triangle' });
  b.text('Steam in', { x: 560, y: Y + 112, w: 100, h: 22 }, { fontSize: 12, textColor: TONES.blue.stroke });
  b.text('Condensate', { x: 650, y: Y + 112, w: 100, h: 22 }, { fontSize: 12, textColor: TONES.blue.stroke });
  // Instruments
  const inst = { fill: '#ffffff', stroke: INK, strokeWidth: 1.25, fontSize: 10, bold: true };
  const lt = b.shape('pid.instField', { x: 27, y: 150, w: 46, h: 46 }, inst, 'LT\n101');
  const ft = b.shape('pid.instField', { x: 392, y: 150, w: 46, h: 46 }, inst, 'FT\n102');
  const fic = b.shape('pid.instDcs', { x: 472, y: 150, w: 46, h: 46 }, inst, 'FIC\n102');
  b.shape('pid.instField', { x: 632, y: 150, w: 46, h: 46 }, inst, 'TT\n103');
  const pi = b.shape('pid.instPanel', { x: 730, y: 150, w: 46, h: 46 }, inst, 'PI\n104');
  const sig = { dashed: true, stroke: '#475569', strokeWidth: 1.25, endArrow: 'none' as const };
  b.edge(tank, lt, { ...sig, fromSide: 'top', toSide: 'bottom' });
  b.line({ x: 415, y: Y }, { x: 415, y: 196 }, sig);
  dot(b, { x: 415, y: Y });
  b.edge(ft, fic, { ...sig, fromSide: 'right', toSide: 'left' });
  b.edge(fic, fv, { ...sig, fromSide: 'bottom', toSide: 'top', endArrow: 'triangle' });
  b.line({ x: 655, y: Y - 27 }, { x: 655, y: 196 }, sig);
  b.edge(sep, pi, { ...sig, fromSide: 'left', toSide: 'bottom' });
  // Equipment tags
  const tag = (t: string, x: number) => b.text(t, { x, y: Y + 54, w: 110, h: 34 }, { fontSize: 11, textColor: MUTED });
  tag('V-1\ngate valve', 120);
  tag('P-101\nfeed pump', 215);
  tag('FV-102\nflow control', 440);
  b.text('E-101\npreheater', { x: 615, y: Y + 34, w: 80, h: 34 }, { fontSize: 11, textColor: MUTED });
  return [b.page('P&ID')];
}

export const ENGINEERING_TEMPLATES: Template[] = [
  {
    id: 'circuit-led-driver',
    name: 'Electrical circuit',
    category: 'Engineering',
    description: 'Schematic of an NPN transistor switching an LED, with resistors, switch, supply and ground.',
    keywords: ['electrical', 'circuit', 'schematic', 'transistor', 'led', 'electronics', 'resistor'],
    build: ledDriver,
  },
  {
    id: 'logic-half-adder',
    name: 'Logic gates: half adder',
    category: 'Engineering',
    description: 'XOR and AND gates wired as a half adder, with its truth table.',
    keywords: ['logic', 'gates', 'digital', 'half adder', 'xor', 'and', 'truth table', 'electronics'],
    build: halfAdder,
  },
  {
    id: 'pid-preheat',
    name: 'P&ID process section',
    category: 'Engineering',
    description: 'Piping and instrumentation diagram: tank, pump, valves, exchanger, separator and control loops.',
    keywords: ['p&id', 'pid', 'piping', 'instrumentation', 'process', 'chemical', 'plant', 'valve', 'pump'],
    build: pid,
  },
];
