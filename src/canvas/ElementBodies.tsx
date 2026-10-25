/**
 * Pure SVG renderers for diagram elements — no store access. The canvas wraps
 * them with subscriptions; exporters call them directly with a static doc.
 */
import { connectorAria, shapeAria } from '@/interaction/aria';
import { createContext, memo, useContext, useMemo } from 'react';
import type { ConnectorElement, ElementStyle, Rect, ShapeElement } from '@/model/types';
import { getShapeDef, strokeAttrs } from '@/shapes/registry';
import { TextBlock, TextLines } from '@/shapes/TextLines';
import { roughen, seedFor } from '@/shapes/sketch';
import { connectorGeometry, type ConnectorGeometry, type Lookup } from '@/lib/connectorGeometry';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { connectorStroke, ExtraLabels, SketchConnector } from './connectorShapes';
import { connectorEffect, hideProgress, revealProgress, shapeEffect, type Packet } from '@/animation/timeline';
import { CustomShadowFilter, hasCustomShadow, shadowFilterUrl } from '@/styling/shadow';
import { shapeLabelBox } from '@/text/labelLayout';
import { localizedText } from '@/text/translations';
import { needsRich, richSize, RichTextBlock } from '@/text/RichTextBlock';

export const SHADOW_FILTER_ID = 'od-shadow';
export const GLASS_GRADIENT_ID = 'od-glass';

