/**
 * Clipart: flat, multi-colour illustrations (people, devices, office items,
 * weather, transport, buildings & nature). Each drawing is authored in a
 * 100×100 art box and scaled uniformly (centred) into the element bounds, so
 * it never distorts. Colours are fixed per illustration; the label goes below.
 */
import type { ReactNode } from 'react';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { cloudPath } from '../kit';
import { type Pt, f, item, pathOf, starPts } from './_kit2';

// ---------------------------------------------------------------------------
// Palette & primitives (all in 100×100 art units)
// ---------------------------------------------------------------------------

const K = {
  skin: '#f4c7a1',
  skin2: '#c68b5e',
  hair: '#3f2a1d',
  hair2: '#a16207',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  sky: '#bfdbfe',
  slate: '#334155',
  dark: '#1e293b',
  grey: '#94a3b8',
  light: '#e2e8f0',
  pale: '#f1f5f9',
  white: '#ffffff',
  yellow: '#facc15',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  darkred: '#b91c1c',
  green: '#22c55e',
  darkgreen: '#15803d',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  pink: '#ec4899',
  brown: '#92400e',
  wood: '#b45309',
  tan: '#d6a46c',
};

const R = (x: number, y: number, w: number, h: number, fill: string, rx = 0, o?: number) => (
  <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} fillOpacity={o} />
);
const C = (cx: number, cy: number, r: number, fill: string, o?: number) => <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={o} />;
const E = (cx: number, cy: number, rx: number, ry: number, fill: string, o?: number) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} fillOpacity={o} />
);
const P = (d: string, fill: string, o?: number) => <path d={d} fill={fill} fillOpacity={o} />;
/** Stroked line art with round caps & joins. */
const S = (d: string, stroke: string, w = 3, o?: number) => (
  <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeOpacity={o} strokeLinecap="round" strokeLinejoin="round" />
);
/** Translucent black shade (right-hand / underside faces). */
const Sh = (d: string, o = 0.12) => P(d, '#000', o);
const poly = (pts: readonly Pt[]) => pathOf(pts);

