/**
 * Electrical schematic symbols (mxGraph "Electrical" library parity).
 *
 * Line-art: every two-terminal part has its leads reaching the left/right
 * edges at mid-height (sources & ground: top/bottom centre), so connectors
 * attach right at the terminals.
 */
import type { ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import { Body } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Ink, Label, Line, circleD, f, item, pathOf, shape, solid, waveD, zigzagD, type Pt } from './_kit2';

type R = (ctx: ShapeRenderContext) => ReactNode;

const ART = { boxHit: true, textPlacement: 'below' as const };

/** Closed body: solid ink outline, the style's fill. */
const B = ({ d, s }: { d: string; s: ElementStyle }) => <Body d={d} s={solid(s)} />;
/** Small hollow terminal / contact dot. */
const Dot = ({ x, y, r, s }: { x: number; y: number; r: number; s: ElementStyle }) => (
  <Body d={circleD(x, y, r)} s={{ ...solid(s), fill: '#ffffff' }} />
);

/** Triangle arrowhead with its tip at `tip`, pointing away from `from`. */
function head(tip: Pt, from: Pt, size: number) {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const px = -uy * size * 0.45;
  const py = ux * size * 0.45;
  return pathOf([tip, [bx + px, by + py], [bx - px, by - py]]);
}
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** "+" sign path centred at (x, y). */
const plus = (x: number, y: number, k: number) => `M${f(x - k)},${f(y)} H${f(x + k)} M${f(x)},${f(y - k)} V${f(y + k)}`;
const minus = (x: number, y: number, k: number) => `M${f(x - k)},${f(y)} H${f(x + k)}`;

// ---------------------------------------------------------------------------
// Passive parts
// ---------------------------------------------------------------------------

const resistorUS: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const a = w * 0.2;
  const b = w * 0.8;
  return <Line s={s} d={`M0,${cy} H${a} ${zigzagD(a, b, cy, h * 0.4, 3)} M${b},${cy} H${w}`} />;
};

const resistorIEC: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const a = w * 0.22;
  const b = w * 0.78;
  const t = h * 0.33;
  return (
    <>
      <Line s={s} d={`M0,${cy} H${a} M${b},${cy} H${w}`} />
      <B s={s} d={`M${a},${cy - t} H${b} V${cy + t} H${a} Z`} />
    </>
  );
};

const potentiometer: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const a = w * 0.2;
  const b = w * 0.8;
  const p0: Pt = [w * 0.3, h * 0.96];
  const p1: Pt = [w * 0.7, h * 0.04];
  const hs = Math.min(9, h * 0.26);
  return (
    <>
      <Line s={s} d={`M0,${cy} H${a} ${zigzagD(a, b, cy, h * 0.2, 3)} M${b},${cy} H${w}`} />
      <Line s={s} d={`M${p0[0]},${p0[1]} L${f(lerp(p0, p1, 0.9)[0])},${f(lerp(p0, p1, 0.9)[1])}`} />
      <Ink s={s} d={head(p1, p0, hs)} />
    </>
  );
};

const capacitor = (polar: boolean): R => ({ w, h, style: s }) => {
  const cy = h / 2;
  const g = Math.max(3, w * 0.06);
  const x1 = w / 2 - g;
  const x2 = w / 2 + g;
  const t0 = h * 0.1;
  const t1 = h * 0.9;
  if (!polar) {
    return (
      <>
        <Line s={s} d={`M0,${cy} H${x1} M${x2},${cy} H${w}`} />
        <Line s={s} k={1.35} cap="butt" d={`M${x1},${t0} V${t1} M${x2},${t0} V${t1}`} />
      </>
    );
  }
  const c = g * 0.9;
  return (
    <>
      <Line s={s} d={`M0,${cy} H${x1} M${f(x2 + c * 0.1)},${cy} H${w}`} />
      <Line s={s} k={1.35} cap="butt" d={`M${x1},${t0} V${t1}`} />
      <Line s={s} k={1.35} d={`M${f(x2 + c)},${t0} Q${f(x2 - c * 0.8)},${cy} ${f(x2 + c)},${t1}`} />
      <Line s={s} k={0.8} d={plus(x1 - g * 2.2, h * 0.2, Math.min(g * 0.9, h * 0.1))} />
    </>
  );
};

