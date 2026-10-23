/**
 * Mockups / wireframes: browser & device frames, form controls, navigation
 * and content placeholders. Controls whose label is the element text use the
 * text box; decorative "fake text" is drawn as rounded grey bars.
 */
import type { ComponentType } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, Search, TriangleAlert, X,
  type LucideProps,
} from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { measureText } from '@/lib/text';
import { Detail, RoundRect, inset, rr, strokeAttrs, topRounded } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Label, TONE, f, ink, item, shape, solid } from './_kit2';

const ACCENT = '#2563eb';
const GREY = '#cbd5e1';
const LIGHT = '#f1f5f9';
const MUTED = '#94a3b8';

/** Rounded grey bar standing in for text. */
function Bar({ x, y, w, h, fill = GREY, o = 1 }: { x: number; y: number; w: number; h: number; fill?: string; o?: number }) {
  if (w <= 0 || h <= 0) return null;
  return <rect x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(h / 2)} fill={fill} fillOpacity={o} />;
}

/** Splits `a|b|c` (or one item per line) into labels. */
const parts = (text: string) => text.split(/\||\n/).map((t) => t.trim()).filter(Boolean);

/** Landscape + sun glyph used by image placeholders. */
function Landscape({ x, y, w, h, s }: { x: number; y: number; w: number; h: number; s: ElementStyle }) {
  const c = ink(s);
  const m = Math.min(w, h);
  return (
    <>
      <circle cx={f(x + w * 0.68)} cy={f(y + h * 0.32)} r={f(m * 0.09)} fill={c} fillOpacity={0.35} />
      <path
        d={`M${f(x + w * 0.12)},${f(y + h * 0.82)} L${f(x + w * 0.38)},${f(y + h * 0.42)} L${f(x + w * 0.56)},${f(y + h * 0.68)} L${f(x + w * 0.7)},${f(y + h * 0.54)} L${f(x + w * 0.88)},${f(y + h * 0.82)} Z`}
        fill={c}
        fillOpacity={0.3}
        stroke="none"
        strokeLinejoin="round"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

const browserBar = (h: number) => Math.min(34, Math.max(14, h * 0.18));

function Browser({ w, h, style }: ShapeRenderContext) {
  const bar = browserBar(h);
  const r = rr(w, h, style.radius);
  const dot = Math.min(3.5, bar * 0.13);
  const ax = Math.min(52, w * 0.25);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, bar, r)} fill={ink(style)} fillOpacity={0.06} stroke="none" />
      <Detail d={`M0,${f(bar)} H${f(w)}`} s={solid(style, 0.75)} />
      {['#f87171', '#fbbf24', '#34d399'].map((c, i) => (
        <circle key={c} cx={f(Math.min(14, w * 0.06) + i * dot * 3)} cy={f(bar / 2)} r={f(dot)} fill={c} />
      ))}
      <rect x={f(ax)} y={f(bar * 0.2)} width={f(Math.max(0, w - ax - 12))} height={f(bar * 0.6)} rx={f(bar * 0.3)} fill="#ffffff" stroke="#e2e8f0" strokeWidth={1} />
    </>
  );
}

function device(tablet: boolean) {
  return function Device({ w, h, style }: ShapeRenderContext) {
    const m = Math.min(w, h);
    const R = m * (tablet ? 0.07 : 0.14);
    const b = m * (tablet ? 0.05 : 0.045);
    const sr = Math.max(2, R - b);
    return (
      <>
        <rect width={w} height={h} rx={f(R)} fill={style.fill === 'none' ? '#1e293b' : style.fill} {...strokeAttrs(style)} />
        <rect x={f(b)} y={f(b)} width={f(w - b * 2)} height={f(h - b * 2)} rx={f(sr)} fill="#ffffff" stroke="none" />
        {tablet ? (
          <circle cx={f(w / 2)} cy={f(b / 2)} r={f(b * 0.22)} fill="#64748b" />
        ) : (
          <rect x={f(w / 2 - m * 0.13)} y={f(b + m * 0.03)} width={f(m * 0.26)} height={f(m * 0.06)} rx={f(m * 0.03)} fill="#0f172a" />
        )}
        <rect x={f(w / 2 - m * 0.16)} y={f(h - b - m * 0.04)} width={f(m * 0.32)} height={f(Math.max(1.5, m * 0.014))} rx={1} fill="#0f172a" fillOpacity={0.55} />
      </>
    );
  };
}

const deviceScreen = (tablet: boolean) => (w: number, h: number): Rect => {
  const m = Math.min(w, h);
  const b = m * (tablet ? 0.05 : 0.045) + 8;
  return { x: b, y: b + m * 0.08, w: Math.max(1, w - b * 2), h: Math.max(1, h * 0.12) };
};

