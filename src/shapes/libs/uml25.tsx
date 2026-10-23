/**
 * UML 2.5: the extended notation beyond the basic UML library — sequence
 * (activations, lifeline variants, combined fragments, interaction use,
 * gates), deployment & components (artifact, ports, ball-and-socket
 * interfaces), packages, timing diagrams, state-machine pseudostates and
 * activity nodes. Generic pieces reuse existing kinds (uml.*, sysml.*, lane.*).
 */
import type { ElementStyle } from '@/model/types';
import { lineHeight, measureText } from '@/lib/text';
import { Body, Detail, RoundRect, inset, rr, topRounded } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Label, Line, Oval, Tint, clamp, f, ink, item, paper, pathOf, shape } from './_kit2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dashed = (s: ElementStyle): ElementStyle => ({ ...s, strokeStyle: 'dashed' });
const plain = (s: ElementStyle): ElementStyle => ({ ...s, strokeStyle: 'solid' });
const lines = (text: string) => text.split('\n');

/** Pentagon name tag in the top-left corner of a frame; returns its size. */
function tagSize(w: number, h: number, label: string, s: ElementStyle) {
  const fs = Math.max(9, s.fontSize - 2);
  const tw = clamp(measureText(label, { ...s, fontSize: fs, bold: true }) + 20, Math.min(36, w), Math.max(Math.min(36, w), w * 0.6));
  const th = Math.min(lineHeight(fs) + 6, h * 0.4);
  return { tw, th, fs };
}

