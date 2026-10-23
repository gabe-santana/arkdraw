/**
 * Network (Cisco style): original device icons in the classic network-diagram
 * idiom — solid blue 3D bodies (pucks for routers, slabs for switches, towers
 * for servers) with white glyph arrows on the top face.
 *
 * The body colour is the shape fill and the glyph/edge colour is the stroke,
 * so users can recolour icons from the Format panel. Glyphs are designed in a
 * unit square (-1..1, v = -1 at the back) and projected onto a face with plain
 * point maths, so they export identically everywhere (no SVG transforms).
 */
import type { ComponentType, ReactNode } from 'react';
import {
  Activity, Eye, Folder, Globe, HardDrive, KeyRound, Lock, Mail, Phone, ShieldCheck, Video, Wifi, Zap,
  type LucideProps,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { cloudPath } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { type Pt, Glyph, Label, arcD, clamp, f, item, pathOf, roundRectD, shape } from './_kit2';

const BLUE = '#1f6fb2';
const WHITE = '#ffffff';

// ---------------------------------------------------------------------------
// Paint
// ---------------------------------------------------------------------------

interface Paint {
  /** Body colour. */
  B: string;
  /** Glyph & edge colour. */
  G: string;
  /** Glyph stroke width (scales with the icon). */
  sw: number;
  s: ElementStyle;
}

function paint(style: ElementStyle, w: number, h: number): Paint {
  const B = style.fill === 'none' ? BLUE : style.fill;
  const G = style.stroke === 'none' ? WHITE : style.stroke;
  const sw = Math.max(0.75, style.strokeWidth || 1.5) * clamp(Math.min(w, h) / 46, 0.6, 3);
  return { B, G, sw, s: style };
}

// ---------------------------------------------------------------------------
// Glyphs in unit space, projected onto faces
// ---------------------------------------------------------------------------

type Face = (u: number, v: number) => Pt;
interface Stroke {
  pts: Pt[];
  close?: boolean;
  fill?: boolean;
}

const ellFace = (cx: number, cy: number, rx: number, ry: number, k = 0.8): Face => (u, v) => [cx + u * rx * k, cy + v * ry * k];

/** Polyline with optional arrow heads (filled triangles) at either end. */
function arrow(pts: Pt[], { start = false, end = true, head = 0.3 } = {}): Stroke[] {
  const out: Stroke[] = [];
  const line = [...pts];
  const tip = (a: Pt, b: Pt): Pt[] => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const dx = (b[0] - a[0]) / len;
    const dy = (b[1] - a[1]) / len;
    const hw = head * 0.62;
    const base: Pt = [b[0] - dx * head, b[1] - dy * head];
    return [b, [base[0] - dy * hw, base[1] + dx * hw], [base[0] + dy * hw, base[1] - dx * hw]];
  };
  const shorten = (a: Pt, b: Pt): Pt => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const k = Math.min(head * 0.7, len * 0.5) / len;
    return [b[0] - (b[0] - a[0]) * k, b[1] - (b[1] - a[1]) * k];
  };
  const n = line.length;
  if (end && n > 1) {
    out.push({ pts: tip(line[n - 2], line[n - 1]), fill: true });
    line[n - 1] = shorten(line[n - 2], line[n - 1]);
  }
  if (start && n > 1) {
    out.push({ pts: tip(line[1], line[0]), fill: true });
    line[0] = shorten(line[1], line[0]);
  }
  out.push({ pts: line });
  return out;
}

/** Sampled circle (or arc) in unit space. */
const ring = (cx: number, cy: number, r: number, a0 = 0, a1 = 360, n = 28): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });

function Draw({ face, gl, p }: { face: Face; gl: Stroke[]; p: Paint }) {
  return (
    <>
      {gl.map((g, i) => {
        const d = pathOf(
          g.pts.map(([u, v]) => face(u, v)),
          !!(g.close || g.fill),
        );
        return g.fill ? (
          <path key={i} d={d} fill={p.G} stroke={p.G} strokeWidth={p.sw * 0.4} strokeLinejoin="round" />
        ) : (
          <path key={i} d={d} fill="none" stroke={p.G} strokeWidth={p.sw} strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
    </>
  );
}

// Glyph library ---------------------------------------------------------------

const D = 0.62; // diagonal reach
const GL = {
  /** Classic router: two arrows in, two arrows out along the diagonals. */
  router: [
    ...arrow([[-D - 0.12, -D - 0.12], [-0.16, -0.16]]),
    ...arrow([[D + 0.12, D + 0.12], [0.16, 0.16]]),
    ...arrow([[0.16, -0.16], [D + 0.12, -D - 0.12]]),
    ...arrow([[-0.16, 0.16], [-D - 0.12, D + 0.12]]),
  ],
  /** Four stacked arrows crossing in opposite directions. */
  switch: [
    ...arrow([[-0.9, -0.66], [0.55, -0.66]], { head: 0.32 }),
    ...arrow([[0.9, -0.22], [-0.55, -0.22]], { head: 0.32 }),
    ...arrow([[-0.9, 0.22], [0.55, 0.22]], { head: 0.32 }),
    ...arrow([[0.9, 0.66], [-0.55, 0.66]], { head: 0.32 }),
  ],
  workgroup: [
    ...arrow([[-0.9, -0.42], [0.6, -0.42]], { head: 0.34 }),
    ...arrow([[0.9, 0.42], [-0.6, 0.42]], { head: 0.34 }),
  ],
  atm: [
    ...arrow([[-0.88, -0.62], [0.88, 0.62]], { head: 0.34 }),
    ...arrow([[-0.88, 0.62], [0.88, -0.62]], { head: 0.34 }),
    ...arrow([[0.88, 0], [-0.88, 0]], { head: 0.34 }),
  ],
  hub: [
    ...arrow([[-0.9, 0.45], [0.9, 0.45]], { start: true, head: 0.32 }),
    { pts: [[-0.45, 0.45], [-0.45, -0.75]] },
    { pts: [[0, 0.45], [0, -0.75]] },
    { pts: [[0.45, 0.45], [0.45, -0.75]] },
  ],
  bridge: arrow([[-0.9, 0.5], [-0.25, 0.5], [0.25, -0.5], [0.9, -0.5]], { start: true, head: 0.34 }),
  access: [
    { pts: [[-0.9, -0.7], [0.05, 0]] },
    { pts: [[-0.9, 0], [0.05, 0]] },
    { pts: [[-0.9, 0.7], [0.05, 0]] },
    ...arrow([[0.05, 0], [0.92, 0]], { head: 0.34 }),
  ],
  balance: [
    { pts: [[-0.92, 0], [-0.1, 0]] },
    ...arrow([[-0.1, 0], [0.88, -0.7]], { head: 0.32 }),
    ...arrow([[-0.1, 0], [0.92, 0]], { head: 0.32 }),
    ...arrow([[-0.1, 0], [0.88, 0.7]], { head: 0.32 }),
  ],
  cache: [
    { pts: ring(0, 0, 0.42), close: true },
    { pts: [[-0.16, -0.22], [0.16, 0.22]] },
    ...arrow([[-0.95, 0], [-0.5, 0]], { head: 0.26 }),
    ...arrow([[0.5, 0], [0.95, 0]], { head: 0.26 }),
  ],
  modem: arrow(
    [[-0.92, 0], [-0.62, -0.6], [-0.3, 0.6], [0.02, -0.6], [0.34, 0.6], [0.6, 0], [0.92, 0]],
    { head: 0.32 },
  ),
  through: arrow([[-0.92, 0], [0.92, 0]], { start: true, head: 0.34 }),
  tunnel: [
    { pts: [[-0.62, -0.52], [0.62, -0.52]] },
    { pts: [[-0.62, 0.52], [0.62, 0.52]] },
    ...arrow([[-0.95, 0], [0.95, 0]], { head: 0.32 }),
  ],
} satisfies Record<string, Stroke[]>;

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

/** Router puck (short cylinder). Returns the drawing and the top-face projector. */
function puck(x: number, y: number, w: number, h: number, p: Paint, k = 0.32) {
  const rx = w / 2;
  const ry = Math.max(0, Math.min(h * k, w * 0.26));
  const cx = x + rx;
  const sil = `M${f(x)},${f(y + ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(x + w)},${f(y + ry)} V${f(y + h - ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(x)},${f(y + h - ry)} Z`;
  const band = `M${f(x)},${f(y + ry)} A${f(rx)},${f(ry)} 0 0 0 ${f(x + w)},${f(y + ry)} V${f(y + h - ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(x)},${f(y + h - ry)} Z`;
  const ew = p.sw * 0.8;
  const el = (
    <>
      <path d={sil} fill={p.B} />
      <path d={band} fill="#000" fillOpacity={0.2} />
      <ellipse cx={f(cx)} cy={f(y + ry)} rx={f(rx)} ry={f(ry)} fill={WHITE} fillOpacity={0.1} />
      <path d={sil} fill="none" stroke={p.G} strokeWidth={ew} strokeLinejoin="round" />
      <path d={`M${f(x)},${f(y + ry)} A${f(rx)},${f(ry)} 0 0 0 ${f(x + w)},${f(y + ry)}`} fill="none" stroke={p.G} strokeWidth={ew} />
    </>
  );
  return { el, top: ellFace(cx, y + ry, rx, ry), band: { y0: y + ry * 2, y1: y + h, x, w, ry } };
}

/** 3D box: front face, top face going back-right, right side face. */
function box(x: number, y: number, w: number, h: number, dx: number, dy: number, p: Paint) {
  const fx = x + w - dx;
  const ty = y + dy;
  const front: Pt[] = [[x, ty], [fx, ty], [fx, y + h], [x, y + h]];
  const top: Pt[] = [[x, ty], [x + dx, y], [x + w, y], [fx, ty]];
  const side: Pt[] = [[fx, ty], [x + w, y], [x + w, y + h - dy], [fx, y + h]];
  const sil: Pt[] = [[x, ty], [x + dx, y], [x + w, y], [x + w, y + h - dy], [fx, y + h], [x, y + h]];
  const ew = p.sw * 0.8;
  const el = (
    <>
      <path d={pathOf(sil)} fill={p.B} />
      <path d={pathOf(top)} fill={WHITE} fillOpacity={0.14} />
      <path d={pathOf(side)} fill="#000" fillOpacity={0.24} />
      <path d={pathOf(sil)} fill="none" stroke={p.G} strokeWidth={ew} strokeLinejoin="round" />
      <path d={pathOf([[x, ty], [fx, ty], [x + w, y]], false) + ` M${f(fx)},${f(ty)} V${f(y + h)}`} fill="none" stroke={p.G} strokeWidth={ew} strokeLinejoin="round" />
    </>
  );
  const topFace: Face = (u, v) => [x + w / 2 + u * ((w - dx) / 2) * 0.82 + v * (-dx / 2) * 0.82, y + dy / 2 + v * (dy / 2) * 0.82];
  return { el, topFace, front: { x, y: ty, w: Math.max(0, w - dx), h: Math.max(0, h - dy) }, front4: front };
}

/** Flat slab proportions (switch-like). */
const slab = (w: number, h: number, p: Paint) => {
  const dy = h * 0.42;
  const dx = Math.min(dy * 1.1, w * 0.28);
  return box(0, 0, w, h, dx, dy, p);
};

/** Tower proportions (servers). */
const tower = (w: number, h: number, p: Paint) => {
  const dy = Math.min(w * 0.26, h * 0.16);
  const dx = Math.min(dy * 1.1, w * 0.3);
  return box(0, 0, w, h, dx, dy, p);
};

/** Brick pattern lines inside a rect. */
function bricks(x: number, y: number, w: number, h: number, p: Paint, rows?: number) {
  const n = rows ?? clamp(Math.round(h / Math.max(4, Math.min(w, h) * 0.22)), 2, 8);
  const rh = h / n;
  const bw = Math.max(4, Math.min(w / 2.5, rh * 2.2));
  let d = '';
  for (let i = 1; i < n; i++) d += `M${f(x)},${f(y + rh * i)} H${f(x + w)} `;
  for (let i = 0; i < n; i++) {
    for (let bx = x + (i % 2 ? bw / 2 : bw); bx < x + w - 1; bx += bw) d += `M${f(bx)},${f(y + rh * i)} V${f(y + rh * (i + 1))} `;
  }
  return <path d={d} fill="none" stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinecap="butt" />;
}

/** Lucide glyph centred in a rect, sized to fit. */
function FaceGlyph({ Icon, r, p, k = 0.62 }: { Icon: ComponentType<LucideProps>; r: { x: number; y: number; w: number; h: number }; p: Paint; k?: number }) {
  const size = Math.min(r.w, r.h) * k;
  if (size < 2) return null;
  return <Glyph Icon={Icon} cx={r.x + r.w / 2} cy={r.y + r.h / 2} size={size} s={p.s} color={p.G} sw={Math.max(1, p.sw * 0.85)} />;
}

// ---------------------------------------------------------------------------
// Device renderers
// ---------------------------------------------------------------------------

type Render = (ctx: ShapeRenderContext) => ReactNode;

function routerR(glyph: Stroke[], extra?: (b: ReturnType<typeof puck>['band'], p: Paint) => ReactNode, antennas = false): Render {
  return ({ w, h, style }) => {
    const p = paint(style, w, h);
    const top = antennas ? h * 0.3 : 0;
    const P = puck(0, top, w, h - top, p);
    const ant = antennas
      ? [0.22, 0.78].map((k) => {
          const ax = w * k;
          return (
            <g key={k}>
              <path d={`M${f(ax)},${f(top + P.band.ry * 0.6)} V${f(p.sw * 1.5)}`} stroke={p.B} strokeWidth={Math.max(1.5, p.sw * 1.6)} strokeLinecap="round" />
              <circle cx={f(ax)} cy={f(p.sw * 1.5)} r={f(Math.max(1, p.sw * 1.3))} fill={p.B} />
            </g>
          );
        })
      : null;
    return (
      <>
        {ant}
        {P.el}
        <Draw face={P.top} gl={glyph} p={p} />
        {extra?.(P.band, p)}
      </>
    );
  };
}

function slabR(glyph: Stroke[] | null, front?: (r: { x: number; y: number; w: number; h: number }, p: Paint) => ReactNode, cube = false): Render {
  return ({ w, h, style }) => {
    const p = paint(style, w, h);
    const S = cube ? box(0, 0, w, h, Math.min(w * 0.3, h * 0.32), Math.min(h * 0.32, w * 0.3), p) : slab(w, h, p);
    return (
      <>
        {S.el}
        {glyph && <Draw face={S.topFace} gl={glyph} p={p} />}
        {front?.(S.front, p)}
      </>
    );
  };
}

/** Tower server with a front-panel decoration. */
function towerR(front?: (r: { x: number; y: number; w: number; h: number }, p: Paint) => ReactNode): Render {
  return ({ w, h, style }) => {
    const p = paint(style, w, h);
    const T = tower(w, h, p);
    const r = T.front;
    const m = Math.min(r.w, r.h);
    const slot = (k: number) => `M${f(r.x + r.w * 0.18)},${f(r.y + r.h * k)} H${f(r.x + r.w * 0.82)} `;
    const glyphBox = { x: r.x, y: r.y + r.h * 0.3, w: r.w, h: r.h * 0.5 };
    return (
      <>
        {T.el}
        <path d={slot(0.1) + slot(0.18)} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinecap="round" />
        <circle cx={f(r.x + r.w * 0.5)} cy={f(r.y + r.h * 0.9)} r={f(Math.max(0.6, m * 0.05))} fill="none" stroke={p.G} strokeWidth={p.sw * 0.6} />
        {front ? front(glyphBox, p) : <path d={slot(0.4) + slot(0.5) + slot(0.6) + slot(0.7)} stroke={p.G} strokeWidth={p.sw * 0.6} strokeOpacity={0.8} strokeLinecap="round" />}
      </>
    );
  };
}

const iconFront = (Icon: ComponentType<LucideProps>, k = 0.8) => (r: { x: number; y: number; w: number; h: number }, p: Paint) => (
  <FaceGlyph Icon={Icon} r={r} p={p} k={k} />
);

const textFront = (t: string) => (r: { x: number; y: number; w: number; h: number }, p: Paint) => {
  const size = Math.max(4, Math.min(r.w * 0.86 / (t.length * 0.66), r.h * 0.5));
  return <Label x={r.x + r.w / 2} y={r.y + r.h / 2 + size * 0.35} text={t} s={p.s} size={size} bold color={p.G} />;
};

/** Brick wall block (firewall). */
function wallR(badge?: ComponentType<LucideProps>): Render {
  return ({ w, h, style }) => {
    const p = paint(style, w, h);
    const dy = Math.min(h * 0.2, w * 0.2);
    const B = box(0, 0, w, h, Math.min(dy * 1.2, w * 0.25), dy, p);
    const r = B.front;
    const bs = Math.min(w, h) * 0.42;
    return (
      <>
        {B.el}
        {bricks(r.x, r.y, r.w, r.h, p)}
        {badge && bs > 4 && (
          <>
            <circle cx={f(w - bs / 2)} cy={f(bs / 2)} r={f(bs / 2)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
            <Glyph Icon={badge} cx={w - bs / 2} cy={bs / 2} size={bs * 0.6} s={p.s} color={p.G} sw={Math.max(1, p.sw * 0.8)} />
          </>
        )}
      </>
    );
  };
}

// Endpoints -------------------------------------------------------------------

function monitor(w: number, p: Paint, screenH: number) {
  const mw = w * 0.84;
  const mx = (w - mw) / 2;
  const bz = Math.max(1, Math.min(mw, screenH) * 0.09);
  return {
    el: (
      <>
        <path d={roundRectD(mx, 0, mw, screenH, Math.min(4, screenH * 0.1))} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
        <rect x={f(mx + bz)} y={f(bz)} width={f(Math.max(0, mw - bz * 2))} height={f(Math.max(0, screenH - bz * 2))} rx={1} fill={WHITE} fillOpacity={0.22} stroke={p.G} strokeWidth={p.sw * 0.5} />
      </>
    ),
    screen: { x: mx + bz, y: bz, w: Math.max(0, mw - bz * 2), h: Math.max(0, screenH - bz * 2) },
  };
}

function pcR(onScreen?: ComponentType<LucideProps>): Render {
  return ({ w, h, style }) => {
    const p = paint(style, w, h);
    const sh = h * 0.6;
    const M = monitor(w, p, sh);
    const kbY = h * 0.8;
    return (
      <>
        <path d={pathOf([[w * 0.42, sh], [w * 0.58, sh], [w * 0.62, h * 0.74], [w * 0.38, h * 0.74]])} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.6} strokeLinejoin="round" />
        {M.el}
        <path d={pathOf([[w * 0.1, kbY], [w * 0.86, kbY], [w, h], [0, h]])} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinejoin="round" />
        <path d={pathOf([[w * 0.1, kbY], [w * 0.86, kbY], [w, h], [0, h]])} fill={WHITE} fillOpacity={0.12} />
        {onScreen && <FaceGlyph Icon={onScreen} r={M.screen} p={p} k={0.7} />}
      </>
    );
  };
}

const laptopR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const sw0 = w * 0.76;
  const sx = (w - sw0) / 2;
  const sh = h * 0.68;
  const bz = Math.max(1, Math.min(sw0, sh) * 0.09);
  return (
    <>
      <path d={roundRectD(sx, 0, sw0, sh, Math.min(3, sh * 0.08))} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
      <rect x={f(sx + bz)} y={f(bz)} width={f(Math.max(0, sw0 - bz * 2))} height={f(Math.max(0, sh - bz * 2))} rx={1} fill={WHITE} fillOpacity={0.22} />
      <path d={pathOf([[sx, sh], [sx + sw0, sh], [w, h], [0, h]])} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinejoin="round" />
      <path d={pathOf([[sx, sh], [sx + sw0, sh], [w, h], [0, h]])} fill={WHITE} fillOpacity={0.14} />
      <path d={`M${f(w * 0.42)},${f(h * 0.9)} H${f(w * 0.58)}`} stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinecap="round" />
    </>
  );
};

const smartphoneR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const m = Math.min(w, h);
  const bz = m * 0.1;
  return (
    <>
      <path d={roundRectD(0, 0, w, h, m * 0.18)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
      <rect x={f(bz)} y={f(h * 0.12)} width={f(Math.max(0, w - bz * 2))} height={f(Math.max(0, h * 0.72))} rx={1} fill={WHITE} fillOpacity={0.24} />
      <circle cx={f(w / 2)} cy={f(h * 0.92)} r={f(Math.max(0.6, m * 0.07))} fill="none" stroke={p.G} strokeWidth={p.sw * 0.7} />
      <path d={`M${f(w * 0.4)},${f(h * 0.06)} H${f(w * 0.6)}`} stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinecap="round" />
    </>
  );
};

const ipPhoneR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const top = h * 0.22;
  const body: Pt[] = [[w * 0.08, top], [w * 0.92, top], [w, h], [0, h]];
  const hsW = w * 0.24;
  const kx = w * 0.42;
  const ky = h * 0.58;
  const cw = (w * 0.46) / 3;
  const ch = (h * 0.34) / 3;
  const keys = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      keys.push(<rect key={`${r}${c}`} x={f(kx + c * cw + cw * 0.15)} y={f(ky + r * ch + ch * 0.15)} width={f(cw * 0.7)} height={f(ch * 0.62)} rx={0.6} fill={p.G} />);
  return (
    <>
      <path d={pathOf(body)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinejoin="round" />
      <path d={pathOf(body)} fill={WHITE} fillOpacity={0.1} />
      <rect x={f(kx)} y={f(top + h * 0.08)} width={f(w * 0.46)} height={f(h * 0.2)} rx={1} fill={WHITE} fillOpacity={0.3} stroke={p.G} strokeWidth={p.sw * 0.5} />
      {keys}
      <path d={roundRectD(w * 0.06, 0, hsW, h * 0.9, hsW * 0.45)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
      <path d={roundRectD(w * 0.06, 0, hsW, h * 0.9, hsW * 0.45)} fill="#000" fillOpacity={0.12} />
    </>
  );
};

const videoR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const camH = h * 0.14;
  const sh = h * 0.66;
  const M = monitor(w, p, sh);
  return (
    <>
      <g transform={`translate(0 ${f(camH)})`}>
        <path d={pathOf([[w * 0.4, sh], [w * 0.6, sh], [w * 0.66, h - camH], [w * 0.34, h - camH]])} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.6} strokeLinejoin="round" />
        {M.el}
        <FaceGlyph Icon={Video} r={M.screen} p={p} k={0.7} />
      </g>
      <path d={roundRectD(w * 0.38, 0, w * 0.24, camH * 1.1, camH * 0.4)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.6} />
      <circle cx={f(w / 2)} cy={f(camH * 0.55)} r={f(Math.max(0.5, camH * 0.28))} fill={p.G} />
    </>
  );
};

const printerR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const paperH = h * 0.24;
  const B = box(0, paperH, w, h - paperH, Math.min(w * 0.22, h * 0.2), Math.min(h * 0.2, w * 0.22), p);
  const r = B.front;
  return (
    <>
      <path d={pathOf([[w * 0.28, 0], [w * 0.66, 0], [w * 0.7, paperH + (h - paperH) * 0.12], [w * 0.24, paperH + (h - paperH) * 0.12]])} fill={WHITE} stroke={p.B} strokeWidth={p.sw * 0.7} strokeLinejoin="round" />
      {B.el}
      <rect x={f(r.x + r.w * 0.15)} y={f(r.y + r.h * 0.55)} width={f(r.w * 0.7)} height={f(r.h * 0.18)} rx={1} fill={WHITE} fillOpacity={0.85} />
      <circle cx={f(r.x + r.w * 0.82)} cy={f(r.y + r.h * 0.28)} r={f(Math.max(0.6, Math.min(r.w, r.h) * 0.07))} fill={p.G} />
    </>
  );
};

const userR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const hr = Math.min(w * 0.22, h * 0.2);
  const cx = w / 2;
  const sy = hr * 2 + h * 0.06;
  const shoulders = `M0,${f(h)} V${f(sy + (h - sy) * 0.35)} Q0,${f(sy)} ${f(w * 0.3)},${f(sy)} H${f(w * 0.7)} Q${f(w)},${f(sy)} ${f(w)},${f(sy + (h - sy) * 0.35)} V${f(h)} Z`;
  return (
    <>
      <path d={shoulders} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinejoin="round" />
      <path d={shoulders} fill="#000" fillOpacity={0.1} />
      <circle cx={f(cx)} cy={f(hr)} r={f(hr)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
      <path d={pathOf([[cx - w * 0.1, sy], [cx, sy + (h - sy) * 0.5], [cx + w * 0.1, sy]], false)} fill="none" stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinejoin="round" />
    </>
  );
};

// Wireless --------------------------------------------------------------------

function waves(cx: number, cy: number, r: number, p: Paint, n = 3, color = p.B) {
  return Array.from({ length: n }, (_, i) => (
    <path key={i} d={arcD(cx, cy, r * (i + 1), r * (i + 1), 218, 322)} fill="none" stroke={color} strokeWidth={Math.max(1.2, p.sw * 1.15)} strokeLinecap="round" />
  ));
}

const apR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const y0 = h * 0.46;
  const P = puck(0, y0, w, h - y0, p, 0.36);
  const r = Math.min(w * 0.14, y0 * 0.32);
  return (
    <>
      {waves(w / 2, y0 + (h - y0) * 0.22, r, p)}
      {P.el}
      <circle cx={f(w / 2)} cy={f(y0 + P.band.ry)} r={f(Math.max(0.8, P.band.ry * 0.3))} fill={p.G} />
    </>
  );
};