/** Gear outline with `n` teeth. */
function gearD(cx: number, cy: number, r0: number, r1: number, n: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 4; i++) {
    const a = ((i - 0.5) / (n * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? r1 : r0;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pathOf(pts);
}

/** Cloud blob fitted into (x, y, w, h). */
const cloudAt = (x: number, y: number, w: number, h: number, fill: string, o?: number) => (
  <path d={cloudPath(w, h)} transform={`translate(${x} ${y})`} fill={fill} fillOpacity={o} />
);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

interface Figure {
  shirt: string;
  hair?: string;
  skin?: string;
  long?: boolean;
  suit?: boolean;
}

/** Head-and-shoulders figure in the full 100×100 box. */
function figure({ shirt, hair = K.hair, skin = K.skin, long, suit }: Figure) {
  return (
    <>
      {long && P('M31,36 Q29,12 50,12 Q71,12 69,36 V58 Q50,64 31,58 Z', hair)}
      {P('M22,98 V78 Q22,56 50,56 Q78,56 78,78 V98 Z', shirt)}
      {Sh('M50,56 Q78,56 78,78 V98 H50 Z', 0.1)}
      {suit && (
        <>
          {P('M41,56 L50,76 L59,56 Z', K.white)}
          {P('M48,58 H52 L54,74 L50,80 L46,74 Z', K.red)}
        </>
      )}
      {R(44, 44, 12, 14, skin)}
      {Sh('M44,50 H56 V54 Q50,58 44,54 Z', 0.12)}
      {C(50, 32, 16, skin)}
      {long
        ? P('M34,32 Q35,15 50,15 Q65,15 66,32 Q57,25 47,22 Q41,27 34,32 Z', hair)
        : P('M34,31 Q33,14 50,14 Q67,14 66,31 Q63,22 50,23 Q38,22 34,31 Z', hair)}
    </>
  );
}

/** A figure scaled & positioned (for groups and avatars). */
const placed = (x: number, y: number, k: number, fig: Figure) => <g transform={`translate(${x} ${y}) scale(${k})`}>{figure(fig)}</g>;

function avatar(bg: string, fig: Figure) {
  // Shoulders clipped to the circle by drawing them as a circle segment.
  return (
    <>
      {C(50, 50, 46, bg)}
      {fig.long && P('M33,40 Q31,18 50,18 Q69,18 67,40 V62 Q50,68 33,62 Z', fig.hair ?? K.hair)}
      {P('M13.5,78 Q18,60 50,60 Q82,60 86.5,78 A46,46 0 0 1 13.5,78 Z', fig.shirt)}
      {R(44, 48, 12, 14, fig.skin ?? K.skin)}
      {C(50, 37, 15, fig.skin ?? K.skin)}
      {fig.long
        ? P('M35,37 Q36,21 50,21 Q64,21 65,37 Q56,30 47,27 Q41,32 35,37 Z', fig.hair ?? K.hair)
        : P('M35,36 Q34,20 50,20 Q66,20 65,36 Q62,27 50,28 Q38,27 35,36 Z', fig.hair ?? K.hair)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reusable bits
// ---------------------------------------------------------------------------

const wheel = (cx: number, cy: number, r: number) => (
  <>
    {C(cx, cy, r, K.dark)}
    {C(cx, cy, r * 0.45, K.grey)}
  </>
);

const screen = (x: number, y: number, w: number, h: number) => (
  <>
    {R(x, y, w, h, K.sky)}
    {P(`M${x},${y} H${x + w * 0.55} L${x + w * 0.25},${y + h} H${x} Z`, K.white, 0.35)}
  </>
);

const textLines = (x: number, y: number, w: number, n: number, gap = 7, c = K.grey) =>
  Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * gap} width={i === n - 1 ? w * 0.6 : w} height={2.6} rx={1.3} fill={c} />);

const sunAt = (cx: number, cy: number, r: number, rays = true) => (
  <>
    {rays &&
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M${f(cx + Math.cos(a) * r * 1.3)},${f(cy + Math.sin(a) * r * 1.3)} L${f(cx + Math.cos(a) * r * 1.7)},${f(cy + Math.sin(a) * r * 1.7)}`}
            stroke={K.amber}
            strokeWidth={r * 0.22}
            strokeLinecap="round"
          />
        );
      })}
    {C(cx, cy, r, K.yellow)}
    {Sh(`M${cx + r},${cy} A${r},${r} 0 0 1 ${cx - r},${cy} Q${cx},${cy + r * 0.5} ${cx + r},${cy} Z`, 0.06)}
  </>
);

const greyCloud = (dy = 0, fill = K.light, shade = 0.08) => (
  <>
    {cloudAt(8, 12 + dy, 84, 52, fill)}
    {Sh(`M14,${f(48 + dy)} Q50,${f(66 + dy)} 86,${f(48 + dy)} Q92,${f(58 + dy)} 78,${f(60 + dy)} Q50,${f(70 + dy)} 22,${f(60 + dy)} Q10,${f(58 + dy)} 14,${f(48 + dy)} Z`, shade)}
  </>
);

const building = (x: number, y: number, w: number, h: number, fill: string, cols: number, rows: number, win = K.sky) => {
  const cw = w / cols;
  const rh = (h - 8) / rows;
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(<rect key={`${r}-${c}`} x={f(x + c * cw + cw * 0.22)} y={f(y + 4 + r * rh + rh * 0.2)} width={f(cw * 0.56)} height={f(rh * 0.55)} rx={0.8} fill={win} />);
  return (
    <>
      {R(x, y, w, h, fill)}
      {out}
      {Sh(`M${x + w * 0.7},${y} H${x + w} V${y + h} H${x + w * 0.7} Z`, 0.1)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Catalogue: [name, label, group, keywords, w, h, art]
// ---------------------------------------------------------------------------

type Group = 'people' | 'devices' | 'office' | 'weather' | 'transport' | 'places';
type Clip = [string, string, Group, string, number, number, () => ReactNode, string];

const CLIPS: Clip[] = [
  // ----- People -----------------------------------------------------------
  ['man', 'Man', 'people', 'person male user guy', 64, 64, () => figure({ shirt: K.blue }), 'people.man_1'],
  ['woman', 'Woman', 'people', 'person female user lady', 64, 64, () => figure({ shirt: K.pink, hair: K.hair2, long: true }), 'people.woman_1'],
  ['business', 'Business person', 'people', 'manager executive suit tie boss', 64, 64, () => figure({ shirt: K.slate, suit: true }), 'people.suit_man'],
  [
    'developer',
    'Developer',
    'people',
    'programmer engineer coder laptop it',
    64,
    64,
    () => (
      <>
        {placed(18, -2, 0.64, { shirt: K.teal })}
        {R(18, 54, 64, 38, K.slate, 4)}
        {R(22, 58, 56, 30, K.dark)}
        {S('M30,66 L26,70 L30,74 M70,66 L74,70 L70,74 M46,76 L54,64', K.green, 2.4)}
        {P('M8,92 H92 L86,98 H14 Z', K.grey)}
      </>
    ),
    'people.programmer',
  ],
  [
    'support',
    'Support agent',
    'people',
    'helpdesk call center headset customer service operator',
    64,
    64,
    () => (
      <>
        {figure({ shirt: K.violet, hair: K.hair2, long: true })}
        {S('M32,34 Q32,12 50,12 Q68,12 68,34', K.dark, 3.5)}
        {R(28, 27, 8, 14, K.dark, 3)}
        {R(64, 27, 8, 14, K.dark, 3)}
        {S('M33,40 Q35,48 45,48', K.dark, 2.5)}
        {C(46, 48, 2.6, K.dark)}
      </>
    ),
    'people.call_center_agent',
  ],
  [
    'team',
    'Team',
    'people',
    'group people users staff colleagues crowd',
    80,
    64,
    () => (
      <>
        {placed(-6, 2, 0.62, { shirt: K.teal, hair: K.hair2, long: true })}
        {placed(44, 2, 0.62, { shirt: K.violet })}
        {placed(16, 20, 0.8, { shirt: K.blue })}
      </>
    ),
    'people.meeting',
  ],
  ['avatarMan', 'Avatar (man)', 'people', 'profile picture account user circle', 56, 56, () => avatar('#dbeafe', { shirt: K.blue }), 'people.man_1'],
  [
    'avatarWoman',
    'Avatar (woman)',
    'people',
    'profile picture account user circle female',
    56,
    56,
    () => avatar('#fce7f3', { shirt: K.pink, hair: K.hair2, long: true }),
    'people.woman_1',
  ],
  [
    'avatar',
    'Avatar (generic)',
    'people',
    'profile placeholder anonymous account user silhouette',
    56,
    56,
    () => avatar(K.light, { shirt: K.grey, skin: K.grey, hair: K.grey }),
    'people.man_1',
  ],

  // ----- Devices ----------------------------------------------------------
  [
    'desktop',
    'Desktop PC',
    'devices',
    'computer workstation monitor tower pc',
    72,
    64,
    () => (
      <>
        {R(4, 16, 66, 46, K.slate, 4)}
        {screen(8, 20, 58, 36)}
        {P('M31,62 H43 L46,74 H28 Z', K.grey)}
        {R(22, 74, 30, 5, K.slate, 2)}
        {R(76, 24, 20, 56, K.slate, 3)}
        {R(80, 30, 12, 4, K.dark, 1)}
        {R(80, 37, 12, 4, K.dark, 1)}
        {C(86, 70, 2.5, K.green)}
        {Sh('M90,24 H93 Q96,24 96,27 V77 Q96,80 93,80 H90 Z', 0.15)}
      </>
    ),
    'computer.workstation',
  ],
  [
    'laptop',
    'Laptop',
    'devices',
    'notebook computer macbook portable',
    72,
    56,
    () => (
      <>
        {R(16, 18, 68, 46, K.slate, 4)}
        {screen(20, 22, 60, 38)}
        {P('M6,66 H94 L88,78 H12 Z', K.grey)}
        {R(42, 66, 16, 3, K.slate, 1.5)}
        {Sh('M6,66 H94 L93,68 H7 Z', 0.15)}
      </>
    ),
    'computer.laptop',
  ],
  [
    'tablet',
    'Tablet',
    'devices',
    'ipad tablet touch device',
    56,
    64,
    () => (
      <>
        {R(22, 8, 56, 84, K.dark, 7)}
        {screen(27, 15, 46, 66)}
        {C(50, 86, 2.5, K.grey)}
      </>
    ),
    'computer.tablet',
  ],
  [
    'smartphone',
    'Smartphone',
    'devices',
    'mobile phone cell iphone android',
    48,
    64,
    () => (
      <>
        {R(31, 6, 38, 88, K.dark, 8)}
        {screen(35, 15, 30, 68)}
        {R(44, 10, 12, 2, K.grey, 1)}
        {C(50, 88, 2.2, K.grey)}
      </>
    ),
    'computer.smartphone',
  ],
  [
    'serverTower',
    'Server tower',
    'devices',
    'server computer host machine',
    48,
    64,
    () => (
      <>
        {R(28, 6, 44, 88, K.slate, 4)}
        {R(34, 14, 32, 7, K.dark, 1.5)}
        {R(34, 24, 32, 7, K.dark, 1.5)}
        {R(34, 34, 32, 7, K.dark, 1.5)}
        {C(62, 17.5, 1.6, K.green)}
        {C(62, 27.5, 1.6, K.green)}
        {C(62, 37.5, 1.6, K.amber)}
        {S('M36,52 H64 M36,58 H64 M36,64 H64 M36,70 H64', K.dark, 2)}
        {C(50, 84, 3.5, K.blue)}
        {Sh('M64,6 H68 Q72,6 72,10 V90 Q72,94 68,94 H64 Z', 0.15)}
      </>
    ),
    'computer.server_tower',
  ],
  [
    'printer',
    'Printer',
    'devices',
    'print paper office device',
    64,
    56,
    () => (
      <>
        {P('M28,40 V10 H62 L72,20 V40 Z', K.white)}
        {S('M28,40 V10 H62 L72,20 V40', K.grey, 2)}
        {R(10, 36, 80, 34, K.light, 6)}
        {Sh('M10,58 H90 V64 Q90,70 84,70 H16 Q10,70 10,64 Z', 0.08)}
        {R(22, 58, 56, 6, K.slate, 2)}
        {R(28, 62, 44, 28, K.white)}
        {textLines(33, 70, 34, 3, 6)}
        {C(80, 46, 2.5, K.green)}
        {R(64, 44, 10, 4, K.grey, 1)}
      </>
    ),
    'computer.printer',
  ],
  [
    'router',
    'Router',
    'devices',
    'wifi wireless modem gateway network box',
    64,
    56,
    () => (
      <>
        {S('M26,54 L20,18 M74,54 L80,18', K.slate, 4)}
        {R(10, 50, 80, 26, K.navy, 7)}
        {Sh('M10,64 H90 V69 Q90,76 83,76 H17 Q10,76 10,69 Z', 0.18)}
        {C(24, 62, 2.4, K.green)}
        {C(32, 62, 2.4, K.green)}
        {C(40, 62, 2.4, K.amber)}
        {S('M58,62 H80', K.sky, 2.4)}
        {S('M42,30 Q50,24 58,30 M37,24 Q50,14 63,24', K.blue, 2.8)}
      </>
    ),
    'computer.router',
  ],
  [
    'smartwatch',
    'Smartwatch',
    'devices',
    'watch wearable fitness tracker',
    48,
    64,
    () => (
      <>
        {R(38, 4, 24, 92, K.slate, 6)}
        {R(28, 26, 44, 48, K.dark, 11)}
        {R(32, 30, 36, 40, K.teal, 8)}
        {R(72, 42, 4, 12, K.grey, 2)}
        {S('M50,40 V50 L57,55', K.white, 3)}
      </>
    ),
    'computer.watch',
  ],
  [
    'keyboard',
    'Keyboard',
    'devices',
    'keys typing input peripheral',
    80,
    40,
    () => (
      <>
        {R(4, 30, 92, 40, K.slate, 5)}
        {[0, 1, 2].map((r) =>
          Array.from({ length: 10 }, (_, c) => <rect key={`${r}-${c}`} x={9 + c * 8.4} y={35 + r * 8} width={6.6} height={6} rx={1.2} fill={K.light} />),
        )}
        {R(24, 59, 52, 6, K.light, 1.2)}
      </>
    ),
    'computer.keyboard',
  ],
  [
    'mouse',
    'Mouse',
    'devices',
    'computer mouse pointer peripheral',
    40,
    56,
    () => (
      <>
        {P('M50,10 Q76,10 76,40 V64 Q76,92 50,92 Q24,92 24,64 V40 Q24,10 50,10 Z', K.light)}
        {Sh('M50,10 Q76,10 76,40 V64 Q76,92 50,92 Z', 0.1)}
        {S('M24,42 H76 M50,10 V42', K.grey, 2)}
        {R(47, 18, 6, 14, K.slate, 3)}
      </>
    ),
    'computer.mouse',
  ],
  [
    'headphones',
    'Headphones',
    'devices',
    'headset audio music earphones',
    56,
    56,
    () => (
      <>
        {S('M22,60 V48 Q22,16 50,16 Q78,16 78,48 V60', K.slate, 6)}
        {R(12, 50, 18, 32, K.red, 8)}
        {R(70, 50, 18, 32, K.red, 8)}
        {R(22, 54, 8, 24, K.dark, 3)}
        {R(70, 54, 8, 24, K.dark, 3)}
      </>
    ),
    'computer.headphones',
  ],
  [
    'camera',
    'Camera',
    'devices',
    'photo photography dslr picture',
    64,
    52,
    () => (
      <>
        {P('M34,30 L40,18 H60 L66,30 Z', K.slate)}
        {R(8, 28, 84, 56, K.slate, 8)}
        {R(8, 40, 84, 6, K.dark, 0, 0.4)}
        {C(50, 56, 20, K.dark)}
        {C(50, 56, 14, K.navy)}
        {C(50, 56, 7, K.blue)}
        {C(45, 51, 3, K.white, 0.7)}
        {R(74, 33, 11, 6, K.yellow, 1.5)}
      </>
    ),
    'computer.camera',
  ],
  [
    'tv',
    'TV / display',
    'devices',
    'television monitor screen display',
    72,
    60,
    () => (
      <>
        {R(4, 12, 92, 60, K.dark, 4)}
        {screen(8, 16, 84, 52)}
        {P('M42,72 H58 L62,82 H38 Z', K.slate)}
        {R(28, 82, 44, 4, K.slate, 2)}
      </>
    ),
    'computer.monitor',
  ],
  [
    'gamepad',
    'Game controller',
    'devices',
    'gamepad joystick console gaming play',
    64,
    48,
    () => (
      <>
        {P('M30,30 H70 Q88,30 92,56 Q96,80 82,80 Q74,80 66,66 H34 Q26,80 18,80 Q4,80 8,56 Q12,30 30,30 Z', K.slate)}
        {Sh('M8,56 Q12,66 34,66 H66 Q88,66 92,56 Q96,80 82,80 Q74,80 66,66 H34 Q26,80 18,80 Q4,80 8,56 Z', 0.15)}
        {R(21, 46, 18, 6, K.light, 1.5)}
        {R(27, 40, 6, 18, K.light, 1.5)}
        {C(70, 42, 3.6, K.green)}
        {C(78, 49, 3.6, K.red)}
        {C(62, 49, 3.6, K.blue)}
        {C(70, 56, 3.6, K.yellow)}
      </>
    ),
    'computer.game_controller',
  ],
  [
    'usb',
    'USB stick',
    'devices',
    'flash drive thumb drive pen drive memory stick',
    40,
    64,
    () => (
      <>
        {R(38, 6, 24, 24, K.grey, 2)}
        {R(43, 12, 5, 5, K.slate)}
        {R(52, 12, 5, 5, K.slate)}
        {R(30, 28, 40, 64, K.blue, 6)}
        {R(36, 46, 28, 30, K.white, 3, 0.9)}
        {Sh('M62,28 H64 Q70,28 70,34 V86 Q70,92 64,92 H62 Z', 0.15)}
      </>
    ),
    'computer.usb_stick',
  ],
  [
    'hdd',
    'Hard drive',
    'devices',
    'hdd disk storage drive platter',
    52,
    64,
    () => (
      <>
        {R(16, 8, 68, 84, K.grey, 6)}
        {C(50, 42, 26, K.light)}
        {C(50, 42, 18, K.pale)}
        {C(50, 42, 5, K.slate)}
        {S('M74,78 L70,52 L56,46', K.slate, 4)}
        {C(74, 78, 4, K.slate)}
        {[22, 78].map((x) => [14, 86].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill={K.slate} />))}
      </>
    ),
    'computer.hard_drive',
  ],

  // ----- Office -----------------------------------------------------------
  [
    'desk',
    'Desk',
    'office',
    'table workstation furniture office',
    72,
    56,
    () => (
      <>
        {R(4, 36, 92, 9, K.wood, 2)}
        {R(10, 45, 7, 47, K.brown)}
        {R(58, 45, 32, 47, K.wood)}
        {S('M58,61 H90 M58,77 H90', K.brown, 2)}
        {S('M70,53 H78 M70,69 H78 M70,85 H78', K.tan, 3)}
        {Sh('M4,43 H96 V45 H4 Z', 0.2)}
      </>
    ),
    'office.desk',
  ],
  [
    'chair',
    'Office chair',
    'office',
    'seat furniture swivel',
    48,
    64,
    () => (
      <>
        {R(30, 6, 40, 42, K.slate, 9)}
        {R(24, 48, 52, 11, K.dark, 5)}
        {R(46, 59, 8, 16, K.grey)}
        {S('M50,76 L24,84 M50,76 L76,84 M50,76 L50,88', K.slate, 4)}
        {C(24, 88, 4, K.dark)}
        {C(76, 88, 4, K.dark)}
        {C(50, 92, 4, K.dark)}
      </>
    ),
    'office.chair',
  ],
  [
    'documents',
    'Documents',
    'office',
    'paper stack files report pages',
    52,
    64,
    () => (
      <>
        {R(30, 6, 52, 66, K.light, 2)}
        {R(24, 14, 52, 66, K.pale, 2)}
        {P('M18,22 H60 L70,32 V94 H18 Z', K.white)}
        {S('M18,22 H60 L70,32 V94 H18 Z', K.grey, 1.6)}
        {P('M60,22 V32 H70 Z', K.light)}
        {textLines(25, 40, 38, 6, 8)}
      </>
    ),
    'office.document',
  ],
  [
    'folder',
    'Folder',
    'office',
    'directory files archive',
    64,
    52,
    () => (
      <>
        {P('M8,20 H40 L47,28 H92 V84 H8 Z', K.amber)}
        {R(14, 30, 72, 30, K.white)}
        {P('M8,38 H92 V84 Q92,88 88,88 H12 Q8,88 8,84 Z', K.yellow)}
      </>
    ),
    'office.folder',
  ],
  [
    'clipboard',
    'Clipboard',
    'office',
    'checklist todo tasks form',
    48,
    64,
    () => (
      <>
        {R(18, 10, 64, 86, K.wood, 6)}
        {R(25, 20, 50, 70, K.white, 2)}
        {R(37, 4, 26, 14, K.grey, 3)}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            {S(`M31,${36 + i * 16} L35,${40 + i * 16} L42,${31 + i * 16}`, K.green, 3)}
            {R(47, 34 + i * 16, 22, 3, K.grey, 1.5)}
          </g>
        ))}
      </>
    ),
    'office.clipboard',
  ],
  [
    'calendar',
    'Calendar',
    'office',
    'date schedule event planner month day',
    56,
    56,
    () => (
      <>
        {R(10, 16, 80, 76, K.white, 7)}
        {P('M10,23 Q10,16 17,16 H83 Q90,16 90,23 V36 H10 Z', K.red)}
        {R(10, 16, 80, 76, 'none', 7)}
        <rect x={10} y={16} width={80} height={76} rx={7} fill="none" stroke={K.grey} strokeWidth={1.6} />
        {R(26, 8, 6, 16, K.slate, 3)}
        {R(68, 8, 6, 16, K.slate, 3)}
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}-${c}`} x={18 + c * 13.5} y={44 + r * 14} width={10} height={9} rx={1.5} fill={r === 1 && c === 2 ? K.blue : K.light} />
          )),
        )}
      </>
    ),
    'office.calendar',
  ],
  [
    'clock',
    'Clock',
    'office',
    'time watch hour deadline',
    56,
    56,
    () => (
      <>
        {C(50, 50, 44, K.slate)}
        {C(50, 50, 37, K.white)}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={f(50 + Math.cos(a) * 31)} cy={f(50 + Math.sin(a) * 31)} r={i % 3 ? 1.4 : 2.4} fill={K.slate} />;
        })}
        {S('M50,50 V28 M50,50 L64,58', K.dark, 4)}
        {S('M50,50 L36,68', K.red, 1.8)}
        {C(50, 50, 3.5, K.red)}
      </>
    ),
    'office.clock',
  ],
  [
    'briefcase',
    'Briefcase',
    'office',
    'business work job bag portfolio',
    60,
    52,
    () => (
      <>
        {S('M38,30 V20 Q38,16 42,16 H58 Q62,16 62,20 V30', K.brown, 5)}
        {R(8, 28, 84, 60, K.wood, 7)}
        {R(8, 48, 84, 6, K.brown)}
        {R(43, 44, 14, 14, K.yellow, 2)}
        {Sh('M70,28 H85 Q92,28 92,35 V81 Q92,88 85,88 H70 Z', 0.12)}
      </>
    ),
    'office.briefcase',
  ],
  [
    'mail',
    'Envelope',
    'office',
    'email mail letter message inbox',
    60,
    48,
    () => (
      <>
        {R(8, 22, 84, 58, K.light, 5)}
        {P('M8,78 L42,50 H58 L92,78 Z', K.grey, 0.35)}
        {P('M10,24 L50,56 L90,24 Z', K.white)}
        {S('M10,24 L50,56 L90,24', K.grey, 2)}
        <rect x={8} y={22} width={84} height={58} rx={5} fill="none" stroke={K.grey} strokeWidth={2} />
      </>
    ),
    'office.envelope',
  ],
  [
    'phone',
    'Desk phone',
    'office',
    'telephone call voip landline',
    60,
    52,
    () => (
      <>
        {P('M14,88 L22,44 H78 L86,88 Z', K.slate)}
        {R(8, 26, 84, 16, K.dark, 8)}
        {R(8, 26, 20, 22, K.dark, 6)}
        {R(72, 26, 20, 22, K.dark, 6)}
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={36 + c * 10} y={54 + r * 9} width={7} height={6} rx={1.5} fill={K.light} />))}
        {R(24, 56, 8, 22, K.sky, 1.5)}
      </>
    ),
    'office.phone',
  ],
  [
    'idea',
    'Light bulb',
    'office',
    'idea innovation insight lightbulb creativity',
    48,
    64,
    () => (
      <>
        {S('M50,4 V0 M18,14 L14,10 M82,14 L86,10 M8,40 H3 M92,40 H97', K.amber, 3)}
        {P('M50,10 C31,10 22,24 22,38 C22,52 34,57 36,68 H64 C66,57 78,52 78,38 C78,24 69,10 50,10 Z', K.yellow)}
        {S('M31,30 Q35,19 46,17', K.white, 3, 0.8)}
        {S('M42,66 V50 L46,44 L50,50 L54,44 L58,50 V66', K.amber, 2.2)}
        {R(37, 68, 26, 8, K.grey, 2)}
        {R(39, 76, 22, 7, K.light, 2)}
        {R(43, 83, 14, 6, K.slate, 3)}
      </>
    ),
    'office.lightbulb',
  ],
  [
    'coffee',
    'Coffee cup',
    'office',
    'mug drink tea break cafe',
    52,
    56,
    () => (
      <>
        {S('M38,22 Q34,16 38,10 M50,22 Q46,16 50,10 M62,22 Q58,16 62,10', K.grey, 2.5)}
        {S('M72,44 Q88,44 86,58 Q84,70 70,70', K.red, 6)}
        {P('M18,34 H74 V64 Q74,86 46,86 Q18,86 18,64 Z', K.red)}
        {Sh('M56,34 H74 V64 Q74,86 46,86 Q62,80 60,64 Z', 0.12)}
        {E(46, 34, 28, 5, K.brown)}
        {E(46, 89, 36, 5, K.light)}
      </>
    ),
    'office.coffee',
  ],
  [
    'books',
    'Books',
    'office',
    'library education reading knowledge documentation',
    56,
    56,
    () => (
      <>
        {R(12, 22, 16, 70, K.red, 2)}
        {R(30, 14, 18, 78, K.blue, 2)}
        {R(50, 26, 14, 66, K.green, 2)}
        {P('M66,92 L74,30 L88,32 L80,94 Z', K.amber)}
        {S('M12,32 H28 M12,80 H28 M30,24 H48 M30,82 H48 M50,36 H64 M50,82 H64', K.white, 2, 0.7)}
        {R(6, 92, 88, 4, K.slate, 1)}
      </>
    ),
    'office.books',
  ],
  [
    'pen',
    'Pen',
    'office',
    'pencil write edit sign',
    48,
    56,
    () => (
      <>
        {P('M68,8 L92,32 L40,84 L16,60 Z', K.blue)}
        {Sh('M80,20 L92,32 L40,84 L28,72 Z', 0.15)}
        {P('M16,60 L40,84 L8,92 Z', K.tan)}
        {P('M8,92 L12,78 L22,88 Z', K.dark)}
        {P('M68,8 L74,2 L98,26 L92,32 Z', K.slate)}
      </>
    ),
    'office.pencil',
  ],
  [
    'trophy',
    'Trophy',
    'office',
    'award prize winner cup achievement',
    48,
    56,
    () => (
      <>
        {S('M28,22 H16 Q14,44 34,48 M72,22 H84 Q86,44 66,48', K.amber, 5)}
        {P('M26,10 H74 V34 Q74,60 50,62 Q26,60 26,34 Z', K.yellow)}
        {Sh('M56,10 H74 V34 Q74,60 50,62 Q60,50 58,30 Z', 0.1)}
        {R(45, 60, 10, 14, K.amber)}
        {R(32, 72, 36, 8, K.amber, 2)}
        {R(26, 80, 48, 12, K.brown, 2)}
      </>
    ),
    'office.trophy',
  ],
  [
    'target',
    'Target',
    'office',
    'goal objective aim bullseye',
    56,
    56,
    () => (
      <>
        {C(46, 54, 40, K.red)}
        {C(46, 54, 30, K.white)}
        {C(46, 54, 20, K.red)}
        {C(46, 54, 10, K.white)}
        {C(46, 54, 4, K.red)}
        {S('M46,54 L86,14', K.slate, 3.5)}
        {P('M86,14 L80,6 L90,4 L96,2 L94,12 Z', K.amber)}
      </>
    ),
    'office.target',
  ],
  [
    'rocket',
    'Rocket',
    'office',
    'launch startup space deploy release',
    48,
    64,
    () => (
      <>
        {P('M40,76 Q50,100 60,76 Z', K.orange)}
        {P('M44,76 Q50,92 56,76 Z', K.yellow)}
        {P('M34,52 L18,74 L36,72 Z', K.red)}
        {P('M66,52 L82,74 L64,72 Z', K.red)}
        {P('M50,4 Q70,22 68,58 L64,76 H36 L32,58 Q30,22 50,4 Z', K.light)}
        {Sh('M50,4 Q70,22 68,58 L64,76 H52 Q60,40 50,4 Z', 0.1)}
        {C(50, 36, 9, K.navy)}
        {C(50, 36, 6, K.blue)}
        {P('M44,76 H56 V82 H44 Z', K.slate)}
      </>
    ),
    'office.rocket',
  ],
  [
    'chartBoard',
    'Chart board',
    'office',
    'presentation whiteboard statistics kpi report bar chart',
    64,
    60,
    () => (
      <>
        {S('M30,72 L20,96 M70,72 L80,96 M50,72 V92', K.slate, 3.5)}
        {R(6, 8, 88, 64, K.slate, 4)}
        {R(10, 12, 80, 56, K.white, 2)}
        {R(20, 46, 10, 16, K.blue, 1)}
        {R(36, 34, 10, 28, K.green, 1)}
        {R(52, 40, 10, 22, K.amber, 1)}
        {R(68, 22, 10, 40, K.red, 1)}
        {S('M18,40 L36,26 L52,32 L78,16', K.slate, 2)}
      </>
    ),
    'office.presentation',
  ],
  [
    'money',
    'Money',
    'office',
    'cash coins banknote finance payment cost budget',
    64,
    52,
    () => (
      <>
        {R(4, 24, 64, 40, K.green, 4)}
        {R(10, 30, 52, 28, K.darkgreen, 2, 0.35)}
        {C(36, 44, 10, '#86efac')}
        {S('M36,38 V50 M33,41 Q36,38 39,41 Q33,44 39,47 Q36,50 33,47', K.darkgreen, 1.8)}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            {E(78, 82 - i * 9, 16, 6, K.amber)}
            {E(78, 79 - i * 9, 16, 6, K.yellow)}
          </g>
        ))}
      </>
    ),
    'office.money',
  ],
  [
    'creditCard',
    'Credit card',
    'office',
    'payment debit card bank purchase',
    64,
    44,
    () => (
      <>
        {R(6, 20, 88, 60, K.blue, 7)}
        {R(6, 30, 88, 11, K.dark)}
        {R(16, 50, 14, 11, K.yellow, 2)}
        {R(16, 68, 42, 4, K.white, 2, 0.8)}
        {C(72, 64, 8, K.red, 0.9)}
        {C(82, 64, 8, K.amber, 0.9)}
      </>
    ),
    'office.credit_card',
  ],
  [
    'cart',
    'Shopping cart',
    'office',
    'shop ecommerce basket buy checkout store',
    60,
    56,
    () => (
      <>
        {S('M4,14 H18 L30,68 H82', K.slate, 5)}
        {P('M22,24 H92 L84,56 H28 Z', K.blue)}
        {S('M40,26 L42,54 M58,26 V54 M74,26 L72,54', K.white, 2, 0.6)}
        {C(36, 82, 7, K.slate)}
        {C(76, 82, 7, K.slate)}
      </>
    ),
    'office.cart',
  ],
  [
    'gift',
    'Gift',
    'office',
    'present box reward bonus birthday',
    52,
    56,
    () => (
      <>
        {P('M50,30 Q30,8 26,22 Q24,32 50,30 Z', K.amber)}
        {P('M50,30 Q70,8 74,22 Q76,32 50,30 Z', K.amber)}
        {R(14, 44, 72, 48, K.red, 2)}
        {R(10, 30, 80, 16, K.darkred, 3)}
        {R(44, 30, 12, 62, K.yellow)}
      </>
    ),
    'office.gift',
  ],
  [
    'lock',
    'Padlock',
    'office',
    'lock security secure private password locked',
    48,
    60,
    () => (
      <>
        {S('M32,46 V30 Q32,12 50,12 Q68,12 68,30 V46', K.grey, 8)}
        {R(20, 42, 60, 48, K.amber, 7)}
        {Sh('M60,42 H73 Q80,42 80,49 V83 Q80,90 73,90 H60 Z', 0.12)}
        {C(50, 62, 6, K.dark)}
        {R(47, 62, 6, 14, K.dark, 2)}
      </>
    ),
    'office.padlock',
  ],
  [
    'key',
    'Key',
    'office',
    'access password credential unlock secret',
    64,
    40,
    () => (
      <>
        {C(26, 50, 20, K.amber)}
        {C(22, 50, 7, K.white)}
        {R(42, 45, 52, 10, K.amber, 2)}
        {R(70, 55, 7, 12, K.amber, 1)}
        {R(82, 55, 7, 16, K.amber, 1)}
        {Sh('M42,51 H94 V55 H42 Z', 0.12)}
      </>
    ),
    'office.key',
  ],
  [
    'search',
    'Magnifier',
    'office',
    'search magnifying glass find zoom inspect',
    52,
    52,
    () => (
      <>
        {S('M62,62 L88,88', K.slate, 12)}
        {C(42, 42, 30, K.slate)}
        {C(42, 42, 23, '#dbeafe')}
        {S('M28,34 Q32,24 42,22', K.white, 4, 0.9)}
      </>
    ),
    'office.magnifier',
  ],
  [
    'gear',
    'Gear',
    'office',
    'settings configuration cog options preferences',
    52,
    52,
    () => (
      <>
        {P(gearD(50, 50, 34, 44, 10), K.slate)}
        {C(50, 50, 26, K.grey)}
        {C(50, 50, 12, K.white)}
      </>
    ),
    'office.gear',
  ],

  // ----- Weather ----------------------------------------------------------
  ['sun', 'Sun', 'weather', 'sunny weather clear day bright', 56, 56, () => sunAt(50, 50, 24), 'weather.sunny'],
  ['cloud', 'Cloud', 'weather', 'cloudy weather overcast', 60, 48, () => (
    <>
      {cloudAt(0, 20, 100, 64, '#d5dee8')}
    </>
  ), 'weather.cloudy'],
  [
    'rain',
    'Rain',
    'weather',
    'rainy weather showers drops',
    60,
    60,
    () => (
      <>
        {greyCloud(-6, '#cbd5e1')}
        {[24, 42, 60, 78].map((x, i) => P(`M${x},${70 + (i % 2) * 6} q-4,8 0,11 q4,-3 0,-11 Z`, K.blue))}
      </>
    ),
    'weather.rain',
  ],
  [
    'snow',
    'Snow',
    'weather',
    'snowy weather winter cold flakes',
    60,
    60,
    () => (
      <>
        {greyCloud(-6)}
        {[26, 50, 74].map((x, i) => {
          const y = 76 + (i % 2) * 8;
          return <g key={x}>{S(`M${x - 6},${y} H${x + 6} M${x - 3},${y - 5.2} L${x + 3},${y + 5.2} M${x + 3},${y - 5.2} L${x - 3},${y + 5.2}`, K.blue, 2)}</g>;
        })}
      </>
    ),
    'weather.snow',
  ],
  [
    'storm',
    'Thunderstorm',
    'weather',
    'storm lightning thunder bolt weather',
    60,
    60,
    () => (
      <>
        {greyCloud(-6, K.grey, 0.15)}
        {P('M52,56 L38,78 H50 L44,98 L66,70 H54 L62,56 Z', K.yellow)}
      </>
    ),
    'weather.lightning',
  ],
  [
    'partlyCloudy',
    'Partly cloudy',
    'weather',
    'sun cloud weather partly sunny',
    60,
    56,
    () => (
      <>
        {sunAt(36, 34, 18)}
        {cloudAt(26, 36, 70, 44, K.light)}
        {Sh('M32,68 Q62,82 90,68 Q94,76 82,78 Q60,84 38,78 Q28,76 32,68 Z', 0.08)}
      </>
    ),
    'weather.partly_cloudy',
  ],
  [
    'wind',
    'Wind',
    'weather',
    'windy breeze air gust weather',
    60,
    48,
    () => (
      <>
        {S('M8,36 H62 Q76,36 76,24 Q76,14 66,14 Q58,14 58,22', K.blue, 5)}
        {S('M8,54 H80 Q92,54 92,66 Q92,78 80,78 Q70,78 70,70', K.teal, 5)}
        {S('M18,72 H48', K.grey, 5)}
      </>
    ),
    'weather.wind',
  ],
  [
    'rainbow',
    'Rainbow',
    'weather',
    'rainbow colors weather after rain',
    64,
    44,
    () => (
      <>
        {[K.red, K.orange, K.yellow, K.green, K.blue, K.violet].map((c, i) => {
          const r = 42 - i * 5;
          return <path key={c} d={`M${50 - r},78 A${r},${r} 0 0 1 ${50 + r},78`} fill="none" stroke={c} strokeWidth={5.2} />;
        })}
        {cloudAt(0, 64, 30, 22, K.light)}
        {cloudAt(70, 64, 30, 22, K.light)}
      </>
    ),
    'weather.rainbow',
  ],
  [
    'night',
    'Moon & stars',
    'weather',
    'night moon stars crescent clear sky sleep',
    56,
    56,
    () => (
      <>
        {P('M58,14 A36,36 0 1 0 88,64 A28,28 0 1 1 58,14 Z', K.yellow)}
        {P(poly(starPts(24, 22, 8, 8, 5, 0.45)), K.amber)}
        {P(poly(starPts(80, 22, 5, 5, 5, 0.45)), K.amber)}
        {P(poly(starPts(18, 58, 4, 4, 5, 0.45)), K.amber)}
      </>
    ),
    'weather.night',
  ],

  // ----- Transport --------------------------------------------------------
  [
    'car',
    'Car',
    'transport',
    'automobile vehicle auto sedan drive',
    72,
    44,
    () => (
      <>
        {P('M6,66 V54 Q6,46 14,44 L28,42 L38,28 Q40,26 44,26 H64 Q68,26 70,29 L80,42 Q94,44 94,54 V66 Z', K.red)}
        {P('M34,42 L41,31 H52 V42 Z', K.sky)}
        {P('M56,42 V31 H66 L74,42 Z', K.sky)}
        {Sh('M6,58 H94 V66 H6 Z', 0.15)}
        {R(86, 50, 6, 4, K.yellow, 1)}
        {wheel(26, 66, 10)}
        {wheel(74, 66, 10)}
      </>
    ),
    'transportation.car_1',
  ],
  [
    'taxi',
    'Taxi',
    'transport',
    'cab car ride hail transport',
    72,
    48,
    () => (
      <>
        {R(40, 16, 20, 9, K.dark, 2)}
        {R(43, 18.5, 14, 4, K.yellow, 1)}
        {P('M6,66 V54 Q6,46 14,44 L28,42 L38,28 Q40,26 44,26 H64 Q68,26 70,29 L80,42 Q94,44 94,54 V66 Z', K.yellow)}
        {P('M34,42 L41,31 H52 V42 Z', K.sky)}
        {P('M56,42 V31 H66 L74,42 Z', K.sky)}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => R(10 + i * 10, 50, 5, 5, i % 2 ? K.yellow : K.dark))}
        {Sh('M6,58 H94 V66 H6 Z', 0.15)}
        {wheel(26, 66, 10)}
        {wheel(74, 66, 10)}
      </>
    ),
    'transportation.taxi',
  ],
  [
    'bus',
    'Bus',
    'transport',
    'coach public transit transport',
    76,
    48,
    () => (
      <>
        {R(4, 22, 92, 50, K.orange, 7)}
        {[0, 1, 2, 3].map((i) => R(10 + i * 17, 30, 13, 16, K.sky, 2))}
        {R(80, 30, 11, 30, K.sky, 2)}
        {Sh('M4,58 H96 V65 Q96,72 89,72 H11 Q4,72 4,65 Z', 0.15)}
        {wheel(22, 72, 9)}
        {wheel(76, 72, 9)}
      </>
    ),
    'transportation.bus_1',
  ],
  [
    'truck',
    'Truck',
    'transport',
    'lorry delivery shipping freight logistics',
    76,
    48,
    () => (
      <>
        {R(4, 22, 60, 48, K.blue, 3)}
        {S('M14,30 V62 M26,30 V62 M38,30 V62 M50,30 V62', K.white, 1.6, 0.35)}
        {P('M64,34 H80 Q84,34 86,38 L95,52 V70 H64 Z', K.red)}
        {P('M70,38 H80 L87,50 H70 Z', K.sky)}
        {Sh('M4,62 H95 V70 H4 Z', 0.15)}
        {wheel(20, 72, 9)}
        {wheel(42, 72, 9)}
        {wheel(80, 72, 9)}
      </>
    ),
    'transportation.truck_1',
  ],
  [
    'train',
    'Train',
    'transport',
    'railway locomotive rail metro subway',
    76,
    48,
    () => (
      <>
        {P('M4,26 H80 Q96,28 96,48 V66 H4 Z', K.teal)}
        {[0, 1, 2, 3].map((i) => R(10 + i * 16, 32, 11, 14, K.sky, 2))}
        {P('M76,32 H82 Q90,34 91,46 H76 Z', K.sky)}
        {R(4, 52, 92, 4, K.white, 0, 0.8)}
        {S('M2,80 H98', K.slate, 3)}
        {[18, 34, 66, 82].map((x) => (
          <g key={x}>{wheel(x, 70, 6)}</g>
        ))}
      </>
    ),
    'transportation.train_1',
  ],
  [
    'plane',
    'Airplane',
    'transport',
    'aircraft flight jet airport travel aviation',
    64,
    64,
    () => (
      <>
        {P('M50,6 Q56,6 56,18 V40 L92,58 V66 L56,56 V78 L68,86 V92 L50,88 L32,92 V86 L44,78 V56 L8,66 V58 L44,40 V18 Q44,6 50,6 Z', K.light)}
        {Sh('M50,6 Q56,6 56,18 V40 L92,58 V66 L56,56 V78 L68,86 V92 L50,88 Z', 0.1)}
        {P('M46,16 Q50,10 54,16 Z', K.sky)}
        {P('M32,86 L44,78 V84 L32,92 Z', K.blue)}
        {P('M68,86 L56,78 V84 L68,92 Z', K.blue)}
        {R(26, 52, 5, 8, K.slate, 2)}
        {R(69, 52, 5, 8, K.slate, 2)}
      </>
    ),
    'transportation.airplane_1',
  ],
  [
    'ship',
    'Ship',
    'transport',
    'boat vessel cargo ferry sea port maritime',
    72,
    56,
    () => (
      <>
        {R(54, 22, 10, 18, K.red)}
        {R(54, 22, 10, 4, K.dark)}
        {R(24, 36, 48, 20, K.white)}
        {[0, 1, 2, 3].map((i) => C(32 + i * 10, 46, 2.6, K.sky))}
        {P('M6,56 H94 L82,80 H18 Z', K.navy)}
        {R(10, 58, 82, 4, K.red)}
        {S('M4,88 q8,-5 16,0 t16,0 t16,0 t16,0 t16,0 t12,0', K.blue, 3)}
      </>
    ),
    'transportation.ship_1',
  ],
  [
    'bicycle',
    'Bicycle',
    'transport',
    'bike cycle cycling ride',
    68,
    48,
    () => (
      <>
        <circle cx={24} cy={64} r={18} fill="none" stroke={K.dark} strokeWidth={4} />
        <circle cx={76} cy={64} r={18} fill="none" stroke={K.dark} strokeWidth={4} />
        {S('M24,64 L40,38 H70 L76,64 M40,38 L52,64 L70,38 M52,64 L24,64', K.teal, 4)}
        {S('M36,30 H48 M40,38 L37,30 M70,38 L66,26 H76', K.slate, 4)}
        {C(52, 64, 4, K.slate)}
      </>
    ),
    'transportation.bicycle',
  ],
  [
    'scooter',
    'Scooter',
    'transport',
    'kick scooter e-scooter micromobility',
    60,
    56,
    () => (
      <>
        {S('M76,12 L80,76 M68,12 H86', K.slate, 5)}
        {P('M16,72 H80 V80 H20 Q16,80 16,76 Z', K.violet)}
        {wheel(22, 84, 9)}
        {wheel(80, 84, 9)}
      </>
    ),
    'transportation.scooter',
  ],
  [
    'motorbike',
    'Motorbike',
    'transport',
    'motorcycle bike moto rider',
    72,
    48,
    () => (
      <>
        {wheel(20, 66, 14)}
        {wheel(80, 66, 14)}
        {S('M80,66 L68,30 H60', K.slate, 4)}
        {P('M26,52 Q30,38 46,38 H62 L70,50 L56,62 H36 Z', K.red)}
        {P('M30,40 Q34,32 46,32 H52 V38 H32 Z', K.dark)}
        {R(40, 52, 16, 10, K.grey, 2)}
        {S('M20,66 L36,58', K.slate, 4)}
      </>
    ),
    'transportation.motorbike',
  ],

  // ----- Places & nature --------------------------------------------------
  [
    'tree',
    'Tree',
    'places',
    'nature plant forest park green',
    48,
    64,
    () => (
      <>
        {R(44, 58, 12, 36, K.brown, 2)}
        {C(50, 34, 26, K.green)}
        {C(32, 48, 18, K.green)}
        {C(68, 48, 18, K.green)}
        {Sh('M60,16 Q80,30 84,52 Q76,66 52,64 Q74,44 60,16 Z', 0.12)}
      </>
    ),
    'nature.tree_1',
  ],
  [
    'house',
    'House',
    'places',
    'home residence building residential',
    60,
    60,
    () => (
      <>
        {R(66, 14, 10, 22, K.brown)}
        {R(16, 44, 68, 48, K.light)}
        {Sh('M60,44 H84 V92 H60 Z', 0.08)}
        {P('M8,48 L50,12 L92,48 Z', K.red)}
        {R(28, 62, 18, 30, K.wood, 2)}
        {C(42, 78, 1.6, K.yellow)}
        {R(56, 58, 18, 16, K.sky, 1)}
        {S('M65,58 V74 M56,66 H74', K.white, 1.6)}
      </>
    ),
    'buildings.house',
  ],
  ['office', 'Office building', 'places', 'company headquarters corporate skyscraper tower', 52, 64, () => (
    <>
      {building(22, 10, 56, 84, '#475569', 4, 8)}
      {R(42, 82, 16, 12, K.dark)}
    </>
  ), 'buildings.office_building'],
  [
    'factory',
    'Factory',
    'places',
    'plant manufacturing industry production',
    68,
    56,
    () => (
      <>
        {E(20, 14, 8, 5, K.light)}
        {E(30, 8, 10, 6, K.light)}
        {R(14, 20, 10, 36, K.slate)}
        {P('M6,92 V50 L28,38 V50 L50,38 V50 L72,38 V50 L94,38 V92 Z', K.grey)}
        {[0, 1, 2, 3].map((i) => R(12 + i * 20, 62, 12, 10, K.sky, 1))}
        {R(66, 76, 16, 16, K.slate)}
        {Sh('M6,82 H94 V92 H6 Z', 0.1)}
      </>
    ),
    'buildings.factory',
  ],
  [
    'store',
    'Store',
    'places',
    'shop retail market boutique',
    60,
    56,
    () => (
      <>
        {R(12, 36, 76, 56, K.light)}
        {[0, 1, 2, 3, 4, 5].map((i) => P(`M${8 + i * 14},26 h14 v14 a7,7 0 0 1 -14,0 Z`, i % 2 ? K.white : K.red))}
        {R(6, 20, 88, 7, K.darkred, 2)}
        {R(20, 54, 26, 22, K.sky, 1)}
        {R(56, 54, 20, 38, K.wood, 1)}
      </>
    ),
    'buildings.shop',
  ],
  [
    'bank',
    'Bank',
    'places',
    'finance institution money building columns',
    60,
    56,
    () => (
      <>
        {P('M8,34 L50,10 L92,34 Z', K.grey)}
        {R(10, 34, 80, 7, K.slate)}
        {[0, 1, 2, 3, 4].map((i) => R(16 + i * 15, 44, 8, 36, K.light))}
        {R(10, 80, 80, 6, K.slate)}
        {R(4, 86, 92, 6, K.grey)}
        {C(50, 25, 4, K.yellow)}
      </>
    ),
    'buildings.bank',
  ],
  [
    'hospital',
    'Hospital',
    'places',
    'clinic medical healthcare emergency',
    60,
    60,
    () => (
      <>
        {building(10, 30, 80, 62, K.light, 5, 3, K.sky)}
        {R(34, 10, 32, 32, K.white)}
        <rect x={34} y={10} width={32} height={32} fill="none" stroke={K.grey} strokeWidth={1.5} />
        {R(46, 14, 8, 24, K.red)}
        {R(38, 22, 24, 8, K.red)}
        {R(42, 76, 16, 16, K.slate)}
      </>
    ),
    'buildings.hospital',
  ],
  [
    'school',
    'School',
    'places',
    'education university college campus academy',
    60,
    60,
    () => (
      <>
        {S('M50,4 V22', K.slate, 2)}
        {P('M50,4 H64 L60,9 L64,14 H50 Z', K.red)}
        {R(36, 26, 28, 20, K.light)}
        {P('M32,28 L50,16 L68,28 Z', K.red)}
        {C(50, 34, 4, K.white)}
        {R(8, 46, 84, 46, '#fde68a')}
        {P('M4,48 H96 L92,42 H8 Z', K.darkred)}
        {[0, 1, 2, 3].map((i) => R(14 + i * 20 + (i > 1 ? 8 : 0), 56, 10, 12, K.sky, 1))}
        {R(42, 70, 16, 22, K.wood)}
      </>
    ),
    'buildings.school',
  ],
  [
    'warehouse',
    'Warehouse',
    'places',
    'storage depot distribution logistics fulfillment',
    68,
    52,
    () => (
      <>
        {P('M6,92 V42 L50,18 L94,42 V92 Z', K.tan)}
        {Sh('M50,18 L94,42 V92 H50 Z', 0.1)}
        {R(26, 52, 48, 40, K.grey)}
        {S('M26,58 H74 M26,64 H74 M26,70 H74 M26,76 H74 M26,82 H74 M26,88 H74', K.slate, 1.5, 0.6)}
        {P('M2,44 L50,16 L98,44 L94,46 L50,22 L6,46 Z', K.brown)}
      </>
    ),
    'buildings.warehouse',
  ],
  [
    'globe',
    'Globe',
    'places',
    'world earth internet global international planet',
    56,
    56,
    () => (
      <>
        {C(50, 50, 42, K.blue)}
        {P('M24,26 Q36,20 44,26 Q48,36 40,40 Q34,46 38,56 Q32,62 26,54 Q18,44 24,26 Z', K.green)}
        {P('M56,16 Q70,18 76,30 Q70,34 62,30 Q56,24 56,16 Z', K.green)}
        {P('M58,46 Q72,40 82,52 Q80,66 70,74 Q62,70 64,60 Q56,56 58,46 Z', K.green)}
        <ellipse cx={50} cy={50} rx={18} ry={42} fill="none" stroke={K.white} strokeOpacity={0.35} strokeWidth={1.5} />
        {S('M8,50 H92 M14,30 H86 M14,70 H86', K.white, 1.5, 0.35)}
        {Sh('M50,8 A42,42 0 0 1 50,92 A50,50 0 0 0 50,8 Z', 0.15)}
      </>
    ),
    'tech.globe',
  ],
];