const inductor: R = ({ w, h, style: s }) => {
  const cy = h * 0.62;
  const a = w * 0.14;
  const b = w * 0.86;
  const n = 4;
  const d = (b - a) / n;
  const r = d / 2;
  let p = `M0,${f(h / 2)} H${f(a * 0.5)} Q${f(a)},${f(h / 2)} ${f(a)},${f(cy)}`;
  for (let i = 0; i < n; i++) p += ` A${f(r)},${f(Math.min(r, h * 0.5))} 0 0 1 ${f(a + d * (i + 1))},${f(cy)}`;
  p += ` Q${f(b)},${f(h / 2)} ${f(b + a * 0.5)},${f(h / 2)} H${w}`;
  return <Line s={s} d={p} />;
};

// ---------------------------------------------------------------------------
// Semiconductors
// ---------------------------------------------------------------------------

type DiodeBar = 'plain' | 'zener' | 'schottky';
function diodeGeom(w: number, h: number, t: number) {
  const cy = h / 2;
  const a = w / 2 - t * 0.9;
  const b = w / 2 + t * 0.9;
  return { cy, a, b };
}
const diode = (bar: DiodeBar, led = false): R => ({ w, h, style: s }) => {
  const t = led ? Math.min(h * 0.26, w * 0.2) : Math.min(h * 0.42, w * 0.2);
  const { cy, a, b } = diodeGeom(w, h, t);
  const k = t * 0.4;
  const barD =
    bar === 'zener'
      ? `M${f(b - k)},${f(cy - t - k * 0.6)} L${f(b)},${f(cy - t)} V${f(cy + t)} L${f(b + k)},${f(cy + t + k * 0.6)}`
      : bar === 'schottky'
        ? `M${f(b - k)},${f(cy - t + k)} V${f(cy - t)} H${f(b)} V${f(cy + t)} H${f(b + k)} V${f(cy + t - k)}`
        : `M${f(b)},${f(cy - t)} V${f(cy + t)}`;
  const arrows = led
    ? [0, 1].map((i) => {
        const x = w / 2 - t * 0.1 + i * t * 0.75;
        const p0: Pt = [x, cy - t - h * 0.04];
        const p1: Pt = [x + t * 0.75, Math.max(h * 0.03, cy - t - t * 1.25)];
        return { p0, p1 };
      })
    : [];
  const hs = Math.max(3, t * 0.42);
  return (
    <>
      <Line s={s} d={`M0,${cy} H${f(a)} M${f(b)},${cy} H${w}`} />
      <B s={s} d={`M${f(a)},${f(cy - t)} L${f(b)},${cy} L${f(a)},${f(cy + t)} Z`} />
      <Line s={s} d={barD} />
      {arrows.map(({ p0, p1 }, i) => (
        <g key={i}>
          <Line s={s} k={0.8} d={`M${f(p0[0])},${f(p0[1])} L${f(lerp(p0, p1, 0.75)[0])},${f(lerp(p0, p1, 0.75)[1])}`} />
          <Ink s={s} d={head(p1, p0, hs)} />
        </g>
      ))}
    </>
  );
};

const bjt = (pnp: boolean): R => ({ w, h, style: s }) => {
  const cy = h / 2;
  const bx = w * 0.42;
  const ex = w * 0.74;
  const r = Math.min(w * 0.4, h * 0.4);
  const cx = w * 0.57;
  const c0: Pt = [bx, cy - h * 0.09];
  const c1: Pt = [ex, cy - h * 0.25];
  const e0: Pt = [bx, cy + h * 0.09];
  const e1: Pt = [ex, cy + h * 0.25];
  const hs = Math.min(w, h) * 0.13;
  const arrow = pnp ? head(lerp(e1, e0, 0.62), e1, hs) : head(lerp(e0, e1, 0.92), e0, hs);
  return (
    <>
      <B s={s} d={circleD(cx, cy, r)} />
      <Line
        s={s}
        d={`M0,${cy} H${bx} M${f(c0[0])},${f(c0[1])} L${f(c1[0])},${f(c1[1])} V0 M${f(e0[0])},${f(e0[1])} L${f(e1[0])},${f(e1[1])} V${h}`}
      />
      <Line s={s} k={1.6} cap="butt" d={`M${bx},${f(cy - h * 0.2)} V${f(cy + h * 0.2)}`} />
      <Ink s={s} d={arrow} />
    </>
  );
};

