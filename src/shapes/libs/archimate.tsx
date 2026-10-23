/**
 * ArchiMate 3 notation: element boxes carrying their notation icon in the
 * top-right corner, coloured per layer. Corner style follows the spec:
 * square = structure / passive, rounded = behaviour, cut corners = motivation.
 */
import type { ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import { Body, RoundRect, cloudPath } from '../kit';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import {
  Ink, Line, Oval, arcD, circleD, clamp, ink, item, pathOf, regularPts, roundRectD, shape, solid, starPts,
} from './_kit2';

type Corner = 'square' | 'round' | 'cut';
/** Draws an icon inside the square (x, y)-(x+z, y+z). */
type IconFn = (x: number, y: number, z: number, s: ElementStyle) => ReactNode;

const iconSize = (w: number, h: number) => clamp(Math.min(w * 0.17, h * 0.3), 8, 20);
const PAD = 6;

/** Small filled arrow head at angle `deg` on a circle, pointing clockwise. */
function headAt(cx: number, cy: number, r: number, deg: number, size: number) {
  const a = (deg * Math.PI) / 180;
  const px = cx + r * Math.cos(a);
  const py = cy + r * Math.sin(a);
  const [tx, ty] = [-Math.sin(a), Math.cos(a)];
  const [nx, ny] = [Math.cos(a), Math.sin(a)];
  return pathOf([
    [px + tx * size, py + ty * size],
    [px + nx * size * 0.6, py + ny * size * 0.6],
    [px - nx * size * 0.6, py - ny * size * 0.6],
  ]);
}

// ---------------------------------------------------------------------------
// Notation icons
// ---------------------------------------------------------------------------

const st = (s: ElementStyle) => solid(s, 0.8);

const I: Record<string, IconFn> = {
  actor: (x, y, z, s) => {
    const cx = x + z / 2;
    return (
      <>
        <Oval cx={cx} cy={y + z * 0.17} rx={z * 0.15} s={st(s)} />
        <Line
          s={s}
          k={0.8}
          d={`M${cx},${y + z * 0.32} V${y + z * 0.66} M${x + z * 0.14},${y + z * 0.44} H${x + z * 0.86} M${x + z * 0.2},${y + z} L${cx},${y + z * 0.66} L${x + z * 0.8},${y + z}`}
        />
      </>
    );
  },
  role: (x, y, z, s) => {
    const cy = y + z / 2;
    const ry = z * 0.3;
    const rx = z * 0.13;
    const l = x + z * 0.18;
    const r = x + z * 0.82;
    return (
      <>
        <Body s={st(s)} d={`M${r},${cy - ry} H${l} A${rx},${ry} 0 0 0 ${l},${cy + ry} H${r} Z`} />
        <Oval cx={r} cy={cy} rx={rx} ry={ry} s={st(s)} />
      </>
    );
  },
  collab: (x, y, z, s) => (
    <Line s={s} k={0.8} d={circleD(x + z * 0.35, y + z / 2, z * 0.3) + circleD(x + z * 0.65, y + z / 2, z * 0.3)} />
  ),
  interface: (x, y, z, s) => (
    <>
      <Line s={s} k={0.8} d={`M${x + z * 0.02},${y + z / 2} H${x + z * 0.44}`} />
      <Oval cx={x + z * 0.7} cy={y + z / 2} rx={z * 0.26} s={st(s)} />
    </>
  ),
  process: (x, y, z, s) => (
    <Body
      s={st(s)}
      d={pathOf([
        [x, y + z * 0.36], [x + z * 0.58, y + z * 0.36], [x + z * 0.58, y + z * 0.16], [x + z, y + z * 0.5],
        [x + z * 0.58, y + z * 0.84], [x + z * 0.58, y + z * 0.64], [x, y + z * 0.64],
      ])}
    />
  ),
  function: (x, y, z, s) => (
    <Body
      s={st(s)}
      d={pathOf([
        [x + z * 0.15, y + z * 0.32], [x + z * 0.5, y + z * 0.04], [x + z * 0.85, y + z * 0.32],
        [x + z * 0.85, y + z * 0.96], [x + z * 0.5, y + z * 0.7], [x + z * 0.15, y + z * 0.96],
      ])}
    />
  ),
  interaction: (x, y, z, s) => {
    const cx = x + z / 2;
    const cy = y + z / 2;
    const r = z * 0.4;
    const g = z * 0.07;
    return (
      <Body
        s={st(s)}
        d={`M${cx - g},${cy - r} A${r},${r} 0 0 0 ${cx - g},${cy + r} Z M${cx + g},${cy - r} A${r},${r} 0 0 1 ${cx + g},${cy + r} Z`}
      />
    );
  },
  event: (x, y, z, s) => (
    <Body
      s={st(s)}
      d={`M${x},${y + z * 0.22} H${x + z * 0.72} A${z * 0.28},${z * 0.28} 0 0 1 ${x + z * 0.72},${y + z * 0.78} H${x} L${x + z * 0.24},${y + z * 0.5} Z`}
    />
  ),
  service: (x, y, z, s) => <Body s={st(s)} d={roundRectD(x, y + z * 0.25, z, z * 0.5, z * 0.25)} />,
  object: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x, y + z * 0.12, z, z * 0.76, 0)} />
      <Line s={s} k={0.8} d={`M${x},${y + z * 0.36} H${x + z}`} />
    </>
  ),
  contract: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x, y + z * 0.12, z, z * 0.76, 0)} />
      <Line s={s} k={0.8} d={`M${x},${y + z * 0.36} H${x + z} M${x},${y + z * 0.62} H${x + z}`} />
    </>
  ),
  representation: (x, y, z, s) => (
    <>
      <Body
        s={st(s)}
        d={`M${x},${y + z * 0.1} H${x + z} V${y + z * 0.8} Q${x + z * 0.75},${y + z * 0.62} ${x + z * 0.5},${y + z * 0.8} T${x},${y + z * 0.8} Z`}
      />
      <Line s={s} k={0.8} d={`M${x},${y + z * 0.32} H${x + z}`} />
    </>
  ),
  product: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x, y + z * 0.12, z, z * 0.76, 0)} />
      <Line s={s} k={0.8} d={`M${x},${y + z * 0.38} H${x + z * 0.5} V${y + z * 0.12}`} />
    </>
  ),
  component: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x + z * 0.25, y + z * 0.08, z * 0.75, z * 0.84, 0)} />
      <Body s={st(s)} d={roundRectD(x + z * 0.06, y + z * 0.24, z * 0.38, z * 0.17, 0) + roundRectD(x + z * 0.06, y + z * 0.58, z * 0.38, z * 0.17, 0)} />
    </>
  ),
  node: (x, y, z, s) => {
    const d = z * 0.24;
    return (
      <>
        <Body s={st(s)} d={roundRectD(x, y + d, z - d, z - d, 0)} />
        <Body s={st(s)} d={pathOf([[x, y + d], [x + d, y], [x + z, y], [x + z - d, y + d]])} />
        <Body s={st(s)} d={pathOf([[x + z - d, y + d], [x + z, y], [x + z, y + z - d], [x + z - d, y + z]])} />
      </>
    );
  },
  device: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x + z * 0.1, y + z * 0.08, z * 0.8, z * 0.56, z * 0.08)} />
      <Body s={st(s)} d={pathOf([[x + z * 0.2, y + z * 0.7], [x + z * 0.8, y + z * 0.7], [x + z, y + z * 0.92], [x, y + z * 0.92]])} />
    </>
  ),
  sysSw: (x, y, z, s) => (
    <>
      <Oval cx={x + z * 0.6} cy={y + z * 0.4} rx={z * 0.36} s={st(s)} />
      <Oval cx={x + z * 0.4} cy={y + z * 0.6} rx={z * 0.36} s={st(s)} />
    </>
  ),
  artifact: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={pathOf([[x + z * 0.15, y], [x + z * 0.6, y], [x + z * 0.85, y + z * 0.25], [x + z * 0.85, y + z], [x + z * 0.15, y + z]])} />
      <Line s={s} k={0.8} d={`M${x + z * 0.6},${y} V${y + z * 0.25} H${x + z * 0.85}`} />
    </>
  ),
  network: (x, y, z, s) => {
    const p = [[x + z * 0.28, y + z * 0.22], [x + z * 0.98, y + z * 0.22], [x + z * 0.72, y + z * 0.78], [x + z * 0.02, y + z * 0.78]] as const;
    return (
      <>
        <Line s={s} k={0.8} d={pathOf(p)} />
        <Ink s={s} d={p.map(([px, py]) => circleD(px, py, z * 0.1)).join(' ')} />
      </>
    );
  },
  path: (x, y, z, s) => {
    const cy = y + z / 2;
    return (
      <>
        <path d={`M${x + z * 0.18},${cy} H${x + z * 0.82}`} fill="none" stroke={ink(s)} strokeWidth={1.2} strokeDasharray="2 2" />
        <Line s={s} k={0.8} d={`M${x + z * 0.24},${cy - z * 0.2} L${x + z * 0.04},${cy} L${x + z * 0.24},${cy + z * 0.2} M${x + z * 0.76},${cy - z * 0.2} L${x + z * 0.96},${cy} L${x + z * 0.76},${cy + z * 0.2}`} />
      </>
    );
  },
  equipment: (x, y, z, s) => {
    const g = (cx: number, cy: number, r: number) => (
      <>
        <Body s={st(s)} d={pathOf(starPts(cx, cy, r, r, 8, 0.74))} />
        <Line s={s} k={0.7} d={circleD(cx, cy, r * 0.32)} />
      </>
    );
    return (
      <>
        {g(x + z * 0.72, y + z * 0.28, z * 0.26)}
        {g(x + z * 0.38, y + z * 0.62, z * 0.36)}
      </>
    );
  },
  facility: (x, y, z, s) => (
    <Body
      s={st(s)}
      d={pathOf([
        [x, y + z], [x, y + z * 0.45], [x + z * 0.28, y + z * 0.26], [x + z * 0.28, y + z * 0.45], [x + z * 0.56, y + z * 0.26],
        [x + z * 0.56, y + z * 0.45], [x + z * 0.72, y + z * 0.45], [x + z * 0.72, y + z * 0.04], [x + z * 0.92, y + z * 0.04], [x + z * 0.92, y + z],
      ])}
    />
  ),
  distribution: (x, y, z, s) => {
    const cy = y + z / 2;
    return (
      <Line
        s={s}
        k={0.8}
        d={`M${x + z * 0.08},${cy - z * 0.12} H${x + z * 0.92} M${x + z * 0.08},${cy + z * 0.12} H${x + z * 0.92} M${x + z * 0.24},${cy - z * 0.3} L${x},${cy} L${x + z * 0.24},${cy + z * 0.3} M${x + z * 0.76},${cy - z * 0.3} L${x + z},${cy} L${x + z * 0.76},${cy + z * 0.3}`}
      />
    );
  },
  material: (x, y, z, s) => {
    const p = regularPts(x + z / 2, y + z / 2, z * 0.5, z * 0.44, 6, 0);
    type P2 = readonly [number, number];
    const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const seg = (i: number) => {
      const a = p[i];
      const b = p[(i + 1) % 6];
      const c = [x + z / 2, y + z / 2] as const;
      const a2 = lerp(a, c, 0.25);
      const b2 = lerp(b, c, 0.25);
      return `M${lerp(a2, b2, 0.15).join(',')} L${lerp(a2, b2, 0.85).join(',')}`;
    };
    return (
      <>
        <Body s={st(s)} d={pathOf(p)} />
        <Line s={s} k={0.7} d={[1, 3, 5].map(seg).join(' ')} />
      </>
    );
  },
  driver: (x, y, z, s) => {
    const cx = x + z / 2;
    const cy = y + z / 2;
    const r = z * 0.5;
    const spokes = [0, 45, 90, 135]
      .map((a) => {
        const c = Math.cos((a * Math.PI) / 180) * r;
        const n = Math.sin((a * Math.PI) / 180) * r;
        return `M${cx - c},${cy - n} L${cx + c},${cy + n}`;
      })
      .join(' ');
    return (
      <>
        <Oval cx={cx} cy={cy} rx={r * 0.72} s={st(s)} />
        <Line s={s} k={0.7} d={spokes} />
        <Ink s={s} d={circleD(cx, cy, z * 0.12)} />
      </>
    );
  },
  assess: (x, y, z, s) => (
    <>
      <Line s={s} k={1.1} d={`M${x + z * 0.38},${y + z * 0.62} L${x + z * 0.04},${y + z * 0.96}`} />
      <Oval cx={x + z * 0.6} cy={y + z * 0.4} rx={z * 0.32} s={st(s)} />
    </>
  ),
  goal: (x, y, z, s) => {
    const cx = x + z / 2;
    const cy = y + z / 2;
    return (
      <>
        <Oval cx={cx} cy={cy} rx={z * 0.47} s={st(s)} />
        <Line s={s} k={0.8} d={circleD(cx, cy, z * 0.29)} />
        <Ink s={s} d={circleD(cx, cy, z * 0.11)} />
      </>
    );
  },
  outcome: (x, y, z, s) => {
    const cx = x + z * 0.45;
    const cy = y + z * 0.55;
    return (
      <>
        <Oval cx={cx} cy={cy} rx={z * 0.43} s={st(s)} />
        <Line s={s} k={0.8} d={circleD(cx, cy, z * 0.26)} />
        <Ink s={s} d={circleD(cx, cy, z * 0.09)} />
        <Line s={s} k={0.8} d={`M${x + z},${y} L${cx},${cy} M${cx + z * 0.24},${cy - z * 0.02} L${cx},${cy} L${cx + z * 0.02},${cy - z * 0.24}`} />
      </>
    );
  },
  principle: (x, y, z, s) => {
    const cx = x + z / 2;
    return (
      <>
        <Body s={st(s)} d={roundRectD(x + z * 0.15, y + z * 0.02, z * 0.7, z * 0.96, 0)} />
        <Ink s={s} d={roundRectD(cx - z * 0.06, y + z * 0.18, z * 0.12, z * 0.44, z * 0.04) + circleD(cx, y + z * 0.78, z * 0.07)} />
      </>
    );
  },
  requirement: (x, y, z, s) => (
    <Body s={st(s)} d={pathOf([[x + z * 0.25, y + z * 0.2], [x + z, y + z * 0.2], [x + z * 0.75, y + z * 0.8], [x, y + z * 0.8]])} />
  ),
  constraint: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={pathOf([[x + z * 0.25, y + z * 0.2], [x + z, y + z * 0.2], [x + z * 0.75, y + z * 0.8], [x, y + z * 0.8]])} />
      <Line s={s} k={0.8} d={`M${x + z * 0.47},${y + z * 0.2} L${x + z * 0.22},${y + z * 0.8}`} />
    </>
  ),
  meaning: (x, y, z, s) => (
    <g transform={`translate(${x} ${y + z * 0.12})`}>
      <Body s={st(s)} d={cloudPath(z, z * 0.76)} />
    </g>
  ),
  value: (x, y, z, s) => <Oval cx={x + z / 2} cy={y + z / 2} rx={z * 0.5} ry={z * 0.3} s={st(s)} />,
  capability: (x, y, z, s) => {
    const q = z / 3;
    const cells: Array<[number, number]> = [[0, 2], [1, 2], [2, 2], [1, 1], [2, 1], [2, 0]];
    return <Body s={st(s)} d={cells.map(([c, r]) => roundRectD(x + c * q, y + r * q, q, q, 0)).join(' ')} />;
  },
  resource: (x, y, z, s) => (
    <>
      <Body s={st(s)} d={roundRectD(x, y + z * 0.26, z * 0.84, z * 0.48, z * 0.12)} />
      <Body s={st(s)} d={roundRectD(x + z * 0.84, y + z * 0.4, z * 0.14, z * 0.2, 0)} />
      <Line s={s} k={0.8} d={[0.24, 0.42, 0.6].map((k) => `M${x + z * k},${y + z * 0.38} V${y + z * 0.62}`).join(' ')} />
    </>
  ),
  course: (x, y, z, s) => {
    const cx = x + z * 0.66;
    const cy = y + z * 0.34;
    return (
      <>
        <Oval cx={cx} cy={cy} rx={z * 0.32} s={st(s)} />
        <Line s={s} k={0.8} d={circleD(cx, cy, z * 0.17)} />
        <Ink s={s} d={circleD(cx, cy, z * 0.06)} />
        <Line s={s} k={0.8} d={`M${x + z * 0.04},${y + z * 0.98} Q${x + z * 0.06},${y + z * 0.62} ${x + z * 0.36},${y + z * 0.58}`} />
      </>
    );
  },
  valueStream: (x, y, z, s) => (
    <Body
      s={st(s)}
      d={pathOf([[x, y + z * 0.22], [x + z * 0.7, y + z * 0.22], [x + z, y + z * 0.5], [x + z * 0.7, y + z * 0.78], [x, y + z * 0.78], [x + z * 0.26, y + z * 0.5]])}
    />
  ),
  workPackage: (x, y, z, s) => {
    const cx = x + z / 2;
    const cy = y + z / 2;
    const r = z * 0.38;
    return (
      <>
        <Line s={s} k={0.9} d={arcD(cx, cy, r, r, -50, 215)} />
        <Ink s={s} d={headAt(cx, cy, r, 215, z * 0.2)} />
      </>
    );
  },
  plateau: (x, y, z, s) => (
    <Line s={s} k={1.1} d={`M${x + z * 0.32},${y + z * 0.22} H${x + z} M${x + z * 0.16},${y + z * 0.5} H${x + z * 0.84} M${x},${y + z * 0.78} H${x + z * 0.68}`} />
  ),
  gap: (x, y, z, s) => {
    const cx = x + z / 2;
    const cy = y + z / 2;
    return (
      <>
        <Oval cx={cx} cy={cy} rx={z * 0.34} s={st(s)} />
        <Line s={s} k={0.8} d={`M${x},${cy - z * 0.1} H${x + z} M${x},${cy + z * 0.1} H${x + z}`} />
      </>
    );
  },
  location: (x, y, z, s) => {
    const cx = x + z / 2;
    const r = z * 0.34;
    const cy = y + r + z * 0.02;
    return (
      <>
        <Body
          s={st(s)}
          d={`M${cx},${y + z} C${cx - r * 0.3},${cy + r * 1.3} ${cx - r},${cy + r * 0.6} ${cx - r},${cy} A${r},${r} 0 1 1 ${cx + r},${cy} C${cx + r},${cy + r * 0.6} ${cx + r * 0.3},${cy + r * 1.3} ${cx},${y + z} Z`}
        />
        <Line s={s} k={0.8} d={circleD(cx, cy, r * 0.38)} />
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Element renderer
// ---------------------------------------------------------------------------

function element(corner: Corner, icon: IconFn) {
  return function ArchiElement({ w, h, style }: ShapeRenderContext) {
    const z = iconSize(w, h);
    let body: ReactNode;
    if (corner === 'square') body = <RoundRect w={w} h={h} s={style} r={0} />;
    else if (corner === 'round') body = <RoundRect w={w} h={h} s={style} r={Math.min(12, h * 0.28, w * 0.2)} />;
    else {
      const c = Math.min(9, w * 0.12, h * 0.22);
      body = <Body s={style} d={pathOf([[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]])} />;
    }
    return (
      <>
        {body}
        {icon(w - z - PAD, PAD, z, style)}
      </>
    );
  };
}

const textBox = (w: number, h: number) => {
  const top = 4 + iconSize(w, h) * 0.6;
  return { x: 8, y: top, w: Math.max(1, w - 16), h: Math.max(1, h - top - 4) };
};

/** [kind suffix, label, corner, icon key, draw.io appType] */
const ELEMENTS: Array<[string, string, Corner, string, string]> = [
  ['actor', 'Actor', 'square', 'actor', 'actor'],
  ['role', 'Role', 'square', 'role', 'role'],
  ['collaboration', 'Collaboration', 'square', 'collab', 'collab'],
  ['interface', 'Interface', 'square', 'interface', 'interface'],
  ['process', 'Process', 'round', 'process', 'proc'],
  ['function', 'Function', 'round', 'function', 'func'],
  ['interaction', 'Interaction', 'round', 'interaction', 'interaction'],
  ['event', 'Event', 'round', 'event', 'event'],
  ['service', 'Service', 'round', 'service', 'serv'],
  ['object', 'Object', 'square', 'object', 'passive'],
  ['contract', 'Contract', 'square', 'contract', 'contract'],
  ['representation', 'Representation', 'square', 'representation', 'representation'],
  ['product', 'Product', 'square', 'product', 'product'],
  ['component', 'Component', 'square', 'component', 'comp'],
  ['node', 'Node', 'square', 'node', 'node'],
  ['device', 'Device', 'square', 'device', 'device'],
  ['systemSoftware', 'System software', 'square', 'sysSw', 'sysSw'],
  ['artifact', 'Artifact', 'square', 'artifact', 'artifact'],
  ['network', 'Communication network', 'square', 'network', 'netw'],
  ['path', 'Path', 'square', 'path', 'path'],
  ['equipment', 'Equipment', 'square', 'equipment', 'equipment'],
  ['facility', 'Facility', 'square', 'facility', 'facility'],
  ['distribution', 'Distribution network', 'square', 'distribution', 'distribution'],
  ['material', 'Material', 'square', 'material', 'material'],
  ['stakeholder', 'Stakeholder', 'cut', 'role', 'role'],
  ['driver', 'Driver', 'cut', 'driver', 'driver'],
  ['assessment', 'Assessment', 'cut', 'assess', 'assess'],
  ['goal', 'Goal', 'cut', 'goal', 'goal'],
  ['outcome', 'Outcome', 'cut', 'outcome', 'outcome'],
  ['principle', 'Principle', 'cut', 'principle', 'principle'],
  ['requirement', 'Requirement', 'cut', 'requirement', 'requirement'],
  ['constraint', 'Constraint', 'cut', 'constraint', 'constraint'],
  ['meaning', 'Meaning', 'cut', 'meaning', 'meaning'],
  ['value', 'Value', 'cut', 'value', 'amValue'],
  ['capability', 'Capability', 'round', 'capability', 'capability'],
  ['resource', 'Resource', 'square', 'resource', 'resource'],
  ['courseOfAction', 'Course of action', 'round', 'course', 'course'],
  ['valueStream', 'Value stream', 'round', 'valueStream', 'valueStream'],
  ['workPackage', 'Work package', 'round', 'workPackage', 'workPackage'],
  ['deliverable', 'Deliverable', 'square', 'representation', 'deliverable'],
  ['plateau', 'Plateau', 'square', 'plateau', 'plateau'],
  ['gap', 'Gap', 'square', 'gap', 'gap'],
  ['location', 'Location', 'square', 'location', 'location'],
];

const ARCHI_TYPE: Record<Corner, string> = { square: 'square', round: 'rounded', cut: 'oct' };

export const shapes: ShapeDef[] = [
  ...ELEMENTS.map(([k, label, corner, icon, appType]) =>
    shape(
      `archimate.${k}`,
      label,
      `html=1;outlineConnect=0;whiteSpace=wrap;shape=mxgraph.archimate3.application;appType=${appType};archiType=${ARCHI_TYPE[corner]};`,
      element(corner, I[icon]),
      { textBox },
    ),
  ),
  shape(
    'archimate.grouping',
    'Grouping',
    'shape=folder;tabWidth=110;tabHeight=22;tabPosition=left;dashed=1;html=1;whiteSpace=wrap;align=left;verticalAlign=top;container=1;',
    ({ w, h, style }) => {
      const tw = Math.min(w * 0.5, 140);
      const th = Math.min(22, h * 0.3);
      return (
        <>
          <Body s={style} d={`M0,${th} V0 H${tw} V${th}`} />
          <Body s={style} d={`M0,${th} H${w} V${h} H0 Z`} />
        </>
      );
    },
    { container: true, textBox: (w, h) => ({ x: 8, y: 0, w: Math.max(1, Math.min(w * 0.5, 140) - 12), h: Math.min(22, h * 0.3) }) },
  ),
  shape(
    'archimate.junction',
    'Junction',
    'ellipse;html=1;aspect=fixed;fillColor=#000000;',
    ({ w, h, style }) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={ink(style)} stroke="none" />,
    { perimeter: 'ellipse', textPlacement: 'below' },
  ),
  shape(
    'archimate.junctionOr',
    'Or junction',
    'ellipse;html=1;aspect=fixed;fillColor=#ffffff;',
    ({ w, h, style }) => <Oval cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - 0.75)} ry={Math.max(0, h / 2 - 0.75)} s={solid(style)} />,
    { perimeter: 'ellipse', textPlacement: 'below' },
  ),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const layer = (fill: string, stroke: string) => ({ fill, stroke, fontSize: 12, textColor: '#1f2937' });
const BUS = layer('#fff2b3', '#a68a00');
const APP = layer('#c9f5f7', '#2b8a99');
const TECH = layer('#d5ecc8', '#4f8a3a');
const MOT = layer('#e2e2ff', '#6262c4');
const STRAT = layer('#f8e6bf', '#a8761c');
const IMPL = layer('#ffe0e0', '#c25454');
const DELIV = layer('#e0f5e0', '#3f9a3f');
const LOC = layer('#fdd9b5', '#c76e1a');

const W = 120;
const H = 60;
const el = (k: string, label: string, style: object, keywords: string): LibraryItem =>
  item(`archimate.${k}`, label, W, H, { text: label, style, keywords: `archimate ${keywords}` });

export const libraries: ShapeLibrary[] = [
  {
    id: 'archimate',
    name: 'ArchiMate 3',
    items: [
      // Business layer
      el('actor', 'Business Actor', BUS, 'business'),
      el('role', 'Business Role', BUS, 'business'),
      el('collaboration', 'Business Collaboration', BUS, 'business'),
      el('interface', 'Business Interface', BUS, 'business'),
      el('process', 'Business Process', BUS, 'business'),
      el('function', 'Business Function', BUS, 'business'),
      el('interaction', 'Business Interaction', BUS, 'business'),
      el('event', 'Business Event', BUS, 'business'),
      el('service', 'Business Service', BUS, 'business'),
      el('object', 'Business Object', BUS, 'business passive'),
      el('contract', 'Contract', BUS, 'business passive'),
      el('representation', 'Representation', BUS, 'business passive'),
      el('product', 'Product', BUS, 'business'),
      // Application layer
      el('component', 'Application Component', APP, 'application'),
      el('collaboration', 'Application Collaboration', APP, 'application'),
      el('interface', 'Application Interface', APP, 'application'),
      el('function', 'Application Function', APP, 'application'),
      el('interaction', 'Application Interaction', APP, 'application'),
      el('process', 'Application Process', APP, 'application'),
      el('event', 'Application Event', APP, 'application'),
      el('service', 'Application Service', APP, 'application'),
      el('object', 'Data Object', APP, 'application passive'),
      // Technology layer
      el('node', 'Node', TECH, 'technology'),
      el('device', 'Device', TECH, 'technology hardware'),
      el('systemSoftware', 'System Software', TECH, 'technology os'),
      el('collaboration', 'Technology Collaboration', TECH, 'technology'),
      el('interface', 'Technology Interface', TECH, 'technology'),
      el('path', 'Path', TECH, 'technology'),
      el('network', 'Communication Network', TECH, 'technology'),
      el('function', 'Technology Function', TECH, 'technology'),
      el('process', 'Technology Process', TECH, 'technology'),
      el('interaction', 'Technology Interaction', TECH, 'technology'),
      el('event', 'Technology Event', TECH, 'technology'),
      el('service', 'Technology Service', TECH, 'technology'),
      el('artifact', 'Artifact', TECH, 'technology passive'),
      // Physical
      el('equipment', 'Equipment', TECH, 'physical'),
      el('facility', 'Facility', TECH, 'physical'),
      el('distribution', 'Distribution Network', TECH, 'physical'),
      el('material', 'Material', TECH, 'physical'),
      // Motivation
      el('stakeholder', 'Stakeholder', MOT, 'motivation'),
      el('driver', 'Driver', MOT, 'motivation'),
      el('assessment', 'Assessment', MOT, 'motivation'),
      el('goal', 'Goal', MOT, 'motivation'),
      el('outcome', 'Outcome', MOT, 'motivation'),
      el('principle', 'Principle', MOT, 'motivation'),
      el('requirement', 'Requirement', MOT, 'motivation'),
      el('constraint', 'Constraint', MOT, 'motivation'),
      el('meaning', 'Meaning', MOT, 'motivation'),
      el('value', 'Value', MOT, 'motivation'),
      // Strategy
      el('resource', 'Resource', STRAT, 'strategy'),
      el('capability', 'Capability', STRAT, 'strategy'),
      el('valueStream', 'Value Stream', STRAT, 'strategy'),
      el('courseOfAction', 'Course of Action', STRAT, 'strategy'),
      // Implementation & migration
      el('workPackage', 'Work Package', IMPL, 'implementation migration'),
      el('event', 'Implementation Event', IMPL, 'implementation migration'),
      el('deliverable', 'Deliverable', DELIV, 'implementation migration'),
      el('plateau', 'Plateau', DELIV, 'implementation migration'),
      el('gap', 'Gap', DELIV, 'implementation migration'),
      // Other
      el('location', 'Location', LOC, 'other'),
      item('archimate.grouping', 'Grouping', 360, 220, {
        text: 'Grouping',
        style: { fill: 'none', stroke: '#64748b', strokeStyle: 'dashed', fontSize: 12, bold: true, textAlign: 'left', textColor: '#334155' },
        keywords: 'archimate group container',
      }),
      item('archimate.junction', 'Junction', 16, 16, { style: { stroke: '#1e293b' }, keywords: 'archimate and junction' }),
      item('archimate.junctionOr', 'Or junction', 16, 16, { style: { fill: '#ffffff', stroke: '#1e293b' }, keywords: 'archimate or junction' }),
    ],
  },
];
