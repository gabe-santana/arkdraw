/**
 * Bootstrap UI: Bootstrap 5-look components for web mockups — buttons, alerts,
 * badges, navigation, cards, list groups, forms, feedback and overlays.
 *
 * Variants (primary, success, outline…) are preset styles on a few kinds, so
 * the Format panel recolours them. Multi-part labels are written `a|b|c` (or one
 * per line); controls with a single label use the normal text box.
 */
import type { ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Menu } from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { measureText } from '@/lib/text';
import { RoundRect, inset, rr, strokeAttrs, topRounded } from '../kit';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Label, f, ink, item, shape } from './_kit2';

// Bootstrap 5.3 palette.
const BS = {
  primary: '#0d6efd',
  secondary: '#6c757d',
  success: '#198754',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#0dcaf0',
  light: '#f8f9fa',
  dark: '#212529',
};
const BODY = '#212529';
const MUTED = '#6c757d';
const BORDER = '#dee2e6';
const GRAY = '#e9ecef';
const PH = '#ced4da';

/** Splits `a|b|c` (or one item per line) into labels. */
const parts = (text: string) => text.split(/\||\n/).map((t) => t.trim()).filter(Boolean);

/** Rounded grey bar standing in for text. */
function Bar({ x, y, w, h, fill = PH, o = 1 }: { x: number; y: number; w: number; h: number; fill?: string; o?: number }) {
  if (w <= 0 || h <= 0) return null;
  return <rect x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(h / 2)} fill={fill} fillOpacity={o} />;
}

/** Plain rect helper with optional stroke. */
function Box({ x, y, w, h, r = 0, fill = 'none', stroke, sw = 1, o }: { x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; sw?: number; o?: number }) {
  if (w <= 0 || h <= 0) return null;
  return (
    <rect
      x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(Math.max(0, Math.min(r, w / 2, h / 2)))}
      fill={fill} fillOpacity={o} stroke={stroke ?? 'none'} strokeWidth={stroke ? sw : 0}
    />
  );
}

/** A small Bootstrap button drawn by the shape itself. */
function Btn({ x, y, w, h, label, s, fill, color = '#ffffff', stroke }: { x: number; y: number; w: number; h: number; label: string; s: ElementStyle; fill: string; color?: string; stroke?: string }) {
  if (w <= 2 || h <= 2) return null;
  const fs = Math.max(4, Math.min(s.fontSize, h * 0.48));
  return (
    <>
      <Box x={x} y={y} w={w} h={h} r={Math.min(6, h * 0.25)} fill={fill} stroke={stroke ?? fill} />
      <Label x={x + w / 2} y={y + h / 2} text={label} s={s} size={fs} color={color} />
    </>
  );
}

/** Font size that fits a row of height `h`. */
const fit = (s: ElementStyle, h: number, k = 0.5) => Math.max(4, Math.min(s.fontSize, h * k));

/** Text width with a style override. */
const tw = (text: string, s: ElementStyle, size: number, bold = false) => measureText(text, { ...s, fontSize: size, bold });

/** Muted variant of the text colour for secondary copy. */
const muted = (s: ElementStyle) => (s.textColor === '#ffffff' ? 'rgba(255,255,255,0.65)' : MUTED);

// ---------------------------------------------------------------------------
// Buttons & badges
// ---------------------------------------------------------------------------

const Plain = ({ w, h, style }: ShapeRenderContext) => <RoundRect w={w} h={h} s={style} />;

function ButtonGroup({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const n = Math.max(1, labels.length || 3);
  const sw = w / n;
  const fs = fit(style, h);
  const divider = style.fill === 'none' || style.fill === '#ffffff' ? ink(style) : 'rgba(0,0,0,0.2)';
  let d = '';
  for (let i = 1; i < n; i++) d += `M${f(sw * i)},0 V${f(h)} `;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      {d && <path d={d} stroke={divider} strokeWidth={1} />}
      {Array.from({ length: n }, (_, i) =>
        labels[i] ? (
          <Label key={i} x={sw * i + sw / 2} y={h / 2} text={labels[i]} s={style} size={fs} />
        ) : (
          <Bar key={i} x={sw * i + sw * 0.25} y={h / 2 - 3} w={sw * 0.5} h={6} fill={style.textColor} o={0.6} />
        ),
      )}
    </>
  );
}

function DropdownButton({ w, h, style }: ShapeRenderContext) {
  const g = Math.min(12, h * 0.4);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path
        d={`M${f(w - 12 - g)},${f(h / 2 - g * 0.22)} L${f(w - 12 - g / 2)},${f(h / 2 + g * 0.28)} L${f(w - 12)},${f(h / 2 - g * 0.22)} Z`}
        fill={style.textColor}
      />
    </>
  );
}

function ButtonBadge({ w, h, style, text }: ShapeRenderContext) {
  const [label = '', count = ''] = parts(text);
  const fs = fit(style, h);
  const cw = count ? Math.max(fs * 1.4, tw(count, style, fs * 0.8, true) + fs * 0.8) : 0;
  const lw = tw(label, style, fs);
  const x0 = (w - lw - (cw ? cw + 8 : 0)) / 2;
  const bh = fs * 1.3;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={x0} y={h / 2} text={label} s={style} size={fs} anchor="start" />
      {count && (
        <>
          <Box x={x0 + lw + 8} y={(h - bh) / 2} w={cw} h={bh} r={4} fill={style.textColor} o={0.92} />
          <Label x={x0 + lw + 8 + cw / 2} y={h / 2} text={count} s={style} size={fs * 0.8} color={style.fill === 'none' ? '#ffffff' : style.fill} bold />
        </>
      )}
    </>
  );
}

function CloseButton({ w, h, style }: ShapeRenderContext) {
  const k = Math.min(w, h) * 0.3;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <>
      <rect width={w} height={h} rx={f(Math.min(6, w * 0.2))} fill={style.fill === 'none' ? 'none' : style.fill} stroke="none" />
      <path
        d={`M${f(cx - k)},${f(cy - k)} L${f(cx + k)},${f(cy + k)} M${f(cx + k)},${f(cy - k)} L${f(cx - k)},${f(cy + k)}`}
        stroke={ink(style)}
        strokeOpacity={0.6}
        strokeWidth={Math.max(1, Math.min(w, h) * 0.08)}
        strokeLinecap="round"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Alerts, toasts, overlays
// ---------------------------------------------------------------------------

function DismissAlert({ w, h, style }: ShapeRenderContext) {
  const k = Math.min(5, h * 0.12, w * 0.04);
  const cx = w - 18;
  const cy = Math.min(h / 2, 22);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path
        d={`M${f(cx - k)},${f(cy - k)} L${f(cx + k)},${f(cy + k)} M${f(cx + k)},${f(cy - k)} L${f(cx - k)},${f(cy + k)}`}
        stroke={style.textColor}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </>
  );
}

function HeadingAlert({ w, h, style, text }: ShapeRenderContext) {
  const [title = '', ...rest] = parts(text);
  const ts = style.fontSize * 1.35;
  const hy = Math.min(h * 0.42, 22 + ts * 1.4);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={16} y={16 + ts * 0.55} text={title} s={style} size={ts} anchor="start" bold />
      {rest[0] && <Label x={16} y={hy + style.fontSize * 0.2} text={rest[0]} s={style} anchor="start" />}
      <path d={`M16,${f(hy + style.fontSize * 1.1)} H${f(w - 16)}`} stroke={ink(style)} strokeOpacity={0.5} strokeWidth={1} />
      {rest[1] && <Label x={16} y={hy + style.fontSize * 2.1} text={rest[1]} s={style} anchor="start" size={style.fontSize * 0.92} />}
    </>
  );
}

function Toast({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Bootstrap', body = ''] = parts(text);
  const hh = Math.min(36, h * 0.42);
  const fs = fit(style, hh);
  const sq = Math.min(16, hh * 0.45);
  const r = rr(w, h, style.radius);
  const k = Math.min(4, hh * 0.12);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, hh, r)} fill="#ffffff" fillOpacity={0.85} stroke="none" />
      <path d={`M0,${f(hh)} H${f(w)}`} stroke={BORDER} strokeWidth={1} />
      <Box x={12} y={(hh - sq) / 2} w={sq} h={sq} r={3} fill={BS.primary} />
      <Label x={20 + sq} y={hh / 2} text={title} s={style} size={fs} anchor="start" bold />
      <Label x={w - 34} y={hh / 2} text="11 mins ago" s={style} size={fs * 0.82} anchor="end" color={MUTED} />
      <path d={`M${f(w - 18 - k)},${f(hh / 2 - k)} l${f(k * 2)},${f(k * 2)} m0,${f(-k * 2)} l${f(-k * 2)},${f(k * 2)}`} stroke={BODY} strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      {body ? (
        <Label x={12} y={hh + (h - hh) / 2} text={body} s={style} size={fs} anchor="start" />
      ) : (
        <Bar x={12} y={hh + (h - hh) / 2 - 3} w={w * 0.6} h={6} />
      )}
    </>
  );
}

