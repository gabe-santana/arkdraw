import { useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { ACTION_MAP } from '@/app/actions';
import { togglePlayback } from '@/app/playback';
import { hasAnimation } from '@/animation/timeline';
import { Tooltip } from '@/ui/Tooltip';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { ZOOM_PRESETS, zoomToPercent } from '@/app/commands';

const GROUPS = [
  ['tool.select', 'tool.hand'],
  ['tool.shape:rectangle', 'tool.shape:ellipse', 'tool.shape:diamond', 'tool.connector'],
  ['tool.shape:text', 'tool.shape:sticky', 'tool.shape:container', 'tool.freehand'],
];

/** Floating tool dock with a sliding active indicator. */
export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const playing = useEditor((s) => s.playing);
  const animated = useEditor((s) => hasAnimation(s.doc));
  const ref = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const btn = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    setIndicator(btn ? { left: btn.offsetLeft, width: btn.offsetWidth } : null);
  }, [tool]);

  return (
    <div className="animate-slide-up pointer-events-auto relative flex items-center gap-0.5 rounded-2xl bg-panel p-1.5 shadow-pop" ref={ref}>
      {indicator && (
        <div
          className="absolute top-1.5 h-9 rounded-[10px] bg-accent shadow-[0_2px_8px_-2px_var(--accent)] transition-[left,width] duration-200 ease-[cubic-bezier(.3,1.25,.5,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="mx-1 h-6 w-px bg-line" />}
          {group.map((id) => {
            const a = ACTION_MAP[id];
            const active = a.checked?.() ?? false;
            const key = a.shortcuts?.[0];
            return (
              <Tooltip key={id} label={a.label} shortcut={key} side="top">
                <button
                  data-active={active}
                  aria-label={a.label}
                  aria-pressed={active}
                  onClick={a.run}
                  className={cn(
                    'relative z-[1] flex size-9 items-center justify-center rounded-[10px] transition-[color,background,transform] duration-150 active:scale-90 [&_svg]:size-[18px]',
                    active ? 'text-white' : 'text-muted hover:bg-hover hover:text-fg',
                  )}
                >
                  {a.icon}
                  {key && (
                    <span className={cn('absolute bottom-[3px] right-[4px] text-[8.5px] font-semibold leading-none', active ? 'text-white/70' : 'text-subtle')}>
                      {key}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      ))}
      {animated && (
        <>
          <div className="mx-1 h-6 w-px bg-line" />
          <Tooltip label={playing ? 'Pause animation' : 'Play animation'} shortcut="Alt+P" side="top">
            <button
              onClick={togglePlayback}
              aria-label="Play animation"
              className={cn(
                'relative z-[1] flex size-9 items-center justify-center rounded-[10px] transition-colors [&_svg]:size-[17px]',
                playing ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              {playing ? <Pause /> : <Play />}
              {playing && <span className="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-accent" />}
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
}

/** Zoom pill: − / percentage (click for presets) / + / fit. */
export function ZoomControls() {
  const z = useEditor((s) => s.camera.z);
  const s = useEditor.getState;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const action = (id: string): MenuEntry => {
    const a = ACTION_MAP[id];
    return { label: a.label, shortcut: a.shortcuts?.[0], onSelect: a.run, disabled: a.enabled ? !a.enabled() : false };
  };
  const percent = Math.round(z * 100);
  const items: MenuEntry[] = [
    ...ZOOM_PRESETS.map((p): MenuEntry => ({ label: `${p}%`, checked: p === percent, onSelect: () => zoomToPercent(p) })),
    { type: 'separator' },
    action('view.fit'),
    action('view.pageWidth'),
    action('view.onePage'),
    action('view.twoPages'),
    action('view.fitSelection'),
  ];
  return (
    <div className="animate-slide-up pointer-events-auto flex items-center rounded-xl bg-panel p-1 shadow-panel">
      <button aria-label="Zoom out" onClick={() => s().zoomBy(0.8)} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      <button
        aria-label="Zoom options"
        aria-haspopup="menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu(menu ? null : { x: r.left, y: r.top - 6 });
        }}
        onDoubleClick={() => ACTION_MAP['view.zoom100'].run()}
        className={cn('h-7 min-w-[52px] rounded-lg px-1.5 text-[12px] font-medium tabular-nums text-fg hover:bg-hover', menu && 'bg-hover')}
      >
        {percent}%
      </button>
      {menu && <ContextMenu x={menu.x} y={menu.y} above minWidth={200} items={items} onClose={() => setMenu(null)} />}
      <button aria-label="Zoom in" onClick={() => s().zoomBy(1.25)} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