function NameTag({ w, h, label, s }: { w: number; h: number; label: string; s: ElementStyle }) {
  const { tw, th, fs } = tagSize(w, h, label, s);
  const c = Math.min(7, th * 0.4, tw * 0.2);
  return (
    <>
      <Body d={`M0,0 H${f(tw)} V${f(th - c)} L${f(tw - c)},${f(th)} H0 Z`} s={{ ...plain(s), fill: paper(s) }} />
      <Label x={6} y={th / 2} text={label} s={s} size={fs} anchor="start" bold />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sequence diagrams
// ---------------------------------------------------------------------------

type Head = 'actor' | 'boundary' | 'control' | 'entity';

/** Participant glyph centred in a square box at (x, y) with side `s`. */
function HeadGlyph({ kind, x, y, size, s }: { kind: Head; x: number; y: number; size: number; s: ElementStyle }) {
  const st = { ...plain(s), strokeWidth: Math.min(s.strokeWidth, Math.max(0.75, size / 20)) };
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (kind === 'actor') {
    const hw = size * 0.3;
    const hr = size * 0.13;
    return (
      <>
        <Oval cx={cx} cy={y + hr} rx={hr} s={st} />
        <Detail
          s={st}
          d={`M${f(cx)},${f(y + hr * 2)} V${f(y + size * 0.66)} M${f(cx - hw)},${f(y + size * 0.4)} H${f(cx + hw)} M${f(cx)},${f(y + size * 0.66)} L${f(cx - hw)},${f(y + size)} M${f(cx)},${f(y + size * 0.66)} L${f(cx + hw)},${f(y + size)}`}
        />
      </>
    );
  }
  const r = size * 0.32;
  if (kind === 'boundary') {
    const ox = cx + size * 0.12;
    const lx = x + size * 0.08;
    return (
      <>
        <Detail s={st} d={`M${f(lx)},${f(cy - r)} V${f(cy + r)} M${f(lx)},${f(cy)} H${f(ox - r)}`} />
        <Oval cx={ox} cy={cy} rx={r} s={st} />
      </>
    );
  }
  if (kind === 'control') {
    const a = r * 0.45;
    const tx = cx + r * 0.1;
    const ty = cy - r;
    return (
      <>
        <Oval cx={cx} cy={cy} rx={r} s={st} />
        <Line s={st} d={`M${f(tx + a)},${f(ty - a * 0.8)} L${f(tx - a * 0.3)},${f(ty)} L${f(tx + a)},${f(ty + a * 0.8)}`} />
      </>
    );
  }
  return (
    <>
      <Oval cx={cx} cy={cy - size * 0.04} rx={r} s={st} />
      <Line s={st} d={`M${f(cx - r)},${f(cy - size * 0.04 + r + 1.5)} H${f(cx + r)}`} />
    </>
  );
}

const lifeHead = (w: number, h: number) => Math.max(1, Math.min(44, w * 0.6, h * 0.3));
const lifeText = (w: number, h: number) => ({ x: 0, y: lifeHead(w, h) + 2, w: Math.max(1, w), h: Math.max(1, Math.min(20, h - lifeHead(w, h))) });

function glyphLifeline(kind: Head) {
  return function GlyphLifeline({ w, h, style }: ShapeRenderContext) {
    const s = lifeHead(w, h);
    const top = Math.min(h, s + 24);
    return (
      <>
        <HeadGlyph kind={kind} x={(w - s) / 2} y={0} size={s} s={style} />
        <Detail d={`M${f(w / 2)},${f(top)} V${f(h)}`} s={dashed(style)} />
      </>
    );
  };
}

function glyphIcon(kind: Head) {
  return function GlyphIcon({ w, h, style }: ShapeRenderContext) {
    const s = Math.min(w, h);
    return <HeadGlyph kind={kind} x={(w - s) / 2} y={(h - s) / 2} size={s} s={style} />;
  };
}

/** Combined fragment: operator in the name tag, one operand per following line (its guard). */
function Fragment({ w, h, style, text }: ShapeRenderContext) {
  const [op = '', ...guards] = lines(text);
  const n = Math.max(1, guards.length);
  const { th } = tagSize(w, h, op || 'alt', style);
  const gs = { ...style, fontSize: Math.max(9, style.fontSize - 1), bold: false };
  const span = Math.max(0, h - th);
  return (
    <>
      <RoundRect w={w} h={h} s={plain(style)} r={0} />
      {Array.from({ length: n - 1 }, (_, i) => {
        const y = th + (span * (i + 1)) / n;
        return <Detail key={i} d={`M0,${f(y)} H${f(w)}`} s={{ ...style, strokeStyle: 'dashed', strokeWidth: Math.max(1, style.strokeWidth * 0.8) }} />;
      })}
      {guards.map((g, i) => {
        const top = i === 0 ? th : th + (span * i) / n;
        return g.trim() ? <Label key={i} x={8} y={top + gs.fontSize * 0.9 + 2} text={g} s={gs} anchor="start" /> : null;
      })}
      <NameTag w={w} h={h} label={op} s={style} />
    </>
  );
}

function InteractionUse({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={plain(style)} r={0} />
      <NameTag w={w} h={h} label="ref" s={style} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Components, deployment & packages
// ---------------------------------------------------------------------------

/** Small document-with-folded-corner icon (artifact). */
function DocIcon({ x, y, size, s }: { x: number; y: number; size: number; s: ElementStyle }) {
  const w = size * 0.78;
  const k = size * 0.3;
  const st = { ...plain(s), strokeWidth: Math.min(s.strokeWidth, 1.25) };
  return (
    <>
      <Body d={`M${f(x)},${f(y)} H${f(x + w - k)} L${f(x + w)},${f(y + k)} V${f(y + size)} H${f(x)} Z`} s={st} />
      <Detail d={`M${f(x + w - k)},${f(y)} V${f(y + k)} H${f(x + w)}`} s={st} />
    </>
  );
}

/** The UML component icon (box with two tabs). */
function ComponentIcon({ x, y, size, s }: { x: number; y: number; size: number; s: ElementStyle }) {
  const st = { ...plain(s), strokeWidth: Math.min(s.strokeWidth, 1.25) };
  const k = size / 18;
  return (
    <>
      <Body d={`M${f(x + 4 * k)},${f(y)} H${f(x + 18 * k)} V${f(y + 16 * k)} H${f(x + 4 * k)} Z`} s={st} />
      <Body d={`M${f(x)},${f(y + 3 * k)} H${f(x + 8 * k)} V${f(y + 7 * k)} H${f(x)} Z M${f(x)},${f(y + 9 * k)} H${f(x + 8 * k)} V${f(y + 13 * k)} H${f(x)} Z`} s={st} />
    </>
  );
}

const portSize = (w: number, h: number) => Math.max(2, Math.min(14, w * 0.12, h * 0.2));

function ComponentPorts({ w, h, style }: ShapeRenderContext) {
  const p = portSize(w, h);
  const r = rr(w, h, Math.min(style.radius, 6));
  const ic = Math.min(18, w * 0.15, h * 0.3);
  return (
    <>
      <rect x={p / 2} y={0} width={Math.max(0, w - p)} height={h} rx={r} fill={style.fill === 'none' ? 'none' : style.fill} stroke={ink(style)} strokeWidth={style.strokeWidth} />
      <ComponentIcon x={w - p / 2 - ic - 8} y={8} size={ic} s={style} />
      <rect x={0} y={h / 2 - p / 2} width={p} height={p} fill={paper(style)} stroke={ink(style)} strokeWidth={Math.min(style.strokeWidth, 1.25)} />
      <rect x={w - p} y={h / 2 - p / 2} width={p} height={p} fill={paper(style)} stroke={ink(style)} strokeWidth={Math.min(style.strokeWidth, 1.25)} />
    </>
  );
}

/** Provided interface ("lollipop"): stem from the left, ball on the right. */
function Provided({ w, h, style }: ShapeRenderContext) {
  const r = Math.max(0.5, Math.min(h / 2 - 1, w * 0.3));
  return (
    <>
      <Line s={style} d={`M0,${f(h / 2)} H${f(w - r * 2)}`} cap="butt" />
      <Oval cx={w - r - 0.5} cy={h / 2} rx={r} s={plain(style)} />
    </>
  );
}

/** Required interface ("socket"): stem from the left, half circle opening right. */
function Required({ w, h, style }: ShapeRenderContext) {
  const r = Math.max(0.5, Math.min(h / 2 - 1, w * 0.3));
  const cx = w - 0.5;
  return <Line s={style} cap="butt" d={`M0,${f(h / 2)} H${f(cx - r)} M${f(cx)},${f(h / 2 - r)} A${f(r)},${f(r)} 0 0 0 ${f(cx)},${f(h / 2 + r)}`} />;
}

/** Assembly connector: ball-and-socket with stems on both sides. */
function Assembly({ w, h, style }: ShapeRenderContext) {
  const R = Math.max(1, Math.min(h / 2 - 1, w * 0.18));
  const r = R * 0.62;
  const cx = w / 2;
  return (
    <>
      <Line s={style} cap="butt" d={`M0,${f(h / 2)} H${f(cx - r)} M${f(cx + R)},${f(h / 2)} H${f(w)}`} />
      <Oval cx={cx} cy={h / 2} rx={r} s={plain(style)} />
      <Line s={style} cap="butt" d={`M${f(cx - R * 0.35)},${f(h / 2 - R * 0.94)} A${f(R)},${f(R)} 0 0 1 ${f(cx - R * 0.35)},${f(h / 2 + R * 0.94)}`} />
    </>
  );
}

function Artifact({ w, h, style }: ShapeRenderContext) {
  const ic = Math.min(18, w * 0.18, h * 0.32);
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={0} />
      <DocIcon x={w - ic - 8} y={8} size={ic} s={style} />
    </>
  );
}

const tabOf = (w: number, h: number) => ({ tw: Math.max(1, Math.min(w * 0.55, 120)), th: Math.max(1, Math.min(24, h * 0.3)) });

/** Package with its name in the tab; the body stays free for members. */
function PackageTab({ w, h, style }: ShapeRenderContext) {
  const { tw, th } = tabOf(w, h);
  return (
    <>
      <Body d={`M0,${f(th)} V0 H${f(tw)} V${f(th)} Z`} s={style} />
      <Body d={`M0,${f(th)} H${f(w)} V${f(h)} H0 Z`} s={style} />
    </>
  );
}

/** Model: package with a small hollow triangle in the body. */
function Model({ w, h, style }: ShapeRenderContext) {
  const { th } = tabOf(w, h);
  const t = Math.min(14, w * 0.12, (h - th) * 0.3);
  const x = w - t - 8;
  const y = th + 8;
  return (
    <>
      <PackageTab w={w} h={h} style={style} text="" />
      <Body d={pathOf([[x + t / 2, y], [x + t, y + t * 0.86], [x, y + t * 0.86]])} s={{ ...plain(style), strokeWidth: Math.min(style.strokeWidth, 1.25) }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Timing diagrams
// ---------------------------------------------------------------------------

const nameCol = (w: number) => Math.min(Math.max(36, w * 0.18), w * 0.4);

/** State timeline: lifeline name on the left, states listed top to bottom, step waveform. */
function TimingState({ w, h, style, text }: ShapeRenderContext) {
  const [name = '', ...states] = lines(text);
  const st = states.length ? states : ['', '', ''];
  const n = st.length;
  const nc = nameCol(w);
  const sc = Math.min(Math.max(30, w * 0.14), (w - nc) * 0.4);
  const x0 = nc + sc;
  const pw = Math.max(0, w - x0 - 6);
  const rowY = (i: number) => (h * (i + 0.5)) / n;
  const small = { ...style, fontSize: Math.max(8, style.fontSize - 3), bold: false };
  // Deterministic walk across the states.
  const seq = [0, Math.min(1, n - 1), n - 1, Math.min(1, n - 1), 0, n - 1];
  let d = '';
  seq.forEach((si, i) => {
    const xa = x0 + (pw * i) / seq.length;
    const xb = x0 + (pw * (i + 1)) / seq.length;
    d += `${i ? 'L' : 'M'}${f(xa)},${f(rowY(si))} H${f(xb)} `;
  });
  return (
    <>
      <RoundRect w={w} h={h} s={plain(style)} r={0} />
      <Detail d={`M${f(nc)},0 V${f(h)}`} s={plain(style)} />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${f(x0)},${f(rowY(i))} H${f(w - 6)}`} stroke={ink(style)} strokeOpacity={0.25} strokeDasharray="2 3" strokeWidth={1} fill="none" />
      ))}
      {states.map((s, i) => (
        <Label key={i} x={x0 - 6} y={rowY(i)} text={s} s={small} anchor="end" />
      ))}
      <Line s={style} k={1.2} d={d} />
      <Label x={nc / 2} y={h / 2} text={name} s={style} size={Math.max(9, style.fontSize - 1)} bold />
    </>
  );
}

/** Value lifeline: lifeline name on the left, a chain of hexagonal value segments. */
function TimingValue({ w, h, style, text }: ShapeRenderContext) {
  const [name = '', ...values] = lines(text);
  const vals = values.length ? values : ['', '', ''];
  const nc = nameCol(w);
  const x0 = nc + 6;
  const pw = Math.max(1, w - x0 - 6);
  const sw = pw / vals.length;
  const yt = h * 0.25;
  const yb = h * 0.75;
  const k = Math.min(6, sw * 0.2, (yb - yt) / 2);
  const small = { ...style, fontSize: Math.max(8, style.fontSize - 2), bold: false };
  return (
    <>
      <RoundRect w={w} h={h} s={plain(style)} r={0} />
      <Detail d={`M${f(nc)},0 V${f(h)}`} s={plain(style)} />
      {vals.map((v, i) => {
        const a = x0 + sw * i;
        const b = a + sw;
        return (
          <g key={i}>
            <Body s={{ ...plain(style), fill: i % 2 ? paper(style) : style.fill }} d={pathOf([[a, h / 2], [a + k, yt], [b - k, yt], [b, h / 2], [b - k, yb], [a + k, yb]])} />
            <Label x={(a + b) / 2} y={h / 2} text={v} s={small} />
          </g>
        );
      })}
      <Label x={nc / 2} y={h / 2} text={name} s={style} size={Math.max(9, style.fontSize - 1)} bold />
    </>
  );
}

// ---------------------------------------------------------------------------
// State machines
// ---------------------------------------------------------------------------

function History({ deep }: { deep: boolean }) {
  return function HistoryState({ w, h, style }: ShapeRenderContext) {
    const m = Math.min(w, h);
    const lw = m * 0.2;
    const lh = m * 0.24;
    const cx = deep ? w / 2 - m * 0.08 : w / 2;
    const cy = h / 2;
    const star = m * 0.11;
    const sx = cx + lw + m * 0.09;
    const sy = cy - lh + star;
    return (
      <>
        <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={plain(style)} />
        <Line s={style} k={0.9} d={`M${f(cx - lw / 2)},${f(cy - lh)} V${f(cy + lh)} M${f(cx + lw / 2)},${f(cy - lh)} V${f(cy + lh)} M${f(cx - lw / 2)},${f(cy)} H${f(cx + lw / 2)}`} />
        {deep && (
          <Line
            s={style}
            k={0.7}
            d={`M${f(sx)},${f(sy - star)} V${f(sy + star)} M${f(sx - star * 0.87)},${f(sy - star / 2)} L${f(sx + star * 0.87)},${f(sy + star / 2)} M${f(sx - star * 0.87)},${f(sy + star / 2)} L${f(sx + star * 0.87)},${f(sy - star / 2)}`}
          />
        )}
      </>
    );
  };
}

function ExitPoint({ w, h, style }: ShapeRenderContext) {
  const k = Math.SQRT1_2;
  const [cx, cy, rx, ry] = [w / 2, h / 2, w / 2, h / 2];
  return (
    <>
      <Oval cx={cx} cy={cy} rx={rx} ry={ry} s={plain(style)} />
      <Line s={style} k={0.9} d={`M${f(cx - rx * k)},${f(cy - ry * k)} L${f(cx + rx * k)},${f(cy + ry * k)} M${f(cx + rx * k)},${f(cy - ry * k)} L${f(cx - rx * k)},${f(cy + ry * k)}`} />
    </>
  );
}

const crossD = (w: number, h: number) => `M0,0 L${f(w)},${f(h)} M${f(w)},0 L0,${f(h)}`;

const stateR = (w: number, h: number, s: ElementStyle) => rr(w, h, Math.max(s.radius, 12));
const headerH = (h: number, s: ElementStyle) => Math.min(lineHeight(s.fontSize) + 12, h * 0.4);

/** Composite state: name compartment on top, two orthogonal regions split by a dashed line. */
function CompositeState({ w, h, style }: ShapeRenderContext) {
  const hh = headerH(h, style);
  const r = stateR(w, h, style);
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      {style.stroke !== 'none' && <Tint d={topRounded(w, hh, r)} s={style} k={0.06} />}
      <Detail d={`M0,${f(hh)} H${f(w)}`} s={plain(style)} />
      <Detail d={`M${f(w / 2)},${f(hh)} V${f(h)}`} s={dashed(style)} />
    </>
  );
}

/** Submachine state: state with the "two linked states" icon in the bottom-right corner. */
function Submachine({ w, h, style }: ShapeRenderContext) {
  const r = stateR(w, h, style);
  const u = Math.min(6, w * 0.05, h * 0.12);
  const x = w - u * 6 - 8;
  const y = h - u * 2 - 6;
  const st = { ...plain(style), strokeWidth: Math.min(style.strokeWidth, 1.2) };
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <rect x={x} y={y} width={u * 2} height={u * 1.6} rx={u * 0.6} fill="none" stroke={ink(style)} strokeWidth={st.strokeWidth} />
      <rect x={x + u * 4} y={y} width={u * 2} height={u * 1.6} rx={u * 0.6} fill="none" stroke={ink(style)} strokeWidth={st.strokeWidth} />
      <Detail d={`M${f(x + u * 2)},${f(y + u * 0.8)} H${f(x + u * 4)}`} s={st} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/** Accept time event: hourglass. */
function Hourglass({ w, h, style }: ShapeRenderContext) {
  return <Body s={plain(style)} d={`M0,0 H${f(w)} L0,${f(h)} H${f(w)} Z`} />;
}

/** Expansion node: a box split into four slots. */
function ExpansionNode({ w, h, style }: ShapeRenderContext) {
  let d = '';
  for (let i = 1; i < 4; i++) d += `M${f((w * i) / 4)},0 V${f(h)} `;
  return (
    <>
      <RoundRect w={w} h={h} s={plain(style)} r={0} />
      <Detail d={d} s={plain(style)} />
    </>
  );
}

/** Expansion region: dashed rounded box with input/output expansion nodes on its top and bottom edges. */
function ExpansionRegion({ w, h, style }: ShapeRenderContext) {
  const nw = Math.min(44, w * 0.25);
  const nh = Math.min(12, h * 0.1);
  const node = (x: number, y: number, key: string) => (
    <g key={key} transform={`translate(${f(x)},${f(y)})`}>
      <ExpansionNode w={nw} h={nh} style={{ ...style, fill: paper(style), strokeWidth: Math.min(style.strokeWidth, 1.25) }} text="" />
    </g>
  );
  return (
    <>
      <RoundRect w={w} h={h} s={dashed(style)} r={rr(w, h, Math.max(style.radius, 12))} />
      {node(w * 0.3 - nw / 2, -nh / 2, 'in')}
      {node(w * 0.7 - nw / 2, h - nh / 2, 'out')}
    </>
  );
}

/** Interrupting edge glyph: a lightning-bolt arrow. */
function Interrupt({ w, h, style }: ShapeRenderContext) {
  const pts: Array<readonly [number, number]> = [
    [0, 0],
    [w * 0.62, h * 0.48],
    [w * 0.3, h * 0.52],
    [w * 0.9, h * 0.94],
  ];
  const a = Math.min(8, w * 0.35, h * 0.2);
  const [ex, ey] = pts[3];
  const ang = Math.atan2(ey - pts[2][1], ex - pts[2][0]);
  const l = [ex - a * Math.cos(ang - 0.45), ey - a * Math.sin(ang - 0.45)] as const;
  const r = [ex - a * Math.cos(ang + 0.45), ey - a * Math.sin(ang + 0.45)] as const;
  return (
    <>
      <Line s={style} d={pathOf(pts, false)} />
      <path d={pathOf([[ex, ey], l, r])} fill={ink(style)} stroke="none" />
    </>
  );
}

/** Comment with an anchor line running to the bottom-left corner. */
const commentBox = (w: number, h: number) => ({ x: w * 0.22, y: 0, w: w * 0.78, h: h * 0.72 });
function Comment({ w, h, style }: ShapeRenderContext) {
  const b = commentBox(w, h);
  const c = Math.min(14, b.w * 0.25, b.h * 0.25);
  const x1 = b.x + b.w;
  return (
    <>
      <Detail d={`M${f(b.x + b.w * 0.2)},${f(b.h)} L2,${f(h - 2)}`} s={dashed(style)} />
      <Oval cx={2} cy={h - 2} rx={1.5} s={{ ...plain(style), fill: ink(style) }} />
      <Body d={`M${f(b.x)},0 H${f(x1 - c)} L${f(x1)},${f(c)} V${f(b.h)} H${f(b.x)} Z`} s={style} />
      <Detail d={`M${f(x1 - c)},0 V${f(c)} H${f(x1)}`} s={style} />
    </>
  );
}

/** Activity frame: rounded rectangle with the activity name top-left. */
function Activity({ w, h, style }: ShapeRenderContext) {
  return <RoundRect w={w} h={h} s={style} r={rr(w, h, Math.max(style.radius, 14))} />;
}

/** Gate: a small hollow square on a frame boundary. */
function Gate({ w, h, style }: ShapeRenderContext) {
  return <rect x={0} y={0} width={w} height={h} fill={paper(style)} stroke={ink(style)} strokeWidth={Math.min(style.strokeWidth, 1.25)} />;
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const tagText = (label: string) => (w: number, h: number) => {
  const { th } = tagSize(w, h, label, { fontSize: 14 } as ElementStyle);
  return { x: 10, y: th + 2, w: Math.max(1, w - 20), h: Math.max(1, h - th - 4) };
};

const DRAWIO = 'html=1;whiteSpace=wrap;';

export const shapes: ShapeDef[] = [
  // Sequence
  shape(
    'uml25.activation',
    'Activation',
    'perimeter=orthogonalPerimeter;points=[];outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;html=1;',
    ({ w, h, style }) => <RoundRect w={w} h={h} s={plain(style)} r={0} />,
    { boxHit: true, textPlacement: 'below' },
  ),
  shape('uml25.actorLifeline', 'Actor lifeline', `shape=umlLifeline;participant=umlActor;perimeter=lifelinePerimeter;${DRAWIO}`, glyphLifeline('actor'), { boxHit: true, textBox: lifeText }),
  shape('uml25.boundaryLifeline', 'Boundary lifeline', `shape=umlLifeline;participant=umlBoundary;perimeter=lifelinePerimeter;${DRAWIO}`, glyphLifeline('boundary'), { boxHit: true, textBox: lifeText }),
  shape('uml25.controlLifeline', 'Control lifeline', `shape=umlLifeline;participant=umlControl;perimeter=lifelinePerimeter;${DRAWIO}`, glyphLifeline('control'), { boxHit: true, textBox: lifeText }),
  shape('uml25.entityLifeline', 'Entity lifeline', `shape=umlLifeline;participant=umlEntity;perimeter=lifelinePerimeter;${DRAWIO}`, glyphLifeline('entity'), { boxHit: true, textBox: lifeText }),
  shape('uml25.boundary', 'Boundary', `shape=umlBoundary;verticalLabelPosition=bottom;verticalAlign=top;${DRAWIO}`, glyphIcon('boundary'), { boxHit: true, textPlacement: 'below' }),
  shape('uml25.control', 'Control', `shape=umlControl;verticalLabelPosition=bottom;verticalAlign=top;${DRAWIO}`, glyphIcon('control'), { boxHit: true, textPlacement: 'below' }),
  shape('uml25.entity', 'Entity', `shape=umlEntity;verticalLabelPosition=bottom;verticalAlign=top;${DRAWIO}`, glyphIcon('entity'), { boxHit: true, textPlacement: 'below' }),
  shape('uml25.destroy', 'Destruction', `shape=umlDestroy;${DRAWIO}`, ({ w, h, style }) => <Line s={style} k={1.4} d={crossD(w, h)} />, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.fragment', 'Combined fragment', `shape=umlFrame;width=60;height=20;container=1;${DRAWIO}`, Fragment, { container: true, textPlacement: 'custom' }),
  shape('uml25.interactionUse', 'Interaction use', `shape=umlFrame;width=40;height=20;${DRAWIO}`, InteractionUse, { textBox: tagText('ref') }),
  shape('uml25.gate', 'Gate', 'shape=mxgraph.uml25.gate;html=1;', Gate, { boxHit: true, textPlacement: 'below' }),

  // Components, deployment & packages
  shape('uml25.component', 'Component with ports', `shape=component;align=left;spacingLeft=36;${DRAWIO}`, ComponentPorts, {
    rounded: true,
    textBox: (w, h) => ({ x: portSize(w, h) + 6, y: 6, w: Math.max(1, w - portSize(w, h) * 2 - 12 - Math.min(18, w * 0.15)), h: Math.max(1, h - 12) }),
  }),
  shape('uml25.provided', 'Provided interface', `shape=lollipop;direction=west;${DRAWIO}`, Provided, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.required', 'Required interface', `shape=requiredInterface;${DRAWIO}`, Required, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.assembly', 'Assembly connector', `shape=providedRequiredInterface;${DRAWIO}`, Assembly, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.artifact', 'Artifact', `shape=mxgraph.uml25.artifact;${DRAWIO}`, Artifact, {
    textBox: (w, h) => ({ x: 8, y: 6, w: Math.max(1, w - 16 - Math.min(18, w * 0.18)), h: Math.max(1, h - 12) }),
  }),
  shape('uml25.packageTab', 'Package (name in tab)', `shape=folder;tabWidth=110;tabHeight=24;tabPosition=left;fontStyle=1;verticalAlign=top;align=left;spacingLeft=6;${DRAWIO}`, PackageTab, {
    container: true,
    textBox: (w, h) => ({ x: 6, y: 0, w: Math.max(1, tabOf(w, h).tw - 10), h: tabOf(w, h).th }),
  }),
  shape('uml25.model', 'Model', `shape=mxgraph.uml25.model;${DRAWIO}`, Model, {
    container: true,
    textBox: (w, h) => ({ x: 6, y: 0, w: Math.max(1, tabOf(w, h).tw - 10), h: tabOf(w, h).th }),
  }),

  // Timing
  shape('uml25.timingState', 'State timeline', `shape=mxgraph.uml25.timingState;${DRAWIO}`, TimingState, { textPlacement: 'custom' }),
  shape('uml25.timingValue', 'Value lifeline', `shape=mxgraph.uml25.timingValue;${DRAWIO}`, TimingValue, { textPlacement: 'custom' }),

  // State machines
  shape('uml25.shallowHistory', 'Shallow history', 'shape=mxgraph.uml25.shallowHistory;html=1;', History({ deep: false }), { perimeter: 'ellipse', textPlacement: 'below' }),
  shape('uml25.deepHistory', 'Deep history', 'shape=mxgraph.uml25.deepHistory;html=1;', History({ deep: true }), { perimeter: 'ellipse', textPlacement: 'below' }),
  shape('uml25.entryPoint', 'Entry point', 'shape=mxgraph.uml25.entryPoint;html=1;verticalLabelPosition=bottom;verticalAlign=top;', ({ w, h, style }) => <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={plain(style)} />, {
    perimeter: 'ellipse',
    textPlacement: 'below',
  }),
  shape('uml25.exitPoint', 'Exit point', 'shape=mxgraph.uml25.exitPoint;html=1;verticalLabelPosition=bottom;verticalAlign=top;', ExitPoint, { perimeter: 'ellipse', textPlacement: 'below' }),
  shape('uml25.terminate', 'Terminate', 'shape=mxgraph.uml25.terminate;html=1;', ({ w, h, style }) => <Line s={style} k={1.2} d={crossD(w, h)} />, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.compositeState', 'Composite state', `swimlane;fontStyle=1;rounded=1;startSize=26;container=1;${DRAWIO}`, CompositeState, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 8, y: 0, w: Math.max(1, w - 16), h: Math.max(1, Math.min(34, h * 0.4)) }),
  }),
  shape('uml25.submachine', 'Submachine state', `shape=mxgraph.uml25.submachine;rounded=1;${DRAWIO}`, Submachine, { rounded: true, textBox: (w, h) => inset(w, h, 10, 8) }),

  // Activities
  shape('uml25.acceptTime', 'Accept time event', `shape=collate;verticalLabelPosition=bottom;verticalAlign=top;${DRAWIO}`, Hourglass, { textPlacement: 'below' }),
  shape('uml25.expansionNode', 'Expansion node', 'shape=mxgraph.uml25.expansionNode;html=1;', ExpansionNode, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.expansionRegion', 'Expansion region', `shape=mxgraph.uml25.expansionRegion;dashed=1;rounded=1;container=1;verticalAlign=top;align=left;${DRAWIO}`, ExpansionRegion, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: Math.min(14, h * 0.12), w: Math.max(1, w * 0.5), h: Math.max(1, Math.min(24, h * 0.3)) }),
  }),
  shape('uml25.interruptible', 'Interruptible region', `shape=mxgraph.uml25.interruptibleRegion;dashed=1;rounded=1;container=1;verticalAlign=top;align=left;${DRAWIO}`, ({ w, h, style }) => (
    <RoundRect w={w} h={h} s={dashed(style)} r={rr(w, h, Math.max(style.radius, 10))} />
  ), {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: 4, w: Math.max(1, w - 20), h: Math.max(1, Math.min(24, h * 0.3)) }),
  }),
  shape('uml25.interrupt', 'Interrupting edge', 'shape=mxgraph.uml25.interrupt;html=1;', Interrupt, { boxHit: true, textPlacement: 'below' }),
  shape('uml25.activity', 'Activity frame', `shape=mxgraph.uml25.activity;rounded=1;container=1;verticalAlign=top;align=left;fontStyle=1;${DRAWIO}`, Activity, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 12, y: 6, w: Math.max(1, w - 24), h: Math.max(1, Math.min(24, h * 0.3)) }),
  }),
  shape('uml25.comment', 'Comment with anchor', `shape=mxgraph.uml25.comment;${DRAWIO}`, Comment, {
    textBox: (w, h) => {
      const b = commentBox(w, h);
      return { x: b.x + 8, y: 6, w: Math.max(1, b.w - 20), h: Math.max(1, b.h - 12) };
    },
  }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const left: Partial<ElementStyle> = { textAlign: 'left', verticalAlign: 'top' };
const black: Partial<ElementStyle> = { fill: '#1e293b', stroke: '#1e293b' };
const frame: Partial<ElementStyle> = { fill: 'none', fontSize: 12, textAlign: 'left' };
const cls: Partial<ElementStyle> = { radius: 6, fontSize: 13, ...left };
const lifeline: Partial<ElementStyle> = { fontSize: 12, fill: '#ffffff' };
const note: Partial<ElementStyle> = { fill: '#fefce8', stroke: '#a16207', ...left, fontSize: 12 };

export const libraries: ShapeLibrary[] = [
  {
    id: 'uml25',
    name: 'UML 2.5',
    items: [
      // Sequence
      item('uml.lifeline', 'Lifeline', 120, 300, { text: ':Object', style: { radius: 4 }, keywords: 'uml sequence participant object lifeline' }),
      item('uml25.actorLifeline', 'Actor lifeline', 80, 300, { text: 'User', style: lifeline, keywords: 'uml sequence actor participant lifeline stick figure' }),
      item('uml25.boundaryLifeline', 'Boundary lifeline', 80, 300, { text: ':UI', style: lifeline, keywords: 'uml sequence boundary robustness view lifeline' }),
      item('uml25.controlLifeline', 'Control lifeline', 80, 300, { text: ':Controller', style: lifeline, keywords: 'uml sequence control robustness controller lifeline' }),
      item('uml25.entityLifeline', 'Entity lifeline', 80, 300, { text: ':Order', style: lifeline, keywords: 'uml sequence entity robustness domain lifeline' }),
      item('uml25.activation', 'Activation', 12, 80, { keywords: 'uml sequence activation bar execution specification focus of control' }),
      item('uml25.destroy', 'Destruction', 22, 22, { keywords: 'uml sequence destroy destruction occurrence delete x stop' }),
      item('uml25.fragment', 'alt fragment', 340, 200, {
        text: 'alt\n[balance > 0]\n[else]',
        style: frame,
        keywords: 'uml sequence combined fragment alt alternative if else guard operand',
      }),
      item('uml25.fragment', 'opt fragment', 320, 140, { text: 'opt\n[has coupon]', style: frame, keywords: 'uml sequence combined fragment opt optional if guard' }),
      item('uml25.fragment', 'loop fragment', 320, 140, { text: 'loop\n[for each item]', style: frame, keywords: 'uml sequence combined fragment loop iteration repeat while for' }),
      item('uml25.fragment', 'par fragment', 340, 200, { text: 'par\n\n', style: frame, keywords: 'uml sequence combined fragment par parallel concurrent threads' }),
      item('uml25.fragment', 'break fragment', 320, 120, { text: 'break\n[timeout]', style: frame, keywords: 'uml sequence combined fragment break exception exit' }),
      item('uml25.fragment', 'critical fragment', 320, 120, { text: 'critical', style: frame, keywords: 'uml sequence combined fragment critical region atomic mutex' }),
      item('uml25.fragment', 'neg fragment', 320, 120, { text: 'neg', style: frame, keywords: 'uml sequence combined fragment neg negative invalid' }),
      item('uml25.fragment', 'seq / strict fragment', 320, 120, { text: 'strict', style: frame, keywords: 'uml sequence combined fragment strict seq weak ordering' }),
      item('uml25.interactionUse', 'Interaction use (ref)', 260, 70, { text: 'Authenticate user', keywords: 'uml sequence interaction use ref reference occurrence' }),
      item('uml25.gate', 'Gate', 10, 10, { keywords: 'uml sequence gate frame boundary message end' }),
      item('rectangle', 'State invariant', 120, 36, { text: '{balance ≥ 0}', style: { radius: 18, fontSize: 12 }, keywords: 'uml sequence state invariant constraint' }),
      item('uml25.boundary', 'Boundary', 50, 40, { text: 'Boundary', keywords: 'uml robustness boundary interface ui' }),
      item('uml25.control', 'Control', 40, 40, { text: 'Control', keywords: 'uml robustness control controller' }),
      item('uml25.entity', 'Entity', 40, 40, { text: 'Entity', keywords: 'uml robustness entity domain data' }),

      // Classes
      item('uml.class', 'Abstract class', 200, 110, {
        text: 'Shape\n--\n# origin: Point\n--\n+ area(): double',
        style: { ...cls, italic: true },
        keywords: 'uml class abstract italic',
      }),
      item('uml.class', 'Enumeration', 160, 110, { text: '«enumeration»\nColor\n--\nRED\nGREEN\nBLUE', style: cls, keywords: 'uml enumeration enum literals' }),
      item('uml.class', 'Data type', 180, 90, { text: '«dataType»\nMoney\n--\n+ amount: Decimal\n+ currency: String', style: cls, keywords: 'uml datatype value type' }),
      item('uml.class', 'Signal', 180, 90, { text: '«signal»\nOrderPlaced\n--\n+ orderId: UUID', style: cls, keywords: 'uml signal event message class' }),
      item('uml.class', 'Object', 180, 80, { text: 'order1 : Order\n--\nstatus = "paid"\ntotal = 42.00', style: cls, keywords: 'uml object instance specification diagram' }),

      // Components & deployment
      item('uml25.component', 'Component with ports', 200, 100, { text: '«component»\nOrder Service', style: { radius: 4 }, keywords: 'uml component port provided required interface' }),
      item('sysml.port', 'Port', 14, 14, { keywords: 'uml port component boundary interaction point' }),
      item('uml25.provided', 'Provided interface', 60, 20, { text: 'IOrders', style: { fontSize: 12 }, keywords: 'uml provided interface lollipop ball realization' }),
      item('uml25.required', 'Required interface', 60, 24, { text: 'IPayments', style: { fontSize: 12 }, keywords: 'uml required interface socket usage dependency' }),
      item('uml25.assembly', 'Assembly connector', 100, 28, { keywords: 'uml assembly connector ball and socket provided required interface' }),
      item('uml.node', 'Node', 200, 120, { text: '«node»\nApp Server', keywords: 'uml deployment node hardware' }),
      item('uml.node', 'Device', 200, 120, { text: '«device»\nDB Server', keywords: 'uml deployment device hardware machine physical' }),
      item('uml.node', 'Execution environment', 200, 120, {
        text: '«executionEnvironment»\nJVM',
        style: { fontSize: 13 },
        keywords: 'uml deployment execution environment container runtime jvm os',
      }),
      item('uml25.artifact', 'Artifact', 170, 70, { text: '«artifact»\norder-service.jar', style: { fontSize: 13 }, keywords: 'uml deployment artifact file jar war binary manifestation' }),
      item('uml25.artifact', 'Deployment specification', 190, 70, {
        text: '«deployment spec»\napplication.yml',
        style: { fontSize: 13 },
        keywords: 'uml deployment specification config descriptor',
      }),

      // Packages
      item('uml25.packageTab', 'Package (name in tab)', 220, 140, { text: 'domain', style: { bold: true, fontSize: 13, textAlign: 'left' }, keywords: 'uml package namespace folder tab' }),
      item('uml.package', 'Package (name in body)', 180, 120, { text: 'domain', style: { bold: true }, keywords: 'uml package namespace folder' }),
      item('uml25.model', 'Model', 220, 140, { text: 'Sales Model', style: { bold: true, fontSize: 13, textAlign: 'left' }, keywords: 'uml model package triangle' }),
      item('uml.package', 'Profile', 180, 120, { text: '«profile»\nEJB', style: { bold: true }, keywords: 'uml profile stereotype package extension' }),
      item('uml.class', 'Stereotype', 180, 80, { text: '«stereotype»\nEntity\n--\ntable: String', style: cls, keywords: 'uml profile stereotype metaclass extension' }),

      // Timing
      item('uml25.timingState', 'State timeline', 440, 120, {
        text: ':Door\nOpen\nClosing\nClosed',
        style: { fontSize: 12 },
        keywords: 'uml timing diagram state timeline lifeline waveform',
      }),
      item('uml25.timingValue', 'Value lifeline', 440, 60, {
        text: ':Signal\nIdle\nActive\nIdle',
        style: { fontSize: 12, fill: '#eef2ff' },
        keywords: 'uml timing diagram value lifeline bus compact',
      }),

      // State machines
      item('uml.initial', 'Initial pseudostate', 24, 24, { keywords: 'uml state machine initial start pseudostate' }),
      item('uml.final', 'Final state', 28, 28, { keywords: 'uml state machine final end' }),
      item('rectangle', 'State', 140, 60, { text: 'Idle', style: { radius: 18 }, keywords: 'uml state machine simple state' }),
      item('uml25.compositeState', 'Composite state', 320, 200, { text: 'Active', style: { bold: true, fontSize: 13 }, keywords: 'uml state machine composite orthogonal region concurrent' }),
      item('uml25.submachine', 'Submachine state', 170, 64, { text: 'Checkout : PaymentSM', keywords: 'uml state machine submachine reference' }),
      item('sysml.forkBar', 'Fork / join (horizontal)', 120, 6, { style: black, keywords: 'uml state machine activity fork join pseudostate bar synchronization' }),
      item('sysml.forkBar', 'Fork / join (vertical)', 6, 100, { style: black, keywords: 'uml state machine activity fork join pseudostate bar synchronization' }),
      item('diamond', 'Choice', 30, 30, { text: '', keywords: 'uml state machine choice pseudostate dynamic branch' }),
      item('uml.initial', 'Junction', 14, 14, { keywords: 'uml state machine junction pseudostate static branch merge' }),
      item('uml25.shallowHistory', 'Shallow history', 30, 30, { keywords: 'uml state machine history shallow h pseudostate' }),
      item('uml25.deepHistory', 'Deep history', 30, 30, { keywords: 'uml state machine history deep h* pseudostate' }),
      item('uml25.entryPoint', 'Entry point', 18, 18, { keywords: 'uml state machine entry point pseudostate connection' }),
      item('uml25.exitPoint', 'Exit point', 18, 18, { keywords: 'uml state machine exit point pseudostate connection' }),
      item('uml25.terminate', 'Terminate', 20, 20, { keywords: 'uml state machine terminate pseudostate x kill' }),

      // Activities
      item('uml25.activity', 'Activity', 420, 260, { text: 'Process Order', style: { bold: true, fontSize: 13, fill: 'none' }, keywords: 'uml activity frame diagram behavior' }),
      item('rectangle', 'Action', 140, 56, { text: 'Action', style: { radius: 14 }, keywords: 'uml activity action step task' }),
      item('sysml.callBehavior', 'Call behavior action', 150, 60, { text: 'Ship order', keywords: 'uml activity call behavior action rake subactivity' }),
      item('sysml.sendSignal', 'Send signal action', 150, 56, { text: 'Notify customer', keywords: 'uml activity send signal action event' }),
      item('sysml.acceptEvent', 'Accept event action', 150, 56, { text: 'Payment received', keywords: 'uml activity accept event receive signal action' }),
      item('uml25.acceptTime', 'Accept time event', 26, 36, { text: 'after 30 days', style: { fontSize: 12 }, keywords: 'uml activity accept time event hourglass timer wait' }),
      item('rectangle', 'Object node', 130, 50, { text: ':Order', style: { radius: 0 }, keywords: 'uml activity object node data token' }),
      item('rectangle', 'Object node (in state)', 130, 56, { text: ':Order\n[Filled]', style: { radius: 0 }, keywords: 'uml activity object node state' }),
      item('sysml.port', 'Pin', 12, 12, { keywords: 'uml activity pin input output parameter' }),
      item('sysml.flowPortRight', 'Input / output pin', 14, 14, { keywords: 'uml activity pin input output arrow stream' }),
      item('diamond', 'Decision / merge', 40, 40, { text: '', keywords: 'uml activity decision merge branch' }),
      item('uml.final', 'Activity final', 28, 28, { keywords: 'uml activity final end' }),
      item('sysml.flowFinal', 'Flow final', 28, 28, { keywords: 'uml activity flow final end x' }),
      item('lane.laneV', 'Partition (vertical)', 180, 360, { text: 'Customer', style: { fill: '#ffffff', stroke: '#64748b', fontSize: 13, textColor: '#334155', radius: 0 }, keywords: 'uml activity partition swimlane column' }),
      item('lane.laneH', 'Partition (horizontal)', 480, 130, { text: 'Warehouse', style: { fill: '#ffffff', stroke: '#64748b', fontSize: 13, textColor: '#334155', radius: 0 }, keywords: 'uml activity partition swimlane row' }),
      item('uml25.expansionRegion', 'Expansion region', 300, 180, { text: '«iterative»', style: { fill: 'none', fontSize: 12 }, keywords: 'uml activity expansion region iterative parallel stream collection' }),
      item('uml25.expansionNode', 'Expansion node', 44, 12, { keywords: 'uml activity expansion node collection input output' }),
      item('uml25.interruptible', 'Interruptible region', 300, 180, { style: { fill: 'none', fontSize: 12 }, keywords: 'uml activity interruptible region cancel' }),
      item('uml25.interrupt', 'Interrupting edge', 30, 40, { keywords: 'uml activity interrupting edge lightning exception cancel' }),

      // Annotations
      item('uml25.comment', 'Comment with anchor', 200, 110, { text: 'Only for premium customers', style: note, keywords: 'uml comment note anchor annotation' }),
      item('text', 'Constraint', 120, 30, { text: '{ordered, unique}', style: { fill: 'none', stroke: 'none', fontSize: 13 }, keywords: 'uml constraint ocl braces rule' }),
    ],
  },
];