function Modal({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Modal title', body = ''] = parts(text);
  const hh = Math.min(56, h * 0.24);
  const fh = Math.min(60, h * 0.26);
  const ts = fit(style, hh, 0.38) * 1.15;
  const fs = fit(style, hh, 0.36);
  const bh = Math.min(36, fh * 0.6);
  const by = h - fh / 2 - bh / 2;
  const b1 = Math.min(110, w * 0.3);
  const b0 = Math.min(70, w * 0.2);
  const k = Math.min(5, hh * 0.1);
  const line = { stroke: BORDER, strokeWidth: 1 };
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M0,${f(hh)} H${f(w)} M0,${f(h - fh)} H${f(w)}`} {...line} />
      <Label x={16} y={hh / 2} text={title} s={style} size={ts} anchor="start" />
      <path d={`M${f(w - 22 - k)},${f(hh / 2 - k)} l${f(k * 2)},${f(k * 2)} m0,${f(-k * 2)} l${f(-k * 2)},${f(k * 2)}`} stroke={BODY} strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      {body ? (
        <Label x={16} y={hh + 16 + fs * 0.6} text={body} s={style} size={fs} anchor="start" />
      ) : (
        <>
          <Bar x={16} y={hh + 18} w={(w - 32) * 0.9} h={7} />
          <Bar x={16} y={hh + 32} w={(w - 32) * 0.65} h={7} />
        </>
      )}
      <Btn x={w - 12 - b1} y={by} w={b1} h={bh} label="Save changes" s={style} fill={BS.primary} />
      <Btn x={w - 20 - b1 - b0} y={by} w={b0} h={bh} label="Close" s={style} fill={BS.secondary} />
    </>
  );
}

function Offcanvas({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Offcanvas', ...items] = parts(text);
  const hh = Math.min(56, h * 0.12);
  const ts = fit(style, hh, 0.38) * 1.15;
  const fs = fit(style, hh, 0.32);
  const k = Math.min(5, hh * 0.1);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={16} y={hh / 2} text={title} s={style} size={ts} anchor="start" />
      <path d={`M${f(w - 22 - k)},${f(hh / 2 - k)} l${f(k * 2)},${f(k * 2)} m0,${f(-k * 2)} l${f(-k * 2)},${f(k * 2)}`} stroke={BODY} strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      {items.length
        ? items.map((t, i) => <Label key={i} x={16} y={hh + 10 + fs * (0.8 + i * 2)} text={t} s={style} size={fs} anchor="start" />)
        : [0.9, 0.75, 0.82, 0.5].map((k2, i) => <Bar key={i} x={16} y={hh + 8 + i * 16} w={(w - 32) * k2} h={7} />)}
    </>
  );
}

function TooltipShape({ w, h, style }: ShapeRenderContext) {
  const p = Math.min(6, h * 0.2);
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

function Popover({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Popover title', body = ''] = parts(text);
  const p = Math.min(9, h * 0.15);
  const bh = h - p;
  const hh = Math.min(36, bh * 0.42);
  const r = rr(w, bh, style.radius);
  const c = w / 2;
  const fs = fit(style, hh);
  return (
    <>
      <path
        d={`M${f(r)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(bh - r)} Q${f(w)},${f(bh)} ${f(w - r)},${f(bh)} H${f(c + p)} L${f(c)},${f(h)} L${f(c - p)},${f(bh)} H${f(r)} Q0,${f(bh)} 0,${f(bh - r)} V${f(r)} Q0,0 ${f(r)},0 Z`}
        fill={style.fill === 'none' ? 'none' : style.fill}
        {...strokeAttrs(style)}
      />
      <path d={topRounded(w, hh, r)} fill={BS.light} stroke="none" transform="translate(0.5 0.5) scale(0.995)" />
      <path d={`M0,${f(hh)} H${f(w)}`} stroke={style.stroke === 'none' ? BORDER : style.stroke} strokeWidth={1} />
      <Label x={12} y={hh / 2} text={title} s={style} size={fs} anchor="start" bold />
      {body ? <Label x={12} y={hh + (bh - hh) / 2} text={body} s={style} size={fs * 0.95} anchor="start" /> : <Bar x={12} y={hh + (bh - hh) / 2 - 3} w={w * 0.7} h={6} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Navbar({ w, h, style, text }: ShapeRenderContext) {
  const [brand = 'Navbar', ...links] = parts(text);
  const dark = style.textColor === '#ffffff';
  const fs = fit(style, h, 0.36);
  const bs = fs * 1.3;
  let x = 16 + tw(brand, style, bs) + 24;
  const out: ReactNode[] = [];
  links.forEach((l, i) => {
    out.push(<Label key={i} x={x} y={h / 2} text={l} s={style} size={fs} anchor="start" color={i === 0 ? style.textColor : muted(style)} />);
    x += tw(l, style, fs) + 18;
  });
  const bw = Math.min(70, w * 0.14);
  const iw = Math.min(150, w * 0.22);
  const ih = Math.min(34, h * 0.62);
  const showForm = x < w - bw - iw - 24;
  const sx = w - 12 - bw;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={16} y={h / 2} text={brand} s={style} size={bs} anchor="start" />
      {out}
      {showForm && (
        <>
          <Box x={sx - 8 - iw} y={(h - ih) / 2} w={iw} h={ih} r={6} fill="#ffffff" stroke={BORDER} />
          <Label x={sx - iw} y={h / 2} text="Search" s={style} size={fs} anchor="start" color={MUTED} />
          <Btn x={sx} y={(h - ih) / 2} w={bw} h={ih} label="Search" s={style} fill="none" stroke={dark ? BS.success : BS.success} color={BS.success} />
        </>
      )}
    </>
  );
}

function NavbarCollapsed({ w, h, style, text }: ShapeRenderContext) {
  const [brand = 'Navbar'] = parts(text);
  const fs = fit(style, h, 0.36) * 1.3;
  const bh = Math.min(38, h * 0.7);
  const bw = bh * 1.35;
  const x = w - 12 - bw;
  const y = (h - bh) / 2;
  const c = style.textColor;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={16} y={h / 2} text={brand} s={style} size={fs} anchor="start" />
      <Box x={x} y={y} w={bw} h={bh} r={6} stroke={c} sw={1} o={0} fill="none" />
      <Glyph Icon={Menu} cx={x + bw / 2} cy={h / 2} size={bh * 0.6} s={style} color={c} sw={2} />
    </>
  );
}

function NavTabs({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const fs = fit(style, h, 0.42);
  const pad = fs * 1.1;
  let x = 0;
  const out: ReactNode[] = [];
  const base = h - 0.5;
  labels.forEach((l, i) => {
    const lw = tw(l, style, fs) + pad * 2;
    if (i === 0) {
      out.push(
        <path
          key="a"
          d={`M${f(x + 0.5)},${f(base)} V6 Q${f(x + 0.5)},0.5 6,0.5 H${f(x + lw - 6)} Q${f(x + lw - 0.5)},0.5 ${f(x + lw - 0.5)},6 V${f(base)}`}
          fill="#ffffff"
          stroke={BORDER}
          strokeWidth={1}
        />,
      );
    }
    out.push(<Label key={i} x={x + lw / 2} y={h / 2} text={l} s={style} size={fs} color={i === 0 ? '#495057' : style.textColor} />);
    x += lw;
  });
  const first = labels.length ? tw(labels[0], style, fs) + pad * 2 : 0;
  return (
    <>
      <path d={`M0,${f(base)} H0 M${f(first)},${f(base)} H${f(w)}`} stroke={BORDER} strokeWidth={1} />
      {out}
    </>
  );
}

function NavPills({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const fs = fit(style, h, 0.42);
  const pad = fs * 1.1;
  let x = 0;
  return (
    <>
      {labels.map((l, i) => {
        const lw = tw(l, style, fs) + pad * 2;
        const x0 = x;
        x += lw + 4;
        if (x0 > w) return null;
        return (
          <g key={i}>
            {i === 0 && <Box x={x0} y={0} w={lw} h={h} r={6} fill={ink(style)} />}
            <Label x={x0 + lw / 2} y={h / 2} text={l} s={style} size={fs} color={i === 0 ? '#ffffff' : style.textColor} />
          </g>
        );
      })}
    </>
  );
}

function Breadcrumb({ h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const fs = fit(style, h, 0.6);
  let x = 0;
  const out: ReactNode[] = [];
  labels.forEach((l, i) => {
    const last = i === labels.length - 1;
    out.push(<Label key={`l${i}`} x={x} y={h / 2} text={l} s={style} size={fs} anchor="start" color={last ? MUTED : ink(style)} />);
    x += tw(l, style, fs) + fs * 0.5;
    if (!last) {
      out.push(<Label key={`s${i}`} x={x} y={h / 2} text="/" s={style} size={fs} anchor="start" color={MUTED} />);
      x += tw('/', style, fs) + fs * 0.5;
    }
  });
  return <>{out}</>;
}

function Pagination({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const items = labels.length ? labels : ['Previous', '1', '2', '3', 'Next'];
  const fs = fit(style, h, 0.42);
  const pad = fs * 0.9;
  const widths = items.map((l) => tw(l, style, fs) + pad * 2);
  const total = widths.reduce((a, b) => a + b, 0);
  const k = total > w ? w / total : 1;
  const r = Math.min(6, h * 0.2);
  let x = 0;
  const c = ink(style);
  const active = items.findIndex((l) => /^\d+$/.test(l));
  return (
    <>
      <Box x={0.5} y={0.5} w={total * k - 1} h={h - 1} r={r} fill="#ffffff" stroke={BORDER} />
      {items.map((l, i) => {
        const iw = widths[i] * k;
        const x0 = x;
        x += iw;
        const on = i === active;
        return (
          <g key={i}>
            {on && <Box x={x0} y={0.5} w={iw} h={h - 1} fill={c} stroke={c} />}
            {i > 0 && !on && i - 1 !== active && <path d={`M${f(x0)},0.5 V${f(h - 0.5)}`} stroke={BORDER} strokeWidth={1} />}
            <Label x={x0 + iw / 2} y={h / 2} text={l} s={style} size={fs * Math.min(1, k + 0.2)} color={on ? '#ffffff' : c} />
          </g>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/** Card: header / body (title, text, button) / footer. */
function Card({ w, h, style, text }: ShapeRenderContext) {
  const [header = 'Featured', title = 'Card title', footer = '2 days ago'] = parts(text);
  const hh = Math.min(40, h * 0.18);
  const r = rr(w, h, style.radius);
  const fs = fit(style, hh, 0.42);
  const ts = fs * 1.25;
  const bh = Math.min(34, h * 0.15);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, hh, r)} fill="#000000" fillOpacity={0.03} stroke="none" />
      <path d={`M0,${f(h - hh)} V${f(h - r)} Q0,${f(h)} ${f(r)},${f(h)} H${f(w - r)} Q${f(w)},${f(h)} ${f(w)},${f(h - r)} V${f(h - hh)} Z`} fill="#000000" fillOpacity={0.03} stroke="none" />
      <path d={`M0,${f(hh)} H${f(w)} M0,${f(h - hh)} H${f(w)}`} stroke={style.stroke === 'none' ? BORDER : style.stroke} strokeWidth={1} />
      <Label x={16} y={hh / 2} text={header} s={style} size={fs} anchor="start" />
      <Label x={16} y={hh + 14 + ts * 0.6} text={title} s={style} size={ts} anchor="start" bold />
      <Bar x={16} y={hh + 22 + ts * 1.2} w={(w - 32) * 0.92} h={6} />
      <Bar x={16} y={hh + 34 + ts * 1.2} w={(w - 32) * 0.6} h={6} />
      <Btn x={16} y={h - hh - 12 - bh} w={Math.min(120, w * 0.5)} h={bh} label="Go somewhere" s={style} fill={BS.primary} />
      <Label x={w / 2} y={h - hh / 2} text={footer} s={style} size={fs} color={MUTED} />
    </>
  );
}

function Landscape({ x, y, w, h, c }: { x: number; y: number; w: number; h: number; c: string }) {
  const m = Math.min(w, h);
  return (
    <>
      <circle cx={f(x + w * 0.68)} cy={f(y + h * 0.32)} r={f(m * 0.09)} fill={c} fillOpacity={0.45} />
      <path
        d={`M${f(x + w * 0.12)},${f(y + h * 0.82)} L${f(x + w * 0.38)},${f(y + h * 0.42)} L${f(x + w * 0.56)},${f(y + h * 0.68)} L${f(x + w * 0.7)},${f(y + h * 0.54)} L${f(x + w * 0.88)},${f(y + h * 0.82)} Z`}
        fill={c}
        fillOpacity={0.4}
      />
    </>
  );
}

function CardImage({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Card title', body = ''] = parts(text);
  const ih = h * 0.42;
  const r = rr(w, h, style.radius);
  const ts = Math.max(4, Math.min(style.fontSize * 1.25, h * 0.08));
  const bh = Math.min(34, h * 0.13);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, ih, r)} fill="#868e96" stroke="none" />
      <Landscape x={w * 0.2} y={ih * 0.1} w={w * 0.6} h={ih * 0.85} c="#ffffff" />
      <Label x={16} y={ih + 14 + ts * 0.6} text={title} s={style} size={ts} anchor="start" bold />
      {body ? (
        <Label x={16} y={ih + 22 + ts * 1.6} text={body} s={style} size={ts * 0.75} anchor="start" />
      ) : (
        <>
          <Bar x={16} y={ih + 22 + ts * 1.3} w={(w - 32) * 0.92} h={6} />
          <Bar x={16} y={ih + 34 + ts * 1.3} w={(w - 32) * 0.7} h={6} />
        </>
      )}
      <Btn x={16} y={h - 14 - bh} w={Math.min(120, w * 0.55)} h={bh} label="Go somewhere" s={style} fill={BS.primary} />
    </>
  );
}

function ListGroup({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const n = Math.max(1, labels.length || 4);
  const rh = h / n;
  const fs = fit(style, rh, 0.42);
  const r = rr(w, h, style.radius);
  const c = BS.primary;
  let d = '';
  for (let i = 1; i < n; i++) d += `M0,${f(rh * i)} H${f(w)} `;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, rh, r)} fill={c} stroke="none" />
      {d && <path d={d} stroke={style.stroke === 'none' ? BORDER : style.stroke} strokeWidth={1} />}
      {Array.from({ length: n }, (_, i) =>
        labels[i] ? (
          <Label key={i} x={16} y={rh * i + rh / 2} text={labels[i]} s={style} size={fs} anchor="start" color={i === 0 ? '#ffffff' : style.textColor} />
        ) : (
          <Bar key={i} x={16} y={rh * i + rh / 2 - 3} w={w * 0.5} h={6} fill={i === 0 ? '#ffffff' : PH} />
        ),
      )}
    </>
  );
}

/** Table: first line = header, `|` separates cells; striped rows. */
function Table({ w, h, style, text }: ShapeRenderContext) {
  const rows = text.split('\n').filter((l) => l.trim()).map((l) => l.split('|').map((c) => c.trim()));
  const nr = Math.max(1, rows.length || 4);
  const nc = Math.max(1, ...rows.map((r) => r.length), rows.length ? 1 : 4);
  const rh = h / nr;
  const cw = w / nc;
  const fs = fit(style, rh, 0.45);
  const line = style.stroke === 'none' ? BORDER : style.stroke;
  let d = '';
  for (let i = 1; i <= nr; i++) d += `M0,${f(rh * i - 0.5)} H${f(w)} `;
  return (
    <>
      <rect width={w} height={h} fill={style.fill === 'none' ? 'none' : style.fill} />
      {Array.from({ length: nr }, (_, i) => (i > 0 && i % 2 === 1 ? <rect key={`z${i}`} y={f(rh * i)} width={w} height={f(rh)} fill="#000000" fillOpacity={0.05} /> : null))}
      <path d={d} stroke={line} strokeWidth={1} />
      <path d={`M0,${f(rh)} H${f(w)}`} stroke={BODY} strokeOpacity={0.8} strokeWidth={1.5} />
      {rows.length
        ? rows.map((cells, i) =>
            cells.map((cell, j) => (
              <Label key={`${i}-${j}`} x={cw * j + 8} y={rh * i + rh / 2} text={cell} s={style} size={fs} anchor="start" bold={i === 0} />
            )),
          )
        : Array.from({ length: nr * nc }, (_, k) => {
            const i = Math.floor(k / nc);
            const j = k % nc;
            return <Bar key={k} x={cw * j + 8} y={rh * i + rh / 2 - 3} w={cw * 0.55} h={6} fill={i === 0 ? '#495057' : PH} />;
          })}
    </>
  );
}

function DropdownMenu({ w, h, style, text }: ShapeRenderContext) {
  const raw = text.split(/\||\n/).map((t) => t.trim()).filter(Boolean);
  const items = raw.length ? raw : ['Action', 'Another action', 'Something else here', '--', 'Separated link'];
  const pad = 8;
  const units = items.reduce((a, t) => a + (/^-{2,}$/.test(t) ? 0.5 : 1), 0);
  const rh = (h - pad * 2) / Math.max(1, units);
  const fs = fit(style, rh, 0.5);
  let y = pad;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      {items.map((t, i) => {
        if (/^-{2,}$/.test(t)) {
          const yy = y + rh * 0.25;
          y += rh * 0.5;
          return <path key={i} d={`M0,${f(yy)} H${f(w)}`} stroke={BORDER} strokeWidth={1} />;
        }
        const top = y;
        y += rh;
        return (
          <g key={i}>
            {i === 1 && <rect x={0.75} y={f(top)} width={f(w - 1.5)} height={f(rh)} fill={GRAY} />}
            <Label x={16} y={top + rh / 2} text={t} s={style} size={fs} anchor="start" />
          </g>
        );
      })}
    </>
  );
}

function Accordion({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const items = labels.length ? labels : ['Accordion Item #1', 'Accordion Item #2', 'Accordion Item #3'];
  const n = items.length;
  const hh = Math.min(50, h / (n + 1.6));
  const open = Math.max(hh, h - hh * n);
  const fs = fit(style, hh, 0.36);
  const r = rr(w, h, style.radius);
  const line = style.stroke === 'none' ? BORDER : style.stroke;
  const out: ReactNode[] = [];
  let y = 0;
  items.forEach((t, i) => {
    const first = i === 0;
    if (first) out.push(<path key="bg" d={topRounded(w, hh, r)} fill="#cfe2ff" stroke="none" />);
    if (i > 0) out.push(<path key={`d${i}`} d={`M0,${f(y)} H${f(w)}`} stroke={line} strokeWidth={1} />);
    out.push(<Label key={`t${i}`} x={18} y={y + hh / 2} text={t} s={style} size={fs} anchor="start" color={first ? '#052c65' : style.textColor} />);
    out.push(<Glyph key={`g${i}`} Icon={first ? ChevronUp : ChevronDown} cx={w - 22} cy={y + hh / 2} size={Math.min(16, hh * 0.4)} s={style} color={first ? '#052c65' : BODY} sw={2} />);
    y += hh;
    if (first) {
      out.push(<path key="d0" d={`M0,${f(y)} H${f(w)}`} stroke={line} strokeWidth={1} />);
      const body = open - hh;
      [0.9, 0.8, 0.55].forEach((k, j) => {
        const by = y + 14 + j * 14;
        if (by + 6 < y + body - 8) out.push(<Bar key={`b${j}`} x={18} y={by} w={(w - 36) * k} h={6} />);
      });
      y += body;
    }
  });
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      {out}
    </>
  );
}

function Carousel({ w, h, style, text }: ShapeRenderContext) {
  const [title = '', caption = ''] = parts(text);
  const g = Math.min(28, h * 0.15, w * 0.1);
  const iw = Math.min(30, w * 0.08);
  const ib = Math.max(1.5, h * 0.012);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Landscape x={w * 0.25} y={h * 0.08} w={w * 0.5} h={h * 0.6} c="#ffffff" />
      <Glyph Icon={ChevronLeft} cx={w * 0.06 + g / 2} cy={h / 2} size={g} s={style} color="#ffffff" sw={2.5} />
      <Glyph Icon={ChevronRight} cx={w * 0.94 - g / 2} cy={h / 2} size={g} s={style} color="#ffffff" sw={2.5} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={f(w / 2 + (i - 1.5) * (iw + 6) + 3)} y={f(h - 14)} width={f(iw)} height={f(ib * 2)} fill="#ffffff" fillOpacity={i === 0 ? 1 : 0.5} />
      ))}
      {title && <Label x={w / 2} y={h * 0.76} text={title} s={style} size={Math.min(style.fontSize * 1.3, h * 0.08)} color="#ffffff" />}
      {caption && <Label x={w / 2} y={h * 0.76 + Math.min(style.fontSize * 1.6, h * 0.1)} text={caption} s={style} size={Math.min(style.fontSize, h * 0.06)} color="#ffffff" opacity={0.85} />}
    </>
  );
}

function Placeholder({ w, h, style }: ShapeRenderContext) {
  const ih = h * 0.4;
  const r = rr(w, h, style.radius);
  const pw = w - 32;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, ih, r)} fill="#868e96" fillOpacity={0.5} stroke="none" />
      <Bar x={16} y={ih + 16} w={pw * 0.55} h={12} fill={PH} o={0.9} />
      {[0.7, 0.4, 0.85, 0.6, 0.3, 0.8].slice(0, Math.max(0, Math.floor((h - ih - 90) / 12))).map((k, i) => (
        <Bar key={i} x={16} y={ih + 40 + i * 12} w={pw * k} h={7} fill={PH} o={0.6} />
      ))}
      <Box x={16} y={h - 16 - Math.min(32, h * 0.12)} w={Math.min(100, w * 0.45)} h={Math.min(32, h * 0.12)} r={6} fill={BS.primary} o={0.55} />
    </>
  );
}

function Hero({ w, h, style, text }: ShapeRenderContext) {
  const [title = 'Hello, world!', lead = ''] = parts(text);
  const ts = Math.max(5, Math.min(style.fontSize * 2.2, h * 0.16, w * 0.07));
  const fs = Math.max(4, Math.min(style.fontSize * 1.1, h * 0.08));
  const bh = Math.min(44, h * 0.18);
  const x = Math.min(32, w * 0.06);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={x} y={h * 0.24} text={title} s={style} size={ts} anchor="start" bold />
      {lead ? (
        <Label x={x} y={h * 0.24 + ts * 1.1} text={lead} s={style} size={fs} anchor="start" color={muted(style)} />
      ) : (
        <>
          <Bar x={x} y={h * 0.24 + ts * 0.9} w={(w - x * 2) * 0.85} h={8} />
          <Bar x={x} y={h * 0.24 + ts * 0.9 + 16} w={(w - x * 2) * 0.6} h={8} />
        </>
      )}
      <Btn x={x} y={h - x * 0.8 - bh} w={Math.min(150, w * 0.35)} h={bh} label="Learn more" s={{ ...style, fontSize: fs }} fill={BS.primary} />
    </>
  );
}

function Footer({ w, h, style, text }: ShapeRenderContext) {
  const [copy = '© 2026 Company, Inc', ...links] = parts(text);
  const fs = fit(style, h, 0.36);
  let x = w - 4;
  const out: ReactNode[] = [];
  [...links].reverse().forEach((l, i) => {
    out.push(<Label key={i} x={x} y={h / 2} text={l} s={style} size={fs} anchor="end" color={MUTED} />);
    x -= tw(l, style, fs) + 16;
  });
  return (
    <>
      <rect width={w} height={h} fill={style.fill === 'none' ? 'none' : style.fill} />
      <path d={`M0,0.5 H${f(w)}`} stroke={style.stroke === 'none' ? BORDER : style.stroke} strokeWidth={1} />
      <Label x={4} y={h / 2} text={copy} s={style} size={fs} anchor="start" color={MUTED} />
      {out}
    </>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

/** `Label|placeholder`: label above an input. */
function FormField({ w, h, style, text }: ShapeRenderContext) {
  const [label = 'Email address', ph = '', help = ''] = parts(text);
  const fs = Math.max(4, Math.min(style.fontSize, h * 0.22));
  const ly = fs * 1.5;
  const ih = Math.min(38, h - ly - (help ? fs * 1.6 : 0));
  return (
    <>
      <Label x={0} y={ly / 2} text={label} s={style} size={fs} anchor="start" />
      <Box x={0.5} y={ly} w={w - 1} h={ih} r={6} fill="#ffffff" stroke={BORDER} />
      {ph && <Label x={12} y={ly + ih / 2} text={ph} s={style} size={fs} anchor="start" color={MUTED} />}
      {help && <Label x={0} y={ly + ih + fs * 0.9} text={help} s={style} size={fs * 0.85} anchor="start" color={MUTED} />}
    </>
  );
}

function Floating({ w, h, style, text }: ShapeRenderContext) {
  const [label = 'Email address', value = ''] = parts(text);
  const fs = fit(style, h, 0.3);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={12} y={h * 0.3} text={label} s={style} size={fs * 0.82} anchor="start" color={MUTED} />
      {value && <Label x={12} y={h * 0.66} text={value} s={style} size={fs} anchor="start" />}
    </>
  );
}

function Select({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Glyph Icon={ChevronDown} cx={w - Math.min(20, h * 0.5)} cy={h / 2} size={Math.min(14, h * 0.4)} s={style} color={BODY} sw={2.2} />
    </>
  );
}

function Textarea({ w, h, style }: ShapeRenderContext) {
  const g = Math.min(8, w * 0.1, h * 0.2);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M${f(w - 4)},${f(h - 4 - g)} L${f(w - 4 - g)},${f(h - 4)} M${f(w - 4)},${f(h - 4 - g / 2)} L${f(w - 4 - g / 2)},${f(h - 4)}`} stroke="#adb5bd" strokeWidth={1.1} strokeLinecap="round" />
    </>
  );
}

