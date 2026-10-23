/**
 * Thin overlay scrollbars for the canvas (View → Scrollbars, off by default).
 * They reflect the diagram bounds and the current viewport; drag a thumb to
 * pan, or click the track to page. Panels float over the canvas, so the bars
 * sit inside the visible area between them.
 */
import { useMemo, useRef } from 'react';
import { columnInset } from '@/chrome/Dock';
import { selectionBounds, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { dragTo, scrollMetrics, type AxisMetrics } from './scrollbarMath';

const EDGE = 3;
/** Gap between a docked panel column and the scrollbar track. */
const PANEL_GAP = 20;

export function Scrollbars() {
  const doc = useEditor((s) => s.doc);
  const camera = useEditor((s) => s.camera);
  const viewport = useEditor((s) => s.viewport);
  const leftInset = useUi((s) => columnInset(s, 'left'));
  const rightInset = useUi((s) => columnInset(s, 'right'));
  const aiOpen = useUi((s) => s.aiOpen);
  const content = useMemo(() => selectionBounds(doc, doc.order), [doc]);

  const left = leftInset ? leftInset + PANEL_GAP : EDGE;
  const right = aiOpen ? 396 : rightInset ? rightInset + PANEL_GAP : EDGE;
  const top = 8;
  const bottom = 4;
  const track = { w: Math.max(40, viewport.w - left - right - 14), h: Math.max(40, viewport.h - top - bottom - 14) };
  const m = scrollMetrics(content, camera, viewport, track);

  const setView = (axis: 'x' | 'y', viewMin: number) => {
    const s = useEditor.getState();
    s.setCamera({ ...s.camera, [axis]: -viewMin * s.camera.z });
  };

  return (
    <>
      {m.x.scrollable && (
        <Bar axis="x" metrics={m.x} length={track.w} style={{ left, bottom, width: track.w }} onView={(v) => setView('x', v)} />
      )}
      {m.y.scrollable && (
        <Bar axis="y" metrics={m.y} length={track.h} style={{ right, top, height: track.h }} onView={(v) => setView('y', v)} />
      )}
    </>
  );
}

function Bar({
  axis, metrics, length, style, onView,
}: { axis: 'x' | 'y'; metrics: AxisMetrics; length: number; style: React.CSSProperties; onView: (viewMin: number) => void }) {
  const drag = useRef<{ start: AxisMetrics; at: number } | null>(null);
  const horizontal = axis === 'x';
  const coord = (e: React.PointerEvent) => (horizontal ? e.clientX : e.clientY);

  const onThumbDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already-released pointer */
    }
    drag.current = { start: metrics, at: coord(e) };
  };
  const onThumbMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    onView(dragTo(d.start, length, coord(e) - d.at));
  };
  const onThumbUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    drag.current = null;
  };
  // Click on the track: page one view toward the pointer.
  const onTrackDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = coord(e) - (horizontal ? r.left : r.top);
    const dir = pos < metrics.thumbStart ? -1 : 1;
    const next = metrics.viewMin + dir * metrics.viewSize * 0.9;
    onView(Math.max(metrics.min, Math.min(metrics.max - metrics.viewSize, next)));
  };

  return (
    <div
      data-scrollbar={axis}
      className={cn('group absolute z-[5] flex', horizontal ? 'h-[10px] items-end' : 'w-[10px] justify-end')}
      style={style}
      onPointerDown={onTrackDown}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div
        role="scrollbar"
        aria-orientation={horizontal ? 'horizontal' : 'vertical'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((metrics.thumbStart / Math.max(1, length - metrics.thumbSize)) * 100)}
        className={cn(
          'absolute rounded-full bg-[color-mix(in_srgb,var(--fg)_22%,transparent)] transition-[width,height,background-color] duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_38%,transparent)] active:bg-[color-mix(in_srgb,var(--fg)_45%,transparent)]',
          horizontal ? 'bottom-0 h-[5px] group-hover:h-[8px]' : 'right-0 w-[5px] group-hover:w-[8px]',
        )}
        style={horizontal ? { left: metrics.thumbStart, width: metrics.thumbSize } : { top: metrics.thumbStart, height: metrics.thumbSize }}
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={onThumbUp}
        onPointerCancel={onThumbUp}
      />
    </div>
  );
}
