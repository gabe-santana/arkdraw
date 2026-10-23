/**
 * Built-in shape → stencil XML ("Convert to stencil" in Edit shape).
 *
 * Renders the shape's React geometry at its current size and translates the
 * plain SVG primitives (path, rect, ellipse, circle, line, polyline, polygon,
 * translated groups) into stencil ops. Shapes that draw text, images or icons
 * can't be represented faithfully and return a reason instead.
 */
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { ElementStyle, ShapeElement } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { strokeAttrs } from '@/shapes/kit';

export type ConvertResult = { ok: true; xml: string } | { ok: false; reason: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

class Unsupported extends Error {}

// ---------------------------------------------------------------------------
// SVG path data → stencil <path> children (absolute coordinates)
// ---------------------------------------------------------------------------

/** Converts SVG path data to stencil path ops. Handles M L H V Q T C S A Z, absolute and relative. */
export function svgPathToStencil(d: string, dx = 0, dy = 0): string[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const ops: string[] = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastCtrl: { x: number; y: number; kind: 'q' | 'c' } | null = null;
  const next = () => {
    const t = tokens[i++];
    if (t === undefined || /[a-zA-Z]/.test(t)) throw new Unsupported('bad path data');
    return Number(t);
  };
  const P = (px: number, py: number) => `x="${r2(px + dx)}" y="${r2(py + dy)}"`;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        x = ox + next();
        y = oy + next();
        sx = x;
        sy = y;
        ops.push(`<move ${P(x, y)}/>`);
        cmd = rel ? 'l' : 'L'; // implicit lineto after moveto
        lastCtrl = null;
        break;
      }
      case 'L':
        x = ox + next();
        y = oy + next();
        ops.push(`<line ${P(x, y)}/>`);
        lastCtrl = null;
        break;
      case 'H':
        x = ox + next();
        ops.push(`<line ${P(x, y)}/>`);
        lastCtrl = null;
        break;
      case 'V':
        y = oy + next();
        ops.push(`<line ${P(x, y)}/>`);
        lastCtrl = null;
        break;
      case 'Q': {
        const x1 = ox + next();
        const y1 = oy + next();
        x = ox + next();
        y = oy + next();
        ops.push(`<quad x1="${r2(x1 + dx)}" y1="${r2(y1 + dy)}" x2="${r2(x + dx)}" y2="${r2(y + dy)}"/>`);
        lastCtrl = { x: x1, y: y1, kind: 'q' };
        break;
      }
      case 'T': {
        const x1: number = lastCtrl?.kind === 'q' ? 2 * x - lastCtrl.x : x;
        const y1: number = lastCtrl?.kind === 'q' ? 2 * y - lastCtrl.y : y;
        x = ox + next();
        y = oy + next();
        ops.push(`<quad x1="${r2(x1 + dx)}" y1="${r2(y1 + dy)}" x2="${r2(x + dx)}" y2="${r2(y + dy)}"/>`);
        lastCtrl = { x: x1, y: y1, kind: 'q' };
        break;
      }
      case 'C': {
        const x1 = ox + next();
        const y1 = oy + next();
        const x2 = ox + next();
        const y2 = oy + next();
        x = ox + next();
        y = oy + next();
        ops.push(`<curve x1="${r2(x1 + dx)}" y1="${r2(y1 + dy)}" x2="${r2(x2 + dx)}" y2="${r2(y2 + dy)}" x3="${r2(x + dx)}" y3="${r2(y + dy)}"/>`);
        lastCtrl = { x: x2, y: y2, kind: 'c' };
        break;
      }
      case 'S': {
        const x1: number = lastCtrl?.kind === 'c' ? 2 * x - lastCtrl.x : x;
        const y1: number = lastCtrl?.kind === 'c' ? 2 * y - lastCtrl.y : y;
        const x2 = ox + next();
        const y2 = oy + next();
        x = ox + next();
        y = oy + next();
        ops.push(`<curve x1="${r2(x1 + dx)}" y1="${r2(y1 + dy)}" x2="${r2(x2 + dx)}" y2="${r2(y2 + dy)}" x3="${r2(x + dx)}" y3="${r2(y + dy)}"/>`);
        lastCtrl = { x: x2, y: y2, kind: 'c' };
        break;
      }
      case 'A': {
        const rx = next();
        const ry = next();
        const rot = next();
        const large = next();
        const sweep = next();
        x = ox + next();
        y = oy + next();
        ops.push(`<arc rx="${r2(rx)}" ry="${r2(ry)}" x-axis-rotation="${r2(rot)}" large-arc-flag="${large ? 1 : 0}" sweep-flag="${sweep ? 1 : 0}" ${P(x, y)}/>`);
        lastCtrl = null;
        break;
      }
      case 'Z':
        ops.push('<close/>');
        x = sx;
        y = sy;
        lastCtrl = null;
        // A command letter must follow Z.
        if (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) throw new Unsupported('bad path data');
        break;
      default:
        throw new Unsupported(`path command ${cmd}`);
    }
  }
  return ops;
}