// ---------------------------------------------------------------------------
// Shape & library definitions
// ---------------------------------------------------------------------------

/** Wraps 100×100 art so it scales uniformly and stays centred in w×h. */
function fit(art: () => ReactNode) {
  return function Clipart({ w, h }: ShapeRenderContext) {
    const k = Math.max(0.0001, Math.min(w, h) / 100);
    return (
      <g transform={`translate(${f((w - 100 * k) / 2)} ${f((h - 100 * k) / 2)}) scale(${f(k * 10000) / 10000})`}>
        {art()}
      </g>
    );
  };
}

const shapes: ShapeDef[] = CLIPS.map(([name, label, , , , , art, stencil]) => ({
  kind: `clip.${name}`,
  label,
  boxHit: true,
  textPlacement: 'below',
  render: fit(art),
  drawio: `shape=mxgraph.clipart.${stencil};verticalLabelPosition=bottom;verticalAlign=top;html=1;`,
}));

const GROUP_WORD: Record<Group, string> = {
  people: 'people person',
  devices: 'device hardware tech',
  office: 'office business',
  weather: 'weather forecast',
  transport: 'transport vehicle travel',
  places: 'building place nature',
};

const libraries: ShapeLibrary[] = [
  {
    id: 'clipart',
    name: 'Clipart',
    items: CLIPS.map(([name, label, group, keywords, w, h]) =>
      item(`clip.${name}`, label, w, h, {
        style: { fill: 'none', stroke: 'none', fontSize: 12 },
        keywords: `clipart illustration ${GROUP_WORD[group]} ${keywords}`,
      }),
    ),
  },
];

export { shapes, libraries };
