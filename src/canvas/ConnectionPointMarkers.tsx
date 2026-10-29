/**
 * Overlay chrome for connectors: a shape's connection points (beyond the four
 * side anchors, drawn as small × markers, draggable to start a fixed
 * connection) and the handles of extra connector labels.
 */
import type { ConnectorElement, ShapeElement } from '@/model/types';
import { connectionPointsOf, fractionToWorld, sideOfFraction } from '@/lib/connectionPoints';
import { labelAt, type ConnectorGeometry } from '@/lib/connectorGeometry';

const ACCENT = 'var(--selection)';

export function ConnectionPointMarkers({ shape, z, highlight, cornersResize = false }: { shape: ShapeElement; z: number; highlight: boolean; cornersResize?: boolean }) {
  const px = 1 / z;
  const k = 3.2 * px;
  return (
    <g>
      {connectionPointsOf(shape)
        // The four side midpoints are the regular anchor dots.
        .filter((f) => !sideOfFraction(f))
        .map((f) => {
          const p = fractionToWorld(shape, f);
          // On a selected shape a corner resizes: its point stays visible but takes no pointer.
          const corner = cornersResize && (f.x === 0 || f.x === 1) && (f.y === 0 || f.y === 1);
          return (
            <g
              key={`${f.x},${f.y}`}
              data-cpoint={`${f.x},${f.y}`}
              data-cpoint-el={shape.id}
              data-anchor-el={shape.id}
              style={{ pointerEvents: corner ? 'none' : 'all', cursor: 'crosshair' }}
            >
              <circle cx={p.x} cy={p.y} r={8 * px} fill="transparent" />
              <circle className="od-cpoint-ring" cx={p.x} cy={p.y} r={6 * px} fill={ACCENT} fillOpacity={0.18} stroke={ACCENT} strokeWidth={1.25 * px} />
              <path
                d={`M${p.x - k},${p.y - k} L${p.x + k},${p.y + k} M${p.x - k},${p.y + k} L${p.x + k},${p.y - k}`}
                stroke={ACCENT}
                strokeOpacity={highlight ? 1 : 0.8}
                strokeWidth={(highlight ? 1.75 : 1.4) * px}
                strokeLinecap="round"
              />
            </g>
          );
        })}
    </g>
  );
}

/** Draggable diamonds for extra labels (double-click the label itself to edit). */
export function ExtraLabelHandles({ conn, g, z }: { conn: ConnectorElement; g: ConnectorGeometry; z: number }) {
  const px = 1 / z;
  return (
    <>
      {(conn.labels ?? []).map((l, i) => {
        const at = labelAt(g.samples, l.t, l.offset);
        return (
          <rect
            key={l.id ?? i}
            data-label-handle={conn.id}
            data-label-index={i}
            x={at.x - 5 * px}
            y={at.y - 5 * px}
            width={10 * px}
            height={10 * px}
            transform={`rotate(45 ${at.x} ${at.y})`}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth={1.25 * px}
            style={{ pointerEvents: 'all', cursor: 'move' }}
          />
        );
      })}
    </>
  );
}