function Modal({ w, h, style }: ShapeRenderContext) {
  const hh = Math.min(44, h * 0.2);
  const fh = Math.min(52, h * 0.24);
  const bw = Math.min(72, w * 0.22);
  const bh = Math.min(28, fh * 0.56);
  const by = h - fh / 2 - bh / 2;
  const fs = Math.max(8, Math.min(12, bh * 0.45));
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Detail d={`M0,${f(hh)} H${f(w)} M0,${f(h - fh)} H${f(w)}`} s={solid(style, 0.6)} />
      <Glyph Icon={X} cx={w - hh / 2} cy={hh / 2} size={hh * 0.38} s={style} color={MUTED} sw={2} />
      <rect x={f(w - bw * 2 - 22)} y={f(by)} width={f(bw)} height={f(bh)} rx={6} fill="#ffffff" stroke={GREY} strokeWidth={1} />
      <Label x={w - bw * 1.5 - 22} y={by + bh / 2} text="Cancel" s={style} size={fs} color="#334155" />
      <rect x={f(w - bw - 12)} y={f(by)} width={f(bw)} height={f(bh)} rx={6} fill={ACCENT} />
      <Label x={w - bw / 2 - 12} y={by + bh / 2} text="OK" s={style} size={fs} color="#ffffff" bold />
    </>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const boxSide = (h: number) => Math.min(h, 18);

function checkbox(checked: boolean) {
  return function Checkbox({ h, style }: ShapeRenderContext) {
    const b = boxSide(h);
    const y = (h - b) / 2;
    const c = ink(style);
    return (
      <>
        <rect x={0.75} y={f(y + 0.75)} width={f(b - 1.5)} height={f(b - 1.5)} rx={f(b * 0.22)} fill={checked ? c : '#ffffff'} stroke={c} strokeWidth={1.5} />
        {checked && (
          <path
            d={`M${f(b * 0.27)},${f(y + b * 0.52)} L${f(b * 0.44)},${f(y + b * 0.69)} L${f(b * 0.75)},${f(y + b * 0.34)}`}
            fill="none"
            stroke="#ffffff"
            strokeWidth={Math.max(1.5, b * 0.11)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </>
    );
  };
}

function radio(on: boolean) {
  return function Radio({ h, style }: ShapeRenderContext) {
    const b = boxSide(h);
    const c = ink(style);
    return (
      <>
        <circle cx={f(b / 2)} cy={f(h / 2)} r={f(b / 2 - 0.75)} fill="#ffffff" stroke={c} strokeWidth={1.5} />
        {on && <circle cx={f(b / 2)} cy={f(h / 2)} r={f(b * 0.24)} fill={c} />}
      </>
    );
  };
}

const besideBox = (w: number, h: number): Rect => {
  const x = boxSide(h) + 8;
  return { x, y: 0, w: Math.max(1, w - x), h };
};

const toggleW = (w: number, h: number) => Math.min(w, h * 1.8);

function Toggle({ w, h, style }: ShapeRenderContext) {
  const tw = toggleW(w, h);
  const r = h / 2;
  const k = r - Math.max(2, h * 0.12);
  return (
    <>
      <rect width={f(tw)} height={h} rx={f(r)} fill={ink(style)} />
      <circle cx={f(tw - r)} cy={f(r)} r={f(k)} fill="#ffffff" />
    </>
  );
}

function Dropdown({ w, h, style }: ShapeRenderContext) {
  const bw = Math.min(h, w * 0.3);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Glyph Icon={ChevronDown} cx={w - bw / 2} cy={h / 2} size={Math.min(16, h * 0.5)} s={style} color="#64748b" sw={2} />
    </>
  );
}

function Slider({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(h / 2, 9);
  const x0 = r;
  const x1 = w - r;
  const pos = x0 + (x1 - x0) * 0.6;
  const t = Math.max(3, Math.min(5, h * 0.22));
  return (
    <>
      <rect x={f(x0)} y={f(h / 2 - t / 2)} width={f(Math.max(0, x1 - x0))} height={f(t)} rx={f(t / 2)} fill="#e2e8f0" />
      <rect x={f(x0)} y={f(h / 2 - t / 2)} width={f(Math.max(0, pos - x0))} height={f(t)} rx={f(t / 2)} fill={ink(style)} />
      <circle cx={f(pos)} cy={f(h / 2)} r={f(r - 1)} fill="#ffffff" stroke={ink(style)} strokeWidth={2} />
    </>
  );
}

function Progress({ w, h, style }: ShapeRenderContext) {
  const r = h / 2;
  return (
    <>
      <rect width={w} height={h} rx={f(r)} fill="#e2e8f0" />
      <rect width={f(w * 0.65)} height={h} rx={f(r)} fill={ink(style)} />
    </>
  );
}

function Search_({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={h / 2} />
      <Glyph Icon={Search} cx={h * 0.55} cy={h / 2} size={Math.min(16, h * 0.45)} s={style} color="#64748b" sw={2} />
    </>
  );
}

function Textarea({ w, h, style }: ShapeRenderContext) {
  const g = Math.min(10, w * 0.1, h * 0.2);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M${f(w - 4)},${f(h - 4 - g)} L${f(w - 4 - g)},${f(h - 4)} M${f(w - 4)},${f(h - 4 - g / 2)} L${f(w - 4 - g / 2)},${f(h - 4)}`} stroke={MUTED} strokeWidth={1.25} strokeLinecap="round" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Tabs({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const n = Math.max(labels.length, 3);
  const tw = w / n;
  const c = ink(style);
  const fs = Math.min(style.fontSize, h * 0.42);
  return (
    <>
      <Detail d={`M0,${f(h - 0.75)} H${f(w)}`} s={{ ...solid(style, 0.75), stroke: '#e2e8f0' }} />
      {Array.from({ length: n }, (_, i) => {
        const cx = tw * i + tw / 2;
        const active = i === 0;
        const label = labels[i];
        return (
          <g key={i}>
            {label ? (
              <Label x={cx} y={h / 2} text={label} s={style} size={fs} color={active ? c : '#64748b'} bold={active} />
            ) : (
              <Bar x={cx - tw * 0.28} y={h / 2 - 3} w={tw * 0.56} h={6} fill={active ? c : GREY} o={active ? 0.55 : 1} />
            )}
            {active && <rect x={f(tw * i + tw * 0.1)} y={f(h - 3)} width={f(tw * 0.8)} height={3} rx={1.5} fill={c} />}
          </g>
        );
      })}
    </>
  );
}

function Navbar({ w, h, style, text }: ShapeRenderContext) {
  const logo = h * 0.5;
  const c = ink(style);
  const bw = Math.min(70, w * 0.13);
  const bh = h * 0.5;
  const links = 3;
  const lw = Math.min(46, w * 0.08);
  const right = w - 14 - bw;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <rect x={14} y={f((h - logo) / 2)} width={f(logo)} height={f(logo)} rx={f(logo * 0.28)} fill={ACCENT} />
      {!text && <Bar x={22 + logo} y={h / 2 - 4} w={Math.min(70, w * 0.16)} h={8} fill="#64748b" />}
      {Array.from({ length: links }, (_, i) => (
        <Bar key={i} x={right - (links - i) * (lw + 14)} y={h / 2 - 3} w={lw} h={6} />
      ))}
      <rect x={f(right)} y={f((h - bh) / 2)} width={f(bw)} height={f(bh)} rx={f(Math.min(6, bh / 2))} fill={c} />
    </>
  );
}

const navbarText = (w: number, h: number): Rect => ({ x: 22 + h * 0.5, y: 0, w: Math.max(1, w * 0.35), h });

function Breadcrumb({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const fs = Math.min(style.fontSize, h * 0.55);
  const st = { ...style, fontSize: fs };
  let x = 0;
  const out = [];
  for (let i = 0; i < labels.length && x < w; i++) {
    const last = i === labels.length - 1;
    const tw = measureText(labels[i], { ...st, bold: last });
    out.push(<Label key={`l${i}`} x={x} y={h / 2} text={labels[i]} s={st} anchor="start" color={last ? style.textColor : ACCENT} bold={last} />);
    x += tw + 6;
    if (!last) {
      out.push(<Glyph key={`c${i}`} Icon={ChevronRight} cx={x + fs * 0.35} cy={h / 2} size={fs * 0.9} s={style} color={MUTED} sw={2} />);
      x += fs * 0.7 + 6;
    }
  }
  if (!labels.length) {
    for (let i = 0; i < 3; i++) {
      out.push(<Bar key={i} x={(w / 3) * i} y={h / 2 - 3} w={w / 3 - 18} h={6} fill={i < 2 ? ACCENT : '#64748b'} o={i < 2 ? 0.5 : 1} />);
      if (i < 2) out.push(<Glyph key={`g${i}`} Icon={ChevronRight} cx={(w / 3) * (i + 1) - 9} cy={h / 2} size={h * 0.5} s={style} color={MUTED} sw={2} />);
    }
  }
  return <>{out}</>;
}

function Pagination({ w, h, style }: ShapeRenderContext) {
  const n = 7;
  const gap = Math.min(6, w * 0.02);
  const b = Math.min(h, (w - gap * (n - 1)) / n);
  const x0 = (w - (b * n + gap * (n - 1))) / 2;
  const y = (h - b) / 2;
  const fs = Math.min(style.fontSize, b * 0.45);
  const c = ink(style);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * (b + gap);
        const active = i === 2;
        return (
          <g key={i}>
            <rect x={f(x + 0.5)} y={f(y + 0.5)} width={f(b - 1)} height={f(b - 1)} rx={f(Math.min(6, b * 0.2))} fill={active ? c : '#ffffff'} stroke={active ? c : '#e2e8f0'} strokeWidth={1} />
            {i === 0 || i === n - 1 ? (
              <Glyph Icon={i === 0 ? ChevronLeft : ChevronRight} cx={x + b / 2} cy={h / 2} size={b * 0.5} s={style} color="#64748b" sw={2} />
            ) : (
              <Label x={x + b / 2} y={h / 2} text={String(i)} s={style} size={fs} color={active ? '#ffffff' : '#334155'} bold={active} />
            )}
          </g>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Feedback & content
// ---------------------------------------------------------------------------

const alertIcon = (h: number) => Math.min(18, h * 0.42);

function alert(Icon: ComponentType<LucideProps>) {
  return function Alert({ w, h, style }: ShapeRenderContext) {
    const g = alertIcon(h);
    return (
      <>
        <RoundRect w={w} h={h} s={style} />
        <Glyph Icon={Icon} cx={12 + g / 2} cy={h / 2} size={g} s={style} sw={2} />
      </>
    );
  };
}

const alertText = (w: number, h: number): Rect => {
  const x = 12 + alertIcon(h) + 10;
  return { x, y: 6, w: Math.max(1, w - x - 10), h: Math.max(1, h - 12) };
};

function Tooltip({ w, h, style }: ShapeRenderContext) {
  const p = Math.min(8, h * 0.2);
  const bh = h - p;
  const r = rr(w, bh, style.radius);
  const c = w / 2;
  return (
    <path
      d={`M${f(r)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(bh - r)} Q${f(w)},${f(bh)} ${f(w - r)},${f(bh)} H${f(c + p)} L${f(c)},${f(h)} L${f(c - p)},${f(bh)} H${f(r)} Q0,${f(bh)} 0,${f(bh - r)} V${f(r)} Q0,0 ${f(r)},0 Z`}
      fill={style.fill === 'none' ? 'none' : style.fill}
      {...strokeAttrs(style)}
    />
  );
}

function Avatar({ w, h, style }: ShapeRenderContext) {
  const rx = w / 2;
  const ry = h / 2;
  const X = (k: number) => f(rx + k * rx);
  const Y = (k: number) => f(ry + k * ry);
  return (
    <>
      <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill={style.fill === 'none' ? 'none' : style.fill} {...strokeAttrs(style)} />
      <ellipse cx={rx} cy={Y(-0.16)} rx={f(rx * 0.33)} ry={f(ry * 0.33)} fill={ink(style)} fillOpacity={0.55} />
      <path
        d={`M${X(-0.574)},${Y(0.819)} C${X(-0.56)},${Y(0.42)} ${X(-0.34)},${Y(0.28)} ${X(0)},${Y(0.28)} C${X(0.34)},${Y(0.28)} ${X(0.56)},${Y(0.42)} ${X(0.574)},${Y(0.819)} A${f(rx)},${f(ry)} 0 0 1 ${X(-0.574)},${Y(0.819)} Z`}
        fill={ink(style)}
        fillOpacity={0.55}
      />
    </>
  );
}

function ImagePh({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Landscape x={0} y={0} w={w} h={h} s={style} />
    </>
  );
}

function Table({ w, h, style, text }: ShapeRenderContext) {
  const hh = Math.min(30, h * 0.22);
  const rows = Math.max(1, Math.round((h - hh) / 28));
  const rh = (h - hh) / rows;
  const cols = 3;
  const cw = w / cols;
  const r = rr(w, h, style.radius);
  const line = solid(style, 0.6);
  let d = `M0,${f(hh)} H${f(w)}`;
  for (let i = 1; i < rows; i++) d += ` M0,${f(hh + rh * i)} H${f(w)}`;
  for (let j = 1; j < cols; j++) d += ` M${f(cw * j)},0 V${f(h)}`;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, hh, r)} fill={ink(style)} fillOpacity={0.07} stroke="none" />
      <Detail d={d} s={{ ...line, stroke: '#e2e8f0' }} />
      {Array.from({ length: cols }, (_, j) => (
        <g key={j}>
          {!text && <Bar x={cw * j + 10} y={hh / 2 - 3} w={cw * 0.5} h={6} fill="#64748b" o={0.7} />}
          {Array.from({ length: rows }, (_, i) => (
            <Bar key={i} x={cw * j + 10} y={hh + rh * i + rh / 2 - 3} w={cw * (0.35 + ((i + j) % 3) * 0.12)} h={6} />
          ))}
        </g>
      ))}
    </>
  );
}

const calHeader = (h: number) => Math.min(36, h * 0.17);

function Calendar({ w, h, style }: ShapeRenderContext) {
  const hh = calHeader(h);
  const wh = Math.min(22, h * 0.1);
  const cw = (w - 12) / 7;
  const ch = (h - hh - wh - 8) / 5;
  const fs = Math.max(4, Math.min(12, ch * 0.45, cw * 0.42));
  const c = ACCENT;
  const offset = 4;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Detail d={`M0,${f(hh)} H${f(w)}`} s={{ ...solid(style, 0.6), stroke: '#e2e8f0' }} />
      <Glyph Icon={ChevronLeft} cx={hh * 0.6} cy={hh / 2} size={hh * 0.45} s={style} color="#64748b" sw={2} />
      <Glyph Icon={ChevronRight} cx={w - hh * 0.6} cy={hh / 2} size={hh * 0.45} s={style} color="#64748b" sw={2} />
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <Label key={i} x={6 + cw * i + cw / 2} y={hh + wh / 2 + 2} text={d} s={style} size={fs * 0.9} color={MUTED} bold />
      ))}
      {Array.from({ length: 31 }, (_, i) => {
        const k = i + offset;
        const cx = 6 + cw * (k % 7) + cw / 2;
        const cy = hh + wh + 4 + ch * Math.floor(k / 7) + ch / 2;
        const today = i + 1 === 23;
        return (
          <g key={i}>
            {today && <circle cx={f(cx)} cy={f(cy)} r={f(Math.min(cw, ch) * 0.42)} fill={c} />}
            <Label x={cx} y={cy} text={String(i + 1)} s={style} size={fs} color={today ? '#ffffff' : '#334155'} bold={today} />
          </g>
        );
      })}
    </>
  );
}

function Card({ w, h, style }: ShapeRenderContext) {
  const ih = h * 0.46;
  const r = rr(w, h, style.radius);
  const by = h - Math.min(34, h * 0.2);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, ih, r)} fill={LIGHT} stroke="none" />
      <Landscape x={w * 0.2} y={ih * 0.08} w={w * 0.6} h={ih * 0.9} s={style} />
      <Detail d={`M0,${f(ih)} H${f(w)}`} s={{ ...solid(style, 0.6), stroke: '#e2e8f0' }} />
      <Bar x={14} y={by - 18} w={w * 0.75} h={6} />
      <Bar x={14} y={by - 6} w={w * 0.55} h={6} />
      <rect x={14} y={f(by + 4)} width={f(Math.min(80, w * 0.38))} height={f(Math.min(22, h * 0.13))} rx={6} fill={ACCENT} />
    </>
  );
}

const cardText = (w: number, h: number): Rect => ({ x: 14, y: h * 0.46 + 8, w: Math.max(1, w - 28), h: Math.max(1, Math.min(24, h * 0.14)) });

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const BTN = 'shape=mxgraph.mockup.buttons.button;whiteSpace=wrap;fontStyle=1;';
const FORM = 'shape=mxgraph.mockup.forms.rrect;rSize=0;align=left;spacingLeft=8;whiteSpace=wrap;';

export const shapes: ShapeDef[] = [
  shape('mock.browser', 'Browser window', 'shape=mxgraph.mockup.containers.browserWindow;mainText=;recursiveResize=0;container=1;', Browser, {
    rounded: true,
    container: true,
    textBox: (w, h) => {
      const bar = browserBar(h);
      const ax = Math.min(52, w * 0.25) + 10;
      return { x: ax, y: bar * 0.2, w: Math.max(1, w - ax - 22), h: bar * 0.6 };
    },
  }),
  shape('mock.phone', 'Phone', 'shape=mxgraph.mockup.containers.phone;container=1;', device(false), { container: true, textBox: deviceScreen(false) }),
  shape('mock.tablet', 'Tablet', 'shape=mxgraph.mockup.containers.tablet;container=1;', device(true), { container: true, textBox: deviceScreen(true) }),
  shape('mock.modal', 'Modal dialog', 'shape=mxgraph.mockup.containers.window;mainText=;container=1;', Modal, {
    rounded: true,
    container: true,
    textBox: (w, h) => ({ x: 16, y: 0, w: Math.max(1, w - 16 - Math.min(44, h * 0.2)), h: Math.min(44, h * 0.2) }),
  }),
  shape('mock.button', 'Button', BTN, ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />, {
    rounded: true,
    textBox: (w, h) => inset(w, h, 10, 4),
  }),
  shape('mock.input', 'Text input', FORM, ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />, {
    rounded: true,
    textBox: (w, h) => inset(w, h, 10, 4),
  }),
  shape('mock.textarea', 'Text area', FORM + 'verticalAlign=top;', Textarea, { rounded: true, textBox: (w, h) => inset(w, h, 10, 8) }),
  shape('mock.checkbox', 'Checkbox', 'shape=mxgraph.mockup.forms.checkbox;align=left;labelPosition=right;spacingLeft=4;checked=1;', checkbox(true), {
    boxHit: true,
    textBox: besideBox,
  }),
  shape('mock.checkboxOff', 'Checkbox (unchecked)', 'shape=mxgraph.mockup.forms.checkbox;align=left;labelPosition=right;spacingLeft=4;checked=0;', checkbox(false), {
    boxHit: true,
    textBox: besideBox,
  }),
  shape('mock.radio', 'Radio button', 'shape=mxgraph.mockup.forms.radioButton;align=left;labelPosition=right;spacingLeft=4;checked=1;', radio(true), {
    boxHit: true,
    textBox: besideBox,
  }),
  shape('mock.radioOff', 'Radio button (off)', 'shape=mxgraph.mockup.forms.radioButton;align=left;labelPosition=right;spacingLeft=4;checked=0;', radio(false), {
    boxHit: true,
    textBox: besideBox,
  }),
  shape('mock.toggle', 'Toggle', 'shape=mxgraph.mockup.buttons.onOffButton;buttonState=on;align=left;labelPosition=right;', Toggle, {
    boxHit: true,
    textBox: (w, h) => {
      const x = toggleW(w, h) + 8;
      return { x, y: 0, w: Math.max(1, w - x), h };
    },
  }),
  shape('mock.dropdown', 'Dropdown', 'shape=mxgraph.mockup.forms.comboBox;align=left;spacingLeft=8;whiteSpace=wrap;', Dropdown, {
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: 4, w: Math.max(1, w - 10 - Math.min(h, w * 0.3)), h: Math.max(1, h - 8) }),
  }),
  shape('mock.slider', 'Slider', 'shape=mxgraph.mockup.forms.horSlider;sliderStyle=basic;sliderPos=60;handleStyle=circle;', Slider, {
    boxHit: true,
    textPlacement: 'below',
  }),
  shape('mock.progress', 'Progress bar', 'shape=mxgraph.mockup.misc.progressBar;barPos=65;', Progress, { boxHit: true, textPlacement: 'below' }),
  shape('mock.search', 'Search box', 'shape=mxgraph.mockup.forms.searchBox;align=left;spacingLeft=26;', Search_, {
    textBox: (w, h) => ({ x: h * 0.55 + 12, y: 2, w: Math.max(1, w - h * 0.55 - 24), h: Math.max(1, h - 4) }),
  }),
  shape('mock.tabs', 'Tabs', 'shape=mxgraph.mockup.containers.tabBar;', Tabs, { boxHit: true, textPlacement: 'custom' }),
  shape('mock.navbar', 'Navigation bar', 'shape=mxgraph.mockup.containers.topButton;align=left;spacingLeft=40;', Navbar, {
    rounded: true,
    textBox: navbarText,
  }),
  shape('mock.breadcrumb', 'Breadcrumb', 'shape=mxgraph.mockup.navigation.breadcrumb;', Breadcrumb, { boxHit: true, textPlacement: 'custom' }),
  shape('mock.pagination', 'Pagination', 'shape=mxgraph.mockup.navigation.pagination;linkText=;', Pagination, { boxHit: true, textPlacement: 'custom' }),
  shape('mock.alert', 'Alert (info)', 'shape=mxgraph.mockup.misc.rrect;rSize=6;align=left;spacingLeft=36;whiteSpace=wrap;', alert(Info), {
    rounded: true,
    textBox: alertText,
  }),
  shape('mock.alertSuccess', 'Alert (success)', 'shape=mxgraph.mockup.misc.rrect;rSize=6;align=left;spacingLeft=36;whiteSpace=wrap;', alert(CircleCheck), {
    rounded: true,
    textBox: alertText,
  }),
  shape('mock.alertWarning', 'Alert (warning)', 'shape=mxgraph.mockup.misc.rrect;rSize=6;align=left;spacingLeft=36;whiteSpace=wrap;', alert(TriangleAlert), {
    rounded: true,
    textBox: alertText,
  }),
  shape('mock.alertError', 'Alert (error)', 'shape=mxgraph.mockup.misc.rrect;rSize=6;align=left;spacingLeft=36;whiteSpace=wrap;', alert(CircleAlert), {
    rounded: true,
    textBox: alertText,
  }),
  shape('mock.tooltip', 'Tooltip', 'shape=callout;rounded=1;size=8;position=0.45;position2=0.5;base=14;whiteSpace=wrap;', Tooltip, {
    rounded: true,
    textBox: (w, h) => inset(w, h - Math.min(8, h * 0.2), 8, 4),
  }),
  shape('mock.avatar', 'Avatar', 'ellipse;shape=mxgraph.mockup.containers.userMale;verticalLabelPosition=bottom;verticalAlign=top;', Avatar, {
    perimeter: 'ellipse',
    textPlacement: 'below',
  }),
  shape('mock.image', 'Image placeholder', 'shape=mxgraph.mockup.graphics.simpleIcon;', ImagePh, { rounded: true, textPlacement: 'below' }),
  shape('mock.table', 'Table', 'shape=mxgraph.mockup.containers.table;', Table, {
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: 0, w: Math.max(1, w - 20), h: Math.min(30, h * 0.22) }),
  }),
  shape('mock.calendar', 'Calendar', 'shape=mxgraph.mockup.forms.calendar;', Calendar, {
    rounded: true,
    textBox: (w, h) => ({ x: calHeader(h) * 1.2, y: 0, w: Math.max(1, w - calHeader(h) * 2.4), h: calHeader(h) }),
  }),
  shape('mock.card', 'Card', 'shape=mxgraph.mockup.containers.rrect;rSize=10;verticalAlign=top;align=left;spacingLeft=14;', Card, {
    rounded: true,
    textBox: cardText,
  }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const ctl = { fill: '#ffffff', stroke: '#cbd5e1', radius: 6, fontSize: 13, textColor: '#334155' };
const left = { textAlign: 'left', verticalAlign: 'middle' } as const;
const lbl = { fill: 'none', stroke: ACCENT, fontSize: 13, textColor: '#334155', ...left };

export const libraries: ShapeLibrary[] = [
  {
    id: 'mockups',
    name: 'Mockups',
    items: [
      item('mock.browser', 'Browser window', 320, 210, {
        text: 'https://example.com',
        style: { fill: '#ffffff', stroke: '#94a3b8', radius: 10, fontSize: 11, textColor: '#64748b', ...left },
        keywords: 'web page window chrome wireframe',
      }),
      item('mock.phone', 'Mobile phone', 180, 360, { style: { fill: '#1e293b', stroke: '#0f172a', radius: 0 }, keywords: 'device smartphone frame wireframe' }),
      item('mock.tablet', 'Tablet', 300, 400, { style: { fill: '#1e293b', stroke: '#0f172a', radius: 0 }, keywords: 'device ipad frame wireframe' }),
      item('mock.modal', 'Modal dialog', 300, 200, {
        text: 'Dialog title',
        style: { fill: '#ffffff', stroke: '#cbd5e1', radius: 10, fontSize: 14, bold: true, textColor: '#0f172a', shadow: true, ...left },
        keywords: 'window popup dialog',
      }),
      item('mock.button', 'Button', 120, 40, {
        text: 'Button',
        style: { fill: ACCENT, stroke: ACCENT, textColor: '#ffffff', radius: 8, fontSize: 14, bold: true },
        keywords: 'primary submit action cta',
      }),
      item('mock.button', 'Secondary button', 120, 40, {
        text: 'Cancel',
        style: { fill: '#ffffff', stroke: '#cbd5e1', textColor: '#334155', radius: 8, fontSize: 14 },
        keywords: 'secondary outline',
      }),
      item('mock.input', 'Text input', 200, 38, { text: 'Placeholder', style: { ...ctl, textColor: '#94a3b8', ...left }, keywords: 'text field form' }),
      item('mock.textarea', 'Text area', 220, 100, {
        text: 'Write a message…',
        style: { ...ctl, textColor: '#94a3b8', textAlign: 'left', verticalAlign: 'top' },
        keywords: 'multiline field form',
      }),
      item('mock.dropdown', 'Dropdown', 180, 38, { text: 'Select…', style: { ...ctl, ...left }, keywords: 'select combo box menu' }),
      item('mock.checkbox', 'Checkbox', 130, 22, { text: 'Remember me', style: lbl, keywords: 'tick check form' }),
      item('mock.checkboxOff', 'Checkbox (unchecked)', 130, 22, { text: 'Subscribe', style: { ...lbl, stroke: '#94a3b8' }, keywords: 'tick check form' }),
      item('mock.radio', 'Radio button', 120, 22, { text: 'Option A', style: lbl, keywords: 'option choice form' }),
      item('mock.radioOff', 'Radio (off)', 120, 22, { text: 'Option B', style: { ...lbl, stroke: '#94a3b8' }, keywords: 'option choice form' }),
      item('mock.toggle', 'Toggle', 120, 26, { text: 'Enabled', style: lbl, keywords: 'switch on off' }),
      item('mock.slider', 'Slider', 200, 20, { style: { fill: 'none', stroke: ACCENT }, keywords: 'range' }),
      item('mock.progress', 'Progress bar', 200, 10, { style: { fill: 'none', stroke: ACCENT }, keywords: 'loading percent' }),
      item('mock.search', 'Search box', 220, 38, { text: 'Search…', style: { ...ctl, textColor: '#94a3b8', ...left }, keywords: 'find query' }),
      item('mock.tabs', 'Tabs', 300, 38, { text: 'Overview|Details|Settings', style: { fill: 'none', stroke: ACCENT, fontSize: 13, textColor: '#334155' }, keywords: 'tab bar navigation' }),
      item('mock.navbar', 'Navigation bar', 360, 52, {
        text: 'Brand',
        style: { fill: '#ffffff', stroke: '#e2e8f0', radius: 8, fontSize: 15, bold: true, textColor: '#0f172a', ...left },
        keywords: 'header menu top bar',
      }),
      item('mock.breadcrumb', 'Breadcrumb', 240, 24, { text: 'Home|Library|Data', style: { fill: 'none', stroke: 'none', fontSize: 13, textColor: '#0f172a' }, keywords: 'path navigation' }),
      item('mock.pagination', 'Pagination', 240, 32, { style: { fill: 'none', stroke: ACCENT, fontSize: 13 }, keywords: 'pager pages' }),
      item('mock.alert', 'Info alert', 280, 52, { text: 'Heads up! Something changed.', style: { ...TONE.blue, radius: 8, fontSize: 13, textColor: '#1e3a8a', ...left }, keywords: 'notice banner message' }),
      item('mock.alertSuccess', 'Success alert', 280, 52, { text: 'Saved successfully.', style: { ...TONE.green, radius: 8, fontSize: 13, textColor: '#14532d', ...left }, keywords: 'notice banner ok' }),
      item('mock.alertWarning', 'Warning alert', 280, 52, { text: 'Check your input.', style: { ...TONE.amber, radius: 8, fontSize: 13, textColor: '#78350f', ...left }, keywords: 'notice banner caution' }),
      item('mock.alertError', 'Error alert', 280, 52, { text: 'Something went wrong.', style: { ...TONE.red, radius: 8, fontSize: 13, textColor: '#7f1d1d', ...left }, keywords: 'notice banner danger' }),
      item('mock.tooltip', 'Tooltip', 140, 44, { text: 'Tooltip text', style: { fill: '#1e293b', stroke: 'none', radius: 6, fontSize: 12, textColor: '#ffffff' }, keywords: 'hint popover' }),
      item('mock.avatar', 'Avatar', 56, 56, { style: { fill: '#e0e7ff', stroke: '#4f46e5', fontSize: 12 }, keywords: 'user profile picture person' }),
      item('mock.image', 'Image', 160, 110, { style: { fill: '#f1f5f9', stroke: '#cbd5e1', radius: 8, fontSize: 12 }, keywords: 'picture photo placeholder' }),
      item('mock.card', 'Card', 200, 230, {
        text: 'Card title',
        style: { fill: '#ffffff', stroke: '#e2e8f0', radius: 12, fontSize: 14, bold: true, textColor: '#0f172a', textAlign: 'left', verticalAlign: 'top' },
        keywords: 'tile panel content',
      }),
      item('mock.table', 'Table', 300, 170, { style: { fill: '#ffffff', stroke: '#cbd5e1', radius: 8, fontSize: 13, bold: true, textColor: '#334155', ...left }, keywords: 'grid data rows columns' }),
      item('mock.calendar', 'Calendar', 230, 220, {
        text: 'October 2026',
        style: { fill: '#ffffff', stroke: '#cbd5e1', radius: 10, fontSize: 13, bold: true, textColor: '#0f172a' },
        keywords: 'date picker month',
      }),
    ],
  },
];