const mosfet = (p: boolean): R => ({ w, h, style: s }) => {
  const cy = h / 2;
  const gx = w * 0.32;
  const chx = w * 0.42;
  const ex = w * 0.74;
  const r = Math.min(w * 0.4, h * 0.4);
  const cx = w * 0.56;
  const dy = h * 0.18;
  const seg = (y0: number, y1: number) => `M${chx},${f(cy + y0 * h)} V${f(cy + y1 * h)}`;
  const hs = Math.min(w, h) * 0.12;
  const arrow = p ? head([chx + (ex - chx) * 0.78, cy], [chx, cy], hs) : head([chx + 1, cy], [ex, cy], hs);
  return (
    <>
      <B s={s} d={circleD(cx, cy, r)} />
      <Line
        s={s}
        d={`M0,${cy} H${gx} M${gx},${f(cy - h * 0.2)} V${f(cy + h * 0.2)} M${chx},${f(cy - dy)} H${ex} V0 M${chx},${f(cy + dy)} H${ex} V${h} M${chx},${cy} H${ex} V${f(cy + dy)}`}
      />
      <Line s={s} k={1.5} cap="butt" d={`${seg(-0.25, -0.11)} ${seg(-0.06, 0.06)} ${seg(0.11, 0.25)}`} />
      <Ink s={s} d={arrow} />
    </>
  );
};

const opamp: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const x0 = w * 0.16;
  const x1 = w * 0.84;
  const y1 = h * 0.28;
  const y2 = h * 0.72;
  const k = Math.min(w, h) * 0.07;
  return (
    <>
      <Line s={s} d={`M0,${f(y1)} H${x0} M0,${f(y2)} H${x0} M${x1},${cy} H${w}`} />
      <B s={s} d={`M${x0},0 L${x1},${cy} L${x0},${h} Z`} />
      <Line s={s} k={0.85} d={`${minus(x0 + k * 2, y1, k)} ${plus(x0 + k * 2, y2, k)}`} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Sources, ground, power
// ---------------------------------------------------------------------------

const ground = (chassis: boolean): R => ({ w, h, style: s }) => {
  const y = h * 0.45;
  if (chassis) {
    const legs = [0.15, 0.5, 0.85].map((k) => `M${f(w * k)},${f(y)} L${f(w * k - w * 0.15)},${f(h * 0.95)}`).join(' ');
    return <Line s={s} d={`M${w / 2},0 V${f(y)} M${f(w * 0.1)},${f(y)} H${f(w * 0.9)} ${legs}`} />;
  }
  return (
    <Line
      s={s}
      d={`M${w / 2},0 V${f(y)} M${f(w * 0.08)},${f(y)} H${f(w * 0.92)} M${f(w * 0.26)},${f(h * 0.7)} H${f(w * 0.74)} M${f(w * 0.42)},${f(h * 0.95)} H${f(w * 0.58)}`}
    />
  );
};

const battery: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const xs = [0.36, 0.44, 0.56, 0.64].map((k) => w * k);
  const long = (x: number) => `M${f(x)},${f(h * 0.1)} V${f(h * 0.9)}`;
  const short = (x: number) => `M${f(x)},${f(h * 0.3)} V${f(h * 0.7)}`;
  return (
    <>
      <Line s={s} d={`M0,${cy} H${f(xs[0])} M${f(xs[1])},${cy} H${f(xs[2])} M${f(xs[3])},${cy} H${w}`} />
      <Line s={s} cap="butt" d={`${long(xs[0])} ${long(xs[2])}`} />
      <Line s={s} k={2.2} cap="butt" d={`${short(xs[1])} ${short(xs[3])}`} />
      <Line s={s} k={0.8} d={plus(w * 0.24, h * 0.2, Math.min(w * 0.05, h * 0.1))} />
    </>
  );
};

