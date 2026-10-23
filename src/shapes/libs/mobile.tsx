/**
 * Android (Material 3) and iOS device frames and native-looking controls.
 */
import type { ComponentType } from 'react';
import {
  BatteryFull, Bell, ChevronLeft, ChevronRight, EllipsisVertical, Heart, House, Menu, Plus, Search, Signal, User, Wifi,
  type LucideProps,
} from 'lucide-react';
import type { ElementStyle, Rect } from '@/model/types';
import { measureText } from '@/lib/text';
import { RoundRect, rr, strokeAttrs, topRounded } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Label, f, ink, item, shape } from './_kit2';

const MD_PRIMARY = '#2563eb';
const MD_TINT = '#dbeafe';
const IOS_BLUE = '#007aff';
const IOS_GREY = '#8e8e93';
const HAIR = '#d1d5db';

const parts = (text: string) => text.split(/\||\n/).map((t) => t.trim()).filter(Boolean);
const fillOr = (s: ElementStyle, d: string) => (s.fill === 'none' ? d : s.fill);

// ---------------------------------------------------------------------------
// Device frames
// ---------------------------------------------------------------------------

function phoneFrame(ios: boolean) {
  return function Phone({ w, h, style }: ShapeRenderContext) {
    const m = Math.min(w, h);
    const R = m * (ios ? 0.17 : 0.12);
    const b = m * (ios ? 0.045 : 0.04);
    const sr = Math.max(2, R - b);
    return (
      <>
        <rect width={w} height={h} rx={f(R)} fill={fillOr(style, '#111827')} {...strokeAttrs(style)} />
        {/* side buttons */}
        <rect x={f(w - 0.5)} y={f(h * 0.2)} width={2} height={f(h * 0.1)} rx={1} fill={fillOr(style, '#111827')} />
        <rect x={f(-1.5)} y={f(h * 0.18)} width={2} height={f(h * 0.06)} rx={1} fill={fillOr(style, '#111827')} />
        <rect x={f(b)} y={f(b)} width={f(w - b * 2)} height={f(h - b * 2)} rx={f(sr)} fill="#ffffff" stroke="none" />
        {ios ? (
          <rect x={f(w / 2 - m * 0.16)} y={f(b + m * 0.035)} width={f(m * 0.32)} height={f(m * 0.085)} rx={f(m * 0.0425)} fill="#0b0b0f" />
        ) : (
          <circle cx={f(w / 2)} cy={f(b + m * 0.06)} r={f(m * 0.03)} fill="#0b0b0f" />
        )}
        <rect x={f(w / 2 - m * (ios ? 0.18 : 0.14))} y={f(h - b - m * 0.045)} width={f(m * (ios ? 0.36 : 0.28))} height={f(Math.max(1.5, m * 0.016))} rx={1} fill="#0f172a" fillOpacity={0.7} />
      </>
    );
  };
}

const screenTop = (ios: boolean) => (w: number, h: number): Rect => {
  const m = Math.min(w, h);
  const b = m * (ios ? 0.045 : 0.04) + 10;
  return { x: b, y: b + m * 0.12, w: Math.max(1, w - b * 2), h: Math.max(1, h * 0.1) };
};

// ---------------------------------------------------------------------------
// Bars
// ---------------------------------------------------------------------------

function statusBar(ios: boolean) {
  return function StatusBar({ w, h, style }: ShapeRenderContext) {
    const c = style.textColor;
    const g = Math.min(16, h * 0.62);
    const fs = Math.min(14, h * 0.55);
    return (
      <>
        <rect width={w} height={h} fill={style.fill === 'none' ? 'none' : style.fill} stroke="none" />
        <Label x={ios ? w * 0.13 : 14} y={h / 2} text={ios ? '9:41' : '12:30'} s={style} size={fs} color={c} bold={ios} anchor={ios ? 'middle' : 'start'} />
        <Glyph Icon={BatteryFull} cx={w - (ios ? 22 : 18)} cy={h / 2} size={g * 1.1} s={style} color={c} sw={1.75} />
        <Glyph Icon={Wifi} cx={w - (ios ? 22 : 18) - g * 1.25} cy={h / 2} size={g} s={style} color={c} sw={2} />
        <Glyph Icon={Signal} cx={w - (ios ? 22 : 18) - g * 2.4} cy={h / 2} size={g} s={style} color={c} sw={2} />
      </>
    );
  };
}