// ---------------------------------------------------------------------------
// React SVG tree → stencil ops
// ---------------------------------------------------------------------------

interface Ctx {
  style: ElementStyle;
  dx: number;
  dy: number;
  out: string[];
}

type Props = Record<string, unknown>;

const num = (v: unknown, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

function paintOps(p: Props, ctx: Ctx): { pre: string[]; op: string | null } {
  const s = ctx.style;
  const base = strokeAttrs(s);
  const pre: string[] = [];
  const fill = p.fill === undefined ? '#000000' : String(p.fill);
  const stroke = p.stroke === undefined ? 'none' : String(p.stroke);
  const sw = p.strokeWidth === undefined ? 1 : Number(p.strokeWidth);
  const hasFill = fill !== 'none' && fill !== 'transparent';
  const hasStroke = stroke !== 'none' && stroke !== 'transparent' && sw > 0;
  if (hasFill && fill !== s.fill) {
    if (fill.startsWith('url(')) throw new Unsupported('gradient paint');
    pre.push(`<fillcolor color="${esc(fill)}"/>`);
  }
  const fo = p.fillOpacity === undefined ? undefined : Number(p.fillOpacity);
  if (hasFill && fo !== undefined && fo !== (s.fillOpacity ?? 1)) pre.push(`<fillalpha alpha="${r2(fo)}"/>`);
  if (hasStroke) {
    if (stroke !== s.stroke) pre.push(`<strokecolor color="${esc(stroke)}"/>`);
    if (sw !== s.strokeWidth) pre.push(`<strokewidth width="${r2(sw)}" fixed="1"/>`);
    const dash = p.strokeDasharray === undefined ? undefined : String(p.strokeDasharray);
    if ((dash ?? '') !== (base.strokeDasharray ?? '')) {
      if (dash) {
        pre.push('<dashed dashed="1"/>');
        const rel = dash.split(/[\s,]+/).map((n) => r2(Number(n) / Math.max(sw, 0.5))).join(' ');
        pre.push(`<dashpattern pattern="${rel}"/>`);
      } else pre.push('<dashed dashed="0"/>');
    }
    const so = p.strokeOpacity === undefined ? undefined : Number(p.strokeOpacity);
    if (so !== undefined && so !== (s.strokeOpacity ?? 1)) pre.push(`<strokealpha alpha="${r2(so)}"/>`);
  }
  if (p.opacity !== undefined && Number(p.opacity) < 1) pre.push(`<alpha alpha="${r2(Number(p.opacity))}"/>`);
  return { pre, op: hasFill && hasStroke ? 'fillstroke' : hasFill ? 'fill' : hasStroke ? 'stroke' : null };
}

function emit(geometry: string, p: Props, ctx: Ctx) {
  const { pre, op } = paintOps(p, ctx);
  if (!op) return;
  if (pre.length) ctx.out.push('<save/>', ...pre);
  ctx.out.push(geometry, `<${op}/>`);
  if (pre.length) ctx.out.push('<restore/>');
}

function walk(node: ReactNode, ctx: Ctx, depth = 0) {
  if (depth > 30) throw new Unsupported('nesting too deep');
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, ctx, depth + 1));
    return;
  }
  if (typeof node === 'string' || typeof node === 'number') throw new Unsupported('text');
  if (!isValidElement(node)) return;
  const el = node as ReactElement<Props>;
  const p = el.props;
  if (el.type === Fragment) {
    Children.forEach(p.children as ReactNode, (c) => walk(c, ctx, depth + 1));
    return;
  }
  if (typeof el.type === 'function') {
    const fn = el.type as (props: Props) => ReactNode;
    if ((fn as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent) throw new Unsupported('component');
    walk(fn(p), ctx, depth + 1);
    return;
  }
  const { dx, dy } = ctx;
  const X = (v: unknown) => r2(num(v) + dx);
  const Y = (v: unknown) => r2(num(v) + dy);
  switch (el.type) {
    case 'g': {
      const t = p.transform === undefined ? '' : String(p.transform).trim();
      const m = t.match(/^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/);
      if (t && !m) throw new Unsupported('transformed group');
      if (p.fill !== undefined || p.stroke !== undefined) throw new Unsupported('group paint');
      const inner = { ...ctx, dx: dx + (m ? Number(m[1]) : 0), dy: dy + (m ? Number(m[2]) : 0) };
      Children.forEach(p.children as ReactNode, (c) => walk(c, inner, depth + 1));
      return;
    }
    case 'path': {
      if (p.transform) throw new Unsupported('transformed path');
      const ops = svgPathToStencil(String(p.d ?? ''), dx, dy);
      if (ops.length) emit(`<path>${ops.join('')}</path>`, p, ctx);
      return;
    }
    case 'rect': {
      const w = num(p.width);
      const h = num(p.height);
      if (!(w > 0 && h > 0)) return;
      const rx = num(p.rx, num(p.ry));
      const geo =
        rx > 0
          ? `<roundrect x="${X(p.x)}" y="${Y(p.y)}" w="${r2(w)}" h="${r2(h)}" arcsize="${r2(Math.min(50, (rx / Math.min(w, h)) * 100))}"/>`
          : `<rect x="${X(p.x)}" y="${Y(p.y)}" w="${r2(w)}" h="${r2(h)}"/>`;
      emit(geo, p, ctx);
      return;
    }
    case 'ellipse':
    case 'circle': {
      const rx = el.type === 'circle' ? num(p.r) : num(p.rx);
      const ry = el.type === 'circle' ? num(p.r) : num(p.ry);
      if (!(rx > 0 && ry > 0)) return;
      emit(`<ellipse x="${r2(num(p.cx) - rx + dx)}" y="${r2(num(p.cy) - ry + dy)}" w="${r2(rx * 2)}" h="${r2(ry * 2)}"/>`, p, ctx);
      return;
    }
    case 'line':
      emit(`<path><move x="${X(p.x1)}" y="${Y(p.y1)}"/><line x="${X(p.x2)}" y="${Y(p.y2)}"/></path>`, { ...p, fill: 'none' }, ctx);
      return;
    case 'polyline':
    case 'polygon': {
      const pts = String(p.points ?? '').trim().split(/[\s,]+/).map(Number);
      if (pts.length < 4) return;
      let d = `M${pts[0]},${pts[1]}`;
      for (let k = 2; k + 1 < pts.length; k += 2) d += ` L${pts[k]},${pts[k + 1]}`;
      if (el.type === 'polygon') d += ' Z';
      emit(`<path>${svgPathToStencil(d, dx, dy).join('')}</path>`, el.type === 'polyline' && p.fill === undefined ? { ...p, fill: 'none' } : p, ctx);
      return;
    }
    case 'defs':
    case 'title':
      return;
    default:
      throw new Unsupported(String(el.type));
  }
}

