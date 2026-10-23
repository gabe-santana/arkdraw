/**
 * On-canvas vertex editing for freehand strokes: drag a vertex to move it,
 * double-click a segment to add one, double-click a vertex or press Del to
 * remove it, Esc (or clicking elsewhere) to finish.
 */
import type { ShapeElement, Vec } from '@/model/types';
import { useEditor } from '@/store/editor';
import { clientToWorld } from '@/canvas/viewport';
import { useInteraction } from './store';
import { deletePoint, insertPoint, isFreehand, movePoint, worldPoints } from './pointEdit';
import { useT } from '@/i18n';

const ACCENT = 'var(--selection)';

export function PointEditor() {
  const t = useT();
  const id = useInteraction((s) => s.editPointsId);
  const active = useInteraction((s) => s.activePoint);
  const el = useEditor((s) => (id ? s.doc.elements[id] : undefined));
  const z = useEditor((s) => s.camera.z);
  if (!id || !isFreehand(el)) return null;
  const pts = worldPoints(el);
  const px = 1 / z;

  const dragVertex = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const s = useEditor.getState();
    useInteraction.getState().set({ activePoint: index });
    s.beginInteraction();
    const move = (ev: PointerEvent) => {
      const cur = useEditor.getState().doc.elements[id];
      if (isFreehand(cur)) useEditor.getState().updateElements({ [id]: movePoint(cur, index, clientToWorld(ev.clientX, ev.clientY)) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      useEditor.getState().endInteraction();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const update = (patch: Partial<ShapeElement> | null) => {
    if (patch) useEditor.getState().updateElements({ [id]: patch });
  };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }} data-point-editor>
      <Camera>
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={ACCENT} strokeWidth={1 * px} strokeDasharray={`${3 * px} ${3 * px}`} />
        {pts.slice(1).map((b, i) => (
          <line
            key={`s${i}`}
            x1={pts[i].x}
            y1={pts[i].y}
            x2={b.x}
            y2={b.y}
            stroke="transparent"
            strokeWidth={10 * px}
            style={{ pointerEvents: 'stroke', cursor: 'copy' }}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              update(insertPoint(el, i, clientToWorld(e.clientX, e.clientY)));
              useInteraction.getState().set({ activePoint: i + 1 });
            }}
          >
            <title>{t('canvas.points.addHint')}</title>
          </line>
        ))}
        {pts.map((p: Vec, i) => (
          <circle
            key={`v${i}`}
            data-vertex={i}
            cx={p.x}
            cy={p.y}
            r={(active === i ? 5 : 4) * px}
            fill={active === i ? ACCENT : '#ffffff'}
            stroke={ACCENT}
            strokeWidth={1.5 * px}
            style={{ pointerEvents: 'all', cursor: 'move' }}
            onPointerDown={(e) => dragVertex(e, i)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              update(deletePoint(el, i));
              useInteraction.getState().set({ activePoint: null });
            }}
          />
        ))}
      </Camera>
    </svg>
  );
}

/** World-space group under the current camera. */
export function Camera({ children }: { children: React.ReactNode }) {
  const camera = useEditor((s) => s.camera);
  return <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.z})`}>{children}</g>;
}
