/**
 * Selection chrome drawn above the diagram: outlines, resize & rotation
 * handles, connector endpoint/waypoint/segment/label handles, hover anchors
 * and quick-connect arrows, smart guides, the marquee and the connect preview.
 * Sizes are divided by zoom so they stay constant on screen.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AnchorSide, ConnectorElement, DiagramElement, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { anchorPoint, boxCorners, center, rotatePoint, rotatedBounds, SIDES, SIDE_NORMALS, unionRects } from '@/lib/geometry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { ConnectionPointMarkers, ExtraLabelHandles } from './ConnectionPointMarkers';
import { useEndpointDrag } from './connectorDrop';
import { ParamHandles } from './ParamHandles';
import { isLocked, shapeRect, useEditor } from '@/store/editor';
import { isContainerShape } from '@/interaction/container';
import { useInteraction } from '@/interaction/store';
import { useT } from '@/i18n';

const HANDLES = [
  ['nw', 0, 0, 'nwse-resize'],
  ['n', 0.5, 0, 'ns-resize'],
  ['ne', 1, 0, 'nesw-resize'],
  ['e', 1, 0.5, 'ew-resize'],
  ['se', 1, 1, 'nwse-resize'],
  ['s', 0.5, 1, 'ns-resize'],
  ['sw', 0, 1, 'nesw-resize'],
  ['w', 0, 0.5, 'ew-resize'],
] as const;

const ACCENT = 'var(--selection)';
const GUIDE = '#f43f5e';
const CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];

/** Resize cursor adjusted for the shape's rotation. */
function rotatedCursor(base: string, deg: number) {
  const idx = { 'ns-resize': 0, 'nesw-resize': 1, 'ew-resize': 2, 'nwse-resize': 3 }[base] ?? 0;
  return CURSORS[(idx + Math.round((((deg % 180) + 180) % 180) / 45)) % 4];
}

