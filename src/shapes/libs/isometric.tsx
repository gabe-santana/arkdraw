/**
 * Isometric: 30° projection blocks, devices and people. Faces are shaded from
 * the element fill (top lighter, left as-is, right darker) and outlined with
 * the stroke. Each scene declares its projected bounds and is scaled per axis
 * into the element box, so resizing stretches the drawing like draw.io's iso shapes.
 */
import type { ReactNode } from 'react';
import type { ElementStyle, Rect } from '@/model/types';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { fillOf, strokeAttrs } from '../kit';
import { type Pt, f, item, pathOf, shape } from './_kit2';

const CO = Math.cos(Math.PI / 6);
const SI = 0.5;
const R2 = Math.SQRT2;

/** Projected bounds [u0, u1, v0, v1]. */
type Bounds = readonly [number, number, number, number];
type Proj = (x: number, y: number, z: number) => Pt;

interface Iso {
  p: Proj;
  /** Screen units per projected unit (x / y). */
  kx: number;
  ky: number;
  s: ElementStyle;
}

const boxBounds = (X: number, Y: number, Z: number): Bounds => [-Y * CO, X * CO, -Z, (X + Y) * SI];

function makeIso(w: number, h: number, b: Bounds, s: ElementStyle): Iso {
  const kx = w / Math.max(1e-6, b[1] - b[0]);
  const ky = h / Math.max(1e-6, b[3] - b[2]);
  return { p: (x, y, z) => [((x - y) * CO - b[0]) * kx, ((x + y) * SI - z - b[2]) * ky], kx, ky, s };
}

// ---------------------------------------------------------------------------
// Faces & primitives
// ---------------------------------------------------------------------------

type Tone = 'top' | 'left' | 'right';
const TONE_OVERLAY: Record<Tone, [string, number]> = { top: ['#ffffff', 0.35], left: ['#000000', 0], right: ['#000000', 0.22] };

/** A shaded, outlined polygon. `fill` overrides the element fill. */
function Face({ pts, s, tone, fill }: { pts: readonly Pt[]; s: ElementStyle; tone: Tone; fill?: string }) {
  const d = pathOf(pts);
  const base = fill ?? fillOf(s);
  const [oc, oo] = TONE_OVERLAY[tone];
  return (
    <>
      <path d={d} fill={base} fillOpacity={fill ? 1 : s.fillOpacity} stroke="none" />
      {oo > 0 && base !== 'none' && <path d={d} fill={oc} fillOpacity={oo} stroke="none" />}
      <path d={d} fill="none" {...strokeAttrs(s)} strokeLinejoin="round" />
    </>
  );
}

/** Rectangles lying on the planes x = c, y = c or z = c. */
const onX = (p: Proj, x: number, y0: number, y1: number, z0: number, z1: number) => [p(x, y0, z0), p(x, y1, z0), p(x, y1, z1), p(x, y0, z1)];
const onY = (p: Proj, y: number, x0: number, x1: number, z0: number, z1: number) => [p(x0, y, z0), p(x1, y, z0), p(x1, y, z1), p(x0, y, z1)];
const onZ = (p: Proj, z: number, x0: number, x1: number, y0: number, y1: number) => [p(x0, y0, z), p(x1, y0, z), p(x1, y1, z), p(x0, y1, z)];

/** Unstroked detail polygon. */
const Q = (pts: readonly Pt[], fill: string, o = 1, key?: string | number) => <path key={key} d={pathOf(pts)} fill={fill} fillOpacity={o} stroke="none" />;
/** Stroked detail polyline. */
const L = (pts: readonly Pt[], stroke: string, w = 1, o = 1, key?: string | number) => (
  <path key={key} d={pathOf(pts, false)} fill="none" stroke={stroke} strokeWidth={w} strokeOpacity={o} strokeLinecap="round" strokeLinejoin="round" />
);