const towerRadioR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const top = h * 0.28;
  const cx = w / 2;
  const lw = Math.max(1.2, p.sw * 1.1);
  const legs: Pt[] = [[w * 0.22, h], [cx, top], [w * 0.78, h]];
  let lattice = '';
  for (let i = 1; i < 4; i++) {
    const y = top + ((h - top) * i) / 4;
    const k = (y - top) / (h - top);
    lattice += `M${f(cx - (cx - w * 0.22) * k)},${f(y)} H${f(cx + (w * 0.78 - cx) * k)} `;
  }
  const r = Math.min(w * 0.12, top * 0.32);
  return (
    <>
      {waves(cx, top + r * 0.6, r, p, 3)}
      <path d={pathOf(legs, false) + ' ' + lattice + `M${f(w * 0.3)},${f(top + (h - top) * 0.75)} L${f(cx)},${f(top + (h - top) * 0.25)} M${f(w * 0.7)},${f(top + (h - top) * 0.75)} L${f(cx)},${f(top + (h - top) * 0.25)}`} fill="none" stroke={p.B} strokeWidth={lw} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={f(cx)} cy={f(top)} r={f(Math.max(1, lw * 1.2))} fill={p.B} />
    </>
  );
};

const satelliteR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const bw = w * 0.24;
  const bh = h * 0.34;
  const bx = (w - bw) / 2;
  const by = h * 0.36;
  const pw = (w - bw) / 2 - w * 0.06;
  const ph = h * 0.26;
  const py = by + (bh - ph) / 2;
  const panel = (x: number) => {
    let d = '';
    for (let i = 1; i < 3; i++) d += `M${f(x + (pw * i) / 3)},${f(py)} V${f(py + ph)} `;
    return (
      <g key={x}>
        <rect x={f(x)} y={f(py)} width={f(Math.max(0, pw))} height={f(ph)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.6} />
        <path d={d + `M${f(x)},${f(py + ph / 2)} H${f(x + pw)}`} stroke={p.G} strokeWidth={p.sw * 0.5} />
      </g>
    );
  };
  return (
    <>
      <path d={`M${f(w * 0.06 + pw)},${f(by + bh / 2)} H${f(w - w * 0.06 - pw)}`} stroke={p.B} strokeWidth={p.sw} />
      {panel(w * 0.03)}
      {panel(w - w * 0.03 - pw)}
      <rect x={f(bx)} y={f(by)} width={f(bw)} height={f(bh)} rx={1.5} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} />
      <path d={`M${f(w / 2)},${f(by)} V${f(h * 0.2)}`} stroke={p.B} strokeWidth={p.sw} />
      <path d={arcD(w / 2, h * 0.04, w * 0.16, h * 0.16, 20, 160)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.6} />
      <path d={`M${f(w * 0.5)},${f(by + bh)} V${f(h)}`} stroke={p.B} strokeWidth={p.sw * 0.8} strokeDasharray={`${f(p.sw * 1.5)} ${f(p.sw * 1.5)}`} />
    </>
  );
};