export function OverlayLayer({ freehand }: { freehand?: Vec[] | null }) {
  const camera = useEditor((s) => s.camera);
  const z = camera.z;
  const selected = useEditor(useShallow((s) => s.selection.map((id) => s.doc.elements[id]).filter(Boolean)));
  const elements = useEditor((s) => s.doc.elements);
  const doc = useEditor((s) => s.doc);
  const editingId = useEditor((s) => s.editingId);
  const hoverId = useEditor((s) => s.hoverId);
  const hover = hoverId ? elements[hoverId] : undefined;
  const guides = useEditor((s) => s.guides);
  const marquee = useEditor((s) => s.marquee);
  const draft = useEditor((s) => s.connectDraft);
  const dropTargetId = useEditor((s) => s.dropTargetId);
  const dropTarget = dropTargetId ? elements[dropTargetId] : undefined;
  const tool = useEditor((s) => s.tool);
  const dragging = useEditor((s) => !!s.interactionBase);
  const flash = useEditor((s) => s.flash);
  const brush = useInteraction((s) => s.brush);
  const connectionPoints = useEditor((s) => s.settings.connectionPoints);
  // Dragging a connector end: show the hovered shape's points as drop targets.
  const endpointDrag = useEndpointDrag((s) => s.active);

  const shapes = selected.filter(isShape);
  const connectors = selected.filter(isConnector);
  const single = shapes.length === 1 && !connectors.length ? shapes[0] : null;
  const bounds = useMemo(() => unionRects(shapes.map((s) => rotatedBounds(s))), [shapes]);
  const locked = selected.some((e) => isLocked(doc, e));
  const showAnchorsFor =
    isShape(hover) && !isLocked(doc, hover) && (tool === 'select' || tool === 'connector') && (!dragging || !!draft || endpointDrag) && hover.behavior?.connectable !== false && (connectionPoints || tool === 'connector' || !!draft || endpointDrag) ? hover : null;

  const px = 1 / z;
  const hs = 8 * px;

  // A single rotated shape gets handles in its own frame.
  const frame = single ? { x: single.x, y: single.y, w: single.w, h: single.h, rot: single.rotation ?? 0 } : bounds ? { ...bounds, rot: 0 } : null;
  const frameCenter = frame ? { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 } : null;
  const at = (fx: number, fy: number) => rotatePoint({ x: frame!.x + frame!.w * fx, y: frame!.y + frame!.h * fy }, frameCenter!, frame!.rot);
  const canResize = !locked && !dragging && shapes.every((s) => s.behavior?.resizable !== false);
  const canRotate = !!single && !locked && !dragging && single.behavior?.rotatable !== false;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
      <g transform={`translate(${camera.x} ${camera.y}) scale(${z})`}>
        {/* Container drop target */}
        {isShape(dropTarget) && (
          <rect
            x={dropTarget.x - 3 * px}
            y={dropTarget.y - 3 * px}
            width={dropTarget.w + 6 * px}
            height={dropTarget.h + 6 * px}
            rx={dropTarget.style.radius + 3}
            fill="var(--accent-soft)"
            stroke={ACCENT}
            strokeWidth={2 * px}
            strokeDasharray={`${6 * px} ${4 * px}`}
          />
        )}

        {/* Hover outline */}
        {isShape(hover) && !selected.includes(hover) && !draft && (
          <polygon points={boxCorners(hover).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={ACCENT} strokeOpacity={0.5} strokeWidth={1.5 * px} />
        )}

        {/* Per-element selection outlines */}
        {shapes.map((s) => (
          <polygon key={s.id} points={boxCorners(s).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={ACCENT} strokeWidth={1.25 * px} />
        ))}
        {connectors.map((c) => (
          <ConnectorSelection key={c.id} conn={c} z={z} elements={elements} editing={editingId === c.id} locked={isLocked(doc, c)} single={selected.length === 1} />
        ))}

        {/* Bounds + resize/rotate handles */}
        {frame && !editingId && (
          <g>
            {shapes.length > 1 && (
              <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="none" stroke={ACCENT} strokeWidth={1 * px} strokeDasharray={`${4 * px} ${3 * px}`} />
            )}
            {canRotate && (
              <g data-rotate style={{ pointerEvents: 'all', cursor: 'grab' }}>
                <line {...pts('x1', 'y1', at(0.5, 0))} {...pts('x2', 'y2', rotatePoint({ x: frameCenter!.x, y: frame.y - 22 * px }, frameCenter!, frame.rot))} stroke={ACCENT} strokeWidth={1 * px} />
                <circle {...cxy(rotatePoint({ x: frameCenter!.x, y: frame.y - 22 * px }, frameCenter!, frame.rot))} r={5 * px} fill="#ffffff" stroke={ACCENT} strokeWidth={1.5 * px} />
                <circle {...cxy(rotatePoint({ x: frameCenter!.x, y: frame.y - 22 * px }, frameCenter!, frame.rot))} r={12 * px} fill="transparent" />
              </g>
            )}
            {canResize &&
              HANDLES.map(([id, fx, fy, cursor]) => {
                const tiny = frame.w * z < 40 || frame.h * z < 40;
                if (id.length === 1 && tiny) return null;
                const p = at(fx, fy);
                return (
                  <rect
                    key={id}
                    data-handle={id}
                    x={p.x - hs / 2}
                    y={p.y - hs / 2}
                    width={hs}
                    height={hs}
                    rx={2 * px}
                    fill="#ffffff"
                    stroke={ACCENT}
                    strokeWidth={1.5 * px}
                    transform={frame.rot ? `rotate(${frame.rot} ${p.x} ${p.y})` : undefined}
                    style={{ cursor: rotatedCursor(cursor, frame.rot), pointerEvents: 'all' }}
                  />
                );
              })}
            {single && !dragging && (
              <SizeBadge x={frameCenter!.x} y={rotatedBounds(single).y + rotatedBounds(single).h + 10 * px} w={single.w} h={single.h} z={z} rot={single.rotation} />
            )}
          </g>
        )}

        {/* Parametric shape handles (yellow diamonds) */}
        <ParamHandles />

        {/* Container collapse toggles */}
        {shapes
          .filter((s) => isContainerShape(s) && !s.rotation)
          .map((s) => (
            <g key={`c-${s.id}`} data-collapse={s.id} style={{ pointerEvents: 'all', cursor: 'pointer' }} transform={`translate(${s.x + s.w - 22 * px} ${s.y + 8 * px})`}>
              <rect width={14 * px} height={14 * px} rx={3 * px} fill="#ffffff" stroke={ACCENT} strokeWidth={1 * px} />
              <path d={s.collapsed ? `M${3 * px},${7 * px} H${11 * px} M${7 * px},${3 * px} V${11 * px}` : `M${3 * px},${7 * px} H${11 * px}`} stroke={ACCENT} strokeWidth={1.5 * px} />
            </g>
          ))}

        {/* Anchor dots + quick-connect arrows */}
        {showAnchorsFor && <Anchors shape={showAnchorsFor} z={z} highlight={!!draft || endpointDrag} quick={!draft && !dragging && tool === 'select'} />}

        {/* Connect preview */}
        {draft && (
          <g>
            <line x1={draft.from.x} y1={draft.from.y} x2={draft.to.x} y2={draft.to.y} stroke={ACCENT} strokeWidth={1.75 * px} strokeDasharray={`${5 * px} ${4 * px}`} />
            <circle cx={draft.to.x} cy={draft.to.y} r={4 * px} fill={ACCENT} />
          </g>
        )}

        {/* Freehand preview */}
        {freehand && freehand.length > 1 && (
          <polyline points={freehand.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={brush.color} strokeWidth={brush.width} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Smart guides */}
        {guides.map((g, i) =>
          g.kind === 'gap' ? (
            <GapGuide key={i} g={g} px={px} />
          ) : g.axis === 'x' ? (
            <line key={i} x1={g.at} x2={g.at} y1={g.from - 8 * px} y2={g.to + 8 * px} stroke={GUIDE} strokeWidth={1 * px} />
          ) : (
            <line key={i} y1={g.at} y2={g.at} x1={g.from - 8 * px} x2={g.to + 8 * px} stroke={GUIDE} strokeWidth={1 * px} />
          ),
        )}

        {/* Group / ungroup feedback */}
        {flash && <FlashFeedback key={flash.at} flash={flash} px={px} />}

        {/* Marquee */}
        {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="var(--accent-soft)" stroke={ACCENT} strokeWidth={1 * px} rx={2 * px} />}
      </g>
    </svg>
  );
}

/** A subtle "snap together" outline for group, a gentle release pulse for ungroup. */
function FlashFeedback({ flash, px }: { flash: { kind: 'group' | 'ungroup'; rects: Array<{ x: number; y: number; w: number; h: number }>; count: number }; px: number }) {
  const t = useT();
  const pad = 6 * px;
  const first = flash.rects[0];
  const label = flash.kind === 'group' ? t('canvas.flash.grouped', { count: flash.count }) : t('canvas.flash.ungrouped', { count: flash.count });
  const lw = (label.length * 6.2 + 16) * px;
  return (
    <g pointerEvents="none">
      {flash.rects.map((r, i) => (
        <rect
          key={i}
          className={flash.kind === 'group' ? 'od-flash-group' : 'od-flash-ungroup'}
          x={r.x - pad}
          y={r.y - pad}
          width={r.w + pad * 2}
          height={r.h + pad * 2}
          rx={8 * px}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1.5 * px}
          strokeDasharray={flash.kind === 'group' ? `${5 * px} ${3 * px}` : undefined}
          style={{ animationDelay: `${i * 25}ms` }}
        />
      ))}
      {first && (
        <g className="od-flash-label" transform={`translate(${first.x + first.w / 2 - lw / 2} ${first.y - pad - 24 * px})`}>
          <rect width={lw} height={18 * px} rx={9 * px} fill={ACCENT} />
          <text x={lw / 2} y={12.5 * px} fontSize={10.5 * px} fontWeight={600} fill="#fff" textAnchor="middle" fontFamily='"Inter Variable", system-ui'>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/** Equal-spacing marker: a measured segment with end ticks and the distance. */
function GapGuide({ g, px }: { g: { axis: 'x' | 'y'; at: number; from: number; to: number }; px: number }) {
  const len = Math.round(g.to - g.from);
  const tick = 5 * px;
  const mid = (g.from + g.to) / 2;
  const horizontal = g.axis === 'y';
  const d = horizontal
    ? `M${g.from},${g.at} H${g.to} M${g.from},${g.at - tick} V${g.at + tick} M${g.to},${g.at - tick} V${g.at + tick}`
    : `M${g.at},${g.from} V${g.to} M${g.at - tick},${g.from} H${g.at + tick} M${g.at - tick},${g.to} H${g.at + tick}`;
  const lx = horizontal ? mid : g.at + 8 * px;
  const ly = horizontal ? g.at - 8 * px : mid;
  return (
    <g>
      <path d={d} stroke={GUIDE} strokeWidth={1 * px} fill="none" />
      <rect x={lx - 14 * px} y={ly - 7 * px} width={28 * px} height={14 * px} rx={3 * px} fill={GUIDE} />
      <text x={lx} y={ly + 3.5 * px} fontSize={9.5 * px} fill="#fff" textAnchor="middle" fontFamily='"Inter Variable", system-ui' fontWeight={600}>
        {len}
      </text>
    </g>
  );
}

const pts = (kx: string, ky: string, p: Vec) => ({ [kx]: p.x, [ky]: p.y });
const cxy = (p: Vec) => ({ cx: p.x, cy: p.y });

function Anchors({ shape, z, highlight, quick }: { shape: ShapeElement; z: number; highlight: boolean; quick: boolean }) {
  const r = shapeRect(shape);
  const c = center(shape);
  const rot = shape.rotation ?? 0;
  const px = 1 / z;
  return (
    <g>
      {SIDES.map((side: AnchorSide) => {
        const p = rotatePoint(anchorPoint(r, side), c, rot);
        const n = SIDE_NORMALS[side];
        const arrowAt = rotatePoint({ x: anchorPoint(r, side).x + n.x * 26 * px, y: anchorPoint(r, side).y + n.y * 26 * px }, c, rot);
        const angle = (Math.atan2(n.y, n.x) * 180) / Math.PI + rot;
        return (
          <g key={side}>
            <g data-anchor={side} data-anchor-el={shape.id} style={{ pointerEvents: 'all', cursor: 'crosshair' }}>
              <circle cx={p.x} cy={p.y} r={10 * px} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={(highlight ? 5 : 4.5) * px} fill={highlight ? ACCENT : '#ffffff'} stroke={ACCENT} strokeWidth={1.5 * px} />
            </g>
            {quick && (
              <g data-quick={side} data-quick-el={shape.id} style={{ pointerEvents: 'all', cursor: 'pointer' }} transform={`translate(${arrowAt.x} ${arrowAt.y}) rotate(${angle})`}>
                <circle r={11 * px} fill="transparent" />
                <path
                  d={`M${-5 * px},${-6 * px} L${6 * px},0 L${-5 * px},${6 * px} Z`}
                  fill={ACCENT}
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth={1 * px}
                  strokeLinejoin="round"
                />
              </g>
            )}
          </g>
        );
      })}
      <ConnectionPointMarkers shape={shape} z={z} highlight={highlight} />
    </g>
  );
}

function ConnectorSelection({
  conn, z, elements, editing, locked, single,
}: { conn: ConnectorElement; z: number; elements: Record<string, DiagramElement>; editing: boolean; locked: boolean; single: boolean }) {
  const g = useMemo(() => connectorGeometryInDoc(conn, elements), [conn, elements]);
  const px = 1 / z;
  const wps = conn.waypoints ?? [];
  // Segment handles: for straight/curved, between consecutive control points; otherwise per route segment.
  const control = conn.routing === 'straight' || conn.routing === 'curved' ? [g.start, ...wps, g.end] : g.points;
  const segments = control.slice(1).map((p, i) => ({ i, at: { x: (control[i].x + p.x) / 2, y: (control[i].y + p.y) / 2 }, len: Math.hypot(p.x - control[i].x, p.y - control[i].y) }));
  const editableRoute = !['elbow-h', 'elbow-v', 'entity', 'isometric'].includes(conn.routing);
  return (
    <g>
      <path d={g.path} fill="none" stroke={ACCENT} strokeOpacity={0.35} strokeWidth={conn.style.strokeWidth + 4} strokeLinejoin="round" />
      {!editing && !locked && single && editableRoute &&
        segments
          .filter((s) => s.len * z > 28 && (conn.routing === 'straight' || conn.routing === 'curved' || (s.i > 0 && s.i < control.length - 2)))
          .map((s) => (
            <rect
              key={`s${s.i}`}
              data-segment={s.i}
              data-conn={conn.id}
              x={s.at.x - 4 * px}
              y={s.at.y - 4 * px}
              width={8 * px}
              height={8 * px}
              rx={1.5 * px}
              fill="#ffffff"
              stroke={ACCENT}
              strokeWidth={1.25 * px}
              opacity={0.85}
              style={{ pointerEvents: 'all', cursor: conn.routing === 'straight' || conn.routing === 'curved' ? 'copy' : 'move' }}
            />
          ))}
      {!editing && !locked && single &&
        wps.map((w, i) => (
          <circle key={`w${i}`} data-waypoint={i} data-conn={conn.id} cx={w.x} cy={w.y} r={4.5 * px} fill={ACCENT} stroke="#ffffff" strokeWidth={1.5 * px} style={{ pointerEvents: 'all', cursor: 'move' }} />
        ))}
      {!editing && !locked && single && conn.text && (
        <rect
          data-label-handle={conn.id}
          x={g.label.x - 5 * px}
          y={g.label.y - 5 * px}
          width={10 * px}
          height={10 * px}
          transform={`rotate(45 ${g.label.x} ${g.label.y})`}
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth={1.25 * px}
          style={{ pointerEvents: 'all', cursor: 'move' }}
        />
      )}
      {!editing && !locked && single && <ExtraLabelHandles conn={conn} g={g} z={z} />}
      {!editing &&
        !locked &&
        ([['source', g.start], ['target', g.end]] as const).map(([end, p]) => {
          const attached = !!conn[end].elementId;
          return (
            <circle
              key={end}
              data-endpoint={end}
              data-endpoint-el={conn.id}
              cx={p.x}
              cy={p.y}
              r={5.5 * px}
              fill={attached ? ACCENT : '#ffffff'}
              stroke={attached ? '#ffffff' : ACCENT}
              strokeWidth={1.75 * px}
              style={{ pointerEvents: 'all', cursor: 'move' }}
            />
          );
        })}
    </g>
  );
}

/** Figma-style W × H badge under a single selected shape. */
function SizeBadge({ x, y, w, h, z, rot }: { x: number; y: number; w: number; h: number; z: number; rot?: number }) {
  const label = `${Math.round(w)} × ${Math.round(h)}${rot ? `  ${Math.round(rot)}°` : ''}`;
  const px = 1 / z;
  const width = (label.length * 6.4 + 12) * px;
  return (
    <g>
      <rect x={x - width / 2} y={y} width={width} height={18 * px} rx={5 * px} fill={ACCENT} />
      <text
        x={x}
        y={y + 12.5 * px}
        fontSize={11 * px}
        fontWeight={600}
        fill="#fff"
        textAnchor="middle"
        fontFamily='"Inter Variable", system-ui, sans-serif'
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </text>
    </g>
  );
}
