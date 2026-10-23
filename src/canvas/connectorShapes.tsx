/**
 * Connector bodies beyond the plain line (mxGraph edge shapes): pipe, wire,
 * link (double line), simple and flex arrows (an outlined band with heads),
 * filled edge (a thick filled band) — plus arrowheads, extra labels and the
 * hand-drawn (sketch) variant. Pure SVG, shared by the canvas and exporters.
 */
import { Children, Fragment, isValidElement, useMemo, type ReactNode } from 'react';
import type { ConnectorElement, ElementStyle, Vec } from '@/model/types';
import { arrowParts, labelAt, type ConnectorGeometry } from '@/lib/connectorGeometry';
import { dist, normalize, sub } from '@/lib/geometry';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { TextLines } from '@/shapes/TextLines';
import { roughen, seedFor } from '@/shapes/sketch';

/** Default band widths per connector shape (mxGraph `width`). */
export const BAND_DEFAULTS = { link: 4, flexArrow: 10, arrow: 8, filledEdge: 8 } as const;

export const isBandShape = (shape: ConnectorElement['connectorShape']) => shape === 'arrow' || shape === 'flexArrow';

interface StrokeOpts {
  color: string;
  /** Path dash override (draw-on reveal or flow animation). */
  dashArray?: string;
  dashOffset?: number;
  pathLength?: number;
  /** Whether arrowheads/heads are drawn (not while the draw-on reveal runs). */
  heads: boolean;
  strokeAttrs: {
    stroke: string;
    strokeWidth: number;
    strokeOpacity?: number;
    strokeDasharray?: string;
    strokeLinecap: 'round' | 'butt';
    strokeLinejoin: 'round';
  };
}

const paperOf = (s: ElementStyle) => (s.fill !== 'none' ? s.fill : '#ffffff');

/** Route points to build bands from: the polyline itself, or the sampled curve. */
const routeOf = (g: ConnectorGeometry) => (g.polyline ? g.points : g.samples);

/** Offsets a polyline sideways by `d` (left of travel = positive), with capped miter joins. */
export function offsetPolyline(pts: Vec[], d: number): Vec[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const normals: Vec[] = [];
  for (let i = 1; i < n; i++) {
    const u = normalize(sub(pts[i], pts[i - 1]));
    normals.push({ x: -u.y, y: u.x });
  }
  return pts.map((p, i) => {
    const a = normals[Math.max(0, i - 1)];
    const b = normals[Math.min(normals.length - 1, i)];
    let m = { x: a.x + b.x, y: a.y + b.y };
    const ml = Math.hypot(m.x, m.y);
    if (ml < 1e-6) m = a;
    else m = { x: m.x / ml, y: m.y / ml };
    const cos = m.x * a.x + m.y * a.y;
    const k = Math.min(3, 1 / Math.max(cos, 1e-3));
    return { x: p.x + m.x * d * k, y: p.y + m.y * d * k };
  });
}

/** Drops consecutive duplicate points (zero-length segments break the normals). */
function dedupe(pts: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > 0.01) out.push(p);
  return out;
}

/** Moves the first point `by` px along the first segment (clamped to the segment). */
function trimStart(pts: Vec[], by: number): Vec[] {
  if (pts.length < 2 || by <= 0) return pts;
  const l = dist(pts[0], pts[1]);
  const k = Math.min(by, Math.max(0, l - 1)) / (l || 1);
  return [{ x: pts[0].x + (pts[1].x - pts[0].x) * k, y: pts[0].y + (pts[1].y - pts[0].y) * k }, ...pts.slice(1)];
}

const P = (v: Vec) => `${v.x},${v.y}`;

/**
 * Outline of an arrow band: body of width `bw`, optional heads of total width
 * `hw` and length `hl` at either end. One closed path, so no seams show.
 */
export function bandOutline(route: Vec[], bw: number, hw: number, hl: number, startHead: boolean, endHead: boolean): string {
  let pts = dedupe(route);
  if (pts.length < 2) return '';
  if (startHead) pts = trimStart(pts, hl);
  if (endHead) pts = trimStart(pts.slice().reverse(), hl).reverse();
  const h = bw / 2;
  const left = offsetPolyline(pts, h);
  const right = offsetPolyline(pts, -h);
  const head = (base: Vec, prev: Vec): Vec[] => {
    const u = normalize(sub(base, prev));
    const nl = { x: -u.y, y: u.x };
    return [
      { x: base.x + nl.x * (hw / 2), y: base.y + nl.y * (hw / 2) },
      { x: base.x + u.x * hl, y: base.y + u.y * hl },
      { x: base.x - nl.x * (hw / 2), y: base.y - nl.y * (hw / 2) },
    ];
  };
  const n = pts.length;
  const out: Vec[] = [...left];
  if (endHead) out.push(...head(pts[n - 1], pts[n - 2]));
  out.push(...right.slice().reverse());
  // Start head, walked from the right side back to the left.
  if (startHead) out.push(...head(pts[0], pts[1]).reverse());
  return `M${out.map(P).join(' L')} Z`;
}