// Infrastructure ----------------------------------------------------------------

const databaseR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const P = puck(0, 0, w, h, p, 0.16);
  const ry = P.band.ry;
  const ring2 = (y: number) => `M0,${f(y)} A${f(w / 2)},${f(ry)} 0 0 0 ${f(w)},${f(y)}`;
  return (
    <>
      {P.el}
      <path d={ring2(ry + (h - ry * 2) * 0.33) + ' ' + ring2(ry + (h - ry * 2) * 0.66)} fill="none" stroke={p.G} strokeWidth={p.sw * 0.7} />
    </>
  );
};

const storageR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const T = box(0, 0, w, h, Math.min(w * 0.22, h * 0.18), Math.min(h * 0.18, w * 0.2), p);
  const r = T.front;
  const out = [];
  const rows = 4;
  for (let i = 0; i < rows; i++)
    for (let c = 0; c < 2; c++) {
      const cw = r.w * 0.36;
      const x = r.x + r.w * (c ? 0.55 : 0.09);
      const y = r.y + r.h * 0.08 + (r.h * 0.86 * i) / rows;
      out.push(<rect key={`${i}${c}`} x={f(x)} y={f(y)} width={f(cw)} height={f((r.h * 0.86) / rows - r.h * 0.05)} rx={0.8} fill="none" stroke={p.G} strokeWidth={p.sw * 0.6} />);
    }
  return (
    <>
      {T.el}
      {out}
    </>
  );
};