/** Axis-aligned box: footprint (x, y, dx, dy), base z, height dz. */
function Box({ iso, x, y, z, dx, dy, dz, fill }: { iso: Iso; x: number; y: number; z: number; dx: number; dy: number; dz: number; fill?: string }) {
  const { p, s } = iso;
  return (
    <>
      <Face pts={onY(p, y + dy, x, x + dx, z, z + dz)} s={s} tone="left" fill={fill} />
      <Face pts={onX(p, x + dx, y, y + dy, z, z + dz)} s={s} tone="right" fill={fill} />
      <Face pts={onZ(p, z + dz, x, x + dx, y, y + dy)} s={s} tone="top" fill={fill} />
    </>
  );
}

/** Upright cylinder centred at (cx, cy) from z0 to z0 + hgt. */
function Cyl({ iso, cx, cy, z0, hgt, r, fill, rings = 0 }: { iso: Iso; cx: number; cy: number; z0: number; hgt: number; r: number; fill?: string; rings?: number }) {
  const { p, kx, ky, s } = iso;
  const rx = r * R2 * CO * kx;
  const ry = r * R2 * SI * ky;
  const [bx, by] = p(cx, cy, z0);
  const ty = by - hgt * ky;
  const base = fill ?? fillOf(s);
  const body = `M${f(bx - rx)},${f(ty)} V${f(by)} A${f(rx)},${f(ry)} 0 0 0 ${f(bx + rx)},${f(by)} V${f(ty)} Z`;
  const right = `M${f(bx)},${f(ty)} V${f(by + ry)} A${f(rx)},${f(ry)} 0 0 0 ${f(bx + rx)},${f(by)} V${f(ty)} Z`;
  const ringD = Array.from({ length: rings }, (_, i) => {
    const y = by - (hgt * ky * (i + 1)) / (rings + 1);
    return `M${f(bx - rx)},${f(y)} A${f(rx)},${f(ry)} 0 0 0 ${f(bx + rx)},${f(y)}`;
  }).join(' ');
  return (
    <>
      <path d={body} fill={base} fillOpacity={fill ? 1 : s.fillOpacity} stroke="none" />
      {base !== 'none' && <path d={right} fill="#000" fillOpacity={0.2} stroke="none" />}
      <path d={body} fill="none" {...strokeAttrs(s)} />
      {ringD && <path d={ringD} fill="none" {...strokeAttrs(s)} />}
      <ellipse cx={f(bx)} cy={f(ty)} rx={f(rx)} ry={f(ry)} fill={base} fillOpacity={fill ? 1 : s.fillOpacity} stroke="none" />
      {base !== 'none' && <ellipse cx={f(bx)} cy={f(ty)} rx={f(rx)} ry={f(ry)} fill="#fff" fillOpacity={0.35} stroke="none" />}
      <ellipse cx={f(bx)} cy={f(ty)} rx={f(rx)} ry={f(ry)} fill="none" {...strokeAttrs(s)} />
    </>
  );
}

/** Sphere-ish ball (iso people's heads, cloud puffs). */
function Ball({ iso, x, y, z, r, fill }: { iso: Iso; x: number; y: number; z: number; r: number; fill?: string }) {
  const { p, kx, ky, s } = iso;
  const [cx, cy] = p(x, y, z);
  const rx = r * 1.22 * kx;
  const ry = r * 1.22 * ky;
  const base = fill ?? fillOf(s);
  return (
    <>
      <ellipse cx={f(cx)} cy={f(cy)} rx={f(rx)} ry={f(ry)} fill={base} fillOpacity={fill ? 1 : s.fillOpacity} {...strokeAttrs(s)} />
      {base !== 'none' && (
        <path
          d={`M${f(cx + rx * 0.2)},${f(cy - ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx + rx * 0.2)},${f(cy + ry)} A${f(rx * 0.8)},${f(ry)} 0 0 0 ${f(cx + rx * 0.2)},${f(cy - ry)} Z`}
          fill="#000"
          fillOpacity={0.18}
          stroke="none"
        />
      )}
      {base !== 'none' && <ellipse cx={f(cx - rx * 0.35)} cy={f(cy - ry * 0.4)} rx={f(rx * 0.3)} ry={f(ry * 0.22)} fill="#fff" fillOpacity={0.45} />}
    </>
  );
}