type Src = 'dc' | 'current' | 'ac';
const source = (kind: Src): R => ({ w, h, style: s }) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w * 0.46, h * 0.32);
  const k = r * 0.22;
  let inner: ReactNode = null;
  if (kind === 'dc') inner = <Line s={s} d={`${plus(cx, cy - r * 0.45, k)} ${minus(cx, cy + r * 0.45, k)}`} />;
  else if (kind === 'ac') inner = <Line s={s} d={waveD(cx - r * 0.55, cx + r * 0.55, cy, r * 0.22, 2)} />;
  else {
    const p0: Pt = [cx, cy + r * 0.6];
    const p1: Pt = [cx, cy - r * 0.62];
    inner = (
      <>
        <Line s={s} d={`M${cx},${f(p0[1])} V${f(cy - r * 0.2)}`} />
        <Ink s={s} d={head(p1, p0, r * 0.45)} />
      </>
    );
  }
  return (
    <>
      <Line s={s} d={`M${cx},0 V${f(cy - r)} M${cx},${f(cy + r)} V${h}`} />
      <B s={s} d={circleD(cx, cy, r)} />
      {inner}
    </>
  );
};

// ---------------------------------------------------------------------------
// Switches & electromechanical
// ---------------------------------------------------------------------------

const spst: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const x0 = w * 0.24;
  const x1 = w * 0.76;
  const rd = Math.min(3, h * 0.1, w * 0.05);
  return (
    <>
      <Line s={s} d={`M0,${f(cy)} H${f(x0)} M${f(x1)},${f(cy)} H${w}`} />
      <Line s={s} d={`M${f(x0)},${f(cy)} L${f(x1 - w * 0.02)},${f(h * 0.04)}`} />
      <Dot s={s} x={x0} y={cy} r={rd} />
      <Dot s={s} x={x1} y={cy} r={rd} />
    </>
  );
};

const pushButton: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const x0 = w * 0.24;
  const x1 = w * 0.76;
  const rd = Math.min(3, h * 0.09, w * 0.05);
  const by = h * 0.26;
  return (
    <>
      <Line s={s} d={`M0,${f(cy)} H${f(x0)} M${f(x1)},${f(cy)} H${w}`} />
      <Line s={s} d={`M${f(x0 - rd)},${f(by)} H${f(x1 + rd)} M${w / 2},${f(by)} V${f(h * 0.03)} M${f(w * 0.4)},${f(h * 0.03)} H${f(w * 0.6)}`} />
      <Dot s={s} x={x0} y={cy} r={rd} />
      <Dot s={s} x={x1} y={cy} r={rd} />
    </>
  );
};

const fuse: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const a = w * 0.24;
  const b = w * 0.76;
  const t = h * 0.33;
  return (
    <>
      <B s={s} d={`M${a},${cy - t} H${b} V${cy + t} H${a} Z`} />
      <Line s={s} d={`M0,${cy} H${w}`} />
    </>
  );
};

const lamp: R = ({ w, h, style: s }) => {
  const cy = h / 2;
  const cx = w / 2;
  const r = Math.min(w * 0.3, h * 0.44);
  const k = r * 0.707;
  return (
    <>
      <Line s={s} d={`M0,${cy} H${f(cx - r)} M${f(cx + r)},${cy} H${w}`} />
      <B s={s} d={circleD(cx, cy, r)} />
      <Line s={s} d={`M${f(cx - k)},${f(cy - k)} L${f(cx + k)},${f(cy + k)} M${f(cx + k)},${f(cy - k)} L${f(cx - k)},${f(cy + k)}`} />
    </>
  );
};

/** Circle with a letter: motor (M), generator (G), meters (V, A). */
const lettered = (letter: string): R => ({ w, h, style: s }) => {
  const cy = h / 2;
  const cx = w / 2;
  const r = Math.min(w * 0.34, h * 0.46);
  return (
    <>
      <Line s={s} d={`M0,${cy} H${f(cx - r)} M${f(cx + r)},${cy} H${w}`} />
      <B s={s} d={circleD(cx, cy, r)} />
      <Label x={cx} y={cy} text={letter} s={s} size={r * 0.95} bold color={solid(s).stroke} />
    </>
  );
};