const mainframeR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const T = box(0, 0, w, h, Math.min(w * 0.16, h * 0.14), Math.min(h * 0.14, w * 0.14), p);
  const r = T.front;
  let d = '';
  for (let i = 1; i < 4; i++) d += `M${f(r.x + (r.w * i) / 4)},${f(r.y)} V${f(r.y + r.h)} `;
  for (let i = 0; i < 4; i++) d += `M${f(r.x + (r.w * i) / 4 + r.w * 0.05)},${f(r.y + r.h * 0.12)} H${f(r.x + (r.w * (i + 1)) / 4 - r.w * 0.05)} `;
  return (
    <>
      {T.el}
      <path d={d} stroke={p.G} strokeWidth={p.sw * 0.7} strokeLinecap="round" />
    </>
  );
};

const cloudR: Render = ({ w, h, style }) => {
  const fill = style.fill === 'none' ? 'none' : style.fill;
  const stroke = style.stroke === 'none' ? BLUE : style.stroke;
  return <path d={cloudPath(w, h)} fill={fill} stroke={stroke} strokeWidth={Math.max(1, style.strokeWidth)} strokeLinejoin="round" />;
};

const BOLT: Pt[] = [[0.62, 0], [0.12, 0.56], [0.44, 0.56], [0.3, 1], [0.9, 0.38], [0.56, 0.38], [0.78, 0]];
const wanR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const pts = BOLT.map(([x, y]) => [x * w, y * h] as const);
  return <path d={pathOf(pts)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinejoin="round" />;
};

