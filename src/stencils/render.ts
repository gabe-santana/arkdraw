/**
 * Stencil → drawing primitives for a shape of size w×h.
 *
 * A tiny interpreter for the mxGraph stencil canvas model: geometry ops build
 * the current path, paint ops emit it with the current state (colors, stroke
 * width, dash, alpha…), and `save` / `restore` push and pop that state. The
 * output is plain data so it can be snapshot-tested and turned into SVG by
 * `StencilGraphic` (or anything else).
 */
import type { ElementStyle } from '@/model/types';
import type { PathOp, Stencil, StencilOp } from './parse';

export interface PathPrim {
  type: 'path';
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  opacity?: number;
  dash?: string;
  linejoin?: 'miter' | 'round' | 'bevel';
  linecap?: 'butt' | 'round' | 'square';
  miterlimit?: number;
}

export interface TextPrim {
  type: 'text';
  str: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'hanging' | 'central' | 'text-after-edge';
  color: string;
  size: number;
  family?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rotation: number;
  opacity?: number;
}

export interface ImagePrim {
  type: 'image';
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  aspect: boolean;
  flipH: boolean;
  flipV: boolean;
  opacity?: number;
}

export type StencilPrim = PathPrim | TextPrim | ImagePrim;

interface State {
  stroke: string;
  fill: string;
  strokeWidth: number;
  dashed: boolean;
  dashPattern: string | null;
  linejoin: 'miter' | 'round' | 'bevel';
  linecap: 'butt' | 'round' | 'square';
  miterlimit: number;
  alpha: number;
  fillAlpha: number;
  strokeAlpha: number;
  fontColor: string;
  fontSize: number;
  fontStyle: number;
  fontFamily?: string;
}

/** Resolves nested `<include-shape name>` references (e.g. a plugin's stencil registry). */
export type StencilResolver = (name: string) => Stencil | null;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Scale and offset that map stencil units onto the w×h box. */
export function stencilTransform(st: Stencil, w: number, h: number) {
  let sx = w / st.w;
  let sy = h / st.h;
  let x0 = 0;
  let y0 = 0;
  if (st.aspect === 'fixed') {
    sx = sy = Math.min(sx, sy);
    x0 = (w - st.w * sx) / 2;
    y0 = (h - st.h * sy) / 2;
  }
  return { sx, sy, x0, y0 };
}

function dashArray(s: State): string | undefined {
  if (!s.dashed) return undefined;
  const sw = Math.max(s.strokeWidth, 0.5);
  const pattern = s.dashPattern ?? '3 3';
  const parts = pattern.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  return parts.length ? parts.map((n) => r2(n * sw)).join(' ') : undefined;
}