function AppBar({ w, h, style }: ShapeRenderContext) {
  const g = Math.min(22, h * 0.42);
  const c = style.textColor;
  return (
    <>
      <rect width={w} height={h} fill={fillOr(style, '#f8fafc')} {...strokeAttrs({ ...style, stroke: 'none' })} />
      <Glyph Icon={Menu} cx={h * 0.45} cy={h / 2} size={g} s={style} color={c} sw={2} />
      <Glyph Icon={Search} cx={w - h * 1.15} cy={h / 2} size={g} s={style} color={c} sw={2} />
      <Glyph Icon={EllipsisVertical} cx={w - h * 0.45} cy={h / 2} size={g} s={style} color={c} sw={2} />
    </>
  );
}

const NAV_ICONS: Array<[ComponentType<LucideProps>, string]> = [
  [House, 'Home'],
  [Search, 'Search'],
  [Heart, 'Saved'],
  [User, 'Profile'],
];

function BottomNav({ w, h, style }: ShapeRenderContext) {
  const n = NAV_ICONS.length;
  const cw = w / n;
  const g = Math.min(22, h * 0.32);
  const fs = Math.max(6, Math.min(12, h * 0.17));
  const iy = h * 0.4;
  return (
    <>
      <rect width={w} height={h} fill={fillOr(style, '#f8fafc')} stroke="none" />
      {NAV_ICONS.map(([Icon, label], i) => {
        const cx = cw * i + cw / 2;
        const on = i === 0;
        return (
          <g key={label}>
            {on && <rect x={f(cx - g * 1.45)} y={f(iy - g * 0.75)} width={f(g * 2.9)} height={f(g * 1.5)} rx={f(g * 0.75)} fill={MD_TINT} />}
            <Glyph Icon={Icon} cx={cx} cy={iy} size={g} s={style} color={on ? '#1e3a8a' : '#475569'} sw={2} />
            <Label x={cx} y={h * 0.8} text={label} s={style} size={fs} color={on ? '#0f172a' : '#475569'} bold={on} />
          </g>
        );
      })}
    </>
  );
}

function MdSwitch({ w, h, style }: ShapeRenderContext) {
  const r = h / 2;
  const k = r * 0.72;
  const cx = w - r;
  return (
    <>
      <rect width={w} height={h} rx={f(r)} fill={fillOr(style, MD_PRIMARY)} {...strokeAttrs(style)} />
      <circle cx={f(cx)} cy={f(r)} r={f(k)} fill="#ffffff" />
      <path
        d={`M${f(cx - k * 0.42)},${f(r + k * 0.02)} L${f(cx - k * 0.1)},${f(r + k * 0.34)} L${f(cx + k * 0.45)},${f(r - k * 0.3)}`}
        fill="none"
        stroke={fillOr(style, MD_PRIMARY)}
        strokeWidth={Math.max(1.5, k * 0.2)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Fab({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={Math.min(w, h) * 0.3} />
      <Glyph Icon={Plus} cx={w / 2} cy={h / 2} size={Math.min(w, h) * 0.42} s={style} color={style.textColor} sw={2.25} />
    </>
  );
}

function MdCard({ w, h, style }: ShapeRenderContext) {
  const mh = h * 0.5;
  const r = rr(w, h, style.radius);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, mh, r)} fill={MD_TINT} stroke="none" />
      <path
        d={`M${f(w * 0.2)},${f(mh * 0.86)} L${f(w * 0.4)},${f(mh * 0.45)} L${f(w * 0.56)},${f(mh * 0.7)} L${f(w * 0.68)},${f(mh * 0.56)} L${f(w * 0.82)},${f(mh * 0.86)} Z`}
        fill={MD_PRIMARY}
        fillOpacity={0.35}
      />
      <circle cx={f(w * 0.68)} cy={f(mh * 0.3)} r={f(Math.min(w, mh) * 0.08)} fill={MD_PRIMARY} fillOpacity={0.35} />
      <rect x={16} y={f(h - Math.min(38, h * 0.2))} width={f(Math.min(84, w * 0.4))} height={f(Math.min(26, h * 0.13))} rx={f(Math.min(13, h * 0.065))} fill={MD_PRIMARY} />
    </>
  );
}

function Snackbar({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Label x={w - 16} y={h / 2} text="Undo" s={style} size={Math.min(style.fontSize, h * 0.4)} color="#93c5fd" bold anchor="end" />
    </>
  );
}