const buildingR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const T = box(0, 0, w, h, Math.min(w * 0.2, h * 0.12), Math.min(h * 0.12, w * 0.18), p);
  const r = T.front;
  const out = [];
  const cols = 3;
  const rows = clamp(Math.round(r.h / Math.max(4, r.w / 3)), 2, 8);
  const cw = r.w / cols;
  const rh = (r.h * 0.8) / rows;
  for (let i = 0; i < rows; i++)
    for (let c = 0; c < cols; c++)
      out.push(<rect key={`${i}${c}`} x={f(r.x + c * cw + cw * 0.22)} y={f(r.y + r.h * 0.06 + i * rh + rh * 0.2)} width={f(cw * 0.56)} height={f(rh * 0.55)} fill={p.G} fillOpacity={0.85} />);
  return (
    <>
      {T.el}
      {out}
      <rect x={f(r.x + r.w * 0.38)} y={f(r.y + r.h * 0.88)} width={f(r.w * 0.24)} height={f(r.h * 0.12)} fill={p.G} />
    </>
  );
};

const homeR: Render = ({ w, h, style }) => {
  const p = paint(style, w, h);
  const ey = h * 0.42;
  const house: Pt[] = [[w / 2, 0], [w, ey], [w * 0.86, ey], [w * 0.86, h], [w * 0.14, h], [w * 0.14, ey], [0, ey]];
  return (
    <>
      <path d={pathOf(house)} fill={p.B} stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinejoin="round" />
      <rect x={f(w * 0.42)} y={f(h * 0.64)} width={f(w * 0.16)} height={f(h * 0.36)} fill={p.G} />
      <rect x={f(w * 0.22)} y={f(h * 0.52)} width={f(w * 0.14)} height={f(h * 0.14)} fill={p.G} fillOpacity={0.85} />
      <rect x={f(w * 0.64)} y={f(h * 0.52)} width={f(w * 0.14)} height={f(h * 0.14)} fill={p.G} fillOpacity={0.85} />
    </>
  );
};

// Puck decorations ----------------------------------------------------------------

type Band = ReturnType<typeof puck>['band'];

/** y of the band's front arc at `x`, offset `t` below the top face's front edge. */
const bandY = (b: Band, x: number, t: number) => {
  const rx = b.w / 2;
  const k = clamp((x - b.x - rx) / Math.max(1e-6, rx), -1, 1);
  return b.y0 - b.ry + t + b.ry * Math.sqrt(1 - k * k);
};
const bandArc = (b: Band, t: number) =>
  `M${f(b.x)},${f(b.y0 - b.ry * 2 + b.ry + t)} A${f(b.w / 2)},${f(b.ry)} 0 0 0 ${f(b.x + b.w)},${f(b.y0 - b.ry + t)}`;