const relay: R = ({ w, h, style: s }) => {
  const cx = w * 0.26;
  const bx0 = w * 0.1;
  const bx1 = w * 0.42;
  const sx = w * 0.78;
  const rd = Math.min(2.5, w * 0.04);
  const tip: Pt = [w * 0.62, h * 0.3];
  const base: Pt = [sx, h * 0.68];
  const mid = lerp(base, tip, 0.5);
  return (
    <>
      <Line s={s} d={`M${f(cx)},0 V${f(h * 0.25)} M${f(cx)},${f(h * 0.75)} V${h} M${f(sx)},0 V${f(h * 0.3)} M${f(sx)},${f(base[1])} V${h}`} />
      <B s={s} d={`M${f(bx0)},${f(h * 0.25)} H${f(bx1)} V${f(h * 0.75)} H${f(bx0)} Z`} />
      <Line s={s} d={`M${f(bx0)},${f(h * 0.75)} L${f(bx1)},${f(h * 0.25)}`} k={0.75} />
      <Line s={s} d={`M${f(base[0])},${f(base[1])} L${f(tip[0])},${f(tip[1])}`} />
      <path d={`M${f(bx1)},${f(h / 2)} H${f(mid[0])}`} fill="none" stroke={solid(s).stroke} strokeWidth={solid(s, 0.75).strokeWidth} strokeDasharray="3 2.5" />
      <Dot s={s} x={sx} y={h * 0.3} r={rd} />
      <Dot s={s} x={sx} y={base[1]} r={rd} />
    </>
  );
};

/** Vertical coil of `n` humps from y0..y1 at x, bulging right (dir 1) or left (-1). */
function vcoil(x: number, y0: number, y1: number, n: number, dir: 1 | -1) {
  const d = (y1 - y0) / n;
  let p = `M${f(x)},${f(y0)}`;
  for (let i = 0; i < n; i++) p += ` A${f(d / 2)},${f(d / 2)} 0 0 ${dir === 1 ? 1 : 0} ${f(x)},${f(y0 + d * (i + 1))}`;
  return p;
}

const transformer: R = ({ w, h, style: s }) => {
  const y0 = h * 0.18;
  const y1 = h * 0.82;
  const lx = w * 0.3;
  const rx = w * 0.7;
  return (
    <>
      <Line s={s} d={`M0,${f(y0)} H${f(lx)} M0,${f(y1)} H${f(lx)} M${f(rx)},${f(y0)} H${w} M${f(rx)},${f(y1)} H${w}`} />
      <Line s={s} d={`${vcoil(lx, y0, y1, 4, 1)} ${vcoil(rx, y0, y1, 4, -1)}`} />
      <Line s={s} cap="butt" d={`M${f(w * 0.47)},${f(y0)} V${f(y1)} M${f(w * 0.53)},${f(y0)} V${f(y1)}`} />
    </>
  );
};

const speaker: R = ({ w, h, style: s }) => {
  const x0 = w * 0.3;
  const x1 = w * 0.48;
  const x2 = w * 0.82;
  return (
    <>
      <Line s={s} d={`M0,${f(h * 0.42)} H${f(x0)} M0,${f(h * 0.58)} H${f(x0)}`} />
      <B s={s} d={`M${f(x0)},${f(h * 0.32)} H${f(x1)} V${f(h * 0.68)} H${f(x0)} Z`} />
      <B s={s} d={`M${f(x1)},${f(h * 0.32)} L${f(x2)},${f(h * 0.06)} V${f(h * 0.94)} L${f(x1)},${f(h * 0.68)} Z`} />
    </>
  );
};

const antenna: R = ({ w, h, style: s }) => (
  <Line
    s={s}
    d={`M${w / 2},${h} V${f(h * 0.02)} M${f(w * 0.08)},${f(h * 0.02)} L${w / 2},${f(h * 0.45)} L${f(w * 0.92)},${f(h * 0.02)}`}
  />
);