/** Flat polygon (in the xy plane) extruded upwards by `hgt`. */
function Extrude({ iso, poly, z0, hgt }: { iso: Iso; poly: ReadonlyArray<readonly [number, number]>; z0: number; hgt: number }) {
  const { p, s } = iso;
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
  const sides: Array<{ depth: number; node: ReactNode }> = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const nx = area > 0 ? dy : -dy;
    const ny = area > 0 ? -dx : dx;
    if (nx + ny <= 1e-9) continue;
    const pts = [p(a[0], a[1], z0), p(b[0], b[1], z0), p(b[0], b[1], z0 + hgt), p(a[0], a[1], z0 + hgt)];
    sides.push({ depth: a[0] + a[1] + b[0] + b[1], node: <Face key={i} pts={pts} s={s} tone={Math.abs(nx) > Math.abs(ny) ? 'right' : 'left'} /> });
  }
  sides.sort((m, k) => m.depth - k.depth);
  return (
    <>
      {sides.map((x) => x.node)}
      <Face pts={poly.map(([x, y]) => p(x, y, z0 + hgt))} s={s} tone="top" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene helpers
// ---------------------------------------------------------------------------

const DARK = '#0f172a';
const SCREEN = '#7dd3fc';
const LED = '#22c55e';
const WARN = '#f59e0b';

type Draw = (iso: Iso) => ReactNode;

/** Shape whose drawing lives in projected `bounds`. */
const scene = (bounds: Bounds, draw: Draw) =>
  function IsoScene({ w, h, style }: ShapeRenderContext) {
    return <>{draw(makeIso(w, h, bounds, style))}</>;
  };

/** Text box centred on the top face of an X×Y×Z box. */
const topLabel = (X: number, Y: number, Z: number) => (w: number, h: number): Rect => {
  const b = boxBounds(X, Y, Z);
  const iso = makeIso(w, h, b, {} as ElementStyle);
  const [cx, cy] = iso.p(X / 2, Y / 2, Z);
  const tw = Math.max(1, w * 0.5);
  const th = Math.max(1, (X + Y) * SI * iso.ky * 0.5);
  return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
};

/** A row of LEDs on the front-left face y = Y. */
const leds = (p: Proj, y: number, x0: number, z: number, n: number, gap: number, colors: string[]) =>
  Array.from({ length: n }, (_, i) => Q(onY(p, y, x0 + i * gap, x0 + i * gap + gap * 0.45, z, z + 0.05), colors[i % colors.length], 1, `led${i}`));

function person(iso: Iso, x: number, y: number, shirt?: string) {
  return (
    <g key={`${x},${y}`}>
      <Cyl iso={iso} cx={x} cy={y} z0={0} hgt={0.62} r={0.28} fill={shirt} />
      <Ball iso={iso} x={x} y={y} z={1.0} r={0.22} fill="#f4c7a1" />
    </g>
  );
}

/** Arrow pointing +x in the unit square, then rotated in the ground plane. */
const ARROW: ReadonlyArray<readonly [number, number]> = [
  [0.05, 0.36], [0.55, 0.36], [0.55, 0.14], [0.97, 0.5], [0.55, 0.86], [0.55, 0.64], [0.05, 0.64],
];
const ROT: Record<string, (x: number, y: number) => readonly [number, number]> = {
  se: (x, y) => [x, y],
  sw: (x, y) => [1 - y, x],
  nw: (x, y) => [1 - x, 1 - y],
  ne: (x, y) => [y, 1 - x],
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const DRAWIO = (name: string) => `shape=mxgraph.isometric.${name};verticalLabelPosition=bottom;verticalAlign=top;html=1;`;
const ART = { boxHit: true, textPlacement: 'below' as const };

const cylBounds = (r: number, hgt: number): Bounds => [-r * R2 * CO, r * R2 * CO, -hgt - r * R2 * SI, r * R2 * SI];
const PERSON: Bounds = [-0.4, 0.4, -1.36, 0.24];
const GROUP: Bounds = [-1.05, 1.05, -1.74, 0.6];

const shapes: ShapeDef[] = [
  shape('iso.cube', 'Cube', DRAWIO('cube'), scene(boxBounds(1, 1, 1), (iso) => <Box iso={iso} x={0} y={0} z={0} dx={1} dy={1} dz={1} />), ART),
  shape('iso.slab', 'Platform tile', 'shape=mxgraph.isometric.plane;html=1;', scene(boxBounds(2, 2, 0.2), (iso) => <Box iso={iso} x={0} y={0} z={0} dx={2} dy={2} dz={0.2} />), {
    boxHit: true,
    textBox: topLabel(2, 2, 0.2),
  }),
  shape('iso.block', 'Labeled block', DRAWIO('cube'), scene(boxBounds(2, 1.2, 0.6), (iso) => <Box iso={iso} x={0} y={0} z={0} dx={2} dy={1.2} dz={0.6} />), {
    boxHit: true,
    textBox: topLabel(2, 1.2, 0.6),
  }),
  shape('iso.plate', 'Label plate', DRAWIO('cube'), scene(boxBounds(2.2, 1, 0.16), (iso) => <Box iso={iso} x={0} y={0} z={0} dx={2.2} dy={1} dz={0.16} />), {
    boxHit: true,
    textBox: topLabel(2.2, 1, 0.16),
  }),
  shape('iso.cylinder', 'Database', 'shape=mxgraph.aws3d.dataCenter;html=1;', scene(cylBounds(1, 1.3), (iso) => <Cyl iso={iso} cx={0} cy={0} z0={0} hgt={1.3} r={1} rings={2} />), ART),
  shape(
    'iso.pyramid',
    'Pyramid',
    DRAWIO('pyramid'),
    scene([-CO, CO, -0.6, 1], ({ p, s }) => {
      const apex = p(0.5, 0.5, 1.1);
      return (
        <>
          <Face pts={[p(0, 1, 0), p(1, 1, 0), apex]} s={s} tone="left" />
          <Face pts={[p(1, 0, 0), p(1, 1, 0), apex]} s={s} tone="right" />
        </>
      );
    }),
    ART,
  ),
  shape(
    'iso.rack',
    'Server rack',
    DRAWIO('rack'),
    scene(boxBounds(1, 1, 2.4), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={1} dy={1} dz={2.4} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            {Q(onY(iso.p, 1, 0.1, 0.9, 0.2 + i * 0.3, 0.42 + i * 0.3), DARK, 0.55)}
            {Q(onY(iso.p, 1, 0.75, 0.82, 0.28 + i * 0.3, 0.34 + i * 0.3), i === 2 ? WARN : LED)}
          </g>
        ))}
      </>
    )),
    ART,
  ),
  shape(
    'iso.server',
    'Server',
    DRAWIO('server'),
    scene(boxBounds(1.6, 1.2, 0.84), (iso) => (
      <>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Box iso={iso} x={0} y={0} z={i * 0.3} dx={1.6} dy={1.2} dz={0.24} />
            {Q(onY(iso.p, 1.2, 0.12, 0.8, i * 0.3 + 0.07, i * 0.3 + 0.17), DARK, 0.5)}
            {leds(iso.p, 1.2, 1.1, i * 0.3 + 0.095, 3, 0.13, [LED, LED, WARN])}
          </g>
        ))}
      </>
    )),
    ART,
  ),
  shape(
    'iso.storage',
    'Storage array',
    DRAWIO('storage'),
    scene(boxBounds(1.6, 1, 1.1), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={1.6} dy={1} dz={1.1} />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <g key={`${r}-${c}`}>
              {Q(onY(iso.p, 1, 0.1 + c * 0.37, 0.4 + c * 0.37, 0.1 + r * 0.24, 0.28 + r * 0.24), DARK, 0.5)}
              {Q(onY(iso.p, 1, 0.33 + c * 0.37, 0.37 + c * 0.37, 0.17 + r * 0.24, 0.21 + r * 0.24), LED)}
            </g>
          )),
        )}
      </>
    )),
    ART,
  ),
  shape(
    'iso.desktop',
    'Desktop computer',
    DRAWIO('workstation'),
    scene(boxBounds(1.4, 1.5, 1.4), (iso) => (
      <>
        <Box iso={iso} x={0.45} y={0.4} z={0} dx={0.5} dy={0.4} dz={0.05} />
        <Box iso={iso} x={0.62} y={0.5} z={0.05} dx={0.16} dy={0.1} dz={0.35} />
        <Box iso={iso} x={0} y={0.5} z={0.35} dx={1.4} dy={0.12} dz={1.05} />
        {Q(onY(iso.p, 0.62, 0.08, 1.32, 0.45, 1.32), SCREEN, 0.95)}
        {Q(onY(iso.p, 0.62, 0.08, 0.6, 0.45, 1.32), '#fff', 0.25)}
        <Box iso={iso} x={0.1} y={1.0} z={0} dx={1.2} dy={0.45} dz={0.06} />
        {Q(onZ(iso.p, 0.06, 0.18, 1.22, 1.06, 1.38), DARK, 0.35)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.laptop',
    'Laptop',
    DRAWIO('laptop'),
    scene(boxBounds(1.4, 1.1, 1), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0.06} dx={1.4} dy={0.06} dz={0.94} />
        {Q(onY(iso.p, 0.06, 0.08, 1.32, 0.14, 0.92), SCREEN, 0.95)}
        <Box iso={iso} x={0} y={0.06} z={0} dx={1.4} dy={1.04} dz={0.06} />
        {Q(onZ(iso.p, 0.06, 0.12, 1.28, 0.16, 0.66), DARK, 0.35)}
        {Q(onZ(iso.p, 0.06, 0.5, 0.9, 0.74, 1.0), DARK, 0.2)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.phone',
    'Smartphone',
    DRAWIO('mobile_phone'),
    scene(boxBounds(0.7, 1.3, 0.08), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={0.7} dy={1.3} dz={0.08} fill="#1e293b" />
        {Q(onZ(iso.p, 0.08, 0.06, 0.64, 0.12, 1.18), SCREEN)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.tablet',
    'Tablet',
    DRAWIO('tablet'),
    scene(boxBounds(1.1, 1.5, 0.06), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={1.1} dy={1.5} dz={0.06} fill="#1e293b" />
        {Q(onZ(iso.p, 0.06, 0.08, 1.02, 0.1, 1.4), SCREEN)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.router',
    'Router',
    DRAWIO('router'),
    scene([-1 * CO, 1.4 * CO, -0.9, 1.2], (iso) => (
      <>
        {L([iso.p(0.15, 0.15, 0.3), iso.p(0.15, 0.15, 0.9)], DARK, Math.max(1, iso.kx * 0.05))}
        {L([iso.p(1.25, 0.15, 0.3), iso.p(1.25, 0.15, 0.9)], DARK, Math.max(1, iso.kx * 0.05))}
        <Box iso={iso} x={0} y={0} z={0} dx={1.4} dy={1} dz={0.3} />
        {leds(iso.p, 1, 0.15, 0.12, 5, 0.2, [LED, LED, LED, WARN])}
      </>
    )),
    ART,
  ),
  shape(
    'iso.switch',
    'Switch',
    DRAWIO('switch'),
    scene(boxBounds(2, 1, 0.22), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={2} dy={1} dz={0.22} />
        {Array.from({ length: 8 }, (_, i) => Q(onY(iso.p, 1, 0.12 + i * 0.22, 0.28 + i * 0.22, 0.05, 0.16), DARK, 0.6, i))}
      </>
    )),
    ART,
  ),
  shape(
    'iso.firewall',
    'Firewall',
    DRAWIO('firewall'),
    scene(boxBounds(1.6, 0.5, 1), (iso) => {
      const { p } = iso;
      const lines: ReactNode[] = [];
      for (let r = 1; r < 5; r++) lines.push(L([p(0, 0.5, r * 0.2), p(1.6, 0.5, r * 0.2)], DARK, 1, 0.45, `h${r}`));
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 4; c++) {
          const x = c * 0.4 + (r % 2 ? 0.2 : 0.4);
          if (x < 1.6) lines.push(L([p(x, 0.5, r * 0.2), p(x, 0.5, r * 0.2 + 0.2)], DARK, 1, 0.45, `v${r}-${c}`));
        }
      return (
        <>
          <Box iso={iso} x={0} y={0} z={0} dx={1.6} dy={0.5} dz={1} />
          {lines}
        </>
      );
    }),
    ART,
  ),
  shape(
    'iso.cloud',
    'Cloud',
    DRAWIO('cloud'),
    scene([-1.4, 1.4, -1.25, 0.75], (iso) => (
      <>
        <Cyl iso={iso} cx={0} cy={0} z0={0} hgt={0.2} r={1.1} />
        <Ball iso={iso} x={-0.45} y={0.15} z={0.5} r={0.45} />
        <Ball iso={iso} x={0.1} y={-0.4} z={0.65} r={0.55} />
        <Ball iso={iso} x={0.45} y={0.3} z={0.45} r={0.42} />
      </>
    )),
    ART,
  ),
  shape('iso.person', 'Person', DRAWIO('person'), scene(PERSON, (iso) => person(iso, 0, 0)), ART),
  shape(
    'iso.users',
    'User group',
    DRAWIO('people'),
    scene(GROUP, (iso) => (
      <>
        {person(iso, 0, -0.75)}
        {person(iso, -0.75, 0)}
        {person(iso, 0.35, 0.35)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.building',
    'Office building',
    DRAWIO('office_building'),
    scene(boxBounds(1.2, 1.2, 2.6), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={1.2} dy={1.2} dz={2.6} />
        {Array.from({ length: 6 }, (_, r) =>
          [0, 1, 2].map((c) => (
            <g key={`${r}-${c}`}>
              {Q(onY(iso.p, 1.2, 0.12 + c * 0.36, 0.36 + c * 0.36, 0.25 + r * 0.38, 0.5 + r * 0.38), SCREEN, 0.85)}
              {Q(onX(iso.p, 1.2, 0.12 + c * 0.36, 0.36 + c * 0.36, 0.25 + r * 0.38, 0.5 + r * 0.38), SCREEN, 0.6)}
            </g>
          )),
        )}
      </>
    )),
    ART,
  ),
  shape(
    'iso.datacenter',
    'Data center',
    DRAWIO('data_center'),
    scene(boxBounds(2.2, 1.4, 1.1), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={2.2} dy={1.4} dz={0.8} />
        {[0, 1, 2, 3, 4].map((i) => Q(onY(iso.p, 1.4, 0.15 + i * 0.4, 0.45 + i * 0.4, 0.15, 0.62), DARK, 0.45, i))}
        {[0, 1, 2].map((i) => Q(onX(iso.p, 2.2, 0.15 + i * 0.4, 0.45 + i * 0.4, 0.15, 0.62), DARK, 0.45, `x${i}`))}
        <Box iso={iso} x={0.3} y={0.25} z={0.8} dx={0.5} dy={0.4} dz={0.3} />
        <Box iso={iso} x={1.2} y={0.25} z={0.8} dx={0.5} dy={0.4} dz={0.3} />
      </>
    )),
    ART,
  ),
  shape(
    'iso.loadBalancer',
    'Load balancer',
    DRAWIO('load_balancer'),
    scene(boxBounds(1.6, 1.2, 0.3), (iso) => {
      const { p } = iso;
      const z = 0.3;
      const sw = Math.max(1.2, iso.kx * 0.06);
      const head = (x: number, y: number) => Q([p(x + 0.12, y, z), p(x - 0.06, y - 0.1, z), p(x - 0.06, y + 0.1, z)], '#ffffff', 1, `${x},${y}`);
      return (
        <>
          <Box iso={iso} x={0} y={0} z={0} dx={1.6} dy={1.2} dz={0.3} />
          {L([p(0.2, 0.6, z), p(0.65, 0.6, z)], '#ffffff', sw)}
          {[0.25, 0.6, 0.95].map((y) => L([p(0.65, 0.6, z), p(1.0, y, z), p(1.3, y, z)], '#ffffff', sw, 1, y))}
          {[0.25, 0.6, 0.95].map((y) => head(1.32, y))}
        </>
      );
    }),
    ART,
  ),
  shape(
    'iso.package',
    'Package box',
    DRAWIO('box'),
    scene(boxBounds(1.2, 1, 0.9), (iso) => (
      <>
        <Box iso={iso} x={0} y={0} z={0} dx={1.2} dy={1} dz={0.9} />
        {Q(onZ(iso.p, 0.9, 0, 1.2, 0.42, 0.58), '#78350f', 0.35)}
        {Q(onY(iso.p, 1, 0, 1.2, 0.84, 0.9), '#78350f', 0.35)}
        {Q(onX(iso.p, 1.2, 0.42, 0.58, 0, 0.9), '#78350f', 0.35)}
      </>
    )),
    ART,
  ),
  shape(
    'iso.layers',
    'Stacked layers',
    DRAWIO('layers'),
    scene(boxBounds(2, 2, 0.8), (iso) => (
      <>
        {[0, 1, 2].map((i) => (
          <Box key={i} iso={iso} x={0} y={0} z={i * 0.32} dx={2} dy={2} dz={0.16} />
        ))}
      </>
    )),
    ART,
  ),
  ...(['ne', 'nw', 'se', 'sw'] as const).map((dir) =>
    shape(
      `iso.arrow${dir.toUpperCase()}`,
      `Arrow ${dir.toUpperCase()}`,
      DRAWIO('arrow'),
      scene(boxBounds(1, 1, 0.12), (iso) => <Extrude iso={iso} poly={ARROW.map(([x, y]) => ROT[dir](x, y))} z0={0} hgt={0.12} />),
      ART,
    ),
  ),
  shape(
    'iso.grid',
    'Floor grid',
    'shape=mxgraph.isometric.plane;html=1;',
    scene(boxBounds(4, 4, 0), (iso) => {
      const { p, s } = iso;
      const lines: ReactNode[] = [];
      for (let i = 1; i < 4; i++) {
        lines.push(L([p(i, 0, 0), p(i, 4, 0)], s.stroke === 'none' ? DARK : s.stroke, 1, 0.45, `a${i}`));
        lines.push(L([p(0, i, 0), p(4, i, 0)], s.stroke === 'none' ? DARK : s.stroke, 1, 0.45, `b${i}`));
      }
      return (
        <>
          <Face pts={onZ(p, 0, 0, 4, 0, 4)} s={s} tone="left" />
          {lines}
        </>
      );
    }),
    { boxHit: true },
  ),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const TONES = {
  blue: { fill: '#60a5fa', stroke: '#1e40af' },
  slate: { fill: '#64748b', stroke: '#1e293b' },
  light: { fill: '#e2e8f0', stroke: '#475569' },
  green: { fill: '#4ade80', stroke: '#166534' },
  red: { fill: '#f87171', stroke: '#991b1b' },
  amber: { fill: '#fbbf24', stroke: '#92400e' },
  violet: { fill: '#a78bfa', stroke: '#5b21b6' },
  teal: { fill: '#2dd4bf', stroke: '#115e59' },
  tan: { fill: '#d6a46c', stroke: '#78350f' },
  white: { fill: '#f8fafc', stroke: '#94a3b8' },
};
const st = (t: keyof typeof TONES, extra: object = {}) => ({ ...TONES[t], strokeWidth: 1, fontSize: 12, ...extra });

const libraries: ShapeLibrary[] = [
  {
    id: 'isometric',
    name: 'Isometric',
    items: [
      item('iso.cube', 'Cube', 70, 80, { style: st('blue'), keywords: 'block 3d box isometric' }),
      item('iso.slab', 'Platform tile', 140, 90, { style: st('light'), keywords: 'floor base platform tile plane 3d' }),
      item('iso.block', 'Labeled block', 160, 100, { text: 'Service', style: st('blue', { bold: true }), keywords: 'cuboid component layer label 3d' }),
      item('iso.plate', 'Label plate', 150, 80, { text: 'Label', style: st('white'), keywords: 'text sign tag nameplate 3d' }),
      item('iso.cylinder', 'Database', 70, 90, { style: st('blue'), keywords: 'db storage cylinder sql data 3d' }),
      item('iso.pyramid', 'Pyramid', 70, 70, { style: st('amber'), keywords: 'cone hierarchy 3d' }),
      item('iso.rack', 'Server rack', 60, 116, { style: st('slate'), keywords: 'cabinet datacenter servers 3d' }),
      item('iso.server', 'Server', 100, 100, { style: st('light'), keywords: 'host compute machine 1u stack 3d' }),
      item('iso.storage', 'Storage array', 90, 100, { style: st('slate'), keywords: 'san nas disks raid 3d' }),
      item('iso.desktop', 'Desktop computer', 100, 115, { style: st('light'), keywords: 'pc workstation monitor keyboard client 3d' }),
      item('iso.laptop', 'Laptop', 100, 90, { style: st('light'), keywords: 'notebook client computer 3d' }),
      item('iso.phone', 'Smartphone', 70, 40, { style: st('slate'), keywords: 'mobile phone device client 3d' }),
      item('iso.tablet', 'Tablet', 90, 50, { style: st('slate'), keywords: 'ipad device client 3d' }),
      item('iso.router', 'Router', 90, 70, { style: st('blue'), keywords: 'wifi gateway network 3d' }),
      item('iso.switch', 'Switch', 110, 55, { style: st('teal'), keywords: 'network ethernet ports 3d' }),
      item('iso.firewall', 'Firewall', 90, 85, { style: st('red'), keywords: 'security wall bricks protection 3d' }),
      item('iso.cloud', 'Cloud', 110, 80, { style: st('white', { fill: '#e0f2fe', stroke: '#0369a1' }), keywords: 'internet saas cloud provider 3d' }),
      item('iso.person', 'Person', 32, 64, { style: st('blue'), keywords: 'user human actor people figure 3d' }),
      item('iso.users', 'User group', 84, 92, { style: st('violet'), keywords: 'users team people group 3d' }),
      item('iso.building', 'Office building', 70, 140, { style: st('light'), keywords: 'office headquarters site tower 3d' }),
      item('iso.datacenter', 'Data center', 130, 110, { style: st('slate'), keywords: 'datacenter facility region dc 3d' }),
      item('iso.loadBalancer', 'Load balancer', 110, 70, { style: st('green'), keywords: 'lb balancer traffic distribute 3d' }),
      item('iso.package', 'Package box', 80, 85, { style: st('tan'), keywords: 'box parcel container shipment artifact 3d' }),
      item('iso.layers', 'Stacked layers', 120, 100, { style: st('violet'), keywords: 'stack tiers layers platform 3d' }),
      item('iso.arrowNE', 'Arrow NE', 90, 56, { style: st('amber'), keywords: 'direction flow arrow north east 3d' }),
      item('iso.arrowNW', 'Arrow NW', 90, 56, { style: st('amber'), keywords: 'direction flow arrow north west 3d' }),
      item('iso.arrowSE', 'Arrow SE', 90, 56, { style: st('amber'), keywords: 'direction flow arrow south east 3d' }),
      item('iso.arrowSW', 'Arrow SW', 90, 56, { style: st('amber'), keywords: 'direction flow arrow south west 3d' }),
      item('iso.grid', 'Floor grid', 200, 116, { style: st('white', { fill: '#f1f5f9' }), keywords: 'plane ground grid floor base 3d' }),
    ],
  },
];

export { shapes, libraries };