const boxSide = (h: number) => Math.min(h, 16);
const besideBox = (w: number, h: number): Rect => {
  const x = boxSide(h) + 8;
  return { x, y: 0, w: Math.max(1, w - x), h };
};

function check(on: boolean) {
  return function Check_({ h, style }: ShapeRenderContext) {
    const b = boxSide(h);
    const y = (h - b) / 2;
    const c = ink(style);
    return (
      <>
        <rect x={0.5} y={f(y + 0.5)} width={f(b - 1)} height={f(b - 1)} rx={f(b * 0.25)} fill={on ? c : '#ffffff'} stroke={on ? c : '#adb5bd'} strokeWidth={1} />
        {on && (
          <path
            d={`M${f(b * 0.26)},${f(y + b * 0.52)} L${f(b * 0.43)},${f(y + b * 0.69)} L${f(b * 0.76)},${f(y + b * 0.33)}`}
            fill="none" stroke="#ffffff" strokeWidth={Math.max(1.4, b * 0.12)} strokeLinecap="round" strokeLinejoin="round"
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
        <circle cx={f(b / 2)} cy={f(h / 2)} r={f(b / 2 - 0.5)} fill={on ? c : '#ffffff'} stroke={on ? c : '#adb5bd'} strokeWidth={1} />
        {on && <circle cx={f(b / 2)} cy={f(h / 2)} r={f(b * 0.2)} fill="#ffffff" />}
      </>
    );
  };
}

const switchW = (h: number) => Math.min(h, 16) * 2;

function toggle(on: boolean) {
  return function Switch({ h, style }: ShapeRenderContext) {
    const sh = Math.min(h, 16);
    const sw = sh * 2;
    const y = (h - sh) / 2;
    const c = ink(style);
    const k = sh * 0.3;
    return (
      <>
        <rect x={0.5} y={f(y + 0.5)} width={f(sw - 1)} height={f(sh - 1)} rx={f(sh / 2)} fill={on ? c : '#ffffff'} stroke={on ? c : '#adb5bd'} strokeWidth={1} />
        <circle cx={f(on ? sw - sh / 2 : sh / 2)} cy={f(h / 2)} r={f(k)} fill={on ? '#ffffff' : '#adb5bd'} />
      </>
    );
  };
}

function Range({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(h / 2, 8);
  const t = Math.max(2, Math.min(8, h * 0.4));
  const pos = r + (w - r * 2) * 0.55;
  return (
    <>
      <rect x={0} y={f(h / 2 - t / 2)} width={w} height={f(t)} rx={f(t / 2)} fill="#dee2e6" />
      <circle cx={f(pos)} cy={f(h / 2)} r={f(r)} fill={ink(style)} />
    </>
  );
}

/** `@|Username`: addon on the left, input on the right. */
function InputGroup({ w, h, style, text }: ShapeRenderContext) {
  const [addon = '@', ph = ''] = parts(text);
  const fs = fit(style, h, 0.42);
  const aw = Math.min(w * 0.45, tw(addon, style, fs) + 24);
  const r = rr(w, h, style.radius);
  return (
    <>
      <path d={`M${f(aw)},0 V${f(h)} H${f(r)} Q0,${f(h)} 0,${f(h - r)} V${f(r)} Q0,0 ${f(r)},0 Z`} fill={GRAY} stroke="none" />
      <RoundRect w={w} h={h} s={{ ...style, fill: 'none' }} />
      <path d={`M${f(aw)},0 V${f(h)}`} stroke={style.stroke === 'none' ? BORDER : style.stroke} strokeWidth={1} />
      <Label x={aw / 2} y={h / 2} text={addon} s={style} size={fs} />
      {ph && <Label x={aw + 12} y={h / 2} text={ph} s={style} size={fs} anchor="start" color={MUTED} />}
    </>
  );
}

/** `placeholder|Button`: input with an attached outline button on the right. */
function InputButton({ w, h, style, text }: ShapeRenderContext) {
  const [ph = '', btn = 'Button'] = parts(text);
  const fs = fit(style, h, 0.42);
  const bw = Math.min(w * 0.45, tw(btn, style, fs) + 26);
  const r = rr(w, h, style.radius);
  const c = BS.secondary;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M${f(w - bw)},0.5 H${f(w - r)} Q${f(w - 0.5)},0.5 ${f(w - 0.5)},${f(r)} V${f(h - r)} Q${f(w - 0.5)},${f(h - 0.5)} ${f(w - r)},${f(h - 0.5)} H${f(w - bw)} Z`} fill="#ffffff" stroke={c} strokeWidth={1} />
      <Label x={w - bw / 2} y={h / 2} text={btn} s={style} size={fs} color={c} />
      {ph && <Label x={12} y={h / 2} text={ph} s={style} size={fs} anchor="start" color={MUTED} />}
    </>
  );
}

/** `value|feedback`: input with a validation border, icon and message below. */
function validated(ok: boolean) {
  return function Validated({ w, h, style, text }: ShapeRenderContext) {
    const [value = '', msg = ok ? 'Looks good!' : 'Please provide a valid value.'] = text.split(/\||\n/).map((t) => t.trim());
    const c = ok ? BS.success : BS.danger;
    const fs = Math.max(4, Math.min(style.fontSize, h * 0.26));
    const ih = Math.max(4, Math.min(38, h - fs * 1.7));
    const g = Math.min(16, ih * 0.45);
    return (
      <>
        <Box x={0.5} y={0.5} w={w - 1} h={ih} r={6} fill="#ffffff" stroke={c} />
        {value && <Label x={12} y={ih / 2} text={value} s={style} size={fs} anchor="start" />}
        {ok ? (
          <Glyph Icon={Check} cx={w - 12 - g / 2} cy={ih / 2} size={g} s={style} color={c} sw={2.4} />
        ) : (
          <Glyph Icon={CircleAlert} cx={w - 12 - g / 2} cy={ih / 2} size={g} s={style} color={c} sw={2} />
        )}
        <Label x={0} y={ih + fs * 1.05} text={msg} s={style} size={fs * 0.88} anchor="start" color={c} />
      </>
    );
  };
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

function Progress({ w, h, style, text }: ShapeRenderContext) {
  const pct = Math.max(0, Math.min(100, Number(/\d+/.exec(text)?.[0] ?? 60)));
  const bw = (w * pct) / 100;
  const r = Math.min(h / 2, 6);
  const fs = Math.max(4, Math.min(style.fontSize, h * 0.7));
  return (
    <>
      <rect width={w} height={h} rx={f(r)} fill={GRAY} />
      <rect width={f(bw)} height={h} rx={f(r)} fill={ink(style)} />
      {text && bw > 20 && <Label x={bw / 2} y={h / 2} text={`${pct}%`} s={style} size={fs} color="#ffffff" />}
    </>
  );
}

function ProgressStriped({ w, h, style, text }: ShapeRenderContext) {
  const pct = Math.max(0, Math.min(100, Number(/\d+/.exec(text)?.[0] ?? 60)));
  const bw = (w * pct) / 100;
  const r = Math.min(h / 2, 6);
  const step = Math.max(4, h);
  let d = '';
  for (let x = -h; x < bw; x += step * 2) d += `M${f(x)},${f(h)} L${f(x + h)},0 L${f(x + h + step)},0 L${f(x + step)},${f(h)} Z `;
  const id = `bs-stripe-${Math.round(w)}-${Math.round(h)}-${pct}`;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <rect width={f(bw)} height={h} rx={f(r)} />
        </clipPath>
      </defs>
      <rect width={w} height={h} rx={f(r)} fill={GRAY} />
      <rect width={f(bw)} height={h} rx={f(r)} fill={ink(style)} />
      {d && <path d={d} fill="#ffffff" fillOpacity={0.2} clipPath={`url(#${id})`} />}
    </>
  );
}

function Spinner({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(w, h) / 2;
  const t = Math.max(1.5, r * 0.22);
  const rr2 = Math.max(0.5, r - t / 2);
  const cx = w / 2;
  const cy = h / 2;
  return (
    <>
      <circle cx={f(cx)} cy={f(cy)} r={f(rr2)} fill="none" stroke={ink(style)} strokeOpacity={0.2} strokeWidth={f(t)} />
      <path d={`M${f(cx)},${f(cy - rr2)} A${f(rr2)},${f(rr2)} 0 1 1 ${f(cx - rr2)},${f(cy)}`} fill="none" stroke={ink(style)} strokeWidth={f(t)} strokeLinecap="round" />
    </>
  );
}

function SpinnerGrow({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(w, h) / 2;
  return (
    <>
      <circle cx={f(w / 2)} cy={f(h / 2)} r={f(r)} fill={ink(style)} fillOpacity={0.25} />
      <circle cx={f(w / 2)} cy={f(h / 2)} r={f(r * 0.7)} fill={ink(style)} fillOpacity={0.75} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const D = (name: string, extra = '') => `shape=mxgraph.bootstrap.${name};html=1;whiteSpace=wrap;${extra}`;
const custom = { textPlacement: 'custom' as const };

export const shapes: ShapeDef[] = [
  shape('bs.button', 'Button', D('rrect', 'rSize=5;fontStyle=0;'), Plain, { rounded: true, textBox: (w, h) => inset(w, h, 8, 2) }),
  shape('bs.buttonGroup', 'Button group', D('rrect', 'rSize=5;'), ButtonGroup, { rounded: true, ...custom }),
  shape('bs.dropdownButton', 'Dropdown button', D('rrect', 'rSize=5;align=left;spacingLeft=12;'), DropdownButton, {
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: 2, w: Math.max(1, w - 34), h: Math.max(1, h - 4) }),
  }),
  shape('bs.buttonBadge', 'Button with badge', D('rrect', 'rSize=5;'), ButtonBadge, { rounded: true, ...custom }),
  shape('bs.close', 'Close button', D('x', 'strokeWidth=2;'), CloseButton, { boxHit: true, textPlacement: 'below' }),
  shape('bs.badge', 'Badge', D('rrect', 'rSize=4;fontStyle=1;'), Plain, { rounded: true, textBox: (w, h) => inset(w, h, 4, 1) }),
  shape('bs.alert', 'Alert', D('rrect', 'rSize=6;align=left;spacingLeft=16;'), Plain, { rounded: true, textBox: (w, h) => inset(w, h, 16, 8) }),
  shape('bs.alertDismiss', 'Dismissible alert', D('rrect', 'rSize=6;align=left;spacingLeft=16;spacingRight=36;'), DismissAlert, {
    rounded: true,
    textBox: (w, h) => ({ x: 16, y: 8, w: Math.max(1, w - 52), h: Math.max(1, h - 16) }),
  }),
  shape('bs.alertHeading', 'Alert with heading', D('rrect', 'rSize=6;align=left;verticalAlign=top;spacingLeft=16;'), HeadingAlert, { rounded: true, ...custom }),
  shape('bs.navbar', 'Navbar', D('rect', 'align=left;'), Navbar, { rounded: true, ...custom }),
  shape('bs.navbarCollapsed', 'Navbar (collapsed)', D('rect', 'align=left;'), NavbarCollapsed, { rounded: true, ...custom }),
  shape('bs.navTabs', 'Nav tabs', D('tabTop', 'strokeColor=#dee2e6;'), NavTabs, { boxHit: true, ...custom }),
  shape('bs.navPills', 'Nav pills', D('rrect', 'rSize=5;'), NavPills, { boxHit: true, ...custom }),
  shape('bs.breadcrumb', 'Breadcrumb', D('anchor', 'align=left;'), Breadcrumb, { boxHit: true, ...custom }),
  shape('bs.pagination', 'Pagination', D('rrect', 'rSize=5;'), Pagination, { boxHit: true, ...custom }),
  shape('bs.card', 'Card', D('rrect', 'rSize=6;verticalAlign=top;align=left;'), Card, { rounded: true, ...custom }),
  shape('bs.cardImage', 'Card with image', D('rrect', 'rSize=6;verticalAlign=top;align=left;'), CardImage, { rounded: true, ...custom }),
  shape('bs.listGroup', 'List group', D('rrect', 'rSize=6;align=left;'), ListGroup, { rounded: true, ...custom }),
  shape('bs.table', 'Table', D('horLines', 'align=left;'), Table, { boxHit: true, ...custom }),
  shape('bs.dropdownMenu', 'Dropdown menu', D('rrect', 'rSize=6;align=left;'), DropdownMenu, { rounded: true, ...custom }),
  shape('bs.accordion', 'Accordion', D('rrect', 'rSize=6;align=left;'), Accordion, { rounded: true, ...custom }),
  shape('bs.carousel', 'Carousel', D('rect', 'fillColor=#6c757d;'), Carousel, { rounded: true, ...custom }),
  shape('bs.modal', 'Modal', D('rrect', 'rSize=8;container=1;align=left;verticalAlign=top;'), Modal, { rounded: true, container: true, ...custom }),
  shape('bs.offcanvas', 'Offcanvas', D('rect', 'container=1;align=left;verticalAlign=top;'), Offcanvas, { rounded: true, container: true, ...custom }),
  shape('bs.toast', 'Toast', D('rrect', 'rSize=6;align=left;'), Toast, { rounded: true, ...custom }),
  shape('bs.tooltip', 'Tooltip', D('popover', 'direction=south;'), TooltipShape, {
    rounded: true,
    textBox: (w, h) => inset(w, h - Math.min(6, h * 0.2), 8, 3),
  }),
  shape('bs.popover', 'Popover', D('popover', 'align=left;verticalAlign=top;'), Popover, { rounded: true, ...custom }),
  shape('bs.placeholder', 'Placeholder card', D('rrect', 'rSize=6;'), Placeholder, { rounded: true, textPlacement: 'below' }),
  shape('bs.hero', 'Hero / jumbotron', D('rrect', 'rSize=10;align=left;'), Hero, { rounded: true, ...custom }),
  shape('bs.footer', 'Footer', D('topButton', 'align=left;'), Footer, { boxHit: true, ...custom }),
  shape('bs.input', 'Input', D('rrect', 'rSize=5;align=left;spacingLeft=12;'), Plain, { rounded: true, textBox: (w, h) => inset(w, h, 12, 2) }),
  shape('bs.formField', 'Labelled input', D('rrect', 'rSize=5;align=left;'), FormField, { boxHit: true, ...custom }),
  shape('bs.floating', 'Floating label input', D('rrect', 'rSize=5;align=left;'), Floating, { rounded: true, ...custom }),
  shape('bs.select', 'Select', D('rrect', 'rSize=5;align=left;spacingLeft=12;'), Select, {
    rounded: true,
    textBox: (w, h) => ({ x: 12, y: 2, w: Math.max(1, w - 40), h: Math.max(1, h - 4) }),
  }),
  shape('bs.textarea', 'Textarea', D('rrect', 'rSize=5;align=left;verticalAlign=top;spacingLeft=12;'), Textarea, {
    rounded: true,
    textBox: (w, h) => inset(w, h, 12, 8),
  }),
  shape('bs.check', 'Checkbox', D('checkbox2', 'checked=1;align=left;labelPosition=right;'), check(true), { boxHit: true, textBox: besideBox }),
  shape('bs.checkOff', 'Checkbox (unchecked)', D('checkbox2', 'checked=0;align=left;labelPosition=right;'), check(false), { boxHit: true, textBox: besideBox }),
  shape('bs.radio', 'Radio', D('radioButton2', 'checked=1;align=left;labelPosition=right;'), radio(true), { boxHit: true, textBox: besideBox }),
  shape('bs.radioOff', 'Radio (off)', D('radioButton2', 'checked=0;align=left;labelPosition=right;'), radio(false), { boxHit: true, textBox: besideBox }),
  shape('bs.switch', 'Switch', D('switch', 'buttonState=1;align=left;labelPosition=right;'), toggle(true), {
    boxHit: true,
    textBox: (w, h) => ({ x: switchW(h) + 8, y: 0, w: Math.max(1, w - switchW(h) - 8), h }),
  }),
  shape('bs.switchOff', 'Switch (off)', D('switch', 'buttonState=0;align=left;labelPosition=right;'), toggle(false), {
    boxHit: true,
    textBox: (w, h) => ({ x: switchW(h) + 8, y: 0, w: Math.max(1, w - switchW(h) - 8), h }),
  }),
  shape('bs.range', 'Range', D('rangeInput', 'rangeStyle=rect;dx=0.55;'), Range, { boxHit: true, textPlacement: 'below' }),
  shape('bs.inputGroup', 'Input group', D('rrect', 'rSize=5;align=left;'), InputGroup, { rounded: true, ...custom }),
  shape('bs.inputButton', 'Input with button', D('rrect', 'rSize=5;align=left;'), InputButton, { rounded: true, ...custom }),
  shape('bs.inputValid', 'Valid input', D('rrect', 'rSize=5;strokeColor=#198754;align=left;'), validated(true), { boxHit: true, ...custom }),
  shape('bs.inputInvalid', 'Invalid input', D('rrect', 'rSize=5;strokeColor=#dc3545;align=left;'), validated(false), { boxHit: true, ...custom }),
  shape('bs.progress', 'Progress', D('rrect', 'rSize=5;fillColor=#e9ecef;'), Progress, { boxHit: true, ...custom }),
  shape('bs.progressStriped', 'Striped progress', D('rrect', 'rSize=5;fillColor=#e9ecef;'), ProgressStriped, { boxHit: true, ...custom }),
  shape('bs.spinner', 'Spinner', 'shape=mxgraph.bootstrap.spinner;html=1;verticalLabelPosition=bottom;verticalAlign=top;', Spinner, {
    boxHit: true,
    perimeter: 'ellipse',
    textPlacement: 'below',
  }),
  shape('bs.spinnerGrow', 'Growing spinner', 'shape=mxgraph.bootstrap.spinnerGrow;html=1;verticalLabelPosition=bottom;verticalAlign=top;', SpinnerGrow, {
    boxHit: true,
    perimeter: 'ellipse',
    textPlacement: 'below',
  }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

type Variant = keyof typeof BS;

const solidBtn = (v: Variant): Partial<ElementStyle> => ({
  fill: BS[v],
  stroke: BS[v],
  textColor: v === 'warning' || v === 'info' || v === 'light' ? '#000000' : '#ffffff',
  radius: 6,
  fontSize: 14,
});
const outlineBtn = (v: Variant): Partial<ElementStyle> => ({ fill: '#ffffff', stroke: BS[v], textColor: BS[v], radius: 6, fontSize: 14 });

/** Alert colours (background, border, text) per variant. */
const ALERT: Record<string, [string, string, string]> = {
  primary: ['#cfe2ff', '#9ec5fe', '#052c65'],
  secondary: ['#e2e3e5', '#c4c8cb', '#2b2f32'],
  success: ['#d1e7dd', '#a3cfbb', '#0a3622'],
  danger: ['#f8d7da', '#f1aeb5', '#58151c'],
  warning: ['#fff3cd', '#ffe69c', '#664d03'],
  info: ['#cff4fc', '#9eeaf9', '#055160'],
  light: ['#fcfcfd', '#e9ecef', '#495057'],
  dark: ['#ced4da', '#adb5bd', '#495057'],
};
const alertStyle = (v: string): Partial<ElementStyle> => {
  const [fill, stroke, textColor] = ALERT[v];
  return { fill, stroke, textColor, radius: 6, fontSize: 14, textAlign: 'left', verticalAlign: 'middle', strokeWidth: 1 };
};

const ctl: Partial<ElementStyle> = { fill: '#ffffff', stroke: BORDER, strokeWidth: 1, radius: 6, fontSize: 14, textColor: BODY, textAlign: 'left', verticalAlign: 'middle' };
const plain: Partial<ElementStyle> = { fill: 'none', stroke: 'none', fontSize: 14, textColor: BODY, textAlign: 'left', verticalAlign: 'middle' };
const panel: Partial<ElementStyle> = { fill: '#ffffff', stroke: BORDER, strokeWidth: 1, radius: 6, fontSize: 14, textColor: BODY };
const K = 'bootstrap bs web ui mockup wireframe';

const btn = (v: Variant, label: string, kw: string): LibraryItem =>
  item('bs.button', `${label} button`, 96, 38, { text: label, style: solidBtn(v), keywords: `${K} button btn ${v} ${kw}` });

export const libraries: ShapeLibrary[] = [
  {
    id: 'bootstrap',
    name: 'Bootstrap UI',
    items: [
      btn('primary', 'Primary', 'submit action cta'),
      btn('secondary', 'Secondary', 'grey neutral'),
      btn('success', 'Success', 'green ok confirm'),
      btn('danger', 'Danger', 'red delete destructive'),
      btn('warning', 'Warning', 'yellow caution'),
      btn('info', 'Info', 'cyan'),
      btn('light', 'Light', 'white'),
      btn('dark', 'Dark', 'black'),
      item('bs.button', 'Link button', 80, 38, {
        text: 'Link',
        style: { fill: 'none', stroke: 'none', textColor: BS.primary, underline: true, fontSize: 14 },
        keywords: `${K} button link anchor hyperlink`,
      }),
      item('bs.button', 'Outline primary button', 96, 38, { text: 'Primary', style: outlineBtn('primary'), keywords: `${K} button outline primary ghost` }),
      item('bs.button', 'Outline secondary button', 110, 38, { text: 'Secondary', style: outlineBtn('secondary'), keywords: `${K} button outline secondary ghost` }),
      item('bs.button', 'Outline danger button', 90, 38, { text: 'Delete', style: outlineBtn('danger'), keywords: `${K} button outline danger red ghost` }),
      item('bs.button', 'Large button', 140, 48, { text: 'Large button', style: { ...solidBtn('primary'), fontSize: 18, radius: 8 }, keywords: `${K} button lg large big` }),
      item('bs.button', 'Small button', 90, 31, { text: 'Small button', style: { ...solidBtn('secondary'), fontSize: 12, radius: 4 }, keywords: `${K} button sm small` }),
      item('bs.buttonGroup', 'Button group', 210, 38, { text: 'Left|Middle|Right', style: solidBtn('primary'), keywords: `${K} button group segmented toolbar` }),
      item('bs.dropdownButton', 'Dropdown button', 140, 38, { text: 'Dropdown', style: { ...solidBtn('secondary'), textAlign: 'left' }, keywords: `${K} dropdown toggle caret select menu button` }),
      item('bs.buttonBadge', 'Button with badge', 150, 38, { text: 'Notifications|4', style: solidBtn('primary'), keywords: `${K} button badge counter notification count` }),
      item('bs.close', 'Close button', 24, 24, { style: { fill: 'none', stroke: BODY, fontSize: 11 }, keywords: `${K} close dismiss x btn-close` }),

      item('bs.badge', 'Badge', 70, 22, { text: 'New', style: { ...solidBtn('secondary'), fontSize: 12, bold: true, radius: 5 }, keywords: `${K} badge label tag counter` }),
      item('bs.badge', 'Primary badge', 70, 22, { text: 'Primary', style: { ...solidBtn('primary'), fontSize: 12, bold: true, radius: 5 }, keywords: `${K} badge label tag` }),
      item('bs.badge', 'Pill badge', 70, 22, { text: 'Success', style: { ...solidBtn('success'), fontSize: 12, bold: true, radius: 11 }, keywords: `${K} badge pill rounded tag` }),
      item('bs.badge', 'Danger pill badge', 40, 22, { text: '99+', style: { ...solidBtn('danger'), fontSize: 12, bold: true, radius: 11 }, keywords: `${K} badge pill counter notification red` }),

      item('bs.alert', 'Primary alert', 360, 54, { text: 'A simple primary alert—check it out!', style: alertStyle('primary'), keywords: `${K} alert notice banner message primary` }),
      item('bs.alert', 'Success alert', 360, 54, { text: 'Well done! Your changes were saved.', style: alertStyle('success'), keywords: `${K} alert notice banner success green` }),
      item('bs.alert', 'Danger alert', 360, 54, { text: 'Oh snap! Something went wrong.', style: alertStyle('danger'), keywords: `${K} alert notice banner danger error red` }),
      item('bs.alert', 'Warning alert', 360, 54, { text: 'Careful! Check the form below.', style: alertStyle('warning'), keywords: `${K} alert notice banner warning caution yellow` }),
      item('bs.alert', 'Info alert', 360, 54, { text: 'Heads up! This needs your attention.', style: alertStyle('info'), keywords: `${K} alert notice banner info cyan` }),
      item('bs.alert', 'Secondary alert', 360, 54, { text: 'A simple secondary alert.', style: alertStyle('secondary'), keywords: `${K} alert notice banner secondary grey` }),
      item('bs.alertDismiss', 'Dismissible alert', 360, 54, {
        text: 'Holy guacamole! You should check this out.',
        style: alertStyle('warning'),
        keywords: `${K} alert dismissible close banner warning`,
      }),
      item('bs.alertHeading', 'Alert with heading', 360, 130, {
        text: 'Well done!|You successfully read this important alert message.|Whenever you need to, be sure to use margin utilities.',
        style: alertStyle('success'),
        keywords: `${K} alert heading title notice banner`,
      }),

      item('bs.navbar', 'Navbar (light)', 640, 56, {
        text: 'Navbar|Home|Features|Pricing|About',
        style: { fill: BS.light, stroke: 'none', radius: 0, fontSize: 15, textColor: BODY },
        keywords: `${K} navbar header nav menu top bar navigation`,
      }),
      item('bs.navbar', 'Navbar (dark)', 640, 56, {
        text: 'Navbar|Home|Link|Disabled',
        style: { fill: BS.dark, stroke: 'none', radius: 0, fontSize: 15, textColor: '#ffffff' },
        keywords: `${K} navbar dark header nav menu top bar navigation`,
      }),
      item('bs.navbarCollapsed', 'Navbar (collapsed)', 360, 56, {
        text: 'Navbar',
        style: { fill: BS.light, stroke: 'none', radius: 0, fontSize: 15, textColor: BODY },
        keywords: `${K} navbar mobile hamburger toggler collapse responsive`,
      }),
      item('bs.navTabs', 'Nav tabs', 360, 40, { text: 'Active|Link|Link|Disabled', style: { fill: 'none', stroke: BS.primary, fontSize: 14, textColor: BS.primary }, keywords: `${K} tabs nav navigation` }),
      item('bs.navPills', 'Nav pills', 320, 40, { text: 'Active|Link|Link|Disabled', style: { fill: 'none', stroke: BS.primary, fontSize: 14, textColor: BS.primary }, keywords: `${K} pills nav navigation tabs` }),
      item('bs.breadcrumb', 'Breadcrumb', 240, 24, { text: 'Home|Library|Data', style: { fill: 'none', stroke: BS.primary, fontSize: 14, textColor: BODY }, keywords: `${K} breadcrumb path trail navigation` }),
      item('bs.pagination', 'Pagination', 260, 38, { text: 'Previous|1|2|3|Next', style: { fill: 'none', stroke: BS.primary, fontSize: 14 }, keywords: `${K} pagination pager pages navigation` }),

      item('bs.card', 'Card', 280, 230, { text: 'Featured|Special title treatment|2 days ago', style: panel, keywords: `${K} card panel header footer content` }),
      item('bs.cardImage', 'Card with image', 260, 330, { text: 'Card title', style: panel, keywords: `${K} card image cap thumbnail content media` }),
      item('bs.listGroup', 'List group', 260, 200, { text: 'An active item|A second item|A third item|A fourth item|And a fifth one', style: panel, keywords: `${K} list group items menu` }),
      item('bs.table', 'Table', 420, 160, {
        text: '#|First|Last|Handle\n1|Mark|Otto|@mdo\n2|Jacob|Thornton|@fat\n3|Larry|Bird|@twitter',
        style: { fill: '#ffffff', stroke: BORDER, fontSize: 14, textColor: BODY },
        keywords: `${K} table grid striped rows columns data`,
      }),
      item('bs.dropdownMenu', 'Dropdown menu', 200, 170, {
        text: 'Action|Another action|Something else here|--|Separated link',
        style: { ...panel, shadow: true },
        keywords: `${K} dropdown menu list context popup`,
      }),
      item('bs.accordion', 'Accordion', 420, 260, {
        text: 'Accordion Item #1|Accordion Item #2|Accordion Item #3',
        style: panel,
        keywords: `${K} accordion collapse expand faq panel`,
      }),
      item('bs.carousel', 'Carousel', 420, 240, {
        text: 'First slide label|Some representative placeholder content.',
        style: { fill: '#6c757d', stroke: 'none', radius: 0, fontSize: 14, textColor: '#ffffff' },
        keywords: `${K} carousel slider slideshow gallery image`,
      }),
      item('bs.hero', 'Hero / jumbotron', 560, 220, {
        text: 'Hello, world!|This is a simple hero unit for calling extra attention.',
        style: { fill: BS.light, stroke: 'none', radius: 12, fontSize: 16, textColor: BODY },
        keywords: `${K} jumbotron hero banner landing header`,
      }),
      item('bs.footer', 'Footer', 640, 48, {
        text: '© 2026 Company, Inc|Home|Features|Pricing|FAQs|About',
        style: { fill: 'none', stroke: BORDER, fontSize: 14, textColor: BODY },
        keywords: `${K} footer copyright bottom links`,
      }),
      item('bs.placeholder', 'Placeholder', 260, 300, { style: { ...panel }, keywords: `${K} placeholder skeleton loading shimmer card` }),

      item('bs.formField', 'Labelled input', 280, 70, { text: 'Email address|name@example.com', style: plain, keywords: `${K} form input label field text email` }),
      item('bs.formField', 'Input with help text', 280, 92, {
        text: 'Password|••••••••|Your password must be 8-20 characters long.',
        style: plain,
        keywords: `${K} form input label help text password field`,
      }),
      item('bs.input', 'Input', 260, 38, { text: 'Placeholder', style: { ...ctl, textColor: MUTED }, keywords: `${K} form input text field control` }),
      item('bs.floating', 'Floating label', 280, 58, { text: 'Email address|name@example.com', style: ctl, keywords: `${K} form floating label input field` }),
      item('bs.select', 'Select', 260, 38, { text: 'Open this select menu', style: ctl, keywords: `${K} form select combo dropdown option` }),
      item('bs.textarea', 'Textarea', 280, 96, { text: 'Leave a comment here', style: { ...ctl, textColor: MUTED, verticalAlign: 'top' }, keywords: `${K} form textarea multiline comment` }),
      item('bs.check', 'Checkbox', 170, 22, { text: 'Checked checkbox', style: { ...plain, stroke: BS.primary }, keywords: `${K} form checkbox check tick` }),
      item('bs.checkOff', 'Checkbox (unchecked)', 170, 22, { text: 'Default checkbox', style: { ...plain, stroke: BS.primary }, keywords: `${K} form checkbox check tick` }),
      item('bs.radio', 'Radio', 160, 22, { text: 'Checked radio', style: { ...plain, stroke: BS.primary }, keywords: `${K} form radio option choice` }),
      item('bs.radioOff', 'Radio (off)', 160, 22, { text: 'Default radio', style: { ...plain, stroke: BS.primary }, keywords: `${K} form radio option choice` }),
      item('bs.switch', 'Switch', 200, 22, { text: 'Checked switch', style: { ...plain, stroke: BS.primary }, keywords: `${K} form switch toggle on off` }),
      item('bs.switchOff', 'Switch (off)', 200, 22, { text: 'Default switch', style: { ...plain, stroke: BS.primary }, keywords: `${K} form switch toggle on off` }),
      item('bs.range', 'Range', 240, 18, { style: { fill: 'none', stroke: BS.primary, fontSize: 12 }, keywords: `${K} form range slider` }),
      item('bs.inputGroup', 'Input group', 280, 38, { text: '@|Username', style: ctl, keywords: `${K} form input group addon prepend` }),
      item('bs.inputButton', 'Input with button', 320, 38, { text: "Recipient's username|Button", style: ctl, keywords: `${K} form input group append button search` }),
      item('bs.inputValid', 'Valid input', 280, 62, { text: 'Mark|Looks good!', style: plain, keywords: `${K} form validation valid success feedback` }),
      item('bs.inputInvalid', 'Invalid input', 280, 62, { text: '|Please choose a username.', style: plain, keywords: `${K} form validation invalid error feedback` }),

      item('bs.progress', 'Progress', 300, 16, { text: '60%', style: { fill: 'none', stroke: BS.primary, fontSize: 11 }, keywords: `${K} progress bar loading percent` }),
      item('bs.progressStriped', 'Striped progress', 300, 16, { text: '45', style: { fill: 'none', stroke: BS.success, fontSize: 11 }, keywords: `${K} progress bar striped animated loading` }),
      item('bs.spinner', 'Spinner', 32, 32, { style: { fill: 'none', stroke: BS.primary, fontSize: 11 }, keywords: `${K} spinner loading loader busy` }),
      item('bs.spinnerGrow', 'Growing spinner', 32, 32, { style: { fill: 'none', stroke: BS.primary, fontSize: 11 }, keywords: `${K} spinner grow loading pulse` }),
      item('bs.toast', 'Toast', 340, 92, { text: 'Bootstrap|Hello, world! This is a toast message.', style: { ...panel, shadow: true }, keywords: `${K} toast notification snackbar message` }),
      item('bs.modal', 'Modal', 460, 260, { text: 'Modal title|Modal body text goes here.', style: { ...panel, radius: 8, shadow: true }, keywords: `${K} modal dialog popup window` }),
      item('bs.offcanvas', 'Offcanvas', 280, 420, { text: 'Offcanvas|Dashboard|Orders|Products|Customers', style: { ...panel, radius: 0, shadow: true }, keywords: `${K} offcanvas drawer sidebar side panel` }),
      item('bs.tooltip', 'Tooltip', 130, 36, { text: 'Tooltip on top', style: { fill: '#000000', stroke: 'none', radius: 6, fontSize: 13, textColor: '#ffffff' }, keywords: `${K} tooltip hint` }),
      item('bs.popover', 'Popover', 240, 100, { text: 'Popover title|And here’s some amazing content.', style: { ...panel, stroke: '#c7c8c9', radius: 8 }, keywords: `${K} popover callout bubble tip` }),
    ],
  },
];