const dip: R = ({ w, h, style: s }) => {
  const x0 = w * 0.18;
  const x1 = w * 0.82;
  const n = Math.max(2, Math.min(8, Math.floor(h / 20)));
  const gap = h / n;
  let pins = '';
  for (let i = 0; i < n; i++) {
    const y = gap * (i + 0.5);
    pins += ` M0,${f(y)} H${f(x0)} M${f(x1)},${f(y)} H${w}`;
  }
  const nr = Math.min(6, (x1 - x0) * 0.12);
  const cx = (x0 + x1) / 2;
  return (
    <>
      <Line s={s} d={pins} />
      <B s={s} d={`M${f(x0)},0 H${f(cx - nr)} A${f(nr)},${f(nr)} 0 0 0 ${f(cx + nr)},0 H${f(x1)} V${h} H${f(x0)} Z`} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Logic gates (IEEE distinctive shapes)
// ---------------------------------------------------------------------------

type GateOp = 'and' | 'or' | 'xor' | 'not' | 'buf';
const gate = (op: GateOp, neg: boolean): R => ({ w, h, style: s }) => {
  const cy = h / 2;
  const y0 = h * 0.06;
  const y1 = h * 0.94;
  const bh = y1 - y0;
  const bx0 = w * 0.2;
  const bx1 = w * 0.8;
  const br = neg ? Math.min(w * 0.05, h * 0.08) : 0;
  const end = bx1 - br * 2;
  const single = op === 'not' || op === 'buf';
  const ins = single ? [cy] : [h * 0.3, h * 0.7];
  let body: string;
  let extra = '';
  let inX = (_y: number) => bx0;
  if (op === 'and') {
    const ax = bx0 + (end - bx0) * 0.38;
    body = `M${f(bx0)},${f(y0)} H${f(ax)} A${f(end - ax)},${f(bh / 2)} 0 0 1 ${f(ax)},${f(y1)} H${f(bx0)} Z`;
  } else if (op === 'or' || op === 'xor') {
    const x = bx0 + (op === 'xor' ? w * 0.07 : 0);
    const bw = end - x;
    const k = bw * 0.26;
    body =
      `M${f(x)},${f(y0)} C${f(x + bw * 0.5)},${f(y0)} ${f(x + bw * 0.85)},${f(y0 + bh * 0.18)} ${f(end)},${f(cy)} ` +
      `C${f(x + bw * 0.85)},${f(y1 - bh * 0.18)} ${f(x + bw * 0.5)},${f(y1)} ${f(x)},${f(y1)} Q${f(x + k)},${f(cy)} ${f(x)},${f(y0)} Z`;
    const backX = (y: number) => {
      const t = (y - y0) / bh;
      return bx0 + 2 * t * (1 - t) * k;
    };
    inX = backX;
    if (op === 'xor') extra = `M${f(bx0)},${f(y0)} Q${f(bx0 + k)},${f(cy)} ${f(bx0)},${f(y1)}`;
  } else {
    body = `M${f(bx0)},${f(h * 0.1)} L${f(end)},${f(cy)} L${f(bx0)},${f(h * 0.9)} Z`;
  }
  const leads = ins.map((y) => `M0,${f(y)} H${f(inX(y))}`).join(' ') + ` M${f(neg ? bx1 : end)},${f(cy)} H${w}`;
  return (
    <>
      <Line s={s} d={leads} />
      {extra && <Line s={s} d={extra} />}
      <B s={s} d={body} />
      {neg && <B s={s} d={circleD(end + br, cy, br)} />}
    </>
  );
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const E = 'shape=mxgraph.electrical.';
const sym = (kind: string, label: string, drawio: string, render: R, extra: Partial<ShapeDef> = {}) =>
  shape(`elec.${kind}`, label, `${E}${drawio};html=1;pointerEvents=1;`, render, { ...ART, ...extra });

export const shapes: ShapeDef[] = [
  sym('resistor', 'Resistor (US)', 'resistors.resistor_2', resistorUS),
  sym('resistorIEC', 'Resistor (IEC)', 'resistors.resistor_1', resistorIEC),
  sym('potentiometer', 'Potentiometer', 'resistors.potentiometer_2', potentiometer),
  sym('capacitor', 'Capacitor', 'capacitors.capacitor_1', capacitor(false)),
  sym('capacitorPolar', 'Polarized capacitor', 'capacitors.capacitor_2', capacitor(true)),
  sym('inductor', 'Inductor', 'inductors.inductor_3', inductor),
  sym('transformer', 'Transformer', 'inductors.transformer_1', transformer),
  sym('diode', 'Diode', 'diodes.diode', diode('plain')),
  sym('zener', 'Zener diode', 'diodes.zener_diode_1', diode('zener')),
  sym('schottky', 'Schottky diode', 'diodes.schottky_diode', diode('schottky')),
  sym('led', 'LED', 'opto_electronics.led_2', diode('plain', true)),
  sym('npn', 'NPN transistor', 'transistors.npn_transistor_1', bjt(false)),
  sym('pnp', 'PNP transistor', 'transistors.pnp_transistor_1', bjt(true)),
  sym('nmos', 'N-channel MOSFET', 'mosfets1.n-channel_mosfet_1', mosfet(false)),
  sym('pmos', 'P-channel MOSFET', 'mosfets1.p-channel_mosfet_1', mosfet(true)),
  sym('opamp', 'Op-amp', 'abstract.operational_amp_1', opamp),
  sym('ground', 'Ground', 'signal_sources.signal_ground', ground(false)),
  sym('chassis', 'Chassis ground', 'signal_sources.chassis', ground(true)),
  sym('battery', 'Battery', 'miscellaneous.batteryStack', battery),
  sym('dcSource', 'DC voltage source', 'signal_sources.dc_source_3', source('dc')),
  sym('currentSource', 'Current source', 'signal_sources.current_source', source('current')),
  sym('acSource', 'AC source', 'signal_sources.ac_source', source('ac')),
  sym('switch', 'Switch (SPST)', 'electro-mechanical.singleSwitch', spst),
  sym('pushButton', 'Push button', 'electro-mechanical.pushbuttonMake', pushButton),
  sym('fuse', 'Fuse', 'miscellaneous.fuse_2', fuse),
  sym('lamp', 'Lamp', 'miscellaneous.light_bulb', lamp),
  sym('motor', 'Motor', 'electro-mechanical.motor_1', lettered('M')),
  sym('generator', 'Generator', 'electro-mechanical.generator', lettered('G')),
  sym('voltmeter', 'Voltmeter', 'instruments.voltmeter', lettered('V')),
  sym('ammeter', 'Ammeter', 'instruments.ammeter', lettered('A')),
  sym('relay', 'Relay', 'electro-mechanical.relay', relay),
  sym('speaker', 'Speaker', 'electro-mechanical.loudspeaker', speaker),
  sym('antenna', 'Antenna', 'radio.aerial_-_antenna_1', antenna),
  sym('and', 'AND gate', 'logic_gates.logic_gate;operation=and', gate('and', false)),
  sym('nand', 'NAND gate', 'logic_gates.logic_gate;operation=and;negating=1', gate('and', true)),
  sym('or', 'OR gate', 'logic_gates.logic_gate;operation=or', gate('or', false)),
  sym('nor', 'NOR gate', 'logic_gates.logic_gate;operation=or;negating=1', gate('or', true)),
  sym('xor', 'XOR gate', 'logic_gates.logic_gate;operation=xor', gate('xor', false)),
  sym('xnor', 'XNOR gate', 'logic_gates.logic_gate;operation=xor;negating=1', gate('xor', true)),
  sym('not', 'NOT gate', 'logic_gates.inverter_2', gate('not', true)),
  sym('buffer', 'Buffer', 'logic_gates.buffer2', gate('buf', false)),
  sym('dip', 'IC (DIP)', 'logic_gates.dual_inline_ic', dip, {
    textPlacement: 'inside',
    textBox: (w, h) => ({ x: w * 0.2, y: 6, w: Math.max(1, w * 0.6), h: Math.max(1, h - 12) }),
  }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const art = { fill: 'none', fontSize: 12 };
const boxed = { fill: '#ffffff', fontSize: 12 };

export const libraries: ShapeLibrary[] = [
  {
    id: 'electrical',
    name: 'Electrical',
    items: [
      item('elec.resistor', 'Resistor (US)', 80, 24, { style: art, keywords: 'resistance ohm zigzag' }),
      item('elec.resistorIEC', 'Resistor (IEC)', 80, 24, { style: boxed, keywords: 'resistance ohm box european' }),
      item('elec.potentiometer', 'Potentiometer', 80, 36, { style: art, keywords: 'variable resistor trimmer rheostat' }),
      item('elec.capacitor', 'Capacitor', 50, 36, { style: art, keywords: 'cap condenser' }),
      item('elec.capacitorPolar', 'Polarized capacitor', 50, 36, { style: art, keywords: 'electrolytic cap' }),
      item('elec.inductor', 'Inductor', 80, 24, { style: art, keywords: 'coil choke' }),
      item('elec.transformer', 'Transformer', 60, 60, { style: art, keywords: 'coil magnetic' }),
      item('elec.diode', 'Diode', 60, 30, { style: art, keywords: 'rectifier' }),
      item('elec.zener', 'Zener diode', 60, 30, { style: art }),
      item('elec.schottky', 'Schottky diode', 60, 30, { style: art }),
      item('elec.led', 'LED', 60, 44, { style: art, keywords: 'light emitting diode' }),
      item('elec.npn', 'NPN transistor', 56, 60, { style: art, keywords: 'bjt bipolar' }),
      item('elec.pnp', 'PNP transistor', 56, 60, { style: art, keywords: 'bjt bipolar' }),
      item('elec.nmos', 'N-MOSFET', 56, 60, { style: art, keywords: 'fet mosfet nmos transistor' }),
      item('elec.pmos', 'P-MOSFET', 56, 60, { style: art, keywords: 'fet mosfet pmos transistor' }),
      item('elec.opamp', 'Op-amp', 80, 60, { style: boxed, keywords: 'operational amplifier comparator' }),
      item('elec.ground', 'Ground', 36, 30, { style: art, keywords: 'earth gnd' }),
      item('elec.chassis', 'Chassis ground', 36, 30, { style: art, keywords: 'earth frame gnd' }),
      item('elec.battery', 'Battery', 60, 36, { style: art, keywords: 'cell power dc' }),
      item('elec.dcSource', 'Voltage source', 40, 70, { style: boxed, keywords: 'dc supply power' }),
      item('elec.currentSource', 'Current source', 40, 70, { style: boxed }),
      item('elec.acSource', 'AC source', 40, 70, { style: boxed, keywords: 'alternating sine generator' }),
      item('elec.switch', 'Switch', 70, 30, { style: art, keywords: 'spst toggle' }),
      item('elec.pushButton', 'Push button', 70, 40, { style: art, keywords: 'momentary switch' }),
      item('elec.fuse', 'Fuse', 70, 22, { style: boxed, keywords: 'protection breaker' }),
      item('elec.lamp', 'Lamp', 56, 36, { style: boxed, keywords: 'light bulb indicator' }),
      item('elec.motor', 'Motor', 60, 40, { style: boxed }),
      item('elec.generator', 'Generator', 60, 40, { style: boxed, keywords: 'alternator dynamo' }),
      item('elec.voltmeter', 'Voltmeter', 60, 40, { style: boxed, keywords: 'meter voltage' }),
      item('elec.ammeter', 'Ammeter', 60, 40, { style: boxed, keywords: 'meter current' }),
      item('elec.relay', 'Relay', 60, 60, { style: boxed, keywords: 'coil contact' }),
      item('elec.speaker', 'Speaker', 44, 44, { style: boxed, keywords: 'loudspeaker audio buzzer' }),
      item('elec.antenna', 'Antenna', 36, 50, { style: art, keywords: 'aerial radio rf' }),
      item('elec.and', 'AND gate', 70, 50, { style: boxed, keywords: 'logic' }),
      item('elec.nand', 'NAND gate', 70, 50, { style: boxed, keywords: 'logic' }),
      item('elec.or', 'OR gate', 70, 50, { style: boxed, keywords: 'logic' }),
      item('elec.nor', 'NOR gate', 70, 50, { style: boxed, keywords: 'logic' }),
      item('elec.xor', 'XOR gate', 70, 50, { style: boxed, keywords: 'logic exclusive' }),
      item('elec.xnor', 'XNOR gate', 70, 50, { style: boxed, keywords: 'logic exclusive' }),
      item('elec.not', 'NOT gate', 70, 40, { style: boxed, keywords: 'logic inverter' }),
      item('elec.buffer', 'Buffer', 70, 40, { style: boxed, keywords: 'logic driver' }),
      item('elec.dip', 'IC (DIP)', 80, 100, { style: { ...boxed, fontSize: 12, bold: true }, text: 'IC', keywords: 'chip integrated circuit microcontroller' }),
    ],
  },
];