function TextField({ w, h, style, text }: ShapeRenderContext) {
  const [label, ...rest] = text.split('\n');
  const value = rest.join(' ');
  const hasLabel = !!label && rest.length > 0;
  const r = Math.min(rr(w, h, style.radius), 8);
  const ls = { ...style, fontSize: Math.max(8, style.fontSize * 0.8) };
  const lw = hasLabel ? measureText(label, ls) + 8 : 0;
  const x0 = 12;
  const c = ink(style);
  const d = hasLabel
    ? `M${f(x0 + lw)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(h - r)} Q${f(w)},${f(h)} ${f(w - r)},${f(h)} H${f(r)} Q0,${f(h)} 0,${f(h - r)} V${f(r)} Q0,0 ${f(r)},0 H${f(x0)}`
    : `M${f(r)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(h - r)} Q${f(w)},${f(h)} ${f(w - r)},${f(h)} H${f(r)} Q0,${f(h)} 0,${f(h - r)} V${f(r)} Q0,0 ${f(r)},0 Z`;
  return (
    <>
      <path d={d} fill={style.fill === 'none' ? 'none' : style.fill} {...strokeAttrs(style)} strokeLinecap="round" />
      {hasLabel && <Label x={x0 + 4} y={0} text={label} s={ls} anchor="start" color={c} />}
      <Label x={16} y={h / 2} text={hasLabel ? value : label} s={style} anchor="start" />
    </>
  );
}

// ---------------------------------------------------------------------------
// iOS controls
// ---------------------------------------------------------------------------

function NavBar({ w, h, style }: ShapeRenderContext) {
  const fs = Math.min(style.fontSize + 1, h * 0.4);
  const g = Math.min(24, h * 0.5);
  return (
    <>
      <rect width={w} height={h} fill={fillOr(style, '#f8fafc')} stroke="none" />
      <path d={`M0,${f(h - 0.5)} H${f(w)}`} stroke={HAIR} strokeWidth={1} />
      <Glyph Icon={ChevronLeft} cx={g * 0.55} cy={h / 2} size={g} s={style} color={IOS_BLUE} sw={2.5} />
      <Label x={g * 1.05} y={h / 2} text="Back" s={style} size={fs} color={IOS_BLUE} anchor="start" bold={false} />
      <Label x={w - 14} y={h / 2} text="Edit" s={style} size={fs} color={IOS_BLUE} anchor="end" bold={false} />
    </>
  );
}

const IOS_TABS: Array<[ComponentType<LucideProps>, string]> = [
  [House, 'Home'],
  [Search, 'Search'],
  [Bell, 'Alerts'],
  [User, 'Profile'],
];

function TabBar({ w, h, style }: ShapeRenderContext) {
  const n = IOS_TABS.length;
  const cw = w / n;
  const g = Math.min(24, h * 0.4);
  const fs = Math.max(6, Math.min(10.5, h * 0.17));
  return (
    <>
      <rect width={w} height={h} fill={fillOr(style, '#f8fafc')} stroke="none" />
      <path d={`M0,0.5 H${f(w)}`} stroke={HAIR} strokeWidth={1} />
      {IOS_TABS.map(([Icon, label], i) => {
        const cx = cw * i + cw / 2;
        const c = i === 0 ? IOS_BLUE : IOS_GREY;
        return (
          <g key={label}>
            <Glyph Icon={Icon} cx={cx} cy={h * 0.4} size={g} s={style} color={c} sw={2} />
            <Label x={cx} y={h * 0.8} text={label} s={style} size={fs} color={c} />
          </g>
        );
      })}
    </>
  );
}

function IosSwitch({ w, h, style }: ShapeRenderContext) {
  const r = h / 2;
  const k = r - Math.max(1.5, h * 0.07);
  const cx = w - r;
  return (
    <>
      <rect width={w} height={h} rx={f(r)} fill={fillOr(style, '#34c759')} {...strokeAttrs(style)} />
      <circle cx={f(cx)} cy={f(r + h * 0.04)} r={f(k)} fill="#000" fillOpacity={0.12} />
      <circle cx={f(cx)} cy={f(r)} r={f(k)} fill="#ffffff" />
    </>
  );
}