export function renderStencil(st: Stencil, w: number, h: number, style: ElementStyle, resolve?: StencilResolver, depth = 0): StencilPrim[] {
  const out: StencilPrim[] = [];
  if (!(w > 0 && h > 0)) return out;
  const { sx, sy, x0, y0 } = stencilTransform(st, w, h);
  const minScale = Math.min(sx, sy);
  const X = (x: number) => r2(x0 + x * sx);
  const Y = (y: number) => r2(y0 + y * sy);

  const styleDash = style.dashPattern ? style.dashPattern.split(/[\s,]+/).map((n) => Number(n) / Math.max(style.strokeWidth, 0.5)).join(' ') : null;
  let s: State = {
    stroke: style.stroke,
    fill: style.fill,
    strokeWidth: st.strokewidth === 'inherit' ? style.strokeWidth : st.strokewidth * minScale,
    dashed: style.strokeStyle !== 'solid' || !!style.dashPattern,
    dashPattern: styleDash ?? (style.strokeStyle === 'dotted' ? '0 2.5' : style.strokeStyle === 'dashed' ? '4 3' : null),
    linejoin: 'round',
    linecap: style.strokeStyle === 'dotted' ? 'round' : 'butt',
    miterlimit: 10,
    alpha: 1,
    fillAlpha: style.fillOpacity ?? 1,
    strokeAlpha: style.strokeOpacity ?? 1,
    fontColor: style.textColor,
    fontSize: style.fontSize,
    fontStyle: (style.bold ? 1 : 0) | (style.italic ? 2 : 0) | (style.underline ? 4 : 0),
  };
  const stack: State[] = [];
  let path = '';

  const pathD = (ops: PathOp[]) => {
    let d = '';
    for (const o of ops) {
      switch (o.op) {
        case 'move':
          d += `M${X(o.x)},${Y(o.y)} `;
          break;
        case 'line':
          d += `L${X(o.x)},${Y(o.y)} `;
          break;
        case 'quad':
          d += `Q${X(o.x1)},${Y(o.y1)} ${X(o.x2)},${Y(o.y2)} `;
          break;
        case 'curve':
          d += `C${X(o.x1)},${Y(o.y1)} ${X(o.x2)},${Y(o.y2)} ${X(o.x3)},${Y(o.y3)} `;
          break;
        case 'arc':
          d += `A${r2(o.rx * sx)},${r2(o.ry * sy)} ${o.rotation} ${o.large ? 1 : 0} ${o.sweep ? 1 : 0} ${X(o.x)},${Y(o.y)} `;
          break;
        case 'close':
          d += 'Z ';
          break;
      }
    }
    return d.trim();
  };

  const paint = (fill: boolean, stroke: boolean) => {
    if (!path) return;
    const strokeOn = stroke && s.stroke !== 'none' && s.strokeWidth > 0;
    const fillOn = fill && s.fill !== 'none';
    if (fillOn || strokeOn) {
      const p: PathPrim = {
        type: 'path',
        d: path,
        fill: fillOn ? s.fill : 'none',
        stroke: strokeOn ? s.stroke : 'none',
        strokeWidth: strokeOn ? r2(s.strokeWidth) : 0,
      };
      if (fillOn && s.fillAlpha < 1) p.fillOpacity = s.fillAlpha;
      if (strokeOn && s.strokeAlpha < 1) p.strokeOpacity = s.strokeAlpha;
      if (s.alpha < 1) p.opacity = s.alpha;
      if (strokeOn) {
        const dash = dashArray(s);
        if (dash) p.dash = dash;
        p.linejoin = s.linejoin;
        if (s.linecap !== 'butt') p.linecap = s.linecap;
        if (s.linejoin === 'miter' && s.miterlimit !== 10) p.miterlimit = s.miterlimit;
      }
      out.push(p);
    }
    path = '';
  };

  const run = (ops: StencilOp[]) => {
    for (const o of ops) {
      switch (o.op) {
        case 'path':
          path = pathD(o.ops);
          break;
        case 'rect':
          path = `M${X(o.x)},${Y(o.y)} H${X(o.x + o.w)} V${Y(o.y + o.h)} H${X(o.x)} Z`;
          break;
        case 'roundrect': {
          const rw = o.w * sx;
          const rh = o.h * sy;
          const r = r2(Math.min(rw * (o.arcsize / 100), rh * (o.arcsize / 100), rw / 2, rh / 2));
          const x = X(o.x);
          const y = Y(o.y);
          const x2 = r2(x + rw);
          const y2 = r2(y + rh);
          path =
            `M${r2(x + r)},${y} H${r2(x2 - r)} A${r},${r} 0 0 1 ${x2},${r2(y + r)} V${r2(y2 - r)} A${r},${r} 0 0 1 ${r2(x2 - r)},${y2} ` +
            `H${r2(x + r)} A${r},${r} 0 0 1 ${x},${r2(y2 - r)} V${r2(y + r)} A${r},${r} 0 0 1 ${r2(x + r)},${y} Z`;
          break;
        }
        case 'ellipse': {
          const rx = r2((o.w * sx) / 2);
          const ry = r2((o.h * sy) / 2);
          const cx = r2(x0 + (o.x + o.w / 2) * sx);
          const cy = Y(o.y + o.h / 2);
          path = `M${r2(cx - rx)},${cy} A${rx},${ry} 0 1 0 ${r2(cx + rx)},${cy} A${rx},${ry} 0 1 0 ${r2(cx - rx)},${cy} Z`;
          break;
        }
        case 'fill':
          paint(true, false);
          break;
        case 'stroke':
          paint(false, true);
          break;
        case 'fillstroke':
          paint(true, true);
          break;
        case 'save':
          stack.push({ ...s });
          break;
        case 'restore':
          s = stack.pop() ?? s;
          break;
        case 'strokecolor':
          s.stroke = o.color;
          break;
        case 'fillcolor':
          s.fill = o.color;
          break;
        case 'fontcolor':
          s.fontColor = o.color;
          break;
        case 'strokewidth':
          s.strokeWidth = o.width * (o.fixed ? 1 : minScale);
          break;
        case 'dashed':
          s.dashed = o.dashed;
          break;
        case 'dashpattern':
          s.dashPattern = o.pattern;
          break;
        case 'linejoin':
          s.linejoin = o.join;
          break;
        case 'linecap':
          s.linecap = o.cap;
          break;
        case 'miterlimit':
          s.miterlimit = o.limit;
          break;
        case 'alpha':
          s.alpha = o.alpha;
          break;
        case 'fillalpha':
          s.fillAlpha = o.alpha;
          break;
        case 'strokealpha':
          s.strokeAlpha = o.alpha;
          break;
        case 'fontsize':
          s.fontSize = o.size * minScale;
          break;
        case 'fontstyle':
          s.fontStyle = o.style;
          break;
        case 'fontfamily':
          s.fontFamily = o.family;
          break;
        case 'text': {
          if (!o.str) break;
          const t: TextPrim = {
            type: 'text',
            str: o.str,
            x: X(o.x),
            y: Y(o.y),
            anchor: o.align === 'left' ? 'start' : o.align === 'right' ? 'end' : 'middle',
            baseline: o.valign === 'top' ? 'hanging' : o.valign === 'bottom' ? 'text-after-edge' : 'central',
            color: s.fontColor,
            size: r2(s.fontSize),
            bold: (s.fontStyle & 1) === 1,
            italic: (s.fontStyle & 2) === 2,
            underline: (s.fontStyle & 4) === 4,
            rotation: o.rotation + (o.vertical ? -90 : 0),
          };
          if (s.fontFamily) t.family = s.fontFamily;
          if (s.alpha < 1) t.opacity = s.alpha;
          out.push(t);
          break;
        }
        case 'image': {
          if (!o.src) break;
          const img: ImagePrim = { type: 'image', src: o.src, x: X(o.x), y: Y(o.y), w: r2(o.w * sx), h: r2(o.h * sy), aspect: o.aspect, flipH: o.flipH, flipV: o.flipV };
          if (s.alpha < 1) img.opacity = s.alpha;
          out.push(img);
          break;
        }
        case 'include': {
          const inner = depth < 4 ? resolve?.(o.name) : null;
          if (!inner) break;
          const iw = o.w * sx;
          const ih = o.h * sy;
          const ox = X(o.x);
          const oy = Y(o.y);
          const innerStyle: ElementStyle = { ...style, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth };
          for (const p of renderStencil(inner, iw, ih, innerStyle, resolve, depth + 1)) out.push(offsetPrim(p, ox, oy));
          break;
        }
      }
    }
  };

  run(st.background);
  run(st.foreground);
  return out;
}

/** Translates a primitive (used for `include-shape`). */
function offsetPrim(p: StencilPrim, dx: number, dy: number): StencilPrim {
  if (p.type === 'path') {
    // Absolute commands only: shift every x,y pair. Arc radii/flags are left alone.
    const d = p.d.replace(/([MLQCAHVZ])([^MLQCAHVZ]*)/g, (_m, cmd: string, args: string) => {
      const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (cmd === 'H') return `H${n.map((v) => r2(v + dx)).join(' ')} `;
      if (cmd === 'V') return `V${n.map((v) => r2(v + dy)).join(' ')} `;
      if (cmd === 'A') return `A${n[0]},${n[1]} ${n[2]} ${n[3]} ${n[4]} ${r2(n[5] + dx)},${r2(n[6] + dy)} `;
      if (cmd === 'Z') return 'Z ';
      const pts: string[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push(`${r2(n[i] + dx)},${r2(n[i + 1] + dy)}`);
      return `${cmd}${pts.join(' ')} `;
    });
    return { ...p, d: d.trim() };
  }
  return { ...p, x: r2(p.x + dx), y: r2(p.y + dy) };
}