/** The connector's line work: body for its connector shape plus arrowheads. */
export function connectorStroke(el: ConnectorElement, g: ConnectorGeometry, o: StrokeOpts): ReactNode {
  const shape = el.connectorShape ?? 'line';
  const sw = el.style.strokeWidth;
  const color = o.color;
  const paper = paperOf(el.style);
  const so = el.style.strokeOpacity;
  const heads = o.heads && !isBandShape(shape) ? (
    <>
      {arrowParts(el.startArrow, g.start, g.startDir, sw, el.startSize, el.startFill).map((p, i) => (
        <ArrowPath key={`s${i}`} d={p.d} fill={p.fill} color={color} sw={sw} />
      ))}
      {arrowParts(el.endArrow, g.end, g.endDir, sw, el.endSize, el.endFill).map((p, i) => (
        <ArrowPath key={`e${i}`} d={p.d} fill={p.fill} color={color} sw={sw} />
      ))}
    </>
  ) : null;

  switch (shape) {
    case 'pipe':
    case 'wire':
      return (
        <>
          <path d={g.path} fill="none" stroke={color} strokeWidth={sw + 7} strokeLinejoin="round" strokeOpacity={so} />
          <path d={g.path} fill="none" stroke={paper} strokeWidth={sw + 3.5} strokeLinejoin="round" />
          {shape === 'wire' && <path d={g.path} fill="none" stroke={color} strokeWidth={Math.max(1, sw * 0.75)} strokeDasharray={`${sw * 3 + 2} ${sw * 3 + 2}`} strokeLinejoin="round" strokeOpacity={so} />}
          {heads}
        </>
      );
    case 'filledEdge': {
      const bw = el.bandWidth ?? BAND_DEFAULTS.filledEdge;
      return (
        <>
          <path d={g.path} fill="none" stroke={color} strokeWidth={bw + sw * 2} strokeLinejoin="round" strokeOpacity={so} />
          <path d={g.path} fill="none" stroke={paper} strokeWidth={bw} strokeLinejoin="round" />
          {heads}
        </>
      );
    }
    case 'link': {
      const route = dedupe(routeOf(g));
      const h = (el.bandWidth ?? BAND_DEFAULTS.link) / 2;
      const line = (pts: Vec[]) => `M${pts.map(P).join(' L')}`;
      return (
        <>
          <path d={`${line(offsetPolyline(route, h))} ${line(offsetPolyline(route, -h))}`} fill="none" {...o.strokeAttrs} stroke={color} />
          {heads}
        </>
      );
    }
    case 'arrow':
    case 'flexArrow': {
      const flex = shape === 'flexArrow';
      const bw = el.bandWidth ?? (flex ? BAND_DEFAULTS.flexArrow : BAND_DEFAULTS.arrow);
      const hw = el.headWidth ?? (flex ? bw * 2 : bw + 18);
      const hl = flex ? (el.endSize ?? 6) * 2.5 : 18;
      const startHead = flex && el.startArrow !== 'none';
      const endHead = !flex || el.endArrow !== 'none';
      return (
        <path
          d={bandOutline(routeOf(g), bw, hw, hl, startHead, endHead)}
          fill={paper}
          fillOpacity={el.style.fillOpacity}
          stroke={color}
          strokeWidth={sw}
          strokeOpacity={so}
          strokeDasharray={o.strokeAttrs.strokeDasharray}
          strokeLinejoin="round"
        />
      );
    }
    default:
      return (
        <>
          <path
            d={g.path}
            fill="none"
            {...o.strokeAttrs}
            stroke={color}
            pathLength={o.pathLength}
            strokeDasharray={o.dashArray ?? o.strokeAttrs.strokeDasharray}
            strokeDashoffset={o.dashOffset}
          />
          {heads}
        </>
      );
  }
}

export function ArrowPath({ d, fill, color, sw }: { d: string; fill: 'solid' | 'paper' | 'none'; color: string; sw: number }) {
  return (
    <path
      d={d}
      fill={fill === 'solid' ? color : fill === 'paper' ? '#ffffff' : 'none'}
      stroke={color}
      strokeWidth={sw}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/** Hand-drawn version of a connector's line work (memoized: Rough.js is not free). */
export function SketchConnector({ el, node, path }: { el: ConnectorElement; node: ReactNode; path: string }) {
  // `node` is rebuilt every render; the path + element identity capture what it depends on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rough = useMemo(() => roughen(<g>{unwrapFragments(node)}</g>, seedFor(el.id), 0, el.style.sketchFill ?? 'solid'), [el, path]);
  return <>{rough}</>;
}

/** Fragments are opaque to `roughen`; flatten them into plain child arrays. */
function unwrapFragments(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((n) =>
    isValidElement<{ children?: ReactNode }>(n) && n.type === Fragment ? unwrapFragments(n.props.children) : [n],
  );
}

// ---------------------------------------------------------------------------
// Extra labels
// ---------------------------------------------------------------------------

const LABEL_MAX_WIDTH = 220;

/** Additional labels along the connector (mxGraph child edge labels). */
export function ExtraLabels({ el, g, bg }: { el: ConnectorElement; g: ConnectorGeometry; bg: string }) {
  if (!el.labels?.length) return null;
  return (
    <>
      {el.labels.map((l, i) => {
        if (!l.text) return null;
        const at = labelAt(g.samples, l.t, l.offset);
        const lines = wrapText(l.text, LABEL_MAX_WIDTH, el.style);
        const w = Math.max(...lines.map((s) => measureText(s, el.style)), 4);
        const h = lines.length * lineHeight(el.style.fontSize);
        return (
          <g key={l.id ?? i} data-conn-label={`${el.id}:${i}`}>
            <rect x={at.x - w / 2 - 6} y={at.y - h / 2 - 3} width={w + 12} height={h + 6} rx={5} fill={el.style.labelBackground ?? bg} />
            <TextLines lines={lines} x={at.x} y={at.y - h / 2} anchor="middle" style={el.style} />
          </g>
        );
      })}
    </>
  );
}