function Segmented({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const n = Math.max(labels.length, 2);
  const sw = w / n;
  const p = Math.max(2, h * 0.07);
  const r = Math.min(h * 0.28, 9);
  const fs = Math.min(style.fontSize, h * 0.45);
  return (
    <>
      <rect width={w} height={h} rx={f(r)} fill={fillOr(style, '#eeeef0')} {...strokeAttrs(style)} />
      {Array.from({ length: n - 1 }, (_, i) =>
        i === 0 ? null : <path key={i} d={`M${f(sw * (i + 1))},${f(h * 0.28)} V${f(h * 0.72)}`} stroke="#c7c7cc" strokeWidth={1} />,
      )}
      <rect x={f(p)} y={f(p)} width={f(sw - p * 2)} height={f(h - p * 2)} rx={f(r - p / 2)} fill="#ffffff" stroke="#000" strokeOpacity={0.06} strokeWidth={0.75} />
      {Array.from({ length: n }, (_, i) =>
        labels[i] ? (
          <Label key={i} x={sw * i + sw / 2} y={h / 2} text={labels[i]} s={style} size={fs} bold={i === 0} />
        ) : (
          <rect key={i} x={f(sw * i + sw * 0.3)} y={f(h / 2 - 2.5)} width={f(sw * 0.4)} height={5} rx={2.5} fill="#c7c7cc" />
        ),
      )}
    </>
  );
}

const ROW_COLORS = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#af52de'];

function ListGroup({ w, h, style, text }: ShapeRenderContext) {
  const labels = parts(text);
  const n = Math.max(labels.length, 3);
  const rh = h / n;
  const t = Math.min(rh * 0.6, 28);
  const fs = Math.min(style.fontSize, rh * 0.42);
  const tx = 14 + t + 12;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      {Array.from({ length: n }, (_, i) => {
        const cy = rh * i + rh / 2;
        return (
          <g key={i}>
            {i > 0 && <path d={`M${f(tx)},${f(rh * i)} H${f(w)}`} stroke={HAIR} strokeWidth={0.75} />}
            <rect x={14} y={f(cy - t / 2)} width={f(t)} height={f(t)} rx={f(t * 0.24)} fill={ROW_COLORS[i % ROW_COLORS.length]} />
            {labels[i] ? (
              <Label x={tx} y={cy} text={labels[i]} s={style} size={fs} anchor="start" />
            ) : (
              <rect x={f(tx)} y={f(cy - 3)} width={f(w * 0.35)} height={6} rx={3} fill="#d1d5db" />
            )}
            <Glyph Icon={ChevronRight} cx={w - 16} cy={cy} size={Math.min(16, rh * 0.45)} s={style} color="#c7c7cc" sw={2.25} />
          </g>
        );
      })}
    </>
  );
}

function SearchBar({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, h / 2)} />
      <Glyph Icon={Search} cx={h * 0.5} cy={h / 2} size={Math.min(17, h * 0.48)} s={style} color={IOS_GREY} sw={2.25} />
    </>
  );
}

const alertBtn = (h: number) => Math.min(44, h * 0.3);

