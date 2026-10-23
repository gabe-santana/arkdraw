/**
 * Drag handle on a floating panel's inner edge: drag to resize, double-click
 * to reset. The width lives in the UI store (persisted with the panel layout).
 */
import { useState } from 'react';
import { cn } from '@/lib/cn';

export const PANEL_WIDTH = { min: 220, max: 520, left: 264, right: 268 } as const;

export function PanelResizer({ edge, width, onChange, defaultWidth, label }: {
  /** Which edge of the panel the handle sits on (the one facing the canvas). */
  edge: 'left' | 'right';
  width: number;
  onChange: (width: number) => void;
  defaultWidth: number;
  label: string;
}) {
  const [dragging, setDragging] = useState(false);

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const dir = edge === 'right' ? 1 : -1;
    setDragging(true);
    document.body.style.cursor = 'ew-resize';
    const move = (ev: PointerEvent) => {
      const w = startW + (ev.clientX - startX) * dir;
      onChange(Math.round(Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, w))));
    };
    const up = () => {
      setDragging(false);
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={PANEL_WIDTH.min}
      aria-valuemax={PANEL_WIDTH.max}
      tabIndex={0}
      onPointerDown={start}
      onDoubleClick={() => onChange(defaultWidth)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10;
        const grow = edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
        const shrink = edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
        if (e.key !== grow && e.key !== shrink) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, width + (e.key === grow ? step : -step))));
      }}
      className={cn(
        'group pointer-events-auto absolute top-6 bottom-6 z-10 flex w-3 cursor-ew-resize justify-center outline-none',
        edge === 'right' ? '-right-2.5' : '-left-2.5',
      )}
    >
      <span
        className={cn(
          'h-full w-[3px] rounded-full transition-colors duration-150',
          dragging ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/40 group-focus-visible:bg-accent/60',
        )}
      />
    </div>
  );
}