/** Shared <defs> — must be present in any SVG that renders elements. */
export function SvgDefs() {
  return (
    <defs>
      <filter id={SHADOW_FILTER_ID} x="-20%" y="-20%" width="140%" height="160%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.16" />
      </filter>
      <linearGradient id={GLASS_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
      </linearGradient>
    </defs>
  );
}

/** Values for %placeholders% in labels. */
export interface LabelVars {
  pageName: string;
  pageNumber: number;
  pageCount: number;
  fileName: string;
  /** Parent lookup for %key%: containers, layer, page, document (src/automation/placeholders.ts). */
  lookup?: (key: string, el: ShapeElement | ConnectorElement) => string | undefined;
  /** Diagram language: show `label_<lang>` translations (src/text/translations.ts). */
  language?: string;
}
export const LabelVarsContext = createContext<LabelVars>({ pageName: 'Page 1', pageNumber: 1, pageCount: 1, fileName: 'Untitled' });

function expandPlaceholders(text: string, el: ShapeElement | ConnectorElement, vars: LabelVars): string {
  const now = new Date();
  const builtins: Record<string, string> = {
    page: vars.pageName,
    pagenumber: String(vars.pageNumber),
    pagecount: String(vars.pageCount),
    filename: vars.fileName,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.toLocaleString(),
    id: el.id,
    label: el.text,
  };
  return text.replace(/%([A-Za-z_][\w.-]*)%/g, (m, key: string) => el.data?.[key] ?? vars.lookup?.(key, el) ?? builtins[key.toLowerCase()] ?? m);
}

/** Animation inputs; omitted when not animating. */
export interface AnimFrame {
  t: number;
  /** Total build-sequence length (0 = no sequence). */
  seq: number;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

interface ShapeBodyProps {
  el: ShapeElement;
  interactive?: boolean;
  hideText?: boolean;
  frame?: AnimFrame;
  /** Page-level "shadow on everything". */
  pageShadow?: boolean;
}

function gradientDef(id: string, s: ElementStyle) {
  const stops = (
    <>
      <stop offset="0" stopColor={s.fill} />
      <stop offset="1" stopColor={s.gradient} />
    </>
  );
  if (s.gradientDirection === 'radial') return <radialGradient id={id}>{stops}</radialGradient>;
  const v = { south: [0, 0, 0, 1], north: [0, 1, 0, 0], east: [0, 0, 1, 0], west: [1, 0, 0, 0] }[s.gradientDirection ?? 'south'];
  return (
    <linearGradient id={id} x1={v[0]} y1={v[1]} x2={v[2]} y2={v[3]}>
      {stops}
    </linearGradient>
  );
}

/** Text box for a label, honoring label position (relative to the unrotated shape). */
// 9-grid positions and per-side spacing: src/text/labelLayout.ts.
const shapeLabelLayout: (el: ShapeElement) => { box: Rect; style: ElementStyle } | null = shapeLabelBox;

function ShapeLabel({ el, text }: { el: ShapeElement; text: string }) {
  const layout = shapeLabelLayout(el);
  if (!layout || !text) return null;
  const { box, style } = layout;
  if (style.verticalText) {
    // Lay the text out in a box rotated -90° around the label box center.
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const rotated = { x: cx - box.h / 2, y: cy - box.w / 2, w: box.h, h: box.w };
    return (
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <TextBlock box={rotated} text={text} style={style} />
      </g>
    );
  }
  return <TextBlock box={box} text={text} style={style} wrap={style.wrap !== false} />;
}

export const ShapeBody = memo(function ShapeBody({ el, interactive, hideText, frame, pageShadow }: ShapeBodyProps) {
  const def = getShapeDef(el.kind);
  const vars = useContext(LabelVarsContext);
  const { w, h } = el;
  const entering = frame ? revealProgress(el.reveal ?? 0, false, frame.t, frame.seq) : 1;
  const present = frame ? hideProgress(el.hide ?? 0, frame.t, frame.seq) : 1;
  const reveal = entering * present;
  const fx = frame ? shapeEffect(el, frame.t, entering, present) : null;
  const gradId = el.style.gradient && el.style.fill !== 'none' ? `od-g-${el.id}` : null;
  const style: ElementStyle = gradId ? { ...el.style, fill: `url(#${gradId})` } : el.style;
  const label = localizedText(el, vars.language);
  const text = el.style.placeholders ? expandPlaceholders(label, el, vars) : label;

  // Geometry in local coordinates; memoized independent of position so drags are cheap.
  const geometry = useMemo(() => {
    const node = def.render({
      w,
      h,
      style,
      text: hideText ? '' : text,
      icon: el.icon,
      points: el.points,
      table: el.table,
      crop: el.crop,
      collapsed: el.collapsed,
      stencil: el.stencil,
      params: el.params,
    });
    return el.style.sketch ? roughen(node, seedFor(el.id), 0, el.style.sketchFill ?? 'hachure', el.style.sketchRoughness) : node;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, w, h, style, text, hideText, el.icon, el.points, el.table, el.crop, el.collapsed, el.id, el.stencil, el.params]);

  if (reveal <= 0) return null;
  const cx = el.x + w / 2;
  const cy = el.y + h / 2;
  const rotate = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined;
  const flip = el.flipH || el.flipV ? `translate(${cx} ${cy}) scale(${el.flipH ? -1 : 1} ${el.flipV ? -1 : 1}) translate(${-cx} ${-cy})` : '';
  const shadow = el.style.shadow || pageShadow;

  return (
    <g
      data-el={interactive ? el.id : undefined}
      {...(interactive && shapeAria(el))}
      opacity={el.style.opacity * (fx?.opacity ?? 1)}
      transform={[fx?.transform, rotate].filter(Boolean).join(' ') || undefined}
    >
      {el.tooltip && <title>{el.tooltip}</title>}
      {gradId && <defs>{gradientDef(gradId, el.style)}</defs>}
      {shadow && hasCustomShadow(el.style) && <defs><CustomShadowFilter elId={el.id} style={el.style} /></defs>}
      {fx?.glow !== undefined && (
        <rect
          x={el.x - 4}
          y={el.y - 4}
          width={w + 8}
          height={h + 8}
          rx={Math.min(el.style.radius + 4, w / 2, h / 2)}
          fill="none"
          stroke={el.style.stroke === 'none' ? '#5b5bf6' : el.style.stroke}
          strokeWidth={6}
          strokeOpacity={0.15 + 0.3 * fx.glow}
        />
      )}
      <g
        transform={`${flip} translate(${el.x} ${el.y})`.trim()}
        filter={shadow ? shadowFilterUrl(el.id, el.style, SHADOW_FILTER_ID) : undefined}
        pointerEvents={interactive && !def.boxHit ? 'all' : undefined}
      >
        {interactive && def.boxHit && <rect width={w} height={h} fill="transparent" />}
        {geometry}
        {el.style.glass && <rect width={w} height={h * 0.5} rx={Math.min(el.style.radius, w / 2, h / 4)} fill={`url(#${GLASS_GRADIENT_ID})`} pointerEvents="none" />}
      </g>
      {!hideText && <ShapeLabel el={el} text={text} />}
      {interactive && el.link && <LinkBadge x={el.x + w} y={el.y} />}
      {interactive && el.comments?.some((c) => !c.resolved) && <CommentBadge x={el.x} y={el.y} n={el.comments.filter((c) => !c.resolved).length} />}
    </g>
  );
});

function CommentBadge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g transform={`translate(${x - 9} ${y - 11})`} pointerEvents="none">
      <path d="M2 0 H18 a2 2 0 0 1 2 2 V12 a2 2 0 0 1 -2 2 H8 L4 18 V14 H2 a2 2 0 0 1 -2 -2 V2 a2 2 0 0 1 2 -2 Z" fill="#f59e0b" />
      <text x={10} y={10.5} fontSize={9} fontWeight={700} fill="#fff" textAnchor="middle" fontFamily="system-ui, sans-serif">
        {n}
      </text>
    </g>
  );
}

function LinkBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 7} ${y - 7})`} pointerEvents="none">
      <circle cx={7} cy={7} r={8} fill="#5b5bf6" />
      <path d="M5 9 L9 5 M6.2 4.6 L7.4 3.4 a2 2 0 0 1 2.8 2.8 L9 7.4 M7.8 9.4 L6.6 10.6 a2 2 0 0 1 -2.8 -2.8 L5 6.6" stroke="#fff" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

interface ConnectorBodyProps {
  el: ConnectorElement;
  lookup: Lookup;
  interactive?: boolean;
  hideLabel?: boolean;
  /** Background behind the label so the line doesn't run through the text. */
  labelBg?: string;
  frame?: AnimFrame;
  /** Precomputed geometry (the canvas memoizes it). */
  geometry?: ConnectorGeometry;
  /** Effective build step (clamped to its ends); see animation spec. */
  revealStep?: number;
  /** Effective exit step (no later than its ends). */
  hideStep?: number;
}

/** A packet on a connector: soft halo, tapering trail, bright core. */
function PacketMark({ packet: p, color, sw }: { packet: Packet; color: string; sw: number }) {
  if (p.alpha <= 0) return null;
  const r = 3.2 + sw * 0.8;
  return (
    <g pointerEvents="none" opacity={p.alpha}>
      <circle cx={p.head.x} cy={p.head.y} r={r * 2.6} fill={color} opacity={0.18} />
      {p.trail.map((q, j) => {
        const k = 1 - (j + 1) / (p.trail.length + 1);
        return <circle key={j} cx={q.x} cy={q.y} r={r * (0.35 + 0.6 * k)} fill={color} opacity={0.55 * k} />;
      })}
      <circle cx={p.head.x} cy={p.head.y} r={r} fill={color} />
      <circle cx={p.head.x} cy={p.head.y} r={r * 0.48} fill="#ffffff" opacity={0.9} />
    </g>
  );
}

export const ConnectorBody = memo(function ConnectorBody({
  el, lookup, interactive, hideLabel, labelBg = '#ffffff', frame, geometry, revealStep, hideStep,
}: ConnectorBodyProps) {
  const vars = useContext(LabelVarsContext);
  const g = geometry ?? connectorGeometry(el, lookup);
  const reveal = frame ? revealProgress(revealStep ?? el.reveal ?? 0, true, frame.t, frame.seq) : 1;
  // Leaving fades the whole connector; arriving draws it.
  const leaving = frame ? hideProgress(hideStep ?? el.hide ?? 0, frame.t, frame.seq) : 1;
  if (reveal <= 0 || leaving <= 0) return null;
  const fx = frame ? connectorEffect(el, frame.t, reveal, g.samples) : null;
  const s = strokeAttrs(el.style);
  const color = el.style.stroke === 'none' ? '#475569' : el.style.stroke;
  const sw = el.style.strokeWidth;
  const drawing = fx ? fx.drawn < 1 : false;
  const baseLabel = localizedText(el, vars.language);
  const label = el.style.placeholders ? expandPlaceholders(baseLabel, el, vars) : baseLabel;
  const lineWork = connectorStroke(el, g, {
    color,
    heads: !drawing,
    strokeAttrs: s,
    pathLength: drawing ? 1 : undefined,
    dashArray: drawing ? `${fx!.drawn} 1` : fx?.dashArray,
    dashOffset: drawing ? undefined : fx?.dashOffset,
  });

  return (
    <g data-el={interactive ? el.id : undefined} {...(interactive && connectorAria(el))} opacity={el.style.opacity * leaving}>
      {el.tooltip && <title>{el.tooltip}</title>}
      {interactive && (
        <path d={g.path} fill="none" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" pointerEvents="stroke" />
      )}
      {fx?.glow !== undefined && (
        <path d={g.path} fill="none" stroke={color} strokeWidth={sw + 8} strokeOpacity={0.08 + 0.22 * fx.glow} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {el.style.sketch && !drawing ? <SketchConnector el={el} node={lineWork} path={g.path} /> : lineWork}
      {fx?.packets?.map((p, i) => <PacketMark key={i} packet={p} color={color} sw={sw} />)}
      {label && !hideLabel && !drawing && <ConnectorLabel el={el} text={label} at={g.label} bg={labelBg} />}
      {!drawing && <ExtraLabels el={el} g={g} bg={labelBg} />}
      {interactive && el.link && <LinkBadge x={g.label.x + 10} y={g.label.y - 10} />}
    </g>
  );
});

const LABEL_MAX_WIDTH = 220;

/** Wrapped lines and size of a connector label. */
export function labelLayout(el: ConnectorElement, text = el.text) {
  if (needsRich(text, el.style)) {
    const r = richSize(text, LABEL_MAX_WIDTH, el.style);
    return { lines: [] as string[], w: Math.max(r.w, 4), h: r.h };
  }
  const lines = wrapText(text, LABEL_MAX_WIDTH, el.style);
  const w = Math.max(...lines.map((l) => measureText(l, el.style)), 4);
  const h = lines.length * lineHeight(el.style.fontSize);
  return { lines, w, h };
}

function ConnectorLabel({ el, text, at, bg }: { el: ConnectorElement; text: string; at: { x: number; y: number }; bg: string }) {
  const { lines, w, h } = labelLayout(el, text);
  const padX = 6;
  const padY = 3;
  const rich = needsRich(text, el.style);
  return (
    <g>
      <rect x={at.x - w / 2 - padX} y={at.y - h / 2 - padY} width={w + padX * 2} height={h + padY * 2} rx={5} fill={el.style.labelBackground ?? bg} stroke={el.style.labelBorderColor} />
      {rich ? (
        <RichTextBlock box={{ x: at.x - w / 2, y: at.y - h / 2, w, h }} text={text} style={{ ...el.style, labelBackground: undefined, labelBorderColor: undefined, verticalAlign: 'top' }} math={!!el.style.math} />
      ) : (
        <TextLines lines={lines} x={at.x} y={at.y - h / 2} anchor="middle" style={el.style} />
      )}
    </g>
  );
}