function IosAlert({ w, h, style }: ShapeRenderContext) {
  const bh = alertBtn(h);
  const fs = Math.min(style.fontSize + 1, bh * 0.4);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M0,${f(h - bh)} H${f(w)} M${f(w / 2)},${f(h - bh)} V${f(h)}`} stroke={HAIR} strokeWidth={0.75} />
      <Label x={w / 4} y={h - bh / 2} text="Cancel" s={style} size={fs} color={IOS_BLUE} bold={false} />
      <Label x={(w * 3) / 4} y={h - bh / 2} text="OK" s={style} size={fs} color={IOS_BLUE} bold />
    </>
  );
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const shapes: ShapeDef[] = [
  // Android
  shape('android.phone', 'Android phone', 'shape=mxgraph.android.phone2;container=1;', phoneFrame(false), { container: true, textBox: screenTop(false) }),
  shape('android.statusBar', 'Status bar', 'shape=mxgraph.android.statusBar;', statusBar(false), { boxHit: true, textPlacement: 'custom' }),
  shape('android.appBar', 'Top app bar', 'shape=mxgraph.android.action_bar;align=left;spacingLeft=56;', AppBar, {
    textBox: (w, h) => ({ x: h * 0.95, y: 0, w: Math.max(1, w - h * 2.6), h }),
  }),
  shape('android.bottomNav', 'Bottom navigation', 'shape=mxgraph.android.tabsBar;', BottomNav, { textPlacement: 'custom' }),
  shape('android.switch', 'Switch', 'shape=mxgraph.android.switch_on;', MdSwitch, { textPlacement: 'below' }),
  shape('android.fab', 'Floating action button', 'shape=mxgraph.android.fab;verticalLabelPosition=bottom;verticalAlign=top;', Fab, { textPlacement: 'below' }),
  shape('android.card', 'Card', 'shape=mxgraph.android.rrect;rSize=12;verticalAlign=bottom;align=left;spacingLeft=16;', MdCard, {
    rounded: true,
    textBox: (w, h) => ({ x: 16, y: h * 0.5 + 8, w: Math.max(1, w - 32), h: Math.max(1, h * 0.5 - 16 - Math.min(38, h * 0.2)) }),
  }),
  shape('android.snackbar', 'Snackbar', 'rounded=1;arcSize=8;align=left;spacingLeft=16;whiteSpace=wrap;', Snackbar, {
    rounded: true,
    textBox: (w, h) => ({ x: 16, y: 4, w: Math.max(1, w - 86), h: Math.max(1, h - 8) }),
  }),
  shape('android.textField', 'Text field', 'shape=mxgraph.android.textfield;align=left;spacingLeft=16;', TextField, { rounded: true, textPlacement: 'custom' }),

  // iOS
  shape('ios.iphone', 'iPhone', 'shape=mxgraph.ios7.misc.iphone;container=1;', phoneFrame(true), { container: true, textBox: screenTop(true) }),
  shape('ios.statusBar', 'Status bar', 'shape=mxgraph.ios7ui.appBar;', statusBar(true), { boxHit: true, textPlacement: 'custom' }),
  shape('ios.navBar', 'Navigation bar', 'shape=mxgraph.ios7.misc.navigation_bar;fontStyle=1;', NavBar, {
    textBox: (w, h) => ({ x: w * 0.25, y: 0, w: w * 0.5, h }),
  }),
  shape('ios.tabBar', 'Tab bar', 'shape=mxgraph.ios7.misc.tab_bar;', TabBar, { textPlacement: 'custom' }),
  shape('ios.switch', 'Switch', 'shape=mxgraph.ios7ui.onOffButton;buttonState=on;strokeColor=#38D145;fillColor=#38D145;', IosSwitch, { textPlacement: 'below' }),
  shape('ios.segmented', 'Segmented control', 'shape=mxgraph.ios7.misc.segmented_control;', Segmented, { textPlacement: 'custom' }),
  shape('ios.listGroup', 'Grouped list', 'shape=mxgraph.ios7.misc.table_view;', ListGroup, { rounded: true, textPlacement: 'custom' }),
  shape('ios.searchBar', 'Search bar', 'shape=mxgraph.ios7.misc.search;align=left;spacingLeft=28;', SearchBar, {
    rounded: true,
    textBox: (w, h) => ({ x: h * 0.5 + 12, y: 2, w: Math.max(1, w - h * 0.5 - 24), h: Math.max(1, h - 4) }),
  }),
  shape('ios.alert', 'Alert', 'shape=mxgraph.ios7.misc.alert;whiteSpace=wrap;', IosAlert, {
    rounded: true,
    textBox: (w, h) => ({ x: 16, y: 10, w: Math.max(1, w - 32), h: Math.max(1, h - alertBtn(h) - 20) }),
  }),
];

// ---------------------------------------------------------------------------
// Libraries
// ---------------------------------------------------------------------------

const bar = { stroke: 'none', textColor: '#0f172a', fontSize: 14 };

export const libraries: ShapeLibrary[] = [
  {
    id: 'android',
    name: 'Android',
    items: [
      item('android.phone', 'Android phone', 180, 370, { style: { fill: '#111827', stroke: '#0b0b0f', radius: 0 }, keywords: 'device frame material pixel' }),
      item('android.statusBar', 'Status bar', 360, 24, { style: { ...bar, fill: '#f8fafc', fontSize: 12 }, keywords: 'time battery signal' }),
      item('android.appBar', 'Top app bar', 360, 56, {
        text: 'Title',
        style: { ...bar, fill: '#f8fafc', fontSize: 18, textAlign: 'left' },
        keywords: 'toolbar action bar header',
      }),
      item('android.bottomNav', 'Bottom navigation', 360, 72, { style: { ...bar, fill: '#f8fafc' }, keywords: 'tab bar navigation bar' }),
      item('android.switch', 'Switch', 52, 32, { style: { fill: MD_PRIMARY, stroke: 'none' }, keywords: 'toggle on off' }),
      item('android.fab', 'FAB', 56, 56, {
        style: { fill: MD_TINT, stroke: 'none', textColor: '#1e3a8a', shadow: true, fontSize: 12 },
        keywords: 'floating action button plus add',
      }),
      item('android.card', 'Card', 220, 220, {
        text: 'Card title',
        style: { fill: '#ffffff', stroke: '#e2e8f0', radius: 12, fontSize: 16, textColor: '#0f172a', textAlign: 'left', verticalAlign: 'top', shadow: true },
        keywords: 'material elevated',
      }),
      item('android.snackbar', 'Snackbar', 300, 48, {
        text: 'Message archived',
        style: { fill: '#313033', stroke: 'none', radius: 4, fontSize: 14, textColor: '#f4eff4', textAlign: 'left' },
        keywords: 'toast notification',
      }),
      item('android.textField', 'Text field', 260, 56, {
        text: 'Email\njane@example.com',
        style: { fill: 'none', stroke: '#64748b', radius: 4, fontSize: 15, textColor: '#0f172a' },
        keywords: 'input outlined material',
      }),
      item('mock.button', 'Filled button', 120, 40, {
        text: 'Button',
        style: { fill: MD_PRIMARY, stroke: 'none', textColor: '#ffffff', radius: 20, fontSize: 14, bold: true },
        keywords: 'material action',
      }),
      item('mock.button', 'Tonal button', 120, 40, {
        text: 'Button',
        style: { fill: MD_TINT, stroke: 'none', textColor: '#1e3a8a', radius: 20, fontSize: 14, bold: true },
        keywords: 'material secondary',
      }),
      item('mock.button', 'Outlined button', 120, 40, {
        text: 'Button',
        style: { fill: '#ffffff', stroke: '#64748b', strokeWidth: 1, textColor: MD_PRIMARY, radius: 20, fontSize: 14, bold: true },
        keywords: 'material outline',
      }),
    ],
  },
  {
    id: 'ios',
    name: 'iOS',
    items: [
      item('ios.iphone', 'iPhone', 180, 370, { style: { fill: '#111827', stroke: '#0b0b0f', radius: 0 }, keywords: 'device frame apple' }),
      item('ios.statusBar', 'Status bar', 360, 28, { style: { ...bar, fill: 'none', fontSize: 14 }, keywords: 'time battery signal' }),
      item('ios.navBar', 'Navigation bar', 360, 44, { text: 'Title', style: { ...bar, fill: '#f8fafc', fontSize: 16, bold: true }, keywords: 'header back' }),
      item('ios.tabBar', 'Tab bar', 360, 56, { style: { ...bar, fill: '#f8fafc' }, keywords: 'bottom navigation' }),
      item('ios.switch', 'Switch', 51, 31, { style: { fill: '#34c759', stroke: 'none' }, keywords: 'toggle on off' }),
      item('ios.segmented', 'Segmented control', 240, 32, {
        text: 'Day|Week|Month',
        style: { fill: '#eeeef0', stroke: 'none', fontSize: 13, textColor: '#0f172a' },
        keywords: 'segments picker tabs',
      }),
      item('ios.listGroup', 'Grouped list', 280, 132, {
        text: 'Wi-Fi\nBluetooth\nNotifications',
        style: { fill: '#ffffff', stroke: '#e5e7eb', radius: 12, fontSize: 15, textColor: '#0f172a' },
        keywords: 'table view cells settings card',
      }),
      item('ios.searchBar', 'Search bar', 300, 36, {
        text: 'Search',
        style: { fill: '#eeeef0', stroke: 'none', radius: 10, fontSize: 15, textColor: IOS_GREY, textAlign: 'left' },
        keywords: 'find query',
      }),
      item('ios.alert', 'Alert', 270, 140, {
        text: 'Delete item?\nThis cannot be undone.',
        style: { fill: '#f5f5f7', stroke: 'none', radius: 14, fontSize: 14, textColor: '#0f172a', shadow: true },
        keywords: 'dialog popup confirm',
      }),
      item('mock.button', 'Action button', 140, 44, {
        text: 'Continue',
        style: { fill: IOS_BLUE, stroke: 'none', textColor: '#ffffff', radius: 12, fontSize: 16, bold: true },
        keywords: 'filled button primary',
      }),
    ],
  },
];