const CONNECTIONS = [
  ['0.5', '0', 'N'],
  ['1', '0.5', 'E'],
  ['0.5', '1', 'S'],
  ['0', '0.5', 'W'],
];

/** Wraps stencil ops in a `<shape>` document; the first plain fill+stroke goes to the background. */
export function buildStencilXml(name: string, w: number, h: number, ops: string[], connections = CONNECTIONS.map(([x, y, n]) => ({ x: Number(x), y: Number(y), name: n }))): string {
  let background: string[] = [];
  let foreground = ops;
  if (ops.length >= 2 && !ops[0].startsWith('<save') && ops[1] === '<fillstroke/>') {
    background = [ops[0]];
    foreground = ops.slice(1);
  }
  const ind = (lines: string[]) => lines.map((l) => `    ${l}`).join('\n');
  return [
    `<shape name="${esc(name)}" w="${r2(w)}" h="${r2(h)}" aspect="variable" strokewidth="inherit">`,
    '  <connections>',
    ...connections.map((c) => `    <constraint x="${c.x}" y="${c.y}" perimeter="1"${c.name ? ` name="${esc(c.name)}"` : ''}/>`),
    '  </connections>',
    '  <background>',
    ind(background),
    '  </background>',
    '  <foreground>',
    ind(foreground),
    '  </foreground>',
    '</shape>',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Converts a built-in shape to equivalent stencil XML at its current size. */
export function stencilFromShape(el: ShapeElement): ConvertResult {
  const def = getShapeDef(el.kind);
  if (el.kind === 'stencil') return el.stencil ? { ok: true, xml: el.stencil } : { ok: false, reason: 'This custom shape has no stencil yet.' };
  if (def.textPlacement === 'custom') return { ok: false, reason: `${def.label} draws its own text, which stencils can't express.` };
  const w = Math.max(1, Math.round(el.w));
  const h = Math.max(1, Math.round(el.h));
  const ctx: Ctx = { style: el.style, dx: 0, dy: 0, out: [] };
  try {
    walk(def.render({ w, h, style: el.style, text: '', icon: el.icon, points: el.points, table: el.table, crop: el.crop, collapsed: el.collapsed }), ctx);
  } catch (e) {
    const why = e instanceof Unsupported ? e.message : 'dynamic rendering';
    return { ok: false, reason: `${def.label} is a built-in shape that uses features stencils can't express (${why}).` };
  }
  if (!ctx.out.length) return { ok: false, reason: `${def.label} has no outline to convert.` };
  return { ok: true, xml: buildStencilXml(def.label, w, h, ctx.out) };
}