const bandBricks = (b: Band, p: Paint) => {
  const th = b.y1 - b.y0;
  if (th <= 3) return null;
  // Two brick courses following the curved front of the puck.
  let d = bandArc(b, th / 2);
  const n = 6;
  for (let i = 1; i < n; i++) {
    const x = b.x + (b.w * i) / n;
    d += ` M${f(x)},${f(bandY(b, x, 0))} V${f(bandY(b, x, th / 2))}`;
    const x2 = x - b.w / n / 2;
    d += ` M${f(x2)},${f(bandY(b, x2, th / 2))} V${f(bandY(b, x2, th))}`;
  }
  return <path d={d} fill="none" stroke={p.G} strokeWidth={p.sw * 0.6} />;
};

const bandWave = (b: Band, p: Paint) => {
  const th = b.y1 - b.y0;
  const y = (b.y0 + b.y1) / 2;
  const x0 = b.x + b.w * 0.25;
  const x1 = b.x + b.w * 0.75;
  const amp = Math.max(0.5, th * 0.2);
  let d = `M${f(x0)},${f(y)}`;
  const n = 3;
  const seg = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + seg * i;
    d += ` C${f(a + seg * 0.3)},${f(y - amp * 2)} ${f(a + seg * 0.7)},${f(y + amp * 2)} ${f(a + seg)},${f(y)}`;
  }
  return <path d={d} fill="none" stroke={p.G} strokeWidth={p.sw * 0.8} strokeLinecap="round" />;
};

const bandText = (t: string) => (b: Band, p: Paint) => {
  const th = b.y1 - b.y0;
  const size = Math.min(th * 0.72, b.w / (t.length * 0.8));
  if (size < 3) return null;
  return <Label x={b.x + b.w / 2} y={(b.y0 + b.y1) / 2 + size * 0.05} text={t} s={p.s} size={size} bold color={p.G} />;
};

const bandLock = (b: Band, p: Paint) => (
  <FaceGlyph Icon={Lock} r={{ x: b.x, y: b.y0, w: b.w, h: Math.max(0, b.y1 - b.y0) }} p={p} k={0.85} />
);

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

const STYLE =
  'html=1;pointerEvents=1;dashed=0;fillColor=#036897;strokeColor=#ffffff;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;align=center;outlineConnect=0;';

/** [name, label, draw.io stencil, render, w, h, keywords, preset text?] */
type Entry = [string, string, string, Render, number, number, string];

