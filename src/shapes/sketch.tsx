/**
 * Hand-drawn ("sketch") rendering.
 *
 * Instead of requiring every shape definition to provide a sketch variant, we
 * walk the React element tree a shape renders and replace each SVG primitive
 * (path, rect, ellipse, circle, line, polyline, polygon) with its Rough.js
 * equivalent. This works for every shape — including library modules — and
 * for exports too. A seed derived from the element id keeps the wobble stable
 * from frame to frame.
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import rough from 'roughjs';
import { IconImage } from './IconImage';

const gen = rough.generator();

export function seedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483647 || 1;
}

type Props = Record<string, unknown>;

const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : d);

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0) return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

const parsePoints = (pts: string) =>
  pts
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .reduce<[number, number][]>((acc, v, i, arr) => (i % 2 === 0 ? [...acc, [v, arr[i + 1]]] : acc), []);

let currentFill = 'hachure';

function roughPrimitive(tag: string, p: Props, seed: number, key: string): ReactNode {
  const stroke = (p.stroke as string) ?? 'none';
  const fill = p.fill as string | undefined;
  const strokeWidth = num(p.strokeWidth, 1);
  const options = {
    seed,
    roughness: 1.15,
    bowing: 0.9,
    stroke: stroke === 'none' || stroke === 'transparent' ? 'none' : stroke,
    strokeWidth,
    fill: fill && fill !== 'none' && fill !== 'transparent' ? fill : undefined,
    fillStyle: currentFill,
    hachureGap: Math.max(4, strokeWidth * 3.5),
    fillWeight: Math.max(0.6, strokeWidth * 0.55),
    preserveVertices: false,
  };
  let drawable;
  switch (tag) {
    case 'path':
      drawable = gen.path(String(p.d ?? ''), options);
      break;
    case 'rect':
      drawable = gen.path(roundedRectPath(num(p.x), num(p.y), num(p.width), num(p.height), num(p.rx)), options);
      break;
    case 'ellipse':
      drawable = gen.ellipse(num(p.cx), num(p.cy), num(p.rx) * 2, num(p.ry) * 2, options);
      break;
    case 'circle':
      drawable = gen.circle(num(p.cx), num(p.cy), num(p.r) * 2, options);
      break;
    case 'line':
      drawable = gen.line(num(p.x1), num(p.y1), num(p.x2), num(p.y2), options);
      break;
    case 'polyline':
      drawable = gen.linearPath(parsePoints(String(p.points ?? '')), options);
      break;
    case 'polygon':
      drawable = gen.polygon(parsePoints(String(p.points ?? '')), options);
      break;
    default:
      return null;
  }
  const opacity = { opacity: p.opacity as number | undefined, strokeOpacity: p.strokeOpacity as number | undefined, fillOpacity: p.fillOpacity as number | undefined };
  return (
    <g key={key} transform={p.transform as string | undefined} {...opacity} pointerEvents={p.pointerEvents as never}>
      {gen.toPaths(drawable).map((path, i) => (
        <path
          key={i}
          d={path.d}
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
          fill={path.fill ?? 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

const PRIMITIVES = new Set(['path', 'rect', 'ellipse', 'circle', 'line', 'polyline', 'polygon']);

/** Converts every primitive in `node` to its hand-drawn equivalent. */
export function roughen(node: ReactNode, seed: number, depth = 0, fillStyle?: string): ReactNode {
  if (fillStyle) currentFill = fillStyle;
  if (depth > 12 || node === null || node === undefined || typeof node === 'boolean') return node;
  if (typeof node === 'string' || typeof node === 'number') return node;
  if (Array.isArray(node)) return node.map((n, i) => roughenKeyed(n, seed + i * 7, depth, String(i)));
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<Props>;
  const { type, props } = el;
  if (typeof type === 'string') {
    if (PRIMITIVES.has(type)) {
      // Transparent hit areas stay crisp.
      if (props.fill === 'transparent' && (props.stroke === undefined || props.stroke === 'transparent')) return el;
      return roughPrimitive(type, props, seed, String(el.key ?? type));
    }
    if (type === 'g' || type === 'svg') {
      return cloneElement(el, undefined, roughen(Children.toArray(props.children as ReactNode), seed + 13, depth + 1));
    }
    return el; // text, image, defs, …
  }
  // Plain function components (shape helpers) are pure — expand them. Hooked ones stay as-is.
  if (typeof type === 'function' && type !== IconImage && !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent) {
    try {
      return roughen((type as (p: Props) => ReactNode)(props), seed, depth + 1);
    } catch {
      return el;
    }
  }
  return el;
}

function roughenKeyed(node: ReactNode, seed: number, depth: number, key: string): ReactNode {
  const out = roughen(node, seed, depth);
  return isValidElement(out) && out.key == null ? cloneElement(out, { key }) : out;
}
