/**
 * Brush options for the freehand tool: colour, width, smoothing and pen
 * pressure. Shown above the tool dock while the freehand tool is active.
 */
import { PALETTE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { Slider, Switch } from '@/ui/controls';
import { pressureOutline, smoothPath } from './freehandPath';
import { useInteraction } from './store';

const WIDTHS = [1, 2, 4, 8];
/** Sample squiggle for the live preview (with a pressure ramp). */
const SAMPLE = Array.from({ length: 13 }, (_, i) => ({ x: 8 + i * 10, y: 20 + Math.sin(i / 1.9) * 9, p: 0.25 + 0.6 * Math.sin((i / 12) * Math.PI) }));

export function BrushPopover() {
  const active = useEditor((s) => s.tool === 'freehand');
  const brush = useInteraction((s) => s.brush);
  const setBrush = useInteraction((s) => s.setBrush);
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute bottom-[76px] left-1/2 z-10 -translate-x-1/2">
      <div
        role="dialog"
        aria-label="Brush options"
        className="animate-slide-up pointer-events-auto flex w-[300px] flex-col gap-2.5 rounded-2xl bg-panel p-3 shadow-pop"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-fg">Brush</span>
          <svg width="140" height="40" viewBox="0 0 140 40" aria-hidden className="rounded-md bg-panel-2">
            {brush.pressure ? (
              <path d={pressureOutline(SAMPLE, brush.width)} fill={brush.color} />
            ) : (
              <path d={smoothPath(SAMPLE)} fill="none" stroke={brush.color} strokeWidth={brush.width} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Brush color">
          {PALETTE.strokes.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={brush.color === c}
              aria-label={c}
              onClick={() => setBrush({ color: c })}
              className={cn('size-[18px] rounded-full ring-offset-2 ring-offset-panel transition-shadow', brush.color === c ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-line')}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="grid grid-cols-[52px_1fr] items-center gap-2">
          <span className="text-[12px] text-muted">Width</span>
          <div className="flex items-center gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                aria-label={`${w}px`}
                aria-pressed={brush.width === w}
                onClick={() => setBrush({ width: w })}
                className={cn('flex h-7 flex-1 items-center justify-center rounded-md', brush.width === w ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover')}
              >
                <span className="rounded-full bg-current" style={{ width: 18, height: Math.max(1, w) }} />
              </button>
            ))}
          </div>
          <span className="text-[12px] text-muted">Smooth</span>
          <div className="flex items-center gap-2">
            <Slider value={Math.round(brush.smoothing * 100)} min={0} max={100} step={5} onChange={(v) => setBrush({ smoothing: v / 100 })} />
            <span className="w-8 text-right text-[11.5px] tabular-nums text-muted">{Math.round(brush.smoothing * 100)}%</span>
          </div>
        </div>
        <Switch label="Pen pressure (variable width)" checked={brush.pressure} onChange={(pressure) => setBrush({ pressure })} />
      </div>
    </div>
  );
}