const ENTRIES: Entry[] = [
  // Routers
  ['router', 'Router', 'routers.router', routerR(GL.router), 72, 44, 'router l3 gateway wan edge routing'],
  ['routerFirewall', 'Router with firewall', 'security.router_with_firewall', routerR(GL.router, bandBricks), 72, 48, 'router firewall security edge isr'],
  ['wirelessRouter', 'Wireless router', 'routers.wireless_router', routerR(GL.router, undefined, true), 72, 60, 'wifi router wireless home soho'],
  ['mplsRouter', 'MPLS router', 'routers.atm_tag_switch_router', routerR(GL.router, bandText('MPLS')), 72, 48, 'mpls label switch router lsr pe provider edge'],
  ['voiceGateway', 'Voice gateway', 'routers.voice_router', routerR(GL.router, bandWave), 72, 48, 'voice router gateway voip pstn sip'],
  ['vpnGateway', 'VPN gateway', 'security.vpn_gateway', routerR(GL.tunnel, bandLock), 72, 50, 'vpn gateway ipsec tunnel site-to-site'],
  // Switching
  ['switch', 'Switch (L2)', 'switches.workgroup_switch', slabR(GL.switch), 84, 44, 'switch layer 2 l2 ethernet lan access'],
  ['multilayerSwitch', 'Multilayer switch (L3)', 'switches.layer_3_switch', slabR(GL.router, undefined, true), 64, 60, 'switch layer 3 l3 multilayer core distribution routing'],
  ['workgroupSwitch', 'Workgroup switch', 'switches.workgroup_switch', slabR(GL.workgroup), 84, 36, 'switch workgroup small access desktop'],
  ['atmSwitch', 'ATM / fast switch', 'switches.atm_switch', slabR(GL.atm), 84, 44, 'atm fast gigabit switch backbone'],
  ['hub', 'Hub', 'hubs_and_gateways.small_hub', slabR(GL.hub), 84, 36, 'hub repeater ethernet shared'],
  ['bridge', 'Bridge', 'hubs_and_gateways.bridge', slabR(GL.bridge), 84, 40, 'bridge layer 2 segment'],
  ['accessServer', 'Access server', 'servers.access_server', slabR(GL.access), 84, 44, 'access server terminal console dial-in nas'],
  ['loadBalancer', 'Load balancer', 'misc.load_balancer', slabR(GL.balance), 84, 44, 'load balancer adc slb content switch distribute'],
  ['contentEngine', 'Content / cache engine', 'misc.cache_director', slabR(GL.cache, iconFront(Zap, 0.7)), 84, 50, 'cache content engine proxy cdn accelerator'],
  ['modem', 'Modem', 'modems_and_phones.modem', slabR(GL.modem), 72, 34, 'modem dsl cable dial-up isp'],
  ['wlc', 'Wireless LAN controller', 'wireless.wireless_lan_controller', slabR(GL.workgroup, iconFront(Wifi, 0.75)), 84, 50, 'wlc wireless lan controller wifi ap management'],
  // Security
  ['firewall', 'Firewall', 'security.firewall', wallR(), 64, 54, 'firewall security brick wall perimeter'],
  ['ngfw', 'Next-gen firewall', 'security.next_generation_firewall', wallR(ShieldCheck), 64, 58, 'ngfw next generation firewall utm security'],
  ['asa', 'Firewall appliance (ASA style)', 'security.pix_firewall', slabR(GL.through, (r, p) => bricks(r.x + r.w * 0.05, r.y + r.h * 0.15, r.w * 0.9, r.h * 0.7, p, 2)), 84, 50, 'asa pix firewall appliance security adaptive'],
  ['ips', 'IPS / IDS sensor', 'security.ids', slabR(GL.through, iconFront(Eye, 0.75)), 84, 50, 'ips ids intrusion prevention detection sensor'],
  ['vpnConcentrator', 'VPN concentrator', 'security.vpn_concentrator', slabR(GL.tunnel, iconFront(Lock, 0.75)), 84, 50, 'vpn concentrator remote access ipsec ssl tunnel'],
  // Wireless
  ['accessPoint', 'Wireless access point', 'wireless.access_point', apR, 64, 52, 'access point ap wifi wireless wlan radio'],
  ['radioTower', 'Radio tower', 'wireless.radio_tower', towerRadioR, 48, 72, 'radio tower antenna cell mast microwave'],
  ['satellite', 'Satellite', 'wireless.satellite', satelliteR, 72, 56, 'satellite vsat orbit uplink'],
  // Endpoints
  ['pc', 'PC / workstation', 'computers_and_peripherals.pc', pcR(), 60, 56, 'pc workstation desktop computer client host'],
  ['softphone', 'Softphone', 'modems_and_phones.softphone', pcR(Phone), 60, 56, 'softphone voip client pc phone'],
  ['laptop', 'Laptop', 'computers_and_peripherals.laptop', laptopR, 66, 46, 'laptop notebook computer client mobile'],
  ['smartphone', 'Smartphone', 'modems_and_phones.cell_phone', smartphoneR, 30, 52, 'smartphone mobile phone cell handset'],
  ['ipPhone', 'IP phone', 'modems_and_phones.ip_phone', ipPhoneR, 60, 48, 'ip phone voip desk telephone handset'],
  ['videoEndpoint', 'Video endpoint', 'misc.video_endpoint', videoR, 64, 60, 'video conference endpoint telepresence camera codec'],
  ['printer', 'Printer', 'computers_and_peripherals.printer', printerR, 62, 54, 'printer print peripheral'],
  ['user', 'User', 'people.standing_man', userR, 40, 50, 'user person people end user client'],
  // Servers
  ['server', 'Server', 'servers.standard_host', towerR(), 44, 64, 'server host tower compute'],
  ['fileServer', 'File server', 'servers.fileserver', towerR(iconFront(Folder)), 44, 64, 'file server share smb nfs'],
  ['webServer', 'Web server', 'servers.www_server', towerR(iconFront(Globe)), 44, 64, 'web server www http https'],
  ['dnsServer', 'DNS server', 'servers.server_with_router', towerR(textFront('DNS')), 44, 64, 'dns domain name server resolver'],
  ['dhcpServer', 'DHCP server', 'servers.server_with_router', towerR(textFront('DHCP')), 44, 64, 'dhcp ip address server ipam'],
  ['aaaServer', 'AAA / identity server', 'servers.secure_endpoint', towerR(iconFront(KeyRound)), 44, 64, 'aaa radius tacacs ise identity nac authentication'],
  ['mailServer', 'Mail server', 'servers.communications_server', towerR(iconFront(Mail)), 44, 64, 'mail email smtp exchange server'],
  ['callManager', 'Call manager', 'servers.unity_server', towerR(iconFront(Phone)), 44, 64, 'call manager ucm pbx ip telephony voice server'],
  ['nms', 'Network management', 'servers.network_management', towerR(iconFront(Activity)), 44, 64, 'nms network management monitoring snmp controller'],
  ['nas', 'NAS', 'storage.nas', towerR(iconFront(HardDrive)), 44, 64, 'nas network attached storage file disk'],
  ['mainframe', 'Mainframe', 'computers_and_peripherals.mainframe', mainframeR, 80, 70, 'mainframe host legacy ibm z'],
  ['storage', 'Storage array (SAN)', 'storage.fc_storage', storageR, 56, 64, 'san storage array disk fibre channel block'],
  ['database', 'Database', 'storage.relational_database', databaseR, 50, 60, 'database db sql storage'],
  // Sites & clouds
  ['cloud', 'Cloud', 'storage.cloud', cloudR, 110, 66, 'cloud internet network wan isp'],
  ['wan', 'WAN link', 'misc.lightning', wanR, 34, 56, 'wan serial link lightning bolt circuit'],
  ['building', 'Office building', 'buildings.generic_building', buildingR, 50, 70, 'building hq headquarters office branch site campus'],
  ['home', 'Home office', 'buildings.small_business', homeR, 56, 50, 'home office teleworker remote house soho'],
];

const shapes: ShapeDef[] = ENTRIES.map(([name, label, stencil, render]) =>
  shape(`cisco.${name}`, label, `shape=mxgraph.cisco.${stencil};${STYLE}`, render, { textPlacement: 'below', boxHit: true }),
);

const DEVICE: Partial<ElementStyle> = { fill: BLUE, stroke: WHITE, strokeWidth: 1.5, fontSize: 12, textColor: '#1e293b' };
const PRESET: Record<string, Partial<ElementStyle>> = {
  cloud: { fill: '#e8f1fa', stroke: BLUE, strokeWidth: 2, fontSize: 12, textColor: '#1e293b' },
};

const libraries: ShapeLibrary[] = [
  {
    id: 'cisco',
    name: 'Network (Cisco style)',
    items: ENTRIES.map(([name, label, , , w, h, keywords]) =>
      item(`cisco.${name}`, label, w, h, {
        style: PRESET[name] ?? DEVICE,
        text: name === 'cloud' ? 'Internet' : undefined,
        keywords: `cisco network device ${keywords}`,
      }),
    ),
  },
];

export { shapes, libraries };
